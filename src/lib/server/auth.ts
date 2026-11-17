
import {
  HOLLO_BASE_URL,
  HOLLO_CLIENT_ID,
  HOLLO_CLIENT_SECRET,
  HOLLO_REDIRECT_URI
} from '$app/env/private';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { error } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';

import {
  createSession as saveSession,
  getSession as findSession,
  deleteSession
} from './database';

const BASE_URL = HOLLO_BASE_URL;
const CLIENT_ID = HOLLO_CLIENT_ID;
const CLIENT_SECRET = HOLLO_CLIENT_SECRET;
const REDIRECT_URI = HOLLO_REDIRECT_URI;

const SESSION_COOKIE = 'noctiluna_session';
const STATE_COOKIE = 'noctiluna_oauth_state';
const VERIFIER_COOKIE = 'noctiluna_pkce_verifier';

const SESSION_DURATION = 60 * 60 * 24 * 7;

function requireConfig() {
  if (!BASE_URL || !CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    throw error(500, 'Noctiluna authentication configuration is incomplete.');
  }
}

function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

function pkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

function cookieOptions(maxAge: number) {
  return {
    path: '/',
    httpOnly: true,
    secure: REDIRECT_URI.startsWith('https://'),
    sameSite: 'lax' as const,
    maxAge
  };
}

export function createLogin(cookies: Cookies): URL {
  requireConfig();

  const state = randomToken();
  const verifier = randomToken(48);

  cookies.set(STATE_COOKIE, state, cookieOptions(600));
  cookies.set(VERIFIER_COOKIE, verifier, cookieOptions(600));

  const url = new URL('/oauth/authorize', BASE_URL);

  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'read write follow',
    state,
    code_challenge: pkceChallenge(verifier),
    code_challenge_method: 'S256'
  }).toString();

  return url;
}

export async function completeLogin(
  cookies: Cookies,
  code: string,
  returnedState: string
): Promise<void> {
  requireConfig();

  const expectedState = cookies.get(STATE_COOKIE);
  const verifier = cookies.get(VERIFIER_COOKIE);

  cookies.delete(STATE_COOKIE, { path: '/' });
  cookies.delete(VERIFIER_COOKIE, { path: '/' });

  if (!expectedState || !verifier || !returnedState) {
    throw error(400, 'The login session expired. Please try again.');
  }

  const expected = Buffer.from(expectedState);
  const received = Buffer.from(returnedState);

  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    throw error(400, 'OAuth state validation failed.');
  }

  const response = await fetch(new URL('/oauth/token', BASE_URL), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier
    })
  });

  if (!response.ok) {
    throw error(502, 'Hollo could not complete the authorization exchange.');
  }

  const token = await response.json();

  if (!token.access_token || typeof token.access_token !== 'string') {
    throw error(502, 'Hollo returned an invalid access token response.');
  }

  const now = Date.now();
  const sessionId = randomToken();

  const expiresIn = Number(token.expires_in);
  const tokenExpiresAt =
    Number.isFinite(expiresIn) && expiresIn > 0
      ? now + expiresIn * 1000
      : null;

  const sessionExpiresAt = Math.min(
    tokenExpiresAt ?? now + SESSION_DURATION * 1000,
    now + SESSION_DURATION * 1000
  );

  saveSession({
    id: sessionId,
    access_token: token.access_token,
    token_type:
      typeof token.token_type === 'string' ? token.token_type : 'Bearer',
    expires_at: sessionExpiresAt,
    created_at: now,
    last_seen_at: now
  });

  cookies.set(
    SESSION_COOKIE,
    sessionId,
    cookieOptions(SESSION_DURATION)
  );
}

export function getSession(cookies: Cookies) {
  requireConfig();

  const sessionId = cookies.get(SESSION_COOKIE);

  if (!sessionId || !/^[A-Za-z0-9_-]{40,50}$/.test(sessionId)) {
    return null;
  }

  const session = findSession(sessionId);

  if (!session) {
    return null;
  }

  return {
    accessToken: session.access_token,
    tokenType: session.token_type,
    expiresAt: session.expires_at,
    createdAt: session.created_at
  };
}

export function clearSession(cookies: Cookies): void {
  const sessionId = cookies.get(SESSION_COOKIE);

  if (sessionId) {
    deleteSession(sessionId);
  }

  cookies.delete(SESSION_COOKIE, { path: '/' });
}
