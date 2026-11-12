'use client';

import { useEffect, useState } from 'react';

type Props = {
  userId:          string;
  onToast:         (m: string) => void;
  balanceNgn?:     number;
  activeCurrency?: string;
  onSwitchCurrency: (code: string, symbol: string, rate: number, flag: string) => void;
};

type FxRates = Record<string, number>;

/* ── Static currency metadata (flags, symbols, names, regions) ── */
const CURRENCY_META = [
  { code: 'NGN', name: 'Nigerian Naira',       flag: '🇳🇬', symbol: '₦',   region: 'Africa'      },
  { code: 'GHS', name: 'Ghanaian Cedi',        flag: '🇬🇭', symbol: 'GH₵', region: 'Africa'      },
  { code: 'KES', name: 'Kenyan Shilling',      flag: '🇰🇪', symbol: 'KSh', region: 'Africa'      },
  { code: 'ZAR', name: 'South African Rand',   flag: '🇿🇦', symbol: 'R',   region: 'Africa'      },
  { code: 'EGP', name: 'Egyptian Pound',       flag: '🇪🇬', symbol: 'E£',  region: 'Africa'      },
  { code: 'ETB', name: 'Ethiopian Birr',       flag: '🇪🇹', symbol: 'Br',  region: 'Africa'      },
  { code: 'UGX', name: 'Ugandan Shilling',     flag: '🇺🇬', symbol: 'USh', region: 'Africa'      },
  { code: 'TZS', name: 'Tanzanian Shilling',   flag: '🇹🇿', symbol: 'TSh', region: 'Africa'      },
  { code: 'RWF', name: 'Rwandan Franc',        flag: '🇷🇼', symbol: 'RF',  region: 'Africa'      },
  { code: 'XOF', name: 'West African CFA',     flag: '🌍',  symbol: 'CFA', region: 'Africa'      },
  { code: 'USD', name: 'US Dollar',            flag: '🇺🇸', symbol: '$',   region: 'Americas'    },
  { code: 'CAD', name: 'Canadian Dollar',      flag: '🇨🇦', symbol: 'C$',  region: 'Americas'    },
  { code: 'BRL', name: 'Brazilian Real',       flag: '🇧🇷', symbol: 'R$',  region: 'Americas'    },
  { code: 'MXN', name: 'Mexican Peso',         flag: '🇲🇽', symbol: 'MX$', region: 'Americas'    },
  { code: 'GBP', name: 'British Pound',        flag: '🇬🇧', symbol: '£',   region: 'Europe'      },
  { code: 'EUR', name: 'Euro',                 flag: '🇪🇺', symbol: '€',   region: 'Europe'      },
  { code: 'CHF', name: 'Swiss Franc',          flag: '🇨🇭', symbol: 'Fr',  region: 'Europe'      },
  { code: 'SEK', name: 'Swedish Krona',        flag: '🇸🇪', symbol: 'kr',  region: 'Europe'      },
  { code: 'NOK', name: 'Norwegian Krone',      flag: '🇳🇴', symbol: 'kr',  region: 'Europe'      },
  { code: 'PLN', name: 'Polish Złoty',         flag: '🇵🇱', symbol: 'zł',  region: 'Europe'      },
  { code: 'CNY', name: 'Chinese Yuan',         flag: '🇨🇳', symbol: '¥',   region: 'Asia'        },
  { code: 'JPY', name: 'Japanese Yen',         flag: '🇯🇵', symbol: '¥',   region: 'Asia'        },
  { code: 'INR', name: 'Indian Rupee',         flag: '🇮🇳', symbol: '₹',   region: 'Asia'        },
  { code: 'KRW', name: 'South Korean Won',     flag: '🇰🇷', symbol: '₩',   region: 'Asia'        },
  { code: 'SGD', name: 'Singapore Dollar',     flag: '🇸🇬', symbol: 'S$',  region: 'Asia'        },
  { code: 'HKD', name: 'Hong Kong Dollar',     flag: '🇭🇰', symbol: 'HK$', region: 'Asia'        },
  { code: 'MYR', name: 'Malaysian Ringgit',    flag: '🇲🇾', symbol: 'RM',  region: 'Asia'        },
  { code: 'IDR', name: 'Indonesian Rupiah',    flag: '🇮🇩', symbol: 'Rp',  region: 'Asia'        },
  { code: 'PHP', name: 'Philippine Peso',      flag: '🇵🇭', symbol: '₱',   region: 'Asia'        },
  { code: 'THB', name: 'Thai Baht',            flag: '🇹🇭', symbol: '฿',   region: 'Asia'        },
  { code: 'AED', name: 'UAE Dirham',           flag: '🇦🇪', symbol: 'AED', region: 'Middle East' },
  { code: 'SAR', name: 'Saudi Riyal',          flag: '🇸🇦', symbol: 'SR',  region: 'Middle East' },
  { code: 'QAR', name: 'Qatari Riyal',         flag: '🇶🇦', symbol: 'QR',  region: 'Middle East' },
  { code: 'KWD', name: 'Kuwaiti Dinar',        flag: '🇰🇼', symbol: 'KD',  region: 'Middle East' },
  { code: 'BHD', name: 'Bahraini Dinar',       flag: '🇧🇭', symbol: 'BD',  region: 'Middle East' },
  { code: 'AUD', name: 'Australian Dollar',    flag: '🇦🇺', symbol: 'A$',  region: 'Oceania'     },
  { code: 'NZD', name: 'New Zealand Dollar',   flag: '🇳🇿', symbol: 'NZ$', region: 'Oceania'     },
] as const;

