
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { HOLLO_BASE_URL } from '$app/env/private';
import { getSession } from '#lib/server/auth.js';

import {
  mapStatus,
  type HolloStatus
} from '#lib/server/status.js';

const validTypes = [
  'accounts',
  'statuses',
  'hashtags'
];

export const GET: RequestHandler = async ({
  cookies,
  fetch,
  url
}) => {
  const session = getSession(cookies);

  if (!session) {
    return json(
      { error: 'Not authenticated.' },
      { status: 401 }
    );
  }

  const query = url.searchParams.get('q')?.trim();

  if (!query || query.length > 200) {
    return json(
      { error: 'A search query is required.' },
      { status: 400 }
    );
  }

  const type = url.searchParams.get('type');

  if (type && !validTypes.includes(type)) {
    return json(
      { error: 'Invalid search type.' },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    q: query,
    limit: '20'
  });

  if (type) {
    params.set('type', type);
  }

  const response = await fetch(
    new URL(
      `/api/v2/search?${params.toString()}`,
      HOLLO_BASE_URL
    ),
    {
      headers: {
        Authorization: `${session.tokenType} ${session.accessToken}`,
        Accept: 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);

    return json(
      {
        error:
          errorBody?.error ||
          'Hollo could not complete the search.'
      },
      { status: response.status }
    );
  }

    const profileResponse = await fetch(
    new URL(
      '/api/v1/accounts/verify_credentials',
      HOLLO_BASE_URL
    ),
    {
      headers: {
        Authorization: `${session.tokenType} ${session.accessToken}`,
        Accept: 'application/json'
      }
    }
  );

  if (!profileResponse.ok) {
    return json(
      { error: 'Could not verify your Hollo account.' },
      { status: 502 }
    );
  }


const profile = await profileResponse.json() as { id: string };
const results = await response.json();

console.log('Search diagnostic:', {
  type,
  resultKeys: Object.keys(results),
  hashtagCount: results.hashtags?.length,
  hashtags: results.hashtags
});

const accounts = results.accounts ?? [];
let relationships: {
  id: string;
  following: boolean;
  requested: boolean;
}[] = [];

if (accounts.length > 0) {
  const relationshipParams = new URLSearchParams();

  for (const account of accounts) {
    relationshipParams.append('id[]', account.id);
  }

  const relationshipResponse = await fetch(
    new URL(
      `/api/v1/accounts/relationships?${relationshipParams.toString()}`,
      HOLLO_BASE_URL
    ),
    {
      headers: {
        Authorization: `${session.tokenType} ${session.accessToken}`,
        Accept: 'application/json'
      }
    }
  );

  if (!relationshipResponse.ok) {
    return json(
      { error: 'Could not retrieve account relationships.' },
      { status: relationshipResponse.status }
    );
  }

  relationships = await relationshipResponse.json();
}

const relationshipMap = new Map(
  relationships.map(relationship => [relationship.id, relationship])
);

return json(
  {
    ...results,
    accounts: accounts.map((account: { id: string }) => ({
      ...account,
      relationship: relationshipMap.get(account.id) ?? null
    })),
    statuses: (results.statuses ?? []).map(
      (status: HolloStatus) => mapStatus(status, profile.id)
    )
  },
  {
    headers: {
      'Cache-Control': 'no-store'
    }
  }
);

};
