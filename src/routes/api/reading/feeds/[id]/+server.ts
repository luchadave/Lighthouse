import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getSession } from '#lib/server/auth.js';
import { db } from '#lib/server/rss/db.js';

export const DELETE: RequestHandler = ({ cookies, params }) => {
  if (!getSession(cookies)) {
    return json(
      { error: 'Not authenticated.' },
      { status: 401 }
    );
  }

  const id = Number(params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return json(
      { error: 'Invalid feed ID.' },
      { status: 400 }
    );
  }

  const feed = db.prepare(
    'SELECT id, title FROM feeds WHERE id = ?'
  ).get(id) as { id: number; title: string } | undefined;

  if (!feed) {
    return json(
      { error: 'Subscription not found.' },
      { status: 404 }
    );
  }

  try {
    db.exec('BEGIN');

    // Remove unsaved articles belonging to this feed.
    db.prepare(
      'DELETE FROM articles WHERE feed_id = ? AND saved = 0'
    ).run(id);

    // Saved articles remain, with feed_id set to NULL.
    // Associated seen records are removed automatically.
    db.prepare(
      'DELETE FROM feeds WHERE id = ?'
    ).run(id);

    db.exec('COMMIT');
  } catch {
    db.exec('ROLLBACK');

    return json(
      { error: 'Unable to remove subscription.' },
      { status: 500 }
    );
  }

  return json(
    { success: true, title: feed.title },
    {
      headers: {
        'Cache-Control': 'private, no-store'
      }
    }
  );
};
