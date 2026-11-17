
import { redirect } from '@sveltejs/kit';
import { clearSession } from '#lib/server/auth.js';

export function POST({ cookies }) {
  clearSession(cookies);
  redirect(303, '/');
}
