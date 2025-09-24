import { promises as fs } from 'fs';
import { extractPdfPagesFromBase64 } from '../lib/pdf';
import * as path from 'path';

async function testPdfExtraction() {
	console.log('🚀 Testing PDF text extraction in detail...\n');

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

		// Extract text from PDF
		console.log('📖 Extracting text from PDF...');
		const { pages, pageCount } = await extractPdfPagesFromBase64(pdfBase64);
		console.log(`✅ Extracted ${pageCount} pages\n`);

		// Check each page for issues
		console.log('=== Detailed Page Analysis ===\n');

		for (let i = 0; i < pages.length; i++) {
			const page = pages[i];
			console.log(`Page ${page.index}:`);
			console.log(`  Text length: ${page.text.length} characters`);

			// Check for ellipsis
			const ellipsisCount = (page.text.match(/…/g) || []).length;
			const tripleDotsCount = (page.text.match(/\.\.\./g) || []).length;

			if (ellipsisCount > 0) {
				console.log(`  ⚠️ Contains ${ellipsisCount} ellipsis characters (…)`);
			}
			if (tripleDotsCount > 0) {
				console.log(`  ⚠️ Contains ${tripleDotsCount} triple dots (...)`);
			}

			// Show full text
			console.log(`  Full text:`);
			console.log(`  "${page.text}"`);
			console.log('');
		}

		// Check what the title extraction looks like
		console.log('\n=== Title Extraction Analysis ===\n');
		const fullText = pages.map(p => p.text).join('\n\n');

		// The MongoDB document shows this title with ellipsis:
		// "SMART INDIA HACKATHON 2025 1 KochiDocs Problem Statement ID – 25080 Pr…"

		// Let's see if this is in the original text
		const titleStart =
			'SMART INDIA HACKATHON 2025 1 KochiDocs Problem Statement ID – 25080 Pr';
		const foundIndex = fullText.indexOf(titleStart);

		if (foundIndex >= 0) {
			console.log(`Found title text at position ${foundIndex}`);
			const contextLength = 200;
			const context = fullText.substring(
				foundIndex,
				foundIndex + contextLength
			);
			console.log(`Context: "${context}"`);

			// Check if there's an ellipsis in the original
			if (context.includes('…')) {
				console.log('\n⚠️ The ellipsis (…) is in the ORIGINAL PDF text!');
			} else {
				console.log(
					'\n✅ No ellipsis in original text - it must be added during processing'
				);
			}
		}

		// Test what a proper node structure should look like
		console.log('\n\n=== Expected Node Structure ===\n');
		console.log('A properly parsed node should have:');
		console.log('- title: A meaningful title extracted from the content');
		console.log('- content: The full text for that section/page');
		console.log('- summary: AI-generated summary of the content');
		console.log('- keyPoints: Array of key points extracted by AI');
		console.log('- actionableItems: Array of action items');
		console.log('- etc.');

		// Check if the issue is with display truncation
		console.log('\n\n=== Display Truncation Check ===\n');
		const testTitle =
			"SMART INDIA HACKATHON 2025 1 KochiDocs Problem Statement ID – 25080 Problem Statement Title - Document Indexing, Categorization, and AI-Based Retrieval Optimization Description - Kochi Metro Rail Limited (KMRL) handles vast volumes of documents—safety circulars, HR policies, technical specifications, procurement files—across multiple departments. Current management is fragmented, with manual filing, email searches, and limited retrieval options. This creates delays in decision-making, missed compliance deadlines, and operational inefficiencies. We seek an AI-powered document management system tailored for KMRL's operational context. The solution should automate ingestion (PDFs, emails, scanned documents), categorize documents intelligently, and enable natural language queries for instant access. Expected outcomes include reduced document retrieval time, improved compliance tracking, and data-driven insights from document analytics. Organization - KMRL Category - Software Domain Bucket - Smart Automation";

		console.log(`Test title length: ${testTitle.length} characters`);

		// Check if the title is being truncated somewhere
		const truncatedLength =
			'SMART INDIA HACKATHON 2025 1 KochiDocs Problem Statement ID – 25080 Pr'
				.length;
		console.log(`Truncated title length: ${truncatedLength} characters`);
		console.log('\nThis suggests titles might be truncated to ~71 characters');
	} catch (error) {
		console.error('\n❌ Test failed:', error);
	}
}

// Run the test
console.log('=====================================');
console.log('PDF Extraction Detailed Test');
console.log('=====================================\n');

testPdfExtraction()
	.then(() => {
		console.log('\n✅ Test completed!');
	})
	.catch(error => {
		console.error('\n❌ Test error:', error);
		process.exit(1);
	});
