import { extractPdfPagesFromBase64, extractPdfPagesWithImagesFromBase64 } from '@/lib/pdf';
import { parseHtmlForIngestion } from '@/lib/html';
import { imageMimeType, transcribeImage } from './ocr';

/** Pages without a text layer are transcribed from their rendered image, up to this many. */
const MAX_OCR_PAGES = 12;

export class ExtractionError extends Error {}

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

			let ocrPages = 0;
			for (const page of pages) {
				if (page.text.replace(/\s+/g, '').length >= 20 || !page.images?.[0] || ocrPages >= MAX_OCR_PAGES) continue;
				ocrPages++;
				try {
					page.text = await transcribeImage(page.images[0].base64, page.images[0].mimeType);
				} catch (err) {
					console.warn(`[normalize] OCR failed for ${filename} page ${page.pageNumber}:`, err);
				}
			}
			if (!pages.some(p => p.text.trim())) {
				throw new ExtractionError('No readable text was found in this PDF. If it is a scan, upload the pages as images so they can be transcribed.');
			}
			fullText = pages
				.map(p => `[Page ${p.pageNumber}]\n${p.text}`)
				.join('\n\n')
				.trim();
			break;
		}

		case 'image': {
			mimeType = imageMimeType(rawContent);
			let text = '';
			try {
				text = await transcribeImage(rawContent, mimeType);
			} catch (err) {
				console.warn(`[normalize] OCR failed for ${filename}:`, err);
				throw new ExtractionError('The image could not be transcribed right now. Try again in a moment.');
			}
			if (!text.trim()) throw new ExtractionError('No readable text was found in this image.');
			pages = [{ pageNumber: 1, text, images: [{ base64: rawContent, mimeType }] }];
			pageCount = 1;
			fullText = text;
			break;
		}

		case 'doc': {
			mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
			try {
				const mammoth = await import('mammoth');
				const { value } = await mammoth.extractRawText({ buffer: Buffer.from(rawContent, 'base64') });
				fullText = value.replace(/\n{3,}/g, '\n\n').trim();
			} catch (err) {
				console.warn(`[normalize] Word extraction failed for ${filename}:`, err);
				fullText = '';
			}
			if (!fullText) throw new ExtractionError('Only .docx Word files can be read. Save older .doc files as .docx or PDF.');
			pages = [{ pageNumber: 1, text: fullText, images: [] }];
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
