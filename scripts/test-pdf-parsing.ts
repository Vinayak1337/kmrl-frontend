import { GoogleGenerativeAI } from '@google/generative-ai';
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
import * as path from 'path';

// Note: Run with environment variable: GEMINI_API_KEY=your_key npx tsx scripts/test-pdf-parsing.ts
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
	console.error('❌ GEMINI_API_KEY not found in .env.local');
	process.exit(1);
}

async function testPdfParsing() {
	console.log('🚀 Starting PDF parsing test...\n');

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

		// Step 1: Extract text from PDF
		console.log('📖 Step 1: Extracting text from PDF...');
		const { pages, pageCount } = await extractPdfPagesFromBase64(pdfBase64);
		console.log(`✅ Extracted ${pageCount} pages`);

		// Display first few pages of text
		for (let i = 0; i < Math.min(3, pages.length); i++) {
			const page = pages[i];
			console.log(`\n--- Page ${page.index} ---`);
			console.log(`Text length: ${page.text.length} characters`);
			console.log(`Preview: ${page.text.substring(0, 200)}...`);
		}

		// Step 2: Try to extract with images (if canvas is available)
		console.log('\n\n🖼️ Step 2: Trying to extract with images...');
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
			console.log(`✅ Extracted pages with images`);
			for (let i = 0; i < Math.min(3, pagesWithImages.length); i++) {
				console.log(
					`Page ${pagesWithImages[i].index}: ${pagesWithImages[i].images.length} images`
				);
			}
		} catch (e) {
			console.log(`⚠️ Could not extract images: ${e}`);
			pagesWithImages = pages.map(p => ({ ...p, images: [] }));
		}

		// Step 3: Test Gemini Agent Analysis
		console.log('\n\n🤖 Step 3: Testing Gemini Agent Analysis...');
		const MAX_PAGES = 10; // Limit for testing
		const limited = pagesWithImages.slice(0, MAX_PAGES);

		const agentPages: AgentPage[] = limited.map(p => ({
			index: p.index,
			text: p.text || '',
			images: p.images || []
		}));

		console.log(`Sending ${agentPages.length} pages to Gemini agent...`);

		try {
			const agentResult = await analyzeDocumentWithGemini({
				pages: agentPages,
				apiKey: API_KEY!,
				maxLoops: 8
			});

			console.log('\n✅ Agent analysis complete!');
			console.log(`Number of nodes created: ${agentResult.nodes.length}`);
			console.log(
				`Overall summary: ${agentResult.overallSummary.substring(0, 200)}...`
			);

			// Display node details
			console.log('\n--- Node Details ---');
			agentResult.nodes.forEach((node, idx) => {
				console.log(`\nNode ${idx + 1}:`);
				console.log(
					`  Page range: ${node.pageRange.start} - ${node.pageRange.end}`
				);
				console.log(`  Content length: ${node.content.length} chars`);
				console.log(`  Summary: ${node.summary.substring(0, 150)}...`);
				console.log(`  Key points: ${node.keyPoints.length}`);
				console.log(`  Action items: ${node.actionableItems.length}`);
				console.log(`  Images: ${node.images.length}`);

				// Show meta info if available
				if ((node as any).meta) {
					console.log(`  Meta:`, (node as any).meta);
				}
			});

			// Check for truncation issues
			console.log('\n\n🔍 Checking for truncation issues...');
			const truncatedNodes = agentResult.nodes.filter(
				node =>
					node.content.endsWith('...') ||
					node.summary.endsWith('...') ||
					node.content.includes('Pr…')
			);

			if (truncatedNodes.length > 0) {
				console.log(
					`⚠️ Found ${truncatedNodes.length} nodes with potential truncation`
				);
				truncatedNodes.forEach((node, idx) => {
					console.log(
						`  Node with truncation: pages ${node.pageRange.start}-${node.pageRange.end}`
					);
				});
			}
		} catch (e) {
			console.error('❌ Agent analysis failed:', e);
		}

		// Step 4: Test direct AI processing (fallback method)
		console.log('\n\n🧪 Step 4: Testing direct AI processing (fallback)...');
		const aggregateText = limited
			.map(p => `\n\n[Page ${p.index}] ${p.text}`)
			.join(' ');
		console.log(`Aggregate text length: ${aggregateText.length} characters`);

		const genAI = new GoogleGenerativeAI(API_KEY!);
		const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

		// Test manager-focused prompt
		const managerPrompt = buildManagerMdPrompt({
			department: 'Operations',
			documentType: 'presentation'
		});
		console.log('\nUsing manager-focused prompt...');

		try {
			const result = await model.generateContent({
				contents: [
					{
						role: 'user',
						parts: [
							{ text: managerPrompt },
							{
								text: `Document Content (raw text):\n${aggregateText.substring(
									0,
									10000
								)}`
							} // Limit for testing
						]
					}
				],
				generationConfig: { responseMimeType: 'application/json' as any }
			});

			const responseText = result.response.text();
			const parsed = JSON.parse(responseText);

			console.log('\n✅ Direct AI processing complete!');
			console.log(`Nodes: ${parsed.nodes?.length || 0}`);
			console.log(`Document type: ${parsed.documentType}`);
			console.log(`Departments: ${parsed.departments?.join(', ')}`);

			if (parsed.nodes && parsed.nodes.length > 0) {
				console.log('\nFirst node details:');
				const firstNode = parsed.nodes[0];
				console.log(
					`  Summary MD: ${firstNode.summaryMd?.substring(0, 200)}...`
				);
				console.log(`  Key points: ${firstNode.keyPoints?.length || 0}`);
				console.log(
					`  Action items: ${firstNode.actionableItems?.length || 0}`
				);
				console.log(
					`  Critical flags: ${firstNode.criticalFlags?.length || 0}`
				);
				console.log(
					`  Cross departments: ${firstNode.crossDepartments?.length || 0}`
				);
			}

			// Check if arrays are empty
			const emptyArrayNodes = (parsed.nodes || []).filter(
				(node: any) =>
					(!node.keyPoints || node.keyPoints.length === 0) &&
					(!node.actionableItems || node.actionableItems.length === 0)
			);

			if (emptyArrayNodes.length > 0) {
				console.log(
					`\n⚠️ ${emptyArrayNodes.length} nodes have empty keyPoints and actionableItems`
				);
			}
		} catch (e) {
			console.error('❌ Direct AI processing failed:', e);
		}

		// Step 5: Test content extraction logic
		console.log('\n\n🔬 Step 5: Testing content extraction logic...');
		const testExtraction = (
			pageStart: number,
			pageEnd: number,
			totalLength: number
		) => {
			const start = Math.floor(((pageStart - 1) * totalLength) / 10) || 0;
			const end = Math.floor((pageEnd * totalLength) / 10) || totalLength;
			return { start, end, length: end - start };
		};

		console.log('Content extraction formula test:');
		console.log(`Total text length: ${aggregateText.length}`);
		console.log(`Page 1-1: `, testExtraction(1, 1, aggregateText.length));
		console.log(`Page 1-3: `, testExtraction(1, 3, aggregateText.length));
		console.log(`Page 2-4: `, testExtraction(2, 4, aggregateText.length));

		// This formula seems problematic - it divides by 10 which might cause issues
		console.log(
			'\n⚠️ Issue found: Content extraction divides by 10, which may cause truncation!'
		);
	} catch (error) {
		console.error('\n❌ Test failed:', error);
	}
}

// Run the test
console.log('=====================================');
console.log('PDF Parsing Debug Test');
console.log('=====================================\n');

testPdfParsing()
	.then(() => {
		console.log('\n✅ Test completed!');
	})
	.catch(error => {
		console.error('\n❌ Test error:', error);
		process.exit(1);
	});
