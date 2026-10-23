'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiBalance, apiLogin, apiRegister, apiTransfer, type Session } from '@/lib/api';

type View = 'landing' | 'auth' | 'home' | 'send' | 'receive' | 'topup' | 'history' | 'card' | 'kyc' | 'account' | 'pin' | 'success';
type Tx = { id: string; type: 'send' | 'receive' | 'topup'; title: string; amount: number; fee?: number; time: string; status: string };

const FEE = 50;
const SESSION_KEY = 'nakconel_session';

function formatNGN(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(n);
}
function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id_${Date.now()}`;
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

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2800); };

  const refreshBalance = useCallback(async (accountId?: string) => {
    const aid = accountId || session?.accountId;
    if (!aid) return;
    try { const b = await apiBalance(aid); setBalance(b.balance); } catch { /* */ }
  }, [session?.accountId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Session;
        setSession(s); setView('home');
        if (s.accountId) refreshBalance(s.accountId);
      }
    } catch { /* */ }
  }, [refreshBalance]);

  const persistSession = (s: Session) => { setSession(s); localStorage.setItem(SESSION_KEY, JSON.stringify(s)); };
  const logout = () => { localStorage.removeItem(SESSION_KEY); setSession(null); setBalance(0); setTxs([]); setView('landing'); };

  const handleSignup = async () => {
    if (!suName || !suEmail || !suPass || !/^\d{4}$/.test(suPin)) { showToast('Fill all fields. PIN must be 4 digits.'); return; }
    setLoading(true);
    try {
      await apiRegister({ email: suEmail, fullName: suName, password: suPass, pin: suPin });
      const s = await apiLogin(suEmail, suPass);
      persistSession(s);
      if (s.accountId) await refreshBalance(s.accountId);
      setView('home'); showToast('Welcome to Nakconel');
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : 'Signup failed'); }
    finally { setLoading(false); }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const s = await apiLogin(loginEmail, loginPass);
      persistSession(s);
      if (s.accountId) await refreshBalance(s.accountId);
      setView('home'); showToast(`Welcome back, ${s.fullName.split(' ')[0]}`);
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : 'Login failed'); }
    finally { setLoading(false); }
  };

  const openPin = (action: 'send' | 'topup') => { setPinDigits(''); setPinError(''); setPinAction(action); setView('pin'); };

  const onPinComplete = async (pin: string) => {
    if (!session?.accountId || !session.id) return;
    setLoading(true); setPinError('');
    try {
      if (pinAction === 'send') {
        const amount = parseFloat(sendAmount);
        if (!amount || amount <= 0) throw new Error('Invalid amount');
        await apiTransfer({ userId: session.id, fromAccountId: session.accountId, amount, beneficiaryName: sendName, beneficiaryAccount: sendAccount, note: sendNote || undefined, pin, idempotencyKey: uid() });
        setBalance((b) => Math.max(0, b - (amount + FEE)));
        setTxs((t) => [{ id: uid(), type: 'send', title: `To ${sendName}`, amount: -amount, fee: FEE, time: new Date().toLocaleString(), status: 'COMPLETED' }, ...t]);
        setSuccessMsg({ title: 'Sent successfully', msg: `Transfer to ${sendName}`, amount: formatNGN(amount) });
        setSendAmount(''); setSendName(''); setSendAccount(''); setSendNote('');
        await refreshBalance(); setView('success');
      } else if (pinAction === 'topup') {
        const amount = parseFloat(topupAmount);
        if (!amount || amount < 100) throw new Error('Minimum top-up is NGN 100');
        setBalance((b) => b + amount);
        setTxs((t) => [{ id: uid(), type: 'topup', title: 'Wallet top-up', amount, time: new Date().toLocaleString(), status: 'COMPLETED' }, ...t]);
        setSuccessMsg({ title: 'Top-up complete', msg: 'Funds added to your wallet', amount: formatNGN(amount) });
        setTopupAmount(''); setView('success');
      }
    } catch (e: unknown) { setPinError(e instanceof Error ? e.message : 'Failed'); setPinDigits(''); }
    finally { setLoading(false); }
  };

  const pinPress = (d: string) => {
    if (pinDigits.length >= 4 || loading) return;
    const next = pinDigits + d; setPinDigits(next);
    if (next.length === 4) onPinComplete(next);
  };

  const shell = (children: React.ReactNode, opts?: { nav?: boolean; pad?: boolean }) => (
    <div className="app-shell" style={{ paddingBottom: opts?.nav ? 88 : 0 }}>
      {toast ? <div className="toast">{toast}</div> : null}
      <div style={{ padding: opts?.pad === false ? 0 : '20px 20px 0' }}>{children}</div>
      {opts?.nav && session ? (
        <nav className="bottom-nav">
          {([['home', 'Home', 'H'], ['send', 'Send', 'S'], ['card', 'Card', 'C'], ['history', 'History', 'T'], ['account', 'Me', 'M']] as const).map(([v, label, icon]) => (
            <button key={v} type="button" className={`nav-btn${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
              <span style={{ fontSize: 14 }}>{icon}</span>{label}
            </button>
          ))}
        </nav>
      ) : null}
    </div>
  );

  if (view === 'landing') {
    return shell(
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 28px 48px', textAlign: 'center' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/logo.png" alt="Nakconel" className="logo-mark" />
          <h1 style={{ marginTop: 28, fontSize: 36, fontWeight: 600, color: 'var(--gold-light)', letterSpacing: '-0.02em' }}>Nakconel</h1>
          <p style={{ marginTop: 10, color: 'var(--muted)', fontSize: 14, lineHeight: 1.5, maxWidth: 260 }}>The future of African finance</p>
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
        <button type="button" className="btn-ghost" style={{ marginBottom: 28 }} onClick={() => setView('landing')}>Back</button>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo.png" alt="" style={{ width: 56, height: 56, objectFit: 'contain' }} />
          <h2 style={{ marginTop: 14, fontSize: 24, color: 'var(--gold-light)' }}>Welcome</h2>
          <p style={{ marginTop: 6, color: 'var(--muted)', fontSize: 13 }}>Secure banking, built for Africa</p>
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
            <input className="input" placeholder="Password (min 6 characters)" type="password" value={suPass} onChange={(e) => setSuPass(e.target.value)} />
            <input className="input" placeholder="4-digit transaction PIN" inputMode="numeric" maxLength={4} value={suPin} onChange={(e) => setSuPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            <button type="button" className="btn-gold" style={{ marginTop: 8 }} disabled={loading} onClick={handleSignup}>{loading ? 'Creating account…' : 'Create account'}</button>
          </div>
        )}
      </div>
    );
  }

  if (view === 'pin') {
    return shell(
      <div style={{ textAlign: 'center', paddingTop: 48, paddingBottom: 40 }}>
        <img src="/logo.png" alt="" style={{ width: 40, height: 40, objectFit: 'contain', marginBottom: 20 }} />
        <h2 style={{ color: 'var(--gold-light)', fontSize: 22 }}>Enter PIN</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>{pinAction === 'send' ? 'Confirm your transfer' : 'Confirm your top-up'}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, margin: '28px 0 12px' }}>
          {[0, 1, 2, 3].map((i) => <div key={i} className={`pin-dot${pinDigits.length > i ? ' on' : ''}`} />)}
        </div>
        {pinError ? <p style={{ color: 'var(--danger)', fontSize: 13 }}>{pinError}</p> : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 280, margin: '28px auto 0' }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'DEL'].map((k, i) =>
            k === '' ? <div key={i} /> : (
              <button key={i} type="button" className="btn-ghost" style={{ padding: 18, borderRadius: 16, fontSize: 18 }} onClick={() => (k === 'DEL' ? setPinDigits((p) => p.slice(0, -1)) : pinPress(k))}>{k}</button>
            )
          )}
        </div>
        <button type="button" className="btn-outline" style={{ marginTop: 28, maxWidth: 200 }} onClick={() => setView(pinAction === 'topup' ? 'topup' : 'send')}>Cancel</button>
      </div>
    );
  }

  if (view === 'success') {
    return shell(
      <div style={{ textAlign: 'center', paddingTop: 64, paddingBottom: 40 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(109, 202, 142, 0.12)', border: '1px solid rgba(109, 202, 142, 0.35)', color: 'var(--ok)', fontSize: 28, fontWeight: 700 }}>OK</div>
        <h2 style={{ color: 'var(--gold-light)', fontSize: 22 }}>{successMsg.title}</h2>
        <p style={{ color: 'var(--muted)', marginTop: 8 }}>{successMsg.msg}</p>
        <p style={{ fontSize: 30, margin: '24px 0', color: 'var(--gold-light)', fontWeight: 600 }}>{successMsg.amount}</p>
        <button type="button" className="btn-gold" onClick={() => setView('home')}>Done</button>
      </div>
    );
  }

  if (view === 'home' && session) {
    return shell(
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Hello</p>
            <h2 style={{ fontSize: 22, fontWeight: 600, marginTop: 2 }}>{session.fullName.split(' ')[0]}</h2>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #f0d78c, #d4af37)', color: '#120606', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{session.fullName.charAt(0).toUpperCase()}</div>
        </div>
        <div className="balance-card" style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>Available balance</span>
            <button type="button" className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setHideBal((h) => !h)}>{hideBal ? 'Show' : 'Hide'}</button>
          </div>
          <p style={{ fontSize: 34, fontWeight: 600, color: 'var(--gold-light)', marginTop: 12, letterSpacing: '-0.02em' }}>{hideBal ? '••••••••' : formatNGN(balance)}</p>
          <p style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>NGN wallet · Protected</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 28 }}>
          {([['send', 'Send', '↗'], ['receive', 'Receive', '↙'], ['topup', 'Top up', '+'], ['card', 'Card', '▭']] as const).map(([v, label, icon]) => (
            <button key={v} type="button" className="qa" onClick={() => setView(v)}><span className="qa-icon">{icon}</span>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500 }}>Recent activity</h3>
        </div>
        <div className="glass" style={{ padding: '4px 16px', marginBottom: 16 }}>
          {txs.length === 0 ? <p style={{ color: 'var(--muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No transactions yet</p> : txs.slice(0, 4).map((t) => (
            <div key={t.id} className="tx-row">
              <div><div style={{ fontWeight: 500, fontSize: 14 }}>{t.title}</div><div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t.time}</div></div>
              <div style={{ fontWeight: 600, fontSize: 14, color: t.amount >= 0 ? 'var(--ok)' : 'var(--gold-light)' }}>{t.amount >= 0 ? '+' : ''}{formatNGN(t.amount)}</div>
            </div>
          ))}
        </div>
      </>,
      { nav: true }
    );
  }

  if (view === 'send') {
    const amt = parseFloat(sendAmount || '0') || 0;
    return shell(
      <div style={{ paddingBottom: 24 }}>
        <h2 style={{ color: 'var(--gold-light)', fontSize: 22, marginBottom: 6 }}>Send money</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 22 }}>Transfer fee NGN {FEE}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input className="input" placeholder="Amount (NGN)" inputMode="decimal" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} />
          <input className="input" placeholder="Beneficiary name" value={sendName} onChange={(e) => setSendName(e.target.value)} />
          <input className="input" placeholder="Account number" inputMode="numeric" value={sendAccount} onChange={(e) => setSendAccount(e.target.value)} />
          <input className="input" placeholder="Note (optional)" value={sendNote} onChange={(e) => setSendNote(e.target.value)} />
          {amt > 0 ? <div className="glass" style={{ padding: 14, fontSize: 13, color: 'var(--muted)' }}>You will debit <span style={{ color: 'var(--gold-light)', fontWeight: 600 }}>{formatNGN(amt + FEE)}</span></div> : null}
          <button type="button" className="btn-gold" style={{ marginTop: 8 }} onClick={() => { if (!sendAmount || !sendName || sendAccount.length < 10) { showToast('Enter amount, name, and account'); return; } openPin('send'); }}>Continue</button>
        </div>
      </div>,
      { nav: true }
    );
  }

  if (view === 'receive') {
    const acct = session?.accountId || '—';
    return shell(
      <div style={{ textAlign: 'center', paddingBottom: 24 }}>
        <h2 style={{ color: 'var(--gold-light)', fontSize: 22 }}>Receive</h2>
        <div className="glass" style={{ padding: 24, margin: '24px 0', textAlign: 'left' }}>
          <p style={{ color: 'var(--muted)', fontSize: 12 }}>Account ID</p>
          <p style={{ fontWeight: 600, marginTop: 6, wordBreak: 'break-all', fontSize: 13 }}>{acct}</p>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 16 }}>Name</p>
          <p style={{ fontWeight: 600, marginTop: 6 }}>{session?.fullName}</p>
        </div>
        <button type="button" className="btn-gold" onClick={() => { navigator.clipboard?.writeText(acct); showToast('Account ID copied'); }}>Copy account ID</button>
      </div>,
      { nav: true }
    );
  }

  if (view === 'topup') {
    return shell(
      <div style={{ paddingBottom: 24 }}>
        <h2 style={{ color: 'var(--gold-light)', fontSize: 22 }}>Top up</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6, marginBottom: 18 }}>Minimum NGN 100</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {[1000, 2000, 5000, 10000].map((a) => (
            <button key={a} type="button" className="btn-ghost" style={{ borderRadius: 999, padding: '10px 14px' }} onClick={() => setTopupAmount(String(a))}>NGN {a.toLocaleString()}</button>
          ))}
        </div>
        <input className="input" placeholder="Custom amount" inputMode="decimal" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} />
        <button type="button" className="btn-gold" style={{ marginTop: 16 }} onClick={() => { if (!topupAmount || parseFloat(topupAmount) < 100) { showToast('Minimum top-up is NGN 100'); return; } openPin('topup'); }}>Continue</button>
      </div>,
      { nav: true }
    );
  }

  if (view === 'history') {
    return shell(
      <div style={{ paddingBottom: 24 }}>
        <h2 style={{ color: 'var(--gold-light)', fontSize: 22, marginBottom: 16 }}>Transactions</h2>
        <div className="glass" style={{ padding: '4px 16px' }}>
          {txs.length === 0 ? <p style={{ color: 'var(--muted)', fontSize: 13, padding: '28px 0', textAlign: 'center' }}>No transactions yet</p> : txs.map((t) => (
            <div key={t.id} className="tx-row">
              <div><div style={{ fontWeight: 500 }}>{t.title}</div><div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t.time} · {t.status}</div></div>
              <div style={{ fontWeight: 600, color: t.amount >= 0 ? 'var(--ok)' : 'var(--gold-light)' }}>{t.amount >= 0 ? '+' : ''}{formatNGN(t.amount)}</div>
            </div>
          ))}
        </div>
      </div>,
      { nav: true }
    );
  }

  if (view === 'card') {
    return shell(
      <div style={{ paddingBottom: 24 }}>
        <h2 style={{ color: 'var(--gold-light)', fontSize: 22, marginBottom: 16 }}>Virtual card</h2>
        <div className="card-face" style={{ opacity: cardFrozen ? 0.55 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <img src="/logo.png" alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <span style={{ fontSize: 11, color: 'var(--gold-light)', letterSpacing: '0.08em' }}>NAKCONEL</span>
          </div>
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 18, letterSpacing: 2, margin: '36px 0 20px' }}>{cardRevealed ? '4532  ••••  ••••  8841' : '••••  ••••  ••••  ••••'}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
            <span style={{ color: 'var(--cream)' }}>{session?.fullName?.toUpperCase() || 'CARD HOLDER'}</span>
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

  if (view === 'kyc') {
    return shell(
      <div style={{ paddingBottom: 24 }}>
        <h2 style={{ color: 'var(--gold-light)', fontSize: 22 }}>Verification</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8, marginBottom: 18 }}>Status: <strong style={{ color: 'var(--gold-light)' }}>{session?.kycStatus || 'NONE'}</strong></p>
        <div className="glass" style={{ padding: 18 }}>
          <p style={{ fontWeight: 600, marginBottom: 10 }}>What you need</p>
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>1. Personal details<br />2. BVN<br />3. ID + selfie</p>
        </div>
        <button type="button" className="btn-gold" style={{ marginTop: 18 }} onClick={() => showToast('KYC provider integration in Phase 2')}>Start verification</button>
        <button type="button" className="btn-outline" style={{ marginTop: 10 }} onClick={() => setView('home')}>Back to home</button>
      </div>,
      { nav: true }
    );
  }

  if (view === 'account') {
    return shell(
      <div style={{ paddingBottom: 24 }}>
        <h2 style={{ color: 'var(--gold-light)', fontSize: 22, marginBottom: 16 }}>Account</h2>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img src="/logo.png" alt="" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 12 }} />
          <p style={{ fontWeight: 600, fontSize: 18 }}>{session?.fullName}</p>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{session?.email}</p>
        </div>
        <div className="glass" style={{ padding: 16 }}>
          <p style={{ color: 'var(--muted)', fontSize: 12 }}>Account ID</p>
          <p style={{ fontSize: 12, wordBreak: 'break-all', marginTop: 6 }}>{session?.accountId}</p>
        </div>
        <button type="button" className="btn-outline" style={{ marginTop: 20 }} onClick={() => setView('kyc')}>KYC verification</button>
        <button type="button" className="btn-ghost" style={{ width: '100%', marginTop: 12, padding: 14, borderRadius: 14, color: 'var(--danger)', borderColor: 'rgba(224,112,112,0.3)' }} onClick={logout}>Log out</button>
      </div>,
      { nav: true }
    );
  }

  return shell(<div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>);
}
