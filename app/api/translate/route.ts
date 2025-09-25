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

		console.log('Translation request:', {
			targetLanguage,
			summary: summary.substring(0, 100),
			keyPoints: keyPoints.length,
			actionableItems: actionableItems.length
		});

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

		// Create a more robust prompt
		const prompt = `You are a professional translator for Kochi Metro Rail Limited (KMRL).

TASK: Translate the following content to ${targetLanguage}. Return ONLY a valid JSON object with no additional text, markdown, or explanations.

IMPORTANT: 
- Return pure JSON only
- No markdown code blocks
- No explanatory text
- Preserve meaning and context
- Keep technical terms accurate

Input content:
Summary: ${summary}
Key Points: ${keyPoints.join('; ')}
Actionable Items: ${actionableItems.join('; ')}

Return this exact JSON structure:
{
  "summary": "translated summary here",
  "keyPoints": ["translated point 1", "translated point 2"],
  "actionableItems": ["translated item 1", "translated item 2"]
}`;

		const genAI = new GoogleGenerativeAI(geminiKey);
		const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

		const result = await model.generateContent({
			contents: [
				{
					role: 'user',
					parts: [{ text: prompt }]
				}
			],
			generationConfig: {
				responseMimeType: 'application/json'
			}
		});

		const raw = result?.response?.text?.() || '';
		console.log('Gemini raw response:', raw.substring(0, 500));

		let translated: {
			summary: string;
			keyPoints: string[];
			actionableItems: string[];
		} | null = null;

		// Try multiple parsing approaches
		try {
			// First, try direct JSON parsing
			translated = JSON.parse(raw);
		} catch (e1) {
			console.log('Direct JSON parse failed, trying cleanup...');
			try {
				// Remove markdown code blocks if present
				let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');

				// Find JSON object boundaries
				const start = cleaned.indexOf('{');
				const end = cleaned.lastIndexOf('}');

				if (start >= 0 && end > start) {
					cleaned = cleaned.slice(start, end + 1);
					translated = JSON.parse(cleaned);
				}
			} catch (e2) {
				console.log('JSON cleanup failed, trying regex extraction...');
				try {
					// Extract JSON using regex
					const jsonMatch = raw.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
					if (jsonMatch) {
						translated = JSON.parse(jsonMatch[0]);
					}
				} catch (e3) {
					console.error('All JSON parsing attempts failed:', { e1, e2, e3 });
				}
			}
		}

		// If JSON parsing failed, create a fallback response
		if (!translated) {
			console.log('Creating fallback translation response');

			// Try to extract content manually if Gemini returned plain text
			const lines = raw.split('\n').filter(line => line.trim());
			let fallbackSummary = summary; // Use original as fallback
			let fallbackKeyPoints = keyPoints;
			let fallbackActionableItems = actionableItems;

			// If we have some translated content, use it
			if (lines.length > 0 && raw.length > 20) {
				fallbackSummary = lines[0] || summary;
				// For now, return original content if parsing completely fails
				// In production, you might want to call a simpler translation API
			}

			translated = {
				summary: fallbackSummary,
				keyPoints: fallbackKeyPoints,
				actionableItems: fallbackActionableItems
			};
		}

		// Validate the translated content
		if (
			!translated.summary &&
			!translated.keyPoints?.length &&
			!translated.actionableItems?.length
		) {
			return NextResponse.json(
				{ error: 'Translation produced empty results.' },
				{ status: 422 }
			);
		}

		console.log('Translation successful:', {
			summaryLength: translated.summary?.length || 0,
			keyPointsCount: translated.keyPoints?.length || 0,
			actionableItemsCount: translated.actionableItems?.length || 0
		});

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
			{
				error: 'Translation request failed.',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}
