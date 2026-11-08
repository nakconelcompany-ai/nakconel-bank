# Nakconel Bank

Nakconel Bank — Next.js + Prisma + PostgreSQL (Neon), with wallet, business,
and international-workspace screens.

## Quick start

```bash
cp .env.example .env   # set DATABASE_URL
npm install
npx prisma db push
npm run dev
```

Set `SESSION_SECRET` to a unique random value of at least 32 characters in each
deployed environment. Production login sessions use a signed, HTTP-only cookie
and expire after 12 hours. The development fallback is local-only; never use it
for a deployed environment.

`npm run build` does not change the database schema. Use `npm run db:push`
explicitly for local setup or controlled schema updates; do not run it against
Production as part of a Preview build.

Health: http://localhost:3000/api/v1/health

## Business demo

Choose **Explore business demo** on the welcome screen, or open **Explore
business demo** from Business Banking. The preview uses local sample records
only; changes reset when you leave it or reload, and simulated payments never
request or settle funds. The saved Business Banking workspace remains separate
from the demo.

## Phase 2 readiness

Business records are stored in PostgreSQL and business API requests are scoped
to the signed-in user. Nigeria/NGN Paystack collections have a test-mode
integration described below. Payment-link activation, payroll, international
collections, and production money movement remain disabled.

### Target country scope

The requested multi-provider target scope is the full International screen:

| Countries | Currency |
| --- | --- |
| Nigeria | NGN |
| Ghana | GHS |
| Kenya | KES |
| South Africa | ZAR |
| Rwanda | RWF |
| Uganda | UGX |
| United Kingdom | GBP |
| United States | USD |
| United Arab Emirates | AED |
| Saudi Arabia | SAR |
| Qatar | QAR |
| Germany, France, Netherlands, Ireland | EUR |

This is a product target, not a claim that collections, settlement, or payouts
are available in those markets. Provider coverage must be verified separately
for merchant onboarding, payer methods, settlement currencies, and payout
destinations. Integrate and test each country/provider route in stages; leave
unverified routes disabled.

### First test integration: Nigeria / NGN

The first payment integration is Paystack test mode for NGN collections only.
It is restricted to non-production environments and requires all of these
environment settings:

```env
APP_URL=https://your-preview-domain.example
PAYMENTS_ENABLED=true
PAYSTACK_MODE=test
PAYSTACK_SECRET_KEY=sk_test_...
```

For local development, set `APP_URL=http://localhost:3000`. Configure the
Paystack webhook endpoint as
`https://your-preview-domain.example/api/v1/webhooks/paystack`; Paystack signs
the raw webhook body with the test secret. Never put provider keys in client
code, commit them, or paste them into chat. Keep `PAYMENTS_ENABLED=false` in
production. The integration verifies transactions directly with Paystack before
marking a collection or invoice paid. It does not enable payroll payouts,
international collections, FX, or production money movement.

New collections default to `PENDING`; legacy collection and invoice provider
fields default to `UNVERIFIED`. Apply the schema update through the normal
controlled database setup process before testing against a database; the build
does not push schema changes automatically. Legacy collections are excluded
from verified totals, and historical invoices marked PAID display as
unverified. Review those records before relying on them as provider-verified
receipts.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md).

Domains: identity, ledger, transfers, kyc, providers.

**Never commit `.env`** — it contains secrets.
