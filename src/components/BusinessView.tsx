'use client';

import { useCallback, useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import BusinessDemoView from '@/components/BusinessDemoView';
import {
  apiBizAnalytics,
  apiBizProfile,
  apiCreateInvoice,
  apiListInvoices,
  apiListPaymentLinks,
  apiListCollections,
  apiStartBusinessCollection,
  apiCreateExpense,
  apiListExpenses,
  apiAddTeamMember,
  apiListTeam,
} from '@/lib/api';

type Tab = 'overview' | 'invoices' | 'links' | 'collections' | 'expenses' | 'team';

function formatNGN(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(n);
}

function StatusPill({ status, verified = false }: { status: string; verified?: boolean }) {
  const s = status.toUpperCase();
  const paid = s === 'COMPLETED' || s === 'ACTIVE';
  const warn = s === 'UNPAID' || s === 'SENT' || s === 'OVERDUE' || s === 'PENDING';
  const bg = paid ? 'rgba(95,212,146,0.15)' : warn ? 'rgba(240,215,140,0.12)' : 'rgba(255,255,255,0.06)';
  const color = paid ? '#5fd492' : warn ? '#f0d78c' : 'rgba(247,236,212,0.55)';
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        padding: '3px 8px',
        borderRadius: 999,
        background: bg,
        color,
        textTransform: 'uppercase',
      }}
    >
      {s === 'PAID' ? (verified ? 'PAID · VERIFIED' : 'PAID · UNVERIFIED') : status}
    </span>
  );
}

type Props = {
  fullName: string;
  onToast: (m: string) => void;
  onBack?: () => void;
};

