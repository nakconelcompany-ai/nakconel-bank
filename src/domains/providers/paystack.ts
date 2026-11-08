import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const API_BASE = 'https://api.paystack.co';

const initializeResponseSchema = z.object({
  status: z.literal(true),
  data: z.object({
    authorization_url: z.string().url(),
    reference: z.string().min(1),
  }),
});

const verifyResponseSchema = z.object({
  status: z.literal(true),
  data: z.object({
    reference: z.string(),
    status: z.string(),
    amount: z.number().int().nonnegative(),
    currency: z.string(),
    customer: z.object({ email: z.string().email().optional().nullable() }).optional(),
  }),
});

export type PaystackTransaction = z.infer<typeof verifyResponseSchema>['data'];
type Fetcher = typeof fetch;

export class PaymentConfigurationError extends Error {}
export class PaystackRequestError extends Error {}

export class PaystackClient {
  constructor(
    private readonly secretKey: string,
    private readonly fetcher: Fetcher = fetch,
  ) {
    if (!secretKey.startsWith('sk_test_')) {
      throw new PaymentConfigurationError('Only Paystack test keys are allowed for this integration.');
    }
  }

  async initializeTransaction(input: {
    email: string;
    amountKobo: number;
    reference: string;
    callbackUrl: string;
  }) {
    if (!Number.isSafeInteger(input.amountKobo) || input.amountKobo <= 0) {
      throw new PaystackRequestError('Transaction amount must be a positive safe integer in kobo.');
    }
    if (!/^[a-zA-Z0-9.=-]+$/.test(input.reference) || input.reference.length > 100) {
      throw new PaystackRequestError('Transaction reference contains unsupported characters.');
    }

    const body = await this.request('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        amount: String(input.amountKobo),
        currency: 'NGN',
        reference: input.reference,
        callback_url: input.callbackUrl,
      }),
    });
    const parsed = initializeResponseSchema.safeParse(body);
    if (!parsed.success) throw new PaystackRequestError('Paystack returned an invalid initialization response.');
    if (parsed.data.data.reference !== input.reference) {
      throw new PaystackRequestError('Paystack returned a mismatched transaction reference.');
    }
    const checkoutUrl = new URL(parsed.data.data.authorization_url);
    if (checkoutUrl.protocol !== 'https:' || checkoutUrl.hostname !== 'checkout.paystack.com') {
      throw new PaystackRequestError('Paystack returned an untrusted checkout URL.');
    }
    return {
      authorizationUrl: checkoutUrl.toString(),
      reference: parsed.data.data.reference,
    };
  }

  async verifyTransaction(reference: string): Promise<PaystackTransaction> {
    const body = await this.request(`/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
    });
    const parsed = verifyResponseSchema.safeParse(body);
    if (!parsed.success) throw new PaystackRequestError('Paystack returned an invalid verification response.');
    return parsed.data.data;
  }

  verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    if (!signature || !/^[a-f\d]{128}$/i.test(signature)) return false;
    const expected = createHmac('sha512', this.secretKey).update(rawBody).digest();
    const actual = Buffer.from(signature, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private async request(path: string, init: RequestInit) {
    let response: Response;
    try {
      response = await this.fetcher(`${API_BASE}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
          ...init.headers,
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new PaystackRequestError('Could not reach Paystack. Please retry the request.');
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new PaystackRequestError('Paystack returned an invalid response.');
    }

    if (!response.ok) {
      throw new PaystackRequestError(`Paystack request failed with HTTP ${response.status}.`);
    }
    return body;
  }
}

export function getPaystackTestClient(): PaystackClient {
  if (process.env.PAYMENTS_ENABLED !== 'true' || process.env.PAYSTACK_MODE !== 'test') {
    throw new PaymentConfigurationError('Paystack test collections are not enabled for this environment.');
  }
  if (
    process.env.VERCEL_ENV === 'production' ||
    (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview')
  ) {
    throw new PaymentConfigurationError('Paystack test collections cannot run in the production environment.');
  }
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new PaymentConfigurationError('PAYSTACK_SECRET_KEY is not configured.');
  return new PaystackClient(secretKey);
}

export function getPaymentCallbackUrl() {
  const configuredUrl = process.env.APP_URL;
  if (configuredUrl) {
    let appUrl: URL;
    try {
      appUrl = new URL(configuredUrl);
    } catch {
      throw new PaymentConfigurationError('APP_URL must be a valid absolute URL.');
    }
    if (
      (appUrl.protocol !== 'https:' && appUrl.protocol !== 'http:') ||
      appUrl.username ||
      appUrl.password
    ) {
      throw new PaymentConfigurationError('APP_URL must use HTTP or HTTPS and cannot include credentials.');
    }
    if (process.env.NODE_ENV === 'production' && appUrl.protocol !== 'https:') {
      throw new PaymentConfigurationError('APP_URL must use HTTPS in deployed environments.');
    }
    return new URL('/api/v1/business/collections/callback', appUrl).toString();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new PaymentConfigurationError('APP_URL must be configured for deployed payment callbacks.');
  }
  return 'http://localhost:3000/api/v1/business/collections/callback';
}
