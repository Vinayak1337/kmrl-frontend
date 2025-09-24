export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';
import { getCollection, ensureDocumentIndexes } from '@/lib/mongo';
import { analyzeDocumentWithGemini, type AgentPage } from '@/lib/agent/geminiAgent';
import { extractPdfPagesFromBase64, extractPdfPagesWithImagesFromBase64 } from '@/lib/pdf';
import { prisma } from '@/lib/prisma';
import { buildManagerMdPrompt, type ManagerAnalysisJSON, type ManagerNodeJSON } from '@/lib/prompt';

// Types for document processing
type DocumentNode = {
  id: string;
  pageRange: { start: number; end: number };
  content: string;
  images: Array<{ page: number; base64: string; mimeType: string; caption?: string }>;
  topicSummary?: string;
  summary: string;
  // Markdown friendly fields for rendering
  summaryMd?: string;
  keyPointsMd?: string;
  actionsMd?: string;
  keyPoints: string[];
  actionableItems: string[];
  criticalFlags?: string[];
  crossDepartments?: string[];
  needsImage?: boolean;
  meta?: {
    slideType?: string;
    entities?: string[];
    decisions?: string[];
    deadlines?: string[];
    risks?: string[];
    stakeholders?: string[];
  };
  nextNodeId?: string;
  prevNodeId?: string;
};

type ProcessedDocument = {
  id: string;
  title: string;
  originalFormat: string;
  totalPages: number;
  language: string;
  nodes: DocumentNode[];
  fullSummary: string; // legacy plain summary
  overallMd?: string;  // executive MD summary
  metadata: {
    createdAt: Date;
    uploadedBy: string;
    department?: string;
    documentType?: string;
    tags?: string[];
    // optional classification flags
    inferred?: {
      department?: string | null;
      documentType?: string | null;
      source?: 'gemini' | 'rule' | 'manual';
    };
  };
  raw?: { type: string; content: string; text?: string };
};

type IngestRequest = {
  documents?: Array<{ type: 'pdf' | 'image' | 'text' | 'html' | 'doc'; content: string; filename?: string }>;
  html?: string;
  title?: string;
  department?: string;
  documentType?: string;
  tags?: string[];
  // Optional pre-parsed pages (client-provided), including images in base64
  pages?: Array<{ index: number; text?: string; images?: Array<{ base64: string; mimeType: string }> }>;
};

type DocumentInput = { type: 'pdf' | 'image' | 'text' | 'html' | 'doc'; content: string; filename?: string };

async function extractContentFromDocument(doc: DocumentInput): Promise<{ text: string; images: Array<{ base64: string; mimeType: string; page?: number }>; pageCount: number }> {
  switch (doc.type) {
    case 'html': {
      const htmlContent = doc.content;
      const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const images: Array<{ base64: string; mimeType: string }> = [];
      const imgRegex = /<img[^>]+src=\"data:([^;]+);base64,([^\"]+)\"/g;
      let match;
      while ((match = imgRegex.exec(htmlContent)) !== null) {
        images.push({ base64: match[2], mimeType: match[1] });
      }
      return { text: textContent, images, pageCount: 1 };
    }
    case 'text':
      return { text: doc.content, images: [], pageCount: 1 };
    case 'image':
      return { text: '', images: [{ base64: doc.content, mimeType: 'image/png' }], pageCount: 1 };
    case 'pdf': {
      try {
        const { pages, pageCount } = await extractPdfPagesFromBase64(doc.content);
        const text = pages.map((p) => `\n\n[Page ${p.index}] ${p.text}`).join(' ').trim();
        return { text, images: [], pageCount };
      } catch (e) {
        console.warn('PDF extraction failed; storing raw only', e);
        return { text: '', images: [], pageCount: 0 };
      }
    }
    case 'doc':
      console.warn(`Document type ${doc.type} requires additional processing libraries`);
      return { text: doc.content, images: [], pageCount: 1 };
    default:
      return { text: doc.content || '', images: [], pageCount: 1 };
  }
}

