import { NormalizedDocument } from './normalization';

export type DocumentChunk = {
	chunkId: string;
	documentId?: string;
	order: number;
	pageStart: number;
	pageEnd: number;
	sourcePages: number[];
	text: string;
	characterCount: number;
	images: Array<{ base64: string; mimeType: string }>;
	previousChunkId?: string;
	nextChunkId?: string;
};

const TARGET_MIN_CHARS = 2500;
const TARGET_MAX_CHARS = 5000;
const HARD_MAX_CHARS = 7500;
const OVERLAP_CHARS = 300;

interface PageSlice {
	pageNumber: number;
	paragraphs: string[];
	images: Array<{ base64: string; mimeType: string }>;
}

/**
 * Deterministic, page-aware, paragraph-aware, size-bounded document chunker.
 */
export function chunkDocument(doc: NormalizedDocument, documentId?: string): DocumentChunk[] {
	// 1. Prepare page slices by breaking each page into paragraphs
	const validPages: PageSlice[] = [];
	for (const page of doc.pages) {
		const rawText = (page.text || '').trim();
		const images = Array.isArray(page.images) ? page.images : [];

		if (!rawText && images.length === 0) {
			continue; // skip completely blank page
		}

		const paragraphs = rawText
			.split(/\n{2,}/g)
			.map(p => p.trim())
			.filter(Boolean);

		validPages.push({
			pageNumber: page.pageNumber,
			paragraphs: paragraphs.length > 0 ? paragraphs : [rawText],
			images
		});
	}

	if (validPages.length === 0) {
		// Single empty chunk fallback
		return [
			{
				chunkId: 'chunk-1',
				documentId,
				order: 1,
				pageStart: 1,
				pageEnd: 1,
				sourcePages: [1],
				text: doc.fullText || '',
				characterCount: (doc.fullText || '').length,
				images: []
			}
		];
	}

	type RawChunk = {
		text: string;
		pages: number[];
		images: Array<{ base64: string; mimeType: string }>;
	};

	const rawChunks: RawChunk[] = [];
	let currentText = '';
	let currentPages: number[] = [];
	let currentImages: Array<{ base64: string; mimeType: string }> = [];

	for (const page of validPages) {
		for (const para of page.paragraphs) {
			// If a single paragraph is larger than HARD_MAX_CHARS, break it by sentences
			if (para.length > HARD_MAX_CHARS) {
				// Flush current buffer if any
				if (currentText.trim()) {
					rawChunks.push({
						text: currentText.trim(),
						pages: Array.from(new Set(currentPages)),
						images: currentImages
					});
					currentText = '';
					currentPages = [];
					currentImages = [];
				}

				// Split huge paragraph by sentences
				const sentences = para.split(/(?<=[.!?])\s+/).filter(Boolean);
				let sBuffer = '';
				for (const s of sentences) {
					if ((sBuffer + ' ' + s).length > TARGET_MAX_CHARS && sBuffer) {
						rawChunks.push({
							text: sBuffer.trim(),
							pages: [page.pageNumber],
							images: []
						});
						// Overlap last sentence if sensible
						const overlap = sBuffer.slice(-OVERLAP_CHARS);
						sBuffer = overlap + ' ' + s;
					} else {
						sBuffer = sBuffer ? sBuffer + ' ' + s : s;
					}
				}
				if (sBuffer.trim()) {
					currentText = sBuffer.trim();
					currentPages.push(page.pageNumber);
				}
				continue;
			}

			// Check if adding this paragraph exceeds target chunk size
			const candidateLength = currentText.length + (currentText ? 2 : 0) + para.length;

			if (candidateLength > TARGET_MAX_CHARS && currentText.length >= TARGET_MIN_CHARS) {
				// Flush chunk
				rawChunks.push({
					text: currentText.trim(),
					pages: Array.from(new Set(currentPages)),
					images: currentImages
				});

				// Start new chunk with small overlap if available
				const overlap = currentText.slice(-OVERLAP_CHARS).trim();
				const overlapClean = overlap.indexOf(' ') > 0 ? overlap.slice(overlap.indexOf(' ') + 1) : '';
				currentText = overlapClean ? `${overlapClean}\n\n${para}` : para;
				currentPages = [page.pageNumber];
				currentImages = [...page.images];
			} else {
				// Append to current chunk
				currentText = currentText ? `${currentText}\n\n${para}` : para;
				if (!currentPages.includes(page.pageNumber)) {
					currentPages.push(page.pageNumber);
				}
				if (page.images.length > 0) {
					for (const img of page.images) {
						if (!currentImages.some(im => im.base64 === img.base64)) {
							currentImages.push(img);
						}
					}
				}
			}
		}
	}

	// Flush remaining buffer
	if (currentText.trim()) {
		// If last chunk is very small (< 1000 chars) and we already have chunks, merge into previous chunk if within hard max
		if (
			rawChunks.length > 0 &&
			currentText.length < 1000 &&
			rawChunks[rawChunks.length - 1].text.length + currentText.length <= HARD_MAX_CHARS
		) {
			const prev = rawChunks[rawChunks.length - 1];
			prev.text = `${prev.text}\n\n${currentText.trim()}`;
			prev.pages = Array.from(new Set([...prev.pages, ...currentPages]));
			prev.images.push(...currentImages);
		} else {
			rawChunks.push({
				text: currentText.trim(),
				pages: Array.from(new Set(currentPages)),
				images: currentImages
			});
		}
	}

	if (rawChunks.length === 0) {
		rawChunks.push({
			text: doc.fullText || '',
			pages: [1],
			images: []
		});
	}

	// 2. Build final linked DocumentChunk objects
	const chunks: DocumentChunk[] = [];
	for (let i = 0; i < rawChunks.length; i++) {
		const order = i + 1;
		const chunkId = `chunk-${order}`;
		const rc = rawChunks[i];
		const pages = rc.pages.length > 0 ? rc.pages.sort((a, b) => a - b) : [order];
		const pageStart = pages[0];
		const pageEnd = pages[pages.length - 1];

		chunks.push({
			chunkId,
			documentId,
			order,
			pageStart,
			pageEnd,
			sourcePages: pages,
			text: rc.text,
			characterCount: rc.text.length,
			images: rc.images,
			previousChunkId: i > 0 ? `chunk-${i}` : undefined,
			nextChunkId: i < rawChunks.length - 1 ? `chunk-${i + 2}` : undefined
		});
	}

	return chunks;
}
