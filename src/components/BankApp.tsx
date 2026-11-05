'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiBalance, apiLogin, apiRegister, type Session } from '@/lib/api';
import Logo from '@/components/Logo';
import BusinessView from '@/components/BusinessView';
import BusinessDemoView from '@/components/BusinessDemoView';
import SignupFlow from '@/components/SignupFlow';
import InternationalView from '@/components/InternationalView';
import {
  IconHome, IconSend, IconReceive, IconTopUp, IconCard,
  IconHistory, IconUser, IconBiz, IconEye, IconEyeOff,
} from '@/components/Icons';

type View =
  | 'landing' | 'auth' | 'home' | 'send' | 'receive' | 'topup'
  | 'history' | 'card' | 'kyc' | 'account' | 'business' | 'business-demo' | 'international';

type Tx = {
  id: string;
  type: 'send' | 'receive' | 'topup';
  title: string;
  amount: number;
  fee?: number;
  time: string;
  status: string;
};

const SESSION_KEY = 'nakconel_session';

function formatNGN(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(n);
}

export default function BankApp() {
  const [view, setView] = useState<View>('landing');
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [session, setSession] = useState<Session | null>(null);
  const [balance, setBalance] = useState<{ formatted: string; balance: number } | null>(null);
  const [toast, setToast] = useState('');
  const [showBal, setShowBal] = useState(true);
  const [txs, setTxs] = useState<Tx[]>([]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  }, []);

  const refreshBalance = useCallback(async (accountId: string) => {
    try {
      const b = await apiBalance(accountId);
      setBalance({ formatted: b.formatted, balance: b.balance });
    } catch {
      /* ignore */
    }
  }, []);

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
      /* */
    }
  }, [refreshBalance]);

  useEffect(() => {
    if (session?.accountId) refreshBalance(session.accountId);
  }, [session, refreshBalance]);

  const persistSession = (s: Session) => {
    setSession(s);
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    } catch {
      /* */
    }
  };

  const logout = () => {
    setSession(null);
    setBalance(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* */
    }
    setView('landing');
  };

  function shell(children: React.ReactNode, opts?: { nav?: boolean }) {
    return (
      <div style={{ minHeight: '100vh', background: '#0c0b09', color: '#f7ecd4', fontFamily: 'system-ui, sans-serif' }}>
        {toast ? (
          <div
            style={{
              position: 'fixed',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100,
              background: '#1a1814',
              border: '1px solid rgba(247,236,212,0.2)',
              padding: '10px 18px',
              borderRadius: 12,
              fontSize: 13,
              maxWidth: '90%',
            }}
          >
            {toast}
          </div>
        ) : null}
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 100px' }}>{children}</div>
        {opts?.nav && session ? (
          <nav
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'space-around',
              padding: '10px 0 18px',
              background: '#12100e',
              borderTop: '1px solid rgba(247,236,212,0.08)',
            }}
          >
            {(
              [
                ['home', 'Home', IconHome],
                ['send', 'Send', IconSend],
                ['business', 'Biz', IconBiz],
                ['international', 'World', IconCard],
                ['account', 'Me', IconUser],
              ] as const
            ).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: view === v ? '#f7ecd4' : 'rgba(247,236,212,0.45)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                <Icon size={22} />
                {label}
              </button>
            ))}
          </nav>
        ) : null}
      </div>
    );
  }

  if (view === 'landing') {
    return shell(
      <div style={{ paddingTop: 80, textAlign: 'center' }}>
        <Logo size={72} />
        <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 24, marginBottom: 8 }}>Nakconel</h1>
        <p style={{ color: 'rgba(247,236,212,0.55)', marginBottom: 40 }}>Banking that moves with you</p>
        <button
          type="button"
          className="btn-gold"
          style={{ width: '100%', padding: 16, borderRadius: 14, background: '#f7ecd4', color: '#0c0b09', fontWeight: 600, border: 'none', fontSize: 16 }}
          onClick={() => {
            setAuthTab('signup');
            setView('auth');
          }}
        >
          Get started
        </button>
        <button
          type="button"
          style={{ marginTop: 12, background: 'none', border: 'none', color: 'rgba(247,236,212,0.6)', fontSize: 14 }}
          onClick={() => {
            setAuthTab('login');
            setView('auth');
          }}
        >
          I already have an account
        </button>
        <button
          type="button"
          className="btn-ghost"
          style={{ marginTop: 24, width: '100%', padding: 14 }}
          onClick={() => setView('business-demo')}
        >
          Explore business demo
        </button>
      </div>
    );
  }

  if (view === 'auth') {
    return shell(
      <SignupFlow
        initialTab={authTab}
        onToast={showToast}
        onBack={() => setView('landing')}
        onSuccess={(s) => {
          persistSession(s);
          setView('home');
          if (s.accountId) refreshBalance(s.accountId);
        }}
      />
    );
  }

  if (view === 'business-demo') {
    return shell(<BusinessDemoView onBack={() => setView('landing')} />);
  }

  if (view === 'business' && session) {
    return shell(
      <BusinessView userId={session.id} fullName={session.fullName} onToast={showToast} />,
      { nav: true }
    );
  }

  if (view === 'international' && session) {
    return shell(
      <InternationalView
        userId={session.id}
        onToast={showToast}
      />,
      { nav: true }
    );
  }

  if (view === 'home' && session) {
    return shell(
      <div>
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
            <button type="button" onClick={() => setShowBal(!showBal)} style={{ background: 'none', border: 'none', color: 'rgba(247,236,212,0.5)', cursor: 'pointer' }}>
              {showBal ? <IconEye /> : <IconEyeOff />}
            </button>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{showBal ? balance?.formatted || '₦0.00' : '••••••'}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {(
            [
              ['send', IconSend, 'Send'],
              ['receive', IconReceive, 'Receive'],
              ['topup', IconTopUp, 'Top up'],
              ['history', IconHistory, 'History'],
            ] as const
          ).map(([v, Icon, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setView(v)}
              style={{
                background: 'rgba(247,236,212,0.06)',
                border: '1px solid rgba(247,236,212,0.1)',
                borderRadius: 16,
                padding: '14px 8px',
                color: '#f7ecd4',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <Icon />
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setView('business')}
          style={{ width: '100%', padding: 14, borderRadius: 14, background: 'rgba(247,236,212,0.08)', border: '1px solid rgba(247,236,212,0.12)', color: '#f7ecd4', marginBottom: 12, cursor: 'pointer' }}
        >
          Business banking →
        </button>
        <button
          type="button"
          onClick={() => setView('international')}
          style={{ width: '100%', padding: 14, borderRadius: 14, background: 'rgba(247,236,212,0.08)', border: '1px solid rgba(247,236,212,0.12)', color: '#f7ecd4', cursor: 'pointer' }}
        >
          International transfers →
        </button>
      </div>,
      { nav: true }
    );
  }

  if (view === 'send' && session) {
    return shell(
      <div>
        <h2 style={{ marginBottom: 8 }}>Send money</h2>
        <div role="status" style={{ background: 'rgba(240,215,140,0.1)', border: '1px solid rgba(240,215,140,0.32)', borderRadius: 16, color: '#f0d78c', fontSize: 13, lineHeight: 1.6, padding: 16 }}>
          Bank transfers are currently unavailable. No money will be moved. Transfers can be enabled after a licensed payment provider and settlement checks are in place.
        </div>
      </div>,
      { nav: true }
    );
  }

  if (view === 'receive' && session) {
    return shell(
      <div>
        <h2>Receive</h2>
        <p style={{ fontSize: 13, color: 'rgba(247,236,212,0.5)', marginBottom: 16 }}>No bank-issued receiving account is available yet.</p>
        <div style={{ background: 'rgba(247,236,212,0.05)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, color: 'rgba(247,236,212,0.65)' }}>Your email is not a bank account number. Receiving funds is unavailable until an account provider is connected.</div>
        </div>
      </div>,
      { nav: true }
    );
  }

  if (view === 'topup' && session) {
    return shell(
      <div>
        <h2>Top up</h2>
        <p style={{ fontSize: 13, color: 'rgba(247,236,212,0.5)' }}>Wallet top-ups are unavailable until a payment provider is connected. No funds can be added here.</p>
      </div>,
      { nav: true }
    );
  }

  if (view === 'history' && session) {
    return shell(
      <div>
        <h2>History</h2>
        {txs.length === 0 ? (
          <p style={{ color: 'rgba(247,236,212,0.45)', marginTop: 24, textAlign: 'center' }}>No transactions yet</p>
        ) : (
          txs.map((t) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(247,236,212,0.08)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(247,236,212,0.45)' }}>{t.status}</div>
              </div>
              <div style={{ fontWeight: 700, color: t.type === 'send' ? '#f0d78c' : '#5fd492' }}>
                {t.type === 'send' ? '-' : '+'}{formatNGN(t.amount)}
              </div>
            </div>
          ))
        )}
      </div>,
      { nav: true }
    );
  }

  if (view === 'account' && session) {
    return shell(
      <div>
        <h2 style={{ marginBottom: 16 }}>Account</h2>
        <div style={{ background: 'rgba(247,236,212,0.05)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'rgba(247,236,212,0.5)' }}>Name</div>
          <div>{session.fullName}</div>
        </div>
        <div style={{ background: 'rgba(247,236,212,0.05)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'rgba(247,236,212,0.5)' }}>Email</div>
          <div>{session.email}</div>
        </div>
        <button
          type="button"
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 14,
            color: '#e07070',
            border: '1px solid rgba(224,112,112,0.3)',
            background: 'transparent',
            marginTop: 14,
            cursor: 'pointer',
          }}
          onClick={logout}
        >
          Log out
        </button>
      </div>,
      { nav: true }
    );
  }

  return shell(<div style={{ padding: 48, textAlign: 'center', color: 'rgba(247,236,212,0.5)' }}>Loading…</div>);
}
