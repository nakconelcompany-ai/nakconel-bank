import assert from "node:assert/strict";
import test from "node:test";
import { addDemoFunds, createDemoWallet } from "./demo.ts";

test("creates a balanced synthetic wallet with every real money feature disabled", () => {
  const wallet = createDemoWallet();

  assert.equal(wallet.balanceKobo, 8_000_000);
  assert.equal(wallet.entries.reduce((sum, entry) => sum + entry.amountKobo, 0), wallet.balanceKobo);
  assert.equal(wallet.capabilities.cardTopups, false);
  assert.equal(wallet.capabilities.bankTransfers, false);
  assert.equal(wallet.capabilities.airtime, false);
  assert.equal(wallet.capabilities.billPayments, false);
  assert.equal(wallet.capabilities.virtualCards, false);
  assert.equal(wallet.capabilities.identityVerification, false);
  assert.equal(wallet.entries.every((entry) => entry.kind === "demo"), true);
});

test("adds preview-only funds without mutating the original wallet", () => {
  const wallet = createDemoWallet();
  const result = addDemoFunds(wallet, 2_500, "demo-added", "2026-11-04T10:00:00.000Z");

  assert.equal(result.wallet.balanceKobo, wallet.balanceKobo + 250_000);
  assert.equal(result.wallet.entries[0], result.entry);
  assert.equal(result.entry.kind, "demo");
  assert.match(result.entry.meta, /no payment was made/);
  assert.equal(wallet.balanceKobo, 8_000_000);
  assert.equal(wallet.entries.length, 3);
});

test("rejects invalid demo funding amounts and entry details", () => {
  const wallet = createDemoWallet();

  assert.throws(() => addDemoFunds(wallet, 99, "demo-id", "2026-11-04T10:00:00.000Z"));
  assert.throws(() => addDemoFunds(wallet, 100.5, "demo-id", "2026-11-04T10:00:00.000Z"));
  assert.throws(() => addDemoFunds(wallet, 100, "", "2026-11-04T10:00:00.000Z"));
  assert.throws(() => addDemoFunds(wallet, 100, "demo-id", "invalid-date"));
});
