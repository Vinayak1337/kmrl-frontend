import { randomUUID } from 'node:crypto';
import type { ChatMessage } from './types';

export class ChatInputError extends Error {}

/** Validate at the HTTP boundary; never accept client system instructions. */
export function parseChatRequest(body: unknown) {
  if (!body || typeof body !== 'object') throw new ChatInputError('Invalid chat request');
  const input = body as Record<string, unknown>;
  for (const key of ['sessionId', 'docId']) {
    if (input[key] !== undefined && (typeof input[key] !== 'string' || !(input[key] as string).trim() || (input[key] as string).length > 200)) {
      throw new ChatInputError(`Invalid ${key}`);
    }
  }
  if (!Array.isArray(input.messages) || !input.messages.length || input.messages.length > 200) throw new ChatInputError('User messages are required');
  const clientMessages: ChatMessage[] = input.messages.map(message => {
    if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string' || !message.content.trim() || message.content.length > 20000) throw new ChatInputError('Invalid chat message');
    return { role: message.role, content: message.content.trim() };
  });
  if (clientMessages.at(-1)?.role !== 'user') throw new ChatInputError('Last message must be a user query');
  return {
    sessionId: (input.sessionId as string | undefined) || randomUUID(),
    docId: input.docId as string | undefined,
    clientMessages,
    topK: Math.max(1, Math.min(10, Math.floor(Number(input.topK) || 5))),
  };
}
