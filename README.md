<p align="center">
  <img src="static/noctiluna-mark.svg" alt="Noctiluna moon over water logo" width="80">
</p>

# Noctiluna Client

A personal web client for [Hollo](https://github.com/fedify-dev/hollo), with a single-column feed, compact sidebar, and quiet dark interface.

Styled in the [Noctiluna colour scheme](https://github.com/luchadave/noctiluna-colourscheme), with dark backgrounds, soft light text, and pink accents. A moon over water logo completes the header and favicon.

## Project scope

I built Noctiluna for my own use. If it suits you too, you are welcome to use it, adapt it, or fork it.

The feature set is intentionally limited to what I need. There is no commitment to ongoing feature development, support, or a release schedule.

Each deployment connects to one configured Hollo instance. Compatibility with other Fediverse servers has not been established.

## Features

- Single-column home feed with sidebar navigation.
- Images, video playback, link previews, and polls.
- Posting, replying, editing, and deleting your own posts.
- Reposts, favourites, and bookmarks.
- Search, following, list timelines, and followed hashtag timelines.
- OAuth sign-in with PKCE and server-side SQLite sessions.
- Noctiluna branding and an app version link in the account menu.

## Technology

Built with SvelteKit 3, Svelte 5, TypeScript, Vite, SQLite through `better-sqlite3`, and Lucide icons. Production builds use the SvelteKit Node adapter.

## Getting started

You need a Hollo instance, OAuth application credentials, and Node.js with npm. The initial build was verified with Node.js 22.23.1.

```sh
git clone https://github.com/luchadave/Noctiluna-client.git
cd Noctiluna-client
npm ci
```

Register an OAuth application on your Hollo instance with scopes `read write follow` and this development redirect URI:

```text
http://localhost:5173/auth/callback
```

Create `.env.local` in the project root:

```dotenv
HOLLO_BASE_URL=https://your-hollo-instance.example
HOLLO_CLIENT_ID=your-client-id
HOLLO_CLIENT_SECRET=your-client-secret
HOLLO_REDIRECT_URI=http://localhost:5173/auth/callback
NOCTILUNA_DATABASE_PATH=./data/noctiluna.db
```

The redirect URI must exactly match the registered application. The database path defaults to `./data/noctiluna.db` if omitted.

`HOLLO_SESSION_SECRET` remains declared in the source but is not used by the current SQLite session implementation.

Start the development server:

```sh
npm run dev
```

Open `http://localhost:5173` and sign in through Hollo.

## Checks and production builds

```sh
npm run check
npm run build
```

The Node adapter produces the application in `build/`. See the [SvelteKit Node adapter documentation](https://svelte.dev/docs/kit/adapter-node) for runtime and reverse proxy configuration.

For production:

- Register the public HTTPS callback URL and update `HOLLO_REDIRECT_URI`.
- Supply the environment variables to the Node process and configure the public origin.
- Keep the SQLite database on persistent storage with a writable parent directory.

Development environment files are not automatically loaded by the production Node server.

The database contains session access tokens and should remain private. Environment files, the default `data/` directory, and build output are excluded from Git.

## License

[MIT](LICENSE) — Copyright (c) 2026 Dave Winter.

Third-party dependencies retain their respective licenses.
