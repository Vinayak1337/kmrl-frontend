import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import { generateText } from '../lib/ai/generate';

nextEnv.loadEnvConfig(process.cwd());
async function run() {
  const result = await generateText({
    instructions: 'Use only the supplied facts. Cite [#1].',
    input: '[#1] The fictional inspection is on 15 December 2031 at 10:30. The budget is INR 12,500. When is the inspection and what is its budget?',
  });
  assert.match(result.text, /15 December 2031/);
  assert.match(result.text, /12,500/);
  assert.match(result.text, /\[#1\]/);
  console.log(`PASS live ${result.model}: date, budget and exact citation.`);
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
