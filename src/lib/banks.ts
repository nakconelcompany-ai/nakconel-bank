/** Nigerian banks + fintech wallets for transfers (demo list). */

export type Bank = {
  code:    string;
  name:    string;
  short:   string;
  color:   string;
  flag?:   string;   // emoji flag for international banks
  country: string;   // ISO country code e.g. 'NG', 'US', 'GB'
};

/* ── Nigerian banks ── */
export const NG_BANKS: Bank[] = [
  { code: '058', name: 'GTBank',         short: 'GT',   color: '#E35205', country: 'NG' },
  { code: '033', name: 'UBA',            short: 'UBA',  color: '#D32F2F', country: 'NG' },
  { code: '011', name: 'First Bank',     short: 'FBN',  color: '#003B70', country: 'NG' },
  { code: '057', name: 'Zenith Bank',    short: 'ZEN',  color: '#ED1C24', country: 'NG' },
  { code: '032', name: 'Union Bank',     short: 'UBN',  color: '#00A651', country: 'NG' },
  { code: '044', name: 'Access Bank',    short: 'ACC',  color: '#F7941D', country: 'NG' },
  { code: '050', name: 'Ecobank',        short: 'ECO',  color: '#0066B3', country: 'NG' },
  { code: '070', name: 'Fidelity Bank',  short: 'FID',  color: '#7B2D8E', country: 'NG' },
  { code: '221', name: 'Stanbic IBTC',   short: 'SIB',  color: '#0033A0', country: 'NG' },
  { code: '232', name: 'Sterling Bank',  short: 'STB',  color: '#E31C23', country: 'NG' },
  { code: '076', name: 'Polaris Bank',   short: 'POL',  color: '#6B2D8B', country: 'NG' },
  { code: '082', name: 'Keystone Bank',  short: 'KEY',  color: '#00A651', country: 'NG' },
  { code: '214', name: 'FCMB',           short: 'FCMB', color: '#8B1A4A', country: 'NG' },
  { code: '035', name: 'Wema Bank',      short: 'WMA',  color: '#8B008B', country: 'NG' },
  { code: '999', name: 'OPay',           short: 'OP',   color: '#00C853', country: 'NG' },
  { code: '998', name: 'PalmPay',        short: 'PP',   color: '#7B2CBF', country: 'NG' },
  { code: '997', name: 'Kuda',           short: 'KUD',  color: '#40196D', country: 'NG' },
  { code: '996', name: 'Moniepoint',     short: 'MP',   color: '#0066FF', country: 'NG' },
];

