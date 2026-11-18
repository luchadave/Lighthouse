
import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
  HOLLO_BASE_URL: {},
  HOLLO_CLIENT_ID: {},
  HOLLO_CLIENT_SECRET: {},
  HOLLO_REDIRECT_URI: {},
  HOLLO_SESSION_SECRET: {},
  LIGHTHOUSE_DATABASE_PATH: {}
});
