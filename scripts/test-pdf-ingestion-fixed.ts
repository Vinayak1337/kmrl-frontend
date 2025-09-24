import { promises as fs } from 'fs';
import {
	extractPdfPagesFromBase64,
	extractPdfPagesWithImagesFromBase64
} from '../lib/pdf';
import {
	analyzeDocumentWithGemini,
	type AgentPage
} from '../lib/agent/geminiAgent';
import { buildManagerMdPrompt } from '../lib/prompt';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as path from 'path';

// Mock API key for testing
const API_KEY = process.env.GEMINI_API_KEY || 'test-key';

// Helper to create properly structured nodes
function createLinkedStructure(nodes: any[]): any[] {
	const linked: any[] = [];
	for (let index = 0; index < nodes.length; index++) {
		const node = nodes[index];
		linked.push({
			id: `node-${index + 1}`,
			pageRange: node.pageRange || { start: index + 1, end: index + 1 },
			content: node.content || '',
			images: node.images || [],
			summary: node.summary || '',
			summaryMd: node.summaryMd,
			keyPointsMd: node.keyPointsMd,
			actionsMd: node.actionsMd,
			keyPoints: node.keyPoints || [],
			actionableItems: node.actionableItems || [],
			criticalFlags: node.criticalFlags || [],
			crossDepartments: node.crossDepartments || [],
			needsImage: node.needsImage || false,
			meta: node.meta,
			nextNodeId: index < nodes.length - 1 ? `node-${index + 2}` : undefined,
			prevNodeId: index > 0 ? `node-${index}` : undefined
		});
	}
	return linked;
}

