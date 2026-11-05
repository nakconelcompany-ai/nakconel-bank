import { describe, expect, it } from 'vitest';
import {
  addDemoExpense,
  addDemoInvoice,
  addDemoPaymentLink,
  addDemoTeamMember,
  createDemoBusiness,
  getDemoBusinessSummary,
  markDemoInvoiceSent,
  simulateDemoInvoicePayment,
  simulateDemoLinkPayment,
} from './demo';

describe('business demo', () => {
  it('starts with accurate sample analytics', () => {
    expect(getDemoBusinessSummary(createDemoBusiness())).toEqual({
      collectedNaira: 450_000,
      outstandingNaira: 280_000,
      expensesNaira: 50_500,
      netDemoNaira: 399_500,
      invoiceCount: 3,
      activeLinkCount: 1,
    });
  });

  it('simulates invoice and payment-link states in memory', () => {
    const invoiceBusiness = addDemoInvoice(createDemoBusiness(), {
      id: 'invoice-new',
      client: 'Sample client',
      description: 'Sample service',
      amountNaira: 12_500,
      createdAt: '2026-11-05T00:00:00.000Z',
    });
    const paidInvoice = simulateDemoInvoicePayment(
      markDemoInvoiceSent(invoiceBusiness, 'invoice-new'),
      'invoice-new',
    );
    expect(paidInvoice.invoices[0].status).toBe('Paid (demo)');
    expect(getDemoBusinessSummary(paidInvoice).collectedNaira).toBe(462_500);

    const linkBusiness = addDemoPaymentLink(createDemoBusiness(), {
      id: 'link-new',
      title: 'Sample link',
      amountNaira: 5_000,
      createdAt: '2026-11-05T00:00:00.000Z',
    });
    const paidLink = simulateDemoLinkPayment(linkBusiness, 'link-new');
    expect(linkBusiness.paymentLinks[0].status).toBe('Active');
    expect(paidLink.paymentLinks[0].status).toBe('Paid (demo)');
  });

  it('validates demo expenses and prevents duplicate team emails', () => {
    const withExpense = addDemoExpense(createDemoBusiness(), {
      id: 'expense-new',
      merchant: 'Sample shop',
      category: 'Supplies',
      amountNaira: 2_500,
      createdAt: '2026-11-05T00:00:00.000Z',
    });
    const withMember = addDemoTeamMember(withExpense, {
      id: 'member-new',
      name: 'Sample teammate',
      email: 'sample@example.test',
      role: 'Viewer',
    });
    expect(getDemoBusinessSummary(withMember).expensesNaira).toBe(53_000);
    expect(() => addDemoTeamMember(withMember, {
      id: 'duplicate',
      name: 'Duplicate',
      email: 'SAMPLE@example.test',
      role: 'Admin',
    })).toThrow(/already on the demo team/i);
  });
});
