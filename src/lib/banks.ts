/** Nigerian banks + fintech wallets for transfers (demo list). */

export type Bank = {
  code: string;
  name: string;
  short: string;
  color: string;
};

export const NG_BANKS: Bank[] = [
  { code: '058', name: 'GTBank', short: 'GT', color: '#E35205' },
  { code: '033', name: 'UBA', short: 'UBA', color: '#D32F2F' },
  { code: '011', name: 'First Bank', short: 'FBN', color: '#003B70' },
  { code: '057', name: 'Zenith Bank', short: 'ZEN', color: '#ED1C24' },
  { code: '032', name: 'Union Bank', short: 'UBN', color: '#00A651' },
  { code: '044', name: 'Access Bank', short: 'ACC', color: '#F7941D' },
  { code: '050', name: 'Ecobank', short: 'ECO', color: '#0066B3' },
  { code: '070', name: 'Fidelity Bank', short: 'FID', color: '#7B2D8E' },
  { code: '221', name: 'Stanbic IBTC', short: 'SIB', color: '#0033A0' },
  { code: '232', name: 'Sterling Bank', short: 'STB', color: '#E31C23' },
  { code: '076', name: 'Polaris Bank', short: 'POL', color: '#6B2D8B' },
  { code: '082', name: 'Keystone Bank', short: 'KEY', color: '#00A651' },
  { code: '214', name: 'FCMB', short: 'FCMB', color: '#8B1A4A' },
  { code: '035', name: 'Wema Bank', short: 'WMA', color: '#8B008B' },
  { code: '999', name: 'OPay', short: 'OP', color: '#00C853' },
  { code: '998', name: 'PalmPay', short: 'PP', color: '#7B2CBF' },
  { code: '997', name: 'Kuda', short: 'KUD', color: '#40196D' },
  { code: '996', name: 'Moniepoint', short: 'MP', color: '#0066FF' },
];

/** Mock name enquiry — real integration would call NIBSS / Paystack resolve */
export async function resolveAccountName(accountNumber: string, bankCode: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 600));
  if (!/^\d{10}$/.test(accountNumber)) throw new Error('Account number must be 10 digits');
  const names = [
    'Chinedu Okafor',
    'Adaobi Nwosu',
    'Ibrahim Musa',
    'Funke Adeyemi',
    'Tunde Bakare',
    'Ngozi Eze',
    'Yusuf Bello',
    'Blessing Okoro',
  ];
  const idx = (parseInt(accountNumber.slice(-2), 10) + parseInt(bankCode, 10)) % names.length;
  return names[idx];
}
