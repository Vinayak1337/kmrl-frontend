/* eslint-disable @typescript-eslint/no-explicit-any */
import { MongoClient, type Collection, type Db, type Document } from 'mongodb';

// Simple in-memory fallback for tests (no external Mongo required)
type MemDoc = Record<string, any>;
type MemDB = { [name: string]: MemDoc[] };
const MEM_ENABLED = process.env.TEST_INMEM_DB === '1';
const g: any = globalThis as any;
const memdb: MemDB = (g.__KMRL_MEMDB__ = g.__KMRL_MEMDB__ || {});

function pathGet(obj: any, path: string): any {
  return path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj);
}

function matchesFilter(doc: any, filter: any): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;
  for (const [key, val] of Object.entries(filter)) {
    if (key === '$and' && Array.isArray(val)) {
      if (!val.every((f) => matchesFilter(doc, f))) return false;
      continue;
    }
    if (key === '$or' && Array.isArray(val)) {
      if (!val.some((f) => matchesFilter(doc, f))) return false;
      continue;
    }
    const docVal = pathGet(doc, key as string);
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if ('$exists' in (val as any)) {
        const exists = pathGet(doc, key as string) !== undefined && pathGet(doc, key as string) !== null;
        if (exists !== Boolean((val as any).$exists)) return false;
        if ('$ne' in (val as any) && docVal === (val as any).$ne) return false;
        continue;
      }
      if ('$gte' in (val as any)) {
        if (!(docVal >= (val as any).$gte)) return false;
        continue;
      }
      // unsupported operator => naive equality on JSON
      if (JSON.stringify(docVal) !== JSON.stringify(val)) return false;
    } else if (docVal !== val) {
      return false;
    }
  }
  return true;
}

class MemoryCursor<T extends Document> {
  private arr: T[];
  private _sort: Record<string, 1 | -1> = {};
  private _limit = Infinity;
  constructor(arr: T[]) { this.arr = arr; }
  sort(sortSpec: Record<string, 1 | -1>) { this._sort = sortSpec; return this; }
  limit(n: number) { this._limit = n; return this; }
  async toArray(): Promise<T[]> {
  const out = [...this.arr];
    const [k, dir] = Object.entries(this._sort)[0] || [];
    if (k) out.sort((a, b) => ((pathGet(a, k) > pathGet(b, k)) ? 1 : -1) * (dir as number));
    return out.slice(0, isFinite(this._limit) ? this._limit : out.length);
  }
}

