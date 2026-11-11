'use client';

import { useState } from 'react';

type Props = {
  userId:          string;
  onToast:         (m: string) => void;
  balanceNgn?:     number;           // current NGN balance in kobo
  activeCurrency?: string;           // e.g. 'NGN', 'USD'
  onSwitchCurrency: (code: string, symbol: string, rate: number, flag: string) => void;
};

/* ── All world currencies with live-ish indicative rates to NGN ── */
const CURRENCIES = [
  /* Africa */
  { code: 'NGN', name: 'Nigerian Naira',       flag: '🇳🇬', symbol: '₦',   rate: 1,        region: 'Africa'  },
  { code: 'GHS', name: 'Ghanaian Cedi',        flag: '🇬🇭', symbol: 'GH₵', rate: 105,      region: 'Africa'  },
  { code: 'KES', name: 'Kenyan Shilling',      flag: '🇰🇪', symbol: 'KSh', rate: 12.5,     region: 'Africa'  },
  { code: 'ZAR', name: 'South African Rand',   flag: '🇿🇦', symbol: 'R',   rate: 92,       region: 'Africa'  },
  { code: 'EGP', name: 'Egyptian Pound',       flag: '🇪🇬', symbol: 'E£',  rate: 50,       region: 'Africa'  },
  { code: 'ETB', name: 'Ethiopian Birr',       flag: '🇪🇹', symbol: 'Br',  rate: 55,       region: 'Africa'  },
  { code: 'UGX', name: 'Ugandan Shilling',     flag: '🇺🇬', symbol: 'USh', rate: 0.44,     region: 'Africa'  },
  { code: 'TZS', name: 'Tanzanian Shilling',   flag: '🇹🇿', symbol: 'TSh', rate: 0.62,     region: 'Africa'  },
  { code: 'RWF', name: 'Rwandan Franc',        flag: '🇷🇼', symbol: 'RF',  rate: 1.15,     region: 'Africa'  },
  { code: 'XOF', name: 'West African CFA',     flag: '🌍',  symbol: 'CFA', rate: 2.55,     region: 'Africa'  },
  /* Americas */
  { code: 'USD', name: 'US Dollar',            flag: '🇺🇸', symbol: '$',   rate: 1650,     region: 'Americas'},
  { code: 'CAD', name: 'Canadian Dollar',      flag: '🇨🇦', symbol: 'C$',  rate: 1210,     region: 'Americas'},
  { code: 'BRL', name: 'Brazilian Real',       flag: '🇧🇷', symbol: 'R$',  rate: 310,      region: 'Americas'},
  { code: 'MXN', name: 'Mexican Peso',         flag: '🇲🇽', symbol: 'MX$', rate: 95,       region: 'Americas'},
  /* Europe */
  { code: 'GBP', name: 'British Pound',        flag: '🇬🇧', symbol: '£',   rate: 2100,     region: 'Europe'  },
  { code: 'EUR', name: 'Euro',                 flag: '🇪🇺', symbol: '€',   rate: 1780,     region: 'Europe'  },
  { code: 'CHF', name: 'Swiss Franc',          flag: '🇨🇭', symbol: 'Fr',  rate: 1850,     region: 'Europe'  },
  { code: 'SEK', name: 'Swedish Krona',        flag: '🇸🇪', symbol: 'kr',  rate: 155,      region: 'Europe'  },
  { code: 'NOK', name: 'Norwegian Krone',      flag: '🇳🇴', symbol: 'kr',  rate: 155,      region: 'Europe'  },
  { code: 'PLN', name: 'Polish Złoty',         flag: '🇵🇱', symbol: 'zł',  rate: 410,      region: 'Europe'  },
  /* Asia */
  { code: 'CNY', name: 'Chinese Yuan',         flag: '🇨🇳', symbol: '¥',   rate: 230,      region: 'Asia'    },
  { code: 'JPY', name: 'Japanese Yen',         flag: '🇯🇵', symbol: '¥',   rate: 11,       region: 'Asia'    },
  { code: 'INR', name: 'Indian Rupee',         flag: '🇮🇳', symbol: '₹',   rate: 20,       region: 'Asia'    },
  { code: 'KRW', name: 'South Korean Won',     flag: '🇰🇷', symbol: '₩',   rate: 1.22,     region: 'Asia'    },
  { code: 'SGD', name: 'Singapore Dollar',     flag: '🇸🇬', symbol: 'S$',  rate: 1230,     region: 'Asia'    },
  { code: 'HKD', name: 'Hong Kong Dollar',     flag: '🇭🇰', symbol: 'HK$', rate: 212,      region: 'Asia'    },
  { code: 'MYR', name: 'Malaysian Ringgit',    flag: '🇲🇾', symbol: 'RM',  rate: 350,      region: 'Asia'    },
  { code: 'IDR', name: 'Indonesian Rupiah',    flag: '🇮🇩', symbol: 'Rp',  rate: 0.105,    region: 'Asia'    },
  { code: 'PHP', name: 'Philippine Peso',      flag: '🇵🇭', symbol: '₱',   rate: 29,       region: 'Asia'    },
  { code: 'THB', name: 'Thai Baht',            flag: '🇹🇭', symbol: '฿',   rate: 46,       region: 'Asia'    },
  /* GCC / Middle East */
  { code: 'AED', name: 'UAE Dirham',           flag: '🇦🇪', symbol: 'AED', rate: 450,      region: 'Middle East'},
  { code: 'SAR', name: 'Saudi Riyal',          flag: '🇸🇦', symbol: 'SR',  rate: 440,      region: 'Middle East'},
  { code: 'QAR', name: 'Qatari Riyal',         flag: '🇶🇦', symbol: 'QR',  rate: 453,      region: 'Middle East'},
  { code: 'KWD', name: 'Kuwaiti Dinar',        flag: '🇰🇼', symbol: 'KD',  rate: 5370,     region: 'Middle East'},
  { code: 'BHD', name: 'Bahraini Dinar',       flag: '🇧🇭', symbol: 'BD',  rate: 4380,     region: 'Middle East'},
  /* Oceania */
  { code: 'AUD', name: 'Australian Dollar',    flag: '🇦🇺', symbol: 'A$',  rate: 1070,     region: 'Oceania' },
  { code: 'NZD', name: 'New Zealand Dollar',   flag: '🇳🇿', symbol: 'NZ$', rate: 980,      region: 'Oceania' },
];

