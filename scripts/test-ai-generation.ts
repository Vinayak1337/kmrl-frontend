import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateText, generateJson } from '../lib/ai/generate';
import { sourceExtract } from '../lib/chat/extract';

async function withGateway(effort: string | undefined, run: () => Promise<void>) {
  const fetch = globalThis.fetch;
  const saved = { url: process.env.AI_BASE_URL, key: process.env.AI_API_KEY, effort: process.env.AI_EFFORT };
  process.env.AI_BASE_URL = 'https://gateway.test/v1/';
  process.env.AI_API_KEY = 'test-gateway-key';
  if (effort === undefined) delete process.env.AI_EFFORT;
  else process.env.AI_EFFORT = effort;
  try { await run(); } finally {
    globalThis.fetch = fetch;
    for (const [name, value] of [['AI_BASE_URL', saved.url], ['AI_API_KEY', saved.key], ['AI_EFFORT', saved.effort]] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

const completed = (text: string) => Response.json({ status: 'completed', model: 'gpt-6-luna', output: [{ type: 'message', content: [{ type: 'output_text', text }] }] });

test('gateway call pins gpt-6-luna, sends only accepted fields and parses JSON', () => withGateway('xhigh', async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'https://gateway.test/v1/responses');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer test-gateway-key');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, 'gpt-6-luna');
    assert.equal(body.reasoning.effort, 'xhigh');
    assert.match(body.instructions, /Only use evidence/);
    assert.equal(body.store, false);
    assert.ok(!('temperature' in body) && !('max_output_tokens' in body));
    return completed('```json\n{"answer":42}\n```');
  };
  assert.deepEqual(await generateJson({ input: 'source', instructions: 'Only use evidence' }), { answer: 42 });
  globalThis.fetch = async () => new Response('provider failure', { status: 403 });
  await assert.rejects(generateText({ input: 'source' }), /HTTP 403/);
  globalThis.fetch = async () => Response.json({ status: 'incomplete', output: [] });
  await assert.rejects(generateText({ input: 'source' }), /incomplete/);
}));

test('effort below high is raised to high', () => withGateway('low', async () => {
  globalThis.fetch = async (_input, init) => {
    assert.equal(JSON.parse(String(init?.body)).reasoning.effort, 'high');
    return completed('ok');
  };
  assert.equal((await generateText({ input: 'source' })).text, 'ok');
}));

test('no other provider is used when the gateway is not configured', async () => {
  const saved = process.env.AI_BASE_URL;
  delete process.env.AI_BASE_URL;
  const fetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('must not call any provider'); };
  try {
    await assert.rejects(generateText({ input: 'source' }), /not configured/);
  } finally {
    globalThis.fetch = fetch;
    if (saved !== undefined) process.env.AI_BASE_URL = saved;
  }
});

test('outage extract includes requested date and budget rather than introductory summary', () => {
  const text = 'TEST FIXTURE\nThis is a temporary verification document.\nThe fictional inspection is scheduled for 15 December 2031 at 10:30.\nThe fictional budget is INR 12,500.';
  const result = sourceExtract(text, 'When is the fictional inspection and what is the budget?');
  assert.match(result, /15 December 2031 at 10:30/);
  assert.match(result, /INR 12,500/);
  assert.ok(!result.includes('temporary verification'));
});