/* ── International banks by country code ── */
export const INTL_BANKS: Record<string, Bank[]> = {
  /* United States */
  US: [
    { code: 'chase',   name: 'Chase Bank',           short: 'Chase', color: '#005DAA', flag: '🏦', country: 'US' },
    { code: 'bofa',    name: 'Bank of America',       short: 'BofA',  color: '#E31837', flag: '🏦', country: 'US' },
    { code: 'wells',   name: 'Wells Fargo',           short: 'WF',    color: '#D71E28', flag: '🏦', country: 'US' },
    { code: 'citi',    name: 'Citibank',              short: 'Citi',  color: '#003B6F', flag: '🏦', country: 'US' },
    { code: 'usbk',    name: 'US Bank',               short: 'USB',   color: '#002855', flag: '🏦', country: 'US' },
    { code: 'td',      name: 'TD Bank',               short: 'TD',    color: '#54B848', flag: '🏦', country: 'US' },
    { code: 'cashapp', name: 'Cash App',              short: 'Cash',  color: '#00D64F', flag: '📱', country: 'US' },
    { code: 'paypal',  name: 'PayPal',                short: 'PP',    color: '#003087', flag: '📱', country: 'US' },
    { code: 'zelle',   name: 'Zelle',                 short: 'Zel',   color: '#6D1ED4', flag: '📱', country: 'US' },
  ],
  /* United Kingdom */
  GB: [
    { code: 'barclays', name: 'Barclays Bank',        short: 'Barc', color: '#00AEEF', flag: '🏦', country: 'GB' },
    { code: 'hsbc',     name: 'HSBC UK',              short: 'HSBC', color: '#DB0011', flag: '🏦', country: 'GB' },
    { code: 'lloyds',   name: 'Lloyds Bank',          short: 'Lloy', color: '#024731', flag: '🏦', country: 'GB' },
    { code: 'natwest',  name: 'NatWest',              short: 'NW',   color: '#42145F', flag: '🏦', country: 'GB' },
    { code: 'santuk',   name: 'Santander UK',         short: 'Sant', color: '#EC0000', flag: '🏦', country: 'GB' },
    { code: 'monzo',    name: 'Monzo',                short: 'Monzo',color: '#FF3464', flag: '📱', country: 'GB' },
    { code: 'revolut',  name: 'Revolut',              short: 'Rev',  color: '#191C1F', flag: '📱', country: 'GB' },
    { code: 'wise',     name: 'Wise (TransferWise)',  short: 'Wise', color: '#00B9FF', flag: '📱', country: 'GB' },
  ],
  /* Germany / Europe (EUR) */
  DE: [
    { code: 'db',      name: 'Deutsche Bank',         short: 'DB',   color: '#003399', flag: '🏦', country: 'DE' },
    { code: 'commz',   name: 'Commerzbank',           short: 'CB',   color: '#FFCC00', flag: '🏦', country: 'DE' },
    { code: 'n26',     name: 'N26',                   short: 'N26',  color: '#48AC98', flag: '📱', country: 'DE' },
    { code: 'bunq',    name: 'bunq',                  short: 'bunq', color: '#00A6A6', flag: '📱', country: 'DE' },
    { code: 'bnp',     name: 'BNP Paribas',           short: 'BNP',  color: '#00965E', flag: '🏦', country: 'DE' },
  ],
  /* France */
  FR: [
    { code: 'bnpfr',   name: 'BNP Paribas',          short: 'BNP',  color: '#00965E', flag: '🏦', country: 'FR' },
    { code: 'socgen',  name: 'Société Générale',      short: 'SG',   color: '#E60028', flag: '🏦', country: 'FR' },
    { code: 'lcl',     name: 'LCL',                   short: 'LCL',  color: '#009FE3', flag: '🏦', country: 'FR' },
  ],
  /* UAE */
  AE: [
    { code: 'enbd',    name: 'Emirates NBD',          short: 'ENBD', color: '#C8102E', flag: '🏦', country: 'AE' },
    { code: 'fab',     name: 'First Abu Dhabi Bank',  short: 'FAB',  color: '#00855A', flag: '🏦', country: 'AE' },
    { code: 'adcb',    name: 'ADCB',                  short: 'ADCB', color: '#00529B', flag: '🏦', country: 'AE' },
    { code: 'mashreq', name: 'Mashreq Bank',          short: 'Mash', color: '#E31E25', flag: '🏦', country: 'AE' },
    { code: 'wioae',   name: 'WIO Bank',              short: 'WIO',  color: '#6C2BD9', flag: '📱', country: 'AE' },
  ],
  /* Saudi Arabia */
  SA: [
    { code: 'alrajhi', name: 'Al Rajhi Bank',         short: 'ARB',  color: '#00704A', flag: '🏦', country: 'SA' },
    { code: 'snb',     name: 'Saudi National Bank',   short: 'SNB',  color: '#006B54', flag: '🏦', country: 'SA' },
    { code: 'riyad',   name: 'Riyad Bank',            short: 'RYD',  color: '#005B99', flag: '🏦', country: 'SA' },
  ],
  /* Ghana */
  GH: [
    { code: 'gcb',     name: 'GCB Bank',              short: 'GCB',  color: '#006A4E', flag: '🏦', country: 'GH' },
    { code: 'eco_gh',  name: 'Ecobank Ghana',         short: 'ECO',  color: '#0066B3', flag: '🏦', country: 'GH' },
    { code: 'mtn_momo',name: 'MTN MoMo',              short: 'MoMo', color: '#FFC72C', flag: '📱', country: 'GH' },
    { code: 'vodagh',  name: 'Vodafone Cash',         short: 'VCash',color: '#E60000', flag: '📱', country: 'GH' },
    { code: 'access_gh',name: 'Access Bank Ghana',   short: 'ACC',  color: '#F7941D', flag: '🏦', country: 'GH' },
  ],
  /* Kenya */
  KE: [
    { code: 'mpesa',   name: 'M-Pesa (Safaricom)',    short: 'MPesa',color: '#4CAF50', flag: '📱', country: 'KE' },
    { code: 'kcb',     name: 'KCB Bank',              short: 'KCB',  color: '#00529B', flag: '🏦', country: 'KE' },
    { code: 'equity',  name: 'Equity Bank',           short: 'EQT',  color: '#E60028', flag: '🏦', country: 'KE' },
    { code: 'coop_ke', name: 'Co-op Bank Kenya',      short: 'Coop', color: '#005A8E', flag: '🏦', country: 'KE' },
  ],
  /* South Africa */
  ZA: [
    { code: 'fnb',     name: 'FNB (First National)',  short: 'FNB',  color: '#00A4E4', flag: '🏦', country: 'ZA' },
    { code: 'std_za',  name: 'Standard Bank SA',      short: 'STD',  color: '#009FD4', flag: '🏦', country: 'ZA' },
    { code: 'absa',    name: 'ABSA Bank',             short: 'ABSA', color: '#E2001A', flag: '🏦', country: 'ZA' },
    { code: 'nedo',    name: 'Nedbank',               short: 'NED',  color: '#009639', flag: '🏦', country: 'ZA' },
    { code: 'capitec', name: 'Capitec Bank',          short: 'CAP',  color: '#005CA9', flag: '🏦', country: 'ZA' },
  ],
  /* Canada */
  CA: [
    { code: 'rbc',     name: 'Royal Bank (RBC)',      short: 'RBC',  color: '#005DAA', flag: '🏦', country: 'CA' },
    { code: 'td_ca',   name: 'TD Canada Trust',       short: 'TD',   color: '#54B848', flag: '🏦', country: 'CA' },
    { code: 'bmo',     name: 'BMO Bank of Montreal',  short: 'BMO',  color: '#0079C1', flag: '🏦', country: 'CA' },
    { code: 'scotica', name: 'Scotiabank',            short: 'SCOT', color: '#EC111A', flag: '🏦', country: 'CA' },
    { code: 'cibc',    name: 'CIBC',                  short: 'CIBC', color: '#C41F3E', flag: '🏦', country: 'CA' },
    { code: 'intc',    name: 'Interac e-Transfer',    short: 'INT',  color: '#FFC82E', flag: '📱', country: 'CA' },
  ],
  /* India */
  IN: [
    { code: 'sbi',     name: 'State Bank of India',   short: 'SBI',  color: '#22409A', flag: '🏦', country: 'IN' },
    { code: 'hdfc',    name: 'HDFC Bank',             short: 'HDFC', color: '#004C8F', flag: '🏦', country: 'IN' },
    { code: 'icici',   name: 'ICICI Bank',            short: 'ICICI',color: '#F77F00', flag: '🏦', country: 'IN' },
    { code: 'upi',     name: 'UPI (Unified Payments)',short: 'UPI',  color: '#097939', flag: '📱', country: 'IN' },
    { code: 'paytm',   name: 'Paytm',                 short: 'Pay',  color: '#00BAF2', flag: '📱', country: 'IN' },
  ],
  /* China */
  CN: [
    { code: 'icbc',    name: 'ICBC',                  short: 'ICBC', color: '#C8102E', flag: '🏦', country: 'CN' },
    { code: 'boc',     name: 'Bank of China',         short: 'BOC',  color: '#C8102E', flag: '🏦', country: 'CN' },
    { code: 'alipay',  name: 'Alipay',                short: 'Ali',  color: '#1677FF', flag: '📱', country: 'CN' },
    { code: 'wechat',  name: 'WeChat Pay',            short: 'WCP',  color: '#07C160', flag: '📱', country: 'CN' },
  ],
  /* Qatar */
  QA: [
    { code: 'qnb',      name: 'Qatar National Bank',   short: 'QNB',  color: '#8B0000', flag: '🏦', country: 'QA' },
    { code: 'cbq',      name: 'Commercial Bank Qatar', short: 'CBQ',  color: '#004B87', flag: '🏦', country: 'QA' },
    { code: 'dohabank', name: 'Doha Bank',             short: 'DOH',  color: '#005CA9', flag: '🏦', country: 'QA' },
  ],
  /* Australia */
  AU: [
    { code: 'anz',     name: 'ANZ Bank',              short: 'ANZ',  color: '#007DC6', flag: '🏦', country: 'AU' },
    { code: 'cba',     name: 'Commonwealth Bank',     short: 'CBA',  color: '#FFCC00', flag: '🏦', country: 'AU' },
    { code: 'nab',     name: 'NAB',                   short: 'NAB',  color: '#E31837', flag: '🏦', country: 'AU' },
    { code: 'westpac', name: 'Westpac',               short: 'WBC',  color: '#DA1710', flag: '🏦', country: 'AU' },
  ],
  /* Japan */
  JP: [
    { code: 'mufg',    name: 'MUFG Bank',             short: 'MUFG', color: '#C8102E', flag: '🏦', country: 'JP' },
    { code: 'smbc',    name: 'Sumitomo Mitsui (SMBC)', short: 'SMBC', color: '#005BAC', flag: '🏦', country: 'JP' },
    { code: 'mizuho',  name: 'Mizuho Bank',           short: 'MIZ',  color: '#004EA2', flag: '🏦', country: 'JP' },
    { code: 'jppost',  name: 'Japan Post Bank',       short: 'JPB',  color: '#CC0000', flag: '🏦', country: 'JP' },
    { code: 'paypay',  name: 'PayPay',                short: 'Pay',  color: '#E63F21', flag: '📱', country: 'JP' },
    { code: 'linepay', name: 'LINE Pay',              short: 'LINE', color: '#00C300', flag: '📱', country: 'JP' },
  ],

  SG: [
    { code: 'dbs',     name: 'DBS Bank',              short: 'DBS',  color: '#E5202E', flag: '🏦', country: 'SG' },
    { code: 'ocbc',    name: 'OCBC Bank',             short: 'OCBC', color: '#C41E3A', flag: '🏦', country: 'SG' },
    { code: 'uob',     name: 'UOB',                   short: 'UOB',  color: '#00529B', flag: '🏦', country: 'SG' },
    { code: 'paynow',  name: 'PayNow',                short: 'PNow', color: '#6C3786', flag: '📱', country: 'SG' },
  ],
};

