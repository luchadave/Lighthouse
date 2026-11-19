<script lang="ts">
  import { onMount } from 'svelte';

  type Article = {
    id: number;
    feed_id: number | null;
    source: string;
    url: string;
    title: string;
    published: number | null;
    fetched_at: number;
    saved: number;
    read: number;
    excerpt: string;
  };

  let articles: Article[] = $state([]);
  let loading = $state(true);
  let error = $state('');

  function articleDate(article: Article): string {
    const timestamp = article.published ?? article.fetched_at;

    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function plainText(html: string): string {
    if (typeof DOMParser === 'undefined') return '';
    const document = new DOMParser().parseFromString(html, 'text/html');
    return document.body.textContent?.trim() ?? '';
  }

  onMount(async () => {
    try {
      const response = await fetch('/api/reading/articles');

      if (!response.ok) {
        error = 'Unable to load articles.';
        return;
      }

      const data = await response.json();
      articles = data.articles;
    } catch {
      error = 'Unable to connect to Lighthouse.';
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>All Articles — Lighthouse</title>
</svelte:head>

<main class="reading-page">
  <header>
    <h1>All Articles</h1>
    <p>Latest stories from your RSS subscriptions.</p>
  </header>

  {#if loading}
    <p>Loading articles…</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if articles.length === 0}
    <p>No articles yet. Add a feed to get started.</p>
    <a href="/reading/feeds">Manage feeds</a>
  {:else}
    <div class="article-list">
      {#each articles as article (article.id)}
        <article class="article-card">
          <div class="metadata">
            <span>{article.source}</span>
            <span>{articleDate(article)}</span>
          </div>

        <h2>
  <a href={`/reading/articles/${article.id}`}>
    {article.title}
  </a>
</h2>

          <p class="excerpt">{plainText(article.excerpt)}</p>

          <a
            class="read-link"
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Read original
          </a>
        </article>
      {/each}
    </div>
  {/if}
</main>

<style>
  :global(body) {
    background: #0a0a0a;
    color: #f5f5f5;
  }

  .reading-page {
    max-width: 760px;
    margin: 0 auto;
    padding: 0;
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
    gap: 16px;
    font-size: 0.85rem;
  }

  h2 {
    margin: 12px 0;
    font-size: 1.25rem;
    line-height: 1.4;
  }

  a {
    color: #f472b6;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  .excerpt {
    color: #d4d4d4;
    line-height: 1.6;
    margin-bottom: 16px;
  }

  .read-link {
    font-size: 0.9rem;
    font-weight: 600;
  }

  .error {
    color: #fda4af;
  }
</style>
