'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiBalance, apiLogin, apiRegister, apiTransfer, type Session } from '@/lib/api';

type View =
  | 'landing'
  | 'auth'
  | 'home'
  | 'send'
  | 'receive'
  | 'topup'
  | 'history'
  | 'card'
  | 'kyc'
  | 'account'
  | 'pin'
  | 'success';

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
    : `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
  const [sendName, setSendName] = useState('');
  const [sendAccount, setSendAccount] = useState('');
  const [sendNote, setSendNote] = useState('');
  const [topupAmount, setTopupAmount] = useState('');

  const [pinDigits, setPinDigits] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinAction, setPinAction] = useState<'send' | 'topup' | null>(null);
  const [successMsg, setSuccessMsg] = useState({ title: '', msg: '', amount: '' });

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 2800);
  };

  const refreshBalance = useCallback(async (accountId?: string) => {
    const aid = accountId || session?.accountId;
    if (!aid) return;
    try {
      const b = await apiBalance(aid);
      setBalance(b.balance);
    } catch {
      /* keep local */
    }
  }, [session?.accountId]);

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
        await apiTransfer({
          userId: session.id,
          fromAccountId: session.accountId,
          amount,
          beneficiaryName: sendName,
          beneficiaryAccount: sendAccount,
          note: sendNote || undefined,
          pin,
          idempotencyKey: uid(),
        });
        const total = amount + FEE;
        setBalance((b) => Math.max(0, b - total));
        setTxs((t) => [{
          id: uid(), type: 'send', title: `To ${sendName}`, amount: -amount, fee: FEE,
          time: new Date().toLocaleString(), status: 'COMPLETED',
        }, ...t]);
        setSuccessMsg({ title: 'Sent', msg: `Transfer to ${sendName}`, amount: formatNGN(amount) });
        setSendAmount(''); setSendName(''); setSendAccount(''); setSendNote('');
        await refreshBalance();
        setView('success');
      } else if (pinAction === 'topup') {
        const amount = parseFloat(topupAmount);
        if (!amount || amount < 100) throw new Error('Minimum top-up is NGN 100');
        setBalance((b) => b + amount);
        setTxs((t) => [{
          id: uid(), type: 'topup', title: 'Wallet top-up', amount,
          time: new Date().toLocaleString(), status: 'COMPLETED',
        }, ...t]);
        setSuccessMsg({ title: 'Topped up', msg: 'Funds added to your wallet', amount: formatNGN(amount) });
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

  const shell = (children: React.ReactNode, opts?: { nav?: boolean }) => (
    <div style={{ minHeight: '100vh', maxWidth: 430, margin: '0 auto', position: 'relative', paddingBottom: opts?.nav ? 80 : 0 }}>
      {toast && <div className="toast">{toast}</div>}
      {children}
      {opts?.nav && session && (
        <nav className="glass-strong" style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, display: 'flex', justifyContent: 'space-around', padding: '8px 0 12px', borderTop: '1px solid rgba(212,175,55,0.12)' }}>
          {([['home', 'Home'], ['send', 'Send'], ['card', 'Card'], ['history', 'History'], ['account', 'Me']] as const).map(([v, label]) => (
            <button key={v} className={`nav-item${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
              <span style={{ fontSize: 18 }}>{v === 'home' ? 'H' : v === 'send' ? 'S' : v === 'card' ? 'C' : v === 'history' ? 'T' : 'M'}</span>
              {label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );

  if (view === 'landing') {
    return shell(
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <img src="/logo.png" alt="Nakconel" style={{ width: 72, height: 72, margin: '0 auto 20px', objectFit: 'contain' }} />
        <h1 style={{ fontSize: 28, color: '#d4af37', margin: '0 0 8px' }}>Nakconel Bank</h1>
        <p style={{ opacity: 0.7, marginBottom: 40, lineHeight: 1.5 }}>The future of African finance — secure wallets, instant transfers, virtual cards.</p>
        <button className="btn-gold" style={{ width: '100%', padding: 16, borderRadius: 14, fontSize: 16 }} onClick={() => setView('auth')}>Get started</button>
        <button className="btn-ghost" style={{ width: '100%', padding: 14, borderRadius: 14, marginTop: 12, fontSize: 15 }} onClick={() => { setAuthTab('login'); setView('auth'); }}>I already have an account</button>
      </div>
    );
  }

  if (view === 'auth') {
    return shell(
      <div style={{ padding: '32px 24px' }}>
        <button className="btn-ghost" style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 20 }} onClick={() => setView('landing')}>Back</button>
        <img src="/logo.png" alt="" style={{ width: 48, height: 48, marginBottom: 16, objectFit: 'contain' }} />
        <h2 style={{ margin: '0 0 20px', color: '#d4af37' }}>Welcome</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button className={authTab === 'login' ? 'btn-gold' : 'btn-ghost'} style={{ flex: 1, padding: 12, borderRadius: 10 }} onClick={() => setAuthTab('login')}>Login</button>
          <button className={authTab === 'signup' ? 'btn-gold' : 'btn-ghost'} style={{ flex: 1, padding: 12, borderRadius: 10 }} onClick={() => setAuthTab('signup')}>Sign up</button>
        </div>
        {authTab === 'login' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="input-field" placeholder="Email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
            <input className="input-field" placeholder="Password" type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} />
            <button className="btn-gold" style={{ padding: 14, borderRadius: 12, marginTop: 8 }} disabled={loading} onClick={handleLogin}>{loading ? 'Please wait…' : 'Login'}</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="input-field" placeholder="Full name" value={suName} onChange={(e) => setSuName(e.target.value)} />
            <input className="input-field" placeholder="Email" type="email" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
            <input className="input-field" placeholder="Password (min 6)" type="password" value={suPass} onChange={(e) => setSuPass(e.target.value)} />
            <input className="input-field" placeholder="4-digit transaction PIN" inputMode="numeric" maxLength={4} value={suPin} onChange={(e) => setSuPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            <button className="btn-gold" style={{ padding: 14, borderRadius: 12, marginTop: 8 }} disabled={loading} onClick={handleSignup}>{loading ? 'Creating…' : 'Create account'}</button>
          </div>
        )}
      </div>
    );
  }

  if (view === 'pin') {
    return shell(
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <h2 style={{ color: '#d4af37' }}>Enter PIN</h2>
        <p style={{ opacity: 0.6, marginBottom: 28 }}>{pinAction === 'send' ? 'Confirm transfer' : 'Confirm top-up'}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          {[0, 1, 2, 3].map((i) => (<div key={i} className={`pin-dot${pinDigits.length > i ? ' filled' : ''}`} />))}
        </div>
        {pinError && <p style={{ color: '#e88', fontSize: 13, marginBottom: 12 }}>{pinError}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 280, margin: '24px auto' }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'DEL'].map((k, i) =>
            k === '' ? <div key={i} /> : (
              <button key={i} className="btn-ghost" style={{ padding: 18, borderRadius: 12, fontSize: 18 }} onClick={() => (k === 'DEL' ? setPinDigits((p) => p.slice(0, -1)) : pinPress(k))}>{k}</button>
            )
          )}
        </div>
        <button className="btn-ghost" style={{ padding: '10px 20px', borderRadius: 10, marginTop: 8 }} onClick={() => setView(pinAction === 'topup' ? 'topup' : 'send')}>Cancel</button>
      </div>
    );
  }

  if (view === 'success') {
    return shell(
      <div style={{ padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>OK</div>
        <h2 style={{ color: '#d4af37' }}>{successMsg.title}</h2>
        <p style={{ opacity: 0.7 }}>{successMsg.msg}</p>
        <p style={{ fontSize: 28, margin: '20px 0', color: '#e8c96a' }}>{successMsg.amount}</p>
        <button className="btn-gold" style={{ width: '100%', padding: 14, borderRadius: 12 }} onClick={() => setView('home')}>Done</button>
      </div>
    );
  }

  if (view === 'home' && session) {
    return shell(
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <p style={{ margin: 0, opacity: 0.55, fontSize: 13 }}>Hello</p>
            <h2 style={{ margin: 0, fontSize: 20 }}>{session.fullName.split(' ')[0]}</h2>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#d4af37,#b8962e)', color: '#160808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
            {session.fullName.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="glass" style={{ borderRadius: 20, padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ opacity: 0.6, fontSize: 13 }}>Available balance</span>
            <button className="btn-ghost" style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12 }} onClick={() => setHideBal((h) => !h)}>{hideBal ? 'Show' : 'Hide'}</button>
          </div>
          <p style={{ fontSize: 32, margin: '12px 0 4px', fontWeight: 600, color: '#e8c96a' }}>{hideBal ? '••••••' : formatNGN(balance)}</p>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.4 }}>NGN wallet</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
          {([['send', 'Send'], ['receive', 'Receive'], ['topup', 'Top up'], ['kyc', 'KYC']] as const).map(([v, label]) => (
            <button key={v} className="glass" style={{ padding: '14px 8px', borderRadius: 14, border: 'none', color: '#f5e6b8', cursor: 'pointer' }} onClick={() => setView(v)}>
              <div style={{ fontSize: 11 }}>{label}</div>
            </button>
          ))}
        </div>
        <h3 style={{ fontSize: 14, opacity: 0.7, marginBottom: 12 }}>Recent</h3>
        {txs.length === 0 ? <p style={{ opacity: 0.4, fontSize: 14 }}>No transactions yet</p> : txs.slice(0, 5).map((t) => (
          <div key={t.id} className="glass" style={{ padding: 14, borderRadius: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <div><div style={{ fontWeight: 500 }}>{t.title}</div><div style={{ fontSize: 11, opacity: 0.45 }}>{t.time}</div></div>
            <div style={{ color: t.amount >= 0 ? '#6d6' : '#e8c96a', fontWeight: 600 }}>{t.amount >= 0 ? '+' : ''}{formatNGN(t.amount)}</div>
          </div>
        ))}
      </div>,
      { nav: true }
    );
  }

  if (view === 'send') {
    return shell(
      <div style={{ padding: 20 }}>
        <h2 style={{ color: '#d4af37' }}>Send money</h2>
        <p style={{ opacity: 0.5, fontSize: 13, marginBottom: 20 }}>Fee: NGN {FEE}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input className="input-field" placeholder="Amount (NGN)" inputMode="decimal" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} />
          <input className="input-field" placeholder="Beneficiary name" value={sendName} onChange={(e) => setSendName(e.target.value)} />
          <input className="input-field" placeholder="Account number" inputMode="numeric" value={sendAccount} onChange={(e) => setSendAccount(e.target.value)} />
          <input className="input-field" placeholder="Note (optional)" value={sendNote} onChange={(e) => setSendNote(e.target.value)} />
          <button className="btn-gold" style={{ padding: 14, borderRadius: 12, marginTop: 8 }} onClick={() => {
            if (!sendAmount || !sendName || sendAccount.length < 10) { showToast('Enter amount, name, and account (10+ digits)'); return; }
            openPin('send');
          }}>Continue</button>
        </div>
      </div>,
      { nav: true }
    );
  }

  if (view === 'receive') {
    const acct = session?.accountId || '—';
    return shell(
      <div style={{ padding: 20, textAlign: 'center' }}>
        <h2 style={{ color: '#d4af37' }}>Receive</h2>
        <div className="glass" style={{ borderRadius: 16, padding: 24, margin: '20px 0' }}>
          <p style={{ opacity: 0.5, fontSize: 12 }}>Account ID</p>
          <p style={{ wordBreak: 'break-all', fontWeight: 600 }}>{acct}</p>
          <p style={{ marginTop: 12, opacity: 0.5, fontSize: 12 }}>Name</p>
          <p style={{ fontWeight: 600 }}>{session?.fullName}</p>
        </div>
        <button className="btn-gold" style={{ width: '100%', padding: 14, borderRadius: 12 }} onClick={() => { navigator.clipboard?.writeText(acct); showToast('Account ID copied'); }}>Copy account ID</button>
      </div>,
      { nav: true }
    );
  }

  if (view === 'topup') {
    return shell(
      <div style={{ padding: 20 }}>
        <h2 style={{ color: '#d4af37' }}>Top up</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
          {[1000, 2000, 5000, 10000].map((a) => (
            <button key={a} className="btn-ghost" style={{ padding: '10px 14px', borderRadius: 10 }} onClick={() => setTopupAmount(String(a))}>NGN {a.toLocaleString()}</button>
          ))}
        </div>
        <input className="input-field" placeholder="Amount (min NGN 100)" inputMode="decimal" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} />
        <button className="btn-gold" style={{ width: '100%', padding: 14, borderRadius: 12, marginTop: 16 }} onClick={() => {
          if (!topupAmount || parseFloat(topupAmount) < 100) { showToast('Minimum top-up is NGN 100'); return; }
          openPin('topup');
        }}>Continue</button>
      </div>,
      { nav: true }
    );
  }

  if (view === 'history') {
    return shell(
      <div style={{ padding: 20 }}>
        <h2 style={{ color: '#d4af37' }}>Transactions</h2>
        {txs.length === 0 ? <p style={{ opacity: 0.4, marginTop: 24 }}>No transactions yet</p> : txs.map((t) => (
          <div key={t.id} className="glass" style={{ padding: 14, borderRadius: 12, marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{t.title}</strong>
              <span style={{ color: t.amount >= 0 ? '#6d6' : '#e8c96a' }}>{t.amount >= 0 ? '+' : ''}{formatNGN(t.amount)}</span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.45, marginTop: 4 }}>{t.time} · {t.status}</div>
          </div>
        ))}
      </div>,
      { nav: true }
    );
  }

  if (view === 'card') {
    return shell(
      <div style={{ padding: 20 }}>
        <h2 style={{ color: '#d4af37' }}>Virtual card</h2>
        <div className="card-visual" style={{ marginTop: 16, opacity: cardFrozen ? 0.55 : 1 }}>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>NAKCONEL</p>
          <p style={{ fontSize: 18, letterSpacing: 2, margin: '28px 0 12px', fontFamily: 'monospace' }}>{cardRevealed ? '4532  ••••  ••••  8841' : '••••  ••••  ••••  ••••'}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span>{session?.fullName?.toUpperCase() || 'CARD HOLDER'}</span>
            <span>{cardFrozen ? 'FROZEN' : 'ACTIVE'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn-ghost" style={{ flex: 1, padding: 12, borderRadius: 10 }} onClick={() => setCardFrozen((f) => !f)}>{cardFrozen ? 'Unfreeze' : 'Freeze'}</button>
          <button className="btn-gold" style={{ flex: 1, padding: 12, borderRadius: 10 }} onClick={() => setCardRevealed((r) => !r)}>{cardRevealed ? 'Hide' : 'Reveal'}</button>
        </div>
      </div>,
      { nav: true }
    );
  }

  if (view === 'kyc') {
    return shell(
      <div style={{ padding: 20 }}>
        <h2 style={{ color: '#d4af37' }}>KYC verification</h2>
        <p style={{ opacity: 0.6, fontSize: 14 }}>Status: <strong>{session?.kycStatus || 'NONE'}</strong></p>
        <button className="btn-gold" style={{ width: '100%', padding: 14, borderRadius: 12, marginTop: 20 }} onClick={() => showToast('KYC provider integration coming in Phase 2')}>Start verification</button>
        <button className="btn-ghost" style={{ width: '100%', padding: 12, borderRadius: 12, marginTop: 10 }} onClick={() => setView('home')}>Back home</button>
      </div>,
      { nav: true }
    );
  }

  if (view === 'account') {
    return shell(
      <div style={{ padding: 20 }}>
        <h2 style={{ color: '#d4af37' }}>Account</h2>
        <div className="glass" style={{ padding: 16, borderRadius: 14, marginTop: 16 }}>
          <p style={{ margin: 0, opacity: 0.5, fontSize: 12 }}>Name</p>
          <p style={{ margin: '4px 0 12px', fontWeight: 600 }}>{session?.fullName}</p>
          <p style={{ margin: 0, opacity: 0.5, fontSize: 12 }}>Email</p>
          <p style={{ margin: '4px 0 12px', fontWeight: 600 }}>{session?.email}</p>
          <p style={{ margin: 0, opacity: 0.5, fontSize: 12 }}>Account ID</p>
          <p style={{ margin: '4px 0', fontSize: 12, wordBreak: 'break-all' }}>{session?.accountId}</p>
        </div>
        <button className="btn-ghost" style={{ width: '100%', padding: 14, borderRadius: 12, marginTop: 20 }} onClick={logout}>Log out</button>
      </div>,
      { nav: true }
    );
  }

  return shell(<div style={{ padding: 40, textAlign: 'center' }}><p>Loading…</p></div>);
}
