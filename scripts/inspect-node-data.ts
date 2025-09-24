import { getCollection } from '../lib/mongo';
import type { DocumentNodeRecord } from '../types/documents';

async function inspectNodeData() {
	console.log('🔍 Inspecting Node Data in MongoDB...\n');

	try {
		// Get the nodes collection
		const nodesCollection = await getCollection<DocumentNodeRecord>(
			process.env.MONGODB_NODES_COLLECTION || 'document_nodes'
		);

		// Find nodes with the specific docId pattern from your example
		const query = { docId: { $regex: '^doc-1758655' } };
		const nodes = await nodesCollection.find(query).limit(3).toArray();

		console.log(`Found ${nodes.length} nodes\n`);

		for (const node of nodes) {
			console.log('=== Node Details ===');
			console.log(`UID: ${node.uid}`);
			console.log(`Doc ID: ${node.docId}`);
			console.log(`Node ID: ${node.nodeId}`);
			console.log(`Order: ${node.order}`);
			console.log(`Page Range: ${node.pageRange.start}-${node.pageRange.end}`);

			// Check title
			const title = node.title || '';
			console.log(`\nTitle (length: ${title.length}):`);
			console.log(`"${title}"`);
			if (title.includes('…')) {
				console.log('⚠️ Title contains ellipsis character!');
			}

			// Check content
			console.log(`\nContent (length: ${node.content.length}):`);
			console.log(`First 200 chars: "${node.content.substring(0, 200)}"`);
			if (node.content.includes('…')) {
				const ellipsisIndex = node.content.indexOf('…');
				console.log(
					`⚠️ Content contains ellipsis at position ${ellipsisIndex}`
				);
				console.log(
					`Context: "${node.content.substring(
						Math.max(0, ellipsisIndex - 20),
						ellipsisIndex + 20
					)}"`
				);
			}

			// Check summary
			console.log(`\nSummary (length: ${node.summary.length}):`);
			console.log(`"${node.summary}"`);
			if (node.summary.includes('…')) {
				console.log('⚠️ Summary contains ellipsis!');
			}

			// Check arrays
			console.log(`\nArrays:`);
			console.log(`- keyPoints: ${node.keyPoints.length} items`);
			if (node.keyPoints.length > 0) {
				console.log(`  First item: "${node.keyPoints[0]}"`);
			}
			console.log(`- actionableItems: ${node.actionableItems.length} items`);
			if (node.actionableItems.length > 0) {
				console.log(`  First item: "${node.actionableItems[0]}"`);
			}
			console.log(`- criticalFlags: ${node.criticalFlags?.length || 0} items`);
			console.log(
				`- crossDepartments: ${node.crossDepartments?.length || 0} items`
			);

			// Check markdown fields
			console.log(`\nMarkdown fields:`);
			console.log(`- summaryMd: ${node.summaryMd ? 'Present' : 'null'}`);
			console.log(`- keyPointsMd: ${node.keyPointsMd ? 'Present' : 'null'}`);
			console.log(`- actionsMd: ${node.actionsMd ? 'Present' : 'null'}`);

			console.log('\n---\n');
		}

		// Also check if this is a display issue in MongoDB Compass
		console.log(
			'\n💡 Note: If you see ellipsis in MongoDB Compass but not in this output,'
		);
		console.log('   it might be Compass truncating display for readability.');

		// Test the problematic title directly
		console.log('\n\n=== Testing Specific Title ===');
		const testNode = await nodesCollection.findOne({
			title: {
				$regex: '^SMART INDIA HACKATHON 2025 1 KochiDocs Problem Statement ID'
			}
		});

		if (testNode) {
			console.log('Found node with SMART INDIA HACKATHON title:');
			const title = testNode.title || '';
			console.log(`Title length: ${title.length}`);
			console.log(`Full title: "${title}"`);
			console.log(`\nChecking character at position 70-71:`);
			for (let i = Math.max(0, 68); i < Math.min(title.length, 75); i++) {
				console.log(`${i}: ${title.charCodeAt(i)} (${title[i]})`);
			}
		}
	} catch (error) {
		console.error('Error:', error);
	} finally {
		process.exit(0);
	}
}

// Run the inspection
console.log('=====================================');
console.log('MongoDB Node Data Inspector');
console.log('=====================================\n');

inspectNodeData().catch(console.error);
