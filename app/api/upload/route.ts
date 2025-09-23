export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';

type DocType = 'html' | 'text' | 'pdf' | 'doc' | 'image';
interface DocumentToUpload {
  type: DocType;
  content: string; // plain text for text/html; base64 for pdf/doc/image
  filename: string;
  department?: string;
  documentType?: string;
  tags?: string[];
}

function isBase64String(s: string): boolean {
  // len must be multiple of 4, trailing '=' pads allowed
  if (!/^[-A-Za-z0-9+/=\s]+$/.test(s)) return false;
  try {
    Buffer.from(s.replace(/\s+/g, ''), 'base64');
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  // Require authenticated session to align with dashboard
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { documents?: DocumentToUpload[] };
    const docs = Array.isArray(body.documents) ? body.documents : [];
    if (docs.length === 0) {
      return NextResponse.json({ error: 'No documents provided' }, { status: 400 });
    }

    const allowed: DocType[] = ['html', 'text', 'pdf', 'doc', 'image'];
    const received = docs.map((d, idx) => {
      const type: DocType = allowed.includes(d.type) ? d.type : 'text';
      const filename = typeof d.filename === 'string' ? d.filename : `doc-${idx + 1}`;
      const content = typeof d.content === 'string' ? d.content : '';
      const contentLength = content.length;
      let base64Ok: boolean | undefined;
      // Very rough page estimation for phase 1 (no parsing): assume 1 page
      const pageCount = 1 as const;

      if (type === 'image' || type === 'pdf' || type === 'doc') {
        base64Ok = isBase64String(content);
      }

      const summary = {
        index: idx,
        filename,
        type,
        contentLength,
        isBase64: base64Ok,
        department: d.department ?? null,
        documentType: d.documentType ?? null,
        tags: Array.isArray(d.tags) ? d.tags.filter(Boolean) : [],
        pageCount,
      } as const;

      // Server-side log for quick visibility
      console.log(`[upload] ${summary.filename} | type=${summary.type} | pages=${summary.pageCount} | size=${summary.contentLength} chars`);

      return summary;
    });

    return NextResponse.json({ ok: true, count: received.length, received }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: 'Invalid request payload', details: e instanceof Error ? e.message : undefined },
      { status: 400 }
    );
  }
}
