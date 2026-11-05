import { createServerFn } from "@tanstack/react-start";
import { randomBytes, scryptSync } from "node:crypto";
import { authMiddleware } from "@/lib/auth/middleware";
import { findBank } from "@/lib/banks";
import { getSql } from "@/lib/db";
import { parseLedgerCursor, type LedgerCursor } from "@/lib/wallet/pagination";
import { getWalletCapabilities, isConfirmedTopup } from "@/lib/wallet/policy";

const TRANSACTION_PAGE_SIZE = 50;

export type LedgerEntry = {
  id: string;
  amountKobo: number;
  kind: string;
  title: string;
  meta: string;
  counterparty: string;
  bankName: string;
  reference: string;
  createdAt: string;
};

export type Beneficiary = {
  id: string;
  name: string;
  bankId: string;
  bankName: string;
  accountNumber: string;
};

export type WalletView = {
  balanceKobo: number;
  capabilities: ReturnType<typeof getWalletCapabilities>;
  receivingAccountNumber: string | null;
  nextEntriesCursor: LedgerCursor | null;
  hasPin: boolean;
  profile: {
    fullName: string;
    phone: string;
    address: string;
    gender: string;
    dob: string;
  };
  entries: LedgerEntry[];
  beneficiaries: Beneficiary[];
};

type EntryRow = {
  id: string;
  amount_kobo: number;
  kind: string;
  title: string;
  meta: string;
  counterparty: string;
  bank_name: string;
  reference: string;
  created_at: string | Date;
};

type MoneyActionResult =
  | { ok: true; entry: LedgerEntry }
  | { ok: false; error: string };

function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function mapEntry(row: EntryRow): LedgerEntry {
  return {
    id: row.id,
    amountKobo: Number(row.amount_kobo),
    kind: row.kind,
    title: row.title,
    meta: row.meta,
    counterparty: row.counterparty,
    bankName: row.bank_name,
    reference: row.reference,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

async function readWallet(userId: string): Promise<WalletView> {
  const sql = await getSql();
  await sql`
    insert into profiles (user_id)
    values (${userId})
    on conflict (user_id) do nothing
  `;
  const profiles = await sql<{
    full_name: string;
    phone: string;
    address: string;
    gender: string;
    dob: string;
    pin_hash: string | null;
  }>`
    select full_name, phone, address, gender, dob, pin_hash
    from profiles where user_id = ${userId}
  `;
  const profile = profiles[0];
  const sums = await sql<{ bal: number }>`
    select coalesce(sum(amount_kobo), 0) as bal from ledger_entries where user_id = ${userId}
  `;
  const entries = await sql<EntryRow>`
    select id, amount_kobo, kind, title, meta, counterparty, bank_name, reference, created_at
    from ledger_entries
    where user_id = ${userId}
    order by created_at desc, id desc
    limit ${TRANSACTION_PAGE_SIZE + 1}
  `;
  const hasMoreEntries = entries.length > TRANSACTION_PAGE_SIZE;
  const firstEntries = entries.slice(0, TRANSACTION_PAGE_SIZE);
  const lastEntry = firstEntries[firstEntries.length - 1];
  const people = await sql<{
    id: string;
    name: string;
    bank_id: string;
    bank_name: string;
    account_number: string;
  }>`
    select id, name, bank_id, bank_name, account_number
    from beneficiaries
    where user_id = ${userId}
    order by created_at desc
  `;
  return {
    balanceKobo: Number(sums[0]?.bal ?? 0),
    capabilities: getWalletCapabilities(process.env.PAYSTACK_SECRET_KEY),
    receivingAccountNumber: null,
    nextEntriesCursor:
      hasMoreEntries && lastEntry
        ? {
            createdAt:
              lastEntry.created_at instanceof Date
                ? lastEntry.created_at.toISOString()
                : new Date(lastEntry.created_at).toISOString(),
            id: lastEntry.id,
          }
        : null,
    hasPin: Boolean(profile?.pin_hash),
    profile: {
      fullName: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
      address: profile?.address ?? "",
      gender: profile?.gender ?? "",
      dob: profile?.dob ?? "",
    },
    entries: firstEntries.map(mapEntry),
    beneficiaries: people.map((p) => ({
      id: p.id,
      name: p.name,
      bankId: p.bank_id,
      bankName: p.bank_name,
      accountNumber: p.account_number,
    })),
  };
}

export const getWallet = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => readWallet(context.userId));

export const getTransactionPage = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const cursor = (input as { cursor?: unknown } | null)?.cursor;
    return { cursor: parseLedgerCursor(cursor) };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const cursor = data.cursor;
    const rows = await sql<EntryRow>`
      select id, amount_kobo, kind, title, meta, counterparty, bank_name, reference, created_at
      from ledger_entries
      where user_id = ${context.userId}
        and (
          ${cursor === null}
          or (created_at, id) < (${cursor?.createdAt ?? null}::timestamptz, ${cursor?.id ?? null})
        )
      order by created_at desc, id desc
      limit ${TRANSACTION_PAGE_SIZE + 1}
    `;
    const page = rows.slice(0, TRANSACTION_PAGE_SIZE);
    const last = page[page.length - 1];
    return {
      entries: page.map(mapEntry),
      nextCursor:
        rows.length > TRANSACTION_PAGE_SIZE && last
          ? {
              createdAt:
                last.created_at instanceof Date
                  ? last.created_at.toISOString()
                  : new Date(last.created_at).toISOString(),
              id: last.id,
            }
          : null,
    };
  });

