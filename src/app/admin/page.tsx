import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

function fmt(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });
}
function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
}
function statusBadge(s: string) {
  const green = s === 'VERIFIED' || s === 'COMPLETED';
  const amber = s === 'PENDING'  || s === 'PROCESSING';
  const c  = green ? '#28774e' : amber ? '#a07820' : '#b94542';
  const bg = green ? 'rgba(40,119,78,.12)' : amber ? 'rgba(197,155,68,.15)' : 'rgba(185,69,66,.1)';
  return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;background:${bg};color:${c};">${s}</span>`;
}
function th(label: string) {
  return `<th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;background:#651719;color:#f2d995;white-space:nowrap;">${label}</th>`;
}
function td(val: string | number, right = false) {
  return `<td style="padding:10px 14px;border-bottom:1px solid #f0e8df;font-size:13px;${right ? 'text-align:right;' : ''}">${val}</td>`;
}

type UserRow = {
  id: string; fullName: string; email: string; phone: string | null;
  kycStatus: string; role: string; createdAt: Date;
  accounts: { id: string; accountNumber: string | null }[];
};
type TransferRow = {
  id: string; beneficiaryName: string; beneficiaryAccount: string;
  amount: number; fee: number; status: string; createdAt: Date;
};
type KycRow = {
  id: string; idType: string; status: string; createdAt: Date;
  user: { fullName: string; email: string };
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token  = cookieStore.get('nakconel_session')?.value;
  const userId = token ? verifySessionToken(token) : null;
  if (!userId) redirect('/');

  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me || me.role !== 'owner') {
    return new Response(`<!DOCTYPE html><html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f5efe4;"><div style="text-align:center"><h1 style="color:#651719">Access Denied</h1><p style="color:#82736b;margin-top:8px">Admin access requires the owner role.</p><a href="/" style="display:inline-block;margin-top:16px;color:#651719">← Go back</a></div></body></html>`, { headers: { 'Content-Type': 'text/html' } });
  }

  const [users, transfers, kycSubs] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { accounts: { select: { id: true, accountNumber: true } } } }),
    prisma.transfer.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.kycSubmission.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { user: { select: { fullName: true, email: true } } } }),
  ]) as [UserRow[], TransferRow[], KycRow[]];

  const totalUsers    = users.length;
  const verifiedUsers = users.filter(u => u.kycStatus === 'VERIFIED').length;
  const pendingKyc    = kycSubs.filter(k => k.status === 'PENDING').length;
  const totalVolume   = transfers.filter(t => t.status === 'COMPLETED').reduce((s, t) => s + t.amount, 0);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Nakconel Admin</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'DM Sans',system-ui,sans-serif;background:#f5efe4;color:#271817;font-size:14px;}
    .header{background:linear-gradient(110deg,#3e0c11,#651719 66%,#4a1015);color:#fff8e9;padding:14px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10;border-bottom:2px solid #c59b44;}
    .header h1{font-family:Georgia,serif;font-size:17px;letter-spacing:.12em;color:#f2d995;}
    .header small{font-size:11px;opacity:.7;display:block;margin-top:2px;}
    .header a{color:#f2d995;font-size:12px;font-weight:700;text-decoration:none;border:1px solid rgba(242,217,149,.3);padding:6px 14px;border-radius:8px;}
    .content{max-width:1280px;margin:0 auto;padding:24px 20px;}
    .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;}
    .stat{background:#fffdf8;border:1px solid #e9dfd0;border-radius:14px;padding:16px 18px;}
    .stat label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#82736b;margin-bottom:5px;}
    .stat .val{font-size:22px;font-weight:800;color:#651719;}
    .section{background:#fffdf8;border:1px solid #e9dfd0;border-radius:14px;overflow:hidden;margin-bottom:20px;}
    .sh{padding:14px 18px;border-bottom:1px solid #e9dfd0;display:flex;align-items:center;justify-content:space-between;}
    .sh h2{font-size:14px;font-weight:700;}
    .sh small{font-size:12px;color:#82736b;}
    table{width:100%;border-collapse:collapse;}
    thead tr{background:#651719;}
    tbody tr:nth-child(even){background:#faf6f0;}
    tbody tr:hover{background:#f5ede0;}
    .empty{padding:28px;text-align:center;color:#82736b;font-size:13px;}
    @media(max-width:800px){.stats{grid-template-columns:1fr 1fr;}.content{padding:14px 10px;}}
  </style>
</head>
<body>
  <header class="header">
    <div><h1>NAKCONEL BANK ADMIN</h1><small>Signed in as ${me.fullName} · ${me.role}</small></div>
    <a href="/">← App</a>
  </header>
  <div class="content">

    <div class="stats">
      <div class="stat"><label>Total Users</label><div class="val">${totalUsers}</div></div>
      <div class="stat"><label>KYC Verified</label><div class="val" style="color:#28774e">${verifiedUsers}</div></div>
      <div class="stat"><label>Pending KYC</label><div class="val" style="color:${pendingKyc > 0 ? '#a07820' : '#28774e'}">${pendingKyc}</div></div>
      <div class="stat"><label>Transfer Volume</label><div class="val">${fmt(totalVolume)}</div></div>
    </div>

    <div class="section">
      <div class="sh"><h2>Users</h2><small>${totalUsers} registered</small></div>
      ${users.length === 0 ? '<div class="empty">No users yet</div>' : `
      <div style="overflow-x:auto;">
      <table>
        <thead><tr>${[th('Name'),th('Email'),th('Phone'),th('Account No.'),th('Role'),th('KYC'),th('Joined')].join('')}</tr></thead>
        <tbody>${users.map(u => `<tr>
          ${td(u.fullName)}${td(u.email)}${td(u.phone ?? '—')}
          ${td(u.accounts[0]?.accountNumber ?? '—')}
          ${td(u.role)}${td(statusBadge(u.kycStatus))}${td(fmtDate(u.createdAt))}
        </tr>`).join('')}</tbody>
      </table></div>`}
    </div>

    <div class="section">
      <div class="sh"><h2>KYC Submissions</h2><small>${kycSubs.length} total · ${pendingKyc} pending</small></div>
      ${kycSubs.length === 0 ? '<div class="empty">No KYC submissions</div>' : `
      <div style="overflow-x:auto;">
      <table>
        <thead><tr>${[th('User'),th('Email'),th('ID Type'),th('Status'),th('Submitted')].join('')}</tr></thead>
        <tbody>${kycSubs.map(k => `<tr>
          ${td(k.user.fullName)}${td(k.user.email)}${td(k.idType)}
          ${td(statusBadge(k.status))}${td(fmtDate(k.createdAt))}
        </tr>`).join('')}</tbody>
      </table></div>`}
    </div>

    <div class="section">
      <div class="sh"><h2>Recent Transfers</h2><small>${transfers.length} shown · ${fmt(totalVolume)} total</small></div>
      ${transfers.length === 0 ? '<div class="empty">No transfers yet</div>' : `
      <div style="overflow-x:auto;">
      <table>
        <thead><tr>${[th('Date'),th('Beneficiary'),th('Account'),th('Amount'),th('Fee'),th('Status')].join('')}</tr></thead>
        <tbody>${transfers.map(t => `<tr>
          ${td(fmtDate(t.createdAt))}${td(t.beneficiaryName)}${td(t.beneficiaryAccount)}
          ${td(fmt(t.amount),true)}${td(fmt(t.fee),true)}${td(statusBadge(t.status))}
        </tr>`).join('')}</tbody>
      </table></div>`}
    </div>

  </div>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
