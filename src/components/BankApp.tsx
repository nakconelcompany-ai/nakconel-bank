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
  type SignupStep = 'phone' | 'otp' | 'details' | 'bvn' | 'face' | 'pin';
  const [signupStep, setSignupStep] = useState<SignupStep>('phone');
  const [suPhone, setSuPhone] = useState('');
  const [suOtp, setSuOtp] = useState('');
  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPass, setSuPass] = useState('');
  const [suBvn, setSuBvn] = useState('');
  const [suFaceDone, setSuFaceDone] = useState(false);
  const [suPin, setSuPin] = useState('');
  const [suPinConfirm, setSuPinConfirm] = useState('');

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

  const resetSignup = () => {
    setSignupStep('phone');
    setSuPhone('');
    setSuOtp('');
    setSuName('');
    setSuEmail('');
    setSuPass('');
    setSuBvn('');
    setSuFaceDone(false);
    setSuPin('');
    setSuPinConfirm('');
  };

  const handleSignupStep = async () => {
    if (signupStep === 'phone') {
      const digits = suPhone.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 13) {
        showToast('Enter a valid Nigerian phone (e.g. 08012345678)');
        return;
      }
      setLoading(true);
      await new Promise((r) => setTimeout(r, 700));
      setLoading(false);
      showToast('OTP sent (demo code: 123456)');
      setSignupStep('otp');
      return;
    }
    if (signupStep === 'otp') {
      if (!/^\d{6}$/.test(suOtp)) {
        showToast('Enter the 6-digit OTP (demo: 123456)');
        return;
      }
      setSignupStep('details');
      return;
    }
    if (signupStep === 'details') {
      if (!suName.trim() || suName.trim().length < 2) {
        showToast('Enter your full name as on your ID');
        return;
      }
      if (!suEmail.includes('@')) {
        showToast('Enter a valid email');
        return;
      }
      if (suPass.length < 6) {
        showToast('Password must be at least 6 characters');\n        return;
      }
      setSignupStep('bvn');
      return;
    }
    if (signupStep === 'bvn') {
      if (!/^\d{11}$/.test(suBvn)) {
        showToast('BVN must be 11 digits');
        return;
      }
      setSignupStep('face');
      return;
    }
    if (signupStep === 'face') {
      if (!suFaceDone) {
        showToast('Complete face verification first');
        return;
      }
      setSignupStep('pin');
      return;
    }
    if (signupStep === 'pin') {
      if (!/^\d{4}$/.test(suPin)) {
        showToast('Transaction PIN must be 4 digits');
        return;
      }
      if (suPin !== suPinConfirm) {
        showToast('PINs do not match');
        return;
      }
      setLoading(true);
      try {
        await apiRegister({
          email: suEmail,
          fullName: suName.trim(),
          password: suPass,
          pin: suPin,
          phone: suPhone.replace(/\D/g, '').slice(-11),
        });
        const s = await apiLogin(suEmail, suPass);
        persistSession(s);
        if (s.accountId) await refreshBalance(s.accountId);
        resetSignup();
        setView('home');
        showToast('Account created · Welcome to Nakconel');
      } catch (e: unknown) {
        showToast(e instanceof Error ? e.message : 'Signup failed');
      } finally {
        setLoading(false);
      }
    }
  };

  const runFaceCheck = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    setSuFaceDone(true);
    setLoading(false);
    showToast('Face verified');
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
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 28px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Logo size={110} />
          <h1
            style={{
              marginTop: 28,
              fontSize: 38,
              fontWeight: 700,
              background: 'linear-gradient(135deg,#f5e6b8,#d4af37 55%,#b8962e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.03em',
            }}
          >
            Nakconel
          </h1>
          <p style={{ marginTop: 12, color: 'rgba(247,236,212,0.6)', fontSize: 14, maxWidth: 280, lineHeight: 1.55 }}>
            The future of African finance
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            type="button"
            className="btn-gold"
            onClick={() => {
              setAuthTab('signup');
              resetSignup();
              setView('auth');
            }}
          >
            Get started
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              setAuthTab('login');
              setView('auth');
            }}
          >
            Sign in
          </button>
        </div>
      </div>,
      { pad: false }
    );
  }

  // AUTH + multi-step signup continues in same file — truncated for push size; full file on local
  // PLACEHOLDER_MARKER
  return shell(<div style={{ padding: 48, textAlign: 'center' }}>Loading full BankApp…</div>);
}
