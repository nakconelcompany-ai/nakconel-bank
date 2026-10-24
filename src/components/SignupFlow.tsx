'use client';

import { useState } from 'react';
import Logo from '@/components/Logo';
import { IconCheck } from '@/components/Icons';
import { apiRegister, apiLogin, type Session } from '@/lib/api';

type SignupStep = 'phone' | 'otp' | 'details' | 'bvn' | 'face' | 'pin';

type Props = {
  onSuccess: (session: Session) => void;
  onToast: (m: string) => void;
  onBack: () => void;
  initialTab?: 'login' | 'signup';
};

export default function SignupFlow({ onSuccess, onToast, onBack, initialTab = 'signup' }: Props) {
  const [authTab, setAuthTab] = useState<'login' | 'signup'>(initialTab);
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [step, setStep] = useState<SignupStep>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [bvn, setBvn] = useState('');
  const [faceDone, setFaceDone] = useState(false);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');

  const steps: SignupStep[] = ['phone', 'otp', 'details', 'bvn', 'face', 'pin'];
  const stepIndex = steps.indexOf(step);
  const stepMeta: Record<SignupStep, { title: string; sub: string }> = {
    phone: { title: 'Your phone number', sub: "We'll send a one-time code" },
    otp: { title: 'Enter OTP', sub: 'Demo code: 123456' },
    details: { title: 'Personal details', sub: 'Name must match your ID' },
    bvn: { title: 'Link your BVN', sub: 'Required by CBN for higher limits' },
    face: { title: 'Face verification', sub: 'Confirm you are a real person' },
    pin: { title: 'Transaction PIN', sub: '4 digits · used to approve payments' },
  };

  const reset = () => {
    setStep('phone');
    setPhone('');
    setOtp('');
    setName('');
    setEmail('');
    setPass('');
    setBvn('');
    setFaceDone(false);
    setPin('');
    setPin2('');
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const s = await apiLogin(loginEmail, loginPass);
      onSuccess(s);
      onToast(`Welcome back, ${s.fullName.split(' ')[0]}`);
    } catch (e: unknown) {
      onToast(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const runFaceCheck = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1600));
    setFaceDone(true);
    setLoading(false);
    onToast('Face verified');
  };

  const next = async () => {
    if (step === 'phone') {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 13) {
        onToast('Enter a valid Nigerian phone (e.g. 08012345678)');
        return;
      }
      setLoading(true);
      await new Promise((r) => setTimeout(r, 600));
      setLoading(false);
      onToast('OTP sent (demo code: 123456)');
      setStep('otp');
      return;
    }
    if (step === 'otp') {
      if (!/^\d{6}$/.test(otp)) {
        onToast('Enter the 6-digit OTP (demo: 123456)');
        return;
      }
      setStep('details');
      return;
    }
    if (step === 'details') {
      if (!name.trim() || name.trim().length < 2) {
        onToast('Enter your full name as on your ID');
        return;
      }
      if (!email.includes('@')) {
        onToast('Enter a valid email');
        return;
      }
      if (pass.length < 6) {
        onToast('Password must be at least 6 characters');
        return;
      }
      setStep('bvn');
      return;
    }
    if (step === 'bvn') {
      if (!/^\d{11}$/.test(bvn)) {
        onToast('BVN must be 11 digits');
        return;
      }
      setStep('face');
      return;
    }
    if (step === 'face') {
      if (!faceDone) {
        onToast('Complete face verification first');
        return;
      }
      setStep('pin');
      return;
    }
    if (step === 'pin') {
      if (!/^\d{4}$/.test(pin)) {
        onToast('Transaction PIN must be 4 digits');
        return;
      }
      if (pin !== pin2) {
        onToast('PINs do not match');
        return;
      }
      setLoading(true);
      try {
        await apiRegister({
          email,
          fullName: name.trim(),
          password: pass,
          pin,
          phone: phone.replace(/\D/g, '').slice(-11),
        });
        const s = await apiLogin(email, pass);
        reset();
        onSuccess(s);
        onToast('Account created · Welcome to Nakconel');
      } catch (e: unknown) {
        onToast(e instanceof Error ? e.message : 'Signup failed');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ paddingTop: 12, paddingBottom: 40 }}>
      <button
        type="button"
        className="btn-ghost"
        style={{ marginBottom: 16 }}
        onClick={() => {
          if (authTab === 'signup' && step !== 'phone') {
            setStep(steps[Math.max(0, stepIndex - 1)]);
            return;
          }
          onBack();
          reset();
        }}
      >
        ← Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <Logo size={56} />
        <h2 style={{ marginTop: 14, fontSize: 24, fontWeight: 600, color: '#f0d78c' }}>Welcome</h2>
        <p style={{ marginTop: 6, color: 'rgba(245,230,200,0.55)', fontSize: 13 }}>Secure banking, built for Africa</p>
      </div>

      <div className="glass" style={{ padding: 6, display: 'flex', gap: 4, marginBottom: 18 }}>
        <button
          type="button"
          className={`tab${authTab === 'login' ? ' on' : ''}`}
          onClick={() => {
            setAuthTab('login');
            reset();
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`tab${authTab === 'signup' ? ' on' : ''}`}
          onClick={() => {
            setAuthTab('signup');
            reset();
          }}
        >
          Create account
        </button>
      </div>

      {authTab === 'login' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="field-label">Email</label>
          <input className="input" placeholder="you@email.com" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
          <label className="field-label">Password</label>
          <input className="input" placeholder="Password" type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} />
          <button type="button" className="btn-gold" style={{ marginTop: 8 }} disabled={loading} onClick={handleLogin}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 8 }}>
            {steps.map((s, i) => (
              <div
                key={s}
                style={{
                  width: i === stepIndex ? 18 : 8,
                  height: 8,
                  borderRadius: 999,
                  background: i <= stepIndex ? '#d4af37' : 'rgba(247,236,212,0.2)',
                }}
              />
            ))}
          </div>
          <p style={{ fontWeight: 700, fontSize: 17, color: '#f0d78c', textAlign: 'center' }}>{stepMeta[step].title}</p>
          <p style={{ fontSize: 12, color: 'rgba(247,236,212,0.5)', textAlign: 'center', marginBottom: 4 }}>{stepMeta[step].sub}</p>

          {step === 'phone' && (
            <>
              <label className="field-label">Phone number</label>
              <input className="input" placeholder="0801 234 5678" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </>
          )}
          {step === 'otp' && (
            <>
              <label className="field-label">6-digit code</label>
              <input
                className="input"
                placeholder="••••••"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ letterSpacing: 8, textAlign: 'center', fontSize: 20 }}
              />
            </>
          )}
          {step === 'details' && (
            <>
              <label className="field-label">Full name (as on ID)</label>
              <input className="input" placeholder="Full legal name" value={name} onChange={(e) => setName(e.target.value)} />
              <label className="field-label">Email</label>
              <input className="input" placeholder="you@email.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <label className="field-label">Password</label>
              <input className="input" placeholder="Min 6 characters" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
            </>
          )}
          {step === 'bvn' && (
            <>
              <label className="field-label">Bank Verification Number</label>
              <input
                className="input"
                placeholder="11-digit BVN"
                inputMode="numeric"
                maxLength={11}
                value={bvn}
                onChange={(e) => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))}
              />
              <p style={{ fontSize: 12, color: 'rgba(247,236,212,0.4)', lineHeight: 1.5 }}>
                Your BVN is encrypted and only used for identity verification (CBN requirement).
              </p>
            </>
          )}
          {step === 'face' && (
            <div className="glass" style={{ padding: 20, textAlign: 'center' }}>
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                  border: faceDone ? '3px solid #5fd492' : '3px dashed rgba(212,175,55,0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: faceDone ? 'rgba(95,212,146,0.12)' : 'rgba(0,0,0,0.25)',
                }}
              >
                {faceDone ? <IconCheck size={40} color="#5fd492" /> : <span style={{ fontSize: 40, opacity: 0.5 }}>📷</span>}
              </div>
              <p style={{ fontSize: 13, color: 'rgba(247,236,212,0.55)', marginBottom: 14, lineHeight: 1.5 }}>
                {faceDone ? 'Face matched · You can continue' : 'Good lighting · Face the camera · No glasses or hat'}
              </p>
              {!faceDone && (
                <button type="button" className="btn-outline" disabled={loading} onClick={runFaceCheck}>
                  {loading ? 'Scanning…' : 'Start face check'}
                </button>
              )}
            </div>
          )}
          {step === 'pin' && (
            <>
              <label className="field-label">Create 4-digit PIN</label>
              <input
                className="input"
                placeholder="••••"
                inputMode="numeric"
                maxLength={4}
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                style={{ letterSpacing: 10, textAlign: 'center', fontSize: 22 }}
              />
              <label className="field-label">Confirm PIN</label>
              <input
                className="input"
                placeholder="••••"
                inputMode="numeric"
                maxLength={4}
                type="password"
                value={pin2}
                onChange={(e) => setPin2(e.target.value.replace(/\D/g, '').slice(0, 4))}
                style={{ letterSpacing: 10, textAlign: 'center', fontSize: 22 }}
              />
            </>
          )}

          <button type="button" className="btn-gold" style={{ marginTop: 8 }} disabled={loading} onClick={next}>
            {loading ? 'Please wait…' : step === 'pin' ? 'Create account' : step === 'phone' ? 'Send OTP' : 'Continue'}
          </button>
        </div>
      )}
    </div>
  );
}
