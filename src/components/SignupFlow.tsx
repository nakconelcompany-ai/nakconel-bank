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

/* ─── types ─── */
type SignupStep =
  | 'phone'       // 1. Enter phone
  | 'otp'         // 2. OTP verification (simulated — shows code in UI)
  | 'identity'    // 3. Identity: BVN / NIN
  | 'face'        // 4. Facial verification
  | 'profile'     // 5. Full name, email, DOB
  | 'password'    // 6. Set password & 4-digit PIN
  | 'success';    // Done

type LoginStep = 'phone' | 'password';

type Props = {
  onSuccess: (session: Session) => void;
  onToast:   (m: string) => void;
  onBack:    () => void;
  initialTab?: 'login' | 'signup';
};

/* ─── face stages ─── */
const FACE_STAGES = [
  { key: 'center', prompt: 'Position your face in the centre of the frame', hold: 2200 },
  { key: 'left',   prompt: 'Slowly turn your head to the left',             hold: 2000 },
  { key: 'right',  prompt: 'Now turn your head to the right',               hold: 2000 },
  { key: 'still',  prompt: 'Look straight ahead and hold still',            hold: 1800 },
  { key: 'done',   prompt: 'Face verified — you can continue',              hold: 600  },
] as const;

/* ─── OTP box component ─── */
function OtpBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const handleChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    const arr = value.padEnd(6, ' ').split('');
    arr[i] = digit;
    const next = arr.join('').trimEnd();
    onChange(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (digits) { onChange(digits); refs.current[Math.min(digits.length, 5)]?.focus(); e.preventDefault(); }
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, margin: '16px 0' }}>
      {[0,1,2,3,4,5].map(i => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          autoComplete="one-time-code"
          aria-label={`Digit ${i + 1}`}
          style={{
            textAlign: 'center',
            fontSize: '1.4rem',
            fontWeight: 700,
            padding: '10px 2px',
            borderRadius: 10,
            border: '1.5px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--ink)',
            outline: 'none',
            width: '100%',
          }}
        />
      ))}
    </div>
  );
}

/* ─── PIN dots ─── */
function PinDots({ value }: { value: string }) {
  return (
    <div style={{ display: 'flex', gap: 14, justifyContent: 'center', margin: '16px 0' }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{
          width: 16, height: 16, borderRadius: '50%',
          border: '2px solid var(--maroon)',
          background: i < value.length ? 'var(--maroon)' : 'transparent',
          transition: 'background .15s',
        }} />
      ))}
    </div>
  );
}

/* ─── PIN keypad ─── */
function PinKeypad({ value, onChange, maxLen = 4 }: { value: string; onChange: (v: string) => void; maxLen?: number }) {
  const press = (k: string) =>
    onChange(k === '⌫' ? value.slice(0, -1) : value.length < maxLen ? value + k : value);
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, maxWidth: 280, margin: '0 auto', width: '100%' }}>
      {keys.map((k, i) => k ? (
        <button
          key={i}
          type="button"
          aria-label={k === '⌫' ? 'Delete' : k}
          onClick={() => press(k)}
          style={{
            padding: '15px 0', fontSize: '1.2rem', fontWeight: 700,
            borderRadius: 12, border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer',
          }}
        >{k}</button>
      ) : <span key={i} />)}
    </div>
  );
}

