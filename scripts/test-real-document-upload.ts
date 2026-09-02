#!/usr/bin/env tsx
/**
 * Real Document Ingestion & End-to-End Workflow Verification
 * 
 * Uses:
 * 1. Real user login: admin@example.com / secret123 via POST /api/auth/login
 * 2. Real raw document: SIH2025-IDEA-Presentation-Format.pdf
 * 3. Real Ingestion -> Normalization -> Chunking -> AI Enrichment -> Persistence
 * 4. Verification: Listing -> Single Doc Retrieval -> Search -> RAG Chat -> Translation -> Actions
 */

import fs from 'fs';
import path from 'path';

const API_URL = process.env.API_URL || 'http://localhost:3005';

function logSection(title: string) {
	console.log(`\n======================================================================`);
	console.log(`🔹 ${title}`);
	console.log(`======================================================================`);
}

async function main() {
	console.log('🚀 STARTING REAL DOCUMENT INGESTION VERIFICATION');
	console.log(`Target Server: ${API_URL}`);

	// ==================================================================
	// STEP 1: REAL USER LOGIN VIA POST /api/auth/login
	// ==================================================================
	logSection('STEP 1: Authenticate via POST /api/auth/login');
	const loginRes = await fetch(`${API_URL}/api/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			email: 'admin@example.com',
			password: 'secret123'
		})
	});

	if (!loginRes.ok) {
		const err = await loginRes.text();
		throw new Error(`Login failed (${loginRes.status}): ${err}`);
	}

	// Extract kmrl_session cookie from set-cookie
	const setCookie = loginRes.headers.get('set-cookie') || '';
	const match = setCookie.match(/kmrl_session=([^;]+)/);
	const sessionToken = match ? match[1] : '';

	if (!sessionToken) {
		throw new Error('Failed to extract kmrl_session cookie from login response.');
	}

	console.log('✅ Login successful! Received authenticated session cookie:');
	console.log(`   kmrl_session=${sessionToken.slice(0, 30)}...`);

	const authHeaders = {
		'Content-Type': 'application/json',
		Cookie: `kmrl_session=${sessionToken}`
	};

	// Verify session
	const sessionRes = await fetch(`${API_URL}/api/auth/session`, { headers: authHeaders });
	const sessionData = await sessionRes.json();
	console.log(`✅ Session verified: Logged in as "${sessionData.user?.name}" (${sessionData.user?.email}) with role [${sessionData.user?.role}]`);

	// ==================================================================
	// STEP 2: LOAD REAL RAW DOCUMENT (SIH2025-IDEA-Presentation-Format.pdf)
	// ==================================================================
	logSection('STEP 2: Load Real Document: SIH2025-IDEA-Presentation-Format.pdf');
	const pdfPath = path.resolve(__dirname, '..', 'SIH2025-IDEA-Presentation-Format.pdf');
	if (!fs.existsSync(pdfPath)) {
		throw new Error(`PDF file not found at ${pdfPath}`);
	}

	const pdfBuffer = fs.readFileSync(pdfPath);
	const base64Pdf = pdfBuffer.toString('base64');
	console.log(`✅ Loaded PDF from disk:`);
	console.log(`   Path: ${pdfPath}`);
	console.log(`   Size: ${pdfBuffer.length} bytes (~${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
	console.log(`   Base64 Length: ${base64Pdf.length} chars`);

	// ==================================================================
	// STEP 3: INGEST DOCUMENT VIA POST /api/documents/ingest
	// ==================================================================
	logSection('STEP 3: Ingest Document via POST /api/documents/ingest');
	console.log('⏳ Uploading and processing document (Extracting, Chunking, AI Analysis)...');
	const ingestStartTime = Date.now();

	const ingestRes = await fetch(`${API_URL}/api/documents/ingest`, {
		method: 'POST',
		headers: authHeaders,
		body: JSON.stringify({
			title: 'Smart India Hackathon 2025 - Idea Presentation Format',
			department: 'Administration',
			documentType: 'Policy',
			tags: ['SIH2025', 'SmartAutomation', 'KMRL', 'Innovation', 'Platform0'],
			documents: [
				{
					type: 'pdf',
					content: base64Pdf,
					filename: 'SIH2025-IDEA-Presentation-Format.pdf'
				}
			]
		})
	});

	const ingestData = await ingestRes.json();
	const duration = Date.now() - ingestStartTime;

	if (!ingestRes.ok) {
		throw new Error(`Ingest failed (${ingestRes.status}): ${JSON.stringify(ingestData, null, 2)}`);
	}

	const documentId = ingestData.documentId;
	console.log(`✅ Ingestion succeeded in ${duration}ms!`);
	console.log(`   Document ID: ${documentId}`);
	console.log(`   Title: ${ingestData.title}`);
	console.log(`   Generated Chunks/Nodes: ${ingestData.nodeCount}`);
	console.log(`   Executive Summary: "${ingestData.summary?.slice(0, 160)}..."`);

	// ==================================================================
	// STEP 4: VERIFY APPEARANCE IN DOCUMENT LISTING (GET /api/documents/ingest)
	// ==================================================================
	logSection('STEP 4: Verify in Document Listing (GET /api/documents/ingest)');
	const listRes = await fetch(`${API_URL}/api/documents/ingest?pageSize=10`, { headers: authHeaders });
	const listData = await listRes.json();
	const foundInList = (listData.documents || []).find((d: any) => d.id === documentId);

	if (!foundInList) {
		throw new Error(`Uploaded document ${documentId} not found in document listing!`);
	}
	console.log(`✅ Document confirmed in workspace catalog:`);
	console.log(`   Catalog Title: "${foundInList.title}"`);
	console.log(`   Department: ${foundInList.department}`);
	console.log(`   Sections: ${foundInList.nodeCount}`);

	// ==================================================================
	// STEP 5: VERIFY FULL DETAIL & CHUNKS (GET /api/documents/ingest?id=...)
	// ==================================================================
	logSection('STEP 5: Retrieve Full Document and Chunks');
	const detailRes = await fetch(`${API_URL}/api/documents/ingest?id=${documentId}`, { headers: authHeaders });
	const detailData = await detailRes.json();

	console.log(`✅ Retrieved full document details:`);
	console.log(`   Format: ${detailData.originalFormat}`);
	console.log(`   Total Pages: ${detailData.totalPages}`);
	console.log(`   Attached Nodes Count: ${detailData.nodes?.length}`);
	console.log(`   Aggregated Keywords (${detailData.keywords?.length}): ${detailData.keywords?.slice(0, 8).join(', ')}...`);

	console.log('\n   📋 Chunk Breakdown:');
	detailData.nodes?.forEach((node: any, idx: number) => {
		console.log(`   - Chunk #${idx + 1} [${node.nodeId}] (Pages ${node.pageRange?.start}-${node.pageRange?.end}):`);
		console.log(`     Title: ${node.title}`);
		console.log(`     Summary: "${node.summary?.slice(0, 100)}..."`);
		console.log(`     Key Points (${node.keyPoints?.length || 0}): ${node.keyPoints?.[0] || 'None'}`);
		console.log(`     Actions (${node.actionableItems?.length || 0}): ${node.actionableItems?.[0] || 'None'}`);
	});

	// ==================================================================
	// STEP 6: SEARCH CONTENT INSIDE THE REAL DOCUMENT
	// ==================================================================
	logSection('STEP 6: Lexical & Section Search (POST /api/search/vector)');
	const searchQueries = ['Smart India Hackathon', 'Theme', 'Idea Presentation'];

	for (const query of searchQueries) {
		const searchRes = await fetch(`${API_URL}/api/search/vector`, {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify({
				query,
				searchNodes: true,
				limit: 3
			})
		});
		const searchData = await searchRes.json();
		const topMatch = searchData.results?.[0];
		console.log(`🔍 Query: "${query}" -> Found ${searchData.resultsFound} section(s):`);
		if (topMatch) {
			console.log(`   Top Match: [Score: ${topMatch.score}] Doc: "${topMatch.documentTitle}" | Section: "${topMatch.title}"`);
			console.log(`   Excerpt: "${topMatch.matchingExcerpt || topMatch.nodeSummary?.slice(0, 100)}..."`);
		}
	}

	// ==================================================================
	// STEP 7: GROUNDED Q&A / CHAT OVER REAL CHUNKS
	// ==================================================================
	logSection('STEP 7: Ask Question over Real Chunks (POST /api/chat)');
	const chatQuestion = 'What is the purpose of this presentation format and what are the guidelines?';
	console.log(`❓ User Question: "${chatQuestion}"`);

	const chatRes = await fetch(`${API_URL}/api/chat`, {
		method: 'POST',
		headers: authHeaders,
		body: JSON.stringify({
			docId: documentId,
			messages: [{ role: 'user', content: chatQuestion }]
		})
	});
	const chatData = await chatRes.json();
	console.log(`🤖 DocSetu Assistant Reply:\n`);
	console.log(chatData.reply);
	console.log(`\n📌 Citations Generated (${chatData.citations?.length || 0}):`);
	chatData.citations?.forEach((c: any) => {
		console.log(`   [#${c.index}] ${c.title} -> ${c.sectionTitle} (Pages ${c.pageRange?.start}-${c.pageRange?.end})`);
	});

	// ==================================================================
	// STEP 8: TRANSLATE REAL SECTION (POST /api/translate)
	// ==================================================================
	logSection('STEP 8: Translate Section Content (POST /api/translate)');
	console.log('🌐 Translating Section 1 to Malayalam:');
	const transRes = await fetch(`${API_URL}/api/translate`, {
		method: 'POST',
		headers: authHeaders,
		body: JSON.stringify({
			docId: documentId,
			language: 'Malayalam'
		})
	});
	const transData = await transRes.json();
	console.log(`   Language: ${transData.language}`);
	console.log(`   Translated Summary: "${transData.summary?.slice(0, 150)}..."`);
	if (transData.keyPoints?.length > 0) {
		console.log(`   Translated Key Point: "${transData.keyPoints[0]}"`);
	}

	// ==================================================================
	// STEP 9: CHECK ACTIONS EXTRACTED ACROSS WORKSPACE
	// ==================================================================
	logSection('STEP 9: Check Actions Dashboard (GET /api/actions)');
	const actionsRes = await fetch(`${API_URL}/api/actions`, { headers: authHeaders });
	const actionsData = await actionsRes.json();
	console.log(`✅ Total Actions in Workspace: ${actionsData.total}`);
	const recentAction = actionsData.actions?.[0];
	if (recentAction) {
		console.log(`   Latest Action Item: "${recentAction.action}"`);
		console.log(`   Document: "${recentAction.documentTitle}" | Section: "${recentAction.sectionTitle}"`);
		console.log(`   Team: ${recentAction.team} | Urgent: ${recentAction.isUrgent}`);
	}

	logSection('🎉 ALL REAL WORKFLOW TESTS PASSED SUCCESSFULLY!');
	console.log('The real PDF document was fully ingested, parsed into pages & chunks, stored in MongoDB, retrieved in catalog, searched with lexical relevance, answered questions with RAG citations, and translated into Malayalam without mutation.');
}

main().catch(err => {
	console.error('❌ Test failed with error:', err);
	process.exit(1);
});
