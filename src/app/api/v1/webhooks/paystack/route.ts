import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  BusinessCollectionError,
  verifyAndRecordPaystackCollection,
} from '@/domains/business/service';
import {
  getPaystackTestClient,
  PaymentConfigurationError,
  PaystackRequestError,
} from '@/domains/providers/paystack';

const webhookSchema = z.object({
  event: z.string(),
  data: z.object({ reference: z.string().regex(/^[a-zA-Z0-9.=-]{1,100}$/) }),
});

export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ success: false, error: 'Could not read webhook payload.' }, { status: 400 });
  }
  if (rawBody.length > 65_536) {
    return NextResponse.json({ success: false, error: 'Webhook payload is too large.' }, { status: 413 });
  }

  let paystack: ReturnType<typeof getPaystackTestClient>;
  try {
    paystack = getPaystackTestClient();
  } catch (error: unknown) {
    if (error instanceof PaymentConfigurationError) {
      return NextResponse.json({ success: false, error: 'Test payment webhook is not enabled.' }, { status: 503 });
    }
    throw error;
  }

  if (!paystack.verifyWebhookSignature(rawBody, request.headers.get('x-paystack-signature'))) {
    return NextResponse.json({ success: false, error: 'Invalid webhook signature.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid webhook JSON.' }, { status: 400 });
  }
  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid webhook payload.' }, { status: 400 });
  }

  if (parsed.data.event !== 'charge.success' && parsed.data.event !== 'charge.failed') {
    return NextResponse.json({ success: true, received: true });
  }

  try {
    const result = await verifyAndRecordPaystackCollection(parsed.data.data.reference);
    if (result.status === 'PENDING') {
      return NextResponse.json({ success: false, error: 'Transaction verification is still pending.' }, { status: 503 });
    }
    return NextResponse.json({ success: true, received: true });
  } catch (error: unknown) {
    if (error instanceof PaystackRequestError) {
      console.error('Paystack webhook verification failed:', error);
      return NextResponse.json({ success: false, error: 'Could not verify webhook transaction.' }, { status: 502 });
    }
    if (error instanceof BusinessCollectionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Paystack webhook processing failed:', error);
    return NextResponse.json({ success: false, error: 'Webhook processing failed.' }, { status: 500 });
  }
}
