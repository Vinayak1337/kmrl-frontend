#!/usr/bin/env tsx
/**
 * Full Verification Matrix for DocSetu Backend Recovery Plan
 * Phases 4.5 through 13
 */

import { signSession, AUTH_COOKIE } from '../lib/auth';
import { validateChunkCoverage } from '../lib/ingest/validation';
import { NormalizedDocument } from '../lib/ingest/normalization';
import { DocumentChunk } from '../lib/ingest/chunker';

const API_URL = process.env.API_URL || 'http://localhost:3005';

const adminToken = signSession({
	sub: '507f1f77bcf86cd799439011',
	email: 'admin@docsetu.internal',
	name: 'Matrix Admin',
	role: 'ADMIN',
	grants: []
});

const managerToken = signSession({
	sub: '507f1f77bcf86cd799439022',
	email: 'manager@docsetu.internal',
	name: 'Matrix Manager',
	role: 'MANAGER',
	department: 'OPERATIONS',
	grants: [{ dept: 'OPERATIONS', type: 'SOP', actions: ['read'] }]
});

const adminHeaders = {
	'Content-Type': 'application/json',
	Cookie: `${AUTH_COOKIE}=${adminToken}`
};

const managerHeaders = {
	'Content-Type': 'application/json',
	Cookie: `${AUTH_COOKIE}=${managerToken}`
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, title: string, detail?: string) {
	if (condition) {
		console.log(`✅ [PASS] ${title}${detail ? ` (${detail})` : ''}`);
		passed++;
	} else {
		console.error(`❌ [FAIL] ${title}${detail ? ` - ${detail}` : ''}`);
		failed++;
	}
}

