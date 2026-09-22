import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateText, generateJson } from '../lib/ai/generate';
import { sourceExtract } from '../lib/chat/extract';

test('configured Gemini preserves instructions, ignores thought parts and parses JSON', async () => {
  const fetch = globalThis.fetch;
  const key = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-private-key';
  globalThis.fetch = async (input, init) => {
    assert.ok(String(input).startsWith('https://generativelanguage.googleapis.com/v1beta/models/'));
    assert.ok(!String(input).includes('test-private-key'));
    assert.equal(new Headers(init?.headers).get('x-goog-api-key'), 'test-private-key');
    const body = JSON.parse(String(init?.body));
    assert.match(body.systemInstruction.parts[0].text, /Only use evidence/);
    assert.equal(body.contents[0].parts[0].text, 'source');
    return Response.json({ candidates: [{ content: { parts: [
      { thought: true, text: 'private reasoning' }, { text: '{"answer":42}' },
    ] } }] });
  };
  try {
    assert.deepEqual(await generateJson({ input: 'source', instructions: 'Only use evidence' }), { answer: 42 });
    globalThis.fetch = async () => new Response('provider failure', { status: 403 });
    await assert.rejects(generateText({ input: 'source' }), /HTTP 403/);
    globalThis.fetch = async () => Response.json({ candidates: [] });
    await assert.rejects(generateText({ input: 'source' }), /no answer/);
  } finally {
    globalThis.fetch = fetch;
    if (key === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = key;
  }
});

test('outage extract includes requested date and budget rather than introductory summary', () => {
  const text = 'TEST FIXTURE\nThis is a temporary verification document.\nThe fictional inspection is scheduled for 15 December 2031 at 10:30.\nThe fictional budget is INR 12,500.';
  const result = sourceExtract(text, 'When is the fictional inspection and what is the budget?');
  assert.match(result, /15 December 2031 at 10:30/);
  assert.match(result, /INR 12,500/);
  assert.ok(!result.includes('temporary verification'));
});
