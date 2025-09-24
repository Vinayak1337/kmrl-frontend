import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
	const token = (await cookies()).get(AUTH_COOKIE)?.value;
	const session = token ? verifySession(token) : null;
	if (!session) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const targetLanguage = (body.language || '').trim();
		const summary: string = body.summary || '';
		const keyPoints: string[] = Array.isArray(body.keyPoints)
			? body.keyPoints
			: [];
		const actionableItems: string[] = Array.isArray(body.actionableItems)
			? body.actionableItems
			: [];

		if (!targetLanguage) {
			return NextResponse.json(
				{ error: 'Target language is required.' },
				{ status: 400 }
			);
		}

		const geminiKey = process.env.GEMINI_API_KEY;
		if (!geminiKey) {
			return NextResponse.json(
				{
					error: 'Translation service unavailable. Gemini key not configured.'
				},
				{ status: 503 }
			);
		}

		const payload = {
			target_language: targetLanguage,
			summary,
			key_points: keyPoints,
			action_items: actionableItems
		};

		const prompt = [
			'You are an expert translator assisting Kochi Metro Rail Limited.',
			'Return a concise JSON object translating the provided fields into the specified language.',
			'Preserve bullet structures and keep responses factual.',
			'JSON schema:',
			'{',
			'  "summary": string,',
			'  "keyPoints": string[],',
			'  "actionableItems": string[]',
			'}',
			'Do not include any additional commentary or explanations.'
		].join('\n');

		const genAI = new GoogleGenerativeAI(geminiKey);
		const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
		const result = await model.generateContent({
			contents: [
				{
					role: 'user',
					parts: [
						{ text: prompt },
						{ text: `Target language: ${targetLanguage}` },
						{ text: JSON.stringify(payload) }
					]
				}
			]
		});

		const raw = result?.response?.text?.() || '';
		let translated: {
			summary: string;
			keyPoints: string[];
			actionableItems: string[];
		} | null = null;
		try {
			translated = JSON.parse(raw);
		} catch {
			const start = raw.indexOf('{');
			const end = raw.lastIndexOf('}');
			if (start >= 0 && end > start) {
				translated = JSON.parse(raw.slice(start, end + 1));
			}
		}

		if (!translated) {
			return NextResponse.json(
				{ error: 'Failed to translate content.' },
				{ status: 422 }
			);
		}

		return NextResponse.json({
			summary: translated.summary || '',
			keyPoints: Array.isArray(translated.keyPoints)
				? translated.keyPoints
				: [],
			actionableItems: Array.isArray(translated.actionableItems)
				? translated.actionableItems
				: []
		});
	} catch (error) {
		console.error('Translation error:', error);
		return NextResponse.json(
			{ error: 'Translation request failed.' },
			{ status: 500 }
		);
	}
}
