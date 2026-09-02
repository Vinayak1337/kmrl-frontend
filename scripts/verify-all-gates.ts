#!/usr/bin/env tsx
/**
 * Hard Gates Verification Script for DocSetu Backend Recovery Plan
 * Tests:
 * 1. Hard Gate 1: Ingest -> Extract -> Chunk -> Persist -> Reload -> Search
 * 2. Hard Gate 2: Grounded Chat -> Citations -> Deduplication
 * 3. Hard Gate 3: Feedback -> Re-chunk -> Safe Swap -> Intact Search
 * 4. Real Actions API: /api/actions
 * 5. Real Audit API: /api/audit
 * 6. Security Checks: Public search leak closed, IDOR blocked, Delete restricted
 */

import { signSession, AUTH_COOKIE } from '../lib/auth';

const API_URL = process.env.API_URL || 'http://localhost:3000';

const adminToken = signSession({
	sub: '507f1f77bcf86cd799439011',
	email: 'admin@docsetu.internal',
	name: 'Gate Runner Admin',
	role: 'ADMIN',
	grants: []
});

const managerHrToken = signSession({
	sub: '507f1f77bcf86cd799439022',
	email: 'hr@docsetu.internal',
	name: 'HR Manager',
	role: 'MANAGER',
	department: 'HR',
	grants: [{ dept: 'HR', type: 'POLICY', actions: ['read', 'ingest'] }]
});

const adminHeaders = {
	'Content-Type': 'application/json',
	Cookie: `${AUTH_COOKIE}=${adminToken}`
};

