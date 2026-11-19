<script lang="ts">
  import { onMount } from 'svelte';

  type Article = {
    id: number;
    source: string;
    url: string;
    title: string;
    published: number | null;
    fetched_at: number;
    read: number;
    saved: number;
    excerpt: string;
  };

  let articles: Article[] = $state([]);
  let loading = $state(true);
  let error = $state('');
  type Bookmark = {
  id: string;
  name: string;
  handle: string;
  time: string;
  content: string;
  postUrl: string | null;
  bookmarked: boolean;
  mediaAttachments: {
    id: string;
    type: string;
    url: string;
    preview_url?: string;
    description?: string | null;
  }[];
};

let bookmarks: Bookmark[] = $state([]);
let bookmarksError = $state('');
let removingItems: string[] = $state([]);
let removalError = $state('');

async function removeSavedItem(
  kind: 'rss' | 'fediverse',
  id: number | string
) {
  const key = `${kind}-${id}`;

  if (removingItems.includes(key)) return;

  removingItems = [...removingItems, key];
  removalError = '';

  try {
    const response = kind === 'rss'
      ? await fetch(
          `/api/reading/articles/${id}/actions`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'saved',
              value: false
            })
          }
        )
      : await fetch(
          `/api/statuses/${encodeURIComponent(String(id))}/bookmark`,
          { method: 'DELETE' }
        );

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(
        result?.error || 'Unable to remove saved item.'
      );
    }

    if (kind === 'rss') {
      articles = articles.filter((article) => article.id !== id);
    } else {
      bookmarks = bookmarks.filter((bookmark) => bookmark.id !== id);
    }
  } catch (err) {
    removalError = err instanceof Error
      ? err.message
      : 'Unable to remove saved item.';
  } finally {
    removingItems = removingItems.filter((item) => item !== key);
  }
}
type SavedItem =
  | { kind: 'rss'; key: string; timestamp: number; article: Article }
  | { kind: 'fediverse'; key: string; timestamp: number; bookmark: Bookmark };

