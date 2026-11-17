
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sanitizeHtml from 'sanitize-html';

import { HOLLO_BASE_URL } from '$app/env/private';
import { getSession } from '#lib/server/auth.js';

type HolloStatus = {
  id: string;
  content: string;
  created_at: string;
  replies_count: number;
  reblogs_count: number;
  favourited: boolean;
  bookmarked: boolean;
  account: {
    username: string;
    acct: string;
    display_name: string;
    avatar: string;
    url: string;
  };
  media_attachments?: {
    id: string;
    type: string;
    url: string | null;
    preview_url: string | null;
    description: string | null;
  }[];
  card?: {
    url: string;
    title: string;
    description: string;
    image: string | null;
    provider_name: string;
    type: string;
  } | null;
  reblog?: HolloStatus | null;
};

export const GET: RequestHandler = async ({
  cookies,
  fetch,
  params,
  url
}) => {
  const session = getSession(cookies);

  if (!session) {
    return json(
      { error: 'Not authenticated.' },
      { status: 401 }
    );
  }

  const listId = params.listId;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listId)
  ) {
    return json(
      { error: 'Invalid list ID.' },
      { status: 400 }
    );
  }

  const timelineUrl = new URL(
    `/api/v1/timelines/list/${listId}`,
    HOLLO_BASE_URL
  );

  timelineUrl.searchParams.set('limit', '20');

  const maxId = url.searchParams.get('max_id');

  if (maxId) {
    timelineUrl.searchParams.set('max_id', maxId);
  }

  const response = await fetch(timelineUrl, {
    headers: {
      Authorization: `${session.tokenType} ${session.accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    return json(
      { error: 'Unable to load posts from this list.' },
      { status: response.status }
    );
  }

  const statuses = await response.json() as HolloStatus[];

  const posts = statuses.map((status) => {
    const original = status.reblog ?? status;
    const author = original.account;

    return {
      id: status.id,
      boostedBy: status.reblog
        ? (status.account.display_name || status.account.username)
        : null,
      name: author.display_name || author.username,
      handle: `@${author.acct}`,
      avatar: author.avatar,
      url: author.url,
      time: original.created_at,
      content: sanitizeHtml(original.content, {
        allowedTags: [
          'p', 'br',
          'strong', 'b',
          'em', 'i',
          'del', 's',
          'blockquote',
          'pre', 'code',
          'ul', 'ol', 'li',
          'a',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'hr'
        ],
        allowedAttributes: {
          a: ['href', 'title', 'rel'],
          code: ['class']
        },
        allowedSchemes: ['http', 'https', 'mailto']
      }),
      mediaAttachments: original.media_attachments ?? [],
      card: original.card ?? null,
      liked: status.favourited,
      bookmarked: status.bookmarked,
      replies: status.replies_count,
      reposts: status.reblogs_count
    };
  });

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
