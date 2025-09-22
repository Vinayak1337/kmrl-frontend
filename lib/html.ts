export type ExtractedImage = {
  mimeType: string;
  alt: string | null;
  base64: string; // raw base64 payload without data URI prefix
  bytes: number; // approximate decoded size
};

export type ParsedHtml = {
  textContent: string;
  images: ExtractedImage[];
};

// Very lightweight HTML to text stripper (keeps spacing roughly)
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .replace(/\n\s*/g, "\n")
    .trim();
}

// Parse <img src="data:mime;base64,...." alt="..."> occurrences from the HTML string
export function extractBase64Images(html: string): ExtractedImage[] {
  const images: ExtractedImage[] = [];
  const imgTagRegex = /<img\b[^>]*>/gi;
  const srcRegex = /src\s*=\s*"([^"]+)"/i;
  const altRegex = /alt\s*=\s*"([^"]*)"/i;

  const tags = html.match(imgTagRegex) || [];
  for (const tag of tags) {
    const srcMatch = tag.match(srcRegex);
    if (!srcMatch) continue;
    const src = srcMatch[1];
    if (!src.startsWith("data:")) continue; // skip non-data URIs

    // data:[mime];base64,<payload>
    const dataUriMatch = src.match(/^data:([^;]+);base64,(.*)$/);
    if (!dataUriMatch) continue;
    const mimeType = dataUriMatch[1];
    const base64 = dataUriMatch[2];
    const altMatch = tag.match(altRegex);
    const alt = altMatch ? altMatch[1] : null;
    // Rough byte size estimate (each 4 base64 chars ~ 3 bytes)
    const bytes = Math.floor((base64.length * 3) / 4);
    images.push({ mimeType, alt, base64, bytes });
  }
  return images;
}

export function parseHtmlForIngestion(html: string): ParsedHtml {
  const textContent = stripHtml(html);
  const images = extractBase64Images(html);
  return { textContent, images };
}

