import { handleCallback } from '@vercel/queue';
import { processJob, verifyJobDelivery } from '@/lib/ingest/jobs';
export const runtime = 'nodejs';
export const maxDuration = 300;
const handleDelivery = handleCallback(async (message: unknown, metadata) => {
  if (metadata.topicName !== 'document-ingest' || !verifyJobDelivery(message)) return;
  await processJob(message.id);
}, { retry: () => ({ afterSeconds: 60 }) });

export function POST(request: Request) {
  if (!process.env.VERCEL) return new Response(null, { status: 404 });
  return handleDelivery(request);
}
