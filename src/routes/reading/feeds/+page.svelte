<script lang="ts">
  import { onMount } from 'svelte';
  import { Trash2, Upload } from '@lucide/svelte';

  type Feed = {
    id: number;
    url: string;
    title: string;
    fetched_at: number;
    error: string | null;
  };

  let feeds: Feed[] = $state([]);
  let feedUrl = $state('');
  let loading = $state(false);
  let deletingFeedId = $state<number | null>(null);
  let importing = $state(false);
  let opmlInput: HTMLInputElement;
  let message = $state('');
  let error = $state('');

  async function loadFeeds() {
    const response = await fetch('/api/reading/feeds');

    if (!response.ok) {
      error = 'Unable to load subscriptions.';
      return;
    }

    const data = await response.json();
    feeds = data.feeds;
  }

  async function addFeed() {
    if (!feedUrl.trim() || loading) return;

    loading = true;
    message = '';
    error = '';

    try {
      const response = await fetch('/api/reading/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: feedUrl.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        error = data.error || 'Unable to add subscription.';
        return;
      }

      message = data.feed.error
        ? `Subscription added, but fetching failed: ${data.feed.error}`
        : `Added ${data.feed.title}`;

      feedUrl = '';
      await loadFeeds();
    } catch {
      error = 'Unable to connect to Lighthouse.';
    } finally {
      loading = false;
    }
  }

  async function removeFeed(feed: Feed) {
    if (deletingFeedId !== null) return;

    const confirmed = window.confirm(
      `Remove "${feed.title}" from your subscriptions?\n\n` +
      'Saved articles will remain in Read Later.'
    );

    if (!confirmed) return;

    deletingFeedId = feed.id;
    message = '';
    error = '';

    try {
      const response = await fetch(
        `/api/reading/feeds/${feed.id}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (!response.ok) {
        error = result.error || 'Unable to remove subscription.';
        return;
      }

      feeds = feeds.filter((item) => item.id !== feed.id);
      message = `Removed ${feed.title}`;
    } catch {
      error = 'Unable to connect to Lighthouse.';
    } finally {
      deletingFeedId = null;
    }
  }

  async function importOPML(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || importing) return;

    importing = true;
    message = '';
    error = '';

    try {
      const form = new FormData();
      form.append('file', file);

      const response = await fetch('/api/reading/import', {
        method: 'POST',
        body: form
      });

      const result = await response.json();

      if (!response.ok) {
        error = result.error || 'Unable to import OPML file.';
        return;
      }

      const parts = [
        `${result.imported} imported`,
        `${result.skipped} already subscribed`
      ];

      if (result.full > 0) {
        parts.push(`${result.full} skipped (subscription limit)`);
      }

      message = `OPML import complete: ${parts.join(', ')}.`;

      await loadFeeds();
    } catch {
      error = 'Unable to connect to Lighthouse.';
    } finally {
      importing = false;
      input.value = '';
    }
  }

  onMount(() => {
    loadFeeds();
  });
</script>

<svelte:head>
  <title>Feeds — Lighthouse</title>
</svelte:head>

<main class="reading-page">
  <div class="feeds-header">
    <h1>Feeds</h1>

    <button
      type="button"
      class="import-opml"
      disabled={importing}
      onclick={() => opmlInput?.click()}
    >
      <Upload size={16} strokeWidth={1.8} />
      {importing ? 'Importing…' : 'Import OPML'}
    </button>

    <input
      bind:this={opmlInput}
      class="opml-file-input"
      type="file"
      accept=".opml,.xml,text/xml,application/xml"
      aria-label="Choose OPML file"
      onchange={importOPML}
    />
  </div>

  <p>Manage your RSS subscriptions.</p>

  <form onsubmit={(event) => {
    event.preventDefault();
    addFeed();
  }}>
    <input
      type="url"
      bind:value={feedUrl}
      placeholder="https://example.com/feed.xml"
      aria-label="RSS feed URL"
      required
    />

    <button type="submit" disabled={loading}>
      {loading ? 'Adding…' : 'Add Feed'}
    </button>
  </form>

  {#if message}
    <p class="success">{message}</p>
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <h2>Subscriptions</h2>

  {#if feeds.length === 0}
    <p>No subscriptions yet.</p>
  {:else}
    {#each feeds as feed (feed.id)}
      <article class="feed">
        <div class="feed-heading">
          <strong>{feed.title}</strong>

          <button
            type="button"
            class="remove-feed"
            title={`Remove ${feed.title}`}
            aria-label={`Remove ${feed.title}`}
            disabled={deletingFeedId !== null}
            onclick={() => removeFeed(feed)}
          >
            <Trash2 size={17} strokeWidth={1.8} />
          </button>
        </div>

        <small>{feed.url}</small>

        {#if feed.error}
          <p class="error">{feed.error}</p>
        {/if}
      </article>
    {/each}
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

  h1, h2 {
    margin-bottom: 16px;
  }

  .feeds-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .feeds-header h1 {
    margin: 0;
  }

  .import-opml {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 10px;
    background: transparent;
    color: #f472b6;
    border: 0;
    font-weight: 500;
    white-space: nowrap;
  }

  .import-opml:hover:not(:disabled) {
    background: #302530;
  }

  .import-opml:focus-visible {
    outline: 2px solid #f472b6;
    outline-offset: 2px;
  }

  .opml-file-input {
    display: none;
  }

  form {
    display: flex;
    gap: 12px;
    margin: 24px 0;
  }

  input {
    flex: 1;
    min-width: 0;
    padding: 12px;
    background: #171717;
    border: 1px solid #404040;
    border-radius: 8px;
    color: #f5f5f5;
  }

  button {
    padding: 12px 18px;
    border: 0;
    border-radius: 8px;
    background: #f472b6;
    color: #0a0a0a;
    font-weight: 600;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.5;
    cursor: wait;
  }

  .feed {
    padding: 16px;
    margin: 12px 0;
    background: #171717;
    border-radius: 8px;
  }

  .feed-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .feed-heading strong {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .remove-feed {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    color: #a3a3a3;
    border: 1px solid transparent;
    border-radius: 8px;
  }

  .remove-feed:hover:not(:disabled) {
    background: #302530;
    color: #f472b6;
  }

  .remove-feed:focus-visible {
    outline: 2px solid #f472b6;
    outline-offset: 2px;
  }

  .feed small {
    display: block;
    margin-top: 6px;
    overflow-wrap: anywhere;
    color: #a3a3a3;
  }

  .success {
    color: #86efac;
  }

  .error {
    color: #fda4af;
  }
</style>
