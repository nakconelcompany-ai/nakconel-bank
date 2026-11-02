import { createServerFn } from "@tanstack/react-start";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { authMiddleware } from "@/lib/auth/middleware";
import { findBank } from "@/lib/banks";
import { getSql } from "@/lib/db";

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
  paymentsConnected: boolean;
  accountNumber: string;
  hasPin: boolean;
  profile: {
    fullName: string;
    phone: string;
    nin: string;
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

function paymentsConnected() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
}

function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function pinMatches(pin: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(pin, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

function accountNumber(userId: string, phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return digits;
  if (digits.length === 10) return `0${digits}`;
  if (digits.length > 11) return `0${digits.slice(-10)}`;
  let n = 0;
  for (const c of userId) n = (n * 33 + c.charCodeAt(0)) >>> 0;
  return String(n % 1_000_000_0000).padStart(10, "0");
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
    nin: string;
    address: string;
    gender: string;
    dob: string;
    pin_hash: string | null;
  }>`
    select full_name, phone, nin, address, gender, dob, pin_hash
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
    order by created_at desc
    limit 50
  `;
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
    paymentsConnected: paymentsConnected(),
    accountNumber: accountNumber(userId, profile?.phone ?? ""),
    hasPin: Boolean(profile?.pin_hash),
    profile: {
      fullName: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
      nin: profile?.nin ?? "",
      address: profile?.address ?? "",
      gender: profile?.gender ?? "",
      dob: profile?.dob ?? "",
    },
    entries: entries.map(mapEntry),
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

const profileInput = (input: unknown) => {
  const v = (input ?? {}) as Record<string, unknown>;
  const text = (key: string, max: number) => String(v[key] ?? "").trim().slice(0, max);
  return {
    fullName: text("fullName", 80),
    phone: text("phone", 16).replace(/\D/g, "").slice(0, 11),
    nin: text("nin", 11).replace(/\D/g, "").slice(0, 11),
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
      insert into profiles (user_id, full_name, phone, nin, address, gender, dob)
      values (${context.userId}, ${data.fullName}, ${data.phone}, ${data.nin}, ${data.address}, ${data.gender}, ${data.dob})
      on conflict (user_id) do update set
        full_name = excluded.full_name,
        phone = excluded.phone,
        nin = excluded.nin,
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
    const rows = await sql<{ pin_hash: string | null }>`
      select pin_hash from profiles where user_id = ${context.userId}
    `;
    if (rows[0]?.pin_hash) return { ok: false as const, error: "A PIN is already set." };
    await sql`
      insert into profiles (user_id, pin_hash)
      values (${context.userId}, ${hashPin(data.pin)})
      on conflict (user_id) do update set pin_hash = excluded.pin_hash
    `;
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

type DebitInput = {
  amountNaira: number;
  pin: string;
  idempotencyKey: string;
  title: string;
  kind: string;
  meta: string;
  counterparty: string;
  bankName: string;
  saveBeneficiary?: { name: string; bankId: string; accountNumber: string } | null;
};

function debitInput(input: unknown, kind: string, title: string): DebitInput {
  const v = (input ?? {}) as Record<string, unknown>;
  const amountNaira = Number(v.amountNaira);
  const pin = String(v.pin ?? "").replace(/\D/g, "");
  const idempotencyKey = String(v.idempotencyKey ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  if (!Number.isFinite(amountNaira) || amountNaira < 100) throw new Error("Enter at least ₦100.");
  if (pin.length !== 4) throw new Error("Enter your 4-digit PIN.");
  if (idempotencyKey.length < 8) throw new Error("Missing payment reference.");
  return {
    amountNaira: Math.round(amountNaira),
    pin,
    idempotencyKey,
    title,
    kind,
    meta: String(v.meta ?? "").slice(0, 120),
    counterparty: String(v.counterparty ?? "").slice(0, 80),
    bankName: String(v.bankName ?? "").slice(0, 80),
    saveBeneficiary: null,
  };
}

async function postDebit(userId: string, input: DebitInput) {
  const sql = await getSql();
  const profiles = await sql<{ pin_hash: string | null }>`
    select pin_hash from profiles where user_id = ${userId}
  `;
  const stored = profiles[0]?.pin_hash;
  if (!stored) return { ok: false as const, error: "Create your transaction PIN first." };
  if (!pinMatches(input.pin, stored)) return { ok: false as const, error: "That PIN is not correct." };

  const amountKobo = input.amountNaira * 100;
  const reference = `idem:${input.idempotencyKey}`;
  const existing = await sql<EntryRow>`
    select id, amount_kobo, kind, title, meta, counterparty, bank_name, reference, created_at
    from ledger_entries where user_id = ${userId} and reference = ${reference}
  `;
  if (existing[0]) return { ok: true as const, entry: mapEntry(existing[0]) };

  const id = crypto.randomUUID();
  const inserted = await sql<EntryRow>`
    insert into ledger_entries (id, user_id, amount_kobo, kind, title, meta, counterparty, bank_name, reference)
    select ${id}, ${userId}, ${-amountKobo}, ${input.kind}, ${input.title}, ${input.meta}, ${input.counterparty}, ${input.bankName}, ${reference}
    where (
      select coalesce(sum(amount_kobo), 0) from ledger_entries where user_id = ${userId}
    ) >= ${amountKobo}
    and not exists (
      select 1 from ledger_entries where user_id = ${userId} and reference = ${reference}
    )
    returning id, amount_kobo, kind, title, meta, counterparty, bank_name, reference, created_at
  `;
  if (!inserted[0]) return { ok: false as const, error: "Your balance is not enough for this payment." };

  if (input.saveBeneficiary) {
    const b = input.saveBeneficiary;
    await sql`
      insert into beneficiaries (id, user_id, name, bank_id, bank_name, account_number)
      values (${crypto.randomUUID()}, ${userId}, ${b.name}, ${b.bankId}, ${input.bankName}, ${b.accountNumber})
      on conflict (user_id, bank_id, account_number) do nothing
    `;
  }
  return { ok: true as const, entry: mapEntry(inserted[0]) };
}

export const transfer = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const base = debitInput(input, "send", "Money Sent");
    const v = input as { accountNumber?: string; bankId?: string; accountName?: string; narration?: string };
    const accountNumber = String(v.accountNumber ?? "").replace(/\D/g, "");
    const bank = findBank(String(v.bankId ?? ""));
    const accountName = String(v.accountName ?? "").trim().slice(0, 80);
    if (accountNumber.length !== 10 || !bank) throw new Error("Enter the account number and bank.");
    if (accountName.length < 3) throw new Error("Enter the account name.");
    return {
      ...base,
      title: "Money Sent",
      kind: "send",
      meta: `${String(v.narration ?? "Transfer").slice(0, 60)} · ${bank.name}`,
      counterparty: accountName,
      bankName: bank.name,
      saveBeneficiary: { name: accountName, bankId: bank.id, accountNumber },
    };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => postDebit(context.userId, data));

export const buyAirtime = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const base = debitInput(input, "airtime", "Airtime Purchase");
    const v = input as { network?: string; phone?: string };
    const network = String(v.network ?? "").slice(0, 20);
    const phone = String(v.phone ?? "").replace(/\D/g, "").slice(0, 11);
    if (!network || phone.length < 11) throw new Error("Enter the network and an 11-digit number.");
    return {
      ...base,
      title: "Airtime Purchase",
      kind: "airtime",
      meta: `Just now · ${network}`,
      counterparty: `${network} · ${phone}`,
      bankName: network,
    };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => postDebit(context.userId, data));

export const payBill = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const base = debitInput(input, "bill", "Bill Payment");
    const v = input as { service?: string };
    const service = String(v.service ?? "Bill").slice(0, 40);
    return {
      ...base,
      title: service,
      kind: "bill",
      meta: `Just now · ${service}`,
      counterparty: service,
      bankName: "Nakconel",
    };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => postDebit(context.userId, data));

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
      data?: { status?: string; amount?: number };
    } | null;
    if (!res.ok || body?.data?.status !== "success" || Number(body.data.amount) !== Number(intent.amount_kobo)) {
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
