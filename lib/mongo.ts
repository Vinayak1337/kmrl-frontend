import { MongoClient, type Collection, type Db, type Document } from 'mongodb';

let client: MongoClient | null = null;

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('Missing MONGODB_URI (or MONGO_URI)');
  return uri;
}

export async function getMongo(): Promise<{ client: MongoClient; db: Db }> {
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
  const { db } = await getMongo();
  const collName = name || process.env.MONGODB_COLLECTION || 'documents';
  return db.collection<T>(collName);
}
