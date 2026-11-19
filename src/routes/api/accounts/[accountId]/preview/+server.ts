import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { HOLLO_BASE_URL } from '$app/env/private';
import { getSession } from '#lib/server/auth.js';

function shortBio(html: string): string {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\\s+/g, ' ')
    .trim();

  return text.length > 200
    ? text.slice(0, 197).trimEnd() + '…'
    : text;
}

export const GET: RequestHandler = async ({
  cookies,
  fetch,
  params
}) => {
  const session = getSession(cookies);

  if (!session) {
    return json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const accountId = params.accountId;

  if (!accountId || accountId.length > 200) {
    return json({ error: 'Invalid account ID.' }, { status: 400 });
  }

  const response = await fetch(
    new URL(
      `/api/v1/accounts/${encodeURIComponent(accountId)}`,
      HOLLO_BASE_URL
    ),
    {
      headers: {
        Authorization: `${session.tokenType} ${session.accessToken}`,
        Accept: 'application/json'
      }
    }
  );

  if (!response.ok) {
    return json(
      { error: 'Unable to load profile preview.' },
      { status: response.status }
    );
  }

  const account = await response.json();

  return json(
    {
      id: account.id,
      name: account.display_name || account.username,
      handle: `@${account.acct}`,
      avatar: account.avatar,
      bio: shortBio(account.note || '')
    },
    {
      headers: {
        'Cache-Control': 'private, max-age=300'
      }
    }
  );
};
