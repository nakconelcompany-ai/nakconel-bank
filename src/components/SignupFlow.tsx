'use client';

import { useEffect, useRef, useState } from 'react';
import Logo from '@/components/Logo';
import { IconCheck } from '@/components/Icons';
import type { Session } from '@/lib/api';

/* ─── helpers ─── */
function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('234') && d.length >= 13) d = '0' + d.slice(3);
  if (d.length === 10 && d[0] !== '0') d = '0' + d;
  return d.slice(0, 11);
}
function isValidNgPhone(raw: string) {
  return /^0[7-9]\d{9}$/.test(normalizePhone(raw));
}
function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

/* ─── types ─── */
type SignupStep = 'phone-email' | 'otp' | 'identity' | 'face' | 'profile' | 'password' | 'account-number' | 'success';
type LoginStep  = 'phone' | 'password';
type ForgotStep = 'email' | 'otp' | 'new-password' | 'done';

type Props = {
  onSuccess:    (session: Session) => void;
  onToast:      (m: string) => void;
  onBack:       () => void;
  initialTab?:  'login' | 'signup';
};

/* ─── face stages ─── */
const FACE_STAGES = [
  { prompt: 'Position your face in the centre of the frame', hold: 2200 },
  { prompt: 'Slowly turn your head to the left',             hold: 2000 },
  { prompt: 'Now turn your head to the right',               hold: 2000 },
  { prompt: 'Look straight ahead and hold still',            hold: 1800 },
  { prompt: 'Face verified — you can continue',              hold: 600  },
] as const;

/* ─── OTP boxes ─── */
function OtpBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const handleChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    const arr = value.padEnd(6, ' ').split('');
    arr[i] = digit;
    onChange(arr.join('').trimEnd());
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (digits) { onChange(digits); refs.current[Math.min(digits.length, 5)]?.focus(); e.preventDefault(); }
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, margin: '16px 0', maxWidth: 300, width: '100%', alignSelf: 'center' }}>
      {[0,1,2,3,4,5].map(i => (
        <input key={i} ref={el => { refs.current[i] = el; }}
          type="text" inputMode="numeric" maxLength={1}
          value={value[i] ?? ''} onPaste={handlePaste}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          autoComplete="one-time-code" aria-label={`Digit ${i + 1}`}
          style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: 700, padding: '10px 2px',
            borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface)',
            color: 'var(--ink)', outline: 'none', width: '100%' }} />
      ))}
    </div>
  );
}

/* ─── PIN dots + keypad ─── */
function PinDots({ value }: { value: string }) {
  return (
    <div style={{ display: 'flex', gap: 14, justifyContent: 'center', margin: '16px 0' }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{ width: 16, height: 16, borderRadius: '50%',
          border: '2px solid var(--maroon)', background: i < value.length ? 'var(--maroon)' : 'transparent',
          transition: 'background .15s' }} />
      ))}
    </div>
  );
}
function PinKeypad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const press = (k: string) => onChange(k === '⌫' ? value.slice(0, -1) : value.length < 4 ? value + k : value);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, maxWidth: 280, margin: '0 auto', width: '100%' }}>
      {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => k
        ? <button key={i} type="button" onClick={() => press(k)}
            style={{ padding: '15px 0', fontSize: '1.2rem', fontWeight: 700, borderRadius: 12,
              border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer' }}>{k}</button>
        : <span key={i} />
      )}
    </div>
  );
}

