<script lang="ts">
  const favicon = '/lighthouse-favicon.svg';
  import { page } from '$app/state';
  import type { LayoutProps } from './$types';

  import LighthouseSidebar from '#lib/components/lighthouse/LighthouseSidebar.svelte';
  import ProfileSummary from '#lib/components/lighthouse/ProfileSummary.svelte';
  import ReadLaterPanel from '#lib/components/lighthouse/ReadLaterPanel.svelte';

  let { data, children }: LayoutProps = $props();

  let isReadingPage = $derived(
    page.url.pathname.startsWith('/reading/')
  );
</script>

<svelte:head>
  <link rel="me" href="https://fedi.davewinter.link/@dw" />
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="lighthouse-shell">
    <LighthouseSidebar
      account={data.account}
      activeNav=""
      hasNewNotifications={false}
    />

    <main class="lighthouse-main">
      {@render children()}
    </main>

    <aside class="lighthouse-right">
      <ProfileSummary account={data.account} />
      <ReadLaterPanel />
    </aside>
</div>

<style>
  :global(body) {
    margin: 0;
    background: #0a0a0a;
    color: #f5f5f5;
    font-family: Manrope, sans-serif;
    font-size: 14px;
  }

  :global(button) {
    font: inherit;
  }

  .lighthouse-shell {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 252px minmax(0, 1fr) 280px;
    background: #0a0a0a;
    color: #f5f5f5;
  }

  .lighthouse-main {
    min-width: 0;
    min-height: 100vh;
    padding: 42px 46px;
  }

  .lighthouse-right {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
    padding: 46px 20px 24px 0;
    box-sizing: border-box;
  }

  @media (max-width: 1100px) {
    .lighthouse-shell {
      grid-template-columns: 252px minmax(0, 1fr);
    }

    .lighthouse-right {
      display: none;
    }
  }

  @media (max-width: 900px) {
    .lighthouse-shell {
      grid-template-columns: 210px minmax(0, 1fr);
    }

    .lighthouse-main {
      padding: 35px 25px;
    }
  }

  @media (max-width: 650px) {
    .lighthouse-shell {
      display: block;
      padding-bottom: 68px;
    }

    .lighthouse-main {
      padding: 0 14px 25px;
    }
  }
</style>
