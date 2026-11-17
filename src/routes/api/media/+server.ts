
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { HOLLO_BASE_URL } from '$app/env/private';
import { getSession } from '#lib/server/auth.js';

const allowedMediaTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm'
];

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

  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return json(
      { error: 'Invalid upload form.' },
      { status: 400 }
    );
  }

  const file = form.get('file');
  const description = form.get('description');

  if (!(file instanceof File)) {
  return json(
    { error: 'A media file is required.' },
    { status: 400 }
  );
}

if (!allowedMediaTypes.includes(file.type)) {
  return json(
    { error: 'Unsupported media type.' },
    { status: 400 }
  );
}

  if (file.size === 0) {
    return json(
      { error: 'The selected image is empty.' },
      { status: 400 }
    );
  }

  const uploadForm = new FormData();

  uploadForm.append('file', file, file.name);

  if (typeof description === 'string') {
    uploadForm.append('description', description);
  }

  let response: Response;

  try {
    response = await fetch(
      new URL('/api/v1/media', HOLLO_BASE_URL),
      {
        method: 'POST',
        headers: {
          Authorization: `${session.tokenType} ${session.accessToken}`,
          Accept: 'application/json'
        },
        body: uploadForm
      }
    );
  } catch {
    return json(
      { error: 'Unable to connect to Hollo.' },
      { status: 502 }
    );
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    return json(
      {
        error:
          result?.error ??
          'Hollo could not upload the media file.'
      },
      { status: response.status }
    );
  }

  return json({
    success: true,
    media: result
  });
};
