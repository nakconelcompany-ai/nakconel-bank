import assert from "node:assert/strict";
import test from "node:test";
import { getWalletCapabilities, isConfirmedTopup } from "./policy.ts";

test("only enables card top-ups when a Paystack secret is configured", () => {
  assert.equal(getWalletCapabilities(undefined).cardTopups, false);
  assert.equal(getWalletCapabilities("  ").cardTopups, false);
  assert.equal(getWalletCapabilities("configured").cardTopups, true);

  const capabilities = getWalletCapabilities("configured");
  assert.equal(capabilities.bankTransfers, false);
  assert.equal(capabilities.airtime, false);
  assert.equal(capabilities.billPayments, false);
  assert.equal(capabilities.virtualCards, false);
  assert.equal(capabilities.identityVerification, false);
});

test("accepts only a successful matching NGN top-up verification", () => {
  const intent = { reference: "nak_123", amountKobo: 250_000 };
  assert.equal(
    isConfirmedTopup(intent, {
      reference: "nak_123",
      amount: 250_000,
      currency: "NGN",
      status: "success",
    }),
    true,
  );
  assert.equal(
    isConfirmedTopup(intent, {
      reference: "nak_other",
      amount: 250_000,
      currency: "NGN",
      status: "success",
    }),
    false,
  );
  assert.equal(
    isConfirmedTopup(intent, {
      reference: "nak_123",
      amount: 250_000,
      currency: "USD",
      status: "success",
    }),
    false,
  );
  assert.equal(
    isConfirmedTopup(intent, {
      reference: "nak_123",
      amount: 249_999,
      currency: "NGN",
      status: "success",
    }),
    false,
  );
  assert.equal(
    isConfirmedTopup(intent, {
      reference: "nak_123",
      amount: 250_000,
      currency: "NGN",
      status: "pending",
    }),
    false,
  );
});
