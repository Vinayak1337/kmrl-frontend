import { generateJson } from '@/lib/ai/generate';
import { buildManagerMdPrompt, type ManagerAnalysisJSON, type ManagerNodeJSON } from '@/lib/prompt';
import type { DocumentChunk } from './chunker';

const INPUT_BUDGET = 45000;
/** Chunks per model call; larger documents are enriched in parallel batches so each call stays fast. */
const BATCH_SIZE = 8;
const BATCH_CONCURRENCY = 2;

/** Labels each chunk so the model can return one node per chunk and nodes map back exactly. */
export function chunkedInput(chunks: DocumentChunk[], budget = INPUT_BUDGET): string {
  const share = Math.max(1500, Math.floor(budget / Math.max(1, chunks.length)));
  return chunks
    .map(c => `[Chunk ${c.order} | pages ${c.pageStart}-${c.pageEnd}]\n${c.text.length > share ? `${c.text.slice(0, share)}…` : c.text}`)
    .join('\n\n')
    .slice(0, budget + 2000);
}

async function enrichBatch(chunks: DocumentChunk[], meta: { department?: string; documentType?: string }, total: number) {
  const scope = chunks.length === total ? `${total} numbered chunks` : `chunks ${chunks[0].order}-${chunks[chunks.length - 1].order} of ${total}`;
  return generateJson<ManagerAnalysisJSON>({
    instructions: buildManagerMdPrompt(meta),
    input: `Document content, ${scope}:\n\n${chunkedInput(chunks, chunks.length === total ? INPUT_BUDGET : 24000)}`,
    timeoutMs: 150000,
  });
}

async function overallSummary(chunks: DocumentChunk[], meta: { department?: string; documentType?: string }) {
  const outline = chunks.map(c => `[Chunk ${c.order} | pages ${c.pageStart}-${c.pageEnd}] ${c.text.slice(0, 700)}`).join('\n\n').slice(0, 30000);
  const result = await generateJson<{ overallMd: string }>({
    instructions: `You summarise long organisational documents for managers${meta.department ? ` in ${meta.department}` : ''}. Return JSON {"overallMd": "## Executive Summary\\n..."} with 1-2 short paragraphs on main decisions, deadlines, risks and impacted departments. Use only the supplied text.`,
    input: `Opening text of each section:\n\n${outline}`,
    timeoutMs: 150000,
  });
  return typeof result.overallMd === 'string' ? result.overallMd : '';
}

/** Returns null when generation fails so callers use heuristics. */
export async function enrichChunks(
  chunks: DocumentChunk[],
  meta: { department?: string; documentType?: string },
  log = 'ingest'
): Promise<ManagerAnalysisJSON | null> {
  if (!chunks.some(c => c.text.trim())) return null;
  try {
    if (chunks.length <= BATCH_SIZE) {
      const result = await enrichBatch(chunks, meta, chunks.length);
      return result && Array.isArray(result.nodes) ? result : null;
    }
    const batches: DocumentChunk[][] = [];
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) batches.push(chunks.slice(i, i + BATCH_SIZE));
    const results: Array<ManagerAnalysisJSON | null> = new Array(batches.length).fill(null);
    let next = 0;
    const worker = async () => {
      while (next < batches.length) {
        const index = next++;
        try {
          results[index] = await enrichBatch(batches[index], meta, chunks.length);
        } catch (err) {
          console.warn(`[${log}] AI enrichment batch ${index + 1}/${batches.length} failed`, err);
        }
      }
    };
    const [overall] = await Promise.all([
      overallSummary(chunks, meta).catch(err => { console.warn(`[${log}] overall summary failed`, err); return ''; }),
      ...Array.from({ length: BATCH_CONCURRENCY }, worker),
    ]);
    const nodes = results.flatMap(r => (r && Array.isArray(r.nodes) ? r.nodes : []));
    if (!nodes.length && !overall) return null;
    const first = results.find(Boolean);
    return { ...(first || {}), nodes, overallMd: overall || first?.overallMd || '' } as ManagerAnalysisJSON;
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

/** Section title from the AI summary's "### Heading", else undefined so the builder derives one. */
export function aiNodeTitle(node: ManagerNodeJSON | undefined): string | undefined {
  const heading = node?.summaryMd?.match(/^\s*#{1,4}\s*(.+)$/m)?.[1]?.replace(/[*_`]+/g, '').trim();
  return heading && heading.length <= 90 ? heading : undefined;
}
