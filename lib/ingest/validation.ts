import { NormalizedDocument } from './normalization';
import { DocumentChunk } from './chunker';

export interface ChunkValidationResult {
	valid: boolean;
	errors: string[];
	metrics: {
		chunkCount: number;
		documentCharacters: number;
		totalChunkCharacters: number;
		coverageRatio: number;
		maxChunkSize: number;
		minChunkSize: number;
	};
}

const HARD_MAX_CHARS = 8000;
const MAX_ALLOWED_OVERLAP = 500;

/**
 * Validates document chunks for completeness, contiguous order, bounds,
 * and page provenance before persistence.
 */
export function validateChunkCoverage(
	normalized: NormalizedDocument,
	chunks: DocumentChunk[]
): ChunkValidationResult {
	const errors: string[] = [];
	const docTextLength = (normalized.fullText || '').trim().length;

	// 1. Check chunk count for non-empty documents
	if (docTextLength > 0 && chunks.length === 0) {
		errors.push('Validation failed: Non-empty document produced 0 chunks.');
	}

	if (chunks.length === 0) {
		return {
			valid: errors.length === 0,
			errors,
			metrics: {
				chunkCount: 0,
				documentCharacters: docTextLength,
				totalChunkCharacters: 0,
				coverageRatio: 0,
				maxChunkSize: 0,
				minChunkSize: 0
			}
		};
	}

	const seenIds = new Set<string>();
	let totalChunkChars = 0;
	let maxChunkSize = 0;
	let minChunkSize = Infinity;

	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i];
		const expectedOrder = i + 1;

		// 2. Check no empty chunks
		const chunkText = (chunk.text || '').trim();
		if (chunkText.length === 0) {
			errors.push(`Chunk at index ${i} (ID: ${chunk.chunkId}) has empty text.`);
		}

		// 3. Check unique IDs
		if (!chunk.chunkId) {
			errors.push(`Chunk at index ${i} has missing chunkId.`);
		} else if (seenIds.has(chunk.chunkId)) {
			errors.push(`Duplicate chunkId detected: "${chunk.chunkId}".`);
		} else {
			seenIds.add(chunk.chunkId);
		}

		// 4. Check contiguous order
		if (chunk.order !== expectedOrder) {
			errors.push(
				`Chunk order broken at index ${i}: expected order ${expectedOrder}, but got ${chunk.order}.`
			);
		}

		// 5. Check page provenance
		if (
			chunk.pageStart < 1 ||
			chunk.pageEnd < chunk.pageStart ||
			chunk.pageEnd > normalized.pageCount
		) {
			errors.push(
				`Invalid page provenance for chunk ${chunk.chunkId}: pages ${chunk.pageStart}-${chunk.pageEnd} outside bounds 1-${normalized.pageCount}.`
			);
		}

		if (!Array.isArray(chunk.sourcePages) || chunk.sourcePages.length === 0) {
			errors.push(`Chunk ${chunk.chunkId} has missing or empty sourcePages.`);
		} else {
			const outOfBoundsPages = chunk.sourcePages.filter(
				p => p < 1 || p > normalized.pageCount
			);
			if (outOfBoundsPages.length > 0) {
				errors.push(
					`Chunk ${chunk.chunkId} contains out-of-bounds source pages: [${outOfBoundsPages.join(', ')}].`
				);
			}
		}

		// 6. Check hard max character bounds
		const len = (chunk.text || '').length;
		if (len > HARD_MAX_CHARS) {
			errors.push(
				`Chunk ${chunk.chunkId} exceeds hard max size: ${len} chars (max allowed: ${HARD_MAX_CHARS}).`
			);
		}

		// 7. Check characterCount matches actual text length
		if (chunk.characterCount !== len) {
			errors.push(
				`Chunk ${chunk.chunkId} reported characterCount (${chunk.characterCount}) does not match text length (${len}).`
			);
		}

		totalChunkChars += len;
		if (len > maxChunkSize) maxChunkSize = len;
		if (len < minChunkSize) minChunkSize = len;

		// 8. Check overlap bounds with previous chunk
		if (i > 0) {
			const prevText = chunks[i - 1].text || '';
			// Measure overlapping tail of prevText with head of chunkText
			let overlapLen = 0;
			const samplePrev = prevText.slice(-MAX_ALLOWED_OVERLAP * 2);
			for (let checkLen = Math.min(samplePrev.length, chunkText.length, MAX_ALLOWED_OVERLAP * 2); checkLen >= 20; checkLen--) {
				const tail = samplePrev.slice(-checkLen);
				if (chunkText.startsWith(tail)) {
					overlapLen = checkLen;
					break;
				}
			}

			if (overlapLen > MAX_ALLOWED_OVERLAP) {
				errors.push(
					`Chunk ${chunk.chunkId} exceeds max allowed overlap with previous chunk: ${overlapLen} chars (limit: ${MAX_ALLOWED_OVERLAP}).`
				);
			}
		}
	}

	// 9. Source loss check
	const coverageRatio = docTextLength > 0 ? totalChunkChars / docTextLength : 1;
	// When document has significant text, chunks should contain substantial fraction of source text
	if (docTextLength > 500 && coverageRatio < 0.6) {
		errors.push(
			`Significant source text loss detected: total chunk characters (${totalChunkChars}) is only ${(coverageRatio * 100).toFixed(1)}% of document characters (${docTextLength}).`
		);
	}

	return {
		valid: errors.length === 0,
		errors,
		metrics: {
			chunkCount: chunks.length,
			documentCharacters: docTextLength,
			totalChunkCharacters: totalChunkChars,
			coverageRatio: Math.round(coverageRatio * 100) / 100,
			maxChunkSize,
			minChunkSize: minChunkSize === Infinity ? 0 : minChunkSize
		}
	};
}
