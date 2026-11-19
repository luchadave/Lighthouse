import type { Handle } from '@sveltejs/kit/hooks';
import { startScheduler } from '#lib/server/rss/feeds.js';

export const handle: Handle = async ({ event, resolve }) => {
  startScheduler();

  return resolve(event);
};
