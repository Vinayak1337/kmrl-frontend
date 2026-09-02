/**
 * Robust Gemini API execution with exponential backoff and jitter for handling
 * transient 503 Service Unavailable and 429 Rate Limit responses.
 */

export interface RetryOptions {
	maxRetries?: number;
	initialDelayMs?: number;
	maxDelayMs?: number;
	operationName?: string;
}

function isRetryableError(error: unknown): boolean {
	if (!error || typeof error !== 'object') return false;
	const errObj = error as Record<string, unknown>;
	const msg = String(errObj.message || '').toLowerCase();
	const status =
		typeof errObj.status === 'number'
			? errObj.status
			: typeof errObj.statusCode === 'number'
			? errObj.statusCode
			: undefined;

	// HTTP status codes
	if (status === 429 || status === 503 || status === 500 || status === 502 || status === 504) {
		return true;
	}

	// Message string patterns
	return (
		msg.includes('503') ||
		msg.includes('service unavailable') ||
		msg.includes('429') ||
		msg.includes('too many requests') ||
		msg.includes('resource_exhausted') ||
		msg.includes('overloaded') ||
		msg.includes('rate limit') ||
		msg.includes('econnreset') ||
		msg.includes('etimedout') ||
		msg.includes('fetch failed')
	);
}

export async function callGeminiWithRetry<T>(
	fn: () => Promise<T>,
	options: RetryOptions = {}
): Promise<T> {
	const {
		maxRetries = 3,
		initialDelayMs = 800,
		maxDelayMs = 5000,
		operationName = 'Gemini API call'
	} = options;

	let attempt = 0;
	let delay = initialDelayMs;

	while (attempt < maxRetries) {
		try {
			return await fn();
		} catch (err) {
			attempt++;
			if (attempt >= maxRetries || !isRetryableError(err)) {
				throw err;
			}

			// Exponential backoff with 20% random jitter
			const jitter = delay * 0.2 * (Math.random() * 2 - 1);
			const sleepTime = Math.min(maxDelayMs, Math.max(100, Math.floor(delay + jitter)));

			console.warn(
				`[Gemini Retry] ${operationName} failed on attempt ${attempt}/${maxRetries} (transient error). Retrying in ${sleepTime}ms...`
			);

			await new Promise(resolve => setTimeout(resolve, sleepTime));
			delay *= 2;
		}
	}

	throw new Error(`[Gemini Retry] ${operationName} exceeded ${maxRetries} retries.`);
}