const REGIONS = ['All', 'Africa', 'Americas', 'Europe', 'Asia', 'Middle East', 'Oceania'] as const;

function fmt(kobo: number, rate: number, symbol: string, code: string): string {
  const amount = (kobo / 100) / rate;
  return `${symbol}${amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${code}`;
}

export default function InternationalView({ userId: _userId, onToast, balanceNgn = 0, activeCurrency = 'NGN', onSwitchCurrency }: Props) {
  const [search,    setSearch]    = useState('');
  const [region,    setRegion]    = useState<typeof REGIONS[number]>('All');
  const [confirming, setConfirming] = useState<typeof CURRENCIES[0] | null>(null);

  const filtered = CURRENCIES.filter(c => {
    const matchRegion = region === 'All' || c.region === region;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                        c.code.toLowerCase().includes(search.toLowerCase()) ||
                        c.flag.includes(search);
    return matchRegion && matchSearch;
  });

  const handleSwitch = (c: typeof CURRENCIES[0]) => {
    if (c.code === activeCurrency) {
      onToast(`Already viewing ${c.code}`);
      return;
    }
    setConfirming(c);
  };

  const confirmSwitch = () => {
    if (!confirming) return;
    onSwitchCurrency(confirming.code, confirming.symbol, confirming.rate, confirming.flag);
    onToast(`Account view switched to ${confirming.name} (${confirming.code})`);
    setConfirming(null);
  };

  /* Confirmation modal */
  if (confirming) {
    const converted = balanceNgn > 0
      ? fmt(balanceNgn, confirming.rate, confirming.symbol, confirming.code)
      : `${confirming.symbol}0.00 ${confirming.code}`;
    return (
      <div className="app-page" style={{ maxWidth: 480 }}>
        <button type="button" className="btn-ghost" style={{ marginBottom: 18 }}
          onClick={() => setConfirming(null)}>← Back</button>
        <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{confirming.flag}</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--maroon)', marginBottom: 4 }}>
            Switch to {confirming.name}?
          </h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
            Your balance will be displayed in <strong>{confirming.code}</strong>.<br />
            Your money stays in your NGN wallet — this is a display conversion only.
          </p>
          <div style={{ background: 'linear-gradient(135deg,#4a1015,#731d21)', borderRadius: 16, padding: '20px', marginBottom: 24, border: '1px solid rgba(197,155,68,.4)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,248,233,.6)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Your balance in {confirming.code}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#f2d995', letterSpacing: '-.01em' }}>{converted}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,248,233,.5)', marginTop: 8 }}>
              Rate: 1 {confirming.code} = ₦{confirming.rate.toLocaleString('en')}
            </div>
          </div>
          <div className="btn-row">
            <button type="button" className="btn secondary" onClick={() => setConfirming(null)}>Cancel</button>
            <button type="button" className="btn-gold" onClick={confirmSwitch}>
              Switch to {confirming.code}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page">
      <div className="page-title">Currency View</div>
      <p className="page-sub">Select any currency to view your balance in it. Your NGN wallet is unchanged.</p>

      {/* Active currency banner */}
      <div style={{ background: 'linear-gradient(135deg,#4a1015,#731d21)', borderRadius: 18, padding: '18px 20px', marginBottom: 20, border: '1px solid rgba(197,155,68,.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,248,233,.6)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Currently viewing</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f2d995' }}>
            {CURRENCIES.find(c => c.code === activeCurrency)?.flag ?? '🇳🇬'} {activeCurrency}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,248,233,.55)', marginTop: 2 }}>
            {CURRENCIES.find(c => c.code === activeCurrency)?.name}
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
        <input className="input" placeholder="Search currency or country…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 36 }} />
      </div>

      {/* Region filter */}
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 12, marginBottom: 8, scrollbarWidth: 'none' }}>
        {REGIONS.map(r => (
          <button key={r} type="button"
            onClick={() => setRegion(r)}
            style={{
              flexShrink: 0, padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: region === r ? 'var(--maroon)' : 'var(--surface)',
              color: region === r ? 'var(--cream)' : 'var(--muted)',
              border: region === r ? '1px solid var(--maroon)' : '1px solid var(--border)',
            } as React.CSSProperties}>
            {r}
          </button>
        ))}
      </div>

      {/* Currency list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No currencies found</div>
        )}
        {filtered.map((c, i) => {
          const isActive = c.code === activeCurrency;
          const converted = balanceNgn > 0
            ? fmt(balanceNgn, c.rate, c.symbol, c.code)
            : null;
          return (
            <button key={c.code} type="button"
              onClick={() => handleSwitch(c)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', textAlign: 'left', cursor: 'pointer',
                background: isActive ? 'rgba(101,23,25,.06)' : 'transparent',
                border: 'none',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background .12s',
              }}>
              {/* Flag */}
              <span style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{c.flag}</span>
              {/* Name + code */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{c.code}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
              </div>
              {/* Converted balance */}
              {converted && (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? 'var(--maroon)' : 'var(--ink)' }}>{converted}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>₦{c.rate.toLocaleString()}/{c.code}</div>
                </div>
              )}
              {/* Active badge */}
              {isActive && (
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
        Rates are indicative. Your money remains in your NGN wallet at all times.
      </p>
    </div>
  );
}
