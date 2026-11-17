
import { json, error } from '@sveltejs/kit';
import { HOLLO_BASE_URL } from '$app/env/private';
import { getSession } from '#lib/server/auth.js';

export async function GET({ cookies }) {
  const session = getSession(cookies);

  if (!session) {
    throw error(401, 'You are not logged in.');
  }

  const response = await fetch(
    new URL('/api/v1/accounts/verify_credentials', HOLLO_BASE_URL),
    {
      headers: {
        Authorization: `${session.tokenType} ${session.accessToken}`,
        Accept: 'application/json'
      }
    }
  );

  if (response.status === 401 || response.status === 403) {
    throw error(401, 'Your Hollo session is no longer valid. Please log in again.');
  }

  if (!response.ok) {
    throw error(502, 'Could not retrieve your Hollo account.');
  }

  const account = await response.json();

  return json(account, {
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}
