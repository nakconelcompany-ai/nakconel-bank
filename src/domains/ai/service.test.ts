import { describe, it, expect, vi, beforeAll } from 'vitest';

// ─── Mock Prisma so DB calls never actually fire ───────────────────────────
vi.mock('@/lib/prisma', () => ({
  prisma: {
    transfer: {
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    account: { findMany: vi.fn().mockResolvedValue([]) },
    businessProfile: { findFirst: vi.fn().mockResolvedValue(null) },
    aiRiskAssessment: { create: vi.fn().mockResolvedValue({ id: 'mock-id' }) },
    supportTicket: { create: vi.fn().mockResolvedValue({ id: 'ticket-1', status: 'AI_RESOLVED' }) },
  },
}));

// ─── Mock ledger service ───────────────────────────────────────────────────
vi.mock('@/domains/ledger/service', () => ({
  getAccountBalanceKobo: vi.fn().mockResolvedValue(100_000_00),
}));

import {
  assessTransactionRisk,
  getFxCorridorRecommendations,
} from './service';

describe('AI Domain Service', () => {
  describe('assessTransactionRisk', () => {
    it('rates small daytime transfers as LOW risk', async () => {
      const result = await assessTransactionRisk({
        userId: 'test-user-id-1',
        action: 'TRANSFER',
        amountKobo: 5_000_00, // ₦5,000
      });

      expect(result.riskScore).toBeLessThan(35);
      expect(result.riskLevel).toBe('LOW');
      expect(result.allowed).toBe(true);
    });

    it('flags high-value transfers above threshold with elevated score', async () => {
      const result = await assessTransactionRisk({
        userId: 'test-user-id-2',
        action: 'TRANSFER',
        amountKobo: 300_000_00, // ₦300,000 (>= 200k)
      });

      expect(result.riskScore).toBeGreaterThanOrEqual(35);
      expect(result.factors).toContain('High-value transaction threshold exceeded (₦200k+)');
    });
  });

  describe('getFxCorridorRecommendations', () => {
    it('returns recommendations for key corridors including USD, GBP, EUR, GHS, KES', () => {
      const result = getFxCorridorRecommendations();
      expect(result.recommendations.length).toBeGreaterThanOrEqual(5);

      const corridors = result.recommendations.map(r => r.corridor);
      expect(corridors.some(c => c.includes('USD'))).toBe(true);
      expect(corridors.some(c => c.includes('GBP'))).toBe(true);
      expect(corridors.some(c => c.includes('EUR'))).toBe(true);
      expect(corridors.some(c => c.includes('GHS'))).toBe(true);
      expect(corridors.some(c => c.includes('KES'))).toBe(true);
    });

    it('includes rate, marketSignal, and spreadGrade in every recommendation', () => {
      const result = getFxCorridorRecommendations();
      for (const rec of result.recommendations) {
        expect(rec.rate).toBeGreaterThan(0);
        expect(rec.marketSignal).toBeTruthy();
        expect(rec.spreadGrade).toBeTruthy();
        expect(rec.advice).toBeTruthy();
      }
    });
  });
});
