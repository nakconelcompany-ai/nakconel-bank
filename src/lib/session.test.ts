import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { createSessionToken, getAuthenticatedUserId, hasSameOriginRequest, verifySessionToken } from './session';

const userId = 'c654c221-76fb-4b7f-b0cb-a51bd128c276';

describe('signed sessions', () => {
  it('allows only requests with the exact same origin and rejects missing Origin headers', () => {
    expect(
      hasSameOriginRequest(new NextRequest('https://bank.example/api', {
        method: 'POST',
        headers: { origin: 'https://bank.example' },
      }))
    ).toBe(true);
    expect(
      hasSameOriginRequest(new NextRequest('https://bank.example/api', {
        method: 'POST',
        headers: { origin: 'https://attacker.example' },
      }))
    ).toBe(false);
    expect(
      hasSameOriginRequest(new NextRequest('https://bank.example/api', { method: 'POST' }))
    ).toBe(false);
  });

  it('authenticates mutations only with a valid cookie and same-origin request', () => {
    const token = createSessionToken(userId);
    const request = new NextRequest('https://bank.example/api/v1/business/profile', {
      method: 'POST',
      headers: {
        origin: 'https://bank.example',
        cookie: `nakconel_session=${token}`,
      },
    });
    const crossOriginRequest = new NextRequest('https://bank.example/api/v1/business/profile', {
      method: 'POST',
      headers: {
        origin: 'https://attacker.example',
        cookie: `nakconel_session=${token}`,
      },
    });

    expect(getAuthenticatedUserId(request)).toBe(userId);
    expect(getAuthenticatedUserId(crossOriginRequest)).toBeNull();
  });

  it('accepts a valid session token', () => {
    const now = Date.UTC(2026, 10, 6);
    const token = createSessionToken(userId, now);

    expect(verifySessionToken(token, now)).toBe(userId);
  });

  it('rejects expired, modified, and malformed tokens', () => {
    const now = Date.UTC(2026, 10, 6);
    const expiredToken = createSessionToken(userId, now - 13 * 60 * 60 * 1000);
    const validToken = createSessionToken(userId, now);
    const [payload, signature] = validToken.split('.');

    expect(verifySessionToken(expiredToken, now)).toBeNull();
    expect(verifySessionToken(`${payload}x.${signature}`, now)).toBeNull();
    expect(verifySessionToken('not-a-session-token', now)).toBeNull();
    expect(verifySessionToken(undefined, now)).toBeNull();
  });
});
