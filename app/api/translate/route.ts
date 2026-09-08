export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { generateJsonWithMuseSpark } from '@/lib/ai/opencodeZen';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession, buildDocumentAccessFilter } from '@/lib/auth';
import { getCollection } from '@/lib/mongo';
import type { DocumentNodeRecord } from '@/types/documents';

export async function POST(request: NextRequest) {
	const token = (await cookies()).get(AUTH_COOKIE)?.value;
	const session = token ? verifySession(token) : null;
	if (!session) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const targetLanguage = (body.language || '').trim();
		const docId: string | undefined = body.docId || undefined;
		const nodeId: string | undefined = body.nodeId || undefined;

		let summary: string = body.summary || '';
		let keyPoints: string[] = Array.isArray(body.keyPoints) ? body.keyPoints : [];
		let actionableItems: string[] = Array.isArray(body.actionableItems) ? body.actionableItems : [];

		if (!targetLanguage) {
			return NextResponse.json(
				{ error: 'Target language is required.' },
				{ status: 400 }
			);
		}

		// If docId or nodeId provided, fetch from real persisted chunk
		if (docId || nodeId) {
			const nodesColl = await getCollection<DocumentNodeRecord>(
				process.env.MONGODB_NODES_COLLECTION || 'document_nodes'
			);

			const accessFilter = buildDocumentAccessFilter(session, 'nodes');
			const filter: Record<string, any> = { ...accessFilter };
			if (docId) filter.docId = docId;
			if (nodeId) filter.nodeId = nodeId;

			const node = await nodesColl.findOne(filter);
			if (!node) {
				return NextResponse.json(
					{ error: 'Specified document section not found or access denied.' },
					{ status: 404 }
				);
			}

			summary = summary || node.summary || node.content.slice(0, 300);
			keyPoints = keyPoints.length > 0 ? keyPoints : node.keyPoints || [];
			actionableItems = actionableItems.length > 0 ? actionableItems : node.actionableItems || [];
		}

		if (!summary && keyPoints.length === 0 && actionableItems.length === 0) {
			return NextResponse.json(
				{ error: 'No content available to translate.' },
				{ status: 400 }
			);
		}

		const payload = {
			target_language: targetLanguage,
			summary,
			key_points: keyPoints,
			action_items: actionableItems
		};

		const instructions = [
			'You are an expert technical translator for DocSetu enterprise documents.',
			`Translate the provided content faithfully into ${targetLanguage}.`,
			'CRITICAL RULES:',
			'1) PRESERVE exact dates, deadlines, timestamps, and years (e.g. "January 15, 2026", "24 hours", "01:00 AM").',
			'2) PRESERVE all numerical values, financial figures, and currencies (e.g. "Rs. 50,000", "₹25 Lakhs", "16 tonnes").',
			'3) PRESERVE all technical parameters, limits, and units (e.g. "km/h", "tonnes", "RDSO", "CMRS").',
			'4) Return ONLY valid JSON matching this schema: {"summary": string, "keyPoints": string[], "actionableItems": string[]}.',
			'Do not include any commentary or code fences outside the JSON.'
		].join('\n');

		const translated = await generateJsonWithMuseSpark<{
			summary?: string;
			keyPoints?: string[];
			actionableItems?: string[];
		}>({
			instructions,
			input: `Target Language: ${targetLanguage}\nPayload to translate:\n${JSON.stringify(payload)}`
		});

		// Return translation as projection; never mutates stored database record
		return NextResponse.json(
			{
				success: true,
				language: targetLanguage,
				summary: translated.summary || summary,
				keyPoints: Array.isArray(translated.keyPoints) ? translated.keyPoints : keyPoints,
				actionableItems: Array.isArray(translated.actionableItems)
					? translated.actionableItems
					: actionableItems
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Translation error:', error);
		return NextResponse.json(
			{
				error: 'Translation request failed.',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}