/* ─── progress dots ─── */
const SIGNUP_STEPS: SignupStep[] = ['phone','otp','identity','face','profile','password'];
function StepDots({ current }: { current: SignupStep }) {
  const idx = SIGNUP_STEPS.indexOf(current);
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 18 }}>
      {SIGNUP_STEPS.map((_, i) => (
        <div key={i} style={{
          width: i === idx ? 18 : 8, height: 8, borderRadius: 999,
          background: i <= idx ? 'var(--gold)' : 'rgba(101,23,25,.15)',
          transition: 'width .2s, background .2s',
        }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   Main component
═══════════════════════════════════════ */
export default function SignupFlow({ onSuccess, onToast, onBack, initialTab = 'signup' }: Props) {
  const [tab, setTab] = useState<'login' | 'signup'>(initialTab);

  /* ── signup state ── */
  const [sStep, setSStep] = useState<SignupStep>('phone');
  const [sPhone, setSPhone]       = useState('');
  const [sOtp, setSOtp]           = useState('');
  const [sOtpCode, setSOtpCode]   = useState('');           // simulated code
  const [sBvn, setSBvn]           = useState('');
  const [sNin, setSNin]           = useState('');
  const [sIdType, setSIdType]     = useState<'bvn'|'nin'>('bvn');
  const [sFaceDone, setSFaceDone] = useState(false);
  const [sFaceStage, setSFaceStage] = useState(0);
  const [sFaceHint, setSFaceHint] = useState('Preparing camera…');
  const [sCamReady, setSCamReady] = useState(false);
  const [sCamErr, setSCamErr]     = useState('');
  const [sSelfie, setSSelfie]     = useState<string | null>(null);
  const [sFullName, setSFullName] = useState('');
  const [sEmail, setSEmail]       = useState('');
  const [sDob, setSdob]           = useState('');
  const [sPassword, setSPassword] = useState('');
  const [sPin, setSPin]           = useState('');
  const [sPin2, setSPin2]         = useState('');
  const [sPinStep, setSPinStep]   = useState<'create'|'confirm'>('create');

  /* ── login state ── */
  const [lStep, setLStep]         = useState<LoginStep>('phone');
  const [lPhone, setLPhone]       = useState('');
  const [lPassword, setLPassword] = useState('');
  const [lPin, setLPin]           = useState('');
  const [lUsePin, setLUsePin]     = useState(false);

  const [loading, setLoading]   = useState(false);
  const faceRan = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /* ── helpers ── */
  const err = (msg: string) => onToast(msg);
  const load = async (fn: () => Promise<void>) => {
    setLoading(true);
    try { await fn(); }
    catch (e: unknown) { err(e instanceof Error ? e.message : 'Something went wrong'); }
    finally { setLoading(false); }
  };

  const stopCam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const resetSignup = () => {
    setSStep('phone'); setSPhone(''); setSOtp(''); setSOtpCode('');
    setSBvn(''); setSNin(''); setSFaceDone(false); setSFaceStage(0);
    setSFaceHint('Preparing camera…'); setSCamReady(false); setSCamErr('');
    setSSelfie(null); setSFullName(''); setSEmail(''); setSdob('');
    setSPassword(''); setSPin(''); setSPin2(''); setSPinStep('create');
    faceRan.current = false; stopCam();
  };

  /* ── face verification ── */
  useEffect(() => {
    if (sStep !== 'face' || sFaceDone || faceRan.current) return;
    faceRan.current = true;
    let cancelled = false;

    const run = async () => {
      setSFaceHint('Opening camera…'); setSCamErr(''); setSCamReady(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
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
        setSFaceStage(i);
        setSFaceHint(FACE_STAGES[i].prompt);
        try {
          if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(FACE_STAGES[i].prompt);
            u.lang = 'en-NG'; u.rate = 0.92;
            window.speechSynthesis.speak(u);
          }
        } catch { /* ignore speech errors */ }
        await new Promise(r => setTimeout(r, FACE_STAGES[i].hold));
      }
      if (cancelled) return;

      // Capture selfie
      if (videoRef.current && canvasRef.current) {
        const v = videoRef.current;
        const c = canvasRef.current;
        c.width = v.videoWidth || 320;
        c.height = v.videoHeight || 320;
        c.getContext('2d')!.drawImage(v, 0, 0);
        setSSelfie(c.toDataURL('image/jpeg', 0.82));
        localStorage.setItem('nkc_selfie', c.toDataURL('image/jpeg', 0.82));
      }

      stopCam();
      setSFaceDone(true);
      setSFaceHint('Face verified — you can continue');
    };

    run();
    return () => { cancelled = true; stopCam(); try { window.speechSynthesis?.cancel(); } catch { /**/ } };
  }, [sStep, sFaceDone]);

  /* ════════════════════════════
     SIGNUP handlers
  ════════════════════════════ */
  const handleSendOtp = () => load(async () => {
    if (!isValidNgPhone(sPhone)) {
      err('Enter a valid Nigerian mobile number (e.g. 08012345678)'); return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSOtpCode(code); setSOtp('');
    setSStep('otp');
    onToast(`Demo code sent to ${normalizePhone(sPhone)}: ${code}`);
  });

  const handleVerifyOtp = () => {
    if (sOtp.replace(/\s/g, '').length < 6) { err('Enter the 6-digit code'); return; }
    if (sOtp !== sOtpCode) { err('Invalid code. Check the demo toast and try again.'); return; }
    setSStep('identity');
  };

  const handleIdentity = () => {
    if (sIdType === 'bvn' && !/^\d{11}$/.test(sBvn)) {
      err('BVN must be exactly 11 digits'); return;
    }
    if (sIdType === 'nin' && !/^\d{11}$/.test(sNin)) {
      err('NIN must be exactly 11 digits'); return;
    }
    faceRan.current = false; setSFaceDone(false); setSFaceStage(0);
    setSStep('face');
  };

  const handleFaceContinue = () => {
    if (!sFaceDone) { err('Please wait for face verification to complete'); return; }
    setSStep('profile');
  };

  const handleProfile = () => {
    if (sFullName.trim().length < 2) { err('Enter your full legal name'); return; }
    if (sEmail && (!sEmail.includes('@') || !sEmail.includes('.'))) {
      err('Enter a valid email address'); return;
    }
    setSStep('password');
  };

  const handlePinInput = (v: string) => {
    setSPin(v);
    if (v.length === 4) {
      if (sPinStep === 'create') { setSPin2(''); setSPinStep('confirm'); setSPin(''); }
      else {
        if (v !== sPin2 && sPinStep === 'confirm') {
          // v is the re-entry, sPin2 holds nothing yet — swap logic
        }
        // v is the confirmation
        if (v !== sPin) {
          err('PINs do not match. Please try again.'); setSPin(''); setSPin2(''); setSPinStep('create');
        } else {
          handleRegister(v);
        }
      }
    }
  };

  // Simplified: create sets sPin2, confirm checks against sPin2
  const handlePinCreate = (v: string) => {
    setSPin(v);
    if (v.length === 4) { setSPin2(v); setSPinStep('confirm'); setSPin(''); }
  };
  const handlePinConfirm = (v: string) => {
    setSPin(v);
    if (v.length === 4) {
      if (v !== sPin2) {
        err('PINs do not match. Try again.');
        setSPin(''); setSPin2(''); setSPinStep('create');
      } else {
        handleRegister(v);
      }
    }
  };

  const handleRegister = (confirmedPin: string) => load(async () => {
    if (sPassword.length < 6) { err('Password must be at least 6 characters'); return; }
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: normalizePhone(sPhone),
        fullName: sFullName.trim(),
        email: sEmail.trim() || undefined,
        password: sPassword,
        pin: confirmedPin,
        bvn: sIdType === 'bvn' ? sBvn : undefined,
        dateOfBirth: sDob || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error ?? 'Registration failed');
    setSStep('success');
    onToast(`Welcome to Nakconel Bank, ${sFullName.split(' ')[0]}!`);
    setTimeout(() => {
      onSuccess(json.data as Session);
    }, 1600);
  });

  /* ════════════════════════════
     LOGIN handlers
  ════════════════════════════ */
  const handleLoginNext = () => {
    if (!isValidNgPhone(lPhone)) { err('Enter a valid Nigerian mobile number'); return; }
    setLPassword(''); setLPin(''); setLStep('password');
  };

  const handleLoginPin = (v: string) => {
    setLPin(v);
    if (v.length === 4) handleLogin(undefined, v);
  };

  const handleLogin = (e?: React.FormEvent, pinOverride?: string) => {
    e?.preventDefault();
    const pw = lUsePin ? (pinOverride ?? lPin) : lPassword;
    if (!pw) { err('Enter your password or PIN'); return; }
    load(async () => {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizePhone(lPhone), password: pw }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Login failed');
      onSuccess(json.data as Session);
      onToast(`Welcome back, ${(json.data as Session).fullName.split(' ')[0]}!`);
    });
  };

  /* ════════════════════════════
     Shared shell
  ════════════════════════════ */
  const card = (children: React.ReactNode) => (
    <div style={{ paddingTop: 8, paddingBottom: 32 }}>
      <button
        type="button"
        className="btn-ghost"
        style={{ marginBottom: 14 }}
        onClick={() => {
          if (tab === 'signup' && sStep !== 'phone') {
            const steps = SIGNUP_STEPS;
            const idx = steps.indexOf(sStep);
            if (idx > 0) {
              const prev = steps[idx - 1];
              if (prev === 'face') faceRan.current = false;
              setSStep(prev); setSPin(''); setSPin2(''); setSPinStep('create');
            }
            return;
          }
          if (tab === 'login' && lStep === 'password') { setLStep('phone'); return; }
          onBack(); if (tab === 'signup') resetSignup();
        }}
      >← Back</button>

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <Logo size={52} />
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Secure banking, built for Africa</p>
      </div>

      {/* Tab switcher */}
      <div className="glass" style={{ padding: 5, display: 'flex', gap: 4, marginBottom: 20 }}>
        <button
          type="button"
          className={`tab${tab === 'login' ? ' on' : ''}`}
          onClick={() => { setTab('login'); setLStep('phone'); }}
        >Sign in</button>
        <button
          type="button"
          className={`tab${tab === 'signup' ? ' on' : ''}`}
          onClick={() => { setTab('signup'); resetSignup(); }}
        >Create account</button>
      </div>

      {children}
    </div>
  );

  /* ════════════════════════════
     SIGNUP screens
  ════════════════════════════ */
  if (tab === 'signup') {
    /* — Step: phone — */
    if (sStep === 'phone') return card(
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--maroon)' }}>Enter your phone number</p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
          Your phone number becomes your Nakconel account number
        </p>
        <label className="field-label">Phone number</label>
        <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 8 }}>
          <input className="input" value="+234" readOnly style={{ textAlign: 'center', color: 'var(--muted)' }} />
          <input
            className="input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="080 1234 5678"
            value={sPhone}
            onChange={e => setSPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
          />
        </div>
        {isValidNgPhone(sPhone) && (
          <p style={{ fontSize: 12, color: 'var(--ok)' }}>
            Account number: <strong>{normalizePhone(sPhone)}</strong>
          </p>
        )}
        <button
          type="button"
          className="btn-gold"
          style={{ marginTop: 8 }}
          disabled={loading || !isValidNgPhone(sPhone)}
          onClick={handleSendOtp}
        >{loading ? 'Sending…' : 'Send verification code'}</button>
      </div>
    );

    /* — Step: OTP — */
    if (sStep === 'otp') return card(
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <StepDots current="otp" />
        <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--maroon)', textAlign: 'center' }}>OTP Verification</p>
        <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          Enter the 6-digit code sent to <strong>{normalizePhone(sPhone)}</strong>
        </p>
        <OtpBoxes value={sOtp} onChange={setSOtp} />
        <button
          type="button"
          className="btn-gold"
          disabled={loading || sOtp.replace(/\s/g,'').length < 6}
          onClick={handleVerifyOtp}
        >Verify</button>
        <button
          type="button"
          className="btn-ghost"
          style={{ marginTop: 4 }}
          onClick={handleSendOtp}
        >Resend code</button>
      </div>
    );

    /* — Step: identity — */
    if (sStep === 'identity') return card(
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <StepDots current="identity" />
        <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--maroon)' }}>Identity Verification</p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
          Provide your BVN or NIN — required by the CBN
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          {(['bvn','nin'] as const).map(t => (
            <button
              key={t}
              type="button"
              className={`tab${sIdType === t ? ' on' : ''}`}
              style={{ flex: 1 }}
              onClick={() => setSIdType(t)}
            >{t.toUpperCase()}</button>
          ))}
        </div>
        {sIdType === 'bvn' ? (
          <>
            <label className="field-label">Bank Verification Number (BVN)</label>
            <input
              className="input"
              placeholder="11-digit BVN"
              inputMode="numeric"
              maxLength={11}
              value={sBvn}
              onChange={e => setSBvn(e.target.value.replace(/\D/g,'').slice(0,11))}
            />
            <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
              BVN is encrypted and used only for identity checks. Dial *565*0# to get yours.
            </p>
          </>
        ) : (
          <>
            <label className="field-label">National Identification Number (NIN)</label>
            <input
              className="input"
              placeholder="11-digit NIN"
              inputMode="numeric"
              maxLength={11}
              value={sNin}
              onChange={e => setSNin(e.target.value.replace(/\D/g,'').slice(0,11))}
            />
            <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
              Dial *346# to get your NIN.
            </p>
          </>
        )}
        <button
          type="button"
          className="btn-gold"
          style={{ marginTop: 6 }}
          disabled={loading || (sIdType === 'bvn' ? sBvn.length < 11 : sNin.length < 11)}
          onClick={handleIdentity}
        >Continue</button>
      </div>
    );

    /* — Step: face — */
    if (sStep === 'face') return card(
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <StepDots current="face" />
        <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--maroon)', textAlign: 'center' }}>
          Facial Verification
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginBottom: 6 }}>
          Follow the on-screen instructions to verify your face
        </p>
        <div style={{
          width: 200, height: 240, borderRadius: '50% / 46%', margin: '0 auto 12px',
          border: sFaceDone ? '3px solid var(--ok)' : sFaceStage >= 1 ? '3px solid var(--gold)' : '3px dashed rgba(101,23,25,.4)',
          background: '#0a0606', position: 'relative', overflow: 'hidden',
          boxShadow: sFaceDone ? '0 0 32px rgba(95,212,146,.3)' : '0 0 20px rgba(197,155,68,.15)',
          transition: 'border-color .3s',
        }}>
          <video
            ref={videoRef}
            playsInline muted autoPlay
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', transform: 'scaleX(-1)',
              opacity: sFaceDone ? 0.2 : sCamReady ? 1 : 0.3, transition: 'opacity .4s',
            }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {!sCamReady && !sFaceDone && !sCamErr && (
            <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(247,236,212,.6)', fontSize: 13, zIndex: 2 }}>
              Starting camera…
            </span>
          )}
          {sFaceDone && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 2 }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(95,212,146,.2)', border: '2px solid #5fd492',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IconCheck size={40} color="#5fd492" />
              </div>
            </div>
          )}
        </div>
        {sSelfie && sFaceDone && (
          <div style={{ textAlign: 'center' }}>
            <img src={sSelfie} alt="Captured selfie" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold)', margin: '0 auto' }} />
          </div>
        )}
        <p style={{ fontSize: 13, color: sFaceDone ? 'var(--ok)' : 'var(--maroon)', fontWeight: 600, textAlign: 'center', lineHeight: 1.4 }}>
          {sFaceHint}
        </p>
        {sCamErr && (
          <p style={{ fontSize: 12, color: 'var(--danger)', lineHeight: 1.5, textAlign: 'center' }}>{sCamErr}</p>
        )}
        {!sFaceDone && (
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
            {FACE_STAGES.slice(0, 4).map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: 999, background: i <= sFaceStage ? 'var(--gold)' : 'rgba(101,23,25,.15)' }} />
            ))}
          </div>
        )}
        {sCamErr && (
          <button
            type="button"
            className="btn-outline"
            onClick={() => { faceRan.current = false; setSCamErr(''); setSFaceDone(false); setSFaceStage(0); setTimeout(() => { faceRan.current = false; setSStep('identity'); setTimeout(() => setSStep('face'), 60); }, 0); }}
          >Retry camera</button>
        )}
        <button
          type="button"
          className="btn-gold"
          disabled={!sFaceDone}
          onClick={handleFaceContinue}
        >{sFaceDone ? 'Continue' : 'Verifying…'}</button>
      </div>
    );

    /* — Step: profile — */
    if (sStep === 'profile') return card(
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <StepDots current="profile" />
        <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--maroon)' }}>Profile Information</p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Name must match your ID</p>
        <label className="field-label">Full Name (as on ID)</label>
        <input className="input" placeholder="e.g. Adewale Olusegun" value={sFullName} onChange={e => setSFullName(e.target.value)} />
        <label className="field-label">Email address (optional)</label>
        <input className="input" type="email" placeholder="you@email.com" value={sEmail} onChange={e => setSEmail(e.target.value)} />
        <label className="field-label">Date of Birth (optional)</label>
        <input className="input" type="date" value={sDob} onChange={e => setSdob(e.target.value)} />
        <button
          type="button"
          className="btn-gold"
          style={{ marginTop: 6 }}
          disabled={loading || sFullName.trim().length < 2}
          onClick={handleProfile}
        >Continue</button>
      </div>
    );

    /* — Step: password + PIN — */
    if (sStep === 'password') return card(
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <StepDots current="password" />
        <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--maroon)', textAlign: 'center' }}>
          {sPinStep === 'create' ? 'Set Password & PIN' : 'Confirm your PIN'}
        </p>
        {sPinStep === 'create' ? (
          <>
            <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginBottom: 4 }}>
              Choose a password and a 4-digit transaction PIN
            </p>
            <label className="field-label">Password (min. 6 characters)</label>
            <input
              className="input"
              type="password"
              placeholder="Create a strong password"
              value={sPassword}
              onChange={e => setSPassword(e.target.value)}
            />
            <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--maroon)', textAlign: 'center', marginTop: 12 }}>
              Create 4-digit PIN
            </p>
            <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
              Used to approve transfers and payments
            </p>
            <PinDots value={sPin} />
            <PinKeypad value={sPin} onChange={handlePinCreate} />
          </>
        ) : (
          <>
            <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginBottom: 4 }}>
              Enter the same PIN again to confirm
            </p>
            <PinDots value={sPin} />
            <PinKeypad value={sPin} onChange={handlePinConfirm} />
            {loading && <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>Creating your account…</p>}
          </>
        )}
      </div>
    );

    /* — Step: success — */
    if (sStep === 'success') return card(
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 20 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(40,119,78,.12)', border: '2px solid var(--ok)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconCheck size={44} color="var(--ok)" />
        </div>
        <p style={{ fontWeight: 800, fontSize: 20, color: 'var(--maroon)' }}>Account Created!</p>
        <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.6 }}>
          Welcome to Nakconel Bank.<br />
          Your account number is <strong style={{ color: 'var(--maroon)' }}>{normalizePhone(sPhone)}</strong>.
        </p>
        {sSelfie && (
          <img src={sSelfie} alt="Profile photo" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2.5px solid var(--gold)' }} />
        )}
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>Taking you to your dashboard…</p>
      </div>
    );
  }

  /* ════════════════════════════
     LOGIN screens
  ════════════════════════════ */
  /* — Login Step 1: phone — */
  if (tab === 'login' && lStep === 'phone') return card(
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--maroon)' }}>Enter your phone number</p>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
        We'll verify it's you before you log in
      </p>
      <label className="field-label">Phone number</label>
      <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 8 }}>
        <input className="input" value="+234" readOnly style={{ textAlign: 'center', color: 'var(--muted)' }} />
        <input
          className="input"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="080 1234 5678"
          value={lPhone}
          onChange={e => setLPhone(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLoginNext()}
        />
      </div>
      <button
        type="button"
        className="btn-gold"
        style={{ marginTop: 8 }}
        disabled={loading || !isValidNgPhone(lPhone)}
        onClick={handleLoginNext}
      >Continue</button>
    </div>
  );

  /* — Login Step 2: password/PIN — */
  if (tab === 'login' && lStep === 'password') return card(
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--maroon)', textAlign: 'center' }}>
        {lUsePin ? 'Enter your PIN' : 'Enter your password'}
      </p>
      <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
        Signing in as <strong>{normalizePhone(lPhone)}</strong>
      </p>

      {lUsePin ? (
        <>
          <PinDots value={lPin} />
          <PinKeypad value={lPin} onChange={handleLoginPin} />
        </>
      ) : (
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label className="field-label">Password</label>
          <input
            className="input"
            type="password"
            placeholder="Your password"
            value={lPassword}
            onChange={e => setLPassword(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="btn-gold"
            style={{ marginTop: 6 }}
            disabled={loading || !lPassword}
          >{loading ? 'Signing in…' : 'Login'}</button>
        </form>
      )}

      <button
        type="button"
        className="btn-ghost"
        style={{ marginTop: 4 }}
        onClick={() => { setLUsePin(u => !u); setLPassword(''); setLPin(''); }}
      >{lUsePin ? 'Use password instead' : 'Use PIN instead'}</button>
    </div>
  );

  return null;
}
