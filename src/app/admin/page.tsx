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

function StatusPill({ s }: { s: string }) {
  const green = s === 'VERIFIED' || s === 'COMPLETED';
  const amber = s === 'PENDING'  || s === 'PROCESSING';
  const color = green ? '#28774e' : amber ? '#a07820' : '#b94542';
  const bg    = green ? 'rgba(40,119,78,.12)' : amber ? 'rgba(197,155,68,.15)' : 'rgba(185,69,66,.1)';
  return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:999, fontSize:10, fontWeight:700, background:bg, color }}>{s}</span>;
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token  = cookieStore.get('nakconel_session')?.value;
  const userId = token ? verifySessionToken(token) : null;
  if (!userId) redirect('/');

  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) redirect('/');

  if (me.role !== 'owner' && me.role !== 'admin') {
    return (
      <html lang="en">
        <head><meta charSet="UTF-8"/><title>Admin — Access Denied</title></head>
        <body style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5efe4', fontFamily:'system-ui,sans-serif', margin:0 } as React.CSSProperties}>
          <div style={{ textAlign:'center', padding:32 }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
            <h1 style={{ color:'#651719', marginBottom:8, fontSize:24 }}>Access Denied</h1>
            <p style={{ color:'#82736b', marginBottom:4 }}>Your account role is: <strong>{me.role ?? 'customer'}</strong></p>
            <p style={{ color:'#82736b', marginBottom:24, fontSize:13 }}>Admin access requires the <strong>owner</strong> or <strong>admin</strong> role.</p>
            <p style={{ color:'#82736b', fontSize:12, background:'#f0e8df', padding:'12px 16px', borderRadius:10, marginBottom:20 }}>
              To grant access, run this SQL in Neon console:<br/>
              <code style={{ fontFamily:'monospace', color:'#651719' }}>
                UPDATE &quot;User&quot; SET role = &apos;owner&apos; WHERE email = &apos;{me.email}&apos;;
              </code>
            </p>
            <a href="/" style={{ display:'inline-block', color:'#651719', fontWeight:700, textDecoration:'none', border:'1px solid #651719', padding:'10px 20px', borderRadius:10 }}>← Go back to app</a>
          </div>
        </body>
      </html>
    );
  }

  const [users, transfers, kycSubs] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt:'desc' }, take:100, include: { accounts: { select:{ id:true, accountNumber:true } } } }),
    prisma.transfer.findMany({ orderBy: { createdAt:'desc' }, take:100 }),
    prisma.kycSubmission.findMany({ orderBy: { createdAt:'desc' }, take:100, include: { user:{ select:{ fullName:true, email:true } } } }),
  ]);

  const totalUsers    = users.length;
  const verifiedUsers = users.filter((u: { kycStatus: string }) => u.kycStatus === 'VERIFIED').length;
  const pendingKyc    = kycSubs.filter((k: { status: string }) => k.status === 'PENDING').length;
  const totalVolume   = transfers.filter((t: { status: string; amount: number }) => t.status === 'COMPLETED').reduce((s: number, t: { amount: number }) => s + t.amount, 0);

  const th = (label: string) => (
    <th style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.04em', background:'#651719', color:'#f2d995', whiteSpace:'nowrap' }}>{label}</th>
  );
  const td = (val: React.ReactNode, right = false) => (
    <td style={{ padding:'10px 14px', borderBottom:'1px solid #f0e8df', fontSize:13, textAlign: right ? 'right' : 'left' }}>{val}</td>
  );

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
        <title>Nakconel Admin</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap"/>
        <style>{`
          *{box-sizing:border-box;margin:0;padding:0;}
          body{font-family:'DM Sans',system-ui,sans-serif;background:#f5efe4;color:#271817;font-size:14px;}
          table{width:100%;border-collapse:collapse;}
          thead tr{background:#651719;}
          tbody tr:nth-child(even){background:#faf6f0;}
          tbody tr:hover{background:#f5ede0;}
          .section{background:#fffdf8;border:1px solid #e9dfd0;border-radius:14px;overflow:hidden;margin-bottom:20px;}
          .sh{padding:14px 18px;border-bottom:1px solid #e9dfd0;display:flex;align-items:center;justify-content:space-between;}
          .empty{padding:28px;text-align:center;color:#82736b;font-size:13px;}
          @media(max-width:800px){.stats{grid-template-columns:1fr 1fr!important;}}
        `}</style>
      </head>
      <body>
        {/* Header */}
        <div style={{ background:'linear-gradient(110deg,#3e0c11,#651719 66%,#4a1015)', color:'#fff8e9', padding:'14px 32px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10, borderBottom:'2px solid #c59b44' }}>
          <div>
            <div style={{ fontFamily:'Georgia,serif', fontSize:17, letterSpacing:'.12em', color:'#f2d995', fontWeight:700 }}>NAKCONEL BANK ADMIN</div>
            <div style={{ fontSize:11, opacity:.7, marginTop:2 }}>Signed in as {me.fullName} · {me.role}</div>
          </div>
          <a href="/" style={{ color:'#f2d995', fontSize:12, fontWeight:700, textDecoration:'none', border:'1px solid rgba(242,217,149,.3)', padding:'6px 14px', borderRadius:8 }}>← App</a>
        </div>

        <div style={{ maxWidth:1280, margin:'0 auto', padding:'24px 20px' }}>

          {/* Stats */}
          <div className="stats" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
            {[
              { label:'Total Users',     val:totalUsers,    color:'#651719'                              },
              { label:'KYC Verified',    val:verifiedUsers, color:'#28774e'                              },
              { label:'Pending KYC',     val:pendingKyc,    color: pendingKyc > 0 ? '#a07820' : '#28774e'},
              { label:'Transfer Volume', val:fmt(totalVolume), color:'#651719'                           },
            ].map(s => (
              <div key={s.label} style={{ background:'#fffdf8', border:'1px solid #e9dfd0', borderRadius:14, padding:'16px 18px' }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'#82736b', marginBottom:5 }}>{s.label}</div>
                <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Users */}
          <div className="section">
            <div className="sh"><h2 style={{ fontSize:14, fontWeight:700 }}>Users</h2><small style={{ fontSize:12, color:'#82736b' }}>{totalUsers} registered</small></div>
            {users.length === 0
              ? <div className="empty">No users yet</div>
              : <div style={{ overflowX:'auto' }}><table>
                  <thead><tr>{[th('Name'),th('Email'),th('Phone'),th('Account No.'),th('Role'),th('KYC'),th('Joined')]}</tr></thead>
                  <tbody>
                    {users.map((u: { id: string; fullName: string; email: string; phone: string | null; role: string | null; kycStatus: string; createdAt: Date; accounts: { id: string; accountNumber: string | null }[] }) => (
                      <tr key={u.id}>
                        {td(u.fullName)}{td(u.email)}{td(u.phone ?? '—')}
                        {td(u.accounts[0]?.accountNumber ?? '—')}
                        {td(u.role ?? 'customer')}{td(<StatusPill s={u.kycStatus} />)}{td(fmtDate(u.createdAt))}
                      </tr>
                    ))}
                  </tbody>
                </table></div>
            }
          </div>

          {/* KYC */}
          <div className="section">
            <div className="sh"><h2 style={{ fontSize:14, fontWeight:700 }}>KYC Submissions</h2><small style={{ fontSize:12, color:'#82736b' }}>{kycSubs.length} total · {pendingKyc} pending</small></div>
            {kycSubs.length === 0
              ? <div className="empty">No KYC submissions</div>
              : <div style={{ overflowX:'auto' }}><table>
                  <thead><tr>{[th('User'),th('Email'),th('ID Type'),th('Status'),th('Submitted')]}</tr></thead>
                  <tbody>
                    {kycSubs.map((k: { id: string; idType: string; status: string; createdAt: Date; user: { fullName: string; email: string } }) => (
                      <tr key={k.id}>
                        {td(k.user.fullName)}{td(k.user.email)}{td(k.idType)}
                        {td(<StatusPill s={k.status} />)}{td(fmtDate(k.createdAt))}
                      </tr>
                    ))}
                  </tbody>
                </table></div>
            }
          </div>

          {/* Transfers */}
          <div className="section">
            <div className="sh"><h2 style={{ fontSize:14, fontWeight:700 }}>Recent Transfers</h2><small style={{ fontSize:12, color:'#82736b' }}>{transfers.length} shown · {fmt(totalVolume)} total</small></div>
            {transfers.length === 0
              ? <div className="empty">No transfers yet</div>
              : <div style={{ overflowX:'auto' }}><table>
                  <thead><tr>{[th('Date'),th('Beneficiary'),th('Account'),th('Amount'),th('Fee'),th('Status')]}</tr></thead>
                  <tbody>
                    {transfers.map((t: { id: string; beneficiaryName: string; beneficiaryAccount: string; amount: number; fee: number; status: string; createdAt: Date }) => (
                      <tr key={t.id}>
                        {td(fmtDate(t.createdAt))}{td(t.beneficiaryName)}{td(t.beneficiaryAccount)}
                        {td(fmt(t.amount),true)}{td(fmt(t.fee),true)}{td(<StatusPill s={t.status} />)}
                      </tr>
                    ))}
                  </tbody>
                </table></div>
            }
          </div>

        </div>
      </body>
    </html>
  );
}