async function run() {
	console.log('\n======================================================================');
	console.log('🚀 RUNNING DOCSETU FULL VERIFICATION MATRIX (Phases 4.5–13)');
	console.log(`Target: ${API_URL}`);
	console.log('======================================================================\n');

	// ==================================================================
	// 1. PHASE 4.5: CHUNK VALIDATION UNIT & GATING TESTS
	// ==================================================================
	console.log('--- 1. Phase 4.5: Chunk Validation Layer ---');

	const dummyDoc: NormalizedDocument = {
		title: 'Sample Specification',
		filename: 'sample.txt',
		mimeType: 'text/plain',
		format: 'text',
		pageCount: 3,
		pages: [
			{ pageNumber: 1, text: 'Page 1 content here with details.' },
			{ pageNumber: 2, text: 'Page 2 content here with details.' },
			{ pageNumber: 3, text: 'Page 3 content here with details.' }
		],
		fullText: 'Page 1 content here with details.\nPage 2 content here with details.\nPage 3 content here with details.',
		rawContent: 'Sample content'
	};

	// 1.1 Valid chunks pass
	const validChunks: DocumentChunk[] = [
		{
			chunkId: 'chunk-1',
			order: 1,
			pageStart: 1,
			pageEnd: 1,
			sourcePages: [1],
			text: 'Page 1 content here with details.',
			characterCount: 'Page 1 content here with details.'.length,
			images: []
		},
		{
			chunkId: 'chunk-2',
			order: 2,
			pageStart: 2,
			pageEnd: 3,
			sourcePages: [2, 3],
			text: 'Page 2 content here with details.\nPage 3 content here with details.',
			characterCount: 'Page 2 content here with details.\nPage 3 content here with details.'.length,
			images: []
		}
	];
	const v1 = validateChunkCoverage(dummyDoc, validChunks);
	assert(v1.valid && v1.errors.length === 0, 'Valid chunks pass validation');

	// 1.2 Broken order fails
	const brokenOrderChunks: DocumentChunk[] = [
		{ ...validChunks[0], order: 1 },
		{ ...validChunks[1], order: 3 }
	];
	const v2 = validateChunkCoverage(dummyDoc, brokenOrderChunks);
	assert(!v2.valid && v2.errors.some(e => e.includes('order broken')), 'Broken order rejected');

	// 1.3 Duplicate IDs fail
	const dupIdChunks: DocumentChunk[] = [
		{ ...validChunks[0], chunkId: 'chunk-1', order: 1 },
		{ ...validChunks[1], chunkId: 'chunk-1', order: 2 }
	];
	const v3 = validateChunkCoverage(dummyDoc, dupIdChunks);
	assert(!v3.valid && v3.errors.some(e => e.includes('Duplicate chunkId')), 'Duplicate chunk IDs rejected');

	// 1.4 Out of bounds page fails
	const outOfBoundsChunks: DocumentChunk[] = [
		{ ...validChunks[0], pageEnd: 10, sourcePages: [1, 10] }
	];
	const v4 = validateChunkCoverage(dummyDoc, outOfBoundsChunks);
	assert(!v4.valid && v4.errors.some(e => e.includes('outside bounds')), 'Out-of-bounds page range rejected');

	// 1.5 Empty chunk text fails
	const emptyTextChunks: DocumentChunk[] = [
		{ ...validChunks[0], text: '', characterCount: 0 }
	];
	const v5 = validateChunkCoverage(dummyDoc, emptyTextChunks);
	assert(!v5.valid && v5.errors.some(e => e.includes('empty text')), 'Empty chunk text rejected');

	// 1.6 Oversized chunk (>8000 chars) fails
	const oversizedChunks: DocumentChunk[] = [
		{ ...validChunks[0], text: 'A'.repeat(8500), characterCount: 8500 }
	];
	const v6 = validateChunkCoverage(dummyDoc, oversizedChunks);
	assert(!v6.valid && v6.errors.some(e => e.includes('exceeds hard max')), 'Oversized chunk (>8000) rejected');

	// ==================================================================
	// 2. PHASE 7.5: TRANSLATION API (HINDI & MALAYALAM, STRUCTURE PRESERVATION)
	// ==================================================================
	console.log('\n--- 2. Phase 7.5: Translation API ---');

	// Ingest a document with concrete dates, units, and numbers to test translation
	let transDocId = '';
	try {
		const docContent = `
PROCUREMENT CIRCULAR: HIGH SPEED RAIL TENDER FY26
1. The deadline for submitting bids is 15 January 2026 at 05:00 PM.
2. Estimated contract valuation is Rs. 45,00,000 (INR 45 Lakhs).
3. The maximum speed capacity required is 120 km/h with 16 tonnes axle load.
4. Mandatory Action: Managing Director must approve all deviations exceeding 10% within 48 hours.
		`.trim();

		const ingestRes = await fetch(`${API_URL}/api/documents/ingest`, {
			method: 'POST',
			headers: adminHeaders,
			body: JSON.stringify({
				title: 'High Speed Rail Tender FY26',
				department: 'OPERATIONS',
				documentType: 'SOP',
				documents: [{ type: 'text', content: docContent, filename: 'tender-spec.txt' }]
			})
		});
		const ingestData = await ingestRes.json();
		transDocId = ingestData.documentId;
		assert(ingestRes.status === 201 && !!transDocId, 'Tender document ingested for translation', `docId=${transDocId}`);

		// 2.1 Translate to Hindi
		const hindiRes = await fetch(`${API_URL}/api/translate`, {
			method: 'POST',
			headers: adminHeaders,
			body: JSON.stringify({
				docId: transDocId,
				language: 'Hindi'
			})
		});
		const hindiData = await hindiRes.json();
		assert(hindiRes.status === 200 && !!hindiData.summary, 'English to Hindi translation succeeded');
		assert(Array.isArray(hindiData.keyPoints) && Array.isArray(hindiData.actionableItems), 'Hindi preserved array structures');

		// 2.2 Translate to Malayalam
		const malRes = await fetch(`${API_URL}/api/translate`, {
			method: 'POST',
			headers: adminHeaders,
			body: JSON.stringify({
				docId: transDocId,
				language: 'Malayalam'
			})
		});
		const malData = await malRes.json();
		assert(malRes.status === 200 && !!malData.summary, 'English to Malayalam translation succeeded');

		// 2.3 Verify failure handling (missing language)
		const badTransRes = await fetch(`${API_URL}/api/translate`, {
			method: 'POST',
			headers: adminHeaders,
			body: JSON.stringify({ docId: transDocId })
		});
		assert(badTransRes.status === 400, 'Missing language rejected with 400');

		// 2.4 Verify stored content was NOT mutated
		const checkDocRes = await fetch(`${API_URL}/api/documents/ingest?id=${transDocId}`, {
			headers: adminHeaders
		});
		const checkDoc = await checkDocRes.json();
		assert(checkDoc.language === 'en', 'Stored document remains unmutated English projection');
	} catch (e: any) {
		assert(false, 'Translation API tests', e?.message);
	}

	// ==================================================================
	// 3. PHASE 9.5: AUTH, PEOPLE & ACCESS CONTROL
	// ==================================================================
	console.log('\n--- 3. Phase 9.5: Auth, People & User Management ---');

	let createdUserId = '';
	try {
		// 3.1 Anonymous access to /api/users blocked
		const anonUsersRes = await fetch(`${API_URL}/api/users`);
		assert(anonUsersRes.status === 401 || anonUsersRes.status === 403, 'Anonymous access to /api/users blocked', `status=${anonUsersRes.status}`);

		// 3.2 Non-admin (Manager) access to /api/users forbidden
		const managerUsersRes = await fetch(`${API_URL}/api/users`, { headers: managerHeaders });
		assert(managerUsersRes.status === 403, 'Manager forbidden from accessing /api/users', `status=${managerUsersRes.status}`);

		// 3.3 Admin creates new user
		const testEmail = `operator-${Date.now()}@kmrl.local`;
		const createRes = await fetch(`${API_URL}/api/users`, {
			method: 'POST',
			headers: adminHeaders,
			body: JSON.stringify({
				name: 'Test Operator',
				email: testEmail,
				password: 'securePassword123',
				role: 'MANAGER',
				department: 'Operations',
				grants: [{ dept: 'OPERATIONS', type: 'SOP', actions: ['read'] }]
			})
		});
		const createData = await createRes.json();
		assert(createRes.status === 201 && !!createData.id, 'Admin created new user', `userId=${createData.id}`);
		createdUserId = createData.id;

		// 3.4 Admin reads user by ID
		const readUserRes = await fetch(`${API_URL}/api/users/${createdUserId}`, { headers: adminHeaders });
		const readUserData = await readUserRes.json();
		assert(readUserRes.status === 200 && readUserData.user?.email === testEmail, 'Admin read user details');

		// 3.5 Admin updates user via PATCH
		const patchUserRes = await fetch(`${API_URL}/api/users/${createdUserId}`, {
			method: 'PATCH',
			headers: adminHeaders,
			body: JSON.stringify({
				department: 'Maintenance'
			})
		});
		assert(patchUserRes.status === 200, 'Admin updated user via PATCH');

		// 3.6 Admin deletes user
		const deleteUserRes = await fetch(`${API_URL}/api/users/${createdUserId}`, {
			method: 'DELETE',
			headers: adminHeaders
		});
		assert(deleteUserRes.status === 200, 'Admin deleted user');
	} catch (e: any) {
		assert(false, 'Auth & People tests', e?.message);
	}

	// ==================================================================
	// 4. PHASE 10: SECONDARY WORKFLOWS (REQUESTS & TRUTHFUL STATUS)
	// ==================================================================
	console.log('\n--- 4. Phase 10: Secondary Workflows ---');

	try {
		// 4.1 Deployment request validation rejection
		const badReqRes = await fetch(`${API_URL}/api/requests`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ organizationName: 'Test Org' }) // missing contactName, email, message
		});
		assert(badReqRes.status === 400, 'Invalid deployment request rejected with 400');

		// 4.2 Valid deployment request submitted successfully
		const goodReqRes = await fetch(`${API_URL}/api/requests`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				organizationName: 'Kochi Metro Operations',
				contactName: 'Rohan Varma',
				contactEmail: 'rohan.varma@kmrl.local',
				contactPhone: '+91 98470 12345',
				role: 'Chief Engineer',
				message: 'Requesting staging deployment of DocSetu for station operations testing.'
			})
		});
		const goodReqData = await goodReqRes.json();
		assert(goodReqRes.status === 201 && !!goodReqData.requestId, 'Deployment request persisted in database', `requestId=${goodReqData.requestId}`);

		// 4.3 Truthful Status reporting
		const statusRes = await fetch(`${API_URL}/api/status`);
		const statusData = await statusRes.json();
		assert(statusRes.status === 200, 'Status API operational');
		assert(statusData.services?.mongodb?.status === 'connected', 'Truthful Mongo connected state');
		assert(typeof statusData.services?.mongodb?.stats?.totalDocuments === 'number', 'Reports real document count');
		assert(statusData.services?.ai?.gemini === 'configured', 'Reports real Gemini AI configuration');
	} catch (e: any) {
		assert(false, 'Secondary workflows tests', e?.message);
	}

	// ==================================================================
	// 5. PHASE 12: DELETE CASCADE (DOCUMENTS, CHUNKS, CHAT SESSIONS)
	// ==================================================================
	console.log('\n--- 5. Phase 12: Cascade Deletion ---');

	try {
		// Create a chat session attached to transDocId
		const chatRes = await fetch(`${API_URL}/api/chat`, {
			method: 'POST',
			headers: adminHeaders,
			body: JSON.stringify({
				docId: transDocId,
				messages: [{ role: 'user', content: 'What is the tender valuation?' }]
			})
		});
		const chatData = await chatRes.json();
		const sessionId = chatData.sessionId;
		assert(!!sessionId, 'Chat session created for test document', `sessionId=${sessionId}`);

		// Delete document transDocId
		const deleteDocRes = await fetch(`${API_URL}/api/documents/${transDocId}`, {
			method: 'DELETE',
			headers: adminHeaders
		});
		assert(deleteDocRes.status === 200, 'Document deleted by Admin');

		// Verify document is gone
		const checkGoneRes = await fetch(`${API_URL}/api/documents/ingest?id=${transDocId}`, {
			headers: adminHeaders
		});
		assert(checkGoneRes.status === 404, 'Document record removed from documents collection');

		// Verify chat session for this docId is cascaded away
		const checkChatRes = await fetch(`${API_URL}/api/chat?sessionId=${sessionId}&docId=${transDocId}`, {
			headers: adminHeaders
		});
		const checkChatData = await checkChatRes.json();
		assert(checkChatData.messages?.length === 0, 'Associated chat sessions cascaded and deleted');
	} catch (e: any) {
		assert(false, 'Cascade deletion test', e?.message);
	}

	// ==================================================================
	// 6. PHASE 11: LEGACY API CLEANUP
	// ==================================================================
	console.log('\n--- 6. Phase 11: Legacy API Cleanup ---');

	try {
		// 6.1 /api/upload returns 410 Gone
		const uploadRes = await fetch(`${API_URL}/api/upload`, { method: 'POST' });
		assert(uploadRes.status === 410, 'Obsolete /api/upload returns 410 Gone');

		// 6.2 /api/ingest returns 410 Gone
		const ingestRes = await fetch(`${API_URL}/api/ingest`, { method: 'POST' });
		assert(ingestRes.status === 410, 'Obsolete /api/ingest returns 410 Gone');

		// 6.3 /api/user returns 410 Gone
		const userRes = await fetch(`${API_URL}/api/user`, { method: 'GET' });
		assert(userRes.status === 410, 'Experimental /api/user returns 410 Gone');
	} catch (e: any) {
		assert(false, 'Legacy API cleanup tests', e?.message);
	}

	console.log('\n======================================================================');
	console.log(`FULL MATRIX RESULTS: ${passed} PASSED, ${failed} FAILED`);
	console.log('======================================================================\n');

	if (failed > 0) {
		process.exit(1);
	}
}

run().catch(e => {
	console.error('Fatal test error:', e);
	process.exit(1);
});
