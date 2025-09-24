//
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
		const level =
			(pdfjsLib.VerbosityLevel && (pdfjsLib.VerbosityLevel.errors || 0)) || 0;
		pdfjsLib.setVerbosity?.(level);
	} catch {}
	return pdfjsLib;
}

export type PdfPage = {
	index: number; // 1-based
	text: string;
};

export async function extractPdfPagesFromBase64(
	base64: string
): Promise<{ pages: PdfPage[]; pageCount: number }> {
	const pdfjsLib = await getPdfJs();
	const bytes = Buffer.from(base64, 'base64');
	const uint8Array = new Uint8Array(bytes);

	// Filter extremely noisy TrueType warnings (e.g., "TT: undefined function: 32")
	const originalWarn = console.warn;
	console.warn = (...args: unknown[]) => {
		const first = args[0];
		const msg =
			typeof first === 'string'
				? first
				: first instanceof Error
				? first.message
				: String(first ?? '');
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
			const text = items
				.map(it => (typeof it.str === 'string' ? it.str : ''))
				.join(' ')
				.replace(/\s+/g, ' ')
				.trim();
			pages.push({ index: i, text });
		}
	} finally {
		try {
			await pdf.destroy();
		} catch {}
		// restore console.warn
		console.warn = originalWarn;
	}
	return { pages, pageCount };
}
//
//

// Attempt server-side rasterization of PDF pages into PNG (base64)
type PageImage = { base64: string; mimeType: 'image/png' };
export type PdfPageWithImages = {
	index: number;
	text: string;
	images: PageImage[];
};

async function getNodeCanvas(): Promise<null | {
	createCanvas: (w: number, h: number) => any;
	ImageData: any;
}> {
	try {
		// Lazy, non-static import to avoid bundler resolution when not installed
		//
		const dynImport = new Function('m', 'return import(m)');
		const mod = await (dynImport as (m: string) => Promise<any>)('canvas');
		return {
			createCanvas: (mod as any).createCanvas,
			ImageData: (mod as any).ImageData
		};
	} catch {
		// Explicit signal for callers that rasterization won't be available
		console.info(
			'[pdf] canvas module not available; PDF image rasterization disabled'
		);
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
	reset(
		canvasAndContext: { canvas: any; context: any },
		width: number,
		height: number
	) {
		canvasAndContext.canvas.width = width;
		canvasAndContext.canvas.height = height;
	}
	destroy(canvasAndContext: { canvas: any; context: any }) {
		canvasAndContext.canvas.width = 0;
		canvasAndContext.canvas.height = 0;
	}
}

export async function extractPdfPagesWithImagesFromBase64(
	base64: string,
	opts?: { scale?: number; imagesPerPage?: number }
): Promise<{ pages: PdfPageWithImages[]; pageCount: number }> {
	const pdfjsLib = await getPdfJs();
	const bytes = Buffer.from(base64, 'base64');
	const uint8Array = new Uint8Array(bytes);

	const nodeCanvas = await getNodeCanvas();
	if (!nodeCanvas) {
		console.info(
			'[pdf] Skipping page image extraction because node-canvas is unavailable'
		);
	}

	// Scoped filter for noisy TT warnings
	const originalWarn = console.warn;
	const originalErr = console.error;
	console.warn = (...args: unknown[]) => {
		const first = args[0];
		const msg =
			typeof first === 'string'
				? first
				: first instanceof Error
				? first.message
				: String(first ?? '');
		if (/^TT: undefined function/i.test(msg)) return;
		originalWarn(...(args as [unknown, ...unknown[]]));
	};
	console.error = (...args: unknown[]) => {
		const first = args[0];
		const msg =
			typeof first === 'string'
				? first
				: first instanceof Error
				? first.message
				: String(first ?? '');
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
			const text = items
				.map(it => (typeof it.str === 'string' ? it.str : ''))
				.join(' ')
				.replace(/\s+/g, ' ')
				.trim();

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
			// Fallback: if no canvas, embed a small text placeholder as base64 so downstream always sees an image-like part
			if (!nodeCanvas && text.length > 0) {
				const placeholder = Buffer.from(
					`Page ${i}: ${text.slice(0, 300)}`,
					'utf-8'
				).toString('base64');
				images.push({ base64: placeholder, mimeType: 'text/plain' as any });
			}

			pages.push({ index: i, text, images: images.slice(0, perPage) });
		}
	} finally {
		try {
			await pdf.destroy();
		} catch {}
		console.warn = originalWarn;
		console.error = originalErr;
	}
	return { pages, pageCount };
}

// Cloudinary fallback: fetch per-page PNGs via delivery URLs
export async function fetchCloudinaryPdfPageImages(options: {
	base64Pdf: string;
	publicId?: string; // optional stable id; if not provided a transient upload is assumed upstream
	cloudName: string;
	uploadUrl?: string; // optional upload endpoint override
	pageCount: number;
	width?: number;
}): Promise<{
	publicId: string;
	pages: Array<{ index: number; url: string; mimeType: 'image/png' }>;
}> {
	const { base64Pdf, cloudName, pageCount } = options;
	const width = Math.max(800, Math.min(2400, options.width || 1600));
	// 1) Upload the PDF to Cloudinary unsigned upload API (requires preset) OR assume it's already uploaded (publicId provided)
	let publicId = options.publicId;
	if (!publicId) {
		// Minimal unsigned upload with preset name from env
		const preset = process.env.CLOUDINARY_UNSIGNED_PRESET || '';
		if (!preset) return { publicId: '', pages: [] };
		try {
			const form = new FormData();
			form.append('file', `data:application/pdf;base64,${base64Pdf}`);
			form.append('upload_preset', preset);
			const uploadEndpoint =
				options.uploadUrl ||
				`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
			const res = await fetch(uploadEndpoint, {
				method: 'POST',
				body: form as any
			} as any);
			const json = await res.json();
			if (res.ok && json && json.public_id) publicId = json.public_id as string;
			else return { publicId: '', pages: [] };
		} catch {
			return { publicId: '', pages: [] };
		}
	}
	if (!publicId) return { publicId: '', pages: [] };
	// 2) Build per-page PNG URLs and fetch
	const out: Array<{ index: number; url: string; mimeType: 'image/png' }> = [];
	for (let i = 1; i <= Math.max(1, pageCount); i++) {
		const url = `https://res.cloudinary.com/${cloudName}/image/upload/pg_${i},w_${width}/${publicId}.pdf`;
		out.push({ index: i, url, mimeType: 'image/png' });
	}
	return { publicId, pages: out };
}
