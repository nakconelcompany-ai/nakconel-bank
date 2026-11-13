'use client';

import React, { KeyboardEvent, useEffect, useRef, useState } from 'react';

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; time: Date };
type Insights = { balanceNgn: number; totalSpentNgn: number; transactionCount: number; insights: string[]; recommendations: string[] };
type Forecast = { hasBusiness: boolean; businessName?: string; message?: string; metrics?: { totalInvoicedNgn: number; unpaidReceivablesNgn: number; overdueReceivablesNgn: number; totalExpensesNgn: number; projected30DayNetCashFlowNgn: number; projected60DayNetCashFlowNgn: number }; aiForecastNotes?: string[] };
type Fx = { updatedAt: string; recommendations: Array<{ corridor: string; rate: number; marketSignal: string; spreadGrade: string; advice: string }> };

const money = (value: number) => '₦' + value.toLocaleString('en-NG', { maximumFractionDigits: 2 });
const suggestions = [
  { label: 'My balance', prompt: 'What is my current balance?', icon: '◉' },
  { label: 'Spending', prompt: 'How much did I spend in the last 30 days?', icon: '↗' },
  { label: 'Recent transfers', prompt: 'Show my recent transactions', icon: '⇄' },
  { label: 'Make a budget', prompt: 'Help me make a monthly budget', icon: '▤' },
  { label: 'Business cash flow', prompt: 'Explain my business cash flow', icon: '▥' },
  { label: 'Gift cards', prompt: 'How do Nakconel Gift cards work?', icon: '◇' },
];

