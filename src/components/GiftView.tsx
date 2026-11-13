'use client';

import React, { useState, useEffect } from 'react';

type Occasion = 'GENERAL' | 'BIRTHDAY' | 'CONGRATULATIONS' | 'THANK_YOU' | 'WEDDING' | 'HOLIDAY' | 'BUSINESS_BONUS';

const THEMES: Record<Occasion, { label: string; icon: string; bg: string; text: string; sub: string }> = {
  GENERAL:         { label: 'General',         icon: '🎁', bg: 'linear-gradient(135deg,#651719,#3e0c11)', text: '#fff9eb', sub: 'A gift for you' },
  BIRTHDAY:        { label: 'Birthday',        icon: '🎂', bg: 'linear-gradient(135deg,#a82b35,#e65100)', text: '#ffffff', sub: 'Happy Birthday!' },
  CONGRATULATIONS: { label: 'Congrats',        icon: '🏆', bg: 'linear-gradient(135deg,#c59b44,#a07820)', text: '#2a1a00', sub: 'Big Congratulations!' },
  THANK_YOU:       { label: 'Thank You',       icon: '🌟', bg: 'linear-gradient(135deg,#1b5e20,#2e7d32)', text: '#e8f5e9', sub: 'With Warm Thanks' },
  WEDDING:         { label: 'Wedding',         icon: '💍', bg: 'linear-gradient(135deg,#4a148c,#7b1fa2)', text: '#f3e5f5', sub: 'Wedding Blessings' },
  HOLIDAY:         { label: 'Holiday',         icon: '🎄', bg: 'linear-gradient(135deg,#b71c1c,#1b5e20)', text: '#fffde7', sub: 'Season Greetings' },
  BUSINESS_BONUS:  { label: 'Business Perk',   icon: '💼', bg: 'linear-gradient(135deg,#263238,#37474f)', text: '#eceff1', sub: 'Performance Reward' },
};

const PRESET_AMOUNTS = [2000, 5000, 10000, 25000, 50000, 100000];

