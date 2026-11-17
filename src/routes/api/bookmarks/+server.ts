
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sanitizeHtml from 'sanitize-html';

import { HOLLO_BASE_URL } from '$app/env/private';
import { getSession } from '#lib/server/auth.js';

type HolloQuotedStatus = {
  id: string;
  url?: string | null;
  content: string;
  created_at: string;
  account: {
    username: string;
    acct: string;
    display_name: string;
    avatar: string;
    url: string;
  };
};

type HolloStatus = {
  id: string;
  url?: string | null;
  content: string;
  spoiler_text?: string;
  visibility?: string;
  created_at: string;
  replies_count: number;
  reblogs_count: number;
  favourited: boolean;
  bookmarked: boolean;
  reblogged?: boolean;
  account: {
    id: string;
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
  quote?: {
    state: string;
    quoted_status?: HolloQuotedStatus | null;
  } | null;
  reblog?: HolloStatus | null;
};

type HolloCredentials = {
  id: string;
};

function plainText(html: string): string {
  return html
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

function safeHtml(html: string): string {
  return sanitizeHtml(html, {
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
  });
}

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

  const headers = {
    Authorization: `${session.tokenType} ${session.accessToken}`,
    Accept: 'application/json'
  };

  const credentialsResponse = await fetch(
    new URL('/api/v1/accounts/verify_credentials', HOLLO_BASE_URL),
    { headers }
  );

  if (!credentialsResponse.ok) {
    return json(
      { error: 'Unable to verify your Hollo account.' },
      { status: credentialsResponse.status }
    );
  }

  const credentials =
    await credentialsResponse.json() as HolloCredentials;

  const bookmarksUrl = new URL(
    '/api/v1/bookmarks',
    HOLLO_BASE_URL
  );

  bookmarksUrl.searchParams.set('limit', '20');

  const maxId = url.searchParams.get('max_id');

  if (maxId) {
    bookmarksUrl.searchParams.set('max_id', maxId);
  }

  const response = await fetch(bookmarksUrl, { headers });

  if (!response.ok) {
    return json(
      { error: 'Unable to load bookmarks from Hollo.' },
      { status: response.status }
    );
  }

  const statuses = await response.json() as HolloStatus[];

  const posts = statuses.map((status) => {
    const original = status.reblog ?? status;
    const author = original.account;
    const quoted = original.quote?.quoted_status;

    return {
      id: status.id,
      postUrl: original.url ?? status.url ?? null,
      isOwnPost: !status.reblog && author.id === credentials.id,
      editableContent: plainText(original.content),
      spoilerText: original.spoiler_text ?? '',
      visibility: original.visibility ?? 'public',
      boostedBy: status.reblog
        ? (status.account.display_name || status.account.username)
        : null,
      name: author.display_name || author.username,
      handle: `@${author.acct}`,
      avatar: author.avatar,
      url: author.url,
      time: original.created_at,
      content: safeHtml(original.content),
      quotedPost: quoted
        ? {
            id: quoted.id,
            postUrl: quoted.url ?? null,
            name: quoted.account.display_name ||
              quoted.account.username,
            handle: `@${quoted.account.acct}`,
            avatar: quoted.account.avatar,
            url: quoted.account.url,
            time: quoted.created_at,
            content: safeHtml(quoted.content)
          }
        : null,
      mediaAttachments: original.media_attachments ?? [],
      card: original.card ?? null,
      liked: status.favourited,
      bookmarked: status.bookmarked,
      reposted: status.reblogged ?? false,
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
