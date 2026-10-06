import { randomUUID } from 'node:crypto';
import { responseText } from './responseText';

export interface GenerateOptions {
  instructions?: string;
  input: string;
  sessionId?: string;
  timeoutMs?: number;
  /** Accepted for older callers; the gateway call is never retried. */
  maxRetries?: number;
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

/** Calls the OpenAI Responses-compatible OCI gateway; never expose its key to clients. */
export async function generateText(options: GenerateOptions) {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  if (!baseUrl || !apiKey) throw new Error('AI gateway is not configured (AI_BASE_URL, AI_API_KEY)');
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: AI_MODEL,
      ...(options.instructions ? { instructions: options.instructions } : {}),
      input: [{ role: 'user', content: [{ type: 'input_text', text: options.input }] }],
      stream: false,
      store: false,
      reasoning: { effort: aiEffort() },
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? 180000),
  });
  if (!response.ok) throw new Error(`AI gateway generation failed (HTTP ${response.status})`);
  const data = await response.json();
  if (data.status && data.status !== 'completed') throw new Error(`AI gateway response ${data.status}`);
  const text = (responseText(data) || (typeof data.output_text === 'string' ? data.output_text : '')).trim();
  if (!text) throw new Error('AI gateway returned no answer');
  return { text, model: typeof data.model === 'string' ? data.model : AI_MODEL, sessionId: options.sessionId || randomUUID() };
}

export async function generateJson<T>(options: GenerateOptions): Promise<T> {
  const result = await generateText({
    ...options,
    instructions: `${options.instructions || ''}\nReturn only valid JSON, without markdown fences or commentary.`,
  });
  const text = result.text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  return JSON.parse(text) as T;
}
