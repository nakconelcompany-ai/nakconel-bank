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

Health: http://localhost:3000/api/v1/health

## Business demo

Choose **Explore business demo** on the welcome screen, or open **Explore
business demo** from Business Banking. The preview uses local sample records
only; changes reset when you leave it or reload, and simulated payments never
request or settle funds. The saved Business Banking workspace remains separate
from the demo.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md).

Domains: identity, ledger, transfers, kyc, providers.

**Never commit `.env`** — it contains secrets.
