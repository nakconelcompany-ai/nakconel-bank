import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'nakconel_session';
const ADMIN_SESSION_COOKIE = 'nakconel_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  sub: string;
  exp: number;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be configured with at least 32 characters in production.');
  }
  return 'local-development-session-secret-do-not-use-in-production';
}

function sign(payload: string) {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

export function createSessionToken(userId: string, now = Date.now()) {
  const payload: SessionPayload = {
    sub: userId,
    exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): string | null {
  if (!token || token.length > 2048) return null;
  const [encoded, suppliedSignature, extra] = token.split('.');
  if (!encoded || !suppliedSignature || extra !== undefined) return null;

  try {
    const expectedSignature = Buffer.from(sign(encoded));
    const actualSignature = Buffer.from(suppliedSignature);
    if (expectedSignature.length !== actualSignature.length || !timingSafeEqual(expectedSignature, actualSignature)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<SessionPayload>;
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number' || payload.exp <= Math.floor(now / 1000)) {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, userId: string) {
  response.cookies.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function setAdminSessionCookie(response: NextResponse, userId: string) {
  response.cookies.set(ADMIN_SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function hasSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  // Browser state-changing requests must carry an explicit same-origin header.
  if (!origin) return false;
  // Allow if origin matches the request URL origin
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

export function getAuthenticatedUserId(request: NextRequest): string | null {
  if (request.method !== 'GET' && request.method !== 'HEAD' && !hasSameOriginRequest(request)) {
    return null;
  }
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}
