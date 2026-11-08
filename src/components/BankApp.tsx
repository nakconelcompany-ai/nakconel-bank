'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiBalance, apiLogin, apiLogout, apiRegister, apiSession, type Session } from '@/lib/api';
import Logo from '@/components/Logo';
import BusinessView from '@/components/BusinessView';
import BusinessDemoView from '@/components/BusinessDemoView';
import SignupFlow from '@/components/SignupFlow';
import InternationalView from '@/components/InternationalView';
import {
  IconHome, IconSend, IconReceive, IconTopUp, IconWorld, IconArrowRight,
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
  const [restoringSession, setRestoringSession] = useState(true);
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
    let cancelled = false;

    async function restoreSession() {
      try {
        const currentSession = await apiSession();
        if (cancelled) return;
        setSession(currentSession);
        setView('home');
        if (currentSession.accountId) refreshBalance(currentSession.accountId);
      } catch {
        if (cancelled) return;
        setSession(null);
        setView('landing');
      } finally {
        try {
          localStorage.removeItem(SESSION_KEY);
        } catch {
          /* */
        }
        if (!cancelled) setRestoringSession(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [refreshBalance]);

  useEffect(() => {
    if (session?.accountId) refreshBalance(session.accountId);
  }, [session, refreshBalance]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const paymentStatus = url.searchParams.get('payment');
    if (!paymentStatus) return;

    if (paymentStatus === 'completed') {
      showToast('Payment verified successfully.');
    } else if (paymentStatus === 'pending') {
      showToast('Payment is still being verified. Check collections again shortly.');
    } else if (paymentStatus === 'requires_review') {
      showToast('Payment was verified but needs manual review before it is applied to the invoice.');
    } else {
      showToast('Payment was not completed.');
    }

    url.searchParams.delete('payment');
    window.history.replaceState({}, '', url);
  }, [showToast]);

  const persistSession = (s: Session) => {
    setSession(s);
  };

  const logout = () => {
    void apiLogout().catch((error: unknown) => {
      showToast(error instanceof Error ? error.message : 'Could not end server session.');
    });
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
    const navItems = [
      ['home', 'Home', IconHome],
      ['send', 'Send', IconSend],
      ['business', 'Business', IconBiz],
      ['international', 'Global', IconWorld],
      ['account', 'Profile', IconUser],
    ] as const;
    const showNav = Boolean(opts?.nav && session);

    return (
      <div className="app-shell">
        {toast ? (
          <div className="toast" role="status">{toast}</div>
        ) : null}
        <header className="brand-header">
          <Logo size={44} className="brand-logo" />
          <div className="brand-copy" aria-label="Nakconel Bank">
            <div className="brand-name">NAKCONEL</div>
            <div className="brand-bank">BANK</div>
          </div>
          <div className="brand-tagline">Secure <span>•</span> Simple <span>•</span> Global</div>
        </header>
        <div className={`app-layout${showNav ? ' has-navigation' : ''}`}>
          {showNav ? (
            <aside className="desktop-sidebar">
              <p className="sidebar-label">YOUR BANK</p>
              <nav className="sidebar-nav" aria-label="Main navigation">
                {navItems.map(([v, label, Icon]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={`sidebar-link${view === v ? ' active' : ''}`}
                    aria-current={view === v ? 'page' : undefined}
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                    {view === v ? <span className="sidebar-current" /> : null}
                  </button>
                ))}
              </nav>
              <div className="sidebar-account">
                <span className="sidebar-account-avatar">{session?.fullName.trim().charAt(0).toUpperCase()}</span>
                <span className="sidebar-account-copy">
                  <strong>{session?.fullName.split(' ')[0]}</strong>
                  <small>Personal account</small>
                </span>
                <button type="button" className="sidebar-logout" onClick={logout}>Sign out</button>
              </div>
            </aside>
          ) : null}
          <main className={`app-content${showNav ? '' : ' no-nav'}`}>{children}</main>
        </div>
        {showNav ? (
          <nav className="bottom-nav" aria-label="Main navigation">
            {navItems.map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`nav-btn${view === v ? ' active' : ''}`}
                aria-current={view === v ? 'page' : undefined}
              >
                <span className="nav-icon-wrap"><Icon size={21} /></span>
                {label === 'Business' ? 'Biz' : label === 'Global' ? 'World' : label === 'Profile' ? 'Me' : label}
              </button>
            ))}
          </nav>
        ) : null}
      </div>
    );
  }

  if (view === 'landing') {
    if (restoringSession) {
      return shell(<div className="session-loading" role="status">Opening your secure banking session…</div>);
    }
    return shell(
      <div className="welcome-screen">
        <section className="welcome-hero">
          <Logo size={82} />
          <p className="welcome-kicker">Secure · Simple · Global</p>
          <h1>Banking for today,<br />building for tomorrow.</h1>
          <p>Everyday money and business tools, designed to move with you.</p>
        </section>
        <button
          type="button"
          className="btn-gold"
          style={{ minHeight: 50 }}
          onClick={() => {
            setAuthTab('signup');
            setView('auth');
          }}
        >Get started</button>
        <button
          type="button"
          className="btn-outline"
          style={{ marginTop: 10, minHeight: 48 }}
          onClick={() => {
            setAuthTab('login');
            setView('auth');
          }}
        >I already have an account</button>
        <div className="welcome-demo">
          <p>Explore Nakconel Business</p>
          <span>Try invoices, payment links and expenses with sample data.</span>
          <button type="button" className="home-shortcut" onClick={() => setView('business-demo')}>
            <span>Open business demo</span><span aria-hidden="true">→</span>
          </button>
        </div>
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
      <BusinessView fullName={session.fullName} onToast={showToast} />,
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
      <div className="home-screen">
        <div className="home-greeting">
          <div>
            <div className="eyebrow">Good day,</div>
            <div className="name">{session.fullName.split(' ')[0]}</div>
          </div>
          <span className="home-avatar" aria-hidden="true">{session.fullName.trim().charAt(0).toUpperCase()}</span>
        </div>
        <section className="balance-card" aria-label="Available balance">
          <div className="balance-label">
            <span>Available balance</span>
            <button type="button" aria-label={showBal ? 'Hide balance' : 'Show balance'} onClick={() => setShowBal(!showBal)}>
              {showBal ? <IconEye /> : <IconEyeOff />}
            </button>
          </div>
          <div className="balance-amount">{showBal ? balance?.formatted || '₦0.00' : '••••••••'}</div>
          <div className="balance-caption">Naira wallet <span>•</span> NGN</div>
        </section>
        <div className="quick-actions">
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
              className="quick-action"
            >
              <span className="quick-action-icon"><Icon size={20} /></span>
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setView('business')}
          className="home-shortcut"
        >
          <span><strong>Business banking</strong><br /><small>Manage invoices and expenses</small></span><IconArrowRight size={19} />
        </button>
        <button
          type="button"
          onClick={() => setView('international')}
          className="home-shortcut"
        >
          <span><strong>International</strong><br /><small>View indicative exchange estimates</small></span><IconArrowRight size={19} />
        </button>
        <h2 className="section-heading">Recent activity</h2>
        <section className="glass activity-card">
          {txs.length === 0 ? (
            <p className="activity-empty">Your recent transactions will appear here.</p>
          ) : txs.slice(0, 4).map((t) => (
            <div key={t.id} className="tx-row">
              <div><strong>{t.title}</strong><div className="activity-meta">{t.status}</div></div>
              <strong className={t.type === 'send' ? 'activity-out' : 'activity-in'}>{t.type === 'send' ? '−' : '+'}{formatNGN(t.amount)}</strong>
            </div>
          ))}
        </section>
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
