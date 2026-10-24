'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiBalance, apiLogin, apiRegister, apiTransfer, type Session } from '@/lib/api';
import { NG_BANKS, resolveAccountName } from '@/lib/banks';
import Logo from '@/components/Logo';
import BusinessView from '@/components/BusinessView';
import {
  IconHome, IconSend, IconReceive, IconTopUp, IconCard,
  IconHistory, IconUser, IconBiz, IconEye, IconEyeOff,
  IconCheck, IconShield,
} from '@/components/Icons';

type View =
  | 'landing' | 'auth' | 'home' | 'send' | 'receive' | 'topup'
  | 'history' | 'card' | 'kyc' | 'account' | 'pin' | 'success' | 'business';

type Tx = {
  id: string;
  type: 'send' | 'receive' | 'topup';
  title: string;
  amount: number;
  fee?: number;
  time: string;
  status: string;
};

const FEE = 50;
const SESSION_KEY = 'nakconel_session';

function formatNGN(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(n);
}

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id_${Date.now()}`;
}

export default function BankApp() {
  const [view, setView] = useState<View>('landing');
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [session, setSession] = useState<Session | null>(null);
  const [balance, setBalance] = useState(0);
  const [hideBal, setHideBal] = useState(false);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [cardFrozen, setCardFrozen] = useState(false);
  const [cardRevealed, setCardRevealed] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPass, setSuPass] = useState('');
  const [suPin, setSuPin] = useState('');

  const [sendAmount, setSendAmount] = useState('');
  const [sendBank, setSendBank] = useState('');
  const [sendAccount, setSendAccount] = useState('');
  const [sendResolvedName, setSendResolvedName] = useState('');
  const [sendResolving, setSendResolving] = useState(false);
  const [sendNote, setSendNote] = useState('');
  const [sendStep, setSendStep] = useState<'form' | 'confirm'>('form');
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  const [topupAmount, setTopupAmount] = useState('');
  const [pinDigits, setPinDigits] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinAction, setPinAction] = useState<'send' | 'topup' | null>(null);
  const [successMsg, setSuccessMsg] = useState({ title: '', msg: '', amount: '' });

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 2800);
  };

  const refreshBalance = useCallback(
    async (accountId?: string) => {
      const aid = accountId || session?.accountId;
      if (!aid) return;
      try {
        const b = await apiBalance(aid);
        setBalance(b.balance);
      } catch {
        /* keep local */
      }
    },
    [session?.accountId]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Session;
        setSession(s);
        setView('home');
        if (s.accountId) refreshBalance(s.accountId);
      }
    } catch {
      /* ignore */
    }
  }, [refreshBalance]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setSendResolvedName('');
      if (sendAccount.length !== 10 || !sendBank) return;
      setSendResolving(true);
      try {
        const name = await resolveAccountName(sendAccount, sendBank);
        if (!cancelled) setSendResolvedName(name);
      } catch (e: unknown) {
        if (!cancelled) {
          setSendResolvedName('');
          showToast(e instanceof Error ? e.message : 'Could not resolve account');
        }
      } finally {
        if (!cancelled) setSendResolving(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [sendAccount, sendBank]);

  const persistSession = (s: Session) => {
    setSession(s);
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setBalance(0);
    setTxs([]);
    setView('landing');
  };

  const handleSignup = async () => {
    if (!suName || !suEmail || !suPass || !/^\d{4}$/.test(suPin)) {
      showToast('Fill all fields. PIN must be 4 digits.');
      return;
    }
    setLoading(true);
    try {
      await apiRegister({ email: suEmail, fullName: suName, password: suPass, pin: suPin });
      const s = await apiLogin(suEmail, suPass);
      persistSession(s);
      if (s.accountId) await refreshBalance(s.accountId);
      setView('home');
      showToast('Welcome to Nakconel');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const s = await apiLogin(loginEmail, loginPass);
      persistSession(s);
      if (s.accountId) await refreshBalance(s.accountId);
      setView('home');
      showToast(`Welcome back, ${s.fullName.split(' ')[0]}`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const openPin = (action: 'send' | 'topup') => {
    setPinDigits('');
    setPinError('');
    setPinAction(action);
    setView('pin');
  };

  const onPinComplete = async (pin: string) => {
    if (!session?.accountId || !session.id) return;
    setLoading(true);
    setPinError('');
    try {
      if (pinAction === 'send') {
        const amount = parseFloat(sendAmount);
        if (!amount || amount <= 0) throw new Error('Invalid amount');
        const bankName = NG_BANKS.find((b) => b.code === sendBank)?.name || 'Bank';
        await apiTransfer({
          userId: session.id,
          fromAccountId: session.accountId,
          amount,
          beneficiaryName: sendResolvedName || 'Beneficiary',
          beneficiaryAccount: sendAccount,
          note: sendNote || `${bankName} transfer`,
          pin,
          idempotencyKey: uid(),
        });
        setBalance((b) => Math.max(0, b - (amount + FEE)));
        setTxs((t) => [
          {
            id: uid(),
            type: 'send',
            title: `To ${sendResolvedName || sendAccount}`,
            amount: -amount,
            fee: FEE,
            time: new Date().toLocaleString(),
            status: 'COMPLETED',
          },
          ...t,
        ]);
        setSuccessMsg({
          title: 'Transfer successful',
          msg: `${sendResolvedName} · ${bankName}`,
          amount: formatNGN(amount),
        });
        setSendAmount('');
        setSendBank('');
        setSendAccount('');
        setSendResolvedName('');
        setSendNote('');
        setSendStep('form');
        await refreshBalance();
        setView('success');
      } else if (pinAction === 'topup') {
        const amount = parseFloat(topupAmount);
        if (!amount || amount < 100) throw new Error('Minimum top-up is NGN 100');
        setBalance((b) => b + amount);
        setTxs((t) => [
          {
            id: uid(),
            type: 'topup',
            title: 'Wallet top-up',
            amount,
            time: new Date().toLocaleString(),
            status: 'COMPLETED',
          },
          ...t,
        ]);
        setSuccessMsg({
          title: 'Top-up complete',
          msg: 'Funds added to your wallet',
          amount: formatNGN(amount),
        });
        setTopupAmount('');
        setView('success');
      }
    } catch (e: unknown) {
      setPinError(e instanceof Error ? e.message : 'Failed');
      setPinDigits('');
    } finally {
      setLoading(false);
    }
  };

  const pinPress = (d: string) => {
    if (pinDigits.length >= 4 || loading) return;
    const next = pinDigits + d;
    setPinDigits(next);
    if (next.length === 4) onPinComplete(next);
  };

  const shell = (children: React.ReactNode, opts?: { nav?: boolean; pad?: boolean }) => (
    <div className="app-shell" style={{ paddingBottom: opts?.nav ? 92 : 0 }}>
      {toast ? <div className="toast">{toast}</div> : null}
      <div style={{ padding: opts?.pad === false ? 0 : '20px 20px 0' }}>{children}</div>
      {opts?.nav && session ? (
        <nav className="bottom-nav">
          {(
            [
              ['home', 'Home', IconHome],
              ['send', 'Send', IconSend],
              ['card', 'Card', IconCard],
              ['business', 'Biz', IconBiz],
              ['account', 'Me', IconUser],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              type="button"
              className={`nav-btn${view === v ? ' active' : ''}`}
              onClick={() => setView(v)}
            >
              <span className="nav-icon-wrap">
                <Icon size={20} color="currentColor" />
              </span>
              <span className="nav-label">{label}</span>
            </button>
          ))}
        </nav>
      ) : null}
    </div>
  );

  if (view === 'landing') {
    return shell(
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 28px', textAlign: 'center' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Logo size={110} />
          <h1 style={{ marginTop: 28, fontSize: 38, fontWeight: 700, background: 'linear-gradient(135deg,#f5e6b8,#d4af37 55%,#b8962e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.03em' }}>Nakconel</h1>
          <p style={{ marginTop: 12, color: 'rgba(247,236,212,0.6)', fontSize: 14, maxWidth: 280, lineHeight: 1.55 }}>The future of African finance</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button type="button" className="btn-gold" onClick={() => { setAuthTab('signup'); setView('auth'); }}>Get started</button>
          <button type="button" className="btn-outline" onClick={() => { setAuthTab('login'); setView('auth'); }}>Sign in</button>
        </div>
      </div>,
      { pad: false }
    );
  }

  if (view === 'auth') {
    return shell(
      <div style={{ paddingTop: 12, paddingBottom: 40 }}>
        <button type="button" className="btn-ghost" style={{ marginBottom: 24 }} onClick={() => setView('landing')}>← Back</button>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Logo size={64} />
          <h2 style={{ marginTop: 16, fontSize: 26, fontWeight: 600, color: '#f0d78c' }}>Welcome</h2>
          <p style={{ marginTop: 6, color: 'rgba(247,236,212,0.55)', fontSize: 13 }}>Secure banking, built for Africa</p>
        </div>
        <div className="glass" style={{ padding: 6, display: 'flex', gap: 4, marginBottom: 20 }}>
          <button type="button" className={`tab${authTab === 'login' ? ' on' : ''}`} onClick={() => setAuthTab('login')}>Sign in</button>
          <button type="button" className={`tab${authTab === 'signup' ? ' on' : ''}`} onClick={() => setAuthTab('signup')}>Create account</button>
        </div>
        {authTab === 'login' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="input" placeholder="Email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
            <input className="input" placeholder="Password" type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} />
            <button type="button" className="btn-gold" style={{ marginTop: 8 }} disabled={loading} onClick={handleLogin}>{loading ? 'Signing in…' : 'Sign in'}</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="input" placeholder="Full name" value={suName} onChange={(e) => setSuName(e.target.value)} />
            <input className="input" placeholder="Email" type="email" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
            <input className="input" placeholder="Password (min 6)" type="password" value={suPass} onChange={(e) => setSuPass(e.target.value)} />
            <input className="input" placeholder="4-digit transaction PIN" inputMode="numeric" maxLength={4} value={suPin} onChange={(e) => setSuPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            <button type="button" className="btn-gold" style={{ marginTop: 8 }} disabled={loading} onClick={handleSignup}>{loading ? 'Creating…' : 'Create account'}</button>
          </div>
        )}
      </div>
    );
  }

  if (view === 'pin') {
    return shell(
      <div style={{ textAlign: 'center', paddingTop: 40, paddingBottom: 40 }}>
        <Logo size={44} />
        <h2 style={{ color: '#f0d78c', fontSize: 22, marginTop: 16 }}>Enter PIN</h2>
        <p style={{ color: 'rgba(247,236,212,0.55)', fontSize: 13, marginTop: 8 }}>{pinAction === 'send' ? 'Confirm transfer' : 'Confirm top-up'}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, margin: '28px 0 12px' }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`pin-dot${pinDigits.length > i ? ' on' : ''}`} />
          ))}
        </div>
        {pinError ? <p style={{ color: '#ef7a7a', fontSize: 13 }}>{pinError}</p> : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 280, margin: '28px auto 0' }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) =>
            k === '' ? <div key={i} /> : (
              <button key={i} type="button" className="btn-ghost" style={{ padding: 18, borderRadius: 16, fontSize: 18 }} onClick={() => (k === '⌫' ? setPinDigits((p) => p.slice(0, -1)) : pinPress(k))}>{k}</button>
            )
          )}
        </div>
        <button type="button" className="btn-outline" style={{ marginTop: 28, maxWidth: 200, marginLeft: 'auto', marginRight: 'auto' }} onClick={() => setView(pinAction === 'topup' ? 'topup' : 'send')}>Cancel</button>
      </div>
    );
  }

  if (view === 'success') {
    return shell(
      <div style={{ textAlign: 'center', paddingTop: 56, paddingBottom: 40 }}>
        <div style={{ width: 76, height: 76, borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(95, 212, 146, 0.16)', border: '1px solid rgba(95, 212, 146, 0.45)', color: '#5fd492', boxShadow: '0 0 40px rgba(95,212,146,0.2)' }}><IconCheck size={36} color="#5fd492" /></div>
        <h2 style={{ color: '#f0d78c', fontSize: 22 }}>{successMsg.title}</h2>
        <p style={{ color: 'rgba(247,236,212,0.55)', marginTop: 8 }}>{successMsg.msg}</p>
        <p style={{ fontSize: 32, margin: '24px 0', color: '#f0d78c', fontWeight: 700 }}>{successMsg.amount}</p>
        <button type="button" className="btn-gold" onClick={() => setView('home')}>Done</button>
      </div>
    );
  }

  if (view === 'home' && session) {
    return shell(
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <p style={{ color: 'rgba(247,236,212,0.5)', fontSize: 13 }}>Hello</p>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{session.fullName.split(' ')[0]}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={36} />
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #f0d78c, #d4af37)', color: '#120606', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{session.fullName.charAt(0).toUpperCase()}</div>
          </div>
        </div>
        <div className="balance-card" style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <span style={{ color: 'rgba(247,236,212,0.55)', fontSize: 13 }}>Available balance</span>
            <button type="button" className="btn-ghost" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setHideBal((h) => !h)}>
              {hideBal ? <IconEye size={16} color="#f0d78c" /> : <IconEyeOff size={16} color="#f0d78c" />}
              <span style={{ fontSize: 12 }}>{hideBal ? 'Show' : 'Hide'}</span>
            </button>
          </div>
          <p style={{ fontSize: 36, fontWeight: 700, color: '#f0d78c', marginTop: 14, letterSpacing: '-0.03em', position: 'relative', zIndex: 1 }}>{hideBal ? '••••••••' : formatNGN(balance)}</p>
          <p style={{ marginTop: 10, fontSize: 12, color: 'rgba(247,236,212,0.5)', display: 'flex', alignItems: 'center', gap: 6, position: 'relative', zIndex: 1 }}>
            <IconShield size={14} color="#d4af37" /> NGN · Protected by Nakconel
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 26 }}>
          {([['send', 'Send', IconSend], ['receive', 'Receive', IconReceive], ['topup', 'Top up', IconTopUp], ['history', 'History', IconHistory]] as const).map(([v, label, Icon]) => (
            <button key={v} type="button" className="qa" onClick={() => setView(v)}>
              <span className="qa-icon"><Icon size={22} color="#f0d78c" /></span>
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="glass" style={{ width: '100%', padding: 16, marginBottom: 16, textAlign: 'left', cursor: 'pointer', border: '1px solid rgba(212,175,55,0.25)' }} onClick={() => setView('business')}>
          <p style={{ fontWeight: 700, color: '#f0d78c' }}>Nakconel Business</p>
          <p style={{ fontSize: 12, color: 'rgba(247,236,212,0.5)', marginTop: 4 }}>Invoices · Links · Expenses · Team</p>
        </button>
        <h3 style={{ fontSize: 13, color: 'rgba(247,236,212,0.5)', fontWeight: 600, marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Recent</h3>
        <div className="glass" style={{ padding: '4px 16px', marginBottom: 16 }}>
          {txs.length === 0 ? <p style={{ color: 'rgba(247,236,212,0.45)', fontSize: 13, padding: '22px 0', textAlign: 'center' }}>No transactions yet</p> : txs.slice(0, 4).map((t) => (
            <div key={t.id} className="tx-row">
              <div><div style={{ fontWeight: 500, fontSize: 14 }}>{t.title}</div><div style={{ fontSize: 11, color: 'rgba(247,236,212,0.4)', marginTop: 2 }}>{t.time}</div></div>
              <div style={{ fontWeight: 600, fontSize: 14, color: t.amount >= 0 ? '#5fd492' : '#f0d78c' }}>{t.amount >= 0 ? '+' : ''}{formatNGN(t.amount)}</div>
            </div>
          ))}
        </div>
      </>,
      { nav: true }
    );
  }

  if (view === 'business' && session) {
    return shell(
      <BusinessView userId={session.id} fullName={session.fullName} onToast={showToast} />,
      { nav: true }
    );
  }

  if (view === 'send') {
    const amt = parseFloat(sendAmount || '0') || 0;
    const bankName = NG_BANKS.find((b) => b.code === sendBank)?.name || '';
    if (sendStep === 'confirm') {
      return shell(
        <div style={{ paddingBottom: 28 }}>
          <button type="button" className="btn-ghost" style={{ marginBottom: 16 }} onClick={() => setSendStep('form')}>← Edit</button>
          <h2 className="page-title">Confirm transfer</h2>
          <p className="page-sub">Review details before entering PIN</p>
          <div className="glass" style={{ padding: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: 'rgba(245,230,200,0.45)' }}>You send</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#f0d78c', marginTop: 4 }}>{formatNGN(amt)}</p>
            </div>
            <div style={{ height: 1, background: 'rgba(212,175,55,0.12)', margin: '12px 0' }} />
            <p style={{ fontSize: 12, color: 'rgba(245,230,200,0.45)' }}>To</p>
            <p style={{ fontWeight: 600, marginTop: 4, fontSize: 16 }}>{sendResolvedName}</p>
            <p style={{ fontSize: 13, color: 'rgba(245,230,200,0.55)', marginTop: 4 }}>{bankName} · {sendAccount}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 16 }}>
              <span style={{ color: 'rgba(245,230,200,0.55)' }}>Fee</span>
              <span>{formatNGN(FEE)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 10, fontWeight: 600 }}>
              <span>Total debit</span>
              <span style={{ color: '#f0d78c' }}>{formatNGN(amt + FEE)}</span>
            </div>
          </div>
          <button type="button" className="btn-gold" style={{ marginTop: 20 }} onClick={() => openPin('send')}>Enter PIN to send</button>
        </div>,
        { nav: true }
      );
    }
    return shell(
      <div style={{ paddingBottom: 28 }}>
        <h2 className="page-title">Send money</h2>
        <p className="page-sub">Fee ₦{FEE} · Instant Naira transfer</p>
        <label className="field-label">Amount</label>
        <div className="amount-box">
          <span className="currency">₦</span>
          <input className="input" placeholder="0.00" inputMode="decimal" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} />
        </div>
        <label className="field-label">Bank</label>
        <button
          type="button"
          className="input"
          onClick={() => { setBankSearch(''); setBankPickerOpen(true); }}
          style={{ marginBottom: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%' }}
        >
          {sendBank ? (
            <>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: NG_BANKS.find((b) => b.code === sendBank)?.color || '#d4af37', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {NG_BANKS.find((b) => b.code === sendBank)?.short || 'BK'}
              </span>
              <span style={{ fontWeight: 600, color: '#f5e6c8' }}>{bankName}</span>
            </>
          ) : (
            <span style={{ color: 'rgba(247,236,212,0.45)' }}>Select bank</span>
          )}
        </button>
        {bankPickerOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setBankPickerOpen(false)}>
            <div className="glass" style={{ width: '100%', maxWidth: 440, maxHeight: '72vh', borderRadius: '20px 20px 0 0', padding: '16px 16px 28px', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ fontWeight: 700, fontSize: 16 }}>Select bank</p>
                <button type="button" className="btn-ghost" style={{ padding: '6px 12px' }} onClick={() => setBankPickerOpen(false)}>Close</button>
              </div>
              <input className="input" placeholder="Search bank…" value={bankSearch} onChange={(e) => setBankSearch(e.target.value)} autoFocus style={{ marginBottom: 12 }} />
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {NG_BANKS.filter((b) => !bankSearch.trim() || b.name.toLowerCase().includes(bankSearch.toLowerCase()) || (b.short || '').toLowerCase().includes(bankSearch.toLowerCase())).map((b) => (
                  <button key={b.code} type="button" onClick={() => { setSendBank(b.code); setBankPickerOpen(false); setBankSearch(''); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 8px', background: sendBank === b.code ? 'rgba(212,175,55,0.12)' : 'transparent', border: 'none', borderBottom: '1px solid rgba(212,175,55,0.08)', cursor: 'pointer', textAlign: 'left', borderRadius: 10 }}>
                    <span style={{ width: 42, height: 42, borderRadius: 12, background: b.color || '#d4af37', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{b.short || b.name.slice(0, 2)}</span>
                    <span style={{ fontWeight: 600, color: '#f5e6c8', fontSize: 15 }}>{b.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <label className="field-label">Account number</label>
        <input className="input" placeholder="10-digit account number" inputMode="numeric" maxLength={10} value={sendAccount} onChange={(e) => setSendAccount(e.target.value.replace(/\D/g, '').slice(0, 10))} style={{ marginBottom: 12 }} />
        <div className={`name-box${sendResolvedName ? ' resolved' : ''}`}>
          {sendResolving ? (
            <span style={{ color: 'rgba(247,236,212,0.5)', fontSize: 13 }}>Looking up account…</span>
          ) : sendResolvedName ? (
            <div>
              <p style={{ fontSize: 11, color: 'rgba(247,236,212,0.45)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>Account name</p>
              <p style={{ fontWeight: 700, color: '#5fd492', marginTop: 4, fontSize: 16 }}>{sendResolvedName}</p>
            </div>
          ) : (
            <span style={{ color: 'rgba(247,236,212,0.4)', fontSize: 13 }}>Account name appears after bank + number</span>
          )}
        </div>
        <input className="input" placeholder="Narration (optional)" value={sendNote} onChange={(e) => setSendNote(e.target.value)} style={{ marginBottom: 16 }} />
        <button type="button" className="btn-gold" disabled={!amt || !sendBank || sendAccount.length !== 10 || !sendResolvedName || sendResolving} onClick={() => setSendStep('confirm')}>Continue</button>
      </div>,
      { nav: true }
    );
  }

  if (view === 'receive') {
    const acct = session?.accountId || '—';
    return shell(
      <div style={{ textAlign: 'center', paddingBottom: 28 }}>
        <Logo size={48} />
        <h2 className="page-title" style={{ textAlign: 'center', marginTop: 12 }}>Receive money</h2>
        <p className="page-sub" style={{ textAlign: 'center' }}>Share your account details</p>
        <div className="glass" style={{ padding: 22, textAlign: 'left' }}>
          <p style={{ fontSize: 12, color: 'rgba(245,230,200,0.45)' }}>Account ID</p>
          <p style={{ fontWeight: 600, marginTop: 6, wordBreak: 'break-all', fontSize: 13 }}>{acct}</p>
          <button type="button" className="btn-outline" style={{ marginTop: 16 }} onClick={() => { navigator.clipboard?.writeText(acct); showToast('Copied'); }}>Copy</button>
        </div>
      </div>,
      { nav: true }
    );
  }

  if (view === 'topup') {
    return shell(
      <div style={{ paddingBottom: 28 }}>
        <h2 className="page-title">Top up</h2>
        <p className="page-sub">Add money to your wallet</p>
        <label className="field-label">Amount</label>
        <div className="amount-box">
          <span className="currency">₦</span>
          <input className="input" placeholder="0.00" inputMode="decimal" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} />
        </div>
        <button type="button" className="btn-gold" disabled={!topupAmount || parseFloat(topupAmount) < 100} onClick={() => openPin('topup')}>Continue</button>
      </div>,
      { nav: true }
    );
  }

  if (view === 'history') {
    return shell(
      <div style={{ paddingBottom: 28 }}>
        <h2 className="page-title">History</h2>
        <div className="glass" style={{ padding: '4px 16px' }}>
          {txs.length === 0 ? <p style={{ color: 'rgba(247,236,212,0.45)', fontSize: 13, padding: '22px 0', textAlign: 'center' }}>No transactions yet</p> : txs.map((t) => (
            <div key={t.id} className="tx-row">
              <div><div style={{ fontWeight: 500 }}>{t.title}</div><div style={{ fontSize: 11, color: 'rgba(247,236,212,0.4)', marginTop: 2 }}>{t.time} · {t.status}</div></div>
              <div style={{ fontWeight: 600, color: t.amount >= 0 ? '#5fd492' : '#f0d78c' }}>{t.amount >= 0 ? '+' : ''}{formatNGN(t.amount)}</div>
            </div>
          ))}
        </div>
      </div>,
      { nav: true }
    );
  }

  if (view === 'card') {
    return shell(
      <div style={{ paddingBottom: 28 }}>
        <h2 className="page-title">Virtual card</h2>
        <div className="glass" style={{ padding: 22, background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(18,6,6,0.9))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Logo size={36} />
            <span style={{ fontSize: 11, color: '#f0d78c', letterSpacing: '0.1em', fontWeight: 600 }}>NAKCONEL</span>
          </div>
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 18, letterSpacing: 3, margin: '40px 0 22px' }}>{cardRevealed ? '4532  ••••  ••••  8841' : '••••  ••••  ••••  ••••'}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(245,230,200,0.55)' }}>
            <span style={{ color: '#f5e6c8', fontWeight: 500 }}>{session?.fullName?.toUpperCase() || 'CARD HOLDER'}</span>
            <span>{cardFrozen ? 'FROZEN' : 'ACTIVE'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button type="button" className="btn-outline" style={{ flex: 1, borderRadius: 14, padding: 14 }} onClick={() => setCardFrozen((f) => !f)}>{cardFrozen ? 'Unfreeze' : 'Freeze'}</button>
          <button type="button" className="btn-gold" style={{ flex: 1, borderRadius: 14 }} onClick={() => setCardRevealed((r) => !r)}>{cardRevealed ? 'Hide' : 'Reveal'}</button>
        </div>
      </div>,
      { nav: true }
    );
  }

  if (view === 'account') {
    return shell(
      <div style={{ paddingBottom: 28 }}>
        <h2 className="page-title">Account</h2>
        <div style={{ textAlign: 'center', margin: '16px 0 20px' }}>
          <Logo size={72} />
          <p style={{ fontWeight: 700, fontSize: 18, marginTop: 12 }}>{session?.fullName}</p>
          <p style={{ color: 'rgba(245,230,200,0.55)', fontSize: 13, marginTop: 4 }}>{session?.email}</p>
        </div>
        <div className="glass" style={{ padding: 16 }}>
          <p style={{ color: 'rgba(245,230,200,0.45)', fontSize: 12 }}>Account ID</p>
          <p style={{ fontSize: 12, wordBreak: 'break-all', marginTop: 6 }}>{session?.accountId}</p>
        </div>
        <button type="button" className="btn-outline" style={{ marginTop: 16 }} onClick={() => setView('business')}>Business</button>
        <button type="button" className="btn-outline" style={{ marginTop: 10 }} onClick={() => setView('history')}>Transaction history</button>
        <button type="button" className="btn-ghost" style={{ width: '100%', marginTop: 14, padding: 14, borderRadius: 14, color: '#e07070', borderColor: 'rgba(224,112,112,0.3)' }} onClick={logout}>Log out</button>
      </div>,
      { nav: true }
    );
  }

  return shell(<div style={{ padding: 48, textAlign: 'center', color: 'rgba(247,236,212,0.5)' }}>Loading…</div>);
}
