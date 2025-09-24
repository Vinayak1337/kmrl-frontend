import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongo';
import type { DocumentRecord, DocumentNodeRecord } from '@/types/documents';

export async function GET() {
  try {
    // Check MongoDB connection
    let mongoStatus = 'disconnected';
    let documentCount = 0;
    // embeddings disabled
    let totalNodes = 0;
    let processedToday = 0;
    
    try {
      const collection = await getCollection<DocumentRecord>();
      documentCount = await collection.countDocuments();
      
      // Get sample document structure
      const sampleDoc = await collection.findOne({});
      
      // Count total nodes across all documents (node collection)
      const nodeCollection = await getCollection<DocumentNodeRecord>(process.env.MONGODB_NODES_COLLECTION || 'document_nodes');
      totalNodes = await nodeCollection.countDocuments();
      
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
          nodeCount: (sampleDoc as any).nodeCount || sampleDoc.nodes?.length || 0,
          hasEmbedding: false,
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
