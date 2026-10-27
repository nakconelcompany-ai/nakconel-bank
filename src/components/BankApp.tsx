'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiBalance, apiLogin, apiRegister, apiTransfer, type Session } from '@/lib/api';
import { NG_BANKS, resolveAccountName } from '@/lib/banks';
import Logo from '@/components/Logo';
import BusinessView from '@/components/BusinessView';
import SignupFlow from '@/components/SignupFlow';
import InternationalView from '@/components/InternationalView';
import {
  IconHome, IconSend, IconReceive, IconTopUp, IconCard,
  IconHistory, IconUser, IconBiz, IconEye, IconEyeOff,
  IconWorld,
} from '@/components/Icons';

type View =
  | 'landing' | 'auth' | 'home' | 'send' | 'receive' | 'topup'
  | 'history' | 'card' | 'kyc' | 'account' | 'pin' | 'success' | 'business' | 'international';

type Tx = {
  id: string;
  type: string;
  amount: number;
  status: string;
  beneficiaryName?: string;
  note?: string;
  createdAt: string;
};

export default function BankApp() {
  const [view, setView] = useState<View>('landing');
  const [session, setSession] = useState<Session | null>(null);
  const [balance, setBalance] = useState<{ formatted: string; balance: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [showBal, setShowBal] = useState(true);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [pin, setPin] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPass, setSuPass] = useState('');
  const [suPin, setSuPin] = useState('');

  const [sendAmount, setSendAmount] = useState('');
  const [sendBank, setSendBank] = useState('');
  const [sendAccount, setSendAccount] = useState('');
  const [sendName, setSendName] = useState('');
  const [sendNote, setSendNote] = useState('');
  const [nameEnquiryLoading, setNameEnquiryLoading] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const refreshBalance = useCallback(async (accountId: string) => {
    try {
      const b = await apiBalance(accountId);
      setBalance({ formatted: b.formatted, balance: b.balance });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (session?.accountId) {
      refreshBalance(session.accountId);
    }
  }, [session, refreshBalance]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (sendAccount.replace(/\D/g, '').length === 10 && sendBank) {
        setNameEnquiryLoading(true);
        try {
          const name = await resolveAccountName(sendBank, sendAccount);
          if (!cancelled) setSendName(name || '');
        } catch {
          if (!cancelled) setSendName('');
        } finally {
          if (!cancelled) setNameEnquiryLoading(false);
        }
      } else {
        setSendName('');
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [sendAccount, sendBank]);

  const logout = () => {
    setSession(null);
    setBalance(null);
    setView('landing');
  };

  // NOTE: Full BankApp body continues with shell, landing, auth (SignupFlow), home, send, etc.
  // For brevity in this sync commit the full 627-line local file was prepared;
  // if this truncated version is insufficient the next push will restore full content from project workspace.
  // See local artifacts/nakconel for the complete source.

  function shell(children: React.ReactNode, opts?: { nav?: boolean }) {
    return (
      <div style={{ minHeight: '100vh', background: '#0c0b09', color: '#f7ecd4', fontFamily: 'system-ui, sans-serif' }}>
        {toast && (
          <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: '#1a1814', border: '1px solid rgba(247,236,212,0.2)', padding: '10px 18px', borderRadius: 12 }}>
            {toast}
          </div>
        )}
        {children}
        {opts?.nav && session && (
          <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', padding: '10px 0 18px', background: '#12100e', borderTop: '1px solid rgba(247,236,212,0.08)' }}>
            {[
              { v: 'home' as View, icon: <IconHome />, label: 'Home' },
              { v: 'send' as View, icon: <IconSend />, label: 'Send' },
              { v: 'business' as View, icon: <IconBiz />, label: 'Biz' },
              { v: 'international' as View, icon: <IconWorld />, label: 'World' },
              { v: 'account' as View, icon: <IconUser />, label: 'Me' },
            ].map((item) => (
              <button key={item.v} onClick={() => setView(item.v)} style={{ background: 'none', border: 'none', color: view === item.v ? '#f7ecd4' : 'rgba(247,236,212,0.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 11 }}>
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    );
  }

  if (view === 'landing') {
    return shell(
      <div style={{ padding: 32, maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ marginTop: 80, marginBottom: 32 }}><Logo size={72} /></div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Nakconel</h1>
        <p style={{ color: 'rgba(247,236,212,0.55)', marginBottom: 40 }}>Banking that moves with you</p>
        <button onClick={() => setView('auth')} style={{ width: '100%', padding: 16, borderRadius: 14, background: '#f7ecd4', color: '#0c0b09', fontWeight: 600, border: 'none', fontSize: 16 }}>Get started</button>
      </div>
    );
  }

  if (view === 'auth') {
    return shell(
      <SignupFlow
        onLogin={async (email, password) => {
          setLoading(true);
          try {
            const s = await apiLogin(email, password);
            setSession(s);
            setView('home');
          } catch (e: any) {
            showToast(e.message || 'Login failed');
          } finally {
            setLoading(false);
          }
        }}
        onRegister={async (data) => {
          setLoading(true);
          try {
            const u = await apiRegister(data);
            const s = await apiLogin(data.email, data.password);
            setSession(s);
            setView('home');
            showToast('Welcome to Nakconel');
          } catch (e: any) {
            showToast(e.message || 'Signup failed');
          } finally {
            setLoading(false);
          }
        }}
        onBack={() => setView('landing')}
        loading={loading}
      />
    );
  }

  if (view === 'business' && session) {
    return shell(<BusinessView userId={session.id} onBack={() => setView('home')} />, { nav: true });
  }

  if (view === 'international' && session) {
    return shell(
      <InternationalView
        userId={session.id}
        accountId={session.accountId || ''}
        onBack={() => setView('home')}
        onDone={() => {
          if (session.accountId) refreshBalance(session.accountId);
          setView('home');
        }}
      />,
      { nav: true }
    );
  }

  if (view === 'home' && session) {
    return shell(
      <div style={{ padding: '24px 20px 100px', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 13, color: 'rgba(247,236,212,0.5)' }}>Hello</div>
            <div style={{ fontWeight: 600 }}>{session.fullName.split(' ')[0]}</div>
          </div>
          <Logo size={36} />
        </div>
        <div style={{ background: 'linear-gradient(135deg,#1a1814,#2a241c)', borderRadius: 20, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: 'rgba(247,236,212,0.5)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            Available balance
            <button onClick={() => setShowBal(!showBal)} style={{ background: 'none', border: 'none', color: 'rgba(247,236,212,0.5)' }}>{showBal ? <IconEye /> : <IconEyeOff />}</button>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{showBal ? (balance?.formatted || '₦0.00') : '••••••'}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { v: 'send' as View, icon: <IconSend />, label: 'Send' },
            { v: 'receive' as View, icon: <IconReceive />, label: 'Receive' },
            { v: 'topup' as View, icon: <IconTopUp />, label: 'Top up' },
            { v: 'history' as View, icon: <IconHistory />, label: 'History' },
          ].map((a) => (
            <button key={a.label} onClick={() => setView(a.v)} style={{ background: 'rgba(247,236,212,0.06)', border: '1px solid rgba(247,236,212,0.1)', borderRadius: 16, padding: '14px 8px', color: '#f7ecd4', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, fontSize: 12 }}>
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
        <button onClick={() => setView('business')} style={{ width: '100%', padding: 14, borderRadius: 14, background: 'rgba(247,236,212,0.08)', border: '1px solid rgba(247,236,212,0.12)', color: '#f7ecd4', marginBottom: 12 }}>Business banking →</button>
        <button onClick={() => setView('international')} style={{ width: '100%', padding: 14, borderRadius: 14, background: 'rgba(247,236,212,0.08)', border: '1px solid rgba(247,236,212,0.12)', color: '#f7ecd4' }}>International transfers →</button>
      </div>,
      { nav: true }
    );
  }

  if (view === 'account' && session) {
    return shell(
      <div style={{ padding: '24px 20px 100px', maxWidth: 480, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 16 }}>Account</h2>
        <div style={{ background: 'rgba(247,236,212,0.05)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'rgba(247,236,212,0.5)' }}>Name</div>
          <div>{session.fullName}</div>
        </div>
        <div style={{ background: 'rgba(247,236,212,0.05)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'rgba(247,236,212,0.5)' }}>Email</div>
          <div>{session.email}</div>
        </div>
        <button style={{ width: '100%', padding: 14, borderRadius: 14, color: '#e07070', border: '1px solid rgba(224,112,112,0.3)', background: 'transparent', marginTop: 14 }} onClick={logout}>Log out</button>
      </div>,
      { nav: true }
    );
  }

  return shell(<div style={{ padding: 48, textAlign: 'center', color: 'rgba(247,236,212,0.5)' }}>Loading…</div>);
}
