'use client';

import React, { useEffect, useMemo, useState } from 'react';

type Occasion = 'GENERAL' | 'BIRTHDAY' | 'CONGRATULATIONS' | 'THANK_YOU' | 'WEDDING' | 'HOLIDAY' | 'BUSINESS_BONUS';
type Tab = 'send' | 'redeem' | 'history';
const THEMES: Record<Occasion, { label: string; icon: string; line: string; subtitle: string }> = {
  GENERAL: { label: 'Just because', icon: '✦', line: '#7b292d', subtitle: 'A little something for you' },
  BIRTHDAY: { label: 'Birthday', icon: '✧', line: '#a24b42', subtitle: 'Make their day special' },
  CONGRATULATIONS: { label: 'Congratulations', icon: '★', line: '#9b762e', subtitle: 'Celebrate the big moment' },
  THANK_YOU: { label: 'Thank you', icon: '♡', line: '#47745a', subtitle: 'A thoughtful thank you' },
  WEDDING: { label: 'Wedding', icon: '◇', line: '#745a80', subtitle: 'For a beautiful beginning' },
  HOLIDAY: { label: 'Holiday', icon: '❋', line: '#55735a', subtitle: 'Seasonal good wishes' },
  BUSINESS_BONUS: { label: 'Business reward', icon: '◆', line: '#52616a', subtitle: 'Recognise great work' },
};
const AMOUNTS = [2000, 5000, 10000, 25000, 50000, 100000];
const money = (n: number) => '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 });

