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

  // Filter extremely noisy TrueType warnings (e.g., "TT: undefined function: 32")
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const first = args[0];
    const msg = typeof first === 'string' ? first : (first instanceof Error ? first.message : String(first ?? ''));
    if (/^TT: undefined function/i.test(msg)) return; // ignore font TT interpreter noise
    originalWarn(...(args as [unknown, ...unknown[]]));
  };

  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  const pages: PdfPage[] = [];
  try {
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items as Array<{ str?: string }>;
      const text = items.map((it) => (typeof it.str === 'string' ? it.str : '')).join(' ').replace(/\s+/g, ' ').trim();
      pages.push({ index: i, text });
    }
  } finally {
    try { await pdf.destroy(); } catch {}
    // restore console.warn
    console.warn = originalWarn;
  }
  return { pages, pageCount };
}
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-explicit-any */

// Attempt server-side rasterization of PDF pages into PNG (base64)
type PageImage = { base64: string; mimeType: 'image/png' };
export type PdfPageWithImages = { index: number; text: string; images: PageImage[] };

async function getNodeCanvas(): Promise<null | { createCanvas: (w: number, h: number) => any; ImageData: any }>
{
  try {
    // Lazy, non-static import to avoid bundler resolution when not installed
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const dynImport = new Function('m', 'return import(m)');
    const mod = await (dynImport as (m: string) => Promise<any>)('canvas');
    return { createCanvas: (mod as any).createCanvas, ImageData: (mod as any).ImageData };
  } catch {
    return null;
  }
}

// Minimal CanvasFactory for pdf.js node rendering
class NodeCanvasFactory {
  private createCanvas: (w: number, h: number) => any;
  constructor(createCanvas: (w: number, h: number) => any) {
    this.createCanvas = createCanvas;
  }
  create(width: number, height: number) {
    const canvas = this.createCanvas(width, height);
    const context = canvas.getContext('2d');
    return { canvas, context };
  }
  reset(canvasAndContext: { canvas: any; context: any }, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext: { canvas: any; context: any }) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}

export async function extractPdfPagesWithImagesFromBase64(base64: string, opts?: { scale?: number; imagesPerPage?: number }): Promise<{ pages: PdfPageWithImages[]; pageCount: number }>
{
  const pdfjsLib = await getPdfJs();
  const bytes = Buffer.from(base64, 'base64');
  const uint8Array = new Uint8Array(bytes);

  const nodeCanvas = await getNodeCanvas();

  // Scoped filter for noisy TT warnings
  const originalWarn = console.warn;
  const originalErr = console.error;
  console.warn = (...args: unknown[]) => {
    const first = args[0];
    const msg = typeof first === 'string' ? first : (first instanceof Error ? first.message : String(first ?? ''));
    if (/^TT: undefined function/i.test(msg)) return;
    originalWarn(...(args as [unknown, ...unknown[]]));
  };
  console.error = (...args: unknown[]) => {
    const first = args[0];
    const msg = typeof first === 'string' ? first : (first instanceof Error ? first.message : String(first ?? ''));
    if (/^TT: undefined function/i.test(msg)) return;
    originalErr(...(args as [unknown, ...unknown[]]));
  };

  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  const pages: PdfPageWithImages[] = [];
  const scale = Math.max(1.5, Math.min(3.0, opts?.scale || 2));
  const perPage = Math.max(1, Math.min(2, opts?.imagesPerPage || 1));

  try {
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items as Array<{ str?: string }>;
      const text = items.map((it) => (typeof it.str === 'string' ? it.str : '')).join(' ').replace(/\s+/g, ' ').trim();

      const images: PageImage[] = [];
      if (nodeCanvas) {
        try {
          const vp = page.getViewport({ scale });
          const factory = new NodeCanvasFactory(nodeCanvas.createCanvas);
          const { canvas, context } = factory.create(vp.width, vp.height);
          await page.render({ canvasContext: context, viewport: vp }).promise;
          const buf: Buffer = canvas.toBuffer('image/png');
          const base64png = buf.toString('base64');
          images.push({ base64: base64png, mimeType: 'image/png' });
          factory.destroy({ canvas, context });
        } catch {
          // ignore render errors per page; continue
        }
      }

      pages.push({ index: i, text, images: images.slice(0, perPage) });
    }
  } finally {
    try { await pdf.destroy(); } catch {}
    console.warn = originalWarn;
    console.error = originalErr;
  }
  return { pages, pageCount };
}
