'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  apiIntlCorridors,
  apiIntlQuote,
  apiIntlTransfer,
  apiListIntlTransfers,
  type IntlCorridor,
  type IntlQuote,
} from '@/lib/api';

type Step = 'corridors' | 'form' | 'confirm' | 'pin' | 'done';

type Props = {
  userId: string;
  accountId: string;
  onToast: (m: string) => void;
  onBalanceRefresh?: () => void;
};

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

export default function InternationalView({ userId, accountId, onToast, onBalanceRefresh }: Props) {
  const [step, setStep] = useState<Step>('corridors');
  const [corridors, setCorridors] = useState<IntlCorridor[]>([]);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof apiListIntlTransfers>>>([]);
  const [loading, setLoading] = useState(false);

  const [corridor, setCorridor] = useState<IntlCorridor | null>(null);
  const [countryCode, setCountryCode] = useState('');
  const [amount, setAmount] = useState('');
  const [benName, setBenName] = useState('');
  const [benAccount, setBenAccount] = useState('');
  const [benBank, setBenBank] = useState('');
  const [note, setNote] = useState('');
  const [quote, setQuote] = useState<IntlQuote | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [result, setResult] = useState<{
    amountForeign: number;
    currency: string;
    beneficiaryName: string;
    country: string;
    totalDebitNgn: number;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, h] = await Promise.all([apiIntlCorridors(), apiListIntlTransfers(userId)]);
      setCorridors(c);
      setHistory(h);
    } catch (e: unknown) {
      onToast(e instanceof Error ? e.message : 'Could not load corridors');
    }
  }, [userId, onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const pickCorridor = (c: IntlCorridor) => {
    setCorridor(c);
    setCountryCode(c.countries[0]?.code || '');
    setQuote(null);
    setStep('form');
  };

  const buildQuote = async () => {
    if (!corridor || !countryCode) return;
    const amt = parseFloat(amount);
    if (!amt || amt < 1000) {
      onToast('Minimum international send is ₦1,000');
      return;
    }
    if (!benName.trim() || benName.trim().length < 2) {
      onToast('Enter beneficiary full name');
      return;
    }
    if (!benAccount.trim() || benAccount.trim().length < 5) {
      onToast('Enter beneficiary account / IBAN / wallet ID');
      return;
    }
    setLoading(true);
    try {
      const q = await apiIntlQuote({
        corridorId: corridor.id,
        countryCode,
        amountNgn: amt,
      });
      setQuote(q);
      setStep('confirm');
    } catch (e: unknown) {
      onToast(e instanceof Error ? e.message : 'Quote failed');
    } finally {
      setLoading(false);
    }
  };

  const submitPin = async () => {
    if (!quote || !corridor || !/^\d{4}$/.test(pin)) {
      setPinError('Enter your 4-digit PIN');
      return;
    }
    setLoading(true);
    setPinError('');
    try {
      const t = await apiIntlTransfer({
        userId,
        fromAccountId: accountId,
        corridorId: corridor.id,
        countryCode,
        amountNgn: quote.amountNgn,
        beneficiaryName: benName.trim(),
        beneficiaryAccount: benAccount.trim(),
        beneficiaryBank: benBank.trim() || undefined,
        note: note.trim() || undefined,
        pin,
        idempotencyKey: uid(),
      });
      setResult({
        amountForeign: t.amountForeign,
        currency: t.currency,
        beneficiaryName: t.beneficiaryName,
        country: t.country,
        totalDebitNgn: t.totalDebitNgn,
      });
      setStep('done');
      onToast('International transfer submitted');
      onBalanceRefresh?.();
      load();
    } catch (e: unknown) {
      setPinError(e instanceof Error ? e.message : 'Transfer failed');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('corridors');
    setCorridor(null);
    setCountryCode('');
    setAmount('');
    setBenName('');
    setBenAccount('');
    setBenBank('');
    setNote('');
    setQuote(null);
    setPin('');
    setPinError('');
    setResult(null);
  };

  if (step === 'done' && result) {
    return (
      <div style={{ paddingBottom: 28, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '24px auto 16px', background: 'rgba(95,212,146,0.16)', border: '1px solid rgba(95,212,146,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>✓</div>
        <h2 style={{ color: '#f0d78c', fontSize: 22 }}>Transfer sent</h2>
        <p style={{ color: 'rgba(247,236,212,0.55)', marginTop: 8, fontSize: 14 }}>{result.amountForeign} {result.currency} → {result.beneficiaryName}</p>
        <p style={{ color: 'rgba(247,236,212,0.4)', marginTop: 4, fontSize: 12 }}>Debited {formatNGN(result.totalDebitNgn)} · {result.country}</p>
        <button type="button" className="btn-gold" style={{ marginTop: 24 }} onClick={reset}>Send another</button>
      </div>
    );
  }

  if (step === 'pin') {
    return (
      <div style={{ paddingBottom: 28, textAlign: 'center' }}>
        <button type="button" className="btn-ghost" style={{ marginBottom: 12 }} onClick={() => setStep('confirm')}>← Back</button>
        <h2 className="page-title" style={{ textAlign: 'center' }}>Enter PIN</h2>
        <p className="page-sub" style={{ textAlign: 'center' }}>Confirm international transfer</p>
        <input className="input" type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} style={{ letterSpacing: 12, textAlign: 'center', fontSize: 24, maxWidth: 180, margin: '16px auto' }} />
        {pinError ? <p style={{ color: '#ef7a7a', fontSize: 13 }}>{pinError}</p> : null}
        <button type="button" className="btn-gold" style={{ marginTop: 12 }} disabled={loading || pin.length !== 4} onClick={submitPin}>{loading ? 'Sending…' : 'Confirm & send'}</button>
      </div>
    );
  }

  if (step === 'confirm' && quote) {
    return (
      <div style={{ paddingBottom: 28 }}>
        <button type="button" className="btn-ghost" style={{ marginBottom: 12 }} onClick={() => setStep('form')}>← Edit</button>
        <h2 className="page-title">Confirm transfer</h2>
        <p className="page-sub">Review FX and fees before PIN</p>
        <div className="glass" style={{ padding: 18 }}>
          <p style={{ fontSize: 12, color: 'rgba(247,236,212,0.45)' }}>Recipient gets</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: '#f0d78c', marginTop: 4 }}>{quote.amountForeign} {quote.currency}</p>
          <p style={{ fontSize: 13, color: 'rgba(247,236,212,0.55)', marginTop: 4 }}>{benName} · {quote.countryName}</p>
          <div style={{ height: 1, background: 'rgba(212,175,55,0.12)', margin: '14px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 8 }}><span style={{ color: 'rgba(247,236,212,0.55)' }}>You send</span><span>{formatNGN(quote.amountNgn)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 8 }}><span style={{ color: 'rgba(247,236,212,0.55)' }}>Fee</span><span>{formatNGN(quote.feeNgn)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 8 }}><span style={{ color: 'rgba(247,236,212,0.55)' }}>FX rate</span><span>₦{quote.fxRate.toLocaleString()} / {quote.currency}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, marginTop: 8, fontWeight: 700 }}><span style={{ color: 'rgba(247,236,212,0.55)' }}>Total debit</span><span style={{ color: '#f0d78c' }}>{formatNGN(quote.totalDebitNgn)}</span></div>
          <p style={{ fontSize: 11, color: 'rgba(247,236,212,0.4)', marginTop: 12, lineHeight: 1.5 }}>{quote.settlementNote}</p>
        </div>
        <button type="button" className="btn-gold" style={{ marginTop: 18 }} onClick={() => { setPin(''); setStep('pin'); }}>Enter PIN to send</button>
      </div>
    );
  }

  if (step === 'form' && corridor) {
    return (
      <div style={{ paddingBottom: 28 }}>
        <button type="button" className="btn-ghost" style={{ marginBottom: 12 }} onClick={() => setStep('corridors')}>← Corridors</button>
        <h2 className="page-title">{corridor.flag} {corridor.label}</h2>
        <p className="page-sub">{corridor.subtitle}</p>
        <label className="field-label">Country</label>
        <select className="input" value={countryCode} onChange={(e) => { setCountryCode(e.target.value); setQuote(null); }} style={{ marginBottom: 12 }}>
          {corridor.countries.map((c) => (<option key={c.code} value={c.code}>{c.name} ({c.currency})</option>))}
        </select>
        <label className="field-label">Amount (NGN)</label>
        <div className="amount-box" style={{ marginBottom: 12 }}><span className="currency">₦</span><input className="input" placeholder="10000" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <label className="field-label">Beneficiary name</label>
        <input className="input" placeholder="Full legal name" value={benName} onChange={(e) => setBenName(e.target.value)} style={{ marginBottom: 12 }} />
        <label className="field-label">Account / IBAN / wallet</label>
        <input className="input" placeholder="Account number or IBAN" value={benAccount} onChange={(e) => setBenAccount(e.target.value)} style={{ marginBottom: 12 }} />
        <label className="field-label">Bank / provider (optional)</label>
        <input className="input" placeholder="e.g. Chase, Barclays, MTN MoMo" value={benBank} onChange={(e) => setBenBank(e.target.value)} style={{ marginBottom: 12 }} />
        <label className="field-label">Note (optional)</label>
        <input className="input" placeholder="Payment for…" value={note} onChange={(e) => setNote(e.target.value)} style={{ marginBottom: 16 }} />
        <p style={{ fontSize: 11, color: 'rgba(247,236,212,0.4)', marginBottom: 12, lineHeight: 1.5 }}>Fee from {corridor.feePct}% (min ₦{corridor.feeMinNgn.toLocaleString()}) · Settles in {corridor.settlementDays}</p>
        <button type="button" className="btn-gold" disabled={loading} onClick={buildQuote}>{loading ? 'Getting rate…' : 'Get quote'}</button>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 28 }}>
      <h2 className="page-title">Send abroad</h2>
      <p className="page-sub">Nigeria → Africa, UK, US, GCC & Europe</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {corridors.map((c) => (
          <button key={c.id} type="button" className="glass" onClick={() => pickCorridor(c)} style={{ padding: 16, textAlign: 'left', cursor: 'pointer', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 28, width: 44, textAlign: 'center' }}>{c.flag}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: '#f0d78c', fontSize: 15 }}>{c.label}</p>
              <p style={{ fontSize: 12, color: 'rgba(247,236,212,0.5)', marginTop: 2 }}>{c.subtitle}</p>
              <p style={{ fontSize: 11, color: 'rgba(247,236,212,0.35)', marginTop: 4 }}>Fee from {c.feePct}% · {c.settlementDays}</p>
            </div>
            <span style={{ color: '#d4af37', fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>
      {history.length > 0 && (
        <>
          <h3 style={{ fontSize: 13, color: 'rgba(247,236,212,0.5)', fontWeight: 600, marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Recent international</h3>
          <div className="glass" style={{ padding: '4px 16px' }}>
            {history.slice(0, 5).map((t) => (
              <div key={t.id} className="tx-row">
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{t.beneficiaryName} · {t.currency}</div>
                  <div style={{ fontSize: 11, color: 'rgba(247,236,212,0.4)', marginTop: 2 }}>{t.corridor} · {t.status}</div>
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#f0d78c' }}>{formatNGN(t.amountNgn)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