export default function GiftView({ accountId, onToast, onBalanceRefresh }: {
  accountId?: string;
  onToast: (msg: string, type?: 'ok' | 'err') => void;
  onBalanceRefresh?: () => void;
}) {
  const [tab, setTab] = useState<Tab>('send');
  const [amount, setAmount] = useState(5000);
  const [customAmount, setCustomAmount] = useState('');
  const [occasion, setOccasion] = useState<Occasion>('GENERAL');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [giftData, setGiftData] = useState<{ sent: any[]; received: any[]; rewards: any } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const selectedAmount = useMemo(() => customAmount.trim() ? Number(customAmount.replace(/,/g, '')) : amount, [amount, customAmount]);
  const theme = THEMES[occasion];

  useEffect(() => {
    if (tab !== 'history') return;
    let active = true;
    setLoadingHistory(true);
    fetch('/api/v1/gifts').then(r => r.json()).then(json => {
      if (active && json.success) setGiftData(json.data);
      else if (active) onToast(json.error || 'Could not load gift history.', 'err');
    }).catch(() => { if (active) onToast('Could not load gift history.', 'err'); })
      .finally(() => { if (active) setLoadingHistory(false); });
    return () => { active = false; };
  }, [tab, onToast]);

  async function previewGift() {
    if (!redeemCode.trim()) return onToast('Enter a gift code first.', 'err');
    setChecking(true); setPreviewData(null);
    try {
      const response = await fetch('/api/v1/gifts/preview?code=' + encodeURIComponent(redeemCode.trim()));
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Gift code could not be found.');
      setPreviewData(json.data);
    } catch (error) { onToast(error instanceof Error ? error.message : 'Could not check this code.', 'err'); }
    finally { setChecking(false); }
  }

  async function redeemGift() {
    if (!accountId) return onToast('No active receiving account found.', 'err');
    setRedeeming(true);
    try {
      const response = await fetch('/api/v1/gifts/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: redeemCode.trim(), accountId }) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Redemption failed.');
      onToast('Gift redeemed successfully. ' + (json.data.pointsAwarded ?? 0) + ' reward points earned.', 'ok');
      setRedeemCode(''); setPreviewData(null); onBalanceRefresh?.();
    } catch (error) { onToast(error instanceof Error ? error.message : 'Redemption failed.', 'err'); }
    finally { setRedeeming(false); }
  }

  async function purchaseGift() {
    if (pin.length !== 4) return onToast('Enter your 4-digit transaction PIN.', 'err');
    if (!Number.isFinite(selectedAmount) || selectedAmount < 100 || selectedAmount > 500000) return onToast('Choose an amount between ₦100 and ₦500,000.', 'err');
    setSending(true);
    try {
      const response = await fetch('/api/v1/gifts/purchase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        amountNaira: selectedAmount, occasion, senderName: senderName.trim() || undefined,
        message: message.trim() || undefined, recipientEmail: recipientEmail.trim() || undefined,
        recipientPhone: recipientPhone.trim() || undefined, pin,
      }) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Gift card purchase failed.');
      setIssuedCode(json.data.rawCode); setShowPinModal(false); setPin('');
      onToast('Gift card created.', 'ok'); onBalanceRefresh?.();
    } catch (error) { onToast(error instanceof Error ? error.message : 'Gift card purchase failed.', 'err'); }
    finally { setSending(false); }
  }

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); onToast('Copied to clipboard.', 'ok'); }
    catch { onToast('Copy was unavailable in this browser.', 'err'); }
  }

  async function share(code: string) {
    const text = 'Here is a ' + money(selectedAmount) + ' Nakconel Gift Card for you: ' + code + '. Redeem it on Nakconel Bank.';
    if (navigator.share) { try { await navigator.share({ title: 'Nakconel Gift', text }); } catch { /* share cancelled */ } }
    else await copy(text);
  }

  return (
    <div className="nk-gift">
      <style>{`
        .nk-gift{max-width:1060px;margin:0 auto;color:var(--ink)}
        .nk-gift-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:20px}
        .nk-gift-kicker{font-size:10px;letter-spacing:.17em;text-transform:uppercase;color:var(--gold);font-weight:800}
        .nk-gift-title{font-size:clamp(24px,4vw,32px);font-weight:800;letter-spacing:-.04em;margin:5px 0}
        .nk-gift-sub{font-size:13px;color:var(--muted);line-height:1.6}
        .nk-gift-points{border:1px solid rgba(197,155,68,.38);background:var(--surface);border-radius:13px;padding:10px 14px;text-align:right;white-space:nowrap}
        .nk-gift-points small{display:block;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-weight:800}
        .nk-gift-points strong{display:block;color:var(--maroon);font-size:19px;margin-top:2px}
        .nk-gift-tabs{display:flex;gap:5px;padding:5px;background:var(--surface);border:1px solid var(--border);border-radius:14px;margin-bottom:18px;width:max-content;max-width:100%}
        .nk-gift-tab{border:0;background:transparent;color:var(--muted);padding:10px 15px;border-radius:10px;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap}
        .nk-gift-tab.active{background:var(--maroon);color:#fff8e9}
        .nk-gift-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(260px,.9fr);gap:16px;align-items:start}
        .nk-gift-panel{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:20px;min-width:0}
        .nk-gift-section-title{font-size:14px;font-weight:800;margin-bottom:5px}
        .nk-gift-section-sub{font-size:11px;color:var(--muted);line-height:1.6;margin-bottom:16px}
        .nk-gift-card{position:relative;overflow:hidden;min-height:220px;border-radius:18px;padding:22px;color:#fff8e9;background:linear-gradient(125deg,var(--gift-tone),#301013);display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 12px 26px rgba(62,12,17,.14)}
        .nk-gift-card:after{content:'';position:absolute;width:190px;height:190px;border:1px solid rgba(255,248,233,.15);border-radius:50%;right:-85px;top:-100px;box-shadow:0 0 0 18px rgba(255,248,233,.035),0 0 0 38px rgba(255,248,233,.025);pointer-events:none}
        .nk-gift-card-top,.nk-gift-card-bottom{display:flex;justify-content:space-between;align-items:center;gap:12px;position:relative;z-index:1}
        .nk-gift-card-brand{font-size:10px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;opacity:.85}
        .nk-gift-card-icon{font-size:25px}
        .nk-gift-card-sub{font-size:13px;font-weight:700;margin-top:8px}
        .nk-gift-card-amount{font-size:clamp(27px,4vw,36px);font-weight:900;letter-spacing:-.04em;margin-top:7px}
        .nk-gift-card-bottom{font-size:10px;opacity:.82}
        .nk-gift-field{display:block;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:14px 0 7px}
        .nk-gift-input,.nk-gift-textarea{display:block;width:100%;min-height:45px;border:1px solid var(--border);border-radius:10px;padding:11px 12px;background:var(--bg);color:var(--ink);font:inherit;font-size:13px;outline:none}
        .nk-gift-textarea{min-height:76px;resize:vertical}
        .nk-gift-input:focus,.nk-gift-textarea:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(197,155,68,.12)}
        .nk-gift-amounts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
        .nk-gift-amount{padding:10px 5px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--ink);font-size:11px;font-weight:800;cursor:pointer}
        .nk-gift-amount.active{border-color:var(--maroon);background:rgba(101,23,25,.08);color:var(--maroon)}
        .nk-gift-occasions{display:flex;gap:7px;flex-wrap:wrap}
        .nk-gift-occasion{border:1px solid var(--border);border-radius:999px;padding:8px 11px;background:var(--bg);color:var(--muted);font-size:10px;font-weight:700;cursor:pointer}
        .nk-gift-occasion.active{border-color:var(--maroon);background:var(--maroon);color:#fff8e9}
        .nk-gift-btn{width:100%;border:0;border-radius:11px;min-height:47px;padding:12px 15px;background:var(--maroon);color:#fff8e9;font-size:12px;font-weight:800;cursor:pointer}
        .nk-gift-btn:disabled{opacity:.5;cursor:not-allowed}
        .nk-gift-btn.secondary{background:var(--surface);color:var(--maroon);border:1px solid var(--border)}
        .nk-gift-note{font-size:10px;color:var(--muted);line-height:1.6;margin-top:10px}
        .nk-gift-redeem{max-width:640px;margin:0 auto}
        .nk-gift-code{font-family:ui-monospace,monospace;letter-spacing:.08em}
        .nk-gift-preview{border:1px solid var(--border);background:var(--surface-soft);border-radius:15px;padding:18px;margin-top:14px}
        .nk-gift-row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:13px 0;border-bottom:1px solid var(--border)}
        .nk-gift-row:last-child{border-bottom:0}
        .nk-gift-muted{font-size:11px;color:var(--muted)}
        .nk-gift-badge{font-size:9px;font-weight:800;letter-spacing:.06em;border-radius:999px;padding:5px 8px;background:rgba(40,119,78,.1);color:var(--ok)}
        .nk-gift-modal{position:fixed;inset:0;z-index:999;background:rgba(20,10,10,.66);display:grid;place-items:center;padding:18px}
        .nk-gift-modal-card{width:100%;max-width:410px;background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:22px;box-shadow:0 22px 70px rgba(0,0,0,.28)}
        @media(max-width:760px){.nk-gift-grid{grid-template-columns:1fr}.nk-gift-head{align-items:center}.nk-gift-panel{padding:16px}}
        @media(max-width:430px){.nk-gift-points{padding:8px 10px}.nk-gift-points strong{font-size:15px}.nk-gift-tab{padding:9px 11px}.nk-gift-card{min-height:190px;padding:18px}}
      `}</style>
      <header className="nk-gift-head">
        <div><div className="nk-gift-kicker">Nakconel rewards</div><h1 className="nk-gift-title">Give a little joy.</h1><p className="nk-gift-sub">Send a thoughtful digital gift, redeem a code or keep track of your rewards.</p></div>
        <div className="nk-gift-points"><small>Your reward points</small><strong>{giftData?.rewards?.pointsBalance ?? 0} pts</strong></div>
      </header>
      <nav className="nk-gift-tabs" aria-label="Gift sections">
        {(['send','redeem','history'] as Tab[]).map(item=><button key={item} className={'nk-gift-tab ' + (tab===item?'active':'')} onClick={()=>setTab(item)}>{item==='send'?'Send a gift':item==='redeem'?'Redeem code':'History & rewards'}</button>)}
      </nav>
      {tab==='send' && <div className="nk-gift-grid">
        <section className="nk-gift-panel">
          <h2 className="nk-gift-section-title">Create a gift card</h2><p className="nk-gift-section-sub">Choose an amount and make it personal. Your recipient can redeem the code in Nakconel.</p>
          <div className="nk-gift-card" style={{'--gift-tone':theme.line} as React.CSSProperties}>
            <div className="nk-gift-card-top"><div><div className="nk-gift-card-brand">Nakconel · Digital gift</div><div className="nk-gift-card-sub">{theme.subtitle}</div></div><div className="nk-gift-card-icon">{theme.icon}</div></div>
            <div><div className="nk-gift-muted" style={{color:'rgba(255,248,233,.72)'}}>Gift value</div><div className="nk-gift-card-amount">{money(Number.isFinite(selectedAmount)?selectedAmount:0)}</div></div>
            <div className="nk-gift-card-bottom"><span>From {senderName.trim()||'Someone thoughtful'}</span><span className="nk-gift-code">NKC · •••• · ••••</span></div>
          </div>
          <label className="nk-gift-field">Choose an amount</label>
          <div className="nk-gift-amounts">{AMOUNTS.map(value=><button type="button" key={value} className={'nk-gift-amount '+(!customAmount&&amount===value?'active':'')} onClick={()=>{setAmount(value);setCustomAmount('')}}>{money(value)}</button>)}</div>
          <label className="nk-gift-field">Or enter a custom amount (₦)</label><input className="nk-gift-input" type="number" min="100" max="500000" value={customAmount} onChange={event=>setCustomAmount(event.target.value)} placeholder="Minimum ₦100 · Maximum ₦500,000"/>
          <label className="nk-gift-field">Choose an occasion</label>
          <div className="nk-gift-occasions">{(Object.keys(THEMES) as Occasion[]).map(key=><button type="button" key={key} className={'nk-gift-occasion '+(occasion===key?'active':'')} onClick={()=>setOccasion(key)}>{THEMES[key].icon} {THEMES[key].label}</button>)}</div>
        </section>
        <section className="nk-gift-panel">
          <h2 className="nk-gift-section-title">Make it personal</h2><p className="nk-gift-section-sub">Add a name and a short note for the person receiving your gift.</p>
          <label className="nk-gift-field">Your name</label><input className="nk-gift-input" value={senderName} onChange={event=>setSenderName(event.target.value)} maxLength={80} placeholder="Name displayed on the gift"/>
          <label className="nk-gift-field">Personal message</label><textarea className="nk-gift-textarea" value={message} onChange={event=>setMessage(event.target.value)} maxLength={300} placeholder="Write a thoughtful message…"/>
          <label className="nk-gift-field">Recipient email · optional</label><input className="nk-gift-input" type="email" value={recipientEmail} onChange={event=>setRecipientEmail(event.target.value)} placeholder="name@example.com"/>
          <label className="nk-gift-field">Recipient phone · optional</label><input className="nk-gift-input" type="tel" value={recipientPhone} onChange={event=>setRecipientPhone(event.target.value)} placeholder="Phone number"/>
          <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid var(--border)'}}><div className="nk-gift-row" style={{paddingTop:0}}><span className="nk-gift-muted">Gift value</span><strong>{money(selectedAmount||0)}</strong></div><button className="nk-gift-btn" disabled={!Number.isFinite(selectedAmount)||selectedAmount<100||selectedAmount>500000} onClick={()=>setShowPinModal(true)}>Continue to confirmation →</button><p className="nk-gift-note">Review the amount and recipient details before confirming. Never share your transaction PIN with anyone.</p></div>
        </section>
      </div>}
      {tab==='redeem' && <section className="nk-gift-panel nk-gift-redeem">
        <div className="nk-gift-kicker">A gift waiting for you</div><h2 className="nk-gift-title" style={{fontSize:23}}>Redeem your gift</h2><p className="nk-gift-section-sub">Enter the Nakconel gift code to check its value and status before redeeming it into your NGN account.</p>
        <label className="nk-gift-field">Gift card code</label><div style={{display:'flex',gap:8}}><input className="nk-gift-input nk-gift-code" style={{flex:1,minWidth:0}} value={redeemCode} onChange={event=>{setRedeemCode(event.target.value.toUpperCase());setPreviewData(null)}} placeholder="NKC-XXXX-XXXX-XXXX"/><button className="nk-gift-btn" style={{width:'auto',paddingInline:18}} onClick={()=>void previewGift()} disabled={checking||!redeemCode.trim()}>{checking?'Checking…':'Check code'}</button></div>
        {previewData && <div className="nk-gift-preview"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}><div><div className="nk-gift-muted">Gift card value</div><div style={{fontSize:28,fontWeight:900,marginTop:4}}>{money(previewData.amount/100)}</div></div><span className="nk-gift-badge">{previewData.isValid?'VALID GIFT':'NOT REDEEMABLE'}</span></div><div className="nk-gift-row"><span className="nk-gift-muted">From</span><strong style={{fontSize:12}}>{previewData.senderName||'A Nakconel user'}</strong></div><div className="nk-gift-row"><span className="nk-gift-muted">Occasion</span><strong style={{fontSize:12}}>{THEMES[previewData.occasion as Occasion]?.label||'Gift'}</strong></div><div className="nk-gift-row"><span className="nk-gift-muted">Code</span><strong className="nk-gift-code" style={{fontSize:11}}>{previewData.codeMasked}</strong></div>{previewData.message&&<p className="nk-gift-note" style={{margin:'12px 0'}}>“{previewData.message}”</p>}<button className="nk-gift-btn" style={{marginTop:14}} onClick={()=>void redeemGift()} disabled={redeeming||!previewData.isValid||!accountId}>{redeeming?'Redeeming…':'Redeem to my NGN account'}</button></div>}
      </section>}
      {tab==='history' && <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:14}}>
        <section className="nk-gift-panel"><div className="nk-gift-kicker">Rewards programme</div><div style={{fontSize:31,fontWeight:900,color:'var(--maroon)',marginTop:7}}>{giftData?.rewards?.pointsBalance??0}<span style={{fontSize:13,marginLeft:6}}>points</span></div><p className="nk-gift-section-sub" style={{marginTop:5,marginBottom:0}}>Earn 50 points when you redeem a gift card.</p></section>
        <section className="nk-gift-panel"><h2 className="nk-gift-section-title">Gift cards sent</h2>{loadingHistory?<p className="nk-gift-muted">Loading your records…</p>:giftData?.sent?.length?giftData.sent.map((card:any)=><div className="nk-gift-row" key={card.id}><div><strong style={{fontSize:12}}>{money(card.amount/100)}</strong><div className="nk-gift-muted nk-gift-code">{card.codeMasked}</div></div><span className="nk-gift-badge">{card.status}</span></div>):<p className="nk-gift-muted" style={{padding:'18px 0'}}>Your sent gift cards will appear here.</p>}</section>
        <section className="nk-gift-panel"><h2 className="nk-gift-section-title">Gifts redeemed</h2>{giftData?.received?.length?giftData.received.map((item:any)=><div className="nk-gift-row" key={item.id}><div><strong style={{fontSize:12,color:'var(--ok)'}}>+{money(item.amount/100)}</strong><div className="nk-gift-muted">{item.giftCard?.senderName?'From '+item.giftCard.senderName:'Gift card redemption'}</div></div><span className="nk-gift-muted">{new Date(item.createdAt).toLocaleDateString('en-NG')}</span></div>):<p className="nk-gift-muted" style={{padding:'18px 0'}}>Your redeemed gifts will appear here.</p>}</section>
      </div>}
      {showPinModal && <div className="nk-gift-modal" role="dialog" aria-modal="true" aria-label="Confirm gift card purchase"><div className="nk-gift-modal-card"><div className="nk-gift-kicker">Confirm your gift</div><h2 style={{fontSize:21,fontWeight:900,margin:'6px 0'}}>One final check</h2><p className="nk-gift-section-sub">Gift value: <strong>{money(selectedAmount)}</strong>. Confirm only if the details are correct.</p><label className="nk-gift-field">4-digit transaction PIN</label><input className="nk-gift-input" type="password" inputMode="numeric" maxLength={4} autoFocus value={pin} onChange={event=>setPin(event.target.value.replace(/\D/g,'').slice(0,4))} placeholder="••••"/><div style={{display:'flex',gap:8,marginTop:16}}><button className="nk-gift-btn secondary" onClick={()=>{setShowPinModal(false);setPin('')}}>Cancel</button><button className="nk-gift-btn" disabled={sending||pin.length!==4} onClick={()=>void purchaseGift()}>{sending?'Processing…':'Confirm gift'}</button></div></div></div>}
      {issuedCode && <div className="nk-gift-modal" role="dialog" aria-modal="true" aria-label="Gift card created"><div className="nk-gift-modal-card"><div className="nk-gift-kicker">Ready to share</div><h2 style={{fontSize:22,fontWeight:900,margin:'7px 0'}}>Your gift is ready.</h2><p className="nk-gift-section-sub">Share this code with the recipient. Anyone with the code may be able to redeem it, so share it privately.</p><div className="nk-gift-preview" style={{textAlign:'center'}}><div className="nk-gift-muted">Your gift code</div><div className="nk-gift-code" style={{fontSize:19,fontWeight:900,marginTop:8}}>{issuedCode}</div></div><div style={{display:'flex',gap:8,marginTop:16}}><button className="nk-gift-btn secondary" onClick={()=>void copy(issuedCode)}>Copy code</button><button className="nk-gift-btn" onClick={()=>void share(issuedCode)}>Share gift</button></div><button className="nk-gift-btn secondary" style={{marginTop:9}} onClick={()=>{setIssuedCode(null);setTab('history')}}>Done</button></div></div>}
    </div>
  );
}
