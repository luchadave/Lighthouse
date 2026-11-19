<script module lang="ts">



</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Snippet } from 'svelte';

  type Profile = {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    bio: string;
  };

  type Props = {
    accountId: string;
    name: string;
    handle: string;
    avatar: string;
    children: Snippet;
  };

  let { accountId, name, handle, avatar, children }: Props = $props();

  const cache = new Map<string, {
    profile: Profile;
    expires: number;
  }>();

  let visible = $state(false);
  let profile = $state<Profile | null>(null);

  let hoverTimer: ReturnType<typeof setTimeout> | undefined;
  let requestController: AbortController | undefined;

  function startHover() {
    if (!accountId || !window.matchMedia('(hover: hover)').matches) {
      return;
    }

    clearTimeout(hoverTimer);

    hoverTimer = setTimeout(() => {
      visible = true;
      void loadProfile();
    }, 300);
  }

  function endHover() {
    clearTimeout(hoverTimer);
    requestController?.abort();
    visible = false;
  }

  async function loadProfile() {
    const cached = cache.get(accountId);

    if (cached && cached.expires > Date.now()) {
      profile = cached.profile;
      return;
    }

    profile = null;
    requestController?.abort();
    const controller = new AbortController();
    requestController = controller;

    try {
      const response = await fetch(
        `/api/accounts/${encodeURIComponent(accountId)}/preview`,
        { signal: controller.signal }
      );

      if (!response.ok) return;

      const result: Profile = await response.json();

      if (controller.signal.aborted) return;

      cache.set(accountId, {
        profile: result,
        expires: Date.now() + 300_000
      });

      profile = result;
    } catch {
      // The regular profile link remains available.
    }
  }

  onDestroy(() => {
    clearTimeout(hoverTimer);
    requestController?.abort();
  });
</script>

<span
  class="profile-preview-anchor"
  role="presentation"
  onpointerenter={startHover}
  onpointerleave={endHover}
>
  {@render children?.()}

  {#if visible}
    <span class="profile-preview" role="tooltip">
      <span class="preview-header">
        <img
          src={profile?.avatar || avatar}
          alt=""
          class="preview-avatar"
        />

        <span class="preview-identity">
          <strong>{profile?.name || name}</strong>
          <span>{profile?.handle || handle}</span>
        </span>
      </span>

      {#if profile?.bio}
        <span class="preview-bio">{profile.bio}</span>
      {/if}
    </span>
  {/if}
</span>

<style>
  .profile-preview-anchor {
    position: relative;
    display: inline-flex;
    min-width: 0;
  }

  .profile-preview {
    position: absolute;
    top: calc(100% + 10px);
    left: 0;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 300px;
    max-width: calc(100vw - 32px);
    padding: 16px;
    border: 1px solid #383038;
    border-radius: 12px;
    background: #171717;
    color: #f5f5f5;
    box-shadow: 0 12px 32px #0009;
    pointer-events: none;
    font-family: Manrope, sans-serif;
    white-space: normal;
  }

  .preview-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .preview-avatar {
    width: 44px;
    height: 44px;
    flex: 0 0 44px;
    border-radius: 50%;
    object-fit: cover;
  }

  .preview-identity {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 3px;
  }

  .preview-identity strong {
    font-size: 14px;
    overflow-wrap: anywhere;
  }

  .preview-identity > span {
    color: #a3a3a3;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .preview-bio {
    color: #dedede;
    font-size: 13px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
</style>
