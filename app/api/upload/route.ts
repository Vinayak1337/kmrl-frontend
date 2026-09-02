export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

/**
 * DEPRECATED: Replaced by canonical endpoint POST /api/documents/ingest
 */
export async function POST() {
	return NextResponse.json(
		{
			error: 'Endpoint deprecated.',
			message: 'Please use POST /api/documents/ingest for all document uploads.'
		},
		{ status: 410 }
	);
}

export async function GET() {
	return NextResponse.json(
		{
			error: 'Endpoint deprecated.',
			message: 'Please use GET /api/documents/ingest to retrieve documents.'
		},
		{ status: 410 }
	);
}
