/** Amounts are stored in kobo (minor units). 1 NGN = 100 kobo. */

export function toKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function fromKobo(kobo: number): number {
  return kobo / 100;
}

export function formatNGN(kobo: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(fromKobo(kobo));
}
