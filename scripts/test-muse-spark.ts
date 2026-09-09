import assert from 'node:assert/strict';
import { generateWithMuseSpark } from '../lib/ai/opencodeZen';

async function run() {
  const originalFetch = globalThis.fetch;
  const expectedModel = 'muse-spark-1.2-contributor-free';
  let observed = false;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'https://opencode.ai/zen/v1/responses');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, expectedModel);
    const headers = new Headers(init?.headers);
    assert.equal(headers.has('authorization'), false);
    assert.equal(headers.has('x-api-key'), false);
    assert.ok(headers.get('x-opencode-session'));
    observed = true;
    return originalFetch(input, init);
  };
  try {
    const result = await generateWithMuseSpark({
      instructions: 'Follow the requested output format exactly.',
      input: 'Calculate 19 + 23. Reply with only the number.',
    });
    assert.ok(observed);
    assert.equal(result.text.trim(), '42');
    assert.equal(result.model, expectedModel);
    console.log(`PASS: live ${result.model}; correct answer; session header present; no API-key or Authorization header.`);
  } finally {
    globalThis.fetch = originalFetch;
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
