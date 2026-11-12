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

## Phase 1–3 implementation status

This status reflects the current repository implementation. A screen or database
model is not considered a completed banking capability unless the complete
provider-backed workflow has been implemented and tested.

| Phase | Capability | Current status |
| --- | --- | --- |
| 1 — Core foundation | Registration, login, password reset, sessions, PostgreSQL/Prisma | Implemented; security hardening and full integration tests remain |
| 1 — Core foundation | Ledger and wallet balances | Ledger foundation exists; production reconciliation and independent review remain |
| 1 — Core foundation | Domestic transfers | Internal Nakconel-to-Nakconel transfer path only; external bank payouts disabled |
| 1 — Core foundation | Wallet funding | Disabled until verified provider settlement can safely credit the ledger |
| 1 — Core foundation | KYC | Submission is pending; real identity verification provider and review workflow are not connected |
| 2 — Business | Business profile, invoices, expenses, team records, analytics | Database-backed basic workflows implemented |
| 2 — Business | NGN Paystack collections | Test-mode only; production collections and settlement are not enabled |
| 2 — Business | Payment links and payroll | Disabled pending provider-backed payment and payout workflows |
| 3 — International | Currency list, indicative conversion display, country and bank directory | UI/catalogue only; entries and transfer support require official verification |
| 3 — International | FX rates and quote endpoint | Reference-rate estimate only; not a customer dealing rate or executable quote |
| 3 — International | Foreign-currency accounts and payouts | Not implemented; licensed provider and settlement partners required |

### Safety changes in the phase-1-3-completion branch

- Completed domestic transfers are restricted to active NGN accounts held by
  Nakconel users. An external bank account is not marked as paid or completed.
- Wallet top-ups no longer credit a balance when a provider is missing or
  unavailable.
- KYC submissions remain pending until an identity verification provider or
  authorized review confirms them.
- Signup now requires a single-use token issued after email OTP verification.
- OTP and reset-token generation use cryptographically secure random values.
- Production session and encryption secrets must be configured explicitly.
- International quote calculation awaits its asynchronous rate lookup and
  refuses to present fallback estimates as a current quote.
- Face-camera capture in signup is a selfie capture only; it is not biometric
  identity verification.

### Remaining work before Phases 1–3 can be called complete

**Phase 1**
- Complete automated tests for registration, OTP, password reset, session
  expiry, account ownership, ledger posting, reversals, concurrency and
  idempotency.
- Add durable distributed rate limiting and OTP attempt limits.
- Complete wallet funding with persistent pending records, verified provider
  callbacks, replay protection and atomic ledger posting.
- Complete account-number allocation with collision handling under concurrent
  registration.
- Complete KYC with a verified identity provider and manual review controls.
- Complete security review, database backup/restore drills and reconciliation.

**Phase 2**
- Finish invoice lifecycle, due dates, cancellation and concurrency-safe
  numbering.
- Complete payment-link lifecycle and public checkout only after provider
  verification and webhook reconciliation.
- Add payroll only through an authorized payout provider with approvals,
  limits and reconciliation.
- Add production settlement, refunds, disputes and business-level access
  controls.

**Phase 3**
- Replace indicative rates with a provider-backed, timestamped quote service
  that clearly distinguishes reference rates from executable customer rates.
- Implement real multi-currency account balances and ledger currency isolation.
- Verify every bank, digital bank and mobile-money directory entry against
  official regulator/provider records; directory inclusion does not imply
  payout support.
- Add account-name lookup, supported bank codes, corridor limits, fees,
  sanctions/compliance checks and provider-backed payout status.
- Keep all unverified corridors disabled until provider testing and approval
  are complete.

### Important production boundary

This repository is a software prototype, not a licensed bank. Do not accept or
hold customer funds, promise bank-account issuance, or enable real payouts
without the appropriate regulated financial institution, payment providers,
approvals, operational controls and independent security review. Never use
demo/mock providers to represent real settlement.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md).

Domains: identity, ledger, transfers, kyc, providers.

**Never commit `.env`** — it contains secrets.

## International payout integration preparation

A server-only Flutterwave sandbox adapter has been added at
`src/domains/international/flutterwave.ts`. It is deliberately not connected
to the customer transfer endpoint. The endpoint continues to return HTTP 503,
so no wallet is debited and no transfer is represented as paid.

The adapter refuses production mode and requires all three conditions:
`FLW_MODE=sandbox`, `FLW_TRANSFERS_ENABLED=true`, and a test secret beginning
with `FLWSECK_TEST-`. The enable flag is false by default. Never put provider
secrets in browser code or variables prefixed with `NEXT_PUBLIC_`.

Before even enabling sandbox tests, provider onboarding and Transfer API access
must be confirmed by the account owner. Destination bank fields and corridor
availability must be validated against the provider's current documentation.
Production payouts require separate legal/compliance approval, approved
business/provider access, webhook signature verification, reconciliation,
limits, fraud controls, and an independent security review. Do not switch
these safeguards off to make a test appear successful.
