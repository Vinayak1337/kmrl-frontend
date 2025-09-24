import { promises as fs } from 'fs';
import { extractPdfPagesFromBase64 } from '../lib/pdf';
import * as path from 'path';

// Test the content extraction logic that's causing truncation
function testContentExtraction(
	text: string,
	pageStart: number,
	pageEnd: number
) {
	// This is the logic from processDocumentWithAI in ingest/route.ts
	const start = Math.floor(((pageStart - 1) * text.length) / 10) || 0;
	const end = Math.floor((pageEnd * text.length) / 10) || text.length;

	console.log(`\nPage range: ${pageStart}-${pageEnd}`);
	console.log(`Total text length: ${text.length}`);
	console.log(
		`Start index: ${start} (${(((pageStart - 1) * text.length) / 10).toFixed(
			2
		)})`
	);
	console.log(
		`End index: ${end} (${((pageEnd * text.length) / 10).toFixed(2)})`
	);
	console.log(`Extracted length: ${end - start}`);
	console.log(
		`Percentage of total: ${(((end - start) / text.length) * 100).toFixed(2)}%`
	);

	const extracted = text.substring(start, end);
	console.log(`Preview: "${extracted.substring(0, 100)}..."`);

	return extracted;
}

async function testPdfParsing() {
	console.log('🚀 Testing PDF parsing logic...\n');

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

		// Combine all text
		const fullText = pages.map(p => p.text).join('\n\n');
		console.log(`Total text length: ${fullText.length} characters\n`);

		// Show the problematic content extraction logic
		console.log('❌ PROBLEM IDENTIFIED: Content extraction divides by 10!\n');
		console.log('The current logic in processDocumentWithAI does:');
		console.log('start = Math.floor(((pageStart - 1) * text.length / 10))');
		console.log('end = Math.floor((pageEnd * text.length / 10))\n');
		console.log('This means:');
		console.log('- Page 1-1 extracts only 10% of the text (0-10%)');
		console.log('- Page 1-3 extracts only 30% of the text (0-30%)');
		console.log('- Page 2-4 extracts only 20% of the text (10-40%)');
		console.log('\nThis is why content is being truncated!\n');

		// Test the extraction logic
		console.log('=== Testing current (broken) extraction logic ===');
		testContentExtraction(fullText, 1, 1);
		testContentExtraction(fullText, 1, 3);
		testContentExtraction(fullText, 2, 4);

		// Show what the correct logic should be
		console.log('\n\n=== Correct extraction logic should be ===');
		console.log('For page-based extraction from combined text:');
		console.log(
			'1. Calculate text per page: textPerPage = text.length / totalPages'
		);
		console.log('2. start = (pageStart - 1) * textPerPage');
		console.log('3. end = pageEnd * textPerPage');

		const textPerPage = fullText.length / pageCount;
		console.log(`\nWith ${pageCount} pages and ${fullText.length} chars:`);
		console.log(`Text per page: ${textPerPage.toFixed(0)} characters`);

		// Test correct extraction
		function correctExtraction(
			text: string,
			pageStart: number,
			pageEnd: number,
			totalPages: number
		) {
			const textPerPage = text.length / totalPages;
			const start = Math.floor((pageStart - 1) * textPerPage);
			const end = Math.min(text.length, Math.floor(pageEnd * textPerPage));

			console.log(`\nPage range: ${pageStart}-${pageEnd}`);
			console.log(`Start: ${start}, End: ${end}, Length: ${end - start}`);
			const extracted = text.substring(start, end);
			console.log(`Preview: "${extracted.substring(0, 100)}..."`);
			return extracted;
		}

		console.log('\n=== Testing correct extraction logic ===');
		correctExtraction(fullText, 1, 1, pageCount);
		correctExtraction(fullText, 1, 3, pageCount);
		correctExtraction(fullText, 2, 4, pageCount);

		// Check for truncated content in the data
		console.log('\n\n=== Checking for truncation patterns ===');
		for (let i = 0; i < Math.min(3, pages.length); i++) {
			const page = pages[i];
			console.log(`\nPage ${page.index}:`);
			console.log(`Text length: ${page.text.length}`);

			// Check if text contains ellipsis or truncation
			if (page.text.includes('…')) {
				console.log('⚠️ Contains ellipsis character (…)');
				const ellipsisIndex = page.text.indexOf('…');
				console.log(
					`Found at position ${ellipsisIndex}: "${page.text.substring(
						Math.max(0, ellipsisIndex - 20),
						ellipsisIndex + 20
					)}"`
				);
			}

			// Show last 100 chars to check for truncation
			console.log(
				`End of text: "...${page.text.substring(page.text.length - 100)}"`
			);
		}
	} catch (error) {
		console.error('\n❌ Test failed:', error);
	}
}

// Run the test
console.log('=====================================');
console.log('PDF Parsing Logic Debug Test');
console.log('=====================================\n');

testPdfParsing()
	.then(() => {
		console.log('\n✅ Test completed!');
	})
	.catch(error => {
		console.error('\n❌ Test error:', error);
		process.exit(1);
	});
