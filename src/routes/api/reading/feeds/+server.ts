import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getSession } from '#lib/server/auth.js';
import { db } from '#lib/server/rss/db.js';

export const GET: RequestHandler = ({ cookies }) => {
  const session = getSession(cookies);

  if (!session) {
    return json(
      { error: 'Not authenticated.' },
      { status: 401 }
    );
  }

  const feeds = db.prepare(`
    SELECT id, url, title, fetched_at, error
    FROM feeds
    ORDER BY title COLLATE NOCASE ASC
  `).all();

  return json(
    { feeds },
    {
      headers: {
        'Cache-Control': 'private, no-store'
      }
    }
  );
};

import { addFeed } from '#lib/server/rss/db.js';
import { webURL } from '#lib/server/rss/network.js';
import { refreshFeed } from '#lib/server/rss/feeds.js';

export const POST: RequestHandler = async ({ cookies, request }) => {
  if (!getSession(cookies)) {
    return json(
      { error: 'Not authenticated.' },
      { status: 401 }
    );
  }

  let url: string;

  try {
    const body = await request.json();
    url = webURL(String(body?.url ?? '').trim());
  } catch {
    return json(
      { error: 'Provide a valid HTTP or HTTPS feed URL.' },
      { status: 400 }
    );
  }

  const existing = db.prepare(
    'SELECT id FROM feeds WHERE url = ?'
  ).get(url);

  if (existing) {
    return json(
      { error: 'You are already subscribed to this feed.' },
      { status: 409 }
    );
  }

  const count = db.prepare(
    'SELECT COUNT(*) AS total FROM feeds'
  ).get() as { total: number };

  if (count.total >= 500) {
    return json(
      { error: 'Lighthouse supports up to 500 subscriptions.' },
      { status: 400 }
    );
  }

  const feed = addFeed(url);

  if (!feed) {
    return json(
      { error: 'Unable to create the subscription.' },
      { status: 500 }
    );
  }

  await refreshFeed(feed);

  const updated = db.prepare(
    'SELECT id, url, title, fetched_at, error FROM feeds WHERE id = ?'
  ).get(feed.id);

  return json(
    { feed: updated },
    {
      status: 201,
      headers: {
        'Cache-Control': 'private, no-store'
      }
    }
  );
};
