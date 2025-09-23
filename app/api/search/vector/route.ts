export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';

function scoreTextMatch(query: string, text: string): number {
  const terms = new Set(query.toLowerCase().split(/\W+/).filter(Boolean));
  const body = (text || '').toLowerCase();
  const matches = Array.from(terms).filter((t) => body.includes(t)).length;
  return matches / Math.max(1, terms.size);
}

export async function POST(request: NextRequest) {
  // Authentication is optional for search (make it public for testing)
  // const token = (await cookies()).get(AUTH_COOKIE)?.value;
  // const session = token ? verifySession(token) : null;
  
  try {
    const body = await request.json();
    const { query, limit = 5, searchNodes = false, department, documentType } = body;
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    
    // Embeddings disabled: perform keyword scoring across stored text
    
    // Get collection
    const collection = await getCollection();
    
    // Build filter
    const filter: Record<string, unknown> = {};
    if (department) filter['metadata.department'] = department;
    if (documentType) filter['metadata.documentType'] = documentType;
    
    // For MongoDB Atlas Vector Search (if configured)
    // This would use the $vectorSearch operator
    // For now, we'll do client-side similarity search
    
    // Fetch documents
    const documents = await collection.find(filter).toArray();
    
    // Calculate similarities
    const results = [];
    
    if (searchNodes) {
      // Search at node level for more granular results
      for (const doc of (documents as unknown as Array<{ id: string; title: string; fullSummary: string; nodes?: Array<{ id?: string; summary?: string; content?: string; keyPoints?: string[]; actionableItems?: string[]; criticalFlags?: string[]; crossDepartments?: string[]; pageRange?: { start: number; end: number } }>; metadata?: { tags?: string[] } }>)) {
        if (!doc.nodes || !Array.isArray(doc.nodes)) continue;
        for (const node of doc.nodes) {
          const text = [
            node.summary,
            node.content,
            ...(node.keyPoints || []),
            ...(node.actionableItems || []),
            ...(node.criticalFlags || []),
            ...(node.crossDepartments || []),
            ...((doc.metadata?.tags as string[] | undefined) || []),
          ].join(' ');
          const similarity = scoreTextMatch(query, text);
          results.push({
            documentId: doc.id,
            documentTitle: doc.title,
            nodeId: node.id,
            nodeSummary: node.summary,
            keyPoints: node.keyPoints,
            actionableItems: node.actionableItems,
            tags: doc.metadata?.tags || [],
            pageRange: node.pageRange,
            similarity,
            type: 'node'
          });
        }
      }
    } else {
      // Search at document level
      for (const doc of (documents as unknown as Array<{ id: string; title: string; fullSummary: string; nodes?: Array<{ summary?: string }>; metadata?: { tags?: string[]; department?: string; documentType?: string; createdAt?: string } }>)) {
        const text = [
          doc.title,
          doc.fullSummary,
          ...((doc.metadata?.tags as string[] | undefined) || []),
          ...(doc.nodes || []).map((n: { summary?: string }) => n.summary),
        ].join(' ');
        const similarity = scoreTextMatch(query, text);
        results.push({
          documentId: doc.id,
          title: doc.title,
          summary: doc.fullSummary,
          nodeCount: doc.nodes?.length || 0,
          department: doc.metadata?.department,
          documentType: doc.metadata?.documentType,
          createdAt: doc.metadata?.createdAt,
          tags: doc.metadata?.tags || [],
          similarity,
          type: 'document'
        });
      }
    }
    
    // Sort by similarity and limit results
    results.sort((a, b) => b.similarity - a.similarity);
    const topResults = results.slice(0, limit);
    
    // Filter out low similarity scores
    const relevantResults = topResults.filter(r => r.similarity > 0);
    
    return NextResponse.json({
      query,
      resultsFound: relevantResults.length,
      searchType: searchNodes ? 'node-level' : 'document-level',
      results: relevantResults,
      message: relevantResults.length === 0 
        ? 'No relevant documents found. Try a different query.' 
        : `Found ${relevantResults.length} relevant results`
    });
    
  } catch (error) {
    console.error('Vector search error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to perform vector search',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for search status
export async function GET() {
  try {
    const collection = await getCollection();
    
    const totalDocs = await collection.countDocuments();
    return NextResponse.json({
      status: 'ready',
      stats: {
        totalDocuments: totalDocs
      },
      configuration: { mode: 'keyword' }
    });
    
  } catch (error) {
    console.error('Search status error:', error);
    return NextResponse.json(
      { error: 'Failed to get search status' },
      { status: 500 }
    );
  }
}
