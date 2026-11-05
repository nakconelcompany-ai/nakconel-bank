import assert from "node:assert/strict";
import test from "node:test";
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
} from "./demo.ts";

test("derives business analytics from demo invoice, link, and expense records", () => {
  const summary = getDemoBusinessSummary(createDemoBusiness());

  assert.deepEqual(summary, {
    collectedNaira: 450_000,
    outstandingNaira: 280_000,
    expensesNaira: 50_500,
    netDemoNaira: 399_500,
    invoiceCount: 3,
    activeLinkCount: 1,
  });
});

test("creates invoices, sends drafts, and simulates receipt without real settlement", () => {
  const initial = createDemoBusiness();
  const withDraft = addDemoInvoice(initial, {
    id: "invoice-new",
    client: "New Client",
    description: "Design work",
    amountNaira: 100_000,
    createdAt: "2026-11-04T10:00:00.000Z",
  });
  const sent = markDemoInvoiceSent(withDraft, "invoice-new");
  const paid = simulateDemoInvoicePayment(sent, "invoice-new");

  assert.equal(initial.invoices.length, 3);
  assert.equal(withDraft.invoices[0]?.status, "Draft");
  assert.equal(sent.invoices[0]?.status, "Sent");
  assert.equal(paid.invoices[0]?.status, "Paid (demo)");
  assert.equal(paid.invoices[0]?.amountNaira, 100_000);
});

test("creates and simulates payment links as demo records", () => {
  const business = createDemoBusiness();
  const linked = addDemoPaymentLink(business, {
    id: "link-new",
    title: "Consultation",
    amountNaira: 25_000,
    createdAt: "2026-11-04T10:00:00.000Z",
  });
  const paid = simulateDemoLinkPayment(linked, "link-new");

  assert.equal(linked.paymentLinks[0]?.status, "Active");
  assert.equal(paid.paymentLinks[0]?.status, "Paid (demo)");
  assert.equal(getDemoBusinessSummary(paid).collectedNaira, 475_000);
});

test("adds business expenses and validates team members", () => {
  const business = createDemoBusiness();
  const expense = addDemoExpense(business, {
    id: "expense-new",
    merchant: "Cloud tools",
    category: "Software",
    amountNaira: 5_000,
    createdAt: "2026-11-04T10:00:00.000Z",
  });
  const team = addDemoTeamMember(expense, {
    id: "team-new",
    name: "Sade Adeyemi",
    email: "sade@example.test",
    role: "Viewer",
  });

  assert.equal(getDemoBusinessSummary(team).expensesNaira, 55_500);
  assert.equal(team.team.length, 3);
  assert.throws(
    () => addDemoTeamMember(team, { id: "team-duplicate", name: "Sade", email: "SADE@example.test", role: "Admin" }),
    /already on the demo team/,
  );
  assert.throws(
    () => addDemoTeamMember(team, { id: "team-owner", name: "Owner", email: "owner@example.test", role: "Owner" }),
    /non-owner role/,
  );
});

test("rejects malformed business records", () => {
  const business = createDemoBusiness();

  assert.throws(
    () => addDemoInvoice(business, {
      id: "invoice-bad",
      client: "",
      description: "Work",
      amountNaira: 100,
      createdAt: "2026-11-04T10:00:00.000Z",
    }),
    /client and invoice description/,
  );
  assert.throws(
    () => addDemoPaymentLink(business, {
      id: "link-bad",
      title: " ",
      amountNaira: 0,
      createdAt: "not-a-date",
    }),
    /valid description and amount/,
  );
});
