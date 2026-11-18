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

	const loadingTask = pdfjsLib.getDocument({ data: uint8Array, verbosity: 0, isEvalSupported: false });
	const pdf = await loadingTask.promise;
	const pageCount = pdf.numPages;

	const pages: PdfPage[] = [];
	try {
		for (let i = 1; i <= pageCount; i++) {
			const page = await pdf.getPage(i);
			const textContent = await page.getTextContent();
			const items = textContent.items as Array<{ str?: string; hasEOL?: boolean }>;
			const text = items
				.map(it => `${typeof it.str === 'string' ? it.str : ''}${it.hasEOL ? '\n' : ' '}`)
				.join('')
				.replace(/[^\S\n]+/g, ' ')
				.replace(/ *\n */g, '\n')
				.trim();
			pages.push({ index: i, text });
		}
	} finally {
		try {
			await pdf.destroy();
		} catch {}
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

export async function extractPdfPagesWithImagesFromBase64(
	base64: string,
	opts?: { scale?: number; imagesPerPage?: number; maxTextPageImages?: number; maxScanPageImages?: number }
): Promise<{ pages: PdfPageWithImages[]; pageCount: number }> {
	const pdfjsLib = await getPdfJs();
	const bytes = Buffer.from(base64, 'base64');
	const uint8Array = new Uint8Array(bytes);

	// Explicit import keeps the native binary traceable in the Vercel functions.
	const canvasAvailable = await import('@napi-rs/canvas').then(() => true).catch(() => false);
	if (!canvasAvailable) console.info('[pdf] Node PDF image renderer is unavailable');

	const loadingTask = pdfjsLib.getDocument({ data: uint8Array, verbosity: 0, isEvalSupported: false });
	const pdf = await loadingTask.promise;
	const pageCount = pdf.numPages;

	const pages: PdfPageWithImages[] = [];
	const scale = Math.max(1.5, Math.min(3.0, opts?.scale || 2));
	let textImages = 0;
	let scanImages = 0;

	try {
		for (let i = 1; i <= pageCount; i++) {
			const page = await pdf.getPage(i);
			const textContent = await page.getTextContent();
			const items = textContent.items as Array<{ str?: string; hasEOL?: boolean }>;
			const text = items
				.map(it => `${typeof it.str === 'string' ? it.str : ''}${it.hasEOL ? '\n' : ' '}`)
				.join('')
				.replace(/[^\S\n]+/g, ' ')
				.replace(/ *\n */g, '\n')
				.trim();

			const images: PageImage[] = [];
			const scanned = text.replace(/\s+/g, '').length < 20;
			const belowQuota = scanned
				? scanImages < (opts?.maxScanPageImages ?? Infinity)
				: textImages < (opts?.maxTextPageImages ?? Infinity);
			if (canvasAvailable && belowQuota) {
				if (scanned) scanImages++;
				else textImages++;
				try {
					const fullViewport = page.getViewport({ scale });
					const maxSide = Math.max(fullViewport.width, fullViewport.height);
					const vp = maxSide > 2400 ? page.getViewport({ scale: scale * 2400 / maxSide }) : fullViewport;
					const factory = pdf.canvasFactory;
					const surface = factory.create(Math.ceil(vp.width), Math.ceil(vp.height));
					try {
						await page.render({ canvasContext: surface.context, viewport: vp }).promise;
						const buf: Buffer = surface.canvas.toBuffer('image/png');
						if (buf.length <= 2 * 1024 * 1024) images.push({ base64: buf.toString('base64'), mimeType: 'image/png' });
					} finally {
						factory.destroy(surface);
					}
				} catch {
					// ignore render errors per page; continue
				}
			}

			pages.push({ index: i, text, images });
		}
	} finally {
		try {
			await pdf.destroy();
		} catch {}
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
