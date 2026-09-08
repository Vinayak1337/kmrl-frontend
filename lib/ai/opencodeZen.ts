import { randomUUID } from 'crypto';

export interface MuseSparkOptions {
	instructions?: string;
	input: string;
	sessionId?: string;
	timeoutMs?: number;
	maxRetries?: number;
}

export interface MuseSparkResponse {
	text: string;
	sessionId: string;
	model: string;
	cost: string;
}

const OPENCODE_RESPONSES_URL = 'https://opencode.ai/zen/v1/responses';
const DEFAULT_MODEL = 'muse-spark-1.3-contributor-free';

/**
 * Robust caller for OpenCode Zen - Muse Spark 1.3 free tier
 * Does not require an API key, utilizes x-opencode-session UUID header.
 */
export async function generateWithMuseSpark(
	options: MuseSparkOptions
): Promise<MuseSparkResponse> {
	const {
		instructions,
		input,
		sessionId = randomUUID(),
		timeoutMs = 45000,
		maxRetries = 2
	} = options;

	let attempt = 0;
	let lastError: Error | null = null;

	while (attempt <= maxRetries) {
		attempt++;
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

		try {
			const bodyPayload: Record<string, unknown> = {
				model: DEFAULT_MODEL,
				input
			};

			if (instructions && instructions.trim()) {
				bodyPayload.instructions = instructions.trim();
			}

			const res = await fetch(OPENCODE_RESPONSES_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-opencode-session': sessionId,
					'User-Agent': 'OpenCode/1.0.0'
				},
				body: JSON.stringify(bodyPayload),
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (!res.ok) {
				const errText = await res.text().catch(() => '');
				let parsedErr = '';
				try {
					const jsonErr = JSON.parse(errText);
					parsedErr = jsonErr.error?.message || jsonErr.message || errText;
				} catch {
					parsedErr = errText;
				}
				throw new Error(`OpenCode Zen error (HTTP ${res.status}): ${parsedErr}`);
			}

			const data = await res.json();
			const outputItems = Array.isArray(data?.output) ? data.output : [];
			const messageObj = outputItems.find((item: any) => item.type === 'message' || item.role === 'assistant');
			const contentItems = Array.isArray(messageObj?.content) ? messageObj.content : [];
			const textItem = contentItems.find((c: any) => typeof c?.text === 'string');

			const replyText = textItem?.text || (typeof messageObj?.content === 'string' ? messageObj.content : '');

			return {
				text: replyText.trim(),
				sessionId,
				model: data.model || DEFAULT_MODEL,
				cost: String(data.cost ?? '0')
			};
		} catch (err: any) {
			clearTimeout(timeoutId);
			lastError = err instanceof Error ? err : new Error(String(err));
			console.warn(`[OpenCode Zen] Attempt ${attempt} failed:`, lastError.message);

			if (attempt <= maxRetries) {
				const backoff = 1000 * Math.pow(2, attempt - 1);
				await new Promise(r => setTimeout(r, backoff));
			}
		}
	}

	throw lastError || new Error('Failed to generate response with OpenCode Zen');
}

/**
 * Generate and parse structured JSON using Muse Spark 1.3
 */
export async function generateJsonWithMuseSpark<T>(options: {
	instructions?: string;
	input: string;
	sessionId?: string;
	fallback?: T;
}): Promise<T> {
	const systemInstructions = [
		options.instructions || '',
		'You must return ONLY valid, parseable JSON. Do not include markdown code fences (```json or ```), explanations, or any commentary outside the JSON.'
	]
		.filter(Boolean)
		.join('\n\n');

	try {
		const res = await generateWithMuseSpark({
			instructions: systemInstructions,
			input: options.input,
			sessionId: options.sessionId
		});

		const raw = res.text.trim();
		// Try direct parse
		try {
			return JSON.parse(raw) as T;
		} catch {
			// Try extracting from code fences or brackets
			const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
			if (jsonMatch && jsonMatch[1]) {
				return JSON.parse(jsonMatch[1]) as T;
			}
			throw new Error(`Unable to extract JSON from response: ${raw.slice(0, 150)}...`);
		}
	} catch (err) {
		console.error('[OpenCode Zen] JSON generation failed:', err);
		if (options.fallback !== undefined) {
			return options.fallback;
		}
		throw err;
	}
}
