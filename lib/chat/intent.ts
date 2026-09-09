type QueryIntent = 'greeting' | 'meta' | 'document';

const GREETING_RE = /^(hi|hii+|hello|hey|yo|good\s*(morning|afternoon|evening)|namaste|thanks?|thank you|ok(ay)?|cool|great|bye|goodbye)[\s!.,]*$/i;
const META_RE = /^(who are you|what are you|what can you do|how can you help(?: me)?|how do I use (?:this app|docsetu)|your name|your capabilities)[\s!?.]*$/i;

export function classifyIntent(query: string): QueryIntent {
  const q = query.trim();
  if (GREETING_RE.test(q)) return 'greeting';
  if (q.split(/\s+/).length <= 12 && META_RE.test(q)) return 'meta';
  return 'document';
}

export function directReply(intent: QueryIntent, docScoped: boolean): string {
  if (intent === 'greeting') {
    return docScoped
      ? 'Hello. Ask me anything about this document and I will answer from its contents with references.'
      : 'Hello. Ask me a question about your documents and I will answer from them with references.';
  }
  return docScoped
    ? 'I answer questions about this document using its actual text. You can ask for a summary, a specific clause, a date, an owner, or anything else in it — I will only cover what you ask.'
    : 'I answer questions grounded in your document corpus. Ask about a specific topic, requirement, date, or document and I will reply with the relevant passages cited.';
}

/** Keep only citations the model actually referenced as [#N]. */
export function referencedIndices(reply: string): Set<number> {
  const found = new Set<number>();
  for (const m of reply.matchAll(/\[#(\d+)\]/g)) found.add(Number(m[1]));
  return found;
}

