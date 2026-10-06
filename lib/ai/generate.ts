import { randomUUID } from 'node:crypto';
import { responseText } from './responseText';

export interface GenerateOptions {
  instructions?: string;
  input: string;
  sessionId?: string;
  timeoutMs?: number;
  /** Retries after a busy or unavailable gateway (429/502/503/504). Defaults to 1. */
  maxRetries?: number;
  /** Page images for transcription (base64 without a data: prefix). */
  images?: Array<{ base64: string; mimeType: string }>;
}

/** DocSetu uses only gpt-6-luna, at high effort or above. */
export const AI_MODEL = 'gpt-6-luna';
const EFFORTS = ['high', 'xhigh'] as const;

export function aiEffort() {
  const effort = process.env.AI_EFFORT;
  return EFFORTS.includes(effort as (typeof EFFORTS)[number]) ? effort! : 'high';
}

export function aiConfigured() {
  return Boolean(process.env.AI_BASE_URL && process.env.AI_API_KEY);
}

const RETRYABLE = new Set([429, 502, 503, 504]);

/** Calls the OpenAI Responses-compatible OCI gateway; never expose its key to clients. */
export async function generateText(options: GenerateOptions) {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  if (!baseUrl || !apiKey) throw new Error('AI gateway is not configured (AI_BASE_URL, AI_API_KEY)');
  const content = [
    { type: 'input_text', text: options.input },
    ...(options.images || []).map(image => ({ type: 'input_image', image_url: `data:${image.mimeType};base64,${image.base64.replace(/^data:[^,]+,/, '')}` })),
  ];
  const body = JSON.stringify({
    model: AI_MODEL,
    ...(options.instructions ? { instructions: options.instructions } : {}),
    input: [{ role: 'user', content }],
    stream: false,
    store: false,
    reasoning: { effort: aiEffort() },
  });
  const retries = Math.max(0, options.maxRetries ?? 1);
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body,
      signal: AbortSignal.timeout(options.timeoutMs ?? 120000),
    });
    if (RETRYABLE.has(response.status) && attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
      continue;
    }
    if (!response.ok) throw new Error(`AI gateway generation failed (HTTP ${response.status})`);
    const data = await response.json();
    if (data.status && data.status !== 'completed') throw new Error(`AI gateway response ${data.status}`);
    const text = (responseText(data) || (typeof data.output_text === 'string' ? data.output_text : '')).trim();
    if (!text) throw new Error('AI gateway returned no answer');
    return { text, model: typeof data.model === 'string' ? data.model : AI_MODEL, sessionId: options.sessionId || randomUUID() };
  }
}

/** Parses a JSON object from model text, tolerating fences or a sentence around it. */
export function parseModelJson<T>(text: string): T {
  const unfenced = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  try {
    return JSON.parse(unfenced) as T;
  } catch {
    const start = unfenced.search(/[{[]/);
    const end = Math.max(unfenced.lastIndexOf('}'), unfenced.lastIndexOf(']'));
    if (start < 0 || end <= start) throw new Error('AI response did not contain JSON');
    return JSON.parse(unfenced.slice(start, end + 1)) as T;
  }
}

export async function generateJson<T>(options: GenerateOptions): Promise<T> {
  const result = await generateText({
    ...options,
    instructions: `${options.instructions || ''}\nReturn only valid JSON, without markdown fences or commentary.`,
  });
  return parseModelJson<T>(result.text);
}
