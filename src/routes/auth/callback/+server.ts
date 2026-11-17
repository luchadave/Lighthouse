
import { redirect, error } from '@sveltejs/kit';
import { completeLogin } from '#lib/server/auth.js';

export async function GET({ url, cookies }) {
  const oauthError = url.searchParams.get('error');

  if (oauthError) {
    throw error(400, 'Hollo authorization was declined or could not be completed.');
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    throw error(400, 'Hollo did not return the required authorization details.');
  }

  await completeLogin(cookies, code, state);

  redirect(303, '/');
}
