# Nakconel Bank

Phase 1 modular monolith — Next.js + Prisma + PostgreSQL (Neon).

## Quick start

```bash
cp .env.example .env   # set DATABASE_URL
npm install
npx prisma db push
npm run dev
```

Health: http://localhost:3000/api/v1/health

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md).

Domains: identity, ledger, transfers, kyc, providers.

**Never commit `.env`** — it contains secrets.