function mdToPlain(md?: string): string {
  if (!md) return '';
  return md
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/[*_`>]+/g, '') // formatting
    .replace(/^\s*[-*]\s+/gm, '• ') // bullets
    .replace(/\s+/g, ' ') // collapse
    .trim();
}

async function processDocumentWithAI(
  text: string,
  images: Array<{ base64: string; mimeType: string }>,
  apiKey: string,
  meta?: { department?: string; documentType?: string }
): Promise<{ nodes: Partial<DocumentNode>[]; fullSummary: string; overallMd?: string; documentType?: string; departments?: string[] }> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelCandidates = ['gemini-2.0-flash-exp', 'gemini-2.0-flash-001', 'gemini-1.5-flash'];
  let modelIndex = 0;
  let model = genAI.getGenerativeModel({ model: modelCandidates[modelIndex] });
  const prompt = buildManagerMdPrompt(meta);
  try {
    const contents = [{ role: 'user', parts: [{ text: prompt }, { text: `Document Content (raw text):\n${text}` }] }];
    const genConfig = { responseMimeType: 'application/json' as unknown as never };
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    let result: Awaited<ReturnType<typeof model.generateContent>> | undefined;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = await (model as any).generateContent({ contents, generationConfig: genConfig });
        break;
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        const overloaded = err?.status === 503 || /overloaded|unavailable/i.test(String(err?.message || ''));
        if (overloaded && attempt < 3) {
          // rotate model and backoff with jitter
          modelIndex = (modelIndex + 1) % modelCandidates.length;
          model = genAI.getGenerativeModel({ model: modelCandidates[modelIndex] });
          const backoff = 900 * Math.pow(2, attempt) + Math.floor(Math.random() * 250);
          await sleep(backoff);
          continue;
        }
        throw e;
      }
    }
    if (!result) {
      throw new Error('No response from generative model');
    }
    const responseText = result.response.text();
    try {
      const parsed = JSON.parse(responseText) as ManagerAnalysisJSON;
      const nodes = (Array.isArray(parsed.nodes) ? parsed.nodes : []).map((node: ManagerNodeJSON, index: number) => ({
        pageRange: node.pageRange || { start: index + 1, end: index + 1 },
        content: text.substring(
          Math.floor(((node.pageRange?.start || index + 1) - 1) * text.length / 10) || 0,
          Math.floor((node.pageRange?.end || index + 1) * text.length / 10) || text.length
        ),
        summary: (node.summaryMd || '').replace(/^#+\s*/gm, '').split('\n').slice(0, 2).join(' ').trim(),
        summaryMd: node.summaryMd || undefined,
        keyPointsMd: node.keyPointsMd || undefined,
        actionsMd: node.actionsMd || undefined,
        keyPoints: Array.isArray(node.keyPoints) ? node.keyPoints.map((kp) => String(kp).trim()).filter(Boolean) : [],
        actionableItems: Array.isArray(node.actionableItems)
          ? node.actionableItems.map((ai) => {
              if (typeof ai === 'string') return ai.trim();
              const owner = (ai.owner || '').trim();
              const act = (ai.action || '').trim();
              const due = (ai.due || '').trim();
              const imp = (ai.impact || '').trim();
              const parts = [owner ? `Owner: ${owner}` : '', act || '', due ? `Due: ${due}` : '', imp ? `Impact: ${imp}` : '']
                .filter(Boolean)
                .join(' — ');
              return parts || '';
            }).filter(Boolean)
          : [],
        criticalFlags: Array.isArray(node.criticalFlags) ? node.criticalFlags : [],
        crossDepartments: Array.isArray(node.crossDepartments) ? node.crossDepartments : [],
        needsImage: Boolean(node.needsImage),
      }));
      const overallMd = parsed.overallMd || '';
      const fullSummary = mdToPlain(overallMd).slice(0, 1000) || 'Document processed successfully';
      return { nodes, fullSummary, overallMd, documentType: parsed.documentType, departments: parsed.departments };
    } catch {
      return { nodes: [{ pageRange: { start: 1, end: 1 }, content: text, summary: responseText, keyPoints: [], actionableItems: [] }], fullSummary: responseText.substring(0, 500) };
    }
  } catch (error) {
    console.error('AI processing error:', error);
    return { nodes: [{ pageRange: { start: 1, end: 1 }, content: text, summary: 'AI unavailable; using raw content.', keyPoints: [], actionableItems: [] }], fullSummary: text.substring(0, 500) };
  }
}

async function createLinkedStructure(nodes: Partial<DocumentNode>[]): Promise<DocumentNode[]> {
  const linked: DocumentNode[] = [];
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
      nextNodeId: index < nodes.length - 1 ? `node-${index + 2}` : undefined,
      prevNodeId: index > 0 ? `node-${index}` : undefined,
    });
  }
  return linked;
}

function heuristicChunkNodes(text: string, opts?: { per?: number }): Partial<DocumentNode>[] {
  const per = Math.max(800, Math.min(3000, opts?.per || 1600));
  const chunks: string[] = [];
  const parts = text.split(/\n{2,}/g).map((p) => p.trim()).filter(Boolean);
  let buf = '';
  for (const p of parts) {
    if ((buf + '\n\n' + p).length > per && buf) { chunks.push(buf.trim()); buf = p; }
    else { buf = buf ? buf + '\n\n' + p : p; }
  }
  if (buf) chunks.push(buf.trim());
  if (chunks.length === 0) chunks.push(text.slice(0, per));
  return chunks.map((c, i) => ({ pageRange: { start: i + 1, end: i + 1 }, content: c, summary: c.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ').slice(0, 500), keyPoints: [], actionableItems: [] }));
}
export async function POST(request: NextRequest) {
  // Require authentication
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json() as IngestRequest;
    
    // Check for Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      );
    }
    
    // Ensure indexes exist (idempotent)
    await ensureDocumentIndexes();

    // Handle legacy single HTML document
    if (body.html && !body.documents) {
      body.documents = [{
        type: 'html',
        content: body.html,
        filename: body.title || 'untitled.html'
      }];
    }
    
    if (!body.documents || body.documents.length === 0) {
      return NextResponse.json(
        { error: 'No documents provided for ingestion' },
        { status: 400 }
      );
    }
    
    // Process all documents
    const processedDocuments: ProcessedDocument[] = [];

    for (const doc of body.documents) {
      // Extract content from document
      const { text, images, pageCount } = await extractContentFromDocument(doc);

      if (!text && images.length === 0 && doc.type !== 'pdf') {
        console.warn(`Document ${doc.filename} has no extractable content`);
        continue;
      }

      // Choose processing path
      let linkedNodes: DocumentNode[] = [];
      let overallSummary = '';
      let aiDocType: string | undefined;
      let aiDepartments: string[] | undefined;
      let aiOverallMd: string | undefined;

      if (doc.type === 'pdf') {
        // Extract pages once for robust fallback
        // Prefer server-side page images when available (requires 'canvas' dependency). Fallback to text-only if canvas not present.
        let limitedWithImages: Array<{ index: number; text: string; images: Array<{ base64: string; mimeType: string }> }> = [];
        try {
          const { pages: richPages } = await extractPdfPagesWithImagesFromBase64(doc.content, { scale: 2, imagesPerPage: 1 });
          limitedWithImages = richPages;
        } catch {
          const { pages } = await extractPdfPagesFromBase64(doc.content);
          limitedWithImages = pages.map((p) => ({ index: p.index, text: p.text, images: [] }));
        }
        const MAX_PAGES = Number(process.env.INGEST_MAX_PDF_PAGES || 40);
        const limited = limitedWithImages.slice(0, Math.max(1, MAX_PAGES));

        // Try agentic analysis first
        try {
          // Prefer client-provided page images/text if present
          const provided: Array<{ index: number; text?: string; images?: Array<{ base64: string; mimeType: string }> }>
            = Array.isArray((body as IngestRequest).pages) ? (body as IngestRequest).pages as Array<{ index: number; text?: string; images?: Array<{ base64: string; mimeType: string }> }> : [];
          const byIndex = new Map<number, { text?: string; images?: Array<{ base64: string; mimeType: string }> }>();
          provided.forEach((pg) => { byIndex.set(pg.index, { text: pg.text, images: Array.isArray(pg.images) ? pg.images : [] }); });

          const agentPages: AgentPage[] = limited.map((p) => {
            const override = byIndex.get(p.index);
            return {
              index: p.index,
              text: (override?.text || p.text || ''),
              images: (override?.images && override.images.length ? override.images : p.images)?.map((im) => ({ base64: im.base64, mimeType: im.mimeType })) || [],
            };
          });
          const agentResult = await analyzeDocumentWithGemini({ pages: agentPages, apiKey });
          const partial = agentResult.nodes.map((n) => ({
            pageRange: n.pageRange,
            content: n.content,
            summary: n.summary,
            summaryMd: (n as any).pageMd,
            keyPoints: n.keyPoints,
            actionableItems: n.actionableItems,
            meta: (n as any).meta,
            images: (n.images || []).map((im) => ({ page: n.pageRange.start, base64: im.base64, mimeType: im.mimeType })),
          }));
          linkedNodes = await createLinkedStructure(partial);
          overallSummary = agentResult.overallSummary || '';
          // If agent provided MD executive summary, store it
          if (agentResult.overallMd) {
            // Attach to processedDoc later via aiOverallMd variable
            aiOverallMd = agentResult.overallMd;
          }

          // If agent failed to properly structure (single node) but we have multiple pages, fallback to per-page nodes
          const agentBad = /agent timeout/i.test(overallSummary || '') || linkedNodes.length <= 1;
          if (agentBad && limited.length > 1) {
            const perPageNodes = limited.map((p) => ({
              pageRange: { start: p.index, end: p.index },
              content: p.text,
              summary: p.text.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ').slice(0, 500),
              keyPoints: [],
              actionableItems: [],
            }));
            linkedNodes = await createLinkedStructure(perPageNodes);
            overallSummary = text.slice(0, 600);
          }
        } catch (e) {
          console.warn('Gemini agent failed for PDF; falling back to summarization/per-page nodes', e);
          // If multiple pages, construct per-page nodes to retain navigation
          if (limited.length > 1) {
            const perPageNodes = limited.map((p) => ({
              pageRange: { start: p.index, end: p.index },
              content: p.text,
              summary: p.text.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ').slice(0, 500),
              keyPoints: [],
              actionableItems: [],
            }));
            linkedNodes = await createLinkedStructure(perPageNodes);
            overallSummary = text.slice(0, 600);
          } else {
            const aiResult = await processDocumentWithAI(text, images, apiKey, { department: body.department, documentType: body.documentType });
            linkedNodes = await createLinkedStructure(aiResult.nodes);
            overallSummary = aiResult.fullSummary;
            aiDocType = aiResult.documentType;
            aiDepartments = aiResult.departments;
            aiOverallMd = aiResult.overallMd;
            if (aiResult.overallMd) {
              // attach MD on document level if present
              // will be saved below in processedDoc
            }
          }
        }
      } else {
        // Default summarization + structuring
        const aiResult = await processDocumentWithAI(text, images, apiKey, { department: body.department, documentType: body.documentType });
        linkedNodes = await createLinkedStructure(aiResult.nodes);
        overallSummary = aiResult.fullSummary;
        aiDocType = aiResult.documentType;
        aiDepartments = aiResult.departments;
        aiOverallMd = aiResult.overallMd;
        if (linkedNodes.length <= 1 && (text?.length || 0) > 4000) {
          linkedNodes = await createLinkedStructure(heuristicChunkNodes(text, { per: 1800 }));
          overallSummary = (overallSummary || text).slice(0, 600);
        }
      }

      // Assign images to appropriate nodes based on page numbers (best-effort)
      if (images.length > 0 && linkedNodes.length > 0) {
        images.forEach((img, idx) => {
          const nodeIndex = Math.floor((idx * linkedNodes.length) / images.length);
          if (linkedNodes[nodeIndex]) {
            linkedNodes[nodeIndex].images.push({
              page: img.page || idx + 1,
              base64: img.base64,
              mimeType: img.mimeType,
              caption: `Image ${idx + 1}`,
            });
          }
        });
      }

      // Create processed document with raw storage
      // Determine classification (prefer user-input, else inferred)
      const chosenDepartment = body.department || (aiDepartments && aiDepartments[0]) || undefined;
      const chosenDocType = body.documentType || aiDocType || undefined;

      const processedDoc: ProcessedDocument = {
        id: `doc-${Date.now()}-${Buffer.from(doc.filename || 'doc').toString('base64').substring(0, 8)}`,
        title: doc.filename || body.title || 'Untitled Document',
        originalFormat: doc.type,
        totalPages: pageCount,
        language: 'en',
        nodes: linkedNodes,
        fullSummary: overallSummary,
        overallMd: aiOverallMd,
        metadata: {
          createdAt: new Date(),
          uploadedBy: session.sub,
          department: chosenDepartment,
          documentType: chosenDocType,
          tags: body.tags || [],
          inferred: (!body.department || !body.documentType) ? {
            department: body.department ? null : ((aiDepartments && aiDepartments[0]) || null),
            documentType: body.documentType ? null : (aiDocType || null),
            source: 'gemini',
          } : undefined,
        },
        raw: {
          type: doc.type,
          content: doc.content,
          text,
        },
      };

      processedDocuments.push(processedDoc);
    }
    
    // Store in MongoDB
    const collection = await getCollection<ProcessedDocument>();
    
    if (processedDocuments.length === 1) {
      // Single document
      const result = await collection.insertOne(processedDocuments[0]);
      // Audit log (best-effort)
      try {
        await prisma.userAudit.create({
          data: {
            actorId: session.sub,
            targetUserId: session.sub, // document is stored in Mongo; use actor again for linkage
            action: 'DOCUMENT_INGESTED',
            details: {
              documentId: processedDocuments[0].id,
              title: processedDocuments[0].title,
              nodeCount: processedDocuments[0].nodes.length,
              department: processedDocuments[0].metadata.department,
              documentType: processedDocuments[0].metadata.documentType,
            },
          },
        });
      } catch {}
      return NextResponse.json({
        success: true,
        documentId: result.insertedId.toString(),
        summary: processedDocuments[0].fullSummary,
        nodeCount: processedDocuments[0].nodes.length,
        documentType: processedDocuments[0].metadata.documentType,
        department: processedDocuments[0].metadata.department,
      }, { status: 201 });
    } else {
      // Multiple documents
      const result = await collection.insertMany(processedDocuments);
      return NextResponse.json({
        success: true,
        documentsProcessed: Object.keys(result.insertedIds).length,
        documentIds: Object.values(result.insertedIds).map(id => id.toString()),
        summaries: processedDocuments.map(d => ({
          id: d.id,
          title: d.title,
          summary: d.fullSummary,
          nodeCount: d.nodes.length,
          documentType: d.metadata.documentType,
          department: d.metadata.department,
        }))
      }, { status: 201 });
    }
    
  } catch (error) {
    console.error('Document ingestion error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to ingest documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve processed documents
export async function GET(request: NextRequest) {
  // Require authentication
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    const department = searchParams.get('department');
    const documentType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = parseInt(searchParams.get('pageSize') || '0');
    
    const collection = await getCollection<ProcessedDocument>();
    
    if (documentId) {
      // Retrieve specific document
      const document = await collection.findOne({ id: documentId });
      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      return NextResponse.json(document);
    }
    
    // Build query filter
    const filter: Record<string, unknown> = {};
    if (department) filter['metadata.department'] = department;
    if (documentType) filter['metadata.documentType'] = documentType;

    // Enforce permission-based visibility for MANAGER role
    if (session.role !== 'ADMIN') {
      const grants = Array.isArray(session.grants) ? session.grants : [];
      if (grants.length === 0) {
        // No access
        return NextResponse.json({ documents: [], total: 0, totalCount: 0, page: 0, pageSize: pageSize || limit });
      }
      const toTitle = (s: string) => s.toLowerCase().replace(/(^|[_\s-])(\w)/g, (_, p1, c) => (p1 ? ' ' : '') + c.toUpperCase());
      const or: Array<Record<string, string>> = [];
      grants
        .filter((g) => g.dept && g.type && Array.isArray((g as any).actions) && (g as any).actions.includes('read'))
        .forEach((g) => {
          const deptVariants = [g.dept, g.dept.toLowerCase(), toTitle(g.dept)];
          const typeVariants = [g.type, g.type.toLowerCase()];
          for (const dv of deptVariants) {
            for (const tv of typeVariants) {
              or.push({ 'metadata.department': dv, 'metadata.documentType': tv });
            }
          }
        });
      if (or.length > 0) {
        (filter as any)['$or'] = or;
      } else {
        return NextResponse.json({ documents: [], total: 0, totalCount: 0, page: 0, pageSize: pageSize || limit });
      }
    }
    
    // Count for pagination
    const totalCount = await collection.countDocuments(filter);
    
    // Retrieve multiple documents
    const cursor = collection
      .find(filter)
      .sort({ 'metadata.createdAt': -1 });
    if (pageSize > 0) {
      cursor.skip(Math.max(0, page) * Math.max(1, pageSize)).limit(Math.max(1, pageSize));
    } else {
      cursor.limit(limit);
    }
    const documents = await cursor.toArray();
    
    // Return summary view for list (defensive: handle partial/legacy docs)
    const summaries = documents.map((doc) => {
      const anyDoc = doc as unknown as { id?: string; _id?: { toString?: () => string }; title?: string; fullSummary?: string; nodes?: unknown[]; metadata?: { createdAt?: Date; department?: string; documentType?: string; tags?: string[] } };
      const nodes = Array.isArray(anyDoc?.nodes) ? (anyDoc.nodes as unknown[]) : [];
      const metadata = (anyDoc?.metadata ?? {}) as { createdAt?: Date; department?: string; documentType?: string; tags?: string[] };
      return {
        id: anyDoc?.id ?? anyDoc?._id?.toString?.() ?? '',
        title: anyDoc?.title ?? 'Untitled',
        summary: anyDoc?.fullSummary ?? '',
        nodeCount: nodes.length,
        createdAt: metadata.createdAt ?? null,
        department: metadata.department ?? null,
        documentType: metadata.documentType ?? null,
        tags: Array.isArray(metadata.tags) ? metadata.tags : [],
      };
    });
    
    return NextResponse.json({
      documents: summaries,
      total: summaries.length,
      totalCount,
      page: isNaN(page) ? 0 : page,
      pageSize: pageSize || limit,
    });
    
  } catch (error) {
    console.error('Document retrieval error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