let savedItems = $derived.by((): SavedItem[] => {
  const rssItems: SavedItem[] = articles.map((article) => ({
    kind: 'rss',
    key: `rss-${article.id}`,
    timestamp: article.published ?? article.fetched_at,
    article
  }));

  const fediverseItems: SavedItem[] = bookmarks.map((bookmark) => ({
    kind: 'fediverse',
    key: `fediverse-${bookmark.id}`,
    timestamp: new Date(bookmark.time).getTime(),
    bookmark
  }));

  return [...rssItems, ...fediverseItems].sort(
    (a, b) => b.timestamp - a.timestamp
  );
});

  function articleDate(article: Article): string {
    return new Date(
      article.published ?? article.fetched_at
    ).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  onMount(async () => {
    try {
      const response = await fetch('/api/reading/saved');

      if (!response.ok) {
        error = 'Unable to load saved articles.';
        return;
      }

      const data = await response.json();
      articles = data.articles;
      try {
  const bookmarksResponse = await fetch('/api/bookmarks');

  if (bookmarksResponse.ok) {
    const bookmarksData = await bookmarksResponse.json();
    bookmarks = bookmarksData.posts;
  } else {
    bookmarksError = 'Unable to load Hollo bookmarks.';
  }
} catch {
  bookmarksError = 'Unable to connect to Hollo bookmarks.';
}
    } catch {
      error = 'Unable to connect to Lighthouse.';
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Read Later — Lighthouse</title>
</svelte:head>

<main class="reading-page">
  <header>
    <h1>Read Later</h1>
    <p>Articles and posts you've saved for later.</p>
  </header>

  {#if loading}
    <p>Loading saved items…</p>
  {:else}
    {#if error}
      <p class="error">{error}</p>
    {/if}

    {#if bookmarksError}
      <p class="error">{bookmarksError}</p>
    {/if}

    {#if removalError}
      <p class="error" role="alert">{removalError}</p>
    {/if}

    {#if savedItems.length === 0}
      {#if !error && !bookmarksError}
        <div class="empty-state">
          <p>Nothing saved yet.</p>
          <a href="/reading/articles">Browse articles</a>
        </div>
      {/if}
    {:else}
      <div class="article-list">
        {#each savedItems as item (item.key)}
          {#if item.kind === 'rss'}
            <article class="article-card">
              <div class="metadata">
                <span class="source">RSS · {item.article.source}</span>
                <span>{articleDate(item.article)}</span>
              </div>

              <h2>
                <a href={`/reading/articles/${item.article.id}`}>
                  {item.article.title}
                </a>
              </h2>

              <div class="article-footer">
                <span class:unread={!item.article.read} class="status">
                  <span aria-hidden="true">
                    {item.article.read ? '✓' : '●'}
                  </span>
                  {item.article.read ? 'Read' : 'Unread'}
                </span>

                <a
                  href={item.article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View original
                </a>

                <button
                  type="button"
                  class="remove-button"
                  disabled={removingItems.includes(item.key)}
                  onclick={() => removeSavedItem('rss', item.article.id)}
                >
                  {removingItems.includes(item.key)
                    ? 'Removing…'
                    : 'Remove'}
                </button>
              </div>
            </article>
          {:else}
            <article class="article-card">
              <div class="metadata">
                <span class="source">
                  Fediverse · {item.bookmark.name}
                </span>
                <span>
                  {new Date(item.bookmark.time).toLocaleDateString()}
                </span>
              </div>

              <p class="bookmark-handle">
                {item.bookmark.handle}
              </p>

              <div class="bookmark-content">
                {@html item.bookmark.content}
              </div>

              {#if item.bookmark.mediaAttachments?.length}
                <div class="bookmark-media">
                  {#each item.bookmark.mediaAttachments as media (media.id)}
                    {#if media.type === 'image'}
                      <a
                        href={media.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="bookmark-image-link"
                        aria-label={media.description || 'View full-size image'}
                      >
                        <img
                          src={media.preview_url || media.url}
                          alt={media.description || ''}
                          loading="lazy"
                        />
                      </a>
                    {/if}
                  {/each}
                </div>
              {/if}

              <div class="article-footer">
                {#if item.bookmark.postUrl}
                  <a
                    href={item.bookmark.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View original post
                  </a>
                {/if}

                <button
                  type="button"
                  class="remove-button"
                  disabled={removingItems.includes(item.key)}
                  onclick={() => removeSavedItem('fediverse', item.bookmark.id)}
                >
                  {removingItems.includes(item.key)
                    ? 'Removing…'
                    : 'Remove'}
                </button>
              </div>
            </article>
          {/if}
        {/each}
      </div>
    {/if}
  {/if}
</main>

<style>
  :global(body) {
    background: #0a0a0a;
    color: #f5f5f5;
  }

  .reading-page {
    max-width: 760px;
    margin: 48px auto;
    padding: 24px;
    font-family: Manrope, sans-serif;
  }

  header {
    margin-bottom: 32px;
  }

  h1 {
    margin-bottom: 8px;
  }

  header p,
  .metadata {
    color: #a3a3a3;
  }

  .article-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .article-card {
    padding: 24px;
    background: #171717;
    border: 1px solid #292929;
    border-radius: 12px;
  }

  .metadata {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 0.85rem;
  }

  .source {
    color: #f472b6;
  }

  h2 {
    margin: 12px 0 20px;
    font-size: 1.2rem;
    line-height: 1.4;
  }

  a {
    color: #f472b6;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  .article-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    font-size: 0.85rem;
  }

 .status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #242424;
  border: 1px solid #333333;
  border-radius: 8px;
  color: #a3a3a3;
  font-size: 0.85rem;
  font-weight: 600;
}

.status.unread {
  background: #241b30;
  border-color: #6b3f86;
  color: #c084fc;
}

  .empty-state {
    padding: 32px;
    background: #171717;
    border-radius: 12px;
  }

  .error {
    color: #fda4af;
  }

.bookmark-handle {
  margin: 8px 0 16px;
  color: #a3a3a3;
  font-size: 0.85rem;
}

.bookmark-content {
  margin-bottom: 20px;
  color: #d4d4d4;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.bookmark-content :global(p) {
  margin: 0 0 12px;
}

.bookmark-content :global(a) {
  color: #f472b6;
}

.bookmark-media {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 16px 0 20px;
}

.bookmark-image-link {
  display: block;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid #333333;
  background: #0a0a0a;
}

.bookmark-image-link img {
  display: block;
  width: 100%;
  height: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

.bookmark-image-link:hover {
  border-color: #c084fc;
}

.bookmark-image-link:focus-visible {
  outline: 2px solid #c084fc;
  outline-offset: 3px;
}

.remove-button {
  margin-left: auto;
  padding: 7px 12px;
  border: 1px solid #404040;
  border-radius: 8px;
  background: #242424;
  color: #d4d4d4;
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.remove-button:hover:not(:disabled) {
  border-color: #f472b6;
  color: #f472b6;
}

.remove-button:disabled {
  opacity: 0.5;
  cursor: wait;
}

</style>
