export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { answerQuestion } from '@/lib/chat/answer';
import { classifyIntent, directReply } from '@/lib/chat/intent';
import type { ChatMessage } from '@/lib/chat/types';
import { parseChatRequest, ChatInputError } from '@/lib/chat/request';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { chatHistoryCollection, saveChatTurn } from '@/lib/chat/history';

export async function POST(req: NextRequest) {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { sessionId, clientMessages, docId, topK } = parseChatRequest(body);

    const historyCollection = await chatHistoryCollection();

    const historyFilter: Record<string, unknown> = {
      userId: session.sub,
      sessionId
    };
    historyFilter.docId = docId ?? null;

    const existingHistory = await historyCollection.findOne(historyFilter);
    const historyMessages: ChatMessage[] = existingHistory?.messages || [];

    // Persisted history is authoritative; clients submit the latest user turn.
    const mergedMessages = [...historyMessages, clientMessages[clientMessages.length - 1]];
    const lastUser = [...mergedMessages].reverse().find(m => m.role === 'user');
    const query = lastUser?.content?.trim() || '';

    if (!query) {
      return NextResponse.json({ error: 'No user query provided' }, { status: 400 });
    }

    const intent = classifyIntent(query);

    const result = intent === 'document'
      ? await answerQuestion({ query, session, docId, topK, mergedMessages, sessionId })
      : { reply: directReply(intent, Boolean(docId)), citations: [], generation: 'direct' };
    const { reply, citations, generation } = result;
    await saveChatTurn({ sessionId, userId: session.sub, docId, messages: [...mergedMessages, { role: 'assistant', content: reply }], citations });

    return NextResponse.json({ reply, citations, sessionId, generation });
  } catch (e) {
    if (e instanceof ChatInputError || e instanceof SyntaxError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error('Chat error:', e);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const docId = searchParams.get('docId');

    const historyCollection = await chatHistoryCollection();

    const filter: Record<string, unknown> = { userId: session.sub };
    if (sessionId) filter.sessionId = sessionId;
    if (docId) filter.docId = docId;

    if (!docId) filter.docId = null;
    const record = await historyCollection.findOne(filter, { sort: { updatedAt: -1 } });

    if (!record) {
      return NextResponse.json({ messages: [], sessionId: sessionId || null });
    }

    return NextResponse.json({
      sessionId: record.sessionId,
      docId: record.docId || null,
      messages: record.messages || [],
      citations: record.citations || [],
      updatedAt: record.updatedAt
    });
  } catch (err) {
    console.error('Chat history error:', err);
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const docId = searchParams.get('docId');

    const historyCollection = await chatHistoryCollection();

    const filter: Record<string, unknown> = { userId: session.sub };
    if (sessionId) filter.sessionId = sessionId;
    if (docId) filter.docId = docId;

    await historyCollection.deleteMany(filter);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Chat history delete error:', err);
    return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 });
  }
}
