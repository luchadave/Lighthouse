import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getSession } from '#lib/server/auth.js';
import { db, addFeed } from '#lib/server/rss/db.js';
import { parseOPML } from '#lib/server/rss/feeds.js';

const MAX_FILE_SIZE = 1024 * 1024;
const MAX_SUBSCRIPTIONS = 500;

export const POST: RequestHandler = async ({ cookies, request }) => {
  if (!getSession(cookies)) {
    return json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const contentLength = Number(request.headers.get('content-length'));

  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_SIZE + 65536) {
    return json({ error: 'OPML file is too large.' }, { status: 413 });
  }

  let file: File;

  try {
    const form = await request.formData();
    const uploaded = form.get('file');

    if (!(uploaded instanceof File)) {
      return json({ error: 'Choose an OPML file.' }, { status: 400 });
    }

    file = uploaded;
  } catch {
    return json({ error: 'Invalid upload.' }, { status: 400 });
  }

  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return json(
      { error: 'Choose an OPML file smaller than 1 MB.' },
      { status: 400 }
    );
  }

  if (!/\.(opml|xml)$/i.test(file.name)) {
    return json(
      { error: 'Choose a .opml or .xml file.' },
      { status: 400 }
    );
  }

  let subscriptions: { url: string; title: string }[];

  try {
    subscriptions = parseOPML(await file.text());
  } catch (cause) {
    return json(
      {
        error: cause instanceof Error
          ? cause.message
          : 'Unable to parse OPML file.'
      },
      { status: 400 }
    );
  }

  let imported = 0;
  let skipped = 0;
  let full = 0;

  try {
    db.exec('BEGIN');

    let currentCount = (
      db.prepare('SELECT COUNT(*) AS total FROM feeds').get() as {
        total: number
      }
    ).total;

    const exists = db.prepare('SELECT id FROM feeds WHERE url = ?');

    for (const subscription of subscriptions) {
      if (exists.get(subscription.url)) {
        skipped++;
        continue;
      }

      if (currentCount >= MAX_SUBSCRIPTIONS) {
        full++;
        continue;
      }

      const feed = addFeed(
        subscription.url,
        subscription.title.slice(0, 500) || subscription.url
      );

      if (!feed) {
        throw new Error('Unable to add subscription.');
      }

      imported++;
      currentCount++;
    }

    db.exec('COMMIT');
  } catch {
    db.exec('ROLLBACK');

    return json(
      { error: 'Unable to import subscriptions.' },
      { status: 500 }
    );
  }

  return json(
    {
      imported,
      skipped,
      full,
      total: subscriptions.length
    },
    {
      headers: {
        'Cache-Control': 'private, no-store'
      }
    }
  );
};