/* Map currency code → country codes that use it */
export const CURRENCY_COUNTRIES: Record<string, string[]> = {
  NGN: ['NG'],
  USD: ['US'],
  GBP: ['GB'],
  EUR: ['DE', 'FR'],
  AED: ['AE'],
  SAR: ['SA'],
  QAR: ['QA'],    // Qatar Riyal
  GHS: ['GH'],
  KES: ['KE'],
  ZAR: ['ZA'],
  CAD: ['CA'],
  INR: ['IN'],
  CNY: ['CN'],
  JPY: ['JP'],    // Japanese Yen
  AUD: ['AU'],
  NZD: ['AU'],    // NZD — use Australian banks as closest available
  SGD: ['SG'],
  HKD: ['SG'],    // HKD — use Singapore banks as closest available
  KRW: ['SG'],    // KRW — use Singapore banks as closest available
  MYR: ['SG'],    // MYR — use Singapore banks
  IDR: ['SG'],
  PHP: ['SG'],
  THB: ['SG'],
  BRL: ['US'],    // BRL — use US banks (international remittance)
  MXN: ['US'],
  CHF: ['DE'],    // CHF — use European banks
  SEK: ['DE'],
  NOK: ['DE'],
  PLN: ['DE'],
  EGP: ['AE'],    // EGP — use UAE banks (common corridor)
  ETB: ['KE'],    // ETB — use Kenya banks (East Africa corridor)
  UGX: ['KE'],
  TZS: ['KE'],
  RWF: ['KE'],
  XOF: ['GH'],    // West African CFA — use Ghana banks
  BHD: ['AE'],
  KWD: ['AE'],
};

