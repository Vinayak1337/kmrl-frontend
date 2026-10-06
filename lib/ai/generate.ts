import { randomUUID } from 'node:crypto';
import { generateWithMuseSpark, type MuseSparkOptions } from './opencodeZen';
import { responseText } from './responseText';

/** Server-only OpenAI Responses gateway (for example the Mealwise OCI proxy), configured with AI_BASE_URL. */
async function generateWithGateway(options: MuseSparkOptions, baseUrl: string) {
  const model = process.env.AI_MODEL;
  if (!model) throw new Error('AI_MODEL is required when AI_BASE_URL is set');
  const apiKey = process.env.AI_API_KEY;
  const effort = process.env.AI_EFFORT;
  const timeoutSeconds = Number(process.env.AI_TIMEOUT_SECONDS);
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      input: options.input,
      ...(options.instructions ? { instructions: options.instructions } : {}),
      ...(effort ? { reasoning: { effort } } : {}),
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? (timeoutSeconds > 0 ? timeoutSeconds * 1000 : 45000)),
  });
  if (!response.ok) throw new Error(`AI gateway generation failed (HTTP ${response.status})`);
  const data = await response.json();
  const text = (typeof data.output_text === 'string' && data.output_text.trim()) || responseText(data);
  if (!text) throw new Error('AI gateway returned no answer');
  return { text, model: data.model || model, sessionId: options.sessionId || randomUUID() };
}

/** Use the configured server credential; never expose provider keys to clients. */
export async function generateText(options: MuseSparkOptions) {
  const baseUrl = process.env.AI_BASE_URL;
  if (baseUrl) return generateWithGateway(options, baseUrl);
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
