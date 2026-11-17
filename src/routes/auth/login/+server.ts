
import { redirect } from '@sveltejs/kit';
import { createLogin } from '#lib/server/auth.js';

export function GET({ cookies }) {
redirect(302, createLogin(cookies).toString(), { external: true });
}
