import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';

export async function GET() {
  try {
    // Check MongoDB connection
    let mongoStatus = 'disconnected';
    let documentCount = 0;
    // embeddings disabled
    let totalNodes = 0;
    let processedToday = 0;
    
    try {
      const collection = await getCollection();
      documentCount = await collection.countDocuments();
      
      // Get sample document structure
      const sampleDoc = await collection.findOne({});
      
      // Count total nodes across all documents
      const pipeline = [
        { $project: { nodeCount: { $size: { $ifNull: ['$nodes', []] } } } },
        { $group: { _id: null, total: { $sum: '$nodeCount' } } }
      ];
      
      const nodeCountResult = await collection.aggregate(pipeline).toArray();
      totalNodes = nodeCountResult[0]?.total || 0;
      
      // Count documents processed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      processedToday = await collection.countDocuments({
        'metadata.createdAt': { $gte: today }
      });
      
      mongoStatus = 'connected';
      
      return NextResponse.json({
        status: 'operational',
        timestamp: new Date().toISOString(),
        services: {
          mongodb: {
            status: mongoStatus,
            stats: {
              totalDocuments: documentCount,
              totalNodes: totalNodes,
              processedToday: processedToday,
              pendingReview: 0,
              alerts: 0
            }
          },
          ai: {
            gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not configured'
          },
          vectorDatabase: {
            type: 'MongoDB (keyword)',
            status: 'active'
          }
        },
        capabilities: {
          ingestion: {
            formats: ['html', 'text', 'image', 'pdf', 'doc'],
            status: 'active'
          },
          processing: {
            summarization: 'active',
            linkedListStructure: 'active',
            contextAwareGrouping: 'active'
          },
          embeddings: { status: 'disabled' },
          search: {
            vectorSearch: 'disabled',
            semanticSearch: 'active'
          }
        },
        sampleDocument: sampleDoc ? {
          hasNodes: Array.isArray(sampleDoc.nodes) && sampleDoc.nodes.length > 0,
          nodeCount: sampleDoc.nodes?.length || 0,
          hasEmbedding: !!sampleDoc.embedding,
          structure: {
            id: !!sampleDoc.id,
            title: !!sampleDoc.title,
            nodes: !!sampleDoc.nodes,
            fullSummary: !!sampleDoc.fullSummary,
            metadata: !!sampleDoc.metadata
          }
        } : null
      });
      
    } catch (dbError) {
      console.error('MongoDB connection error:', dbError);
      
      return NextResponse.json({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        services: {
          mongodb: {
            status: 'error',
            error: dbError instanceof Error ? dbError.message : 'Unknown error'
          }
        }
      }, { status: 503 });
    }
    
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
