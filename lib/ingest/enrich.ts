import { generateJson } from '@/lib/ai/generate';
import { buildManagerMdPrompt, type ManagerAnalysisJSON, type ManagerNodeJSON } from '@/lib/prompt';
import type { DocumentChunk } from './chunker';

const INPUT_BUDGET = 45000;

/** Labels each chunk so the model can return one node per chunk and nodes map back exactly. */
export function chunkedInput(chunks: DocumentChunk[]): string {
  const share = Math.max(1500, Math.floor(INPUT_BUDGET / Math.max(1, chunks.length)));
  return chunks
    .map(c => `[Chunk ${c.order} | pages ${c.pageStart}-${c.pageEnd}]\n${c.text.length > share ? `${c.text.slice(0, share)}…` : c.text}`)
    .join('\n\n')
    .slice(0, INPUT_BUDGET + 2000);
}

/** One AI call per document. Returns null when generation fails so callers use heuristics. */
export async function enrichChunks(
  chunks: DocumentChunk[],
  meta: { department?: string; documentType?: string },
  log = 'ingest'
): Promise<ManagerAnalysisJSON | null> {
  if (!chunks.some(c => c.text.trim())) return null;
  try {
    const result = await generateJson<ManagerAnalysisJSON>({
      instructions: buildManagerMdPrompt(meta),
      input: `Document content in ${chunks.length} numbered chunks:\n\n${chunkedInput(chunks)}`,
      timeoutMs: 150000,
    });
    if (!result || !Array.isArray(result.nodes)) return null;
    return result;
  } catch (err) {
    console.warn(`[${log}] AI enrichment failed, using heuristic extraction`, err);
    return null;
  }
}

/** The AI node for a chunk: by chunk number, else by position when counts match, else by pages. */
export function aiNodeFor(nodes: ManagerNodeJSON[], chunk: DocumentChunk, index: number, total: number): ManagerNodeJSON | undefined {
  const byNumber = nodes.find(n => Number(n.chunk) === chunk.order);
  if (byNumber) return byNumber;
  if (nodes.some(n => n.chunk != null)) return undefined;
  if (nodes.length === total) return nodes[index];
  const multiPage = new Set(nodes.map(n => `${n.pageRange?.start}-${n.pageRange?.end}`)).size > 1;
  return multiPage
    ? nodes.find(n => n.pageRange && n.pageRange.start <= chunk.pageEnd && n.pageRange.end >= chunk.pageStart)
    : undefined;
}
