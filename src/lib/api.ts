const base = '';

export type Session = {
  id: string;
  email: string;
  fullName: string;
  accountId?: string;
  token: string;
  kycStatus?: string;
};

export async function apiRegister(body: {
  email: string;
  fullName: string;
  password: string;
  pin: string;
}) {
  const res = await fetch(`${base}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Registration failed');
  return json.data as { id: string; email: string; fullName: string; accountId?: string };
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Login failed');
  return json.data as Session;
}

export async function apiBalance(accountId: string) {
  const res = await fetch(
    `${base}/api/v1/accounts/balance?accountId=${encodeURIComponent(accountId)}`
  );
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Balance failed');
  return json.data as {
    accountId: string;
    balanceKobo: number;
    balance: number;
    formatted: string;
    currency: string;
  };
}

export async function apiTransfer(input: {
  userId: string;
  fromAccountId: string;
  amount: number;
  beneficiaryName: string;
  beneficiaryAccount: string;
  note?: string;
  pin: string;
  idempotencyKey: string;
}) {
  const res = await fetch(`${base}/api/v1/transfers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Transfer failed');
  return json.data;
}
