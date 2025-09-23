/* eslint-disable @typescript-eslint/no-explicit-any */
// Lazy import pdfjs to avoid ESM/worker path issues at build time
async function getPdfJs() {
  // Use legacy mjs builds for Node
  const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
  try {
    const worker: any = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = worker;
  } catch {
    // Worker not needed/available in this context
  }
  try {
    // Reduce noisy warnings from pdf.js (e.g., TT undefined function)
    const level = (pdfjsLib.VerbosityLevel && (pdfjsLib.VerbosityLevel.errors || 0)) || 0;
    pdfjsLib.setVerbosity?.(level);
  } catch {}
  return pdfjsLib;
}

export type PdfPage = {
  index: number; // 1-based
  text: string;
};

export async function extractPdfPagesFromBase64(base64: string): Promise<{ pages: PdfPage[]; pageCount: number }>
{
  const pdfjsLib = await getPdfJs();
  const bytes = Buffer.from(base64, 'base64');
  const uint8Array = new Uint8Array(bytes);

  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  const pages: PdfPage[] = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<{ str?: string }>;
    const text = items.map((it) => (typeof it.str === 'string' ? it.str : '')).join(' ').replace(/\s+/g, ' ').trim();
    pages.push({ index: i, text });
  }

  try { await pdf.destroy(); } catch {}
  return { pages, pageCount };
}
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-explicit-any */