class MemoryCollection<T extends Document> {
  private name: string;
  constructor(name: string) { this.name = name; if (!memdb[name]) memdb[name] = []; }
  async insertOne(doc: T): Promise<{ insertedId: string }> {
    const id = (doc as any).id || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    (doc as any).id = id;
    memdb[this.name].push(doc as any);
    return { insertedId: id };
  }
  async insertMany(docs: T[]): Promise<{ insertedIds: Record<number, string> }> {
    const insertedIds: Record<number, string> = {};
    docs.forEach((d, i) => {
      const id = (d as any).id || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      (d as any).id = id;
      memdb[this.name].push(d as any);
      insertedIds[i] = id;
    });
    return { insertedIds };
  }
  find(filter: any): MemoryCursor<T> {
    const arr = memdb[this.name].filter((d) => matchesFilter(d, filter)) as T[];
    return new MemoryCursor<T>(arr);
  }
  async findOne(filter: any): Promise<T | null> {
    const arr = memdb[this.name].filter((d) => matchesFilter(d, filter)) as T[];
    return arr[0] || null;
  }
  async countDocuments(filter?: any): Promise<number> {
    return memdb[this.name].filter((d) => matchesFilter(d, filter || {})).length;
  }
  async deleteOne(filter: any): Promise<{ deletedCount: number }> {
    const arr = memdb[this.name];
    const idx = arr.findIndex((d) => matchesFilter(d, filter));
    if (idx >= 0) { arr.splice(idx, 1); return { deletedCount: 1 }; }
    return { deletedCount: 0 };
  }
  aggregate(pipeline: any[]): { toArray: () => Promise<any[]> } {
    // Support only known pipelines used by the app
    let data = [...memdb[this.name]];
    for (const stage of pipeline) {
      if ('$unwind' in stage) {
        const field = (stage as any).$unwind.replace('$', '');
        const out: any[] = [];
        for (const d of data) {
          const arr = pathGet(d, field) || [];
          for (const item of arr) out.push({ ...d, [field]: item });
        }
        data = out;
      } else if ('$match' in stage) {
        data = data.filter((d) => matchesFilter(d, (stage as any).$match));
      } else if ('$project' in stage) {
        const proj = (stage as any).$project;
        data = data.map((d) => {
          const nodeCount = Array.isArray(d.nodes) ? d.nodes.length : 0;
          return { ...d, nodeCount } as any;
        });
      } else if ('$group' in stage) {
        const grp = (stage as any).$group;
        if (grp._id === null && grp.total && grp.total.$sum === '$nodeCount') {
          const total = data.reduce((acc, d: any) => acc + (d.nodeCount || 0), 0);
          data = [{ _id: null, total }];
        }
      } else if ('$count' in stage) {
        const alias = (stage as any).$count;
        data = [{ [alias]: data.length }];
      }
    }
    return { toArray: async () => data };
  }
  async updateOne(filter: any, update: any): Promise<void> {
    const doc = await this.findOne(filter);
    if (!doc) return;
    if (update.$push) {
      for (const [k, v] of Object.entries(update.$push)) {
        const arr = (pathGet(doc, k) as any[]) || [];
        arr.push(v);
        const parts = k.split('.');
        let ref: any = doc;
        for (let i = 0; i < parts.length - 1; i++) ref = ref[parts[i]] = ref[parts[i]] || {};
        ref[parts[parts.length - 1]] = arr;
      }
    }
    if (update.$set) {
      for (const [k, v] of Object.entries(update.$set)) {
        const parts = k.split('.');
        let ref: any = doc;
        for (let i = 0; i < parts.length - 1; i++) ref = ref[parts[i]] = ref[parts[i]] || {};
        ref[parts[parts.length - 1]] = v;
      }
    }
  }
}

let client: MongoClient | null = null;

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('Missing MONGODB_URI (or MONGO_URI)');
  return uri;
}

export async function getMongo(): Promise<{ client: MongoClient; db: Db }> {
  if (MEM_ENABLED) {
    // Dummy return; not used directly when mem is enabled
    // We still conform to signature
    return { client: {} as any, db: {} as any };
  }
  if (!client) {
    client = new MongoClient(getMongoUri());
  }
  // Connect (safe to call multiple times)
  await client.connect();
  const dbName = process.env.MONGODB_DB_NAME || 'kmrl';
  const db = client.db(dbName);
  return { client, db };
}

export async function getCollection<T extends Document = Document>(name?: string): Promise<Collection<T>> {
  const collName = name || process.env.MONGODB_COLLECTION || 'documents';
  if (MEM_ENABLED) {
    return new MemoryCollection<T>(collName) as any;
  }
  const { db } = await getMongo();
  return db.collection<T>(collName);
}

let indexesEnsured = false;

export async function ensureDocumentIndexes(): Promise<void> {
  if (indexesEnsured) return;
  try {
    const coll = await getCollection<any>();
    // Compound text index across important textual fields
    await (coll as any).createIndexes?.([
      {
        key: {
          title: 'text',
          fullSummary: 'text',
          'nodes.summary': 'text',
          'nodes.keyPoints': 'text',
          'nodes.actionableItems': 'text',
          'metadata.tags': 'text',
        },
        name: 'text_main',
        weights: { title: 8, fullSummary: 5, 'nodes.summary': 4, 'nodes.keyPoints': 3, 'nodes.actionableItems': 3, 'metadata.tags': 4 },
        default_language: 'english',
      },
      { key: { id: 1 }, name: 'id_1', unique: true },
      { key: { 'metadata.department': 1 }, name: 'department_1' },
      { key: { 'metadata.documentType': 1 }, name: 'doctype_1' },
      { key: { 'metadata.createdAt': -1 }, name: 'createdAt_-1' },
    ]);
  } catch (e) {
    // Ignore if unsupported (e.g., in-memory) or already exists
  }
  indexesEnsured = true;
}
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-explicit-any */
