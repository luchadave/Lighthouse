
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { HOLLO_BASE_URL } from '$app/env/private';
import { getSession } from '#lib/server/auth.js';

export const GET: RequestHandler = async ({ cookies, fetch }) => {
  const session = getSession(cookies);

  if (!session) {
    return json(
      { error: 'Not authenticated.' },
      { status: 401 }
    );
  }

  const response = await fetch(
    new URL('/api/v1/followed_tags', HOLLO_BASE_URL),
    {
      headers: {
        Authorization: `${session.tokenType} ${session.accessToken}`,
        Accept: 'application/json'
      }
    }
  );

  if (!response.ok) {
    return json(
      { error: 'Unable to load followed hashtags from Hollo.' },
      { status: response.status }
    );
  }

  const tags = await response.json();

  return json(
    { tags },
    {
      headers: {
        'Cache-Control': 'no-store'
      }
    }
  );
};
