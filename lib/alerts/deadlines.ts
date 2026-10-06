import { createHash } from 'node:crypto';

/** Deadline tiers shown on the dashboard, nearest first. */
export type DeadlineTier = 'overdue' | 'within5' | 'within15' | 'within30' | 'later';

export type Authority = { email: string; label?: string; sectionId?: string };

export type DeadlineSource = {
  docId: string;
  nodeId: string;
  order?: number;
  title?: string;
  content?: string;
  actionableItems?: string[];
  deadlines?: string[];
  pageStart?: number;
  pageEnd?: number;
};

export type Deadline = {
  id: string;
  documentId: string;
  sectionId: string;
  sectionTitle: string;
  pageStart?: number;
  pageEnd?: number;
  /** ISO calendar date, YYYY-MM-DD. */
  date: string;
  dateText: string;
  requirement: string;
  /** Source sentence the deadline was found in. */
  excerpt: string;
  daysLeft: number;
  tier: DeadlineTier;
  authorities: Authority[];
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};
const MONTH = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DATE_PATTERNS: Array<{ rx: RegExp; parse: (m: RegExpExecArray) => [number, number, number] }> = [
  // 31 January 2031, 31st Jan, 2031
  { rx: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH}\\.?,?\\s+(\\d{4})\\b`, 'gi'), parse: m => [+m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1]] },
  // January 31, 2031
  { rx: new RegExp(`\\b${MONTH}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, 'gi'), parse: m => [+m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], +m[2]] },
  // 2031-01-31
  { rx: /\b(\d{4})-(\d{2})-(\d{2})\b/g, parse: m => [+m[1], +m[2], +m[3]] },
  // 31/01/2031, 31-01-2031, 31.01.2031 (day first, as used in Indian documents)
  { rx: /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/g, parse: m => [+m[3], +m[2], +m[1]] },
];

const DEADLINE_CUE = /\b(by|before|due|deadline|last date|no later than|not later than|on or before|expir\w*|valid (?:till|until|up to)|until|till|latest|submit\w*|complet\w*|renew\w*|must|shall|required|scheduled|closes?|closing|target date|compliance date|effective)\b/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const DAY_MS = 86_400_000;

function isoDate(y: number, m: number, d: number): string | null {
  if (!y || !m || !d || m > 12 || d > 31 || y < 1990 || y > 2100) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1) return null;
  return date.toISOString().slice(0, 10);
}

export function findDates(text: string): Array<{ date: string; text: string; index: number }> {
  const found: Array<{ date: string; text: string; index: number }> = [];
  for (const { rx, parse } of DATE_PATTERNS) {
    rx.lastIndex = 0;
    for (let m = rx.exec(text); m; m = rx.exec(text)) {
      const date = isoDate(...parse(m));
      if (date && !found.some(f => m!.index < f.index + f.text.length && f.index < m!.index + m![0].length)) {
        found.push({ date, text: m[0], index: m.index });
      }
    }
  }
  return found.sort((a, b) => a.index - b.index);
}

