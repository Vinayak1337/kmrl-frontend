import assert from "node:assert/strict";
import { test } from "node:test";
import {
  citationUid,
  normalizeApiUrl,
  validateIngest,
  type Ingest,
} from "../src/domain";
import { demoDocs, demoAnswer } from "../src/demo";

test("citations preserve exact node identity including punctuation", () => {
  assert.equal(
    citationUid({ index: 1, docId: "doc-42", nodeId: "node-12a" }),
    "doc-42#node-12a",
  );
  assert.equal(
    citationUid({ index: 1, docId: "doc", uid: "doc#original-section-7" }),
    "doc#original-section-7",
  );
  assert.equal(citationUid({ index: 1, docId: "doc" }), null);
});
test("workspace URLs cannot leak sessions through insecure production URLs or embedded credentials", () => {
  assert.equal(
    normalizeApiUrl("https://workspace.example/", false),
    "https://workspace.example",
  );
  assert.equal(
    normalizeApiUrl("http://192.168.1.10:3000", true),
    "http://192.168.1.10:3000",
  );
  for (const url of [
    "http://workspace.example",
    "javascript:alert(1)",
    "https://name:secret@example.com",
    "https://example.com/path",
    "https://example.com?token=x",
  ])
    assert.throws(() => normalizeApiUrl(url, false));
});
test("ingestion requires actual source and rejects oversized base64 before upload", () => {
  const input: Ingest = {
    title: "Policy",
    department: "HR",
    documentType: "policy",
    language: "English",
    documents: [
      { type: "text", content: "A source document.", filename: "policy.txt" },
    ],
  };
  assert.equal(validateIngest(input), null);
  assert.match(validateIngest({ ...input, title: "  " })!, /title/);
  assert.match(validateIngest({ ...input, documents: [] })!, /Choose/);
  assert.match(
    validateIngest({
      ...input,
      documents: [{ ...input.documents[0], content: "x".repeat(3_500_001) }],
    })!,
    /smaller/,
  );
});
test("demo answers are explicitly samples and citations resolve to real sample sections", () => {
  for (const doc of demoDocs) {
    const answer = demoAnswer(doc.id);
    assert.match(answer.reply, /^Sample answer:/);
    for (const cite of answer.citations || [])
      assert.ok(doc.nodes?.some((n) => n.uid === citationUid(cite)));
  }
});
