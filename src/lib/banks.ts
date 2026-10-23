export const NG_BANKS = [
  { code: '058', name: 'GTBank' },
  { code: '033', name: 'UBA' },
  { code: '011', name: 'First Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '032', name: 'Union Bank' },
  { code: '044', name: 'Access Bank' },
  { code: '050', name: 'Ecobank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '221', name: 'Stanbic IBTC' },
  { code: '232', name: 'Sterling Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '214', name: 'FCMB' },
  { code: '035', name: 'Wema Bank' },
  { code: '999', name: 'OPay' },
  { code: '998', name: 'PalmPay' },
  { code: '997', name: 'Kuda' },
] as const;

/** Mock name enquiry — real integration uses NIBSS / Paystack resolve */
export async function resolveAccountName(accountNumber: string, bankCode: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 600));
  if (!/^\d{10}$/.test(accountNumber)) throw new Error('Account number must be 10 digits');
  const names = [
    'Chinedu Okafor', 'Adaobi Nwosu', 'Ibrahim Musa', 'Funke Adeyemi',
    'Tunde Bakare', 'Ngozi Eze', 'Yusuf Bello', 'Blessing Okoro',
  ];
  const idx = (parseInt(accountNumber.slice(-2), 10) + parseInt(bankCode, 10)) % names.length;
  return names[idx];
}
