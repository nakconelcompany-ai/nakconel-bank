# Nakconel — Phase 1 Production Architecture

## Principle
Modular monolith first. Next.js is the presentation layer. Business logic lives in domain services.

## Built

### APIs
- GET /api/v1/health
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/transfers (Idempotency-Key + PIN required)
- GET /api/v1/accounts/balance

### Domain rules
1. Ledger is source of truth
2. Never delete/update ledger entries — reverse only
3. Idempotency-Key required on money-moving APIs
4. PIN required for transfers and top-ups

## Quick start
```bash
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

Health: http://localhost:3000/api/v1/health
