'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  apiIntlCorridors,
  apiIntlQuote,
  apiListIntlTransfers,
  type IntlCorridor,
  type IntlQuote,
} from '@/lib/api';
import { IconArrowRight, IconCard, IconLandmark, IconWorld } from '@/components/Icons';

type Step = 'corridors' | 'form' | 'confirm';

type Props = {
  userId: string;
  onToast: (m: string) => void;
};

function formatNGN(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(n);
}

function CorridorIcon({ id }: { id: string }) {
  if (id === 'AFRICA' || id === 'EUROPE') return <IconWorld size={22} />;
  if (id === 'US') return <IconCard size={22} />;
  return <IconLandmark size={22} />;
}

export default function InternationalView({ userId, onToast }: Props) {
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

  const load = useCallback(async () => {
    const [corridorsResult, historyResult] = await Promise.allSettled([
      apiIntlCorridors(),
      apiListIntlTransfers(),
    ]);

    if (corridorsResult.status === 'fulfilled') {
      setCorridors(corridorsResult.value);
    } else {
      onToast(corridorsResult.reason instanceof Error ? corridorsResult.reason.message : 'Could not load corridors');
    }

    if (historyResult.status === 'fulfilled') {
      setHistory(historyResult.value);
    } else {
      setHistory([]);
      onToast(historyResult.reason instanceof Error ? historyResult.reason.message : 'Could not load international history');
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

  if (step === 'confirm' && quote) {
    return (
      <div style={{ paddingBottom: 28 }}>
        <button type="button" className="btn-ghost" style={{ marginBottom: 12 }} onClick={() => setStep('form')}>← Edit</button>
        <h2 className="page-title">Confirm transfer</h2>
        <p className="page-sub">Indicative estimate only — no international payments are connected</p>
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
        <div role="status" style={{ background: 'rgba(240,215,140,0.1)', border: '1px solid rgba(240,215,140,0.32)', borderRadius: 16, color: '#f0d78c', fontSize: 13, lineHeight: 1.6, marginTop: 18, padding: 14 }}>
          International transfers are unavailable until a licensed payment provider is connected. This estimate is not a payment offer, and no money will be moved.
        </div>
      </div>
    );
  }

  if (step === 'form' && corridor) {
    return (
      <div style={{ paddingBottom: 28 }}>
        <button type="button" className="btn-ghost" style={{ marginBottom: 12 }} onClick={() => setStep('corridors')}>← Corridors</button>
        <h2 className="page-title corridor-title"><span className="corridor-icon"><CorridorIcon id={corridor.id} /></span>{corridor.label}</h2>
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
      <div role="status" style={{ background: 'rgba(240,215,140,0.1)', border: '1px solid rgba(240,215,140,0.32)', borderRadius: 16, color: '#f0d78c', fontSize: 13, lineHeight: 1.6, marginBottom: 16, padding: 14 }}>
        International transfers are not available yet. Any shown rates are indicative demo estimates only; no money will be moved.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {corridors.map((c) => (
          <button key={c.id} type="button" className="glass corridor-card" onClick={() => pickCorridor(c)}>
            <span className="corridor-icon"><CorridorIcon id={c.id} /></span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: '#f0d78c', fontSize: 15 }}>{c.label}</p>
              <p style={{ fontSize: 12, color: 'rgba(247,236,212,0.5)', marginTop: 2 }}>{c.subtitle}</p>
              <p style={{ fontSize: 11, color: 'rgba(247,236,212,0.35)', marginTop: 4 }}>Fee from {c.feePct}% · {c.settlementDays}</p>
            </div>
            <IconArrowRight size={18} />
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
