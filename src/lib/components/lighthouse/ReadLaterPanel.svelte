
<script lang="ts">
  import { onMount } from 'svelte';

  type ReadLaterPreviewItem = {
    key: string;
    kind: 'rss' | 'fediverse';
    title: string;
    source: string;
    timestamp: number;
    href: string;
    unread: boolean;
  };

  type SavedArticle = {
    id: number;
    title: string;
    source: string;
    published: number | null;
    fetched_at: number;
    read: number;
  };

  type Bookmark = {
    id: string;
    name: string;
    content: string;
    time: string;
    postUrl: string | null;
    mediaAttachments?: {
      type: string;
    }[];
  };

  let readLaterPreview = $state<ReadLaterPreviewItem[]>([]);
  let readLaterLoading = $state(true);
  let readLaterError = $state('');

  async function loadReadLaterPreview() {
    readLaterLoading = true;
    readLaterError = '';

    try {
      const [rssResult, fediverseResult] = await Promise.allSettled([
        fetch('/api/reading/saved').then(async (response) => {
          if (!response.ok) throw new Error('RSS request failed');
          return response.json();
        }),
        fetch('/api/bookmarks').then(async (response) => {
          if (!response.ok) throw new Error('Fediverse request failed');
          return response.json();
        })
      ]);

      const items: ReadLaterPreviewItem[] = [];

      if (rssResult.status === 'fulfilled') {
        const articles: SavedArticle[] = rssResult.value.articles ?? [];

        for (const article of articles) {
          items.push({
            key: `rss-${article.id}`,
            kind: 'rss',
            title: article.title,
            source: article.source,
            timestamp: article.published ?? article.fetched_at,
            href: `/reading/articles/${article.id}`,
            unread: !article.read
          });
        }
      }

      if (fediverseResult.status === 'fulfilled') {
        const bookmarks: Bookmark[] = fediverseResult.value.posts ?? [];

        for (const bookmark of bookmarks) {
          const plainText = bookmark.content
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          const title = plainText || (
            bookmark.mediaAttachments?.some(
              (media) => media.type === 'image'
            )
              ? 'Photo post'
              : bookmark.mediaAttachments?.length
                ? 'Media post'
                : 'Saved Fediverse post'
          );

          items.push({
            key: `fediverse-${bookmark.id}`,
            kind: 'fediverse',
            title,
            source: bookmark.name,
            timestamp: new Date(bookmark.time).getTime(),
            href: bookmark.postUrl || '/reading/saved',
            unread: false
          });
        }
      }

      readLaterPreview = items
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 3);

      if (
        rssResult.status === 'rejected' ||
        fediverseResult.status === 'rejected'
      ) {
        readLaterError = 'Some saved items could not be loaded.';
      }
    } catch {
      readLaterError = 'Unable to load saved items.';
    } finally {
      readLaterLoading = false;
    }
  }

  onMount(() => {
    void loadReadLaterPreview();
  });
</script>

<aside class="read-later-panel" aria-label="Read Later">
  <div class="read-later-heading">
    <h2>Read Later</h2>
    <a href="/reading/saved">View all</a>
  </div>

  <p class="read-later-description">
    Your recently saved articles and posts.
  </p>

  <div class="read-later-preview">
    {#if readLaterLoading}
      <p>Loading saved items…</p>
    {:else if readLaterPreview.length > 0}
      <div class="read-later-items">
        {#each readLaterPreview as item (item.key)}
          <div class="read-later-item">
            <span class="read-later-source">
              {item.kind === 'rss' ? 'RSS' : 'Fediverse'} · {item.source}
            </span>

            <a
              href={item.href}
              target={item.kind === 'fediverse' ? '_blank' : undefined}
              rel={item.kind === 'fediverse'
                ? 'noopener noreferrer'
                : undefined}
              class="read-later-title"
            >
              {item.title}
            </a>
          </div>
        {/each}
      </div>
    {:else}
      <p>No saved items yet.</p>
    {/if}

    {#if readLaterError}
      <p class="read-later-error">{readLaterError}</p>
    {/if}
  </div>
</aside>

<style>
  .read-later-panel {
  min-width: 0;
  padding: 16px;
  background: #171717;
  border: 1px solid #292929;
  border-radius: 12px;
}

  .read-later-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .read-later-heading h2 {
    margin: 0;
    color: #f5f5f5;
    font-size: 17px;
    font-weight: 700;
  }

  .read-later-heading a {
    color: #f472b6;
    font-size: 12px;
    text-decoration: none;
  }

  .read-later-heading a:hover {
    text-decoration: underline;
  }

  .read-later-description {
  margin: 10px 0 16px;
  color: #a3a3a3;
  font-size: 12px;
  line-height: 1.5;
}

  .read-later-preview {
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #a3a3a3;
  font-size: 13px;
  line-height: 1.5;
}

  .read-later-preview p {
    margin: 0;
  }

  .read-later-items {
    display: flex;
    flex-direction: column;
  }

  .read-later-item {
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 12px 0;
    border-bottom: 1px solid #303030;
  }

  .read-later-item:first-child {
    padding-top: 0;
  }

  .read-later-item:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .read-later-source {
    color: #a3a3a3;
    font-size: 11px;
  }

  .read-later-title {
    color: #f5f5f5;
    text-decoration: none;
    font-size: 13px;
    line-height: 1.5;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }

  .read-later-title:hover {
    color: #f472b6;
  }

  .read-later-error {
    margin-top: 12px !important;
    color: #f472b6;
    font-size: 12px;
  }

  @media (max-width: 1100px) {
    .read-later-panel {
      display: none;
    }
  }
</style>
