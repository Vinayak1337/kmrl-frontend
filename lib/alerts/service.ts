import { buildDocumentAccessFilter, isDocumentAccessible, type JwtUser } from '@/lib/auth';
import { getCollection } from '@/lib/mongo';
import { prisma } from '@/lib/prisma';
import type { DocumentNodeRecord, DocumentRecord } from '@/types/documents';
import { extractDeadlines, parseDeadlineId, type Deadline, type DeadlineSource } from './deadlines';

export type AlertNotification = {
  alertId: string;
  documentId: string;
  deadline: string;
  recipients: string[];
  note?: string;
  status: 'recorded';
  delivery: 'email-pending';
  sentBy: { sub: string; name?: string; email?: string };
  createdAt: Date;
};

export type DeadlineAlert = Deadline & {
  documentTitle: string;
  notifications: Array<{ recipients: string[]; createdAt: string; sentBy: string }>;
};

const NODES = () => getCollection<DocumentNodeRecord>(process.env.MONGODB_NODES_COLLECTION || 'document_nodes');
const NOTIFICATIONS = () => getCollection<AlertNotification>('alert_notifications');
const PROJECTION = { docId: 1, nodeId: 1, order: 1, title: 1, content: 1, actionableItems: 1, 'meta.deadlines': 1, pageRange: 1 } as const;

function toSource(node: DocumentNodeRecord): DeadlineSource {
  return {
    docId: node.docId, nodeId: node.nodeId, order: node.order, title: node.title, content: node.content,
    actionableItems: node.actionableItems, deadlines: node.meta?.deadlines,
    pageStart: node.pageRange?.start, pageEnd: node.pageRange?.end,
  };
}

/** Deadlines across every document the session can read, nearest first. */
export async function listDeadlineAlerts(session: JwtUser, now = new Date()): Promise<DeadlineAlert[]> {
  const nodes = await (await NODES())
    .find(buildDocumentAccessFilter(session, 'nodes'), { projection: PROJECTION })
    .limit(5000)
    .toArray();
  const byDoc = new Map<string, DeadlineSource[]>();
  for (const node of nodes) {
    if (!node.docId) continue;
    byDoc.set(node.docId, [...(byDoc.get(node.docId) || []), toSource(node)]);
  }
  const deadlines = [...byDoc.values()].flatMap(docNodes => extractDeadlines(docNodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), { now }));
  if (!deadlines.length) return [];
  const docIds = [...new Set(deadlines.map(d => d.documentId))];
  const docs = await (await getCollection<DocumentRecord>())
    .find({ id: { $in: docIds } }, { projection: { id: 1, title: 1 } })
    .toArray();
  const titles = new Map(docs.map(d => [d.id, d.title]));
  const history = await (await NOTIFICATIONS())
    .find({ alertId: { $in: deadlines.map(d => d.id) } })
    .sort({ createdAt: -1 })
    .limit(2000)
    .toArray();
  return deadlines
    .filter(d => titles.has(d.documentId))
    .map(d => ({
      ...d,
      documentTitle: titles.get(d.documentId) || 'Untitled document',
      notifications: history.filter(h => h.alertId === d.id).map(h => ({
        recipients: h.recipients, createdAt: new Date(h.createdAt).toISOString(), sentBy: h.sentBy.name || h.sentBy.email || 'A colleague',
      })),
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.documentTitle.localeCompare(b.documentTitle));
}

export class AlertError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

const EMAIL = /^[^\s@<>()[\],;:"]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * Records a request to inform authorities about one deadline. Email delivery is not connected
 * yet, so the record is stored with delivery `email-pending`; nothing leaves the server.
 * Recipients already informed about the same deadline are reported as duplicates.
 */
export async function recordAlertNotification(session: JwtUser, input: { alertId?: unknown; recipients?: unknown; note?: unknown }) {
  const alertId = typeof input.alertId === 'string' ? input.alertId : '';
  const parsed = parseDeadlineId(alertId);
  if (!parsed) throw new AlertError('Choose a deadline to notify about.', 400);
  const recipients = Array.isArray(input.recipients)
    ? [...new Set(input.recipients.map(r => String(r).trim().toLowerCase()).filter(Boolean))]
    : [];
  if (!recipients.length) throw new AlertError('Add at least one email address.', 400);
  if (recipients.length > 20) throw new AlertError('Notify at most 20 people at a time.', 400);
  const invalid = recipients.filter(r => !EMAIL.test(r));
  if (invalid.length) throw new AlertError(`Check these email addresses: ${invalid.join(', ')}`, 400);
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 1000) : '';

  const doc = await (await getCollection<DocumentRecord>()).findOne({ id: parsed.documentId }, { projection: { id: 1, title: 1, metadata: 1 } });
  if (!doc || !isDocumentAccessible(session, doc)) throw new AlertError('Deadline not found.', 404);
  const nodes = await (await NODES()).find({ docId: parsed.documentId }, { projection: PROJECTION }).toArray();
  const deadline = extractDeadlines(nodes.map(toSource), { overdueDays: 3650 }).find(d => d.id === alertId);
  if (!deadline) throw new AlertError('This deadline is no longer in the document. Refresh and try again.', 409);

  const collection = await NOTIFICATIONS();
  const previous = await collection.find({ alertId }).toArray();
  const already = new Set(previous.flatMap(p => p.recipients));
  const fresh = recipients.filter(r => !already.has(r));
  const duplicates = recipients.filter(r => already.has(r));
  if (fresh.length) {
    await collection.insertOne({
      alertId, documentId: deadline.documentId, deadline: deadline.date, recipients: fresh, ...(note ? { note } : {}),
      status: 'recorded', delivery: 'email-pending',
      sentBy: { sub: session.sub, name: session.name, email: session.email }, createdAt: new Date(),
    });
    try {
      if (/^[a-f0-9]{24}$/i.test(session.sub)) {
        await prisma.userAudit.create({ data: { actorId: session.sub, targetUserId: session.sub, action: 'NOTIFY_DEADLINE', details: { alertId, documentId: deadline.documentId, title: doc.title, deadline: deadline.date, recipients: fresh } } });
      }
    } catch (error) {
      console.warn('[alerts] audit log error:', error);
    }
  }
  return { recorded: fresh, duplicates, delivery: 'email-pending' as const, deadline: deadline.date, documentTitle: doc.title };
}
