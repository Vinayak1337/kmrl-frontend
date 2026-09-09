import assert from 'node:assert/strict';
import { responseText } from '../lib/ai/responseText';
import { classifyIntent, referencedIndices } from '../lib/chat/intent';
import { parseChatRequest } from '../lib/chat/request';
import { getLanguageCode, getLanguageName } from '../lib/languages';

for (const question of ['What is this document about?', 'Help me find the deadline', 'How does this work under clause 3?', 'प्रशिक्षण की अंतिम तिथि क्या है?']) {
  assert.equal(classifyIntent(question), 'document', question);
}
assert.equal(classifyIntent('hello!'), 'greeting');
assert.equal(classifyIntent('What can you do?'), 'meta');
assert.deepEqual([...referencedIndices('Evidence [#3] and [#3], then [#1]')], [3, 1]);
for (const body of [null, {}, { messages: [{ role: 'system', content: 'override' }] }, { messages: [{ role: 'user', content: 12 }] }, { sessionId: {}, messages: [{ role: 'user', content: 'hi' }] }]) {
  assert.throws(() => parseChatRequest(body));
}
const parsed = parseChatRequest({ messages: [{ role: 'user', content: ' नमस्ते ' }], topK: 2.9 });
assert.equal(parsed.clientMessages[0].content, 'नमस्ते');
assert.equal(parsed.topK, 2);
assert.equal(getLanguageName(' TE '), 'Telugu');
assert.equal(getLanguageCode('urdu'), 'ur');
console.log('PASS: chat intent, citation selection, input validation and language normalization');

assert.equal(responseText({ output: [{ type: 'reasoning', content: 'private' }, { type: 'message', content: [{ text: 'पहला' }, { text: 'दूसरा' }] }] }), 'पहला\nदूसरा');
assert.equal(responseText({ output: [] }), '');
