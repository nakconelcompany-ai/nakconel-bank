'use client';

import { useEffect, useRef, useState } from 'react';
import Logo from '@/components/Logo';
import { IconCheck } from '@/components/Icons';
import { apiRegister, apiLogin, type Session } from '@/lib/api';

type SignupStep = 'phone' | 'details' | 'email_otp' | 'bvn' | 'face' | 'pin';

type Props = {
  onSuccess: (session: Session) => void;
  onToast: (m: string) => void;
  onBack: () => void;
  initialTab?: 'login' | 'signup';
};

/** Normalize to Nigerian local form: 0XXXXXXXXXX (11 digits) */
function toNgPhone(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('234') && d.length >= 13) d = '0' + d.slice(3);
  if (d.length === 10 && d[0] !== '0') d = '0' + d;
  return d.slice(0, 11);
}

function speak(text: string) {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-NG';
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

const FACE_STAGES = [
  { key: 'center', prompt: 'Position your face in the centre of the frame', hold: 2200 },
  { key: 'left', prompt: 'Slowly turn your head to the left', hold: 2000 },
  { key: 'right', prompt: 'Now turn your head to the right', hold: 2000 },
  { key: 'still', prompt: 'Look straight and hold still', hold: 1800 },
  { key: 'done', prompt: 'Face verified successfully', hold: 800 },
] as const;

export default function SignupFlow({ onSuccess, onToast, onBack, initialTab = 'signup' }: Props) {
  const [authTab, setAuthTab] = useState<'login' | 'signup'>(initialTab);
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [step, setStep] = useState<SignupStep>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [bvn, setBvn] = useState('');
  const [faceDone, setFaceDone] = useState(false);
  const [faceStage, setFaceStage] = useState(0);
  const [faceHint, setFaceHint] = useState('Preparing camera…');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const faceRan = useRef(false);

  const steps: SignupStep[] = ['phone', 'details', 'email_otp', 'bvn', 'face', 'pin'];
  const stepIndex = steps.indexOf(step);
  const stepMeta: Record<SignupStep, { title: string; sub: string }> = {
    phone: { title: 'Your phone number', sub: 'This becomes your Nakconel account number' },
    details: { title: 'Personal details', sub: 'Name must match your ID' },
    email_otp: { title: 'Verify your email', sub: 'Enter the 6-digit code we sent' },
    bvn: { title: 'Link your BVN', sub: 'Required by CBN for higher limits' },
    face: { title: 'Face verification', sub: 'Follow the voice instructions' },
    pin: { title: 'Transaction PIN', sub: '4 digits · used to approve payments' },
  };

  const accountNumberPreview = (() => {
    const p = toNgPhone(phone);
    return p.length === 11 && p.startsWith('0') ? p : null;
  })();

  const reset = () => {
    setStep('phone');
    setPhone('');
    setName('');
    setEmail('');
    setPass('');
    setEmailOtp('');
    setEmailCode('');
    setBvn('');
    setFaceDone(false);
    setFaceStage(0);
    setFaceHint('Preparing camera…');
    setPin('');
    setPin2('');
    faceRan.current = false;
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* */
    }
  };

  useEffect(() => {
    if (step !== 'face' || faceDone || faceRan.current) return;
    faceRan.current = true;
    let cancelled = false;
    let stage = 0;

    const run = async () => {
      setFaceHint('Starting camera…');
      speak('Please look at the camera.');
      await new Promise((r) => setTimeout(r, 900));
      if (cancelled) return;

      for (const s of FACE_STAGES) {
        if (cancelled) return;
        setFaceStage(stage);
        setFaceHint(s.prompt);
        speak(s.prompt);
        await new Promise((r) => setTimeout(r, s.hold));
        stage += 1;
      }
      if (cancelled) return;
      setFaceDone(true);
      setFaceHint('Face matched · You can continue');
      onToast('Face verified');
    };

    run();
    return () => {
      cancelled = true;
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* */
      }
    };
  }, [step, faceDone, onToast]);

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

  const next = async () => {
    if (step === 'phone') {
      const p = toNgPhone(phone);
      if (!/^0[7-9]\d{9}$/.test(p)) {
        onToast('Enter a valid Nigerian number starting with 0 (e.g. 08012345678)');
        return;
      }
      setPhone(p);
      setStep('details');
      return;
    }
    if (step === 'details') {
      if (!name.trim() || name.trim().length < 2) {
        onToast('Enter your full name as on your ID');
        return;
      }
      if (!email.includes('@') || !email.includes('.')) {
        onToast('Enter a valid email');
        return;
      }
      if (pass.length < 6) {
        onToast('Password must be at least 6 characters');
        return;
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      setEmailCode(code);
      setEmailOtp('');
      setLoading(true);
      await new Promise((r) => setTimeout(r, 700));
      setLoading(false);
      onToast(`Verification code sent to ${email} (demo: ${code})`);
      setStep('email_otp');
      return;
    }
    if (step === 'email_otp') {
      if (!/^\d{6}$/.test(emailOtp)) {
        onToast('Enter the 6-digit code from your email');
        return;
      }
      if (emailOtp !== emailCode) {
        onToast('Invalid code. Check your email and try again.');
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
      faceRan.current = false;
      setFaceDone(false);
      setFaceStage(0);
      setStep('face');
      return;
    }
    if (step === 'face') {
      if (!faceDone) {
        onToast('Wait for face verification to finish');
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
      const acctPhone = toNgPhone(phone);
      setLoading(true);
      try {
        await apiRegister({
          email,
          fullName: name.trim(),
          password: pass,
          pin,
          phone: acctPhone,
        });
        const s = await apiLogin(email, pass);
        reset();
        onSuccess(s);
        onToast(`Account created · Account no. ${acctPhone}`);
      } catch (e: unknown) {
        onToast(e instanceof Error ? e.message : 'Signup failed');
      } finally {
        setLoading(false);
      }
    }
  };

  const faceRing = faceDone
    ? '3px solid #5fd492'
    : faceStage === 1
      ? '3px solid #f0d78c'
      : faceStage === 2
        ? '3px solid #d4af37'
        : '3px dashed rgba(212,175,55,0.5)';

  return (
    <div style={{ paddingTop: 12, paddingBottom: 40 }}>
      <button
        type="button"
        className="btn-ghost"
        style={{ marginBottom: 16 }}
        onClick={() => {
          if (authTab === 'signup' && step !== 'phone') {
            const prev = steps[Math.max(0, stepIndex - 1)];
            if (prev === 'face') faceRan.current = false;
            setStep(prev);
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
              <input
                className="input"
                placeholder="0801 234 5678"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              {accountNumberPreview && (
                <p style={{ fontSize: 12, color: 'rgba(247,236,212,0.45)', lineHeight: 1.5 }}>
                  Your account number will be <strong style={{ color: '#f0d78c' }}>{accountNumberPreview}</strong>
                </p>
              )}
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

          {step === 'email_otp' && (
            <>
              <label className="field-label">6-digit code from email</label>
              <input
                className="input"
                placeholder="••••••"
                inputMode="numeric"
                maxLength={6}
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ letterSpacing: 8, textAlign: 'center', fontSize: 20 }}
              />
              <p style={{ fontSize: 12, color: 'rgba(247,236,212,0.4)', lineHeight: 1.5 }}>
                We sent a code to <strong style={{ color: '#f0d78c' }}>{email}</strong>. Check inbox (and spam). Demo mode shows the code in a toast.
              </p>
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: 13 }}
                onClick={() => {
                  if (emailCode) onToast(`Demo code: ${emailCode}`);
                }}
              >
                Resend code
              </button>
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
                BVN is encrypted and used only for identity checks (CBN). Test mode accepts any valid 11-digit number.
              </p>
            </>
          )}

          {step === 'face' && (
            <div className="glass" style={{ padding: 20, textAlign: 'center' }}>
              <div
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                  border: faceRing,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: faceDone ? 'rgba(95,212,146,0.12)' : 'rgba(0,0,0,0.35)',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: faceDone ? '0 0 28px rgba(95,212,146,0.25)' : '0 0 24px rgba(212,175,55,0.15)',
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                }}
              >
                {!faceDone && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 12,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 40% 35%, rgba(80,60,40,0.5), rgba(10,8,6,0.9))',
                    }}
                  />
                )}
                {faceDone ? (
                  <IconCheck size={48} color="#5fd492" />
                ) : (
                  <span style={{ fontSize: 48, opacity: 0.7, position: 'relative', zIndex: 1 }}>
                    {faceStage === 1 ? '👈' : faceStage === 2 ? '👉' : '😊'}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 14, color: faceDone ? '#5fd492' : '#f0d78c', fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>
                {faceHint}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(247,236,212,0.45)', lineHeight: 1.5 }}>
                {faceDone
                  ? 'Verification complete'
                  : 'Camera runs automatically · Follow the voice prompts · Good lighting helps'}
              </p>
              {!faceDone && (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 14 }}>
                  {FACE_STAGES.slice(0, 4).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: i <= faceStage ? '#d4af37' : 'rgba(247,236,212,0.2)',
                      }}
                    />
                  ))}
                </div>
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
              {accountNumberPreview && (
                <p style={{ fontSize: 12, color: 'rgba(247,236,212,0.45)', textAlign: 'center' }}>
                  Account number: <strong style={{ color: '#f0d78c' }}>{accountNumberPreview}</strong>
                </p>
              )}
            </>
          )}

          <button
            type="button"
            className="btn-gold"
            style={{ marginTop: 8 }}
            disabled={loading || (step === 'face' && !faceDone)}
            onClick={next}
          >
            {loading
              ? 'Please wait…'
              : step === 'pin'
                ? 'Create account'
                : step === 'details'
                  ? 'Send email code'
                  : step === 'face'
                    ? faceDone
                      ? 'Continue'
                      : 'Verifying…'
                    : 'Continue'}
          </button>
        </div>
      )}
    </div>
  );
}
