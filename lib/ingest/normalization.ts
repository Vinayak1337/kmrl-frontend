import { extractPdfPagesFromBase64, extractPdfPagesWithImagesFromBase64 } from '@/lib/pdf';
import { parseHtmlForIngestion } from '@/lib/html';

export type NormalizedPage = {
	pageNumber: number; // 1-based
	text: string;
	images?: Array<{ base64: string; mimeType: string }>;
};

export type NormalizedDocument = {
	title: string;
	filename: string;
	mimeType: string;
	format: 'pdf' | 'html' | 'text' | 'image' | 'doc';
	pageCount: number;
	pages: NormalizedPage[];
	fullText: string;
	rawContent: string;
};

export interface RawDocumentInput {
	type: 'pdf' | 'html' | 'text' | 'image' | 'doc' | string;
	content: string; // text or base64
	filename?: string;
	title?: string;
}

/**
 * Extracts and normalizes any document format into a clean NormalizedDocument representation
 */
export async function normalizeExtractedContent(
	input: RawDocumentInput
): Promise<NormalizedDocument> {
	const filename = input.filename || input.title || 'untitled-document';
	const title = input.title || filename.replace(/\.[^/.]+$/, '');
	const format = (input.type?.toLowerCase() || 'text') as NormalizedDocument['format'];
	const rawContent = input.content || '';

	let pages: NormalizedPage[] = [];
	let fullText = '';
	let pageCount = 1;
	let mimeType = 'text/plain';

	switch (format) {
		case 'html': {
			mimeType = 'text/html';
			const parsed = parseHtmlForIngestion(rawContent);
			fullText = parsed.textContent || '';
			const images = (parsed.images || []).map(im => ({
				base64: im.base64,
				mimeType: im.mimeType
			}));
			pages = [
				{
					pageNumber: 1,
					text: fullText,
					images
				}
			];
			pageCount = 1;
			break;
		}

		case 'text': {
			mimeType = 'text/plain';
			fullText = rawContent.trim();
			pages = [
				{
					pageNumber: 1,
					text: fullText,
					images: []
				}
			];
			pageCount = 1;
			break;
		}

		case 'pdf': {
			mimeType = 'application/pdf';
			try {
				// Try rich extraction with images if canvas is available
				const { pages: pdfPages, pageCount: count } =
					await extractPdfPagesWithImagesFromBase64(rawContent, { scale: 1.5, imagesPerPage: 1 });
				pageCount = count;
				pages = pdfPages.map(p => ({
					pageNumber: p.index,
					text: (p.text || '').trim(),
					images: p.images || []
				}));
			} catch {
				// Fallback to text-only pdfjs extraction
				try {
					const { pages: pdfPages, pageCount: count } = await extractPdfPagesFromBase64(rawContent);
					pageCount = count;
					pages = pdfPages.map(p => ({
						pageNumber: p.index,
						text: (p.text || '').trim(),
						images: []
					}));
				} catch (err) {
					console.warn(`[normalize] Failed to parse PDF ${filename}:`, err);
					pages = [{ pageNumber: 1, text: '', images: [] }];
					pageCount = 1;
				}
			}

			fullText = pages
				.map(p => `[Page ${p.pageNumber}]\n${p.text}`)
				.join('\n\n')
				.trim();
			break;
		}

		case 'image': {
			mimeType = 'image/png';
			// Image without OCR: store as page 1 with inline image
			pages = [
				{
					pageNumber: 1,
					text: '',
					images: [{ base64: rawContent, mimeType: 'image/png' }]
				}
			];
			pageCount = 1;
			fullText = '';
			break;
		}

		case 'doc': {
			mimeType = 'application/msword';
			let decodedText = rawContent;
			try {
				const buf = Buffer.from(rawContent, 'base64');
				const asciiCheck = buf.toString('utf-8');
				if (/^[\x20-\x7E\r\n\t]+$/.test(asciiCheck.slice(0, 100))) {
					decodedText = asciiCheck;
				}
			} catch {}

			fullText = decodedText.trim();
			pages = [
				{
					pageNumber: 1,
					text: fullText,
					images: []
				}
			];
			pageCount = 1;
			break;
		}

		default: {
			fullText = rawContent.trim();
			pages = [{ pageNumber: 1, text: fullText, images: [] }];
			pageCount = 1;
			break;
		}
	}

	return {
		title,
		filename,
		mimeType,
		format,
		pageCount: Math.max(1, pageCount),
		pages,
		fullText,
		rawContent
	};
}