export default function GiftView({
  accountId,
  onToast,
  onBalanceRefresh,
}: {
  accountId?: string;
  onToast: (msg: string, type?: 'ok' | 'err') => void;
  onBalanceRefresh?: () => void;
}) {
  const [tab, setTab] = useState<'send' | 'redeem' | 'history'>('send');

  // Send state
  const [amount, setAmount] = useState<number>(5000);
  const [occasion, setOccasion] = useState<Occasion>('GENERAL');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);

  // Redeem state
  const [redeemCode, setRedeemCode] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  // History state
  const [giftData, setGiftData] = useState<{ sent: any[]; received: any[]; rewards: any } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (tab === 'history') {
      loadHistory();
    }
  }, [tab]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/v1/gifts');
      const json = await res.json();
      if (json.success) setGiftData(json.data);
    } catch {
      onToast('Could not load gift history.', 'err');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePreview = async () => {
    if (!redeemCode.trim()) {
      onToast('Please enter a gift card code.', 'err');
      return;
    }
    setChecking(true);
    setPreviewData(null);
    try {
      const res = await fetch(`/api/v1/gifts/preview?code=${encodeURIComponent(redeemCode.trim())}`);
      const json = await res.json();
      if (json.success) {
        setPreviewData(json.data);
      } else {
        onToast(json.error || 'Gift card not found or expired.', 'err');
      }
    } catch {
      onToast('Network error while checking code.', 'err');
    } finally {
      setChecking(false);
    }
  };

  const handleRedeem = async () => {
    if (!accountId) {
      onToast('No active receiving account found.', 'err');
      return;
    }
    setRedeeming(true);
    try {
      const res = await fetch('/api/v1/gifts/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: redeemCode.trim(), accountId }),
      });
      const json = await res.json();
      if (json.success) {
        onToast(`Successfully redeemed ₦${(json.data.redeemedAmountKobo / 100).toLocaleString()}! +50 Points earned`, 'ok');
        setRedeemCode('');
        setPreviewData(null);
        if (onBalanceRefresh) onBalanceRefresh();
      } else {
        onToast(json.error || 'Redemption failed.', 'err');
      }
    } catch {
      onToast('Redemption failed due to network error.', 'err');
    } finally {
      setRedeeming(false);
    }
  };

  const handlePurchase = async () => {
    if (!pin || pin.length !== 4) {
      onToast('Please enter your 4-digit PIN.', 'err');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/v1/gifts/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountNaira: amount,
          occasion,
          senderName: senderName.trim() || undefined,
          message: message.trim() || undefined,
          recipientEmail: recipientEmail.trim() || undefined,
          recipientPhone: recipientPhone.trim() || undefined,
          pin,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIssuedCode(json.data.rawCode);
        setShowPinModal(false);
        setPin('');
        onToast('Gift card issued successfully!', 'ok');
        if (onBalanceRefresh) onBalanceRefresh();
      } else {
        onToast(json.error || 'Failed to purchase gift card.', 'err');
      }
    } catch {
      onToast('Error issuing gift card.', 'err');
    } finally {
      setSending(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    onToast('Gift code copied to clipboard!', 'ok');
  };

  const shareCode = (code: string) => {
    const text = `Hey! Here is a ₦${amount.toLocaleString()} Nakconel Gift Card for you: ${code}. Redeem it instantly on Nakconel Bank!`;
    if (navigator.share) {
      navigator.share({ title: 'Nakconel Gift Card', text }).catch(() => {});
    } else {
      copyCode(text);
    }
  };

  const currentTheme = THEMES[occasion];

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>Nakconel Gift</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>Digital gift cards, rewards & instant gifting</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
          borderRadius: 20, background: 'linear-gradient(135deg,rgba(197,155,68,.12),rgba(101,23,25,.06))',
          border: '1px solid rgba(197,155,68,.3)', color: '#a07820', fontSize: 13, fontWeight: 700
        }}>
          <span>⭐️</span>
          <span>{giftData?.rewards?.pointsBalance ?? 0} pts</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 12, padding: 4, marginBottom: 24, border: '1px solid var(--border)' }}>
        {(['send', 'redeem', 'history'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
              background: tab === t ? 'var(--maroon)' : 'transparent',
              color: tab === t ? '#fff9eb' : 'var(--muted)',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .2s'
            }}>
            {t === 'send' ? '🎁 Send a Gift' : t === 'redeem' ? '🎟️ Redeem Code' : '📜 History & Rewards'}
          </button>
        ))}
      </div>

      {/* TAB 1: SEND A GIFT */}
      {tab === 'send' && (
        <div>
          {/* Card Preview Banner */}
          <div style={{
            background: currentTheme.bg, color: currentTheme.text, borderRadius: 20,
            padding: 24, marginBottom: 24, boxShadow: '0 10px 25px rgba(0,0,0,.12)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', right: -15, bottom: -20, fontSize: 110, opacity: .18 }}>
              {currentTheme.icon}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', opacity: .8, fontWeight: 700 }}>
                  Nakconel Digital Gift
                </span>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{currentTheme.sub}</div>
              </div>
              <div style={{ fontSize: 28 }}>{currentTheme.icon}</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 12, opacity: .75 }}>Gift Amount</span>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.5 }}>₦{amount.toLocaleString()}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 12, opacity: .85 }}>
              <div>{senderName ? `From: ${senderName}` : 'From: You'}</div>
              <div style={{ fontFamily: 'monospace', letterSpacing: 1 }}>NKC-••••-••••-••••</div>
            </div>
          </div>

          {/* Amount Selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>
              Select Amount (₦)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
              {PRESET_AMOUNTS.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(a)}
                  style={{
                    padding: '10px 8px', borderRadius: 10,
                    border: amount === a ? '2px solid var(--maroon)' : '1px solid var(--border)',
                    background: amount === a ? 'rgba(101,23,25,.06)' : 'var(--surface)',
                    color: amount === a ? 'var(--maroon)' : 'var(--ink)',
                    fontWeight: 700, fontSize: 14, cursor: 'pointer'
                  }}>
                  ₦{a.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Occasion Selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>
              Choose Occasion & Theme
            </label>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
              {(Object.keys(THEMES) as Occasion[]).map(occ => (
                <button
                  key={occ}
                  type="button"
                  onClick={() => setOccasion(occ)}
                  style={{
                    flexShrink: 0, padding: '8px 14px', borderRadius: 20,
                    border: occasion === occ ? '2px solid var(--maroon)' : '1px solid var(--border)',
                    background: occasion === occ ? 'var(--maroon)' : 'var(--surface)',
                    color: occasion === occ ? '#fff9eb' : 'var(--ink)',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                  }}>
                  <span>{THEMES[occ].icon}</span>
                  <span>{THEMES[occ].label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Personalization */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
                Sender Name (Displayed on card)
              </label>
              <input
                type="text"
                placeholder="e.g. Alex"
                value={senderName}
                onChange={e => setSenderName(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
                Personal Message (Optional)
              </label>
              <textarea
                placeholder="Wishing you joy, success, and prosperity!"
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={2}
                maxLength={200}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, resize: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
                  Recipient Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
                  Recipient Phone (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="08012345678"
                  value={recipientPhone}
                  onChange={e => setRecipientPhone(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14 }}
                />
              </div>
            </div>
          </div>

          {/* Continue button */}
          <button
            type="button"
            onClick={() => setShowPinModal(true)}
            style={{
              width: '100%', padding: 14, borderRadius: 12, border: 'none',
              background: 'var(--maroon)', color: '#fff9eb', fontWeight: 800, fontSize: 15,
              cursor: 'pointer', boxShadow: '0 4px 14px rgba(101,23,25,.25)'
            }}>
            Purchase Gift Card (₦{amount.toLocaleString()})
          </button>
        </div>
      )}

      {/* TAB 2: REDEEM CODE */}
      {tab === 'redeem' && (
        <div>
          <div style={{ background: 'var(--surface)', padding: 24, borderRadius: 16, border: '1px solid var(--border)', marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800 }}>Enter Gift Card Code</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)' }}>
              Got a Nakconel gift code? Enter it below to preview and deposit the funds directly into your NGN balance.
            </p>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <input
                type="text"
                placeholder="NKC-XXXX-XXXX-XXXX"
                value={redeemCode}
                onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                style={{
                  flex: 1, padding: '13px 16px', borderRadius: 10, border: '1.5px solid var(--border)',
                  fontFamily: 'monospace', fontSize: 16, letterSpacing: 1.5, background: 'var(--bg)', color: 'var(--ink)'
                }}
              />
              <button
                type="button"
                onClick={handlePreview}
                disabled={checking || !redeemCode.trim()}
                style={{
                  padding: '0 20px', borderRadius: 10, border: 'none',
                  background: 'var(--maroon)', color: '#fff9eb', fontWeight: 700, fontSize: 13, cursor: 'pointer'
                }}>
                {checking ? 'Checking…' : 'Inspect'}
              </button>
            </div>
          </div>

          {/* Preview Card */}
          {previewData && (
            <div style={{
              background: THEMES[previewData.occasion as Occasion]?.bg || THEMES.GENERAL.bg,
              color: THEMES[previewData.occasion as Occasion]?.text || '#fff9eb',
              borderRadius: 20, padding: 24, marginBottom: 20,
              boxShadow: '0 10px 25px rgba(0,0,0,.15)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, opacity: .8 }}>
                  Verified Gift Card
                </span>
                <span style={{ fontSize: 24 }}>{THEMES[previewData.occasion as Occasion]?.icon || '🎁'}</span>
              </div>

              <div style={{ fontSize: 34, fontWeight: 900, marginBottom: 12 }}>
                ₦{(previewData.amount / 100).toLocaleString()}
              </div>

              {previewData.senderName && (
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                  From: {previewData.senderName}
                </div>
              )}

              {previewData.message && (
                <div style={{ fontSize: 13, fontStyle: 'italic', opacity: .9, marginBottom: 18, background: 'rgba(0,0,0,.15)', padding: '10px 14px', borderRadius: 8 }}>
                  “{previewData.message}”
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.2)' }}>
                <span style={{ fontSize: 12, opacity: .85 }}>Code: {previewData.codeMasked}</span>
                <button
                  type="button"
                  onClick={handleRedeem}
                  disabled={redeeming || !previewData.isValid}
                  style={{
                    padding: '10px 22px', borderRadius: 10, border: 'none',
                    background: '#fff9eb', color: 'var(--maroon)', fontWeight: 800, fontSize: 13,
                    cursor: previewData.isValid ? 'pointer' : 'not-allowed', opacity: previewData.isValid ? 1 : .6
                  }}>
                  {redeeming ? 'Redeeming…' : 'Deposit ₦' + (previewData.amount / 100).toLocaleString()}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HISTORY & REWARDS */}
      {tab === 'history' && (
        <div>
          {/* Rewards Status Card */}
          <div style={{
            background: 'linear-gradient(135deg,rgba(197,155,68,.15),rgba(101,23,25,.08))',
            borderRadius: 16, border: '1px solid rgba(197,155,68,.35)', padding: 20, marginBottom: 20,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Merchant & Gift Rewards
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--maroon)', marginTop: 4 }}>
                {giftData?.rewards?.pointsBalance ?? 0} <span style={{ fontSize: 16, fontWeight: 700 }}>Points</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                Earn 50 pts on every gift card redeemed. 100 pts = ₦100 cashback.
              </div>
            </div>
            <div style={{ fontSize: 38 }}>⭐️</div>
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Gift Cards Sent</h3>
          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Loading records…</div>
          ) : giftData?.sent && giftData.sent.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {giftData.sent.map((c: any) => (
                <div key={c.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--surface)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {THEMES[c.occasion as Occasion]?.icon} ₦{(c.amount / 100).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{c.codeMasked}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                      background: c.status === 'ACTIVE' ? 'rgba(40,119,78,.12)' : 'rgba(0,0,0,.06)',
                      color: c.status === 'ACTIVE' ? 'var(--ok)' : 'var(--muted)'
                    }}>
                      {c.status}
                    </span>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 24, background: 'var(--surface)', borderRadius: 12, color: 'var(--muted)', marginBottom: 20 }}>
              No gift cards sent yet.
            </div>
          )}

          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Gifts Redeemed</h3>
          {giftData?.received && giftData.received.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {giftData.received.map((r: any) => (
                <div key={r.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--surface)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ok)' }}>
                      +₦{(r.amount / 100).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {r.giftCard?.senderName ? `From ${r.giftCard.senderName}` : 'Gift Card deposit'}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 24, background: 'var(--surface)', borderRadius: 12, color: 'var(--muted)' }}>
              No gifts redeemed yet.
            </div>
          )}
        </div>
      )}

      {/* PIN CONFIRMATION MODAL */}
      {showPinModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div style={{
            background: 'var(--surface)', width: '90%', maxWidth: 380, borderRadius: 20,
            padding: 24, border: '1px solid var(--border)', boxShadow: '0 20px 40px rgba(0,0,0,.3)'
          }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, textAlign: 'center' }}>Confirm Gift Purchase</h3>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
              ₦{amount.toLocaleString()} will be debited from your active NGN balance.
            </p>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textAlign: 'center', marginBottom: 8, color: 'var(--ink)' }}>
                Enter 4-Digit Transaction PIN
              </label>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                autoFocus
                placeholder="••••"
                style={{
                  width: '100%', textAlign: 'center', padding: '12px 0', fontSize: 24,
                  letterSpacing: 8, borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => { setShowPinModal(false); setPin(''); }}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePurchase}
                disabled={sending || pin.length !== 4}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: 'var(--maroon)', color: '#fff9eb', fontWeight: 800, cursor: 'pointer', opacity: pin.length === 4 ? 1 : .5 }}>
                {sending ? 'Issuing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ISSUED CODE SUCCESS MODAL */}
      {issuedCode && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div style={{
            background: 'var(--surface)', width: '90%', maxWidth: 420, borderRadius: 20,
            padding: 28, border: '1px solid var(--border)', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,.3)'
          }}>
            <div style={{ fontSize: 50, marginBottom: 10 }}>🎉</div>
            <h3 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800 }}>Gift Card Ready!</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--muted)' }}>
              Share this code with your recipient. Anyone with this code can redeem ₦{amount.toLocaleString()} into their Nakconel account.
            </p>

            <div style={{
              background: 'rgba(101,23,25,.07)', border: '1.5px dashed var(--maroon)',
              borderRadius: 12, padding: '16px 20px', marginBottom: 20
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Gift Card Code
              </span>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'monospace', color: 'var(--maroon)', letterSpacing: 2, marginTop: 4 }}>
                {issuedCode}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => copyCode(issuedCode)}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--maroon)', background: 'transparent', color: 'var(--maroon)', fontWeight: 700, cursor: 'pointer' }}>
                📋 Copy Code
              </button>
              <button
                type="button"
                onClick={() => shareCode(issuedCode)}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: 'var(--maroon)', color: '#fff9eb', fontWeight: 800, cursor: 'pointer' }}>
                🎁 Share Gift
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIssuedCode(null)}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
