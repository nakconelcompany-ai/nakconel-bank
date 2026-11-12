import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getAccountBalanceKobo } from '@/domains/ledger/service';

function formatNGN(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' });
}

function formatDateTime(d: Date) {
  return d.toLocaleString('en-NG', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos',
  });
}

export async function GET(req: NextRequest) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return new NextResponse('Authentication required', { status: 401 });
  }

  // Optional query params
  const { searchParams } = req.nextUrl;
  const fromParam = searchParams.get('from');
  const toParam   = searchParams.get('to');
  const from = fromParam ? new Date(fromParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to   = toParam   ? new Date(toParam)   : new Date();

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: { orderBy: { createdAt: 'asc' }, take: 1 } },
    });
    if (!user) return new NextResponse('User not found', { status: 404 });

    const account = user.accounts[0];
    const accountId = account?.id;

    // Fetch transfers in period
    const transfers = accountId ? await prisma.transfer.findMany({
      where: {
        fromAccountId: accountId,
        createdAt: { gte: from, lte: to },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }) : [];

    // Current balance
    const balanceKobo = accountId ? await getAccountBalanceKobo(accountId) : 0;

    type TransferRow = { status: string; amount: number; fee: number; createdAt: Date; beneficiaryName: string; beneficiaryAccount: string; id: string };
    const totalDebitKobo  = transfers.filter((t: TransferRow) => t.status === 'COMPLETED').reduce((s: number, t: TransferRow) => s + t.amount + t.fee, 0);
    const totalFeeKobo    = transfers.filter((t: TransferRow) => t.status === 'COMPLETED').reduce((s: number, t: TransferRow) => s + t.fee, 0);

    const rows = transfers.map((t: TransferRow) => `
      <tr>
        <td>${formatDateTime(t.createdAt)}</td>
        <td>${t.beneficiaryName}</td>
        <td>${t.beneficiaryAccount}</td>
        <td style="text-align:right;color:#b94542;">${formatNGN(t.amount + t.fee)}</td>
        <td style="text-align:right;color:#82736b;font-size:11px;">${formatNGN(t.fee)}</td>
        <td style="text-align:center;">
          <span style="
            display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;
            background:${t.status === 'COMPLETED' ? 'rgba(40,119,78,.12)' : 'rgba(197,155,68,.15)'};
            color:${t.status === 'COMPLETED' ? '#28774e' : '#a07820'};
          ">${t.status}</span>
        </td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Nakconel Bank Statement</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', system-ui, sans-serif; background: #fff; color: #271817; font-size: 13px; }
    .page { max-width: 800px; margin: 0 auto; padding: 32px 28px; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid #651719; }
    .brand { display: flex; flex-direction: column; gap: 2px; }
    .brand-name { font-family: Georgia, serif; font-size: 22px; letter-spacing: .14em; color: #651719; font-weight: 700; }
    .brand-sub { font-family: Georgia, serif; font-size: 9px; letter-spacing: .36em; color: #82736b; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 18px; font-weight: 800; color: #271817; }
    .doc-title p { font-size: 12px; color: #82736b; margin-top: 4px; }

    /* Info grid */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .info-box { background: #f5efe4; border-radius: 12px; padding: 14px 16px; }
    .info-box label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #82736b; margin-bottom: 4px; }
    .info-box .val { font-size: 14px; font-weight: 700; color: #271817; }
    .info-box .val.big { font-size: 20px; font-weight: 800; color: #651719; }

    /* Summary row */
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .summary-card { border: 1px solid #e9dfd0; border-radius: 10px; padding: 12px 14px; }
    .summary-card label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #82736b; display: block; margin-bottom: 4px; }
    .summary-card .val { font-size: 15px; font-weight: 800; }

    /* Table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #651719; color: #fff; }
    thead th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
    tbody tr:nth-child(even) { background: #faf6f0; }
    tbody td { padding: 9px 12px; font-size: 12px; border-bottom: 1px solid #f0e8df; vertical-align: middle; }
    tbody tr:last-child td { border-bottom: none; }
    .no-tx { text-align: center; padding: 32px; color: #82736b; font-size: 13px; }

    /* Footer */
    .footer { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e9dfd0; display: flex; justify-content: space-between; font-size: 11px; color: #a19489; }

    /* Print */
    @media print {
      body { background: #fff; }
      .no-print { display: none !important; }
      .page { padding: 16px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="brand">
        <div class="brand-name">NAKCONEL</div>
        <div class="brand-sub">BANK</div>
      </div>
      <div class="doc-title">
        <h1>Account Statement</h1>
        <p>${formatDate(from)} — ${formatDate(to)}</p>
        <p style="margin-top:2px;">Generated: ${formatDateTime(new Date())}</p>
      </div>
    </div>

    <!-- Account info -->
    <div class="info-grid">
      <div class="info-box">
        <label>Account Holder</label>
        <div class="val">${user.fullName}</div>
        <div style="font-size:12px;color:#82736b;margin-top:3px;">${user.email}</div>
      </div>
      <div class="info-box">
        <label>Account Number</label>
        <div class="val">${account?.accountNumber ?? 'N/A'}</div>
        <div style="font-size:12px;color:#82736b;margin-top:3px;">Nakconel Bank · NGN</div>
      </div>
      <div class="info-box">
        <label>Current Balance</label>
        <div class="val big">${formatNGN(balanceKobo)}</div>
      </div>
      <div class="info-box">
        <label>Statement Period</label>
        <div class="val">${formatDate(from)} to ${formatDate(to)}</div>
      </div>
    </div>

    <!-- Summary -->
    <div class="summary">
      <div class="summary-card">
        <label>Total Transferred</label>
        <div class="val" style="color:#b94542;">${formatNGN(totalDebitKobo)}</div>
      </div>
      <div class="summary-card">
        <label>Total Fees Paid</label>
        <div class="val" style="color:#82736b;">${formatNGN(totalFeeKobo)}</div>
      </div>
      <div class="summary-card">
        <label>Transactions</label>
        <div class="val">${transfers.length}</div>
      </div>
    </div>

    <!-- Print button (hidden when printing) -->
    <div class="no-print" style="margin-bottom:20px;display:flex;gap:10px;">
      <button onclick="window.print()" style="padding:12px 24px;background:#651719;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">
        Download / Print PDF
      </button>
      <button onclick="window.close()" style="padding:12px 24px;background:transparent;color:#651719;border:1.5px solid #651719;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">
        Close
      </button>
    </div>

    <!-- Transactions table -->
    <table>
      <thead>
        <tr>
          <th>Date &amp; Time</th>
          <th>Beneficiary</th>
          <th>Account</th>
          <th style="text-align:right;">Amount</th>
          <th style="text-align:right;">Fee</th>
          <th style="text-align:center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="6" class="no-tx">No transactions in this period.</td></tr>`}
      </tbody>
    </table>

    <!-- Footer -->
    <div class="footer">
      <span>Nakconel Bank · Secure. Simple. Global.</span>
      <span>This statement is for informational purposes only.</span>
    </div>
  </div>

  <script>
    // Auto-trigger print dialog after page loads
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 600);
    });
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: unknown) {
    console.error('Statement error:', e);
    return new NextResponse('Could not generate statement', { status: 500 });
  }
}
