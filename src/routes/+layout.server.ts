import type { LayoutServerLoad } from './$types';
import { HOLLO_BASE_URL } from '$app/env/private';
import { getSession } from '#lib/server/auth.js';

type HolloAccount = {
  username: string;
  acct: string;
  display_name: string;
  avatar: string;
  followers_count: number;
  following_count: number;
  statuses_count: number;
};

export const load: LayoutServerLoad = async ({
  cookies,
  fetch,
  setHeaders
}) => {
  setHeaders({
    'Cache-Control': 'no-store'
  });

  const session = getSession(cookies);

  if (!session) {
    return { account: null };
  }

  const response = await fetch(
    new URL('/api/v1/accounts/verify_credentials', HOLLO_BASE_URL),
    {
      headers: {
        Authorization: `${session.tokenType} ${session.accessToken}`,
        Accept: 'application/json'
      }
    }
  );

  if (!response.ok) {
    return { account: null };
  }

  const profile = (await response.json()) as HolloAccount;

  return {
    account: {
      displayName: profile.display_name || profile.username,
      acct: profile.acct,
      avatar: profile.avatar,
      followersCount: profile.followers_count,
      followingCount: profile.following_count,
      statusesCount: profile.statuses_count
    }
  };
};
