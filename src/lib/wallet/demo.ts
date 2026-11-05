import type { LedgerEntry, WalletView } from "../wallet.functions";
import { getWalletCapabilities } from "./policy.ts";

const demoEntries: LedgerEntry[] = [
  {
    id: "demo-entry-credit",
    amountKobo: 10_000_000,
    kind: "demo",
    title: "Sample wallet credit",
    meta: "Demo activity · no funds moved",
    counterparty: "Demo data",
    bankName: "Preview only",
    reference: "DEMO-CREDIT",
    createdAt: "2026-11-03T10:30:00.000Z",
  },
  {
    id: "demo-entry-debit-one",
    amountKobo: -1_500_000,
    kind: "demo",
    title: "Sample wallet activity",
    meta: "Demo activity · no funds moved",
    counterparty: "Demo data",
    bankName: "Preview only",
    reference: "DEMO-ACTIVITY-1",
    createdAt: "2026-11-02T09:15:00.000Z",
  },
  {
    id: "demo-entry-debit-two",
    amountKobo: -500_000,
    kind: "demo",
    title: "Sample wallet activity",
    meta: "Demo activity · no funds moved",
    counterparty: "Demo data",
    bankName: "Preview only",
    reference: "DEMO-ACTIVITY-2",
    createdAt: "2026-11-01T14:00:00.000Z",
  },
];

export function createDemoWallet(): WalletView {
  return {
    balanceKobo: 8_000_000,
    capabilities: getWalletCapabilities(undefined),
    receivingAccountNumber: null,
    nextEntriesCursor: null,
    hasPin: false,
    profile: {
      fullName: "Amina Demo",
      phone: "",
      address: "",
      gender: "",
      dob: "",
    },
    entries: demoEntries.map((entry) => ({ ...entry })),
    beneficiaries: [],
  };
}

export function addDemoFunds(
  wallet: WalletView,
  amountNaira: number,
  id: string,
  createdAt: string,
): { wallet: WalletView; entry: LedgerEntry } {
  if (!Number.isSafeInteger(amountNaira) || amountNaira < 100) {
    throw new Error("Demo funding must be at least ₦100.");
  }
  if (!id || !createdAt || !Number.isFinite(Date.parse(createdAt))) {
    throw new Error("Invalid demo funding details.");
  }

  const entry: LedgerEntry = {
    id,
    amountKobo: amountNaira * 100,
    kind: "demo",
    title: "Demo wallet funding",
    meta: "Preview only · no payment was made",
    counterparty: "Demo mode",
    bankName: "Preview only",
    reference: `DEMO-${id}`,
    createdAt: new Date(createdAt).toISOString(),
  };

  return {
    wallet: {
      ...wallet,
      balanceKobo: wallet.balanceKobo + entry.amountKobo,
      entries: [entry, ...wallet.entries],
    },
    entry,
  };
}