const hrHeaders = {
	'Content-Type': 'application/json',
	Cookie: `${AUTH_COOKIE}=${managerHrToken}`
};

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
	if (condition) {
		console.log(`✅ [PASS] ${testName}${detail ? ` (${detail})` : ''}`);
		passedCount++;
	} else {
		console.error(`❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
		failedCount++;
	}
}

async function main() {
	console.log('\n======================================================================');
	console.log('🚀 RUNNING DOCSETU HARD GATES VERIFICATION');
	console.log(`Target API: ${API_URL}`);
	console.log('======================================================================\n');

	// --- 0. SECURITY GATE CHECKS ---
	console.log('--- Phase 0: Security Fixes ---');

	// 0.1 Public search leak must be closed (unauthenticated search returns 401)
	try {
		const unauthSearch = await fetch(`${API_URL}/api/search/vector`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: 'test' })
		});
		assert(unauthSearch.status === 401, 'Public vector search leak closed', `status=${unauthSearch.status}`);
	} catch (e: any) {
		assert(false, 'Public vector search leak closed', e?.message);
	}

	// --- 1. HARD GATE 1: INGESTION, CHUNKING, PERSISTENCE & SEARCH ---
	console.log('\n--- Hard Gate 1: Ingestion, Chunking, Persistence & Search ---');

	const uniqueSecretToken = `SECRET_TRACK_REPAIR_${Date.now()}`;
	let createdDocId: string = '';

	try {
		const sampleContent = `
# Engineering Track Maintenance Specification FY26

SECTION 1: PURPOSE AND OBJECTIVES
1.1 This specification defines the standards for all permanent way track assets across Kochi Metro Rail Limited.
1.2 Maintenance procedures must comply with CMRS safety directives and RDSO standards.

SECTION 2: EXECUTIVE SANCTION LIMITS
2.1 All regular track maintenance up to Rs. 50,000 may be approved by the Section Engineer.
2.2 Special sanction rule: ${uniqueSecretToken}: all major emergency track repairs require sanction from the Managing Director within 24 hours.
2.3 Mandatory Action: Section Engineer must submit bi-weekly ultrasonography inspection reports by the 5th of every month to avoid safety penalties.

SECTION 3: ROLLING STOCK CLEARANCE
3.1 Maximum operating axle load is fixed at 16 tonnes.
3.2 Daily track geometry recording car runs must be scheduled between 01:00 AM and 04:00 AM.
		`.trim();

		const ingestRes = await fetch(`${API_URL}/api/documents/ingest`, {
			method: 'POST',
			headers: adminHeaders,
			body: JSON.stringify({
				title: 'Track Maintenance Specification FY26',
				department: 'ENGINEERING',
				documentType: 'MAINTENANCE',
				tags: ['Engineering', 'PermanentWay', 'Track', 'Safety'],
				documents: [
					{
						type: 'text',
						content: sampleContent,
						filename: 'track-maintenance-spec.txt'
					}
				]
			})
		});

		const ingestData = await ingestRes.json();
		assert(ingestRes.status === 201 && ingestData.success, 'Document Ingest Succeeded', `docId=${ingestData.documentId}`);
		createdDocId = ingestData.documentId;
		assert(Number(ingestData.nodeCount) >= 1, 'Chunking Generated Nodes', `nodeCount=${ingestData.nodeCount}`);

		// Verify reload single document
		const reloadRes = await fetch(`${API_URL}/api/documents/ingest?id=${createdDocId}`, {
			headers: adminHeaders
		});
		const reloadData = await reloadRes.json();
		assert(reloadRes.status === 200 && reloadData.id === createdDocId, 'Document Reloaded', `title=${reloadData.title}`);
		assert(Array.isArray(reloadData.nodes) && reloadData.nodes.length > 0, 'Document Nodes Attached on Reload', `count=${reloadData.nodes?.length}`);

		const firstNode = reloadData.nodes[0];
		assert(!!firstNode.uid && !!firstNode.nodeId, 'Chunk IDs properly structured', `uid=${firstNode.uid}`);
		assert(!!firstNode.pageRange && typeof firstNode.order === 'number', 'Chunk Page Provenance Intact', `pages=${firstNode.pageRange?.start}-${firstNode.pageRange?.end}`);

		// Search for the unique secret token phrase
		const searchRes = await fetch(`${API_URL}/api/search/vector`, {
			method: 'POST',
			headers: adminHeaders,
			body: JSON.stringify({
				query: uniqueSecretToken,
				searchNodes: true,
				limit: 5
			})
		});
		const searchData = await searchRes.json();
		const match = searchData.results?.find((r: any) => r.documentId === createdDocId);
		assert(searchRes.status === 200 && !!match, 'Search Found Unique Phrase In Chunk', `resultsFound=${searchData.resultsFound}`);
	} catch (e: any) {
		assert(false, 'Hard Gate 1 Ingest/Search Flow', e?.message);
	}

	// --- 1.1 SECURITY: IDOR & DELETE RESTRICTION ---
	console.log('\n--- Security: Access Control & IDOR Checks ---');
	try {
		// HR manager attempting to read Engineering document directly
		const idorRes = await fetch(`${API_URL}/api/documents/ingest?id=${createdDocId}`, {
			headers: hrHeaders
		});
		assert(idorRes.status === 403, 'IDOR Access Blocked for unauthorized department', `status=${idorRes.status}`);

		// Non-admin attempting to delete document
		const deleteForbiddenRes = await fetch(`${API_URL}/api/documents/${createdDocId}`, {
			method: 'DELETE',
			headers: hrHeaders
		});
		assert(deleteForbiddenRes.status === 403, 'Non-admin document deletion forbidden', `status=${deleteForbiddenRes.status}`);
	} catch (e: any) {
		assert(false, 'Security access control checks', e?.message);
	}

	// --- 2. HARD GATE 2: GROUNDED CHAT & CITATIONS ---
	console.log('\n--- Hard Gate 2: Grounded Chat & Citations ---');
	try {
		const chatRes = await fetch(`${API_URL}/api/chat`, {
			method: 'POST',
			headers: adminHeaders,
			body: JSON.stringify({
				docId: createdDocId,
				messages: [
					{
						role: 'user',
						content: 'What is the special sanction rule for major emergency track repairs?'
					}
				]
			})
		});
		const chatData = await chatRes.json();
		assert(chatRes.status === 200 && !!chatData.reply, 'Chat synthesis succeeded', `replyLength=${chatData.reply?.length}`);
		assert(Array.isArray(chatData.citations) && chatData.citations.length > 0, 'Chat citations generated', `citationsCount=${chatData.citations?.length}`);

		const firstCitation = chatData.citations?.[0];
		assert(firstCitation?.docId === createdDocId, 'Citation references correct document', `docId=${firstCitation?.docId}`);

		// Verify deduplication: call chat a second time with the same sessionId
		const sessionId = chatData.sessionId;
		const secondChatRes = await fetch(`${API_URL}/api/chat`, {
			method: 'POST',
			headers: adminHeaders,
			body: JSON.stringify({
				sessionId,
				docId: createdDocId,
				messages: [
					{ role: 'user', content: 'What is the special sanction rule for major emergency track repairs?' },
					{ role: 'assistant', content: chatData.reply },
					{ role: 'user', content: 'What is the maximum axle load?' }
				]
			})
		});
		const secondChatData = await secondChatRes.json();
		assert(secondChatRes.status === 200 && !!secondChatData.reply, 'Second chat turn succeeded');

		// Fetch history and verify message count is exactly 4 (user, assistant, user, assistant) without duplication
		const historyRes = await fetch(`${API_URL}/api/chat?sessionId=${sessionId}`, {
			headers: adminHeaders
		});
		const historyData = await historyRes.json();
		assert(historyData.messages?.length === 4, 'Chat conversation deduplicated correctly', `messageCount=${historyData.messages?.length}`);
	} catch (e: any) {
		assert(false, 'Hard Gate 2 Chat Flow', e?.message);
	}

	// --- 3. HARD GATE 3: FEEDBACK, RE-CHUNKING & SAFE SWAP ---
	console.log('\n--- Hard Gate 3: Feedback, Re-Chunking & Safe Swap ---');
	try {
		const feedbackRes = await fetch(`${API_URL}/api/documents/${createdDocId}/feedback`, {
			method: 'POST',
			headers: adminHeaders,
			body: JSON.stringify({
				type: 'clarification',
				message: 'Re-analyze and update track specification parameters.',
				reprocess: true
			})
		});
		const feedbackData = await feedbackRes.json();
		assert(feedbackRes.status === 200 && feedbackData.ok, 'Feedback Reprocessing Succeeded', `reprocessed=${feedbackData.reprocessed}`);

		// Verify document still reloads cleanly and nodes have searchableText & keywords intact
		const postFeedbackDocRes = await fetch(`${API_URL}/api/documents/ingest?id=${createdDocId}`, {
			headers: adminHeaders
		});
		const postFeedbackDoc = await postFeedbackDocRes.json();
		assert(postFeedbackDoc.nodes?.length > 0, 'Nodes intact after reprocessing', `nodeCount=${postFeedbackDoc.nodes?.length}`);

		const reprocessedNode = postFeedbackDoc.nodes[0];
		assert(!!reprocessedNode.titleNormalized, 'Normalized title preserved after reprocess', `titleNorm=${reprocessedNode.titleNormalized}`);
		assert(Array.isArray(reprocessedNode.keywords) && reprocessedNode.keywords.length > 0, 'Keywords preserved after reprocess', `keywordsCount=${reprocessedNode.keywords?.length}`);

		// Verify search still finds document after reprocess
		const postSearchRes = await fetch(`${API_URL}/api/search/vector`, {
			method: 'POST',
			headers: adminHeaders,
			body: JSON.stringify({
				query: uniqueSecretToken,
				searchNodes: true
			})
		});
		const postSearchData = await postSearchRes.json();
		assert(postSearchData.results?.some((r: any) => r.documentId === createdDocId), 'Search still finds document after safe swap');
	} catch (e: any) {
		assert(false, 'Hard Gate 3 Feedback Flow', e?.message);
	}

	// --- 4. REAL ACTIONS API GATE ---
	console.log('\n--- Real Actions API Gate ---');
	try {
		const actionsRes = await fetch(`${API_URL}/api/actions`, {
			headers: adminHeaders
		});
		const actionsData = await actionsRes.json();
		assert(actionsRes.status === 200 && Array.isArray(actionsData.actions), 'Actions API returned array', `total=${actionsData.total}`);

		const createdDocAction = actionsData.actions?.find((a: any) => a.documentId === createdDocId);
		assert(!!createdDocAction, 'Actions API contains action from newly ingested document', `action="${createdDocAction?.action?.slice(0, 50)}..."`);
		if (createdDocAction) {
			assert(!!createdDocAction.documentTitle, 'Action has document title', `title=${createdDocAction.documentTitle}`);
			assert(!!createdDocAction.team, 'Action has team attribution', `team=${createdDocAction.team}`);
		}
	} catch (e: any) {
		assert(false, 'Real Actions API Gate', e?.message);
	}

	// --- 5. REAL AUDIT API GATE ---
	console.log('\n--- Real Audit API Gate ---');
	try {
		const auditRes = await fetch(`${API_URL}/api/audit`, {
			headers: adminHeaders
		});
		const auditData = await auditRes.json();
		assert(auditRes.status === 200 && Array.isArray(auditData.logs), 'Audit API returned logs array', `total=${auditData.total}`);

		const ingestAudit = auditData.logs?.find((l: any) => l.action === 'INGEST_DOCUMENT' && l.details?.documentId === createdDocId);
		assert(!!ingestAudit, 'Audit log recorded INGEST_DOCUMENT for created document', `action=${ingestAudit?.action}`);
	} catch (e: any) {
		assert(false, 'Real Audit API Gate', e?.message);
	}

	// --- CLEANUP ---
	console.log('\n--- Cleanup ---');
	try {
		const deleteRes = await fetch(`${API_URL}/api/documents/${createdDocId}`, {
			method: 'DELETE',
			headers: adminHeaders
		});
		assert(deleteRes.status === 200, 'Admin successfully cleaned up test document');
	} catch (e: any) {
		console.warn('Cleanup failed:', e);
	}

	console.log('\n======================================================================');
	console.log(`TOTAL RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
	console.log('======================================================================\n');

	if (failedCount > 0) {
		process.exit(1);
	}
}

main().catch(err => {
	console.error('Fatal gate verification error:', err);
	process.exit(1);
});
