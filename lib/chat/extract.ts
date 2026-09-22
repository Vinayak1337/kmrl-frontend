/** Select verbatim source sentences, never a generated summary, during an outage. */
export function sourceExtract(content: string, query: string): string {
  const terms = new Set((query.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(t => t.length > 3));
  const sentences = content.match(/[^.!?\n]+(?:[.!?](?=\s|$)|$)/g)?.map(s => s.trim()).filter(Boolean) || [content];
  const ranked = sentences.map((text, index) => ({ text, index,
    score: [...terms].filter(term => text.toLowerCase().includes(term)).length,
  })).sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = ranked.filter(s => s.score > 0).slice(0, 4);
  return (selected.length ? selected : ranked.slice(0, 2))
    .sort((a, b) => a.index - b.index).map(s => s.text).join('\n\n').slice(0, 1600);
}
