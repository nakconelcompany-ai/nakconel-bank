import { NextRequest, NextResponse } from 'next/server';
import {
  BusinessCollectionError,
  verifyAndRecordPaystackCollection,
} from '@/domains/business/service';
import {
  getPaymentCallbackUrl,
  PaymentConfigurationError,
  PaystackRequestError,
} from '@/domains/providers/paystack';

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get('reference');
  if (!reference || !/^[a-zA-Z0-9.=-]{1,100}$/.test(reference)) {
    return NextResponse.json({ success: false, error: 'Payment reference is required.' }, { status: 400 });
  }

  try {
    const result = await verifyAndRecordPaystackCollection(reference);
    const destination = new URL(getPaymentCallbackUrl());
    destination.pathname = '/';
    destination.search = `payment=${result.status.toLowerCase()}`;
    return NextResponse.redirect(destination);
  } catch (error: unknown) {
    if (error instanceof PaymentConfigurationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    }
    if (error instanceof PaystackRequestError) {
      return NextResponse.json({ success: false, error: 'Could not verify payment with the provider.' }, { status: 502 });
    }
    if (error instanceof BusinessCollectionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Paystack callback verification failed:', error);
    return NextResponse.json({ success: false, error: 'Payment could not be verified.' }, { status: 500 });
  }
}
