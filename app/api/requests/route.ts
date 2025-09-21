import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { sendDeploymentEmail } from '@/lib/email';

interface RequestPayload {
  organizationName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  role?: string;
  organizationSize?: string;
  documentVolume?: string;
  currentTools?: string;
  complianceFocus?: string;
  deploymentTimeline?: string;
  message?: string;
}

const EMAIL_REGEX = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const MAX_MESSAGE_LENGTH = 4000;

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as RequestPayload;

    const errors: string[] = [];

    if (!data.organizationName || typeof data.organizationName !== 'string' || !data.organizationName.trim()) {
      errors.push('organizationName is required');
    }

    if (!data.contactName || typeof data.contactName !== 'string' || !data.contactName.trim()) {
      errors.push('contactName is required');
    }

    if (!data.contactEmail || typeof data.contactEmail !== 'string' || !EMAIL_REGEX.test(data.contactEmail)) {
      errors.push('contactEmail must be a valid email');
    }

    if (!data.message || typeof data.message !== 'string' || !data.message.trim()) {
      errors.push('message is required');
    }

    if (data.message && data.message.length > MAX_MESSAGE_LENGTH) {
      errors.push(`message must be fewer than ${MAX_MESSAGE_LENGTH} characters`);
    }

    if (errors.length) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const result = await prisma.deploymentRequest.create({
      data: {
        organizationName: data.organizationName!.trim(),
        contactName: data.contactName!.trim(),
        contactEmail: data.contactEmail!.toLowerCase(),
        contactPhone: data.contactPhone?.trim() ?? null,
        role: data.role?.trim() ?? null,
        organizationSize: data.organizationSize?.trim() ?? null,
        documentVolume: data.documentVolume?.trim() ?? null,
        currentTools: data.currentTools?.trim() ?? null,
        complianceFocus: data.complianceFocus?.trim() ?? null,
        deploymentTimeline: data.deploymentTimeline?.trim() ?? null,
        message: data.message!.trim(),
      },
    });

    // Fire-and-forget email notification (do not block response)
    sendDeploymentEmail({
      id: result.id,
      organizationName: result.organizationName,
      contactName: result.contactName,
      contactEmail: result.contactEmail,
      contactPhone: result.contactPhone,
      role: result.role,
      organizationSize: result.organizationSize,
      documentVolume: result.documentVolume,
      currentTools: result.currentTools,
      complianceFocus: result.complianceFocus,
      deploymentTimeline: result.deploymentTimeline,
      message: result.message,
      status: result.status,
      createdAt: result.createdAt,
    }).catch((e) => console.error('Failed to send request email', e));

    return NextResponse.json(
      {
        requestId: result.id,
        status: 'submitted',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to submit deployment request', error);
    return NextResponse.json(
      { error: 'Unable to submit request right now. Please try again later.' },
      { status: 500 }
    );
  }
}
