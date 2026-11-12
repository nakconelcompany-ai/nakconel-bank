'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  apiBalance, apiLogout, apiSession, type Session, type TxItem,
  apiTransfer, apiTransferHistory, apiTopUp, apiKycStatus, apiKycSubmit,
} from '@/lib/api';
import Logo from '@/components/Logo';
import BusinessView from '@/components/BusinessView';
import BusinessDemoView from '@/components/BusinessDemoView';
import SignupFlow from '@/components/SignupFlow';
import InternationalView from '@/components/InternationalView';
import { NG_BANKS, getBanksForCurrency, resolveAccountName } from '@/lib/banks';
import { useTheme } from '@/lib/theme';
import {
  IconHome, IconSend, IconReceive, IconTopUp, IconWorld, IconArrowRight,
  IconHistory, IconUser, IconBiz, IconEye, IconEyeOff, IconCard, IconCheck,
} from '@/components/Icons';

type View =
  | 'landing' | 'auth' | 'home'
  | 'send' | 'bank-picker' | 'receive' | 'topup' | 'history'
  | 'card' | 'kyc' | 'account'
  | 'pin' | 'success'
  | 'business' | 'business-demo' | 'international';

const FEE = 50;
const SESSION_KEY = 'nakconel_session';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(n);

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id_${Date.now()}`;
}

// Switch icon SVG
function IconSwitch({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4l4 4"/>
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
    </svg>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    COMPLETED:  ['rgba(40,119,78,.12)', 'var(--ok)'],
    VERIFIED:   ['rgba(40,119,78,.12)', 'var(--ok)'],
    PENDING:    ['rgba(197,155,68,.15)', '#a07820'],
    PROCESSING: ['rgba(197,155,68,.15)', '#a07820'],
    FAILED:     ['rgba(185,69,66,.1)',   'var(--danger)'],
    REJECTED:   ['rgba(185,69,66,.1)',   'var(--danger)'],
  };
  const [bg, color] = map[status] ?? ['rgba(0,0,0,.06)', 'var(--muted)'];
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: bg, color }}>{status}</span>;
}

export default function BankApp() {
  const { dark, toggle: toggleTheme } = useTheme();
  const [view, setView]             = useState<View>('landing');
  const [authTab, setAuthTab]       = useState<'login'|'signup'>('login');
  const [session, setSession]       = useState<Session | null>(null);
  const [restoring, setRestoring]   = useState(true);
  const [balance, setBalance]       = useState<{ formatted: string; balance: number } | null>(null);
  const [toast, setToast]           = useState('');
  const [showBal, setShowBal]       = useState(true);
  const [txs, setTxs]               = useState<TxItem[]>([]);
  const [txLoading, setTxLoading]   = useState(false);
  const [txCursor, setTxCursor]     = useState<string | null>(null);
  const [txHasMore, setTxHasMore]   = useState(false);
  const [loading, setLoading]       = useState(false);

  // Currency view state — user can switch display currency without moving money
  const [viewCurrency, setViewCurrency] = useState({ code: 'NGN', symbol: '₦', rate: 1, flag: '🇳🇬' });

  // send form
  const [sendAmount, setSendAmount] = useState('');
  const [sendBank, setSendBank]     = useState('');
  const [sendBankName, setSendBankName] = useState('');
  const [sendAcct, setSendAcct]     = useState('');
  const [sendName, setSendName]     = useState('');
  const [sendNote, setSendNote]     = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  // selfie update (profile screen)
  const [updatingSelfie, setUpdatingSelfie] = useState(false);
  const profileVideoRef  = useRef<HTMLVideoElement | null>(null);
  const profileCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const profileStreamRef = useRef<MediaStream | null>(null);

  // statement date range
  const [stmtFrom, setStmtFrom] = useState('');
  const [stmtTo,   setStmtTo]   = useState('');

  // topup
  const [topupAmt, setTopupAmt]     = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  // kyc
  const [kycStatus, setKycStatus]   = useState<string | null>(null);
  const [kycSub, setKycSub]         = useState<{ status: string; idType: string } | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycForm, setKycForm]       = useState({
    fullName: '', dateOfBirth: '', phone: '', address: '', bvn: '',
    idType: 'NIN' as 'NIN' | 'PASSPORT' | 'DRIVERS_LICENCE' | 'VOTERS_CARD',
  });
  const [kycStep, setKycStep]       = useState<'form'|'submitting'|'done'>('form');

  // pin gate
  const [pin, setPin]               = useState('');
  const [pendingAction, setPending] = useState<null|(()=>Promise<void>)>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const toast$ = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3400); }, []);

  const refreshBalance = useCallback(async (accountId: string) => {
    try { const b = await apiBalance(accountId); setBalance({ formatted: b.formatted, balance: b.balance }); }
    catch { /**/ }
  }, []);

  // restore session
  useEffect(() => {
    let dead = false;
    apiSession()
      .then(s => {
        if (dead) return;
        setSession(s);
        setView('home');
        if (s.accountId) {
          refreshBalance(s.accountId);
          // Load recent transactions immediately so home screen shows real data
          apiTransferHistory(s.accountId)
            .then(r => {
              if (dead) return;
              setTxs(r.items);
              setTxCursor(r.nextCursor);
              setTxHasMore(r.hasMore);
            })
            .catch(() => { /* non-fatal — history just stays empty */ });
        }
      })
      .catch(() => { if (!dead) { setSession(null); setView('landing'); } })
      .finally(() => { try { localStorage.removeItem(SESSION_KEY); } catch { /**/ } if (!dead) setRestoring(false); });
    return () => { dead = true; };
  }, [refreshBalance]);

  // payment callback
  useEffect(() => {
    const u = new URL(window.location.href);
    const p = u.searchParams.get('payment');
    if (!p) return;
    if (p === 'completed') toast$('Payment received. Wallet credited!');
    else if (p === 'pending') toast$('Payment pending — wallet will be credited shortly.');
    else toast$('Payment was not completed.');
    ['payment','ref','accountId'].forEach(k => u.searchParams.delete(k));
    window.history.replaceState({}, '', u);
  }, [toast$]);

  // load history when view changes — always reload to get latest
  useEffect(() => {
    if (view !== 'history' || !session?.accountId) return;
    setTxs([]);
    setTxCursor(null);
    setTxHasMore(false);
    loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, session?.accountId]);

  // load kyc status
  useEffect(() => {
    if (view !== 'kyc') return;
    setKycLoading(true);
    apiKycStatus()
      .then(d => {
        setKycStatus(d.kycStatus);
        setKycSub(d.latestSubmission);
        setKycForm(f => ({ ...f, fullName: f.fullName || (session?.fullName ?? ''), phone: f.phone || (session?.phone ?? '') }));
      })
      .catch(() => {})
      .finally(() => setKycLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // name lookup
  useEffect(() => {
    if (sendAcct.length !== 10 || !sendBank) { setSendName(''); return; }
    setSendName(''); setNameLoading(true);
    resolveAccountName(sendAcct, sendBank)
      .then(n => setSendName(n))
      .catch(() => setSendName(''))
      .finally(() => setNameLoading(false));
  }, [sendAcct, sendBank]);

  const logout = () => {
    void apiLogout().catch(() => {});
    setSession(null); setBalance(null); setTxs([]); setView('landing');
  };

  async function loadHistory(cursor?: string) {
    if (!session?.accountId) return;
    setTxLoading(true);
    try {
      const r = await apiTransferHistory(session.accountId, cursor);
      setTxs(prev => cursor ? [...prev, ...r.items] : r.items);
      setTxCursor(r.nextCursor); setTxHasMore(r.hasMore);
    } catch { toast$('Could not load transaction history'); }
    finally { setTxLoading(false); }
  }

  /* ── keypad components ── */
  const PinDots = ({ val }: { val: string }) => (
    <div style={{ display: 'flex', gap: 14, justifyContent: 'center', margin: '18px 0' }}>
      {[0,1,2,3].map(i => (
        <div key={i} className="pin-dot" style={{ background: i < val.length ? 'var(--maroon)' : 'transparent' }} />
      ))}
    </div>
  );
  const Keypad = ({ val, onChange }: { val: string; onChange: (v: string) => void }) => {
    const press = (k: string) =>
      onChange(k === '⌫' ? val.slice(0, -1) : val.length < 4 ? val + k : val);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, maxWidth: 280, margin: '0 auto', width: '100%' }}>
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) =>
          k ? <button key={i} type="button" onClick={() => press(k)}
            style={{ padding: '15px 0', fontSize: '1.2rem', fontWeight: 700, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--ink)' }}>{k}</button>
            : <span key={i} />
        )}
      </div>
    );
  };

  /* ── shell ── */
  function shell(children: React.ReactNode, opts?: { nav?: boolean }) {
    const navItems = [
      ['home', 'Home', IconHome],
      ['send', 'Send', IconSend],
      ['business', 'Biz', IconBiz],
      ['international', 'Global', IconWorld],
      ['account', 'Me', IconUser],
    ] as const;
    const showNav = Boolean(opts?.nav && session);

    const selfie = typeof localStorage !== 'undefined' ? (() => { try { return localStorage.getItem('nkc_selfie'); } catch { return null; } })() : null;

    return (
      <div className="app-shell">
        {toast && <div className="toast" role="status">{toast}</div>}
        <header className="brand-header">
          <Logo size={44} className="brand-logo" />
          <div className="brand-copy">
            <div className="brand-name">NAKCONEL</div>
            <div className="brand-bank">BANK</div>
          </div>
          <div className="brand-tagline">Secure <span>•</span> Simple <span>•</span> Global</div>
          <button type="button" onClick={toggleTheme} aria-label="Toggle dark mode"
            style={{ marginLeft: 8, background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 18, padding: '5px 9px', cursor: 'pointer', color: 'var(--gold-bright)', fontSize: 15, lineHeight: 1, flexShrink: 0 }}>
            {dark ? '☀' : '☾'}
          </button>
        </header>
        <div className={`app-layout${showNav ? ' has-navigation' : ''}`}>
          {showNav && (
            <aside className="desktop-sidebar">
              <p className="sidebar-label">YOUR BANK</p>
              <nav className="sidebar-nav">
                {navItems.map(([v, label, Icon]) => (
                  <button key={v} type="button" onClick={() => setView(v)}
                    className={`sidebar-link${view === v ? ' active' : ''}`}>
                    <Icon size={20} />
                    <span>{v === 'business' ? 'Business' : v === 'account' ? 'Profile' : v === 'international' ? 'International' : label}</span>
                    {view === v && <span className="sidebar-current" />}
                  </button>
                ))}
                {(['history','card','kyc','topup'] as const).map(v => (
                  <button key={v} type="button" onClick={() => setView(v)}
                    className={`sidebar-link${view === v ? ' active' : ''}`}>
                    {v === 'history' ? <IconHistory size={20} /> : v === 'card' ? <IconCard size={20} /> : v === 'kyc' ? <IconUser size={20} /> : <IconTopUp size={20} />}
                    <span>{v === 'topup' ? 'Top up' : v.charAt(0).toUpperCase() + v.slice(1)}</span>
                    {view === v && <span className="sidebar-current" />}
                  </button>
                ))}
              </nav>
              <div className="sidebar-account">
                {selfie
                  ? <img src={selfie} alt="Profile" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(197,155,68,.4)' }} />
                  : <span className="sidebar-account-avatar">{session?.fullName.trim()[0]?.toUpperCase()}</span>
                }
                <span className="sidebar-account-copy">
                  <strong>{session?.fullName.split(' ')[0]}</strong>
                  <small>{session?.kycStatus === 'VERIFIED' ? '✓ Verified' : 'Personal account'}</small>
                </span>
                <button type="button" className="sidebar-logout" onClick={logout}>Sign out</button>
              </div>
            </aside>
          )}
          <main className={`app-content${showNav ? '' : ' no-nav'}`}>{children}</main>
        </div>
        {showNav && (
          <nav className="bottom-nav">
            {navItems.map(([v, label, Icon]) => (
              <button key={v} type="button" onClick={() => setView(v)}
                className={`nav-btn${view === v ? ' active' : ''}`}>
                <span className="nav-icon-wrap"><Icon size={21} /></span>
                {label === 'Global' ? 'World' : label === 'Biz' ? 'Biz' : label === 'Me' ? 'Me' : label}
              </button>
            ))}
          </nav>
        )}
      </div>
    );
  }

  /* ════════ LANDING ════════ */
  if (view === 'landing') {
    if (restoring) return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Opening your secure session…</p>
      </div>
    );
    return (
      <div className="landing-screen">
        {/* Sticky header */}
        <header className="brand-header" style={{ position: 'fixed', top: 0, left: 0, right: 0, width: '100%', maxWidth: '100%', zIndex: 40 }}>
          <Logo size={40} className="brand-logo" />
          <div className="brand-copy">
            <div className="brand-name">NAKCONEL</div>
            <div className="brand-bank">BANK</div>
          </div>
          <div className="brand-tagline">Secure <span>•</span> Simple <span>•</span> Global</div>
        </header>

        {/* Hero card — compact on desktop too */}
        <div className="landing-left" style={{ marginTop: 72 }}>
          <div className="landing-hero landing-hero--compact">
            <Logo size={64} />
            <p className="welcome-kicker">Secure · Simple · Global</p>
            <h1>Our world. Our bank.<br />A better tomorrow.</h1>
            <p>Everyday money and business tools, designed to move with you.</p>
          </div>
        </div>

        {/* Buttons — always directly below hero */}
        <div className="landing-right landing-actions">
          <button type="button" className="btn-gold" onClick={() => { setAuthTab('signup'); setView('auth'); }}>
            Get started
          </button>
          <button type="button" className="btn-outline" onClick={() => { setAuthTab('login'); setView('auth'); }}>
            I already have an account
          </button>
        </div>
      </div>
    );
  }

  /* ════════ AUTH ════════ */
  if (view === 'auth') return shell(
    <SignupFlow initialTab={authTab} onToast={toast$} onBack={() => setView('landing')}
      onSuccess={s => { setSession(s); setView('home'); if (s.accountId) refreshBalance(s.accountId); }} />
  );

  if (view === 'business-demo') return shell(<BusinessDemoView onBack={() => setView('landing')} />);
  if (view === 'business' && session) return shell(<BusinessView fullName={session.fullName} onToast={toast$} />, { nav: true });
  if (view === 'international' && session) return shell(<InternationalView
    userId={session.id}
    onToast={toast$}
    balanceNgn={(balance?.balance ?? 0) * 100}
    activeCurrency={viewCurrency.code}
    onSwitchCurrency={(code, symbol, rate, flag) => {
      setViewCurrency({ code, symbol, rate, flag });
      setView('home');
    }}
  />, { nav: true });

  /* ════════ PIN GATE ════════ */
  if (view === 'pin') return shell(
    <div>
      <button type="button" className="btn-ghost" style={{ marginBottom: 16 }}
        onClick={() => { setView('send'); setPin(''); setPending(null); }}>← Cancel</button>
      <h2 style={{ marginBottom: 6 }}>Enter your PIN</h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Confirm this transaction with your 4-digit PIN</p>
      <PinDots val={pin} />
      <Keypad val={pin} onChange={async v => {
        setPin(v);
        if (v.length === 4 && pendingAction) {
          setLoading(true);
          try { await pendingAction(); }
          catch (e: unknown) { toast$(e instanceof Error ? e.message : 'Action failed'); }
          finally { setLoading(false); setPin(''); setPending(null); }
        }
      }} />
      {loading && <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--muted)', fontSize: 13 }}>Processing…</p>}
    </div>,
    { nav: true }
  );

  /* ════════ SUCCESS ════════ */
  if (view === 'success') return shell(
    <div style={{ textAlign: 'center', paddingTop: 32 }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(40,119,78,.12)', border: '2px solid var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <IconCheck size={44} color="var(--ok)" />
      </div>
      <h2 style={{ color: 'var(--ok)', marginBottom: 8 }}>Done!</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28, lineHeight: 1.6 }}>{successMsg}</p>
      <button type="button" className="btn-gold" onClick={() => { setView('home'); refreshBalance(session?.accountId ?? ''); }}>Back to home</button>
    </div>,
    { nav: true }
  );

  /* ════════ HOME ════════ */
  if (view === 'home' && session) return shell(
    <div className="home-screen">
      <div className="home-greeting">
        <div>
          <div className="eyebrow">Good day,</div>
          <div className="name">{session.fullName.split(' ')[0]}</div>
        </div>
        {(() => {
          const selfie = typeof localStorage !== 'undefined' ? (() => { try { return localStorage.getItem('nkc_selfie'); } catch { return null; } })() : null;
          return selfie
            ? <img src={selfie} alt="Profile" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
            : <span className="home-avatar">{session.fullName.trim()[0]?.toUpperCase()}</span>;
        })()}
      </div>

      <section className="balance-card" aria-label="Available balance">
        <div className="balance-label">
          <span>Available balance</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Switch currency button */}
            <button
              type="button"
              aria-label="Switch currency"
              title="Switch currency view"
              onClick={() => setView('international')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,248,233,.15)', border: '1px solid rgba(255,248,233,.25)', borderRadius: 8, color: '#f2d995', fontSize: 11, fontWeight: 700, padding: '5px 9px', cursor: 'pointer' }}>
              <IconSwitch size={12} />
              {viewCurrency.code !== 'NGN' ? viewCurrency.flag + ' ' + viewCurrency.code : 'Switch'}
            </button>
            <button type="button" aria-label={showBal ? 'Hide balance' : 'Show balance'} onClick={() => setShowBal(b => !b)}>
              {showBal ? <IconEye /> : <IconEyeOff />}
            </button>
          </div>
        </div>
        {/* Balance in active currency */}
        {showBal ? (
          viewCurrency.code === 'NGN'
            ? <div className="balance-amount">{balance?.formatted ?? '₦0.00'}</div>
            : <div className="balance-amount">
                {viewCurrency.symbol}{(((balance?.balance ?? 0)) / viewCurrency.rate).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
        ) : (
          <div className="balance-amount">••••••••</div>
        )}
        {session.accountNumber && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,.18)', borderRadius: 10, padding: '8px 12px' }}>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,248,233,.55)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 2 }}>Account number</div>
              <div style={{ color: '#f2d995', fontWeight: 700, fontSize: 15, letterSpacing: '.06em' }}>{session.accountNumber}</div>
            </div>
            <button
              type="button"
              onClick={() => { navigator.clipboard?.writeText(session.accountNumber!).then(() => toast$('Account number copied!')).catch(() => toast$(session.accountNumber!)); }}
              style={{ background: 'rgba(255,248,233,.12)', border: '1px solid rgba(255,248,233,.2)', borderRadius: 8, color: '#f2d995', fontSize: 11, fontWeight: 700, padding: '6px 10px', cursor: 'pointer' }}>
              Copy
            </button>
          </div>
        )}
      </section>

      <div className="quick-actions">
        {([['send',IconSend,'Send'],['receive',IconReceive,'Receive'],['topup',IconTopUp,'Top up'],['history',IconHistory,'History']] as const).map(([v,Icon,label]) => (
          <button key={v} type="button" onClick={() => setView(v)} className="quick-action">
            <span className="quick-action-icon"><Icon size={20} /></span>{label}
          </button>
        ))}
      </div>

      {session.kycStatus !== 'VERIFIED' && (
        <button type="button" className="home-shortcut" style={{ background: 'rgba(197,155,68,.08)', borderColor: 'rgba(197,155,68,.4)' }} onClick={() => setView('kyc')}>
          <span><strong>Complete your KYC</strong><br /><small>Verify your identity to unlock full features</small></span>
          <IconArrowRight size={19} />
        </button>
      )}

      <button type="button" onClick={() => setView('card')} className="home-shortcut">
        <span><strong>Virtual card</strong><br /><small>View and manage your Nakconel card</small></span><IconArrowRight size={19} />
      </button>
      <button type="button" onClick={() => setView('business')} className="home-shortcut">
        <span><strong>Business banking</strong><br /><small>Manage invoices and expenses</small></span><IconArrowRight size={19} />
      </button>
      <button type="button" onClick={() => setView('international')} className="home-shortcut">
        <span><strong>International transfers</strong><br /><small>Send money abroad at competitive rates</small></span><IconArrowRight size={19} />
      </button>

      <h2 className="section-heading">Recent activity</h2>
      <section className="glass activity-card">
        {txs.length === 0
          ? <p className="activity-empty">Your recent transactions will appear here.</p>
          : txs.slice(0, 4).map(t => (
              <div key={t.id} className="tx-row">
                <div><strong>{t.title}</strong><div className="activity-meta">{new Date(t.createdAt).toLocaleDateString('en-NG')}</div></div>
                <div style={{ textAlign: 'right' }}>
                  <strong className="activity-out">-{fmt(t.amount)}</strong>
                  <div><StatusBadge status={t.status} /></div>
                </div>
              </div>
            ))
        }
        {txs.length === 0 && <button type="button" className="btn-outline" style={{ marginTop: 12, fontSize: 13 }} onClick={() => loadHistory()}>Refresh</button>}
      </section>
    </div>,
    { nav: true }
  );

  /* ════════ BANK PICKER ════════ */
  if (view === 'bank-picker' && session) {
    const banks = getBanksForCurrency(viewCurrency.code);
    const filtered = banks.filter(b =>
      b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
      b.short.toLowerCase().includes(bankSearch.toLowerCase())
    );
    return shell(
      <div>
        <button type="button" className="btn-ghost" style={{ marginBottom: 16 }}
          onClick={() => setView('send')}>← Back to Send</button>
        <h2 style={{ marginBottom: 4 }}>Select bank</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
          {viewCurrency.flag} {viewCurrency.code} banks and wallets
        </p>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 14 }}>🔍</span>
          <input className="input" placeholder="Search bank or wallet…"
            value={bankSearch} onChange={e => setBankSearch(e.target.value)}
            autoFocus style={{ paddingLeft: 36 }} />
        </div>
        {/* Bank list */}
        <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No banks found</div>
          )}
          {filtered.map((b, i) => (
            <button key={b.code} type="button"
              onClick={() => {
                setSendBank(b.code);
                setSendBankName(b.name);
                setBankSearch('');
                setView('send');
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                background: sendBank === b.code ? 'rgba(101,23,25,.06)' : 'transparent',
                border: 'none',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background .12s',
              }}>
              {/* Official brand favicon with initials fallback */}
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                position: 'relative', overflow: 'hidden',
                background: b.color + '18', border: `1.5px solid ${b.color}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: b.color,
              }}>
                <span>{b.short.slice(0, 2)}</span>
                <img src={b.logoUrl} alt="" loading="lazy"
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                  style={{ position: 'absolute', inset: 5, width: 'calc(100% - 10px)', height: 'calc(100% - 10px)', objectFit: 'contain', background: 'white', borderRadius: 5 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{b.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {b.category === 'payment-service' ? 'Payment Service Bank' :
                    b.category === 'mobile-money' ? 'Mobile money' :
                    b.category === 'digital' ? 'Digital / microfinance bank' :
                    b.category === 'credit-union' ? 'Credit union' :
                    b.category === 'commercial' ? 'Commercial / merchant bank' : 'Bank'} · {viewCurrency.code}
                </div>
              </div>
              {sendBank === b.code && (
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>,
      { nav: true }
    );
  }

  /* ════════ SEND ════════ */
  if (view === 'send' && session) {
    const amt    = parseFloat(sendAmount) || 0;
    const total  = amt + (amt > 0 ? FEE : 0);
    const isIntl = viewCurrency.code !== 'NGN';

    return shell(
      <div>
        <h2 style={{ marginBottom: 4 }}>Send money</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>
          {isIntl
            ? `${viewCurrency.flag} Sending in ${viewCurrency.code}`
            : 'Transfer to any Nigerian bank account'}
        </p>

        {/* Bank selector — taps to bank-picker page */}
        <label className="field-label">Bank / Wallet</label>
        <button type="button"
          onClick={() => setView('bank-picker')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', borderRadius: 12, marginBottom: 14,
            border: '1.5px solid var(--border)', background: 'var(--surface)',
            cursor: 'pointer', textAlign: 'left', transition: 'border-color .15s',
          }}>
          {sendBank ? (
            <>
              {/* Show selected bank logo */}
              {(() => {
                const b = getBanksForCurrency(viewCurrency.code).find(x => x.code === sendBank);
                return b ? (
                  <>
                    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, position: 'relative', overflow: 'hidden', background: b.color + '18', border: `1.5px solid ${b.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: b.color }}>
                      <span>{b.short.slice(0, 2)}</span>
                      <img src={b.logoUrl} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} style={{ position: 'absolute', inset: 4, width: 'calc(100% - 8px)', height: 'calc(100% - 8px)', objectFit: 'contain', background: 'white', borderRadius: 5 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{b.flag === '📱' ? 'Mobile wallet' : 'Bank'}</div>
                    </div>
                  </>
                ) : null;
              })()}
              <span style={{ fontSize: 11, color: 'var(--maroon)', fontWeight: 700 }}>Change</span>
            </>
          ) : (
            <>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-soft)', border: '1.5px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 18 }}>🏦</div>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>Tap to select bank or wallet</span>
              <span style={{ marginLeft: 'auto', fontSize: 20, color: 'var(--muted)' }}>›</span>
            </>
          )}
        </button>

        {/* Account number */}
        <label className="field-label">Account number{isIntl ? ' / IBAN / Wallet ID' : ''}</label>
        <input value={sendAcct}
          onChange={e => setSendAcct(e.target.value.replace(isIntl ? /[^\d\w]/g : /\D/g, '').slice(0, isIntl ? 34 : 10))}
          placeholder={isIntl ? 'Account number, IBAN or wallet ID' : '10 digits'}
          inputMode={isIntl ? 'text' : 'numeric'}
          className="input" style={{ marginBottom: 8 }} />
        {nameLoading && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Looking up account…</p>}
        {sendName && <p style={{ fontSize: 13, color: 'var(--ok)', marginBottom: 12, fontWeight: 600 }}>✓ {sendName}</p>}

        {/* Amount */}
        <label className="field-label">Amount ({viewCurrency.code})</label>
        <div className="amount-box" style={{ marginBottom: isIntl && amt > 0 ? 6 : 12 }}>
          <span className="currency">{viewCurrency.symbol}</span>
          <input value={sendAmount} onChange={e => setSendAmount(e.target.value)}
            placeholder="0.00" inputMode="decimal"
            style={{ border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 22, fontWeight: 700, padding: '12px 10px', width: '100%', outline: 'none' }} />
        </div>
        {isIntl && amt > 0 && (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
            ≈ ₦{(amt * viewCurrency.rate).toLocaleString('en-NG', { minimumFractionDigits: 2 })} · 1 {viewCurrency.code} = ₦{viewCurrency.rate.toLocaleString()}
          </p>
        )}

        {/* Note */}
        <label className="field-label">Note (optional)</label>
        <input value={sendNote} onChange={e => setSendNote(e.target.value)}
          placeholder="What is this for?" className="input" style={{ marginBottom: 16 }} />

        {amt > 0 && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Fee ₦{FEE} · Total debit {fmt(total)}</p>}

        <button type="button" className="btn-gold"
          disabled={!sendBank || !sendAcct || amt <= 0 || !session.accountId}
          onClick={() => {
            setPending(() => async () => {
              if (!session.accountId) return;
              const tx = await apiTransfer({
                fromAccountId: session.accountId,
                amount: amt,
                beneficiaryName: sendName || sendBankName || 'Recipient',
                beneficiaryAccount: sendAcct,
                bankCode: sendBank,
                note: sendNote || undefined,
                pin,
                idempotencyKey: uid(),
              });
              setTxs(prev => [{ ...tx, title: sendName || sendBankName || 'Transfer', type: 'send' }, ...prev]);
              setSuccessMsg(`Sent ${viewCurrency.symbol}${amt.toLocaleString()} to ${sendName || sendBankName || sendAcct}`);
              setSendAmount(''); setSendAcct(''); setSendName(''); setSendNote('');
              setSendBank(''); setSendBankName('');
              setView('success');
              refreshBalance(session.accountId!);
            });
            setPin('');
            setView('pin');
          }}>
          {sendName ? `Send ${fmt(amt)} to ${sendName}` : 'Continue'}
        </button>
      </div>,
      { nav: true }
    );
  }

  /* ════════ RECEIVE ════════ */
  if (view === 'receive' && session) return shell(
    <div>
      <h2 style={{ marginBottom: 4 }}>Receive money</h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Share your account details to receive funds</p>
      <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
        {[
          ['Account Name', session.fullName],
          ['Bank', 'Nakconel Bank'],
          ['Account Number', session.phone ?? 'Not set'],
          ['Currency', 'NGN'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{k}</span>
            <strong style={{ fontSize: 13 }}>{v}</strong>
          </div>
        ))}
      </div>
      <button type="button" className="btn-gold" onClick={() => {
        if (session.phone) { void navigator.clipboard?.writeText(session.phone); toast$('Account number copied!'); }
      }}>Copy account number</button>
    </div>,
    { nav: true }
  );

  /* ════════ TOP UP ════════ */
  if (view === 'topup' && session) return shell(
    <div>
      <h2 style={{ marginBottom: 4 }}>Top up wallet</h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Add money to your Nakconel wallet</p>
      <label className="field-label">Amount (₦)</label>
      <div className="amount-box" style={{ marginBottom: 16 }}>
        <span className="currency">₦</span>
        <input value={topupAmt} onChange={e => setTopupAmt(e.target.value)} placeholder="0.00"
          inputMode="decimal" style={{ border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 22, fontWeight: 700, padding: '12px 10px', width: '100%', outline: 'none' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[500, 1000, 2000, 5000, 10000].map(a => (
          <button key={a} type="button" className="btn-ghost" style={{ flex: 'none', padding: '8px 14px', fontSize: 13 }}
            onClick={() => setTopupAmt(String(a))}>₦{a.toLocaleString()}</button>
        ))}
      </div>
      <button type="button" className="btn-gold"
        disabled={topupLoading || !topupAmt || parseFloat(topupAmt) < 100 || !session.accountId}
        onClick={async () => {
          if (!session.accountId) return;
          setTopupLoading(true);
          try {
            const r = await apiTopUp(session.accountId, parseFloat(topupAmt));
            if (r.mode === 'paystack' && r.authorizationUrl) {
              window.location.href = r.authorizationUrl;
            } else {
              toast$(r.message ?? 'Wallet credited!');
              setTopupAmt('');
              refreshBalance(session.accountId);
              setView('home');
            }
          } catch (e: unknown) {
            toast$(e instanceof Error ? e.message : 'Top-up failed');
          } finally { setTopupLoading(false); }
        }}>
        {topupLoading ? 'Processing…' : `Add ${topupAmt ? fmt(parseFloat(topupAmt)) : '₦0'} to wallet`}
      </button>
      <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12, lineHeight: 1.5, textAlign: 'center' }}>
        Demo mode: top-ups are credited immediately without a payment provider.
      </p>
    </div>,
    { nav: true }
  );

  /* ════════ HISTORY ════════ */
  if (view === 'history' && session) return shell(
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2>Transaction history</h2>
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams();
            if (stmtFrom) params.set('from', stmtFrom);
            if (stmtTo) params.set('to', stmtTo);
            window.open(`/api/v1/statements${params.toString() ? '?' + params.toString() : ''}`, '_blank');
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: 'var(--maroon)', color: '#fff9eb', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Statement
        </button>
      </div>
      {/* Date range filter */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <div>
          <label className="field-label">From</label>
          <input type="date" className="input" value={stmtFrom} onChange={e => setStmtFrom(e.target.value)} style={{ fontSize: 13, padding: '9px 12px' }} />
        </div>
        <div>
          <label className="field-label">To</label>
          <input type="date" className="input" value={stmtTo} onChange={e => setStmtTo(e.target.value)} style={{ fontSize: 13, padding: '9px 12px' }} />
        </div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>All your recent transfers</p>
      {txLoading && txs.length === 0
        ? <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 32 }}>Loading…</p>
        : txs.length === 0
          ? <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 32 }}>No transactions yet.</p>
          : txs.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 3 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.accountNumber} · {new Date(t.createdAt).toLocaleDateString('en-NG')}</div>
                  {t.note && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t.note}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--maroon)' }}>-{fmt(t.amount)}</div>
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))
      }
      {txHasMore && (
        <button type="button" className="btn-ghost" style={{ marginTop: 16, width: '100%' }}
          disabled={txLoading} onClick={() => txCursor && loadHistory(txCursor)}>
          {txLoading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>,
    { nav: true }
  );

  /* ════════ VIRTUAL CARD ════════ */
  if (view === 'card' && session) return shell(
    <div>
      <h2 style={{ marginBottom: 4 }}>Virtual card</h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Your Nakconel virtual debit card</p>

      {/* Card face */}
      <div className="card-face" style={{ marginBottom: 24 }}>
        <div style={{ position: 'absolute', top: 18, right: 20, fontWeight: 900, fontStyle: 'italic', fontSize: 22, color: '#fff8e9', opacity: .85 }}>VISA</div>
        <div style={{ width: 36, height: 26, borderRadius: 5, background: 'rgba(255,248,233,.28)', marginBottom: 28 }} />
        <div style={{ letterSpacing: '.14em', fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          •••• •••• •••• {(session.id.slice(-4).toUpperCase())}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: .8 }}>
          <div><div style={{ fontSize: 10, marginBottom: 2, opacity: .7 }}>CARD HOLDER</div>{session.fullName.toUpperCase()}</div>
          <div><div style={{ fontSize: 10, marginBottom: 2, opacity: .7 }}>EXPIRES</div>12/28</div>
        </div>
      </div>

      <div style={{ background: 'rgba(197,155,68,.08)', border: '1px solid rgba(197,155,68,.3)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>
          <strong>Demo virtual card.</strong> This card number is for display only.
          Physical and live virtual cards will be issued when a licensed card issuer is connected.
        </p>
      </div>

      <div className="glass" style={{ padding: 16 }}>
        {[
          ['Account name', session.fullName],
          ['Account number', session.phone ?? 'N/A'],
          ['Card status', session.kycStatus === 'VERIFIED' ? 'Active (KYC verified)' : 'KYC required'],
          ['Daily limit', session.kycStatus === 'VERIFIED' ? '₦500,000' : '₦50,000'],
          ['Card type', 'Debit · Naira · Virtual'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{k}</span>
            <strong style={{ fontSize: 13 }}>{v}</strong>
          </div>
        ))}
      </div>

      {session.kycStatus !== 'VERIFIED' && (
        <button type="button" className="btn-gold" style={{ marginTop: 16 }} onClick={() => setView('kyc')}>
          Complete KYC to activate card
        </button>
      )}
    </div>,
    { nav: true }
  );

  /* ════════ KYC ════════ */
  if (view === 'kyc' && session) return shell(
    <div>
      <h2 style={{ marginBottom: 4 }}>Identity verification</h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Complete KYC to unlock higher limits and full features</p>

      {kycLoading ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>Loading…</p>
      ) : kycStatus === 'VERIFIED' ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(40,119,78,.12)', border: '2px solid var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <IconCheck size={40} color="var(--ok)" />
          </div>
          <h3 style={{ color: 'var(--ok)', marginBottom: 8 }}>Identity verified</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Your account has been fully verified. All features and limits are unlocked.</p>
        </div>
      ) : kycStep === 'done' ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(40,119,78,.12)', border: '2px solid var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <IconCheck size={40} color="var(--ok)" />
          </div>
          <h3 style={{ marginBottom: 8 }}>Submission received</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>Your KYC submission is being reviewed. This usually takes a few minutes.</p>
          <button type="button" className="btn-gold" style={{ marginTop: 20 }} onClick={() => setView('home')}>Back to home</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {kycSub && (
            <div style={{ background: kycSub.status === 'REJECTED' ? 'rgba(185,69,66,.08)' : 'rgba(197,155,68,.08)', border: `1px solid ${kycSub.status === 'REJECTED' ? 'rgba(185,69,66,.3)' : 'rgba(197,155,68,.3)'}`, borderRadius: 12, padding: 12, marginBottom: 4 }}>
              <p style={{ fontSize: 13 }}>Previous submission: <StatusBadge status={kycSub.status} /></p>
            </div>
          )}

          <label className="field-label">Full name (as on ID)</label>
          <input className="input" value={kycForm.fullName} onChange={e => setKycForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Legal full name" />

          <label className="field-label">Date of birth</label>
          <input className="input" type="date" value={kycForm.dateOfBirth} onChange={e => setKycForm(f => ({ ...f, dateOfBirth: e.target.value }))} />

          <label className="field-label">Phone number</label>
          <input className="input" type="tel" value={kycForm.phone} onChange={e => setKycForm(f => ({ ...f, phone: e.target.value }))} placeholder="08012345678" />

          <label className="field-label">Residential address</label>
          <input className="input" value={kycForm.address} onChange={e => setKycForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, City, State" />

          <label className="field-label">BVN (Bank Verification Number)</label>
          <input className="input" inputMode="numeric" maxLength={11} value={kycForm.bvn}
            onChange={e => setKycForm(f => ({ ...f, bvn: e.target.value.replace(/\D/g,'').slice(0,11) }))}
            placeholder="11-digit BVN · Dial *565*0#" />

          <label className="field-label">ID type</label>
          <select className="input" value={kycForm.idType} onChange={e => setKycForm(f => ({ ...f, idType: e.target.value as typeof f.idType }))}>
            <option value="NIN">National ID (NIN)</option>
            <option value="PASSPORT">International Passport</option>
            <option value="DRIVERS_LICENCE">Driver's Licence</option>
            <option value="VOTERS_CARD">Voter's Card</option>
          </select>

          <button type="button" className="btn-gold" style={{ marginTop: 6 }}
            disabled={kycLoading || !kycForm.fullName || !kycForm.dateOfBirth || !kycForm.phone || !kycForm.address || kycForm.bvn.length < 11}
            onClick={async () => {
              setKycLoading(true);
              try {
                await apiKycSubmit(kycForm);
                setKycStep('done');
              } catch (e: unknown) {
                toast$(e instanceof Error ? e.message : 'KYC submission failed');
              } finally { setKycLoading(false); }
            }}>
            {kycLoading ? 'Submitting…' : 'Submit KYC'}
          </button>
        </div>
      )}
    </div>,
    { nav: true }
  );

  /* ════════ ACCOUNT ════════ */
  if (view === 'account' && session) {
    const selfie = typeof localStorage !== 'undefined' ? (() => { try { return localStorage.getItem('nkc_selfie'); } catch { return null; } })() : null;

    const startCamera = async () => {
      setUpdatingSelfie(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        profileStreamRef.current = stream;
        if (profileVideoRef.current) { profileVideoRef.current.srcObject = stream; await profileVideoRef.current.play(); }
      } catch { toast$('Camera permission required'); setUpdatingSelfie(false); }
    };

    const captureSelfie = () => {
      const v = profileVideoRef.current; const c = profileCanvasRef.current;
      if (!v || !c) return;
      c.width = v.videoWidth || 320; c.height = v.videoHeight || 320;
      c.getContext('2d')!.drawImage(v, 0, 0);
      const dataUrl = c.toDataURL('image/jpeg', 0.82);
      try { localStorage.setItem('nkc_selfie', dataUrl); } catch { /**/ }
      profileStreamRef.current?.getTracks().forEach(t => t.stop());
      profileStreamRef.current = null;
      setUpdatingSelfie(false);
      toast$('Profile photo updated!');
      setView('home');
      setTimeout(() => setView('account'), 50);
    };

    return shell(
      <div>
        <div style={{ textAlign: 'center', paddingTop: 16, paddingBottom: 24 }}>
          {updatingSelfie ? (
            <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 12px' }}>
              <video ref={profileVideoRef} autoPlay playsInline muted
                style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--gold)', display: 'block' }} />
              <canvas ref={profileCanvasRef} style={{ display: 'none' }} />
              <button type="button" onClick={captureSelfie}
                style={{ position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderRadius: '50%', background: 'var(--ok)', border: '2px solid #fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✓
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 12px' }}>
              {selfie
                ? <img src={selfie} alt="Profile" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--gold)', display: 'block' }} />
                : <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: 'var(--maroon)' }}>{session.fullName.trim()[0]?.toUpperCase()}</div>
              }
              <button type="button" onClick={startCamera}
                style={{ position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: '50%', background: 'var(--maroon)', border: '2px solid var(--bg)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                📷
              </button>
            </div>
          )}
          <h2 style={{ fontSize: 20, marginBottom: 4 }}>{session.fullName}</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{session.email}</p>
          {session.phone && <p style={{ fontSize: 13, color: 'var(--muted)' }}>{session.phone}</p>}
          <div style={{ marginTop: 8 }}><StatusBadge status={session.kycStatus ?? 'NONE'} /></div>
          {!updatingSelfie && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Tap the camera icon to update your photo</p>}
        </div>
        <div className="glass" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          {[
            { label: 'Transaction history',    action: () => setView('history') },
            { label: 'Virtual card',           action: () => setView('card') },
            { label: 'KYC verification',       action: () => setView('kyc') },
            { label: 'Business banking',       action: () => setView('business') },
            { label: 'International transfers',action: () => setView('international') },
          ].map(({ label, action }) => (
            <button key={label} type="button" onClick={action}
              style={{ width: '100%', padding: '14px 18px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 14, color: 'var(--ink)', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {label} <IconArrowRight size={16} />
            </button>
          ))}
        </div>
        <button type="button" className="btn-outline" style={{ color: 'var(--danger)', borderColor: 'rgba(185,69,66,.3)', marginTop: 8 }} onClick={logout}>
          Sign out
        </button>
      </div>,
      { nav: true }
    );
  }

  return shell(<div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>);
}
