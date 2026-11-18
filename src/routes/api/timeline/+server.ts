import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { HOLLO_BASE_URL } from '$app/env/private';
import { getSession } from '#lib/server/auth.js';

import { mapStatus, type HolloStatus } from '#lib/server/status.js';

export const GET: RequestHandler = async ({
  cookies,
  fetch,
  url
}) => {
  const session = getSession(cookies);

  if (!session) {
    return json(
      { error: 'Not authenticated.' },
      { status: 401 }
    );
  }

  const maxId = url.searchParams.get('max_id');
  const sinceId = url.searchParams.get('since_id');

  const timelineUrl = new URL(
    '/api/v1/timelines/home',
    HOLLO_BASE_URL
  );

  timelineUrl.searchParams.set('limit', '20');
  if (maxId) timelineUrl.searchParams.set('max_id', maxId);
  if (sinceId) timelineUrl.searchParams.set('since_id', sinceId);

  const headers = {
    Authorization: `${session.tokenType} ${session.accessToken}`,
    Accept: 'application/json'
  };

  const response = await fetch(timelineUrl, { headers });

  if (!response.ok) {
    return json(
      { error: 'Unable to load posts from Hollo.' },
      { status: response.status }
    );
  }

  const statuses = await response.json() as HolloStatus[];
  let posts: ReturnType<typeof mapStatus>[] = [];

  if (statuses.length > 0) {
    const profileResponse = await fetch(
      new URL('/api/v1/accounts/verify_credentials', HOLLO_BASE_URL),
      { headers }
    );

    if (!profileResponse.ok) {
      return json(
        { error: 'Unable to verify your Hollo account.' },
        { status: profileResponse.status }
      );
    }

    const profile: { id: string } = await profileResponse.json();
    posts = statuses.map(status => mapStatus(status, profile.id));
  }

  const nextLink = response.headers.get('link');
  const nextUrl = nextLink?.match(/<([^>]+)>;\s*rel="next"/)?.[1];

  const nextMaxId = nextUrl
    ? new URL(nextUrl).searchParams.get('max_id')
    : null;

  return json(
    { posts, nextMaxId },
    {
      headers: {
        'Cache-Control': 'no-store'
      }
    }
  );
};