const profileInput = (input: unknown) => {
  const v = (input ?? {}) as Record<string, unknown>;
  const text = (key: string, max: number) => String(v[key] ?? "").trim().slice(0, max);
  return {
    fullName: text("fullName", 80),
    phone: text("phone", 16).replace(/\D/g, "").slice(0, 11),
    address: text("address", 160),
    gender: text("gender", 16),
    dob: text("dob", 16),
  };
};

export const saveProfile = createServerFn({ method: "POST" })
  .validator(profileInput)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into profiles (user_id, full_name, phone, address, gender, dob)
      values (${context.userId}, ${data.fullName}, ${data.phone}, ${data.address}, ${data.gender}, ${data.dob})
      on conflict (user_id) do update set
        full_name = excluded.full_name,
        phone = excluded.phone,
        address = excluded.address,
        gender = excluded.gender,
        dob = excluded.dob
    `;
    return readWallet(context.userId);
  });

export const setPin = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const pin = String((input as { pin?: string })?.pin ?? "").replace(/\D/g, "");
    if (pin.length !== 4) throw new Error("PIN must be 4 digits.");
    return { pin };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ user_id: string }>`
      insert into profiles (user_id, pin_hash)
      values (${context.userId}, ${hashPin(data.pin)})
      on conflict (user_id) do update set pin_hash = excluded.pin_hash
      where profiles.pin_hash is null
      returning user_id
    `;
    if (!rows[0]) return { ok: false as const, error: "A PIN is already set." };
    return { ok: true as const };
  });

export const resolveAccount = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const v = (input ?? {}) as { accountNumber?: string; bankId?: string };
    const accountNumber = String(v.accountNumber ?? "").replace(/\D/g, "");
    const bankId = String(v.bankId ?? "");
    if (accountNumber.length !== 10) throw new Error("Account number must be 10 digits.");
    if (!bankId) throw new Error("Select a bank.");
    return { accountNumber, bankId };
  })
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    if (!getWalletCapabilities(process.env.PAYSTACK_SECRET_KEY).bankTransfers) {
      return { ok: false as const, reason: "not_connected" as const };
    }
    const bank = findBank(data.bankId);
    if (!bank) return { ok: false as const, reason: "unknown_bank" as const };
    const key = process.env.PAYSTACK_SECRET_KEY?.trim();
    if (!key) return { ok: false as const, reason: "not_connected" as const };
    if (!bank.code) return { ok: false as const, reason: "unsupported" as const };
    const url = `https://api.paystack.co/bank/resolve?account_number=${data.accountNumber}&bank_code=${bank.code}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    const body = (await res.json().catch(() => null)) as { status?: boolean; data?: { account_name?: string } } | null;
    const name = body?.data?.account_name?.trim();
    if (!res.ok || !body?.status || !name) return { ok: false as const, reason: "not_found" as const };
    return { ok: true as const, accountName: name };
  });

function debitInput(input: unknown) {
  const v = (input ?? {}) as Record<string, unknown>;
  const amountNaira = Number(v.amountNaira);
  const pin = String(v.pin ?? "").replace(/\D/g, "");
  const idempotencyKey = String(v.idempotencyKey ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  if (!Number.isFinite(amountNaira) || amountNaira < 100) throw new Error("Enter at least ₦100.");
  if (pin.length !== 4) throw new Error("Enter your 4-digit PIN.");
  if (idempotencyKey.length < 8) throw new Error("Missing payment reference.");
  return { amountNaira: Math.round(amountNaira) };
}

export const transfer = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const { amountNaira } = debitInput(input);
    const v = input as { accountNumber?: string; bankId?: string; accountName?: string; narration?: string };
    const accountNumber = String(v.accountNumber ?? "").replace(/\D/g, "");
    const bank = findBank(String(v.bankId ?? ""));
    const accountName = String(v.accountName ?? "").trim().slice(0, 80);
    if (accountNumber.length !== 10 || !bank) throw new Error("Enter the account number and bank.");
    if (accountName.length < 3) throw new Error("Enter the account name.");
    return { amountNaira };
  })
  .middleware([authMiddleware])
  .handler(async (): Promise<MoneyActionResult> => ({
    ok: false as const,
    error: "Bank transfers are not enabled. No money has been sent or debited.",
  }));

