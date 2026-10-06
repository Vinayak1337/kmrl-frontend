import { generateText } from '@/lib/ai/generate';

const OCR_INSTRUCTIONS = [
  'You transcribe document images for a document management system.',
  'Transcribe all readable text exactly as written, in its original language and script (for example Malayalam, Hindi, Tamil or English). Do not translate.',
  'Keep reading order, headings and line breaks. Write table rows as cells separated by " | ".',
  'For form fields write "Label: value". Keep dates, numbers, reference numbers and email addresses exactly.',
  'Do not summarise, explain or add anything. If the image has no readable text, reply exactly NO_TEXT.',
].join('\n');

export function imageMimeType(base64: string): string {
  const bytes = base64.replace(/^data:[^,]+,/, '');
  if (bytes.startsWith('iVBORw0KGgo')) return 'image/png';
  if (bytes.startsWith('/9j/')) return 'image/jpeg';
  if (bytes.startsWith('UklGR')) return 'image/webp';
  if (bytes.startsWith('R0lGOD')) return 'image/gif';
  return 'image/png';
}

/** Text from one page image through the configured vision model; empty when nothing is readable. */
export async function transcribeImage(base64: string, mimeType = imageMimeType(base64)): Promise<string> {
  const result = await generateText({
    instructions: OCR_INSTRUCTIONS,
    input: 'Transcribe this page.',
    images: [{ base64: base64.replace(/^data:[^,]+,/, ''), mimeType }],
    timeoutMs: 90000,
  });
  const text = result.text.trim();
  return text === 'NO_TEXT' ? '' : text;
}
