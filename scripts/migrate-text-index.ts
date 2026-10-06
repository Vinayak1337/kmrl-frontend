/** Rebuilds the documents text index so the display `language` field is not read as a stemming language. */
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function run() {
  const { getCollection, ensureDocumentIndexes } = await import('../lib/mongo');
  const docs = await getCollection();
  const before = (await docs.indexes()).find(i => i.name === 'text_main');
  console.log('before:', before?.language_override ?? 'language (default)');
  if (before && before.language_override !== 'textLanguage') await docs.dropIndex('text_main');
  await ensureDocumentIndexes();
  const after = (await docs.indexes()).find(i => i.name === 'text_main');
  console.log('after:', after?.language_override);
  process.exit(0);
}
run().catch(error => { console.error(error); process.exit(1); });
