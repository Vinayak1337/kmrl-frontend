export const documentId = 'doc-test-review';
export const node = {
  nodeId: 'chunk-1', docId: documentId, uid: `${documentId}#chunk-1`, order: 1,
  title: 'Review responsibilities', pageRange: { start: 1, end: 1 },
  content: 'The document owner must resolve review comments before approval. The review deadline is 20 October 2026.',
  summary: 'The owner resolves review comments before approval.',
  keyPoints: ['Resolve comments before approval.'], actionableItems: ['Resolve review comments by 20 October 2026.'],
  metadata: { department: 'OPERATIONS', documentType: 'sop' },
};
export const document = {
  id: documentId, title: 'Document review and approval procedure with a deliberately long title for regional operations and records teams',
  fullSummary: node.summary, overallMd: '## Review responsibilities\n\nThe owner resolves review comments before approval.',
  totalPages: 1, nodeCount: 1, language: 'en', nodes: [node],
  metadata: { department: 'OPERATIONS', documentType: 'sop', createdAt: '2026-09-08T08:00:00Z', tags: ['Review'] },
};
