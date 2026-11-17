
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { HOLLO_BASE_URL } from '$app/env/private';
import { getSession } from '#lib/server/auth.js';

type HolloList = {
  id: string;
  title: string;
  replies_policy?: string;
};

export const GET: RequestHandler = async ({ cookies, fetch }) => {
  const session = getSession(cookies);

  if (!session) {
    return json(
      { error: 'Not authenticated.' },
      { status: 401 }
    );
  }

  const response = await fetch(
    new URL('/api/v1/lists', HOLLO_BASE_URL),
    {
      headers: {
        Authorization: `${session.tokenType} ${session.accessToken}`,
        Accept: 'application/json'
      }
    }
  );

  if (!response.ok) {
    return json(
      { error: 'Unable to load lists from Hollo.' },
      { status: response.status }
    );
  }

  const lists = await response.json() as HolloList[];

  return json(
    { lists },
    {
      headers: {
        'Cache-Control': 'no-store'
      }
    }
  );
};
