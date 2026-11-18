import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getSession } from '#lib/server/auth.js';
import { db } from '#lib/server/rss/db.js';

export const GET: RequestHandler = ({ cookies, params }) => {
  if (!getSession(cookies)) {
    return json(
      { error: 'Not authenticated.' },
      { status: 401 }
    );
  }

  const id = Number(params.id);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    String(id) !== params.id
  ) {
    return json(
      { error: 'Invalid article ID.' },
      { status: 400 }
    );
  }

  const article = db.prepare(`
    SELECT
      id,
      feed_id,
      source,
      url,
      title,
      content,
      published,
      fetched_at,
      saved,
      read
    FROM articles
    WHERE id = ?
  `).get(id);

  if (!article) {
    return json(
      { error: 'Article not found.' },
      { status: 404 }
    );
  }

  return json(
    { article },
    {
      headers: {
        'Cache-Control': 'private, no-store'
      }
    }
  );
};
