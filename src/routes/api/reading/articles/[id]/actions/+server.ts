import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getSession } from '#lib/server/auth.js';
import { db } from '#lib/server/rss/db.js';

export const PATCH: RequestHandler = async ({ cookies, params, request }) => {
  if (!getSession(cookies)) {
    return json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const id = Number(params.id);

  if (!Number.isSafeInteger(id) || id <= 0 || String(id) !== params.id) {
    return json({ error: 'Invalid article ID.' }, { status: 400 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { action, value } = body as Record<string, unknown>;

  if (
    (action !== 'read' && action !== 'saved') ||
    typeof value !== 'boolean'
  ) {
    return json({ error: 'Invalid action or value.' }, { status: 400 });
  }

  const column = action === 'read' ? 'read' : 'saved';

  const result = db.prepare(
    `UPDATE articles SET ${column} = ? WHERE id = ?`
  ).run(value ? 1 : 0, id);

  if (result.changes === 0) {
    return json({ error: 'Article not found.' }, { status: 404 });
  }

  const article = db.prepare(
    'SELECT id, read, saved FROM articles WHERE id = ?'
  ).get(id);

  return json(
    { article },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
};
