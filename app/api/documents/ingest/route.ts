export const runtime = 'nodejs';
export const maxDuration = 300;
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession, buildDocumentAccessFilter, isDocumentAccessible } from '@/lib/auth';
import { getCollection } from '@/lib/mongo';
import { stripSummaryHeading } from '@/adapters/documentAdapter';
import { ingestDocuments, type IngestPayload } from '@/lib/ingest/handleIngest';
import type { DocumentRecord, DocumentNodeRecord } from '@/types/documents';

export async function POST(request: NextRequest) {
 const token = (await cookies()).get(AUTH_COOKIE)?.value;
 const session = token ? verifySession(token) : null;
 if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 try { return await ingestDocuments(session, await request.json() as IngestPayload); }
 catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
}

// GET endpoint to retrieve documents
export async function GET(request: NextRequest) {
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
		const query = searchParams.get('q')?.trim();
		const language = searchParams.get('language');
		const pageValue = Number(searchParams.get('page') || '0');
		const sizeValue = Number(searchParams.get('pageSize') || searchParams.get('limit') || '20');
		const page = Number.isSafeInteger(pageValue) && pageValue >= 0 ? pageValue : 0;
		const pageSize = Number.isSafeInteger(sizeValue) && sizeValue > 0 ? Math.min(sizeValue, 100) : 20;

		const docsCollection = await getCollection<DocumentRecord>();

		// 1. Single Document Retrieval
		if (documentId) {
			// The base64 original can be several MB; send it only when the client asks to open it.
			const withOriginal = searchParams.get('original') === '1';
			const document = await docsCollection.findOne(
				{ id: documentId },
				withOriginal ? {} : { projection: { 'raw.content': 0, 'raw.text': 0 } }
			);
			if (!document) {
				return NextResponse.json({ error: 'Document not found' }, { status: 404 });
			}

			// IDOR Security Check: enforce user department grants
			if (!isDocumentAccessible(session, document)) {
				return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
			}

			// Attach nodes from document_nodes collection
			try {
				const nodesCollection = await getCollection<DocumentNodeRecord>(
					process.env.MONGODB_NODES_COLLECTION || 'document_nodes'
				);
				const nodes = await nodesCollection
					.find({ docId: documentId })
					.sort({ order: 1 })
					.toArray();
				(document as any).nodes = nodes;
				if (!document.nodeCount) (document as any).nodeCount = nodes.length;
			} catch {}

			return NextResponse.json(document, { status: 200 });
		}

		// 2. Listing Documents with RBAC
		const accessFilter = buildDocumentAccessFilter(session, 'documents');
		const filter: Record<string, any> = { ...accessFilter };
		if (department && department !== 'All') filter['metadata.department'] = department;
		if (documentType && documentType !== 'All') filter['metadata.documentType'] = documentType.toLowerCase();
		if (query) {
			const literal = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			// Keep search separate from the access filter's $or so RBAC is preserved.
			filter.$and = [{ $or: ['title', 'fullSummary', 'searchableText', 'metadata.tags', 'metadata.department'].map(field => ({ [field]: { $regex: literal, $options: 'i' } })) }];
		}
		if (language && language !== 'All') {
			const codes: Record<string, string> = { English: 'en', Hindi: 'hi', Malayalam: 'ml', Tamil: 'ta' };
			filter.language = { $in: [language, codes[language] || language] };
		}

		const totalCount = await docsCollection.countDocuments(filter);
		const effectivePageSize = pageSize;
		const skip = Math.max(0, page) * Math.max(1, effectivePageSize);

		const documents = await docsCollection
			.find(filter, { projection: { raw: 0, nodes: 0, searchableText: 0, overallMd: 0 } })
			.sort({ 'metadata.createdAt': -1 })
			.skip(skip)
			.limit(effectivePageSize)
			.toArray();

		const summaries = documents.map(doc => ({
			id: doc.id,
			title: doc.title || 'Untitled',
			summary: stripSummaryHeading(doc.fullSummary || ''),
			language: doc.language,
			totalPages: doc.totalPages,
			nodeCount: doc.nodeCount || (Array.isArray(doc.nodes) ? doc.nodes.length : 0),
			createdAt: doc.metadata?.createdAt || null,
			department: doc.metadata?.department || null,
			documentType: doc.metadata?.documentType || null,
			tags: doc.metadata?.tags || []
		}));

		return NextResponse.json({
			documents: summaries,
			total: summaries.length,
			totalCount,
			page: isNaN(page) ? 0 : page,
			pageSize: effectivePageSize
		});
	} catch (error) {
		console.error('[ingest] Document retrieval error:', error);
		return NextResponse.json(
			{
				error: 'Failed to retrieve documents',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}
