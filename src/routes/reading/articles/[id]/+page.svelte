<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';

  type Article = {
    id: number;
    source: string;
    url: string;
    title: string;
    content: string;
    published: number | null;
    fetched_at: number;
    saved: number;
    read: number;
  };

  let article: Article | null = $state(null);
  let loading = $state(true);
  let error = $state('');
  let actionLoading = $state(false);
let actionError = $state('');

async function updateArticle(action: 'read' | 'saved', value: boolean) {
  if (!article || actionLoading) return;

  actionLoading = true;
  actionError = '';

  try {
    const response = await fetch(
      `/api/reading/articles/${article.id}/actions`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, value })
      }
    );

    if (!response.ok) {
      actionError = 'Unable to update article.';
      return;
    }

    const data = await response.json();

    article = {
      ...article,
      read: data.article.read,
      saved: data.article.saved
    };
  } catch {
    actionError = 'Unable to connect to Lighthouse.';
  } finally {
    actionLoading = false;
  }
}

  function articleDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  onMount(async () => {
    try {
      const response = await fetch(
  `/api/reading/articles/${encodeURIComponent(page.params.id ?? '')}`
);

      if (!response.ok) {
        error = response.status === 404
          ? 'Article not found.'
          : 'Unable to load article.';
        return;
      }

      const data = await response.json();
      article = data.article;
    } catch {
      error = 'Unable to connect to Lighthouse.';
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>{article?.title ?? 'Article'} — Lighthouse</title>
</svelte:head>

<main class="reader">
  <nav>
    <a class="back-link" href="/reading/articles">
      <span aria-hidden="true">←</span>
      <span>All Articles</span>
    </a>
  </nav>

  {#if loading}
    <p>Loading article…</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if article}
    <article>
      <header>
        <p class="source">{article.source}</p>

        <h1>{article.title}</h1>

        <p class="date">
          {articleDate(article.published ?? article.fetched_at)}
        </p>
      </header>

<div class="article-actions">
  <button
    type="button"
    disabled={actionLoading}
    onclick={() => article && updateArticle('read', !article.read)}
  >
    {article.read ? 'Mark as Unread' : 'Mark as Read'}
  </button>

  <button
    type="button"
    class:saved={Boolean(article.saved)}
    disabled={actionLoading}
    onclick={() => article && updateArticle('saved', !article.saved)}
  >
    {article.saved ? 'Remove from Read Later' : 'Save to Read Later'}
  </button>
</div>

{#if actionError}
  <p class="action-error" role="alert">{actionError}</p>
{/if}

      <div class="article-content">
        {#each article.content.split(/\n\s*\n/) as paragraph}
          {#if paragraph.trim()}
            <p>{paragraph.trim()}</p>
          {/if}
        {/each}
      </div>

      <footer>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          View original article
        </a>
      </footer>
    </article>
  {/if}
</main>

<style>
  :global(body) {
    background: #0a0a0a;
    color: #f5f5f5;
  }

  .reader {
    max-width: 780px;
    margin: 48px auto;
    padding: 24px;
  }

  nav {
    margin-bottom: 48px;
    font-family: Manrope, sans-serif;
  }

  a {
    color: #f472b6;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  header {
    margin-bottom: 40px;
  }

  .source {
    color: #f472b6;
    font-family: Manrope, sans-serif;
    font-size: 0.9rem;
    font-weight: 600;
  }

  h1 {
    margin: 16px 0;
    font-family: 'Source Serif 4', Georgia, serif;
    font-size: clamp(2rem, 5vw, 3rem);
    line-height: 1.2;
  }

  .date {
    color: #a3a3a3;
    font-family: Manrope, sans-serif;
    font-size: 0.9rem;
  }

  .article-content {
    font-family: 'Source Serif 4', Georgia, serif;
    font-size: 1.2rem;
    line-height: 1.85;
    overflow-wrap: anywhere;
  }

  .article-content p {
    margin-bottom: 1.5em;
  }

  footer {
    margin-top: 48px;
    padding-top: 24px;
    border-top: 1px solid #292929;
    font-family: Manrope, sans-serif;
  }

  .error {
    color: #fda4af;
  }

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: #171717;
  border: 1px solid #333333;
  border-radius: 8px;
  color: #f5f5f5;
  font-family: Manrope, sans-serif;
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.2s, border-color 0.2s;
}

.back-link span:first-child {
  color: #f472b6;
  font-size: 1.2rem;
  line-height: 1;
}

.back-link:hover {
  background: #242024;
  border-color: #f472b6;
  text-decoration: none;
}

.back-link:focus-visible {
  outline: 2px solid #f472b6;
  outline-offset: 3px;
}
.article-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 36px;
}

.article-actions button {
  padding: 10px 16px;
  background: #171717;
  border: 1px solid #333333;
  border-radius: 8px;
  color: #f5f5f5;
  font-family: Manrope, sans-serif;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.article-actions button:hover:not(:disabled) {
  background: #242024;
  border-color: #f472b6;
}

.article-actions button.saved {
  color: #f472b6;
  border-color: #f472b6;
}

.article-actions button:focus-visible {
  outline: 2px solid #f472b6;
  outline-offset: 3px;
}

.article-actions button:disabled {
  opacity: 0.5;
  cursor: wait;
}

.action-error {
  color: #fda4af;
  font-family: Manrope, sans-serif;
}
</style>
