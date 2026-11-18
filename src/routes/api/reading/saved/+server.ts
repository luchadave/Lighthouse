import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getSession } from '#lib/server/auth.js';
import { db } from '#lib/server/rss/db.js';

export const GET: RequestHandler = ({ cookies }) => {
  if (!getSession(cookies)) {
    return json(
      { error: 'Not authenticated.' },
      { status: 401 }
    );
  }

  const articles = db.prepare(`
    SELECT
      id,
      feed_id,
      source,
      url,
      title,
      published,
      fetched_at,
      saved,
      read,
      substr(content, 1, 300) AS excerpt
    FROM articles
    WHERE saved = 1
    ORDER BY COALESCE(published, fetched_at) DESC, id DESC
    LIMIT 100
  `).all();

  return json(
    { articles },
    {
      headers: {
        'Cache-Control': 'private, no-store'
      }
    }
  );
};
