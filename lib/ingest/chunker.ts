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
	images: Array<{ base64: string; mimeType: string; page?: number }>;
	previousChunkId?: string;
	nextChunkId?: string;
};

const TARGET_MIN_CHARS = 2500;
const TARGET_MAX_CHARS = 5000;
const HARD_MAX_CHARS = 7500;
const OVERLAP_CHARS = 300;
const MAX_CHUNK_IMAGE_CHARS = 10 * 1024 * 1024;

type Image = DocumentChunk['images'][number];
type RawChunk = { text: string; pages: number[]; images: Image[] };

// Require a clear structural signal rather than treating every short sentence as a topic.
function isHeading(text: string): boolean {
	const line = text.split('\n', 1)[0].trim();
	if (!line || line.length > 120) return false;
	return /^#{1,6}\s+\S/.test(line) ||
		/^(?:chapter|section|part)\s+(?:\d+|[ivxlcdm]+)\b/i.test(line) ||
		/^\d+(?:\.\d+){0,4}[.)]?\s+\p{L}/u.test(line) ||
		(/^[\p{Lu}\d][\p{Lu}\d\s&,:/()–—-]+$/u.test(line) && /\p{Lu}/u.test(line) && line.split(/\s+/).length <= 12);
}

export function sourceSectionTitle(text: string): string | undefined {
	const line = text.split('\n', 1)[0].trim();
	return isHeading(line) ? line.replace(/^#{1,6}\s+/, '') : undefined;
}

function splitParagraphs(text: string): string[] {
	const result: string[] = [];
	let block = '';
	for (const line of text.split(/\n/)) {
		const trimmed = line.trim();
		if (!trimmed || isHeading(trimmed)) {
			if (block.trim()) result.push(block.trim());
			block = trimmed;
		} else {
			block = block ? `${block}\n${trimmed}` : trimmed;
		}
	}
	if (block.trim()) result.push(block.trim());
	return result;
}

function splitLongText(text: string, max: number): string[] {
	const parts: string[] = [];
	let rest = text;
	while (rest.length > max) {
		const cut = rest.lastIndexOf(' ', max);
		const at = cut > max / 2 ? cut : max;
		parts.push(rest.slice(0, at).trim());
		rest = rest.slice(at).trim();
	}
	if (rest) parts.push(rest);
	return parts;
}

export function hasPageBoundaries(doc: NormalizedDocument) {
	return doc.format === 'pdf' || (doc.format === 'doc' && doc.pages.length > 1);
}

/** Keeps whole pages together when the source supplies page boundaries. */
export function chunkDocument(doc: NormalizedDocument, documentId?: string): DocumentChunk[] {
	const chunks: RawChunk[] = [];
	let current: RawChunk = { text: '', pages: [], images: [] };
	let topicStart = false;
	const flush = () => {
		if (current.text || current.images.length) chunks.push(current);
		current = { text: '', pages: [], images: [] };
	};
	const add = (text: string, page: number, images: Image[]) => {
		current.text = current.text && text ? `${current.text}\n\n${text}` : current.text || text;
		if (!current.pages.includes(page)) current.pages.push(page);
		for (const image of images) {
			if (!current.images.some(existing => existing.base64 === image.base64 && existing.mimeType === image.mimeType && existing.page === image.page)) current.images.push(image);
		}
	};

	const paged = hasPageBoundaries(doc);
	for (const page of doc.pages) {
		let images = (page.images || []).map(image => ({ ...image, page: page.pageNumber }));
		const imageSize = images.reduce((size, image) => size + image.base64.length, 0);
		if (imageSize && imageSize + current.images.reduce((size, image) => size + image.base64.length, 0) > MAX_CHUNK_IMAGE_CHARS) flush();
		if (paged) {
			const text = `[Page ${page.pageNumber}]${page.text.trim() ? `\n${page.text.trim()}` : ''}`;
			if (current.pages.length && (current.pages.length >= 3 || current.text.length + text.length + 2 > TARGET_MAX_CHARS)) flush();
			add(text, page.pageNumber, images);
			continue;
		}
		const paragraphs = splitParagraphs(page.text || '');
		if (!paragraphs.length) {
			if (images.length) add('', page.pageNumber, images);
			continue;
		}
		for (const paragraph of paragraphs) {
			const heading = isHeading(paragraph);
			if (heading && current.text && !topicStart) flush();
			const parts = splitLongText(paragraph, TARGET_MAX_CHARS);
			for (const part of parts) {
				const candidateLength = current.text.length + (current.text ? 2 : 0) + part.length;
				if (current.text && (candidateLength > HARD_MAX_CHARS || (candidateLength > TARGET_MAX_CHARS && current.text.length >= TARGET_MIN_CHARS))) {
					const previous = current;
					flush();
					// A size split can overlap, but a new topic must never inherit the prior topic.
					if (!heading && previous.pages.length === 1 && previous.pages[0] === page.pageNumber && previous.text.length > OVERLAP_CHARS) {
						const tail = previous.text.slice(-OVERLAP_CHARS);
						const space = tail.indexOf(' ');
						if (space >= 0) {
							current.text = tail.slice(space + 1).trim();
							current.pages = [...previous.pages];
						}
					}
				}
				add(part, page.pageNumber, images);
				images = [];
			}
			topicStart = heading && paragraph.split('\n').length === 1;
		}
	}
	flush();
	if (!chunks.length) chunks.push({ text: (doc.fullText || '').slice(0, HARD_MAX_CHARS), pages: [1], images: [] });
	const ids = chunks.map((chunk, index) => paged
		? `pages-${chunk.pages[0]}-${chunk.pages.at(-1)}`
		: `chunk-${index + 1}`);
	return chunks.map((chunk, i) => {
		const pages = chunk.pages.length ? chunk.pages : [1];
		return {
			chunkId: ids[i], documentId, order: i + 1,
			pageStart: pages[0], pageEnd: pages[pages.length - 1], sourcePages: pages,
			text: chunk.text, characterCount: chunk.text.length, images: chunk.images,
			previousChunkId: ids[i - 1],
			nextChunkId: ids[i + 1]
		};
	});
}
