import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getPaystackTestClient,
  PaymentConfigurationError,
  PaystackClient,
} from './paystack';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Paystack test client', () => {
  it('initializes an NGN transaction with a server-generated reference', async () => {
    let requestBody: Record<string, unknown> | undefined;
    const fetcher: typeof fetch = async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/example',
          reference: 'nak-col-test-reference',
        },
      });
    };
    const client = new PaystackClient('sk_test_fixture', fetcher);

    const result = await client.initializeTransaction({
      email: 'payer@example.test',
      amountKobo: 25000,
      reference: 'nak-col-test-reference',
      callbackUrl: 'https://bank.example/api/v1/business/collections/callback',
    });

    expect(result.authorizationUrl).toBe('https://checkout.paystack.com/example');
    expect(requestBody).toMatchObject({
      email: 'payer@example.test',
      amount: '25000',
      currency: 'NGN',
      reference: 'nak-col-test-reference',
    });
  });

  it('rejects a checkout URL outside Paystack', async () => {
    const fetcher: typeof fetch = async () => Response.json({
      status: true,
      data: {
        authorization_url: 'https://attacker.example/checkout',
        reference: 'nak-col-test-reference',
      },
    });
    const client = new PaystackClient('sk_test_fixture', fetcher);

    await expect(client.initializeTransaction({
      email: 'payer@example.test',
      amountKobo: 25000,
      reference: 'nak-col-test-reference',
      callbackUrl: 'https://bank.example/api/v1/business/collections/callback',
    })).rejects.toThrow('Paystack returned an untrusted checkout URL.');
  });

  it('verifies HMAC signatures against the exact raw webhook body', () => {
    const body = '{"event":"charge.success"}';
    const signature = createHmac('sha512', 'sk_test_fixture').update(body).digest('hex');
    const client = new PaystackClient('sk_test_fixture');

    expect(client.verifyWebhookSignature(body, signature)).toBe(true);
    expect(client.verifyWebhookSignature(`${body} `, signature)).toBe(false);
    expect(client.verifyWebhookSignature(body, null)).toBe(false);
  });

  it('allows only explicitly enabled test keys outside production', () => {
    vi.stubEnv('PAYMENTS_ENABLED', 'true');
    vi.stubEnv('PAYSTACK_MODE', 'test');
    vi.stubEnv('PAYSTACK_SECRET_KEY', 'sk_test_fixture');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('NODE_ENV', 'production');

    expect(getPaystackTestClient()).toBeInstanceOf(PaystackClient);

    vi.stubEnv('VERCEL_ENV', 'production');
    expect(() => getPaystackTestClient()).toThrow(PaymentConfigurationError);
  });
});
