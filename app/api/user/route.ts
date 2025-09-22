import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';

interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

interface ProcessedContent {
  textPart: {
    text: string;
  };
  imageParts: ImagePart[];
}

// Function to validate and clean base64 data
function validateBase64(base64String: string): string {
  // Remove any whitespace, newlines, and URL encoding artifacts
  let cleaned = base64String.replace(/\s+/g, '');
  
  // Handle URL encoding issues - replace + with %2B and / with %2F if they were double-encoded
  cleaned = cleaned.replace(/%2B/g, '+').replace(/%2F/g, '/');
  
  console.log("Original base64 length:", base64String.length);
  console.log("Cleaned base64 length:", cleaned.length);
  console.log("First 50 chars of cleaned base64:", cleaned.substring(0, 50));
  
  // Validate base64 format
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(cleaned)) {
    console.error("Invalid base64 format. String:", cleaned.substring(0, 100));
    throw new Error(`Invalid base64 format: ${cleaned.substring(0, 50)}...`);
  }
  
  return cleaned;
}

// Function to extract images from HTML and convert to base64
async function extractImagesFromHTML(htmlContent: string): Promise<ProcessedContent> {
  const imageParts: ImagePart[] = [];
  let processedHTML = htmlContent;

  // Regex to find img tags with src attributes
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const matches = [...htmlContent.matchAll(imgRegex)];

  for (const match of matches) {
    const imgTag = match[0];
    const srcUrl = match[1];

    try {
      let base64Data: string;
      let mimeType: string;

      if (srcUrl.startsWith('data:')) {
        // Handle data URLs (already base64)
        const dataUrlMatch = srcUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (dataUrlMatch) {
          mimeType = dataUrlMatch[1];
          const rawBase64 = dataUrlMatch[2];
          
          // Validate and clean the base64 data
          base64Data = validateBase64(rawBase64);
          
          // Test if we can decode it
          try {
            Buffer.from(base64Data, 'base64');
          } catch {
            console.error(`Invalid base64 data for image: ${srcUrl.substring(0, 50)}...`);
            continue;
          }
        } else {
          console.error(`Invalid data URL format: ${srcUrl.substring(0, 50)}...`);
          continue;
        }
      } else {
        // Handle HTTP/HTTPS URLs
        try {
          const response = await fetch(srcUrl);
          if (!response.ok) {
            console.error(`Failed to fetch image: ${srcUrl} - Status: ${response.status}`);
            continue;
          }

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          base64Data = buffer.toString('base64');
          mimeType = response.headers.get('content-type') || 'image/jpeg';
        } catch (fetchError) {
          console.error(`Error fetching external image: ${srcUrl}`, fetchError);
          continue;
        }
      }

      // Final validation of base64 data before adding to parts
      if (base64Data && base64Data.length > 0) {
        imageParts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });

        // Remove the img tag from HTML to avoid duplication
        processedHTML = processedHTML.replace(imgTag, `[IMAGE_${imageParts.length}]`);
      }

    } catch (error) {
      console.error(`Failed to process image: ${srcUrl}`, error);
      // Keep original img tag if processing fails
    }
  }

  return {
    textPart: {
      text: processedHTML
    },
    imageParts
  };
}

export async function GET(request: NextRequest) {
  // Require authenticated session
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const htmlContent = searchParams.get('html');

    if (!htmlContent) {
      return NextResponse.json(
        { error: "HTML content is required. Pass it as 'html' query parameter." },
        { status: 400 }
      );
    }

    // Decode HTML content properly
    const decodedHtml = decodeURIComponent(htmlContent);
    console.log("Received HTML:", decodedHtml.substring(0, 200) + "...");

    // Extract images and process HTML
    const processedContent = await extractImagesFromHTML(decodedHtml);

    return NextResponse.json({
      success: true,
      ...processedContent
    });

  } catch (error) {
    console.error("Error in HTML image extractor:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}


export async function POST(request: NextRequest) {
  // Require authenticated session
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const { html } = body;

    if (!html) {
      return NextResponse.json(
        { error: "HTML content is required in request body." },
        { status: 400 }
      );
    }

    // Check if API key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Extract images and process HTML
    const processedContent = await extractImagesFromHTML(html);

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `You are an expert HTML analyzer. Given HTML content with embedded images, you will analyze the content and provide insights about the images.`;

    // Generate content using a single prompt
    const prompt = `${systemPrompt}\n\nAnalyze this HTML content and describe any images found: ${processedContent.textPart.text}`;
    const result = await model.generateContent(prompt as string);
    
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({
      success: true,
      extractedImages: processedContent.imageParts.length,
      processedHTML: processedContent.textPart.text,
      aiResponse: text,
      imageParts: processedContent.imageParts.map((part, index) => ({
        index: index + 1,
        mimeType: part.inlineData.mimeType,
        dataSize: part.inlineData.data.length
      }))
    });

  } catch (error) {
    console.error("Error in HTML image extractor:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
