/*
  Backfill node documents from embedded nodes in documents.

  Usage examples:
    - Default (load env files automatically, process all docs):
        npm run migrate:nodes
    - Dry run (no writes):
        npm run migrate:nodes -- --dry-run
    - Process a single document:
        npm run migrate:nodes -- --docId doc-123
    - Overwrite existing nodes for a doc:
        npm run migrate:nodes -- --docId doc-123 --overwrite
    - Limit number of documents processed:
        npm run migrate:nodes -- --limit 20

  Notes:
    - Does not remove embedded nodes in documents; preserves backward compatibility.
    - Idempotent: skips docs that already have node documents unless --overwrite.
*/

import { getCollection, ensureNodeIndexes } from '@/lib/mongo';
import type { DocumentRecord, DocumentNodeRecord } from '@/types/documents';
import fs from 'fs';
import path from 'path';

type Args = {
  dryRun: boolean;
  docId?: string;
  limit?: number;
  overwrite: boolean;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const out: Args = { dryRun: false, overwrite: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run') out.dryRun = true;
    if (a === '--overwrite') out.overwrite = true;
    if (a === '--docId') out.docId = args[++i];
    if (a === '--limit') out.limit = Number(args[++i]);
  }
  return out;
}

function loadEnvFiles() {
  // Minimal loader for .env.local and .env
  const candidates = ['.env.local', '.env'];
  for (const f of candidates) {
    const p = path.resolve(process.cwd(), f);
    if (fs.existsSync(p)) {
      const txt = fs.readFileSync(p, 'utf8');
      for (const line of txt.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim().replace(/^"|"$/g, '');
        if (!(key in process.env)) process.env[key] = val;
      }
    }
  }
}

function deriveTitle(n: any, order: number): string {
  const fromMd = (s?: string) => (s || '').split('\n').find((l) => l.trim().length > 0)?.replace(/^#+\s*/, '')?.slice(0, 80);
  return (
    (n?.meta?.slideType && String(n.meta.slideType).trim()) ||
    (n?.topicSummary && String(n.topicSummary).trim()) ||
    fromMd(n?.summaryMd) ||
    (String(n?.summary || '').split(/[.!?]/)[0]?.slice(0, 80)) ||
    `Section ${order}`
  );
}

async function main() {
  loadEnvFiles();
  const { dryRun, docId, limit, overwrite } = parseArgs();
  const nodesCollectionName = process.env.MONGODB_NODES_COLLECTION || 'document_nodes';

  if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
    console.error('Missing MONGODB_URI (or MONGO_URI). Set env or add it to .env.local');
    process.exit(1);
  }

  if (!dryRun) {
    await ensureNodeIndexes();
  }

  const docsColl = await getCollection<DocumentRecord>(process.env.MONGODB_COLLECTION || 'documents');
  const nodesColl = await getCollection<DocumentNodeRecord>(nodesCollectionName);

  const filter: Record<string, unknown> = {};
  if (docId) filter['id'] = docId;

  const cursor = docsColl.find(filter).sort({ 'metadata.createdAt': 1 });
  if (limit && limit > 0) cursor.limit(limit);
  const docs = await cursor.toArray();

  let processed = 0;
  for (const doc of docs) {
    const dId = doc.id;
    const meta: any = doc.metadata || {};
    const existingCount = await nodesColl.countDocuments({ docId: dId });
    if (existingCount > 0 && !overwrite) {
      console.log(`Skip ${dId}: ${existingCount} nodes already present`);
      continue;
    }

    // Gather source nodes: prefer embedded doc.nodes if present
    const embedded = Array.isArray((doc as any).nodes) ? ((doc as any).nodes as any[]) : [];
    if (embedded.length === 0) {
      console.log(`Skip ${dId}: no embedded nodes found`);
      continue;
    }

    const mapped: DocumentNodeRecord[] = embedded.map((n, idx) => {
      const order = idx + 1;
      const nodeId = n.id || `node-${order}`;
      const uid = `${dId}#${nodeId}`;
      return {
        uid,
        docId: dId,
        nodeId,
        order,
        title: deriveTitle(n, order),
        pageRange: n.pageRange || { start: order, end: order },
        content: n.content || '',
        images: Array.isArray(n.images) ? n.images : [],
        summary: n.summary || '',
        summaryMd: n.summaryMd,
        keyPointsMd: n.keyPointsMd,
        actionsMd: n.actionsMd,
        keyPoints: Array.isArray(n.keyPoints) ? n.keyPoints : [],
        actionableItems: Array.isArray(n.actionableItems) ? n.actionableItems : [],
        criticalFlags: Array.isArray(n.criticalFlags) ? n.criticalFlags : [],
        crossDepartments: Array.isArray(n.crossDepartments) ? n.crossDepartments : [],
        needsImage: Boolean(n.needsImage),
        meta: n.meta,
        nextNodeId: n.nextNodeId,
        prevNodeId: n.prevNodeId,
        nodeCount: embedded.length,
        department: meta.department,
        documentType: meta.documentType,
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        createdAt: meta.createdAt || new Date(),
      };
    });

    console.log(`${dId}: prepared ${mapped.length} nodes ${dryRun ? '(dry-run)' : ''}${overwrite ? ' [overwrite]' : ''}`);

    if (!dryRun) {
      if (overwrite && existingCount > 0) {
        await (nodesColl as any).deleteMany({ docId: dId });
      }
      if (mapped.length > 0) {
        await nodesColl.insertMany(mapped);
      }
      // Update document nodeCount if missing
      if (!('nodeCount' in doc) || typeof (doc as any).nodeCount !== 'number' || (doc as any).nodeCount === 0) {
        await (docsColl as any).updateOne({ id: dId }, { $set: { nodeCount: mapped.length } });
      }
    }

    processed++;
  }

  console.log(`Done. Documents processed: ${processed}`);
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});

