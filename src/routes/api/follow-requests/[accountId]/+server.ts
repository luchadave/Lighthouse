import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { HOLLO_BASE_URL } from '$app/env/private';
import { getSession } from '#lib/server/auth.js';

export const POST: RequestHandler = async ({
  cookies,
  fetch,
  params,
  request
}) => {
  const session = getSession(cookies);

  if (!session) {
    return json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const accountId = params.accountId;

  if (!accountId) {
    return json({ error: 'Missing account ID.' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action !== 'accept' && action !== 'reject') {
    return json({ error: 'Invalid action.' }, { status: 400 });
  }

  const response = await fetch(
    new URL(
      `/api/v1/follow_requests/${encodeURIComponent(accountId)}/${action === 'accept' ? 'authorize' : 'reject'}`,
      HOLLO_BASE_URL
    ),
    {
      method: 'POST',
      headers: {
        Authorization: `${session.tokenType} ${session.accessToken}`,
        Accept: 'application/json'
      }
    }
  );

  if (!response.ok) {
    return json(
      { error: 'Hollo could not process the follow request.' },
      { status: response.status }
    );
  }

  return json({ success: true });
};
