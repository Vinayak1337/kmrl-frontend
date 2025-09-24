// app/api/translate/route.ts (for App Router)
import { NextRequest, NextResponse } from 'next/server';

// Lecto AI configuration
const LECTO_AI_API_KEY = process.env.LECTO_AI_API_KEY;
const LECTO_AI_BASE_URL = 'https://api.lecto.ai/v1/translate';

interface TranslateRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

interface LectoAIResponse {
  translatedText: string;
  translation: string;
  source_language: string;
  target_language: string;
  success?: boolean;
}

export async function POST(request: NextRequest) {
  console.log('Translation API called');
  
  try {
    const requestBody = await request.json();
    console.log('Request body:', requestBody);
    
    const { text, targetLanguage, sourceLanguage = 'en' }: TranslateRequest = requestBody;

    // Validate input
    if (!text || !targetLanguage) {
      console.error('Missing required fields:', { text: !!text, targetLanguage });
      return NextResponse.json(
        { error: 'Missing required fields: text and targetLanguage' },
        { status: 400 }
      );
    }

    // Normalize incoming language identifiers to ISO-like short codes and map to Lecto's expected values
    const normalize = (lang: string) => {
      if (!lang) return '';
      const l = lang.toLowerCase().trim();
      if (['hi', 'hindi'].includes(l)) return 'hi';
      if (['ml', 'malayalam'].includes(l)) return 'ml';
      if (['en', 'english'].includes(l)) return 'en';
      return l;
    };

    const languageMap: { [key: string]: string } = {
      'hi': 'hindi',
      'ml': 'malayalam',
      'en': 'english'
    };

    const sourceLangNorm = normalize(sourceLanguage);
    const targetLangNorm = normalize(targetLanguage);

    const sourceLang = languageMap[sourceLangNorm] || sourceLangNorm || 'english';
    const targetLang = languageMap[targetLangNorm] || targetLangNorm || 'english';

    console.log('Language mapping:', { sourceLanguage, targetLanguage, sourceLang, targetLang });

    // Check if API key is available. If missing in development, return a safe mocked translation so UI can try again.
    if (!LECTO_AI_API_KEY) {
      console.error('LECTO_AI_API_KEY not found in environment');
      if (process.env.NODE_ENV !== 'production') {
        // Return a predictable mock translation for dev/test so the front-end can continue working
        const mock = `[[MOCK TRANSLATION to ${targetLang}]]\n` + text.split('\n').slice(0, 20).join('\n');
        return NextResponse.json({ translatedText: mock, sourceLanguage: sourceLang, targetLanguage: targetLang, success: true });
      }

      return NextResponse.json(
        { error: 'Translation service not configured properly' },
        { status: 500 }
      );
    }

    console.log('Making request to Lecto AI:', LECTO_AI_BASE_URL);
    console.log('API Key present:', !!LECTO_AI_API_KEY);
    console.log('Text length:', text.length);

    // Lecto AI API call
    const lectoRequest = {
      text: text,
      from: sourceLang,
      to: targetLang,
    };
    
    console.log('Lecto AI request payload:', lectoRequest);

    const response = await fetch(LECTO_AI_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LECTO_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lectoRequest),
    });

    console.log('Lecto AI response status:', response.status, response.statusText);

    const responseText = await response.text();
    console.log('Lecto AI response text:', responseText);

    if (!response.ok) {
      console.error('Lecto AI API error:', {
        status: response.status,
        statusText: response.statusText,
        responseText
      });
      
      return NextResponse.json(
        { 
          error: `Translation service error: ${response.status} - ${response.statusText}`,
          details: responseText,
          lectoRequest
        },
        { status: response.status }
      );
    }

    // Parse response and handle a few possible shapes
    let data: any;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed Lecto AI response:', data);
    } catch (parseError) {
      console.error('Failed to parse Lecto AI response as JSON:', parseError);
      return NextResponse.json(
        {
          error: 'Invalid response from translation service',
          details: responseText,
        },
        { status: 500 }
      );
    }

    // If the service explicitly reports failure
    if (data && (data.success === false || data.error)) {
      console.error('Lecto AI reported failure:', data);
      return NextResponse.json({ error: 'Translation failed', details: data }, { status: 400 });
    }

    // Try multiple fields to find translated text
    const translatedText = (data && (data.translation || data.translatedText || data.translated || data.result)) || '';

    if (!translatedText) {
      console.warn('No translated text found in Lecto AI response:', data);
      return NextResponse.json(
        {
          error: 'No translation returned from service',
          details: data,
          lectoRequest,
        },
        { status: 502 }
      );
    }

    const result = {
      translatedText,
      sourceLanguage: (data && (data.source_language || data.from)) || sourceLang,
      targetLanguage: (data && (data.target_language || data.to)) || targetLang,
      success: data.success ?? true,
    };

    console.log('Returning successful translation:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Translation API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error during translation',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Alternative for Pages API (pages/api/translate.ts)
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, targetLanguage, sourceLanguage = 'en' } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required fields: text and targetLanguage' });
    }

    // Map language codes for Lecto AI
    const languageMap: { [key: string]: string } = {
      'hi': 'hindi',
      'ml': 'malayalam',
      'en': 'english'
    };

    const sourceLang = languageMap[sourceLanguage] || sourceLanguage;
    const targetLang = languageMap[targetLanguage] || targetLanguage;

    const response = await fetch(LECTO_AI_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LECTO_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        from: sourceLang,
        to: targetLang,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lecto AI API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `Translation service error: ${response.status}`,
        details: errorText 
      });
    }

    const data = await response.json();
    
    if (!data.success) {
      return res.status(400).json({ error: 'Translation failed', details: data });
    }

    return res.json({
      translatedText: data.translation,
      sourceLanguage: data.source_language,
      targetLanguage: data.target_language,
      success: data.success
    });

  } catch (error) {
    console.error('Translation API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error during translation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}