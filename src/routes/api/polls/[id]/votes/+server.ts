
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { HOLLO_BASE_URL } from '$app/env/private';
import { getSession } from '#lib/server/auth.js';

export const POST: RequestHandler = async ({
  cookies,
  fetch,
  params,
  request
}) => {
  const session = getSession(cookies);

  if (!session) {
    return json(
      { error: 'Not authenticated.' },
      { status: 401 }
    );
  }

  const id = params.id;

  if (
    !id ||
    !id.trim() ||
    id.length > 512 ||
    /[\/\\\u0000-\u001F]/.test(id)
  ) {
    return json(
      { error: 'Invalid poll ID.' },
      { status: 400 }
    );
  }

  let body: { choices?: unknown };

  try {
    body = await request.json();
  } catch {
    return json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  const choices = body.choices;

  if (
    !Array.isArray(choices) ||
    choices.length < 1 ||
    choices.length > 4 ||
    !choices.every(
      (choice: unknown) =>
        Number.isInteger(choice) &&
        (choice as number) >= 0 &&
        (choice as number) <= 3
    ) ||
    new Set(choices).size !== choices.length
  ) {
    return json(
      { error: 'Invalid poll choices.' },
      { status: 400 }
    );
  }

      const response = await fetch(
    new URL(
      `/api/v1/polls/${encodeURIComponent(id)}/votes`,
      HOLLO_BASE_URL
    ),
    {
      method: 'POST',
      headers: {
        Authorization: `${session.tokenType} ${session.accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ choices })
    }
  );

   if (!response.ok) {
    const errorBody = await response.text();

    console.error(
      `Hollo poll vote failed (${response.status}):`,
      errorBody
    );

    return json(
      {
        error: `Hollo returned ${response.status}: ${
          errorBody || 'No error details provided.'
        }`
      },
      { status: response.status }
    );
  }

  const poll = await response.json();

  return json({
    success: true,
    poll
  });
};
