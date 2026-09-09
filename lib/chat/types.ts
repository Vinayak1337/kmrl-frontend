import type { ObjectId } from 'mongodb';

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };
export type ChatHistoryRecord = {
  _id?: ObjectId;
  sessionId: string;
  userId: string;
  docId?: string | null;
  messages: ChatMessage[];
  citations?: Array<{
    index: number;
    docId: string;
    nodeId: string;
    title?: string;
    sectionTitle?: string;
    pageRange?: { start?: number; end?: number };
    score?: number;
    uid?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