async function testPdfIngestion() {
	console.log('🚀 Testing Fixed PDF Ingestion Process...\n');

	try {
		// Read the PDF file
		const pdfPath = path.join(
			process.cwd(),
			'SIH2025-IDEA-Presentation-Format.pdf'
		);
		const pdfBuffer = await fs.readFile(pdfPath);
		const pdfBase64 = pdfBuffer.toString('base64');

		console.log(`📄 PDF file loaded: ${pdfPath}`);
		console.log(`📏 File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB\n`);

		// Step 1: Extract pages with text and images
		console.log('📖 Step 1: Extracting pages from PDF...');
		let pagesWithImages: Array<{
			index: number;
			text: string;
			images: Array<{ base64: string; mimeType: string }>;
		}> = [];

		try {
			const result = await extractPdfPagesWithImagesFromBase64(pdfBase64, {
				scale: 2,
				imagesPerPage: 1
			});
			pagesWithImages = result.pages;
			console.log(`✅ Extracted ${pagesWithImages.length} pages with images`);
		} catch (e) {
			console.log(`⚠️ Could not extract images, falling back to text-only`);
			const { pages } = await extractPdfPagesFromBase64(pdfBase64);
			pagesWithImages = pages.map(p => ({ ...p, images: [] }));
			console.log(`✅ Extracted ${pagesWithImages.length} pages (text only)`);
		}

		// Display page info
		for (let i = 0; i < Math.min(3, pagesWithImages.length); i++) {
			const page = pagesWithImages[i];
			console.log(
				`  Page ${page.index}: ${page.text.length} chars, ${page.images.length} images`
			);
		}

		// Step 2: Test AI Analysis (if API key available)
		if (API_KEY && API_KEY !== 'test-key') {
			console.log('\n\n🤖 Step 2: Testing AI Analysis...');

			// Test with agent
			try {
				const agentPages: AgentPage[] = pagesWithImages.slice(0, 6).map(p => ({
					index: p.index,
					text: p.text || '',
					images: p.images || []
				}));

				console.log(`Sending ${agentPages.length} pages to Gemini agent...`);
				const agentResult = await analyzeDocumentWithGemini({
					pages: agentPages,
					apiKey: API_KEY,
					maxLoops: 8
				});

				console.log('\n✅ Agent analysis complete!');
				console.log(`Nodes created: ${agentResult.nodes.length}`);

				// Create linked structure
				const linkedNodes = await createLinkedStructure(agentResult.nodes);

				// Display results
				console.log('\n--- Node Analysis ---');
				linkedNodes.forEach((node, idx) => {
					console.log(`\nNode ${idx + 1}:`);
					console.log(`  ID: ${node.id}`);
					console.log(
						`  Page range: ${node.pageRange.start}-${node.pageRange.end}`
					);
					console.log(`  Content: ${node.content.length} chars`);
					console.log(
						`  Summary: ${
							node.summary ? node.summary.substring(0, 100) + '...' : 'None'
						}`
					);
					console.log(`  Key points: ${node.keyPoints.length}`);
					console.log(`  Action items: ${node.actionableItems.length}`);
					console.log(`  Critical flags: ${node.criticalFlags.length}`);
					console.log(`  Cross departments: ${node.crossDepartments.length}`);
				});
			} catch (e) {
				console.error('❌ Agent analysis failed:', e);
			}

			// Test direct AI processing
			console.log('\n\n🧠 Step 3: Testing Direct AI Processing...');
			const fullText = pagesWithImages
				.map(p => `[Page ${p.index}]\n${p.text}`)
				.join('\n\n');

			try {
				const genAI = new GoogleGenerativeAI(API_KEY);
				const model = genAI.getGenerativeModel({
					model: 'gemini-2.0-flash-exp'
				});
				const prompt = buildManagerMdPrompt({
					department: 'Operations',
					documentType: 'presentation'
				});

				const result = await model.generateContent({
					contents: [
						{
							role: 'user',
							parts: [
								{ text: prompt },
								{ text: `Document Content (raw text):\n${fullText}` }
							]
						}
					],
					generationConfig: { responseMimeType: 'application/json' as any }
				});

				const responseText = result.response.text();
				const parsed = JSON.parse(responseText);

				console.log('✅ Direct AI processing complete!');
				console.log(`Document type: ${parsed.documentType}`);
				console.log(`Departments: ${parsed.departments?.join(', ')}`);
				console.log(`Urgency: ${parsed.urgencyLevel}`);
				console.log(`Nodes: ${parsed.nodes?.length || 0}`);

				if (parsed.nodes && parsed.nodes.length > 0) {
					parsed.nodes.forEach((node: any, idx: number) => {
						console.log(`\nNode ${idx + 1} from AI:`);
						console.log(
							`  Page range: ${node.pageRange?.start}-${node.pageRange?.end}`
						);
						console.log(
							`  Summary MD: ${node.summaryMd ? 'Present' : 'Missing'}`
						);
						console.log(`  Key points: ${node.keyPoints?.length || 0}`);
						console.log(`  Action items: ${node.actionableItems?.length || 0}`);
						console.log(`  Critical flags: ${node.criticalFlags?.length || 0}`);
						console.log(
							`  Cross departments: ${node.crossDepartments?.length || 0}`
						);

						// Show sample data if available
						if (node.keyPoints && node.keyPoints.length > 0) {
							console.log(`  Sample key point: "${node.keyPoints[0]}"`);
						}
						if (node.actionableItems && node.actionableItems.length > 0) {
							const item = node.actionableItems[0];
							if (typeof item === 'string') {
								console.log(`  Sample action: "${item}"`);
							} else {
								console.log(
									`  Sample action: Owner: ${item.owner}, Action: ${item.action}`
								);
							}
						}
					});
				}
			} catch (e) {
				console.error('❌ Direct AI processing failed:', e);
			}
		} else {
			console.log('\n⚠️ Skipping AI analysis (no API key)');
		}

		// Step 4: Test node title generation
		console.log('\n\n📝 Step 4: Testing Node Title Generation...');

		// Simulate node data
		const testNodes = [
			{
				summary:
					'This is a test summary about the SMART INDIA HACKATHON 2025 project called KochiDocs which aims to solve document management issues.',
				summaryMd:
					'## Executive Summary\nThis document describes the KochiDocs platform...',
				topicSummary: 'KochiDocs Platform Overview',
				meta: { slideType: 'Title Slide' }
			},
			{
				summary:
					'The platform provides automated document ingestion, OCR capabilities, and AI-powered search.',
				summaryMd:
					'## Key Features\n- Automated ingestion\n- OCR processing\n- AI search',
				topicSummary: null,
				meta: null
			}
		];

		testNodes.forEach((node, idx) => {
			const order = idx + 1;

			// This is the title generation logic from ingest/route.ts
			const title =
				(node.meta?.slideType && node.meta.slideType.trim()) ||
				(node.topicSummary && node.topicSummary.trim()) ||
				node.summaryMd
					?.split('\n')
					.find(l => l.trim().length > 0)
					?.replace(/^#+\s*/, '')
					?.slice(0, 80) ||
				(node.summary || '').split(/[.!?]/)[0]?.slice(0, 80) ||
				`Section ${order}`;

			console.log(`\nNode ${order} title generation:`);
			console.log(`  Meta slide type: ${node.meta?.slideType || 'none'}`);
			console.log(`  Topic summary: ${node.topicSummary || 'none'}`);
			console.log(
				`  From summary MD: ${
					node.summaryMd
						?.split('\n')
						.find(l => l.trim().length > 0)
						?.replace(/^#+\s*/, '') || 'none'
				}`
			);
			console.log(
				`  From summary text: ${
					(node.summary || '').split(/[.!?]/)[0] || 'none'
				}`
			);
			console.log(`  Generated title: "${title}"`);
			console.log(`  Title length: ${title.length}`);
		});

		// Test with the problematic title
		console.log('\n\n🔍 Testing Problematic Title:');
		const problemTitle =
			'SMART INDIA HACKATHON 2025 1 KochiDocs Problem Statement ID – 25080 Problem Statement Title - Document Overload at Kochi Metro Rail Limited (KMRL) - An automated solution Theme - Smart Automation PS Category- Software Team ID - TBD Team Name - Platform 0';
		const truncated = problemTitle.slice(0, 80);
		console.log(`Original length: ${problemTitle.length}`);
		console.log(`Truncated to 80: "${truncated}"`);
		console.log(
			`Character at position 70: '${
				problemTitle[70]
			}' (char code: ${problemTitle.charCodeAt(70)})`
		);
		console.log(
			`Character at position 71: '${
				problemTitle[71]
			}' (char code: ${problemTitle.charCodeAt(71)})`
		);
	} catch (error) {
		console.error('\n❌ Test failed:', error);
	}
}

// Run the test
console.log('=====================================');
console.log('PDF Ingestion Fixed Test');
console.log('=====================================\n');

testPdfIngestion()
	.then(() => {
		console.log('\n✅ Test completed!');
	})
	.catch(error => {
		console.error('\n❌ Test error:', error);
		process.exit(1);
	});
