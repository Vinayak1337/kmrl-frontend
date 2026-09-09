import { CHAT_INSTRUCTIONS } from './prompt';
import { generateWithMuseSpark } from '@/lib/ai/opencodeZen';
import { searchDocumentsAndChunks, type ChunkSearchResult } from '@/lib/search/searchService';
import type { JwtUser } from '@/lib/auth';
import type { ChatMessage } from './types';
import { retrievalQuery } from './retrieval';
import { referencedIndices } from './intent';

interface AnswerOptions {
  query: string;
  session: JwtUser;
  docId?: string;
  topK: number;
  mergedMessages: ChatMessage[];
  sessionId: string;
}

export async function answerQuestion({ query, session, docId, topK, mergedMessages, sessionId }: AnswerOptions) {
  // Retrieve candidate chunks using canonical search service
  const searchResult = await searchDocumentsAndChunks({
    query: await retrievalQuery(query, sessionId),
    session,
    documentId: docId,
    searchNodes: true,
    limit: topK
  });

  const topChunks = (searchResult.results as ChunkSearchResult[]) || [];

  // Build evidence-rich context blocks with raw chunk text
  const contextBlocks = topChunks
    .map(
      (c, i) =>
        `[#${i + 1}] Document: "${c.documentTitle}" | Section: "${c.title}" (Pages ${c.pageRange.start}-${c.pageRange.end})
Content:
${c.content}
Key Points: ${(c.keyPoints || []).join('; ')}`
    )
    .join('\n\n---\n\n');

  let reply = '';
  let generation: 'model' | 'fallback' = 'fallback';
  try {
    const history = mergedMessages
      .slice(-7, -1)
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const prompt = `Context Blocks:
${contextBlocks || '(No matching context blocks found)'}

${history ? `Conversation History (for reference resolution only):\n${history}\n\n` : ''}User Question:
${query}

Answer the question above and nothing more.`;

    const museRes = await generateWithMuseSpark({
      instructions: CHAT_INSTRUCTIONS,
      input: prompt,
      sessionId
    });
    reply = museRes.text;
    if (reply) generation = 'model';
  } catch (llmErr) {
    console.warn('[chat] OpenCode Zen Muse Spark synthesis failed, falling back to summary', llmErr);
  }

  if (!reply) {
    if (topChunks.length > 0) {
      const focus = topChunks[0];
      reply = `The closest matching passage is in "${focus.documentTitle}" (${focus.title}) [#1]:\n\n${focus.nodeSummary || focus.content.slice(0, 300)}`;
    } else {
      reply = 'I could not find anything in your documents that answers this question.';
    }
  }

  // Only surface citations the answer actually referenced; if none were referenced, return none.
  const used = referencedIndices(reply);
  const citations = topChunks
    .map((c, i) => ({ c, i }))
    .filter(({ i }) => used.has(i + 1))
    .map(({ c, i }) => ({
      index: i + 1,
      docId: c.documentId,
      nodeId: c.nodeId,
      score: c.score,
      title: c.documentTitle,
      sectionTitle: c.title,
      pageRange: c.pageRange,
      uid: c.uid
    }));

  return { reply, citations, generation };
}