export default function AiView() {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    role: 'assistant',
    content: 'Hello. I’m Nakconel AI, your banking companion. Ask me about your balance, spending, transfers, budgeting, business cash flow, Gift or currency information. I’ll use the information available in your signed-in Nakconel account.',
    time: new Date(),
  }]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [activePanel, setActivePanel] = useState<'chat' | 'insights' | 'forecast' | 'fx'>('chat');
  const [insights, setInsights] = useState<Insights | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [fx, setFx] = useState<Fx | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);

  useEffect(() => {
    if (activePanel === 'chat') return;
    let alive = true;
    setPanelLoading(true);
    setPanelError('');
    const endpoint = activePanel === 'insights' ? '/api/v1/ai/insights' : activePanel === 'forecast' ? '/api/v1/ai/forecast' : '/api/v1/ai/fx';
    fetch(endpoint).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load this information.');
      if (!alive) return;
      if (activePanel === 'insights') setInsights(data);
      if (activePanel === 'forecast') setForecast(data);
      if (activePanel === 'fx') setFx(data);
    }).catch(error => { if (alive) setPanelError(error instanceof Error ? error.message : 'Something went wrong.'); })
      .finally(() => { if (alive) setPanelLoading(false); });
    return () => { alive = false; };
  }, [activePanel]);

  async function sendMessage(value = draft) {
    const text = value.trim();
    if (!text || sending) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text, time: new Date() };
    setMessages(current => [...current, userMessage]);
    setDraft('');
    setSending(true);
    try {
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Nakconel AI could not respond.');
      setMessages(current => [...current, { id: crypto.randomUUID(), role: 'assistant', content: data.reply, time: new Date() }]);
    } catch (error) {
      setMessages(current => [...current, { id: crypto.randomUUID(), role: 'assistant', content: error instanceof Error ? error.message : 'Please try again in a moment.', time: new Date() }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); }
  }

  const nav = [
    { id: 'chat' as const, label: 'AI Chat', icon: '✳' },
    { id: 'insights' as const, label: 'Insights', icon: '▥' },
    { id: 'forecast' as const, label: 'Cash flow', icon: '↗' },
    { id: 'fx' as const, label: 'FX guide', icon: '⇄' },
  ];

  return (
    <div className="nk-ai-page">
      <style>{`
        .nk-ai-page{max-width:1120px;margin:0 auto;color:var(--ink)}
        .nk-ai-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px}
        .nk-ai-kicker{font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--gold)}
        .nk-ai-title{font-size:clamp(24px,4vw,32px);font-weight:800;letter-spacing:-.04em;margin:5px 0}
        .nk-ai-sub{font-size:13px;color:var(--muted);line-height:1.6;max-width:560px}
        .nk-ai-status{display:flex;align-items:center;gap:7px;border:1px solid var(--border);background:var(--surface);border-radius:999px;padding:8px 11px;font-size:11px;color:var(--muted);white-space:nowrap}
        .nk-ai-dot{width:7px;height:7px;border-radius:50%;background:#28774e}
        .nk-ai-layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:16px;align-items:stretch}
        .nk-ai-side{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:12px;height:max-content}
        .nk-ai-side-label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:800;padding:8px 10px}
        .nk-ai-nav{display:flex;align-items:center;gap:10px;width:100%;padding:11px 12px;border:0;border-radius:11px;background:transparent;color:var(--muted);font-size:12px;font-weight:700;text-align:left;cursor:pointer;margin:2px 0}
        .nk-ai-nav.active{background:rgba(101,23,25,.09);color:var(--maroon)}
        .nk-ai-nav-icon{display:grid;place-items:center;width:27px;height:27px;border-radius:8px;background:var(--surface-soft);font-size:15px}
        .nk-ai-note{border-top:1px solid var(--border);margin-top:12px;padding:13px 9px 5px;font-size:10px;line-height:1.6;color:var(--muted)}
        .nk-ai-main{min-width:0}
        .nk-ai-chat{height:min(650px,calc(100dvh - 235px));min-height:490px;display:flex;flex-direction:column;border:1px solid var(--border);border-radius:20px;background:var(--surface);overflow:hidden;box-shadow:0 8px 30px rgba(62,12,17,.045)}
        .nk-ai-chatbar{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px}
        .nk-ai-agent{display:flex;align-items:center;gap:10px;min-width:0}
        .nk-ai-mark{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:var(--maroon);color:#fff8e9;font-size:20px;font-weight:800}
        .nk-ai-agent strong{display:block;font-size:13px}.nk-ai-agent small{display:block;color:var(--muted);font-size:10px;margin-top:3px}
        .nk-ai-secure{font-size:10px;color:var(--muted);white-space:nowrap}
        .nk-ai-messages{flex:1;overflow:auto;padding:20px;display:flex;flex-direction:column;gap:16px}
        .nk-ai-msg{display:flex;gap:9px;max-width:88%;align-items:flex-start}
        .nk-ai-msg.user{align-self:flex-end;flex-direction:row-reverse}
        .nk-ai-avatar{width:27px;height:27px;flex:0 0 27px;border-radius:9px;display:grid;place-items:center;background:var(--surface-soft);color:var(--maroon);font-size:12px;font-weight:800}
        .nk-ai-msg.user .nk-ai-avatar{background:var(--maroon);color:#fff}
        .nk-ai-bubble{padding:12px 14px;border-radius:4px 15px 15px 15px;background:var(--surface-soft);font-size:12px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere}
        .nk-ai-msg.user .nk-ai-bubble{background:var(--maroon);color:#fff8e9;border-radius:15px 4px 15px 15px}
        .nk-ai-time{font-size:9px;color:var(--muted);margin-top:5px;padding:0 3px}
        .nk-ai-msg.user .nk-ai-time{text-align:right}
        .nk-ai-typing{font-size:11px;color:var(--muted);padding:4px 0}
        .nk-ai-suggestions{padding:0 18px 14px;display:flex;gap:7px;flex-wrap:wrap}
        .nk-ai-chip{border:1px solid var(--border);background:var(--surface);color:var(--ink);border-radius:999px;padding:8px 11px;font-size:10px;font-weight:700;cursor:pointer}
        .nk-ai-chip:hover{border-color:var(--gold);color:var(--maroon)}
        .nk-ai-compose{padding:13px 16px 15px;border-top:1px solid var(--border);background:var(--surface)}
        .nk-ai-composebox{display:flex;gap:9px;align-items:flex-end;border:1px solid var(--border);border-radius:14px;padding:8px 8px 8px 13px;background:var(--bg)}
        .nk-ai-composebox textarea{flex:1;min-width:0;resize:none;border:0;outline:0;background:transparent;color:var(--ink);font:inherit;font-size:13px;line-height:1.5;max-height:110px;padding:7px 0}
        .nk-ai-send{width:38px;height:38px;flex:0 0 38px;border:0;border-radius:11px;background:var(--maroon);color:#fff8e9;font-size:17px;cursor:pointer}
        .nk-ai-send:disabled{opacity:.45;cursor:not-allowed}
        .nk-ai-disclaimer{text-align:center;font-size:9px;color:var(--muted);margin-top:8px}
        .nk-ai-panel{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:20px}
        .nk-ai-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:16px 0}
        .nk-ai-stat{background:var(--surface-soft);border:1px solid var(--border);border-radius:14px;padding:15px;min-width:0}
        .nk-ai-stat small{display:block;color:var(--muted);font-size:10px}.nk-ai-stat strong{display:block;font-size:18px;margin-top:7px;overflow-wrap:anywhere}
        .nk-ai-list{padding-left:18px;color:var(--muted);font-size:12px;line-height:1.8}
        .nk-ai-empty{padding:40px 15px;text-align:center;color:var(--muted);font-size:12px}
        .nk-ai-error{color:var(--danger);font-size:12px;padding:14px}
        @media(max-width:760px){.nk-ai-layout{grid-template-columns:1fr}.nk-ai-side{display:flex;overflow:auto;gap:4px;padding:7px}.nk-ai-side-label,.nk-ai-note{display:none}.nk-ai-nav{width:auto;flex:0 0 auto;padding:9px 11px}.nk-ai-nav-icon{display:none}.nk-ai-chat{height:calc(100dvh - 275px);min-height:440px}.nk-ai-msg{max-width:96%}.nk-ai-head{align-items:center}.nk-ai-status{font-size:0;padding:9px}.nk-ai-status .nk-ai-dot{width:8px;height:8px}}
        @media(max-width:420px){.nk-ai-grid{grid-template-columns:1fr}.nk-ai-messages{padding:14px}.nk-ai-suggestions{padding-inline:12px}.nk-ai-chip{font-size:9px}}
      `}</style>

      <header className="nk-ai-head">
        <div>
          <div className="nk-ai-kicker">Nakconel intelligence</div>
          <h1 className="nk-ai-title">Your money, understood.</h1>
          <p className="nk-ai-sub">A clearer view of your finances, with an assistant ready to help you make sense of your Nakconel activity.</p>
        </div>
        <div className="nk-ai-status"><span className="nk-ai-dot" /> Account connected</div>
      </header>

      <div className="nk-ai-layout">
        <aside className="nk-ai-side">
          <div className="nk-ai-side-label">Workspace</div>
          {nav.map(item => <button key={item.id} className={`nk-ai-nav ${activePanel === item.id ? 'active' : ''}`} onClick={() => setActivePanel(item.id)}>
            <span className="nk-ai-nav-icon">{item.icon}</span>{item.label}
          </button>)}
          <div className="nk-ai-note">Your chat uses information available to your signed-in Nakconel account. Never share your PIN, OTP, BVN or NIN in a chat.</div>
        </aside>

        <main className="nk-ai-main">
          {activePanel === 'chat' ? <section className="nk-ai-chat">
            <div className="nk-ai-chatbar">
              <div className="nk-ai-agent"><div className="nk-ai-mark">✳</div><div><strong>Nakconel Assistant</strong><small>Personal finance & banking help</small></div></div>
              <span className="nk-ai-secure">Private account session</span>
            </div>
            <div className="nk-ai-messages" aria-live="polite">
              {messages.map(message => <article key={message.id} className={`nk-ai-msg ${message.role}`}>
                <div className="nk-ai-avatar">{message.role === 'assistant' ? 'N' : 'You'}</div>
                <div><div className="nk-ai-bubble">{message.content}</div><div className="nk-ai-time">{message.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div>
              </article>)}
              {sending && <div className="nk-ai-typing">Nakconel AI is preparing a response…</div>}
              <div ref={bottomRef} />
            </div>
            {messages.length <= 1 && <div className="nk-ai-suggestions">{suggestions.map(item => <button className="nk-ai-chip" key={item.label} onClick={() => void sendMessage(item.prompt)}>{item.icon} &nbsp;{item.label}</button>)}</div>}
            <div className="nk-ai-compose">
              <div className="nk-ai-composebox">
                <textarea ref={inputRef} rows={1} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={onKeyDown} placeholder="Ask anything about your Nakconel money…" aria-label="Message Nakconel AI" />
                <button className="nk-ai-send" disabled={!draft.trim() || sending} onClick={() => void sendMessage()} aria-label="Send message">↑</button>
              </div>
              <div className="nk-ai-disclaimer">Enter to send · Shift + Enter for a new line · Financial information is explanatory, not financial advice.</div>
            </div>
          </section> : <section className="nk-ai-panel">
            <div className="nk-ai-kicker">Your financial overview</div>
            <h2 style={{fontSize:22,fontWeight:800,marginTop:5}}>{activePanel === 'insights' ? 'Spending insights' : activePanel === 'forecast' ? 'Business cash flow' : 'Currency guidance'}</h2>
            {panelLoading ? <div className="nk-ai-empty">Loading your information…</div> : panelError ? <div className="nk-ai-error">{panelError}</div> : <>
              {activePanel === 'insights' && insights && <>
                <div className="nk-ai-grid"><div className="nk-ai-stat"><small>Current NGN balance</small><strong>{money(insights.balanceNgn)}</strong></div><div className="nk-ai-stat"><small>Completed transfer spend · 30 days</small><strong>{money(insights.totalSpentNgn)}</strong></div><div className="nk-ai-stat"><small>Completed transfers</small><strong>{insights.transactionCount}</strong></div></div>
                <h3 style={{fontSize:13,fontWeight:800,marginBottom:8}}>What we noticed</h3><ul className="nk-ai-list">{insights.insights.map((line,index)=><li key={index}>{line}</li>)}</ul>
                {insights.recommendations.length>0 && <><h3 style={{fontSize:13,fontWeight:800,margin:'18px 0 8px'}}>Ideas to consider</h3><ul className="nk-ai-list">{insights.recommendations.map((line,index)=><li key={index}>{line}</li>)}</ul></>}
              </>}
              {activePanel === 'forecast' && forecast && (forecast.hasBusiness && forecast.metrics ? <>
                <p className="nk-ai-sub" style={{marginTop:8}}>{forecast.businessName} · modelled from saved business records</p>
                <div className="nk-ai-grid">{[['Total invoiced',forecast.metrics.totalInvoicedNgn],['Unpaid receivables',forecast.metrics.unpaidReceivablesNgn],['Overdue receivables',forecast.metrics.overdueReceivablesNgn],['Recorded expenses',forecast.metrics.totalExpensesNgn],['30-day projected net',forecast.metrics.projected30DayNetCashFlowNgn],['60-day projected net',forecast.metrics.projected60DayNetCashFlowNgn]].map(([label,value])=><div className="nk-ai-stat" key={String(label)}><small>{label}</small><strong>{money(Number(value))}</strong></div>)}</div>
                <ul className="nk-ai-list">{(forecast.aiForecastNotes ?? []).map((line,index)=><li key={index}>{line}</li>)}</ul>
              </> : <div className="nk-ai-empty">{forecast?.message ?? 'No business cash-flow data is available yet.'}</div>)}
              {activePanel === 'fx' && fx && <>
                <p className="nk-ai-sub" style={{marginTop:8}}>Indicative reference information · updated {new Date(fx.updatedAt).toLocaleString()}</p>
                <div className="nk-ai-grid">{fx.recommendations.map(item=><div className="nk-ai-stat" key={item.corridor}><small>{item.corridor} · {item.marketSignal}</small><strong>{money(item.rate)}</strong><p style={{fontSize:11,color:'var(--muted)',lineHeight:1.6,marginTop:7}}>{item.advice}</p></div>)}</div>
                <p style={{fontSize:11,color:'var(--muted)',lineHeight:1.6}}>These are indicative reference rates, not executable customer quotes or an instruction to make a currency transaction.</p>
              </>}
            </>}
          </section>}
        </main>
      </div>
    </div>
  );
}