/** Get banks for a currency. Falls back to NG_BANKS for NGN. */
export function getBanksForCurrency(currencyCode: string): Bank[] {
  if (currencyCode === 'NGN' || !currencyCode) return NG_BANKS;
  const countries = CURRENCY_COUNTRIES[currencyCode] ?? [];
  const banks = countries.flatMap(c => INTL_BANKS[c] ?? []);
  return banks.length > 0 ? banks : NG_BANKS;
}

/** Country flag emoji for a currency */
export const CURRENCY_FLAG: Record<string, string> = {
  NGN: '🇳🇬', USD: '🇺🇸', GBP: '🇬🇧', EUR: '🇪🇺', AED: '🇦🇪',
  SAR: '🇸🇦', GHS: '🇬🇭', KES: '🇰🇪', ZAR: '🇿🇦', CAD: '🇨🇦',
  INR: '🇮🇳', CNY: '🇨🇳', AUD: '🇦🇺', SGD: '🇸🇬',
};

/** Mock name enquiry — real integration would call NIBSS / Paystack resolve */
export async function resolveAccountName(accountNumber: string, _bankCode: string): Promise<string> {
  await new Promise(r => setTimeout(r, 600));
  if (!/^\d{10}$/.test(accountNumber)) throw new Error('Account number must be 10 digits');
  const names = [
    'Chinedu Okafor', 'Adaobi Nwosu', 'Ibrahim Musa',
    'Funke Adeyemi', 'Tunde Bakare', 'Ngozi Eze',
    'Yusuf Bello', 'Blessing Okoro',
  ];
  const idx = parseInt(accountNumber.slice(-2), 10) % names.length;
  return names[idx];
}
