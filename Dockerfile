FROM node:24-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN HOLLO_BASE_URL=https://example.invalid HOLLO_CLIENT_ID=build-placeholder HOLLO_CLIENT_SECRET=build-placeholder HOLLO_REDIRECT_URI=https://example.invalid/auth/callback HOLLO_SESSION_SECRET=build-placeholder LIGHTHOUSE_DATABASE_PATH=/tmp/lighthouse-build-sessions.db LIGHTHOUSE_RSS_DATABASE_PATH=/tmp/lighthouse-build-rss.db npm run build
RUN npm prune --omit=dev --ignore-scripts

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node", "build"]