/* ─── step progress dots ─── */
const SIGNUP_STEPS: SignupStep[] = ['phone-email','otp','identity','face','profile','password','account-number'];
function StepDots({ current }: { current: SignupStep }) {
  const idx = SIGNUP_STEPS.indexOf(current);
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 18 }}>
      {SIGNUP_STEPS.map((_, i) => (
        <div key={i} style={{ width: i === idx ? 18 : 8, height: 8, borderRadius: 999, transition: 'width .2s, background .2s',
          background: i <= idx ? 'var(--gold)' : 'rgba(101,23,25,.15)' }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   Main component
═══════════════════════════════════════ */
export default function SignupFlow({ onSuccess, onToast, onBack, initialTab = 'signup' }: Props) {
  const [tab, setTab]     = useState<'login' | 'signup'>(initialTab);
  const [loading, setLoading] = useState(false);

  /* ── signup state ── */
  const [sStep, setSStep]       = useState<SignupStep>('phone-email');
  const [sPhone, setSPhone]     = useState('');
  const [sEmail, setSEmail]     = useState('');
  const [sOtp, setSOtp]         = useState('');
  const [sSignupVerificationToken, setSSignupVerificationToken] = useState('');
  const [sOtpWait, setSOtpWait] = useState(0);
  const [sBvn, setSBvn]         = useState('');
  const [sNin, setSNin]         = useState('');
  const [sIdType, setSIdType]   = useState<'bvn'|'nin'>('bvn');
  const [sFaceDone, setSFaceDone]   = useState(false);
  const [sFaceStage, setSFaceStage] = useState(0);
  const [sFaceHint, setSFaceHint]   = useState('Preparing camera…');
  const [sCamReady, setSCamReady]   = useState(false);
  const [sCamErr, setSCamErr]       = useState('');
  const [sSelfie, setSSelfie]       = useState<string | null>(null);
  const [sFullName, setSFullName]   = useState('');
  const [sDob, setSdob]             = useState('');
  const [sPassword, setSPassword]   = useState('');
  const [sPin, setSPin]             = useState('');
  const [sPin2, setSPin2]           = useState('');
  const [sPinStep, setSPinStep]     = useState<'create'|'confirm'>('create');
  const [sAccountNumber, setSAccountNumber] = useState('');
  const [sSession, setSSession]             = useState<Session | null>(null);

  /* ── login state ── */
  const [lStep, setLStep]       = useState<LoginStep>('phone');
  const [lPhone, setLPhone]     = useState('');
  const [lPassword, setLPassword] = useState('');
  const [lPin, setLPin]         = useState('');
  const [lUsePin, setLUsePin]   = useState(false);

  /* ── forgot password state ── */
  const [showForgot, setShowForgot]   = useState(false);
  const [fStep, setFStep]             = useState<ForgotStep>('email');
  const [fEmail, setFEmail]           = useState('');
  const [fOtp, setFOtp]               = useState('');
  const [fOtpWait, setFOtpWait]       = useState(0);
  const [fResetToken, setFResetToken] = useState('');
  const [fPassword, setFPassword]     = useState('');
  const [fPassword2, setFPassword2]   = useState('');

  /* ── webcam refs ── */
  const faceRan  = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /* ── countdown timers ── */
  useEffect(() => {
    if (sOtpWait <= 0) return;
    const t = setTimeout(() => setSOtpWait(w => w - 1), 1000);
    return () => clearTimeout(t);
  }, [sOtpWait]);

  useEffect(() => {
    if (fOtpWait <= 0) return;
    const t = setTimeout(() => setFOtpWait(w => w - 1), 1000);
    return () => clearTimeout(t);
  }, [fOtpWait]);

  /* ── face verification ── */
  const stopCam = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };

  useEffect(() => {
    if (sStep !== 'face' || sFaceDone || faceRan.current) return;
    faceRan.current = true;
    let cancelled = false;

    const run = async () => {
      setSFaceHint('Opening camera…'); setSCamErr(''); setSCamReady(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }, audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
        setSCamReady(true);
      } catch {
        setSCamErr('Camera access is required. Please allow camera permission and try again.');
        setSFaceHint('Camera permission required');
        return;
      }
      await new Promise(r => setTimeout(r, 600));
      if (cancelled) return;
      for (let i = 0; i < FACE_STAGES.length; i++) {
        if (cancelled) return;
        setSFaceStage(i); setSFaceHint(FACE_STAGES[i].prompt);
        try {
          if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(FACE_STAGES[i].prompt);
            u.lang = 'en-NG'; u.rate = 0.92;
            window.speechSynthesis.speak(u);
          }
        } catch { /**/ }
        await new Promise(r => setTimeout(r, FACE_STAGES[i].hold));
      }
      if (cancelled) return;
      if (videoRef.current && canvasRef.current) {
        const v = videoRef.current; const c = canvasRef.current;
        c.width = v.videoWidth || 320; c.height = v.videoHeight || 320;
        c.getContext('2d')!.drawImage(v, 0, 0);
        const dataUrl = c.toDataURL('image/jpeg', 0.82);
        setSSelfie(dataUrl);
        try { localStorage.setItem('nkc_selfie', dataUrl); } catch { /**/ }
      }
      stopCam(); setSFaceDone(true); setSFaceHint('Face verified — you can continue');
    };

    run();
    return () => { cancelled = true; stopCam(); try { window.speechSynthesis?.cancel(); } catch { /**/ } };
  }, [sStep, sFaceDone]);

  /* ── helpers ── */
  const err  = (msg: string) => onToast(msg);
  const load = async (fn: () => Promise<void>) => {
    setLoading(true);
    try { await fn(); } catch (e: unknown) { err(e instanceof Error ? e.message : 'Something went wrong'); }
    finally { setLoading(false); }
  };

  const resetSignup = () => {
    setSStep('phone-email'); setSPhone(''); setSEmail(''); setSOtp(''); setSOtpWait(0); setSSignupVerificationToken('');
    setSBvn(''); setSNin(''); setSFaceDone(false); setSFaceStage(0);
    setSFaceHint('Preparing camera…'); setSCamReady(false); setSCamErr('');
    setSSelfie(null); setSFullName(''); setSdob(''); setSPassword('');
    setSPin(''); setSPin2(''); setSPinStep('create'); faceRan.current = false; stopCam();
  };

  /* ── API calls ── */
  const sendSignupOtp = () => load(async () => {
    if (!isValidEmail(sEmail)) { err('Enter a valid email address'); return; }
    if (!isValidNgPhone(sPhone)) { err('Enter a valid Nigerian mobile number'); return; }
    const res = await fetch('/api/v1/auth/otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: sEmail.trim(), purpose: 'signup', name: sEmail.split('@')[0] }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Could not send verification email');
    setSOtp(''); setSOtpWait(60); setSStep('otp');
    onToast(`Verification code sent to ${sEmail.trim()}`);
  });

  const verifySignupOtp = () => load(async () => {
    if (sOtp.replace(/\s/g,'').length < 6) { err('Enter the 6-digit code from your email'); return; }
    const res = await fetch('/api/v1/auth/otp/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: sEmail.trim(), code: sOtp.trim(), purpose: 'signup' }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Invalid or expired code');
    setSSignupVerificationToken(json.data?.signupVerificationToken ?? '');
    setSStep('identity');
  });

  const handleRegister = (confirmedPin: string) => load(async () => {
    if (sPassword.length < 6) { err('Password must be at least 6 characters'); return; }
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone:    normalizePhone(sPhone),
        fullName: sFullName.trim(),
        email:    sEmail.trim(),
        password: sPassword,
        pin:      confirmedPin,
        signupVerificationToken: sSignupVerificationToken,
        dateOfBirth: sDob || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Registration failed');
    const registeredSession = json.data as Session;
    setSAccountNumber(registeredSession.accountNumber ?? '');
    setSSession(registeredSession);
    setSStep('account-number');
    onToast(`Welcome to Nakconel Bank, ${sFullName.split(' ')[0]}!`);
  });

  const handlePinCreate  = (v: string) => { setSPin(v); if (v.length === 4) { setSPin2(v); setSPinStep('confirm'); setSPin(''); } };
  const handlePinConfirm = (v: string) => {
    setSPin(v);
    if (v.length === 4) {
      if (v !== sPin2) { err('PINs do not match. Try again.'); setSPin(''); setSPin2(''); setSPinStep('create'); }
      else handleRegister(v);
    }
  };

  /* ── login ── */
  const handleLoginNext = () => {
    if (!isValidNgPhone(lPhone) && !isValidEmail(lPhone)) { err('Enter a valid phone number or email'); return; }
    setLPassword(''); setLPin(''); setLStep('password');
  };
  const handleLoginPin = (v: string) => { setLPin(v); if (v.length === 4) doLogin(v); };
  const doLogin = (pw: string) => load(async () => {
    const identifier = isValidEmail(lPhone) ? lPhone.trim() : normalizePhone(lPhone);
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: identifier, password: pw }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Login failed');
    onSuccess(json.data as Session);
    onToast(`Welcome back, ${(json.data as Session).fullName.split(' ')[0]}!`);
  });

  /* ── forgot password ── */
  const sendForgotOtp = () => load(async () => {
    if (!isValidEmail(fEmail)) { err('Enter a valid email address'); return; }
    const res = await fetch('/api/v1/auth/otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fEmail.trim(), purpose: 'password-reset' }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Could not send reset email');
    setFOtp(''); setFOtpWait(60); setFStep('otp');
    onToast(`Password reset code sent to ${fEmail.trim()}`);
  });

  const verifyForgotOtp = () => load(async () => {
    if (fOtp.replace(/\s/g,'').length < 6) { err('Enter the 6-digit code from your email'); return; }
    const res = await fetch('/api/v1/auth/otp/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fEmail.trim(), code: fOtp.trim(), purpose: 'password-reset' }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Invalid or expired code');
    // Store the reset token returned by the server
    setFResetToken(json.data?.resetToken ?? '');
    setFStep('new-password');
  });

  const doResetPassword = () => load(async () => {
    if (fPassword.length < 6) { err('Password must be at least 6 characters'); return; }
    if (fPassword !== fPassword2) { err('Passwords do not match'); return; }
    const res = await fetch('/api/v1/auth/reset-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fEmail.trim(), resetToken: fResetToken, newPassword: fPassword }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Password reset failed');
    if (json.data?.id) {
      onSuccess(json.data as Session);
      onToast('Password reset successfully. You are now logged in.');
    } else {
      setFStep('done');
    }
  });

  /* ── shared card wrapper ── */
  const card = (title: string, children: React.ReactNode, showBack = true) => (
    <div style={{ paddingTop: 8, paddingBottom: 32 }}>
      {showBack && (
        <button type="button" className="btn-ghost" style={{ marginBottom: 14 }}
          onClick={() => {
            if (showForgot) {
              if (fStep === 'email') { setShowForgot(false); setFEmail(''); setFOtp(''); setFPassword(''); setFPassword2(''); }
              else if (fStep === 'otp') setFStep('email');
              else if (fStep === 'new-password') setFStep('otp');
              return;
            }
            if (tab === 'signup' && sStep !== 'phone-email') {
              const idx = SIGNUP_STEPS.indexOf(sStep);
              if (idx > 0) {
                const prev = SIGNUP_STEPS[idx - 1];
                if (prev === 'face') faceRan.current = false;
                setSStep(prev); setSPin(''); setSPin2(''); setSPinStep('create');
              }
              return;
            }
            if (tab === 'login' && lStep === 'password') { setLStep('phone'); return; }
            onBack(); if (tab === 'signup') resetSignup();
          }}>← Back</button>
      )}

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <Logo size={52} />
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Secure banking, built for Africa</p>
      </div>

      {!showForgot && (
        <div className="glass" style={{ padding: 5, display: 'flex', gap: 4, marginBottom: 20 }}>
          <button type="button" className={`tab${tab === 'login' ? ' on' : ''}`}
            onClick={() => { setTab('login'); setLStep('phone'); setShowForgot(false); }}>Sign in</button>
          <button type="button" className={`tab${tab === 'signup' ? ' on' : ''}`}
            onClick={() => { setTab('signup'); resetSignup(); setShowForgot(false); }}>Create account</button>
        </div>
      )}

      {showForgot && (
        <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 17, color: 'var(--maroon)', marginBottom: 18 }}>
          Reset your password
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  );

  /* ════════ FORGOT PASSWORD ════════ */
  if (showForgot) {
    if (fStep === 'email') return card('Reset password', <>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>
        Enter your registered email address. We'll send you a 6-digit reset code.
      </p>
      <label className="field-label">Email address</label>
      <input className="input" type="email" placeholder="you@email.com"
        value={fEmail} onChange={e => setFEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && sendForgotOtp()} />
      <button type="button" className="btn-gold" disabled={loading || !isValidEmail(fEmail)} onClick={sendForgotOtp}>
        {loading ? 'Sending…' : 'Send reset code'}
      </button>
    </>);

    if (fStep === 'otp') return card('Reset password', <>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>
        Enter the 6-digit code sent to <strong>{fEmail}</strong>
      </p>
      <OtpBoxes value={fOtp} onChange={setFOtp} />
      <button type="button" className="btn-gold"
        disabled={loading || fOtp.replace(/\s/g,'').length < 6} onClick={verifyForgotOtp}>
        {loading ? 'Verifying…' : 'Verify code'}
      </button>
      <button type="button" className="btn-ghost" disabled={fOtpWait > 0 || loading} onClick={sendForgotOtp}>
        {fOtpWait > 0 ? `Resend in ${fOtpWait}s` : 'Resend code'}
      </button>
    </>);

    if (fStep === 'new-password') return card('Reset password', <>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>Choose a new password for your account.</p>
      <label className="field-label">New password</label>
      <input className="input" type="password" placeholder="Min. 6 characters"
        value={fPassword} onChange={e => setFPassword(e.target.value)} />
      <label className="field-label">Confirm new password</label>
      <input className="input" type="password" placeholder="Repeat password"
        value={fPassword2} onChange={e => setFPassword2(e.target.value)} />
      <button type="button" className="btn-gold"
        disabled={loading || fPassword.length < 6 || fPassword !== fPassword2} onClick={doResetPassword}>
        {loading ? 'Resetting…' : 'Set new password'}
      </button>
    </>);

    if (fStep === 'done') return card('Reset password', <>
      <div style={{ textAlign: 'center', paddingTop: 16 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(40,119,78,.12)', border: '2px solid var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <IconCheck size={40} color="var(--ok)" />
        </div>
        <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--maroon)' }}>Password reset!</p>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>You can now sign in with your new password.</p>
        <button type="button" className="btn-gold" style={{ marginTop: 20 }}
          onClick={() => { setShowForgot(false); setTab('login'); setLStep('phone'); }}>
          Sign in
        </button>
      </div>
    </>, false);

    return null;
  }

  /* ════════ SIGNUP ════════ */
  if (tab === 'signup') {

    /* Step: phone + email */
    if (sStep === 'phone-email') return card('Create account', <>
      <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--maroon)' }}>Get started</p>
      <p style={{ fontSize: 12, color: 'var(--muted)' }}>Enter your phone number and email to create your account</p>
      <label className="field-label">Phone number</label>
      <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 8 }}>
        <input className="input" value="+234" readOnly style={{ textAlign: 'center', color: 'var(--muted)' }} />
        <input className="input" type="tel" inputMode="tel" autoComplete="tel"
          placeholder="080 1234 5678" value={sPhone} onChange={e => setSPhone(e.target.value)} />
      </div>
      {isValidNgPhone(sPhone) && (
        <p style={{ fontSize: 12, color: 'var(--ok)' }}>✓ Valid Nigerian number</p>
      )}
      <label className="field-label">Email address</label>
      <input className="input" type="email" placeholder="you@email.com"
        value={sEmail} onChange={e => setSEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && sendSignupOtp()} />
      <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
        We'll send a 6-digit verification code to your email.
      </p>
      <button type="button" className="btn-gold" style={{ marginTop: 6 }}
        disabled={loading || !isValidNgPhone(sPhone) || !isValidEmail(sEmail)} onClick={sendSignupOtp}>
        {loading ? 'Sending code…' : 'Continue'}
      </button>
    </>);

    /* Step: email OTP */
    if (sStep === 'otp') return card('Create account', <>
      <StepDots current="otp" />
      <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--maroon)', textAlign: 'center' }}>Verify your email</p>
      <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
        Enter the 6-digit code sent to <strong>{sEmail}</strong>
      </p>
      <OtpBoxes value={sOtp} onChange={setSOtp} />
      <button type="button" className="btn-gold"
        disabled={loading || sOtp.replace(/\s/g,'').length < 6} onClick={verifySignupOtp}>
        {loading ? 'Verifying…' : 'Verify'}
      </button>
      <button type="button" className="btn-ghost" disabled={sOtpWait > 0 || loading} onClick={sendSignupOtp}>
        {sOtpWait > 0 ? `Resend in ${sOtpWait}s` : 'Resend code'}
      </button>
    </>);

    /* Step: identity (BVN / NIN) */
    if (sStep === 'identity') return card('Create account', <>
      <StepDots current="identity" />
      <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--maroon)' }}>Identity Verification</p>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Required by the CBN for account activation</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        {(['bvn','nin'] as const).map(t => (
          <button key={t} type="button" className={`tab${sIdType === t ? ' on' : ''}`}
            style={{ flex: 1 }} onClick={() => setSIdType(t)}>{t.toUpperCase()}</button>
        ))}
      </div>
      {sIdType === 'bvn' ? (
        <>
          <label className="field-label">Bank Verification Number (BVN)</label>
          <input className="input" placeholder="11-digit BVN" inputMode="numeric" maxLength={11}
            value={sBvn} onChange={e => setSBvn(e.target.value.replace(/\D/g,'').slice(0,11))} />
          <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>Dial *565*0# to retrieve your BVN</p>
        </>
      ) : (
        <>
          <label className="field-label">National Identification Number (NIN)</label>
          <input className="input" placeholder="11-digit NIN" inputMode="numeric" maxLength={11}
            value={sNin} onChange={e => setSNin(e.target.value.replace(/\D/g,'').slice(0,11))} />
          <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>Dial *346# to retrieve your NIN</p>
        </>
      )}
      <button type="button" className="btn-gold" style={{ marginTop: 6 }}
        disabled={loading || (sIdType === 'bvn' ? sBvn.length < 11 : sNin.length < 11)}
        onClick={() => { faceRan.current = false; setSFaceDone(false); setSFaceStage(0); setSStep('face'); }}>
        Continue
      </button>
    </>);

    /* Step: face verification */
    if (sStep === 'face') return card('Create account', <>
      <StepDots current="face" />
      <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--maroon)', textAlign: 'center' }}>Facial Verification</p>
      <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginBottom: 6 }}>
        Follow the on-screen instructions. Your selfie becomes your profile photo.
      </p>
      <div style={{ width: 200, height: 240, borderRadius: '50% / 46%', margin: '0 auto 12px',
        border: sFaceDone ? '3px solid var(--ok)' : sFaceStage >= 1 ? '3px solid var(--gold)' : '3px dashed rgba(101,23,25,.4)',
        background: '#0a0606', position: 'relative', overflow: 'hidden',
        boxShadow: sFaceDone ? '0 0 32px rgba(95,212,146,.3)' : '0 0 20px rgba(197,155,68,.15)',
        transition: 'border-color .3s' }}>
        <video ref={videoRef} playsInline muted autoPlay style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', transform: 'scaleX(-1)', opacity: sFaceDone ? 0.2 : sCamReady ? 1 : 0.3, transition: 'opacity .4s' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        {!sCamReady && !sFaceDone && !sCamErr && (
          <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(247,236,212,.6)', fontSize: 13, zIndex: 2 }}>Starting camera…</span>
        )}
        {sFaceDone && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 2 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(95,212,146,.2)', border: '2px solid #5fd492', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconCheck size={40} color="#5fd492" />
            </div>
          </div>
        )}
      </div>
      {sSelfie && sFaceDone && (
        <div style={{ textAlign: 'center' }}>
          <img src={sSelfie} alt="Your selfie" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold)', margin: '0 auto' }} />
        </div>
      )}
      <p style={{ fontSize: 13, color: sFaceDone ? 'var(--ok)' : 'var(--maroon)', fontWeight: 600, textAlign: 'center', lineHeight: 1.4 }}>{sFaceHint}</p>
      {sCamErr && <p style={{ fontSize: 12, color: 'var(--danger)', lineHeight: 1.5, textAlign: 'center' }}>{sCamErr}</p>}
      {!sFaceDone && (
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
          {FACE_STAGES.slice(0,4).map((_, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: 999, background: i <= sFaceStage ? 'var(--gold)' : 'rgba(101,23,25,.15)' }} />
          ))}
        </div>
      )}
      {sCamErr && (
        <button type="button" className="btn-outline" onClick={() => {
          faceRan.current = false; setSCamErr(''); setSFaceDone(false); setSFaceStage(0);
          setTimeout(() => { faceRan.current = false; setSStep('identity'); setTimeout(() => setSStep('face'), 60); }, 0);
        }}>Retry camera</button>
      )}
      <button type="button" className="btn-gold" disabled={!sFaceDone} onClick={() => setSStep('profile')}>
        {sFaceDone ? 'Continue' : 'Verifying…'}
      </button>
    </>);

    /* Step: profile */
    if (sStep === 'profile') return card('Create account', <>
      <StepDots current="profile" />
      <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--maroon)' }}>Profile Information</p>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Name must match your ID</p>
      <label className="field-label">Full name (as on ID)</label>
      <input className="input" placeholder="e.g. Adewale Olusegun" value={sFullName} onChange={e => setSFullName(e.target.value)} />
      <label className="field-label">Date of birth (optional)</label>
      <input className="input" type="date" value={sDob} onChange={e => setSdob(e.target.value)} />
      <button type="button" className="btn-gold" style={{ marginTop: 6 }}
        disabled={loading || sFullName.trim().length < 2}
        onClick={() => setSStep('password')}>Continue</button>
    </>);

    /* Step: password + PIN */
    if (sStep === 'password') return card('Create account', <>
      <StepDots current="password" />
      <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--maroon)', textAlign: 'center' }}>
        {sPinStep === 'create' ? 'Set Password & PIN' : 'Confirm your PIN'}
      </p>
      {sPinStep === 'create' ? (
        <>
          <label className="field-label">Password (min. 6 characters)</label>
          <input className="input" type="password" placeholder="Create a strong password"
            value={sPassword} onChange={e => setSPassword(e.target.value)} />
          <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--maroon)', textAlign: 'center', marginTop: 12 }}>Create 4-digit PIN</p>
          <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>Used to approve transfers and payments</p>
          <PinDots value={sPin} />
          <PinKeypad value={sPin} onChange={handlePinCreate} />
        </>
      ) : (
        <>
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginBottom: 4 }}>Enter the same PIN again to confirm</p>
          <PinDots value={sPin} />
          <PinKeypad value={sPin} onChange={handlePinConfirm} />
          {loading && <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>Creating your account…</p>}
        </>
      )}
    </>);

    /* Step: account number reveal */
    if (sStep === 'account-number') return card('', <>
      <div style={{ textAlign: 'center', paddingTop: 8 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(40,119,78,.12)', border: '2px solid var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <IconCheck size={40} color="var(--ok)" />
        </div>
        <p style={{ fontWeight: 800, fontSize: 20, color: 'var(--maroon)', marginBottom: 6 }}>Your Account Number</p>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
          This is your unique Nakconel Bank account number.<br />Save it — you will need it to receive money.
        </p>
        {/* Account number card */}
        <div style={{ background: 'linear-gradient(135deg,#4a1015,#731d21 60%,#8a3026)', borderRadius: 18, padding: '24px 20px', border: '1px solid rgba(197,155,68,.5)', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
          <p style={{ color: 'rgba(255,248,233,.65)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>Account Number</p>
          <p style={{ color: '#f2d995', fontSize: 32, fontWeight: 800, letterSpacing: '.12em', fontFamily: 'Georgia, serif', marginBottom: 6 }}>
            {sAccountNumber || '––––––––––'}
          </p>
          <p style={{ color: 'rgba(255,248,233,.7)', fontSize: 13, marginBottom: 0 }}>{sFullName}</p>
          <p style={{ color: 'rgba(255,248,233,.55)', fontSize: 11, marginTop: 4 }}>Nakconel Bank · NGN</p>
        </div>
        <button type="button" className="btn-gold" style={{ marginBottom: 10 }}
          onClick={() => {
            if (sAccountNumber) {
              navigator.clipboard?.writeText(sAccountNumber)
                .then(() => onToast('Account number copied!'))
                .catch(() => onToast(sAccountNumber));
            }
          }}>
          Copy account number
        </button>
        <button type="button" className="btn-outline"
          onClick={() => { if (sSession) onSuccess(sSession); else setSStep('success'); }}>
          Continue to dashboard
        </button>
        {sSelfie && (
          <img src={sSelfie} alt="Profile" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold)', margin: '16px auto 0', display: 'block' }} />
        )}
      </div>
    </>, false);

    /* Step: success */
    if (sStep === 'success') return card('', <>
      <div style={{ textAlign: 'center', paddingTop: 16 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(40,119,78,.12)', border: '2px solid var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <IconCheck size={44} color="var(--ok)" />
        </div>
        <p style={{ fontWeight: 800, fontSize: 20, color: 'var(--maroon)' }}>Account Created!</p>
        <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.6, marginTop: 6 }}>
          Welcome to Nakconel Bank.<br/>Your account has been created successfully.
        </p>
        {sSelfie && <img src={sSelfie} alt="Profile" style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', border: '2.5px solid var(--gold)', margin: '14px auto 0', display: 'block' }} />}
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>Taking you to your dashboard…</p>
        {/* Auto-redirect if session available */}
        {sSession && (() => { setTimeout(() => onSuccess(sSession!), 1200); return null; })()}
      </div>
    </>, false);
  }  /* ════════ LOGIN ════════ */
  /* Step: phone/email */
  if (tab === 'login' && lStep === 'phone') return card('Sign in', <>
    <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--maroon)' }}>Welcome back</p>
    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Enter your phone number or email</p>
    <label className="field-label">Phone number or email</label>
    <input className="input" type="text" placeholder="080 1234 5678 or you@email.com"
      value={lPhone} onChange={e => setLPhone(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && handleLoginNext()} />
    <button type="button" className="btn-gold" style={{ marginTop: 6 }}
      disabled={loading || (!isValidNgPhone(lPhone) && !isValidEmail(lPhone))} onClick={handleLoginNext}>
      Continue
    </button>
    <button type="button" style={{ background: 'none', border: 'none', color: 'var(--maroon)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', textAlign: 'center', padding: '8px 0' }}
      onClick={() => { setShowForgot(true); setFStep('email'); setFEmail(''); }}>
      Forgot password?
    </button>
  </>);

  /* Step: password/PIN */
  if (tab === 'login' && lStep === 'password') return card('Sign in', <>
    <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--maroon)', textAlign: 'center' }}>
      {lUsePin ? 'Enter your PIN' : 'Enter your password'}
    </p>
    <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
      Signing in as <strong>{isValidEmail(lPhone) ? lPhone : normalizePhone(lPhone)}</strong>
    </p>
    {lUsePin ? (
      <><PinDots value={lPin} /><PinKeypad value={lPin} onChange={handleLoginPin} /></>
    ) : (
      <form onSubmit={e => { e.preventDefault(); doLogin(lPassword); }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label className="field-label">Password</label>
        <input className="input" type="password" placeholder="Your password"
          value={lPassword} onChange={e => setLPassword(e.target.value)} autoFocus />
        <button type="submit" className="btn-gold" disabled={loading || !lPassword}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    )}
    <button type="button" className="btn-ghost" style={{ marginTop: 4 }}
      onClick={() => { setLUsePin(u => !u); setLPassword(''); setLPin(''); }}>
      {lUsePin ? 'Use password instead' : 'Use PIN instead'}
    </button>
    <button type="button" style={{ background: 'none', border: 'none', color: 'var(--maroon)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', textAlign: 'center', padding: '8px 0' }}
      onClick={() => { setShowForgot(true); setFStep('email'); setFEmail(''); }}>
      Forgot password?
    </button>
  </>);

  return null;
}
