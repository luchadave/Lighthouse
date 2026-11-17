import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { HOLLO_BASE_URL } from '$app/env/private';
import { getSession } from '#lib/server/auth.js';

function validStatusId(id: string): boolean {
  return !!id &&
    id.trim().length > 0 &&
    id.length <= 512 &&
    !/[\/\\\u0000-\u001F]/.test(id);
}

export const PUT: RequestHandler = async ({ cookies, fetch, params, request }) => {
  const session = getSession(cookies);
  if (!session) {
    return json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { id } = params;
  if (!validStatusId(id)) {
    return json({ error: 'Invalid status ID.' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.status !== 'string' || !body.status.trim()) {
    return json({ error: 'Post text is required.' }, { status: 400 });
  }

  const spoilerText = typeof body.spoiler_text === 'string'
    ? body.spoiler_text.trim()
    : '';

  if (
    body.media_ids !== undefined &&
    (!Array.isArray(body.media_ids) ||
      !body.media_ids.every((mediaId: unknown) =>
        typeof mediaId === 'string' && mediaId.trim().length > 0
      ))
  ) {
    return json({ error: 'Invalid media attachments.' }, { status: 400 });
  }

  const response = await fetch(
    new URL(`/api/v1/statuses/${encodeURIComponent(id)}`, HOLLO_BASE_URL),
    {
      method: 'PUT',
      headers: {
        Authorization: `${session.tokenType} ${session.accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: body.status.trim(),
        spoiler_text: spoilerText,
        ...(Array.isArray(body.media_ids) ? { media_ids: body.media_ids } : {})
      })
    }
  );

  if (!response.ok) {
    return json({ error: 'Hollo could not update the post.' }, { status: response.status });
  }

  return json({ success: true, status: await response.json() });
};

export const DELETE: RequestHandler = async ({ cookies, fetch, params }) => {
  const session = getSession(cookies);
  if (!session) {
    return json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { id } = params;
  if (!validStatusId(id)) {
    return json({ error: 'Invalid status ID.' }, { status: 400 });
  }

  const response = await fetch(
    new URL(`/api/v1/statuses/${encodeURIComponent(id)}`, HOLLO_BASE_URL),
    {
      method: 'DELETE',
      headers: {
        Authorization: `${session.tokenType} ${session.accessToken}`,
        Accept: 'application/json'
      }
    }
  );

  if (!response.ok) {
    return json({ error: 'Hollo could not delete the post.' }, { status: response.status });
  }

  return json({ success: true });
};
