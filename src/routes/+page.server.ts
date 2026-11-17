import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import sanitizeHtml from 'sanitize-html';

import { HOLLO_BASE_URL } from '$app/env/private';
import { getSession } from '#lib/server/auth.js';
import {
  mapStatus,
  plainText,
  type HolloStatus
} from '#lib/server/status.js';

type HolloAccount = {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  avatar: string;
  header: string;
  url: string;
  note: string;
  created_at: string;
  followers_count: number;
  following_count: number;
  statuses_count: number;
  fields: {
    name: string;
    value: string;
    verified_at: string | null;
  }[];
};

type HolloNotification = {
  id: string;
  type: string;
  created_at: string;
  account: {
    id: string;
    username: string;
    acct: string;
    display_name: string;
    avatar: string;
    url: string;
  };
  status?: {
    id: string;
    content: string;
    created_at: string;
    url: string | null;
  } | null;
  emoji?: string;
  emoji_url?: string;
};

type HolloFollowRequest = {
  id: string;
};

export const load: PageServerLoad = async ({
  cookies,
  fetch,
  setHeaders
}) => {
  setHeaders({
    'Cache-Control': 'no-store'
  });

  const session = getSession(cookies);

  if (!session) {
    return {
      account: null,
      posts: [],
      profilePosts: [],
      notifications: []
    };
  }

  const headers = {
    Authorization: `${session.tokenType} ${session.accessToken}`,
    Accept: 'application/json'
  };

  const [
    accountResponse,
    timelineResponse,
    notificationsResponse,
    followRequestsResponse
  ] = await Promise.all([
    fetch(
      new URL('/api/v1/accounts/verify_credentials', HOLLO_BASE_URL),
      { headers }
    ),
    fetch(
      new URL('/api/v1/timelines/home?limit=20', HOLLO_BASE_URL),
      { headers }
    ),
    fetch(
      new URL('/api/v1/notifications?limit=20', HOLLO_BASE_URL),
      { headers }
    ),
    fetch(
      new URL('/api/v1/follow_requests?limit=80', HOLLO_BASE_URL),
      { headers }
    )
  ]);

  if (
    accountResponse.status === 401 ||
    accountResponse.status === 403 ||
    timelineResponse.status === 401 ||
    timelineResponse.status === 403 ||
    notificationsResponse.status === 401 ||
    notificationsResponse.status === 403 ||
    followRequestsResponse.status === 401 ||
    followRequestsResponse.status === 403
  ) {
    return {
      account: null,
      posts: [],
      profilePosts: [],
      notifications: []
    };
  }

  if (
    !accountResponse.ok ||
    !timelineResponse.ok ||
    !notificationsResponse.ok ||
    !followRequestsResponse.ok
  ) {
    throw error(502, 'Unable to load data from Hollo.');
  }

  const profile = (await accountResponse.json()) as HolloAccount;

  const profilePostsResponse = await fetch(
    new URL(
      `/api/v1/accounts/${profile.id}/statuses?limit=20&exclude_reblogs=true`,
      HOLLO_BASE_URL
    ),
    { headers }
  );

  const profileStatuses = profilePostsResponse.ok
    ? (await profilePostsResponse.json()) as HolloStatus[]
    : [];

  const statuses = (await timelineResponse.json()) as HolloStatus[];
  const notifications = (await notificationsResponse.json()) as HolloNotification[];
  const followRequests = (await followRequestsResponse.json()) as HolloFollowRequest[];

  const pendingFollowRequestIds = new Set(
    followRequests.map(request => request.id)
  );

  const filteredNotifications = notifications.filter(notification =>
    notification.type !== 'follow_request' ||
    pendingFollowRequestIds.has(notification.account.id)
  );

  const posts = statuses.map(status =>
    mapStatus(status, profile.id)
  );

  const profilePosts = profileStatuses.map(status =>
    mapStatus(status, profile.id)
  );

  const nextLink = timelineResponse.headers.get('link');
  const nextUrl = nextLink?.match(/<([^>]+)>;\\s*rel="next"/)?.[1];

  const nextMaxId = nextUrl
    ? new URL(nextUrl).searchParams.get('max_id')
    : null;

    return {
    account: {
      id: profile.id,
      displayName: profile.display_name || profile.username,
      username: profile.username,
      acct: profile.acct,
      avatar: profile.avatar,
      header: profile.header,
      url: profile.url,
      note: plainText(profile.note),
      createdAt: profile.created_at,
      followersCount: profile.followers_count,
      followingCount: profile.following_count,
      statusesCount: profile.statuses_count,
      fields: profile.fields.map((field) => ({
        ...field,
        value: sanitizeHtml(field.value, {
          allowedTags: ['a', 'p', 'br', 'strong', 'em'],
          allowedAttributes: {
            a: ['href', 'title', 'rel']
          },
          allowedSchemes: ['http', 'https', 'mailto']
        })
      }))
    },
    posts,
    profilePosts,
    nextMaxId,
    notifications: filteredNotifications
  };
};