function sentences(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split(/(?<=[.;!?])\s+(?=[A-Z0-9("'])|\n+/)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(s => s.length > 6);
}

type Located = Authority & { index: number };

function cleanLabel(before: string): string | undefined {
  const label = (before.split(/[.;|]/).pop() || '')
    .replace(/[\s:(\-–—,<]+$/, '')
    .replace(/^.*\b(?:contact|email|e-mail|mail|write to|reach|by|to|cc)\s+/i, '')
    .replace(/\s+(?:at|on|via|is|:)$/i, '')
    .replace(/^(?:the|our)\s+/i, '')
    .trim().split(/\s+/).slice(-6).join(' ');
  return label.length > 2 && /[A-Za-z]/.test(label) ? label : undefined;
}

function locateAuthorities(text: string, sectionId?: string): Located[] {
  const result = new Map<string, Located>();
  EMAIL.lastIndex = 0;
  for (let m = EMAIL.exec(text); m; m = EMAIL.exec(text)) {
    const email = m[0].toLowerCase().replace(/\.$/, '');
    if (result.has(email)) continue;
    const lineStart = Math.max(text.lastIndexOf('\n', m.index) + 1, m.index - 80);
    const label = cleanLabel(text.slice(lineStart, m.index).replace(/^\S*\s/, lineStart > 0 && text[lineStart - 1] !== '\n' ? '' : '$&'));
    result.set(email, { email, ...(label ? { label } : {}), ...(sectionId ? { sectionId } : {}), index: m.index });
  }
  return [...result.values()];
}

/** Emails in the fed text, with the words immediately before each as a label. */
export function findAuthorities(text: string, sectionId?: string): Authority[] {
  return locateAuthorities(text, sectionId).map(a => ({ email: a.email, ...(a.label ? { label: a.label } : {}), ...(a.sectionId ? { sectionId: a.sectionId } : {}) }));
}

export function tierFor(daysLeft: number): DeadlineTier {
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 5) return 'within5';
  if (daysLeft <= 15) return 'within15';
  if (daysLeft <= 30) return 'within30';
  return 'later';
}

export function daysUntil(date: string, now = new Date()): number {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((Date.parse(`${date}T00:00:00Z`) - today) / DAY_MS);
}

export function deadlineId(docId: string, nodeId: string, date: string, requirement: string) {
  const hash = createHash('sha1').update(`${docId}|${nodeId}|${date}|${requirement.toLowerCase()}`).digest('hex').slice(0, 10);
  return `${docId}~${nodeId}~${date}~${hash}`;
}

export function parseDeadlineId(id: string) {
  const [documentId, sectionId, date] = id.split('~');
  return documentId && sectionId && date ? { documentId, sectionId, date } : null;
}

const ISSUE_DATE = /\b(?:issued|dated|dt\.?|approved|published|circulated|revised|amended|received|w\.?e\.?f\.?|effective from|since|as on|as of)\b[^.]{0,20}$/i;
const HEADING = /^(?:\d+(?:\.\d+)*[.)]\s+)?[A-Z][\w'’-]*(?:\s+[a-z][\w'’-]*){1,4}\s+(?=[A-Z][a-z])/;

/**
 * Finds dated requirements in one document's chunks. A source date counts as a deadline when a
 * deadline cue surrounds it and it is not an issue date. Enrichment action items that carry the
 * same date supply the requirement wording; the source sentence stays as the excerpt.
 * Authorities are emails in the document, nearest to the deadline in the source first.
 */
export function extractDeadlines(nodes: DeadlineSource[], options: { now?: Date; overdueDays?: number } = {}): Deadline[] {
  const now = options.now || new Date();
  const overdueDays = options.overdueDays ?? 30;
  const deadlines = new Map<string, Deadline>();
  const all = nodes.flatMap(node => locateAuthorities(node.content || '', node.nodeId).map(a => ({ ...a, node: node.nodeId })));
  for (const node of nodes) {
    const content = node.content || '';
    const enrichment = [...(node.actionableItems || []), ...(node.deadlines || [])];
    const enrichedDates = enrichment.map(text => ({ text, dates: findDates(text).map(d => d.date) }));
    const add = (date: string, dateText: string, position: number, excerpt: string, fromSource: boolean) => {
      const daysLeft = daysUntil(date, now);
      if (daysLeft < -overdueDays) return;
      const key = `${node.docId}|${node.nodeId}|${date}`;
      if (deadlines.has(key) && !fromSource) return;
      const enriched = enrichedDates.find(e => e.dates.includes(date))?.text;
      const clipped = excerpt.replace(HEADING, '');
      const requirement = (enriched || clipped).replace(/\s+/g, ' ').trim();
      const authorities = all
        .map(a => ({ a, score: a.node !== node.nodeId ? 1e6 + a.index : a.index >= position ? a.index - position : (position - a.index) * 3 }))
        .sort((x, y) => x.score - y.score)
        .map(({ a }): Authority => ({ email: a.email, ...(a.label ? { label: a.label } : {}), ...(a.sectionId ? { sectionId: a.sectionId } : {}) }))
        .filter((a, i, list) => list.findIndex(b => b.email === a.email) === i);
      deadlines.set(key, {
        id: deadlineId(node.docId, node.nodeId, date, requirement),
        documentId: node.docId,
        sectionId: node.nodeId,
        sectionTitle: node.title || `Section ${node.order ?? ''}`.trim(),
        pageStart: node.pageStart,
        pageEnd: node.pageEnd,
        date,
        dateText,
        requirement: requirement.length > 320 ? `${requirement.slice(0, 317)}…` : requirement,
        excerpt: clipped.length > 400 ? `${clipped.slice(0, 397)}…` : clipped,
        daysLeft,
        tier: tierFor(daysLeft),
        authorities,
      });
    };
    let cursor = 0;
    for (const sentence of sentences(content)) {
      const at = content.indexOf(sentence.slice(0, 40), cursor);
      const base = at >= 0 ? at : cursor;
      if (at >= 0) cursor = at;
      for (const found of findDates(sentence)) {
        const window = sentence.slice(Math.max(0, found.index - 120), found.index + found.text.length + 40);
        if (!DEADLINE_CUE.test(window) || ISSUE_DATE.test(sentence.slice(0, found.index))) continue;
        add(found.date, found.text, base + found.index, sentence, true);
      }
    }
    for (const { text, dates } of enrichedDates) {
      for (const date of dates) {
        const pos = 0;
        add(date, findDates(text).find(d => d.date === date)!.text, pos, text, false);
      }
    }
  }
  return [...deadlines.values()].sort((a, b) => a.date.localeCompare(b.date) || a.documentId.localeCompare(b.documentId));
}
