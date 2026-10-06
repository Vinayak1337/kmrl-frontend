import { randomUUID } from 'node:crypto';
import { generateWithMuseSpark, type MuseSparkOptions } from './opencodeZen';
import { responseText } from './responseText';

/** OpenAI Responses-compatible gateway (the OCI provider), configured by AI_BASE_URL and AI_API_KEY. */
async function generateWithResponses(options: MuseSparkOptions, baseUrl: string, apiKey: string) {
  const model = process.env.AI_MODEL || 'gpt-6-luna';
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      ...(options.instructions ? { instructions: options.instructions } : {}),
      input: [{ role: 'user', content: [{ type: 'input_text', text: options.input }] }],
      stream: false,
      store: false,
      reasoning: { effort: process.env.AI_EFFORT || 'low' },
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? 90000),
  });
  if (!response.ok) throw new Error(`AI gateway generation failed (HTTP ${response.status})`);
  const data = await response.json();
  if (data.status && data.status !== 'completed') throw new Error(`AI gateway response ${data.status}`);
  const text = (responseText(data) || (typeof data.output_text === 'string' ? data.output_text : '')).trim();
  if (!text) throw new Error('AI gateway returned no answer');
  return { text, model: typeof data.model === 'string' ? data.model : model, sessionId: options.sessionId || randomUUID() };
}

/** Use the configured server credential; never expose provider keys to clients. */
export async function generateText(options: MuseSparkOptions) {
  const baseUrl = process.env.AI_BASE_URL;
  const gatewayKey = process.env.AI_API_KEY;
  if (baseUrl && gatewayKey) return generateWithResponses(options, baseUrl, gatewayKey);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return generateWithMuseSpark({ ...options, maxRetries: 0 });
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        ...(options.instructions ? { systemInstruction: { parts: [{ text: options.instructions }] } } : {}),
        contents: [{ role: 'user', parts: [{ text: options.input }] }],
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 45000),
    },
  );
  if (!response.ok) throw new Error(`Gemini generation failed (HTTP ${response.status})`);
  const data = await response.json();
  const text = (data.candidates?.[0]?.content?.parts || [])
    .filter((part: { thought?: boolean }) => !part.thought)
    .map((part: { text?: string }) => part.text || '').join('').trim();
  if (!text) throw new Error('Gemini returned no answer');
  return { text, model, sessionId: options.sessionId || randomUUID() };
}

export async function generateJson<T>(options: MuseSparkOptions): Promise<T> {
  const result = await generateText({
    ...options,
    instructions: `${options.instructions || ''}\nReturn only valid JSON, without markdown fences or commentary.`,
  });
  const text = result.text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  return JSON.parse(text) as T;
}