export const buyAirtime = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const { amountNaira } = debitInput(input);
    const v = input as { network?: string; phone?: string };
    const network = String(v.network ?? "").slice(0, 20);
    const phone = String(v.phone ?? "").replace(/\D/g, "").slice(0, 11);
    if (!network || phone.length < 11) throw new Error("Enter the network and an 11-digit number.");
    return { amountNaira };
  })
  .middleware([authMiddleware])
  .handler(async (): Promise<MoneyActionResult> => ({
    ok: false as const,
    error: "Airtime purchases are not connected. Your wallet has not been debited.",
  }));

export const payBill = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    debitInput(input);
    return {};
  })
  .middleware([authMiddleware])
  .handler(async (): Promise<MoneyActionResult> => ({
    ok: false as const,
    error: "Bill payments are not connected. Your wallet has not been debited.",
  }));

export const startTopup = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const v = (input ?? {}) as { amountNaira?: number; callbackUrl?: string };
    const amountNaira = Math.round(Number(v.amountNaira));
    let origin = "";
    try {
      const url = new URL(String(v.callbackUrl ?? ""));
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("bad");
      origin = url.origin;
    } catch {
      throw new Error("Missing return address.");
    }
    if (!Number.isFinite(amountNaira) || amountNaira < 100) throw new Error("Enter at least ₦100.");
    return { amountNaira, origin };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const key = process.env.PAYSTACK_SECRET_KEY?.trim();
    if (!key) return { ok: false as const, reason: "not_connected" as const };
    const sql = await getSql();
    const users = await sql<{ email: string }>`select "email" as email from "user" where "id" = ${context.userId}`;
    const email = users[0]?.email;
    if (!email) return { ok: false as const, reason: "no_email" as const };
    const reference = `nak_${crypto.randomUUID().replace(/-/g, "")}`;
    const amountKobo = data.amountNaira * 100;
    await sql`
      insert into topup_intents (reference, user_id, amount_kobo)
      values (${reference}, ${context.userId}, ${amountKobo})
    `;
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        amount: amountKobo,
        reference,
        callback_url: `${data.origin}/?topup=${reference}`,
      }),
    });
    const body = (await res.json().catch(() => null)) as { status?: boolean; data?: { authorization_url?: string } } | null;
    const authorizationUrl = body?.data?.authorization_url;
    if (!res.ok || !body?.status || !authorizationUrl) {
      return { ok: false as const, reason: "start_failed" as const };
    }
    return { ok: true as const, authorizationUrl, reference };
  });

export const confirmTopup = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const reference = String((input as { reference?: string })?.reference ?? "");
    if (!/^nak_[a-z0-9]+$/i.test(reference)) throw new Error("Unknown payment.");
    return { reference };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const key = process.env.PAYSTACK_SECRET_KEY?.trim();
    if (!key) return { ok: false as const, error: "Card payments are not connected." };
    const sql = await getSql();
    const intents = await sql<{ amount_kobo: number; status: string }>`
      select amount_kobo, status from topup_intents
      where reference = ${data.reference} and user_id = ${context.userId}
    `;
    const intent = intents[0];
    if (!intent) return { ok: false as const, error: "That payment was not started from this account." };
    const ledgerRef = `paystack:${data.reference}`;
    const already = await sql<EntryRow>`
      select id, amount_kobo, kind, title, meta, counterparty, bank_name, reference, created_at
      from ledger_entries where user_id = ${context.userId} and reference = ${ledgerRef}
    `;
    if (already[0]) return { ok: true as const, entry: mapEntry(already[0]) };

    const res = await fetch(`https://api.paystack.co/transaction/verify/${data.reference}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const body = (await res.json().catch(() => null)) as {
      status?: boolean;
      data?: { status?: string; amount?: number; currency?: string; reference?: string };
    } | null;
    if (
      !res.ok ||
      !body?.status ||
      !body?.data ||
      !isConfirmedTopup(
        { reference: data.reference, amountKobo: Number(intent.amount_kobo) },
        body.data,
      )
    ) {
      return { ok: false as const, error: "Paystack has not confirmed this payment." };
    }
    const id = crypto.randomUUID();
    const inserted = await sql<EntryRow>`
      insert into ledger_entries (id, user_id, amount_kobo, kind, title, meta, counterparty, bank_name, reference)
      values (
        ${id}, ${context.userId}, ${intent.amount_kobo}, ${"topup"}, ${"Wallet top-up"},
        ${"Paystack"}, ${"Paystack"}, ${"Paystack"}, ${ledgerRef}
      )
      on conflict (user_id, reference) do nothing
      returning id, amount_kobo, kind, title, meta, counterparty, bank_name, reference, created_at
    `;
    await sql`update topup_intents set status = 'paid' where reference = ${data.reference}`;
    const entry = inserted[0] ?? already[0];
    if (!entry) return { ok: false as const, error: "The payment was confirmed but not recorded. Try again." };
    return { ok: true as const, entry: mapEntry(entry) };
  });
