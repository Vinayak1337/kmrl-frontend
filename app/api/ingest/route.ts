export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

/**
 * DISABLED: Obsolete writer incompatible with canonical document & chunk schema.
 * Canonical ingestion route: POST /api/documents/ingest
 */
export async function POST() {
	return NextResponse.json(
		{
			error: 'Endpoint disabled.',
			message: 'Please use POST /api/documents/ingest for canonical ingestion into DocSetu.'
		},
		{ status: 410 }
	);
}
