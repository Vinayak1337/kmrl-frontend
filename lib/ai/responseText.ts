/** Read all assistant text blocks from a Responses API payload. */
export function responseText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return '';
  return output.flatMap(item => {
    if (!item || (item.type !== 'message' && item.role !== 'assistant')) return [];
    if (typeof item.content === 'string') return [item.content];
    if (!Array.isArray(item.content)) return [];
    return item.content.flatMap((part: { text?: unknown } | null) => typeof part?.text === 'string' ? [part.text] : []);
  }).join('\n').trim();
}
