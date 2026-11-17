
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { HOLLO_BASE_URL } from '$app/env/private';
import { getSession } from '#lib/server/auth.js';

const validVisibilities = [
  'public',
  'unlisted',
  'private',
  'direct'
];

function validStatusId(id: unknown): id is string {
  return typeof id === 'string' &&
    id.trim().length > 0 &&
    id.length <= 512 &&
    !/[\/\\\u0000-\u001F]/.test(id);
}

export const POST: RequestHandler = async ({
  cookies,
  fetch,
  request
}) => {
  const session = getSession(cookies);

  if (!session) {
    return json(
      { error: 'Not authenticated.' },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);

  if (
    !body ||
    typeof body.status !== 'string' ||
    !body.status.trim()
  ) {
    return json(
      { error: 'Post text is required.' },
      { status: 400 }
    );
  }

  const visibility =
    typeof body.visibility === 'string'
      ? body.visibility
      : 'public';

  if (!validVisibilities.includes(visibility)) {
    return json(
      { error: 'Invalid post visibility.' },
      { status: 400 }
    );
  }

  const spoilerText =
    typeof body.spoiler_text === 'string'
      ? body.spoiler_text.trim()
      : '';

  if (
    body.media_ids !== undefined &&
    (
      !Array.isArray(body.media_ids) ||
      !body.media_ids.every(
        (mediaId: unknown) =>
          typeof mediaId === 'string' &&
          mediaId.trim().length > 0
      )
    )
  ) {
    return json(
      { error: 'Invalid media attachments.' },
      { status: 400 }
    );
  }

  if (
    body.in_reply_to_id !== undefined &&
    !validStatusId(body.in_reply_to_id)
  ) {
    return json(
      { error: 'Invalid reply status ID.' },
      { status: 400 }
    );
  }
  if (
    body.quoted_status_id !== undefined &&
    !validStatusId(body.quoted_status_id)
  ) {
    return json(
      { error: 'Invalid quoted status ID.' },
      { status: 400 }
    );
  }

    let poll:
    | {
        options: string[];
        expires_in: number;
        multiple: boolean;
      }
    | undefined;

  if (body.poll !== undefined) {
    const options = body.poll?.options;

    if (
      !Array.isArray(options) ||
      options.length < 2 ||
      options.length > 4 ||
      !options.every(
        (option: unknown) =>
          typeof option === 'string' &&
          option.trim().length > 0 &&
          option.trim().length <= 50
      ) ||
      new Set(
        options.map((option: string) =>
          option.trim().toLowerCase()
        )
      ).size !== options.length
    ) {
      return json(
        { error: 'Polls need 2–4 unique, non-empty options.' },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(body.poll.expires_in) ||
      body.poll.expires_in < 300 ||
      body.poll.expires_in > 604800
    ) {
      return json(
        { error: 'Poll duration must be between 5 minutes and 7 days.' },
        { status: 400 }
      );
    }

    if (typeof body.poll.multiple !== 'boolean') {
      return json(
        { error: 'Invalid poll voting mode.' },
        { status: 400 }
      );
    }

    if (
      (Array.isArray(body.media_ids) && body.media_ids.length > 0) ||
      body.in_reply_to_id ||
      body.quoted_status_id
    ) {
      return json(
        { error: 'Polls cannot be combined with media, replies or quotes.' },
        { status: 400 }
      );
    }

    poll = {
      options: options.map((option: string) => option.trim()),
      expires_in: body.poll.expires_in,
      multiple: body.poll.multiple
    };
  }

    const payload = {
    status: body.status.trim(),
    visibility,
    ...(poll ? { poll } : {}),
    spoiler_text: spoilerText,
    ...(Array.isArray(body.media_ids)
      ? { media_ids: body.media_ids }
      : {}),
    ...(body.in_reply_to_id
      ? { in_reply_to_id: body.in_reply_to_id }
      : {}),
    ...(body.quoted_status_id
      ? { quoted_status_id: body.quoted_status_id }
      : {})
  };
  const response = await fetch(
    new URL('/api/v1/statuses', HOLLO_BASE_URL),
    {
      method: 'POST',
      headers: {
        Authorization: `${session.tokenType} ${session.accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);

    return json(
      {
        error:
          errorBody?.error ||
          'Hollo could not publish the post.'
      },
      { status: response.status }
    );
  }

  return json({
    success: true,
    status: await response.json()
  });
};
