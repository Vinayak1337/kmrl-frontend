import { getCollection } from '@/lib/mongo';
import type { ChatHistoryRecord } from './types';

export function chatHistoryCollection() {
  return getCollection<ChatHistoryRecord>(process.env.MONGODB_CHAT_COLLECTION || 'chat_sessions');
}

export async function saveChatTurn(turn: Pick<ChatHistoryRecord, 'sessionId' | 'userId' | 'docId' | 'messages' | 'citations'>) {
  const collection = await chatHistoryCollection();
  await collection.updateOne(
    { sessionId: turn.sessionId, userId: turn.userId, docId: turn.docId ?? null },
    { $set: { ...turn, docId: turn.docId ?? null, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
}