export default function BusinessView({ fullName, onToast }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [showDemo, setShowDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof apiBizAnalytics>> | null>(null);
  const [invoices, setInvoices] = useState<Awaited<ReturnType<typeof apiListInvoices>>>([]);
  const [links, setLinks] = useState<Awaited<ReturnType<typeof apiListPaymentLinks>>>([]);
  const [collections, setCollections] = useState<Awaited<ReturnType<typeof apiListCollections>>>([]);
  const [expenses, setExpenses] = useState<Awaited<ReturnType<typeof apiListExpenses>>>([]);
  const [team, setTeam] = useState<Awaited<ReturnType<typeof apiListTeam>>>([]);

  const [invCustomer, setInvCustomer] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invDesc, setInvDesc] = useState('');
  const [invPreview, setInvPreview] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('OTHER');
  const [tmName, setTmName] = useState('');
  const [tmEmail, setTmEmail] = useState('');
  const [tmSalary, setTmSalary] = useState('');
  const [collectionAmount, setCollectionAmount] = useState('');
  const [collectionEmail, setCollectionEmail] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [invoiceCheckoutUrls, setInvoiceCheckoutUrls] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    try {
      await apiBizProfile(`${fullName.split(' ')[0]} Business`);
      const [a, inv, lk, col, exp, tm] = await Promise.all([
        apiBizAnalytics(),
        apiListInvoices(),
        apiListPaymentLinks(),
        apiListCollections(),
        apiListExpenses(),
        apiListTeam(),
      ]);
      setAnalytics(a);
      setInvoices(inv);
      setLinks(lk);
      setCollections(col);
      setExpenses(exp);
      setTeam(tm);
    } catch (e: unknown) {
      onToast(e instanceof Error ? e.message : 'Could not load business data');
    }
  }, [fullName, onToast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (showDemo) {
    return <BusinessDemoView onBack={() => setShowDemo(false)} />;
  }

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
      await refresh();
    } catch (e: unknown) {
      onToast(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'links', label: 'Links' },
    { id: 'collections', label: 'Inflows' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'team', label: 'Team' },
  ];

  return (
    <div style={{ paddingBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <Logo size={40} />
        <div>
          <h2 className="page-title" style={{ marginBottom: 0 }}>
            {analytics?.businessName || 'Business'}
          </h2>
          <p style={{ fontSize: 12, color: '#d4af37', marginTop: 2, fontWeight: 600 }}>Nakconel Business</p>
        </div>
      </div>

      <div className="glass" style={{ padding: 14, marginTop: 14 }}>
        <p style={{ fontWeight: 600, fontSize: 13 }}>Test collections only</p>
        <p style={{ color: 'rgba(247,236,212,0.5)', fontSize: 12, lineHeight: 1.5, marginTop: 4 }}>
          Only Nigeria/NGN Paystack test collections are available when explicitly enabled. Payment links, payroll, and production money movement remain disabled.
        </p>
        <button type="button" className="btn-ghost" onClick={() => setShowDemo(true)} style={{ marginTop: 10 }}>
          Explore business demo
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, marginTop: 16 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'btn-gold' : 'btn-ghost'}
            style={{
              width: 'auto',
              padding: '8px 14px',
              borderRadius: 999,
              fontSize: 12,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div className="glass" style={{ padding: 16 }}>
              <p className="field-label" style={{ marginBottom: 0 }}>RECORDED INFLOWS · UNVERIFIED</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#5fd492', marginTop: 8 }}>
                {formatNGN(analytics?.totalCollected || 0)}
              </p>
            </div>
            <div className="glass" style={{ padding: 16 }}>
              <p className="field-label" style={{ marginBottom: 0 }}>EXPENSES</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#f0d78c', marginTop: 8 }}>
                {formatNGN(analytics?.totalExpenses || 0)}
              </p>
            </div>
            <div className="glass" style={{ padding: 16 }}>
              <p className="field-label" style={{ marginBottom: 0 }}>NET RECORDED · UNVERIFIED</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: (analytics?.net || 0) >= 0 ? '#5fd492' : '#e07070', marginTop: 8 }}>
                {formatNGN(analytics?.net || 0)}
              </p>
            </div>
            <div className="glass" style={{ padding: 16 }}>
              <p className="field-label" style={{ marginBottom: 0 }}>UNPAID</p>
              <p style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>
                {analytics?.unpaidInvoices || 0}
                <span style={{ fontSize: 12, color: 'rgba(247,236,212,0.45)', fontWeight: 500 }}>
                  {' '}· {formatNGN(analytics?.unpaidAmount || 0)}
                </span>
              </p>
            </div>
          </div>
          <div className="glass" style={{ padding: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 12 }}>Snapshot</p>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                ['Active payment links (disabled)', analytics?.activeLinks || 0],
                ['Team members', analytics?.teamCount || 0],
                ['Collections', analytics?.collectionCount || 0],
              ].map(([label, val]) => (
                <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'rgba(247,236,212,0.55)' }}>{label}</span>
                  <strong style={{ color: '#f0d78c' }}>{val}</strong>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'invoices' && (
        <>
          <div className="glass" style={{ padding: 16, marginBottom: 14 }}>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>New invoice</p>
            <p style={{ fontSize: 12, color: 'rgba(247,236,212,0.45)', marginBottom: 14, lineHeight: 1.5 }}>
              Invoices are records. Nigeria/NGN Paystack checkouts are available only in explicitly enabled test environments.
            </p>
            {!invPreview ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="field-label">Customer name</label>
                  <input className="input" placeholder="e.g. Ada Stores Ltd" value={invCustomer} onChange={(e) => setInvCustomer(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Customer email (optional)</label>
                  <input className="input" placeholder="customer@email.com" type="email" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Amount (NGN)</label>
                  <input className="input" placeholder="50000" inputMode="decimal" value={invAmount} onChange={(e) => setInvAmount(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">What is this for?</label>
                  <input className="input" placeholder="e.g. October supply" value={invDesc} onChange={(e) => setInvDesc(e.target.value)} />
                </div>
                <button
                  type="button"
                  className="btn-gold"
                  disabled={loading}
                  onClick={() => {
                    if (!invCustomer.trim() || !invAmount || parseFloat(invAmount) <= 0) {
                      onToast('Customer name and amount required');
                      return;
                    }
                    setInvPreview(true);
                  }}
                >
                  Review invoice
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="glass" style={{ padding: 14, background: 'rgba(0,0,0,0.25)' }}>
                  <p style={{ fontSize: 11, color: 'rgba(247,236,212,0.45)', letterSpacing: '0.06em', fontWeight: 600 }}>INVOICE PREVIEW</p>
                  <p style={{ fontWeight: 700, fontSize: 18, marginTop: 10 }}>{invCustomer}</p>
                  {invEmail ? <p style={{ fontSize: 12, color: 'rgba(247,236,212,0.5)', marginTop: 4 }}>{invEmail}</p> : null}
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#f0d78c', marginTop: 12 }}>{formatNGN(parseFloat(invAmount) || 0)}</p>
                  {invDesc ? <p style={{ fontSize: 13, color: 'rgba(247,236,212,0.55)', marginTop: 8 }}>{invDesc}</p> : null}
                </div>
                <button
                  type="button"
                  className="btn-gold"
                  disabled={loading}
                  onClick={() =>
                    run(async () => {
                      await apiCreateInvoice({
                        customerName: invCustomer.trim(),
                        customerEmail: invEmail.trim() || undefined,
                        amount: parseFloat(invAmount),
                        description: invDesc.trim() || undefined,
                      });
                      setInvCustomer('');
                      setInvEmail('');
                      setInvAmount('');
                      setInvDesc('');
                      setInvPreview(false);
                      onToast('Invoice created');
                    })
                  }
                >
                  {loading ? 'Creating…' : 'Confirm & create'}
                </button>
                <button type="button" className="btn-ghost" style={{ padding: 12 }} onClick={() => setInvPreview(false)}>
                  Edit details
                </button>
              </div>
            )}
          </div>
          <div className="glass" style={{ padding: '4px 16px' }}>
            {invoices.length === 0 ? (
              <p style={{ color: 'rgba(247,236,212,0.45)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No invoices yet</p>
            ) : (
              invoices.map((inv) => (
                <div key={inv.id} className="tx-row" style={{ alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>{inv.invoiceNumber}</span>
                      <StatusPill status={inv.status} verified={inv.paymentProvider === 'PAYSTACK_TEST'} />
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(247,236,212,0.45)', marginTop: 4 }}>{inv.customerName}</div>
                    <div style={{ fontWeight: 700, color: '#f0d78c', marginTop: 6 }}>{formatNGN(inv.amount)}</div>
                    {inv.status !== 'PAID' && inv.customerEmail ? (
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ width: 'auto', padding: '7px 10px', marginTop: 8, fontSize: 11 }}
                        disabled={loading}
                        onClick={() =>
                          run(async () => {
                            const checkout = await apiStartBusinessCollection({
                              source: 'INVOICE',
                              sourceId: inv.id,
                            });
                            setInvoiceCheckoutUrls((current) => ({
                              ...current,
                              [inv.id]: checkout.authorizationUrl,
                            }));
                            onToast('Test checkout created. The invoice is paid only after provider verification.');
                          })
                        }
                      >
                        Create test checkout
                      </button>
                    ) : null}
                    {invoiceCheckoutUrls[inv.id] ? (
                      <div>
                        <a href={invoiceCheckoutUrls[inv.id]} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#f0d78c' }}>
                          Open Paystack checkout
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === 'links' && (
        <>
          <div className="glass" style={{ padding: 16, marginBottom: 14 }}>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>Payment links unavailable</p>
            <p style={{ color: 'rgba(247,236,212,0.5)', fontSize: 12, lineHeight: 1.5 }}>
              Payment collection is not connected. Use the separate demo to preview simulated payment-link workflows.
            </p>
          </div>
          <div className="glass" style={{ padding: '4px 16px' }}>
            {links.length === 0 ? (
              <p style={{ color: 'rgba(247,236,212,0.45)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No payment links yet</p>
            ) : (
              links.map((lk) => (
                <div key={lk.id} className="tx-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>{lk.title}</div>
                    <div style={{ fontSize: 11, color: 'rgba(247,236,212,0.45)', marginTop: 2 }}>
                      Saved record · payment processing unavailable
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <div style={{ fontWeight: 700, color: '#f0d78c' }}>{lk.amount != null ? formatNGN(lk.amount) : 'Open'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === 'collections' && (
        <>
          <div className="glass" style={{ padding: 16, marginBottom: 14 }}>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>Start a test collection</p>
            <p style={{ fontSize: 12, color: 'rgba(247,236,212,0.5)', lineHeight: 1.5, marginBottom: 12 }}>
              Nigeria · NGN · Paystack test mode only. A collection is marked complete only after provider verification.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                className="input"
                placeholder="Amount (NGN)"
                inputMode="decimal"
                value={collectionAmount}
                onChange={(event) => setCollectionAmount(event.target.value)}
              />
              <input
                className="input"
                type="email"
                placeholder="Payer email"
                value={collectionEmail}
                onChange={(event) => setCollectionEmail(event.target.value)}
              />
              <button
                type="button"
                className="btn-gold"
                disabled={loading}
                onClick={() =>
                  run(async () => {
                    const amount = Number(collectionAmount);
                    if (!Number.isFinite(amount) || amount <= 0 || !collectionEmail.trim()) {
                      throw new Error('Enter a valid amount and payer email.');
                    }
                    const result = await apiStartBusinessCollection({
                      source: 'DIRECT',
                      amount,
                      payerEmail: collectionEmail.trim(),
                    });
                    setCheckoutUrl(result.authorizationUrl);
                    setCollectionAmount('');
                    onToast('Test checkout created. The collection is not complete until Paystack confirms payment.');
                  })
                }
              >
                {loading ? 'Preparing checkout…' : 'Create secure checkout'}
              </button>
              {checkoutUrl ? (
                <a className="btn-ghost" href={checkoutUrl} target="_blank" rel="noreferrer">
                  Open Paystack checkout
                </a>
              ) : null}
            </div>
          </div>
          <div className="glass" style={{ padding: '4px 16px' }}>
            {collections.length === 0 ? (
              <p style={{ color: 'rgba(247,236,212,0.45)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
                No collections yet
              </p>
            ) : (
              collections.map((c) => (
                <div key={c.id} className="tx-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.reference}</div>
                    <div style={{ fontSize: 12, color: 'rgba(247,236,212,0.45)', marginTop: 2 }}>
                      {c.source} · {c.payerName || 'Payer'} · {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: c.status === 'COMPLETED' ? '#5fd492' : '#f0d78c' }}>
                      {c.status === 'COMPLETED' ? '+' : ''}{formatNGN(c.amount)}
                    </div>
                    <StatusPill status={c.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === 'expenses' && (
        <>
          <div className="glass" style={{ padding: 16, marginBottom: 14 }}>
            <p style={{ fontWeight: 600, marginBottom: 12 }}>Log expense</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select className="input" value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
                {['RENT', 'SALARY', 'UTILITIES', 'SUPPLIES', 'MARKETING', 'OTHER'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input className="input" placeholder="Title" value={expTitle} onChange={(e) => setExpTitle(e.target.value)} />
              <input className="input" placeholder="Amount (NGN)" inputMode="decimal" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
              <button
                type="button"
                className="btn-gold"
                disabled={loading}
                onClick={() =>
                  run(async () => {
                    if (!expTitle || !expAmount) throw new Error('Title and amount required');
                    await apiCreateExpense({ category: expCategory, title: expTitle, amount: parseFloat(expAmount) });
                    setExpTitle('');
                    setExpAmount('');
                    onToast('Expense logged');
                  })
                }
              >
                Save expense
              </button>
            </div>
          </div>
          <div className="glass" style={{ padding: '4px 16px' }}>
            {expenses.length === 0 ? (
              <p style={{ color: 'rgba(247,236,212,0.45)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No expenses yet</p>
            ) : (
              expenses.map((e) => (
                <div key={e.id} className="tx-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>{e.title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(247,236,212,0.45)', marginTop: 2 }}>{e.category}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#f0d78c' }}>-{formatNGN(e.amount)}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === 'team' && (
        <>
          <div className="glass" style={{ padding: 14, marginBottom: 14, color: 'rgba(247,236,212,0.6)', fontSize: 12, lineHeight: 1.5 }}>
            Payroll transfers are unavailable until a licensed payment provider is connected. Adding team records does not initiate payments.
          </div>
          <div className="glass" style={{ padding: 16, marginBottom: 14 }}>
            <p style={{ fontWeight: 600, marginBottom: 12 }}>Add team member</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="input" placeholder="Full name" value={tmName} onChange={(e) => setTmName(e.target.value)} />
              <input className="input" placeholder="Email" type="email" value={tmEmail} onChange={(e) => setTmEmail(e.target.value)} />
              <input className="input" placeholder="Monthly salary (NGN)" inputMode="decimal" value={tmSalary} onChange={(e) => setTmSalary(e.target.value)} />
              <button
                type="button"
                className="btn-gold"
                disabled={loading}
                onClick={() =>
                  run(async () => {
                    if (!tmName || !tmEmail) throw new Error('Name and email required');
                    await apiAddTeamMember({ fullName: tmName, email: tmEmail, salary: tmSalary ? parseFloat(tmSalary) : 0 });
                    setTmName('');
                    setTmEmail('');
                    setTmSalary('');
                    onToast('Team member added');
                  })
                }
              >
                Add member
              </button>
            </div>
          </div>
          <div className="glass" style={{ padding: '4px 16px' }}>
            {team.length === 0 ? (
              <p style={{ color: 'rgba(247,236,212,0.45)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No team members yet</p>
            ) : (
              team.map((m) => (
                <div key={m.id} className="tx-row">
                  <div>
                    <div style={{ fontWeight: 600 }}>{m.fullName}</div>
                    <div style={{ fontSize: 12, color: 'rgba(247,236,212,0.45)', marginTop: 2 }}>
                      {m.role} · {formatNGN(m.salary)}/mo
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
