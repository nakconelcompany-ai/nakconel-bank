import { describe, it, expect } from 'vitest';
import {
  generateGiftCardCode,
  normalizeGiftCode,
  hashGiftCode,
  maskGiftCode,
} from './service';

describe('Gift Card utilities & security', () => {
  it('generates standard format NKC-XXXX-XXXX-XXXX with unambiguous characters', () => {
    const code = generateGiftCardCode();
    expect(code).toMatch(/^NKC-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    // Must never contain 0, 1, I, O
    expect(code).not.toMatch(/[01IO]/);
  });

  it('normalizes formatted codes regardless of hyphens, casing, or spaces', () => {
    const input1 = 'nkc-abcd-efgh-jklm';
    const input2 = 'NKC - ABCD - EFGH - JKLM';
    const input3 = 'NKCABCDEFGHJKLM';

    expect(normalizeGiftCode(input1)).toBe('NKCABCDEFGHJKLM');
    expect(normalizeGiftCode(input2)).toBe('NKCABCDEFGHJKLM');
    expect(normalizeGiftCode(input3)).toBe('NKCABCDEFGHJKLM');
  });

  it('produces identical SHA-256 hashes for normalized variations', () => {
    const hash1 = hashGiftCode('NKC-2345-6789-ABCD');
    const hash2 = hashGiftCode('nkc-2345-6789-abcd');
    const hash3 = hashGiftCode('  NKC23456789ABCD  ');

    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
    expect(hash1).toHaveLength(64); // SHA-256 hex length
  });

  it('masks code correctly preserving only the last 4 characters', () => {
    const code = 'NKC-9876-5432-WXYZ';
    const masked = maskGiftCode(code);
    expect(masked).toBe('NKC-****-****-WXYZ');
  });

  it('generates unique codes on subsequent calls', () => {
    const codeA = generateGiftCardCode();
    const codeB = generateGiftCardCode();
    expect(codeA).not.toBe(codeB);
  });
});
