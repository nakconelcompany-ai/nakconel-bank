import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  BusinessCollectionError,
  initializePaystackCollection,
  listCollections,
} from '@/domains/business/service';
import { PaymentConfigurationError, PaystackRequestError } from '@/domains/providers/paystack';
import { getAuthenticatedUserId } from '@/lib/session';

const createCollectionSchema = z.object({
  source: z.enum(['INVOICE', 'DIRECT']),
  sourceId: z.string().uuid().optional(),
  amount: z.number().positive().optional(),
  payerName: z.string().min(2).optional(),
  payerEmail: z.string().email().optional(),
}).superRefine((input, context) => {
  if (input.source === 'INVOICE' && !input.sourceId) {
    context.addIssue({ code: 'custom', message: 'An invoice is required.', path: ['sourceId'] });
  }
  if (input.source === 'DIRECT' && input.sourceId) {
    context.addIssue({ code: 'custom', message: 'Direct collections cannot include an invoice ID.', path: ['sourceId'] });
  }
  if (input.source === 'DIRECT' && (input.amount === undefined || !input.payerEmail)) {
    context.addIssue({ code: 'custom', message: 'Direct collections require an amount and payer email.' });
  }
});

export async function GET(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  try {
    const data = await listCollections(userId);
    return NextResponse.json({ success: true, phase: 2, data });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON request body.' }, { status: 400 });
  }
  const parsed = createCollectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid collection request.' }, { status: 400 });
  }

  try {
    const data = await initializePaystackCollection({
      userId,
      source: parsed.data.source,
      sourceId: parsed.data.sourceId,
      amountNaira: parsed.data.amount,
      payerName: parsed.data.payerName,
      payerEmail: parsed.data.payerEmail,
    });
    return NextResponse.json({ success: true, phase: 2, data }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof PaymentConfigurationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    }
    if (error instanceof PaystackRequestError) {
      console.error('Paystack collection initialization failed:', error);
      return NextResponse.json({ success: false, error: 'Payment provider is temporarily unavailable.' }, { status: 502 });
    }
    if (error instanceof BusinessCollectionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Collection initialization failed:', error);
    return NextResponse.json({ success: false, error: 'Could not create the collection. Please try again.' }, { status: 500 });
  }
}
