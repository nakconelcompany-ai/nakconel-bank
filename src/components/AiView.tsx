'use client';
import React, { useState, useEffect, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────
interface FinancialInsights {
  balanceNgn: number;
  totalSpentNgn: number;
  transactionCount: number;
  insights: string[];
  recommendations: string[];
}

interface ForecastData {
  hasBusiness: boolean;
  businessName?: string;
  healthStatus?: 'HEALTHY' | 'STABLE' | 'ATTENTION_NEEDED';
  metrics?: {
    totalInvoicedNgn: number;
    unpaidReceivablesNgn: number;
    overdueReceivablesNgn: number;
    totalExpensesNgn: number;
    projected30DayNetCashFlowNgn: number;
    projected60DayNetCashFlowNgn: number;
  };
  aiForecastNotes?: string[];
  message?: string;
}

interface FxRec {
  corridor: string;
  rate: number;
  marketSignal: string;
  spreadGrade: string;
  advice: string;
}

interface FxData {
  updatedAt: string;
  recommendations: FxRec[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const signalColor: Record<string, string> = {
  BULLISH: 'text-green-400',
  FAVORABLE: 'text-green-400',
  NEUTRAL: 'text-yellow-400',
  STABLE: 'text-blue-400',
};

const gradeColor: Record<string, string> = {
  'A+': 'bg-green-500',
  A: 'bg-emerald-500',
  'B+': 'bg-teal-500',
  B: 'bg-yellow-500',
};

const healthColor: Record<string, string> = {
  HEALTHY: 'text-green-400',
  STABLE: 'text-yellow-400',
  ATTENTION_NEEDED: 'text-red-400',
};

type Tab = 'insights' | 'forecast' | 'fx' | 'support';

// ─── Component ───────────────────────────────────────────────────────────────
export default function AiView() {
  const [tab, setTab] = useState<Tab>('insights');

  // Insights
  const [insights, setInsights] = useState<FinancialInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Forecast
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  // FX
  const [fxData, setFxData] = useState<FxData | null>(null);
  const [fxLoading, setFxLoading] = useState(false);

  // Support
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportResult, setSupportResult] = useState<{ response: string; ticketId: string; status: string } | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportError, setSupportError] = useState('');

  const loadInsights = useCallback(async () => {
    if (insights) return;
    setInsightsLoading(true);
    try {
      const res = await fetch('/api/v1/ai/insights');
      if (!res.ok) throw new Error('Failed to load');
      setInsights(await res.json());
    } catch {
      // silent fail — user sees empty state
    } finally {
      setInsightsLoading(false);
    }
  }, [insights]);

  const loadForecast = useCallback(async () => {
    if (forecast) return;
    setForecastLoading(true);
    try {
      const res = await fetch('/api/v1/ai/forecast');
      if (!res.ok) throw new Error('Failed to load');
      setForecast(await res.json());
    } catch {
    } finally {
      setForecastLoading(false);
    }
  }, [forecast]);

  const loadFx = useCallback(async () => {
    if (fxData) return;
    setFxLoading(true);
    try {
      const res = await fetch('/api/v1/ai/fx');
      if (!res.ok) throw new Error('Failed to load');
      setFxData(await res.json());
    } catch {
    } finally {
      setFxLoading(false);
    }
  }, [fxData]);

  useEffect(() => {
    if (tab === 'insights') loadInsights();
    if (tab === 'forecast') loadForecast();
    if (tab === 'fx') loadFx();
  }, [tab, loadInsights, loadForecast, loadFx]);

  const handleSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportError('');
    setSupportResult(null);
    if (!supportSubject.trim() || !supportMessage.trim()) {
      setSupportError('Subject and message are required.');
      return;
    }
    setSupportLoading(true);
    try {
      const res = await fetch('/api/v1/ai/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: supportSubject, message: supportMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setSupportResult(data);
      setSupportSubject('');
      setSupportMessage('');
    } catch (err: any) {
      setSupportError(err.message);
    } finally {
      setSupportLoading(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'insights', label: 'Financial Insights', icon: '📊' },
    { id: 'forecast', label: 'Business Forecast', icon: '📈' },
    { id: 'fx', label: 'FX Advisor', icon: '💱' },
    { id: 'support', label: 'AI Support', icon: '🤖' },
  ];

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">Nakconel AI</h2>
        <p className="text-sm text-gray-400">
          Your intelligent banking assistant — insights, forecasts, FX advisory, and support.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Financial Insights ───────────────────────────────────────── */}
      {tab === 'insights' && (
        <div>
          {insightsLoading ? (
            <LoadingCard label="Analysing your spending patterns…" />
          ) : insights ? (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Account Balance" value={fmt(insights.balanceNgn)} color="text-green-400" />
                <StatCard label="30-day Spend" value={fmt(insights.totalSpentNgn)} color="text-red-400" />
              </div>
              <StatCard label="Transfers Completed (30 days)" value={String(insights.transactionCount)} color="text-blue-400" />

              {/* AI Insights */}
              <SectionCard title="🧠 AI Analysis">
                <ul className="space-y-2">
                  {insights.insights.map((s, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2">
                      <span className="text-indigo-400 mt-0.5">•</span> {s}
                    </li>
                  ))}
                </ul>
              </SectionCard>

              {/* Recommendations */}
              {insights.recommendations.length > 0 && (
                <SectionCard title="💡 Recommendations">
                  <ul className="space-y-2">
                    {insights.recommendations.map((r, i) => (
                      <li key={i} className="text-sm text-gray-300 flex gap-2">
                        <span className="text-yellow-400 mt-0.5">→</span> {r}
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}
            </div>
          ) : (
            <EmptyState icon="📊" label="No spending data available yet. Make your first transfer to activate AI insights." />
          )}
        </div>
      )}

      {/* ── Tab: Business Cash-Flow Forecast ─────────────────────────────── */}
      {tab === 'forecast' && (
        <div>
          {forecastLoading ? (
            <LoadingCard label="Building your 90-day cash-flow forecast…" />
          ) : forecast ? (
            forecast.hasBusiness && forecast.metrics ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">{forecast.businessName}</h3>
                  <span className={`text-sm font-medium ${healthColor[forecast.healthStatus!] ?? 'text-gray-400'}`}>
                    {forecast.healthStatus?.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <StatCard label="Total Invoiced" value={fmt(forecast.metrics.totalInvoicedNgn)} color="text-blue-400" />
                  <StatCard label="Unpaid Receivables" value={fmt(forecast.metrics.unpaidReceivablesNgn)} color="text-yellow-400" />
                  <StatCard label="Overdue" value={fmt(forecast.metrics.overdueReceivablesNgn)} color="text-red-400" />
                  <StatCard label="Total Expenses" value={fmt(forecast.metrics.totalExpensesNgn)} color="text-orange-400" />
                </div>

                <SectionCard title="📅 Cash-Flow Projections">
                  <div className="space-y-3">
                    <ProjectionRow label="30-Day Net" value={forecast.metrics.projected30DayNetCashFlowNgn} />
                    <ProjectionRow label="60-Day Net" value={forecast.metrics.projected60DayNetCashFlowNgn} />
                  </div>
                </SectionCard>

                {forecast.aiForecastNotes && forecast.aiForecastNotes.length > 0 && (
                  <SectionCard title="🤖 AI Forecast Notes">
                    <ul className="space-y-2">
                      {forecast.aiForecastNotes.map((n, i) => (
                        <li key={i} className="text-sm text-gray-300 flex gap-2">
                          <span className="text-indigo-400 mt-0.5">•</span> {n}
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                )}
              </div>
            ) : (
              <EmptyState icon="📈" label={forecast.message ?? 'Create a business profile to unlock AI cash-flow forecasting.'} />
            )
          ) : null}
        </div>
      )}

      {/* ── Tab: FX Advisor ───────────────────────────────────────────────── */}
      {tab === 'fx' && (
        <div>
          {fxLoading ? (
            <LoadingCard label="Loading FX corridor analysis…" />
          ) : fxData ? (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                Reference rates as of {new Date(fxData.updatedAt).toLocaleTimeString()}. For live execution rates, use the International Transfers tab.
              </p>
              {fxData.recommendations.map((rec, i) => (
                <div key={i} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{rec.corridor}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full text-white ${gradeColor[rec.spreadGrade] ?? 'bg-gray-600'}`}>
                        {rec.spreadGrade}
                      </span>
                      <span className={`text-xs font-medium ${signalColor[rec.marketSignal] ?? 'text-gray-400'}`}>
                        {rec.marketSignal}
                      </span>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-indigo-300">
                    1 unit = ₦{rec.rate.toLocaleString()}
                  </div>
                  <p className="text-sm text-gray-400">{rec.advice}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="💱" label="FX data unavailable. Please try again shortly." />
          )}
        </div>
      )}

      {/* ── Tab: AI Support ───────────────────────────────────────────────── */}
      {tab === 'support' && (
        <div className="space-y-4">
          {supportResult ? (
            <div className="bg-indigo-900/40 border border-indigo-500/40 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                <div>
                  <p className="text-sm font-semibold text-indigo-300">Nakconel AI Support</p>
                  <p className="text-xs text-gray-500">Ticket #{supportResult.ticketId.slice(0, 8)} · {supportResult.status}</p>
                </div>
              </div>
              <p className="text-sm text-gray-200 leading-relaxed">{supportResult.response}</p>
              <button
                onClick={() => setSupportResult(null)}
                className="text-xs text-indigo-400 hover:underline"
              >
                Ask another question →
              </button>
            </div>
          ) : (
            <form onSubmit={handleSupport} className="space-y-4">
              <SectionCard title="🤖 AI Customer Support">
                <p className="text-xs text-gray-400 mb-4">
                  Describe your issue and our AI will instantly resolve common queries or escalate to our banking operations desk.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Subject</label>
                    <input
                      type="text"
                      value={supportSubject}
                      onChange={e => setSupportSubject(e.target.value)}
                      placeholder="e.g. Transfer not received"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Message</label>
                    <textarea
                      rows={4}
                      value={supportMessage}
                      onChange={e => setSupportMessage(e.target.value)}
                      placeholder="Tell us what happened…"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
                      maxLength={500}
                    />
                  </div>
                  {supportError && (
                    <p className="text-red-400 text-xs">{supportError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={supportLoading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {supportLoading ? 'Connecting to AI…' : 'Submit to AI Support'}
                  </button>
                </div>
              </SectionCard>
            </form>
          )}

          {/* Quick topics */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Common topics</p>
            <div className="flex flex-wrap gap-2">
              {['Transfer delay', 'Gift card redeem', 'KYC limit', 'Reset PIN', 'FX payment'].map(topic => (
                <button
                  key={topic}
                  onClick={() => { setSupportSubject(topic); setSupportResult(null); }}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full transition-colors"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
      <p className="text-sm font-semibold text-white mb-3">{title}</p>
      {children}
    </div>
  );
}

function ProjectionRow({ label, value }: { label: string; value: number }) {
  const isPositive = value >= 0;
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{fmt(value)}
      </span>
    </div>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}

function EmptyState({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="text-sm text-gray-400 max-w-xs">{label}</p>
    </div>
  );
}
