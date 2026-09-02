export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

/**
 * DISABLED: Experimental scratch test endpoint.
 * User management operations live at /api/users.
 */
export async function GET() {
	return NextResponse.json(
		{
			error: 'Endpoint disabled.',
			message: 'User management operations live at /api/users.'
		},
		{ status: 410 }
	);
}

export async function POST() {
	return NextResponse.json(
		{
			error: 'Endpoint disabled.',
			message: 'User management operations live at /api/users.'
		},
		{ status: 410 }
	);
}