type CurrencyCode = typeof CURRENCY_META[number]['code'];
const REGIONS = ['All', 'Africa', 'Americas', 'Europe', 'Asia', 'Middle East', 'Oceania'] as const;

function fmt(kobo: number, rate: number, symbol: string, code: string): string {
  const amount = (kobo / 100) / rate;
  return `${symbol}${amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${code}`;
}

export default function InternationalView({ userId: _userId, onToast, balanceNgn = 0, activeCurrency = 'NGN', onSwitchCurrency }: Props) {
  const [search,   setSearch]   = useState('');
  const [region,   setRegion]   = useState<typeof REGIONS[number]>('All');
  const [rates,    setRates]    = useState<FxRates>({});
  const [live,     setLive]     = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  /* Fetch live rates on mount */
  useEffect(() => {
    fetch('/api/v1/fx')
      .then(r => r.json())
      .then((j: { success: boolean; data: { rates: FxRates; live: boolean; fetchedAt: number } }) => {
        if (j.success) {
          setRates(j.data.rates);
          setLive(j.data.live);
          setLastUpdate(new Date(j.data.fetchedAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }));
        }
      })
      .catch(() => onToast('Using estimated exchange rates'))
      .finally(() => setLoading(false));
  }, [onToast]);

  const getRate = (code: string): number => rates[code] ?? 1;

  const currencies = CURRENCY_META.map(c => ({ ...c, rate: getRate(c.code) }));

  const filtered = currencies.filter(c => {
    const matchRegion  = region === 'All' || c.region === region;
    const matchSearch  = c.name.toLowerCase().includes(search.toLowerCase()) ||
                         c.code.toLowerCase().includes(search.toLowerCase());
    return matchRegion && matchSearch;
  });

  const handleSwitch = (c: typeof currencies[0]) => {
    if (c.code === activeCurrency) { onToast(`Already viewing ${c.code}`); return; }
    onSwitchCurrency(c.code, c.symbol, c.rate, c.flag);
    onToast(`Switched to ${c.name} (${c.code})`);
  };

  return (
    <div className="app-page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <div className="page-title">Currency View</div>
          <p className="page-sub">Tap any currency to view your balance in it.</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: loading ? 'var(--muted)' : live ? 'var(--ok)' : '#a07820', fontWeight: 700 }}>
            {loading ? 'Loading rates…' : live ? `● Live rates · ${lastUpdate}` : '◎ Estimated rates'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>NGN base</div>
        </div>
      </div>

      {/* Active currency banner */}
      <div style={{ background: 'linear-gradient(135deg,#4a1015,#731d21)', borderRadius: 18, padding: '18px 20px', marginBottom: 20, border: '1px solid rgba(197,155,68,.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,248,233,.6)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Currently viewing</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f2d995' }}>
            {currencies.find(c => c.code === activeCurrency)?.flag ?? '🇳🇬'} {activeCurrency}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,248,233,.55)', marginTop: 2 }}>
            {currencies.find(c => c.code === activeCurrency)?.name}
          </div>
        </div>
        {activeCurrency !== 'NGN' && (
          <button type="button" className="btn-ghost" style={{ color: 'var(--maroon)', fontSize: 12 }}
            onClick={() => { onSwitchCurrency('NGN', '₦', 1, '🇳🇬'); onToast('Switched back to NGN'); }}>
            Reset to NGN
          </button>
        )}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 14 }}>🔍</span>
        <input className="input" placeholder="Search currency…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
      </div>

      {/* Region filters */}
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 12, marginBottom: 8, scrollbarWidth: 'none' }}>
        {REGIONS.map(r => (
          <button key={r} type="button" onClick={() => setRegion(r)}
            style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: region === r ? 'var(--maroon)' : 'var(--surface)',
              color: region === r ? 'var(--cream)' : 'var(--muted)',
              border: region === r ? '1px solid var(--maroon)' : '1px solid var(--border)',
            }}>
            {r}
          </button>
        ))}
      </div>

      {/* Currency list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading live rates…</div>}
        {!loading && filtered.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No currencies found</div>}
        {!loading && filtered.map((c, i) => {
          const isActive  = c.code === activeCurrency;
          const converted = balanceNgn > 0 ? fmt(balanceNgn, c.rate, c.symbol, c.code) : null;
          return (
            <button key={c.code} type="button" onClick={() => handleSwitch(c)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', textAlign: 'left', cursor: 'pointer',
                background: isActive ? 'rgba(101,23,25,.06)' : 'transparent',
                border: 'none',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background .12s',
              }}>
              <span style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{c.flag}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{c.code}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
              </div>
              {converted && (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? 'var(--maroon)' : 'var(--ink)' }}>{converted}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>₦{c.rate.toLocaleString('en', { maximumFractionDigits: 2 })}/{c.code}</div>
                </div>
              )}
              {isActive && (
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
        {live ? 'Rates are live from open.er-api.com · updated hourly.' : 'Using estimated rates. Live rates will load on next refresh.'}<br/>
        Your money stays in your NGN wallet at all times.
      </p>
    </div>
  );
}
