import { randomUUID } from 'node:crypto';
import { generateWithMuseSpark, type MuseSparkOptions } from './opencodeZen';

/** Use the configured server credential; never expose provider keys to clients. */
export async function generateText(options: MuseSparkOptions) {
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
