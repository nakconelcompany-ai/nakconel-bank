import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

function fmt(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });
}
function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString('en-NG', { day:'2-digit', month:'short', year:'numeric' });
}
function fmtDateTime(d: Date) {
  return new Date(d).toLocaleString('en-NG', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function StatusPill({ s }: { s: string }) {
  const green = s === 'VERIFIED' || s === 'COMPLETED' || s === 'ACTIVE' || s === 'owner';
  const amber = s === 'PENDING'  || s === 'PROCESSING' || s === 'NONE';
  const color = green ? '#28774e' : amber ? '#a07820' : '#b94542';
  const bg    = green ? 'rgba(40,119,78,.12)' : amber ? 'rgba(197,155,68,.15)' : 'rgba(185,69,66,.1)';
  return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:999, fontSize:10, fontWeight:700, background:bg, color }}>{s}</span>;
}

export default async function AdminPage() {
  // Auth check
  const cookieStore = await cookies();
  const token  = cookieStore.get('nakconel_session')?.value;
  const userId = token ? verifySessionToken(token) : null;
  if (!userId) redirect('/admin/login');

  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me || (me.role !== 'owner' && me.role !== 'admin')) {
    redirect('/admin/login');
  }

  const [users, transfers, kycSubs, businesses, giftCards, riskFlags, supportTickets] = await Promise.all([
    prisma.user.findMany({ orderBy:{ createdAt:'desc' }, take:200, include:{ accounts:{ select:{ id:true, accountNumber:true } } } }),
    prisma.transfer.findMany({ orderBy:{ createdAt:'desc' }, take:200 }),
    prisma.kycSubmission.findMany({ orderBy:{ createdAt:'desc' }, take:200, include:{ user:{ select:{ fullName:true, email:true } } } }),
    prisma.businessProfile.findMany({ orderBy:{ createdAt:'desc' }, take:50, include:{ user:{ select:{ fullName:true, email:true } } } }),
    (prisma as any).giftCard.findMany({ orderBy:{ createdAt:'desc' }, take:50 }),
    (prisma as any).aiRiskAssessment.findMany({ where: { riskLevel: { in: ['HIGH', 'CRITICAL'] } }, orderBy: { createdAt: 'desc' }, take: 50 }),
    (prisma as any).supportTicket.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);

  const totalUsers     = users.length;
  const verifiedUsers  = users.filter((u: { kycStatus: string }) => u.kycStatus === 'VERIFIED').length;
  const pendingKyc     = kycSubs.filter((k: { status: string }) => k.status === 'PENDING').length;
  const completedTxns  = transfers.filter((t: { status: string }) => t.status === 'COMPLETED');
  const totalVolume    = completedTxns.reduce((s: number, t: { amount: number }) => s + t.amount, 0);
  const totalFees      = completedTxns.reduce((s: number, t: { fee: number }) => s + t.fee, 0);

  const th = (label: string) => (
    <th style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'.04em', background:'#651719', color:'#f2d995', whiteSpace:'nowrap' as const }}>{label}</th>
  );
  const td = (val: React.ReactNode, right = false) => (
    <td style={{ padding:'10px 14px', borderBottom:'1px solid #f0e8df', fontSize:13, textAlign: right ? 'right' as const : 'left' as const, verticalAlign:'middle' as const }}>{val}</td>
  );

  const Section = ({ title, count, children }: { title: string; count: number; children: React.ReactNode }) => (
    <div style={{ background:'#fffdf8', border:'1px solid #e9dfd0', borderRadius:14, overflow:'hidden', marginBottom:20 }}>
      <div style={{ padding:'14px 18px', borderBottom:'1px solid #e9dfd0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h2 style={{ fontSize:14, fontWeight:700, color:'#271817' }}>{title}</h2>
        <span style={{ fontSize:12, color:'#82736b' }}>{count} records</span>
      </div>
      {children}
    </div>
  );

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
        <title>Nakconel Bank — Admin Dashboard</title>
        <style>{`
          *{box-sizing:border-box;margin:0;padding:0;}
          body{font-family:'DM Sans',system-ui,sans-serif;background:#f5efe4;color:#271817;font-size:14px;}
          table{width:100%;border-collapse:collapse;}
          thead tr{background:#651719;}
          tbody tr:nth-child(even){background:#faf6f0;}
          tbody tr:hover{background:#f5ede0;}
          .wrap{overflow-x:auto;}
          .empty{padding:28px;text-align:center;color:#82736b;font-size:13px;}
          .tabs{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;}
          .tab-btn{padding:9px 18px;border-radius:999px;border:1px solid #e9dfd0;background:#fffdf8;color:#82736b;font-size:12px;font-weight:700;cursor:pointer;text-decoration:none;}
          .tab-btn.active{background:#651719;border-color:#651719;color:#fff9eb;}
          @media(max-width:800px){.stats{grid-template-columns:1fr 1fr!important;}.content{padding:14px 10px!important;}}
        `}</style>
      </head>
      <body>
        {/* Header */}
        <div style={{ background:'linear-gradient(110deg,#3e0c11,#651719 66%,#4a1015)', color:'#fff8e9', padding:'14px 32px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky' as const, top:0, zIndex:10, borderBottom:'2px solid #c59b44' }}>
          <div>
            <div style={{ fontFamily:'Georgia,serif', fontSize:17, letterSpacing:'.12em', color:'#f2d995', fontWeight:700 }}>NAKCONEL BANK</div>
            <div style={{ fontSize:11, opacity:.7, marginTop:2 }}>Admin Dashboard · {me.fullName} · {me.role}</div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <a href="/" style={{ color:'#f2d995', fontSize:12, fontWeight:700, textDecoration:'none', border:'1px solid rgba(242,217,149,.3)', padding:'6px 14px', borderRadius:8 }}>← App</a>
            <form action="/api/v1/auth/logout" method="POST" style={{ display:'inline' }}>
              <button type="submit" style={{ color:'#f2d995', fontSize:12, fontWeight:700, border:'1px solid rgba(242,217,149,.3)', padding:'6px 14px', borderRadius:8, background:'transparent', cursor:'pointer' }}>Sign out</button>
            </form>
          </div>
        </div>

        <div className="content" style={{ maxWidth:1400, margin:'0 auto', padding:'24px 20px' }}>

          {/* Stats */}
          <div className="stats" style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
            {[
              { label:'Total Users',    val:totalUsers,            color:'#651719' },
              { label:'KYC Verified',   val:verifiedUsers,         color:'#28774e' },
              { label:'Pending KYC',    val:pendingKyc,            color: pendingKyc > 0 ? '#a07820' : '#28774e' },
              { label:'Transfer Volume',val:fmt(totalVolume),      color:'#651719' },
              { label:'Total Fees',     val:fmt(totalFees),        color:'#651719' },
            ].map(s => (
              <div key={s.label} style={{ background:'#fffdf8', border:'1px solid #e9dfd0', borderRadius:14, padding:'16px 18px' }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'.05em', color:'#82736b', marginBottom:5 }}>{s.label}</div>
                <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Users */}
          <Section title="Users" count={totalUsers}>
            {users.length === 0 ? <div className="empty">No users</div> : (
              <div className="wrap"><table>
                <thead><tr>{[th('Name'),th('Email'),th('Phone'),th('Account No.'),th('Role'),th('KYC'),th('Joined')]}</tr></thead>
                <tbody>
                  {users.map((u: { id: string; fullName: string; email: string; phone: string | null; role: string | null; kycStatus: string; createdAt: Date; accounts: { id: string; accountNumber: string | null }[] }) => (
                    <tr key={u.id}>
                      {td(u.fullName)}{td(u.email)}{td(u.phone ?? '—')}
                      {td(u.accounts[0]?.accountNumber ?? '—')}
                      {td(<StatusPill s={u.role ?? 'customer'} />)}
                      {td(<StatusPill s={u.kycStatus} />)}
                      {td(fmtDate(u.createdAt))}
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </Section>

          {/* KYC */}
          <Section title="KYC Submissions" count={kycSubs.length}>
            {kycSubs.length === 0 ? <div className="empty">No KYC submissions</div> : (
              <div className="wrap"><table>
                <thead><tr>{[th('User'),th('Email'),th('ID Type'),th('Status'),th('Submitted')]}</tr></thead>
                <tbody>
                  {kycSubs.map((k: { id: string; idType: string; status: string; createdAt: Date; user: { fullName: string; email: string } }) => (
                    <tr key={k.id}>
                      {td(k.user.fullName)}{td(k.user.email)}{td(k.idType)}
                      {td(<StatusPill s={k.status} />)}{td(fmtDateTime(k.createdAt))}
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </Section>

          {/* Transfers */}
          <Section title="Transfers" count={transfers.length}>
            {transfers.length === 0 ? <div className="empty">No transfers</div> : (
              <div className="wrap"><table>
                <thead><tr>{[th('Date'),th('Beneficiary'),th('Account'),th('Amount'),th('Fee'),th('Status')]}</tr></thead>
                <tbody>
                  {transfers.map((t: { id: string; beneficiaryName: string; beneficiaryAccount: string; amount: number; fee: number; status: string; createdAt: Date }) => (
                    <tr key={t.id}>
                      {td(fmtDateTime(t.createdAt))}{td(t.beneficiaryName)}{td(t.beneficiaryAccount)}
                      {td(fmt(t.amount),true)}{td(fmt(t.fee),true)}
                      {td(<StatusPill s={t.status} />)}
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </Section>

          {/* Businesses */}
          <Section title="Business Profiles" count={businesses.length}>
            {businesses.length === 0 ? <div className="empty">No business profiles</div> : (
              <div className="wrap"><table>
                <thead><tr>{[th('Business'),th('Owner'),th('Email'),th('Type'),th('Status'),th('Created')]}</tr></thead>
                <tbody>
                  {businesses.map((b: { id: string; businessName: string; businessType: string; status: string; createdAt: Date; user: { fullName: string; email: string } }) => (
                    <tr key={b.id}>
                      {td(b.businessName)}{td(b.user.fullName)}{td(b.user.email)}
                      {td(b.businessType)}{td(<StatusPill s={b.status} />)}{td(fmtDate(b.createdAt))}
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </Section>

          {/* Gift Cards & Incentives */}
          <Section title="Nakconel Gift Cards & Rewards" count={giftCards.length}>
            {giftCards.length === 0 ? <div className="empty">No gift cards issued yet</div> : (
              <div className="wrap"><table>
                <thead><tr>{[th('Code'),th('Occasion'),th('Amount'),th('Balance'),th('Status'),th('Created'),th('Expires')]}</tr></thead>
                <tbody>
                  {giftCards.map((g: any) => (
                    <tr key={g.id}>
                      {td(<span style={{ fontFamily:'monospace', fontWeight:700 }}>{g.codeMasked}</span>)}
                      {td(g.occasion)}
                      {td(fmt(g.amount), true)}
                      {td(fmt(g.balance), true)}
                      {td(<StatusPill s={g.status} />)}
                      {td(fmtDate(g.createdAt))}
                      {td(fmtDate(g.expiresAt))}
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </Section>

          {/* AI Risk Flags & Fraud Monitoring */}
          <Section title="AI Fraud Risk Flags (High / Critical)" count={riskFlags.length}>
            {riskFlags.length === 0 ? <div className="empty">No high or critical risk alerts detected</div> : (
              <div className="wrap"><table>
                <thead><tr>{[th('Action'),th('Risk Score'),th('Risk Level'),th('Factors'),th('User ID'),th('IP / Agent'),th('Timestamp')]}</tr></thead>
                <tbody>
                  {riskFlags.map((r: any) => (
                    <tr key={r.id}>
                      {td(r.action)}
                      {td(<span style={{ fontWeight: 700, color: r.riskScore >= 80 ? '#b94542' : '#a07820' }}>{r.riskScore}/100</span>)}
                      {td(<StatusPill s={r.riskLevel} />)}
                      {td(Array.isArray(r.factors) ? r.factors.join(', ') : 'None')}
                      {td(<span style={{ fontFamily:'monospace', fontSize:11 }}>{r.userId.slice(0, 10)}…</span>)}
                      {td(r.ipAddress || r.userAgent ? `${r.ipAddress || ''} ${r.userAgent || ''}`.slice(0, 30) : '—')}
                      {td(fmtDateTime(r.createdAt))}
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </Section>

          {/* Support Tickets & AI Resolution */}
          <Section title="Customer Support Tickets (AI Assisted)" count={supportTickets.length}>
            {supportTickets.length === 0 ? <div className="empty">No support tickets submitted</div> : (
              <div className="wrap"><table>
                <thead><tr>{[th('Subject'),th('Category'),th('Status'),th('AI Response'),th('Created')]}</tr></thead>
                <tbody>
                  {supportTickets.map((s: any) => (
                    <tr key={s.id}>
                      {td(<strong>{s.subject}</strong>)}
                      {td(s.category)}
                      {td(<StatusPill s={s.status} />)}
                      {td(<span style={{ fontSize: 12, color: '#555' }}>{(s.aiResponse || '—').slice(0, 80)}…</span>)}
                      {td(fmtDateTime(s.createdAt))}
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </Section>

        </div>
      </body>
    </html>
  );
}
