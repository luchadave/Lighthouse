
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { HOLLO_BASE_URL } from '$app/env/private';
import { getSession } from '#lib/server/auth.js';

export const POST: RequestHandler = async ({
  cookies,
  fetch,
  params
}) => {
  const session = getSession(cookies);

  if (!session) {
    return json(
      { error: 'Not authenticated.' },
      { status: 401 }
    );
  }

  const id = params.id;

  if (
    !id ||
    !id.trim() ||
    id.length > 512 ||
    /[\/\\\u0000-\u001F]/.test(id)
  ) {
    return json(
      { error: 'Invalid post ID.' },
      { status: 400 }
    );
  }

  const response = await fetch(
    new URL(
      `/api/v1/statuses/${encodeURIComponent(id)}/reblog`,
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
      { error: 'Hollo could not repost this post.' },
      { status: response.status }
    );
  }

  const status = await response.json();

  return json({
    success: true,
    status
  });
};

export const DELETE: RequestHandler = async ({
  cookies,
  fetch,
  params
}) => {
  const session = getSession(cookies);

  if (!session) {
    return json(
      { error: 'Not authenticated.' },
      { status: 401 }
    );
  }

  const id = params.id;

  if (
    !id ||
    !id.trim() ||
    id.length > 512 ||
    /[\/\\\u0000-\u001F]/.test(id)
  ) {
    return json(
      { error: 'Invalid post ID.' },
      { status: 400 }
    );
  }

  const response = await fetch(
    new URL(
      `/api/v1/statuses/${encodeURIComponent(id)}/unreblog`,
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
      { error: 'Hollo could not remove this repost.' },
      { status: response.status }
    );
  }

  const status = await response.json();

  return json({
    success: true,
    status
  });
};
