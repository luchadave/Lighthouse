<script lang="ts">
  import {
    House,
    Search,
    Bell,
    SquarePen,
    Hash,
    UserRound,
    Bookmark,
    Newspaper,
    Rss
  } from '@lucide/svelte';

  type Account = {
    displayName: string;
    acct: string;
    avatar: string;
  };

  type Props = {
    account: Account | null;
    activeNav: string;
    hasNewNotifications: boolean;
    onNavigate?: (name: string) => void;
  };

  let {
    account,
    activeNav,
    hasNewNotifications,
    onNavigate
  }: Props = $props();

  const APP_VERSION = '1.0.0';

  let accountMenuOpen = $state(false);

  const navigation = [
    { name: 'Home', icon: House },
    { name: 'Search', icon: Search },
    { name: 'Activity', icon: Bell },
    { name: 'Compose', icon: SquarePen },
    { name: 'Hashtags', icon: Hash },
    { name: 'Profile', icon: UserRound }
  ];

  function handleFediverseNavigation(name: string) {
    accountMenuOpen = false;

    if (window.location.pathname === '/' && onNavigate) {
      onNavigate(name);
      return;
    }

    window.location.assign(
      name === 'Home'
        ? '/'
        : `/?view=${encodeURIComponent(name)}`
    );
  }

  $effect(() => {
    if (!accountMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (
        target instanceof Element &&
        !target.closest('.sidebar-bottom')
      ) {
        accountMenuOpen = false;
      }
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        accountMenuOpen = false;
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeydown);
    };
  });
</script>
  <aside class="sidebar">
    <div class="brand">
      <img class="brand-mark" src="/noctiluna-mark.svg" alt="" />
      <span>Noctiluna</span>
    </div>

    <nav class="navigation" aria-label="Main navigation">
      {#each navigation as item}
        {@const Icon = item.icon}
        <button
          class:active={activeNav === item.name}
          class="nav-item"
          onclick={() => handleFediverseNavigation(item.name)}
        >
<span class="nav-icon">
  <Icon size={21} strokeWidth={1.8} />
</span>
          <span>{item.name}</span>
          {#if item.name === 'Activity' && hasNewNotifications}
            <span class="notification-dot"></span>
          {/if}
        </button>
      {/each}
    </nav>

<div class="sidebar-section-divider"></div>

<nav class="navigation" aria-label="Saved items">
  <a class="nav-item" href="/reading/saved">
    <span class="nav-icon">
      <Bookmark size={21} strokeWidth={1.8} />
    </span>
    <span>Read Later</span>
  </a>
</nav>

<div class="sidebar-section-divider"></div>

<nav class="navigation" aria-label="RSS reading">
  <a class="nav-item" href="/reading/articles">
    <span class="nav-icon">
      <Newspaper size={21} strokeWidth={1.8} />
    </span>
    <span>All Articles</span>
  </a>

  <a class="nav-item" href="/reading/feeds">
    <span class="nav-icon">
      <Rss size={21} strokeWidth={1.8} />
    </span>
    <span>Feeds</span>
  </a>
</nav>

    <div class="sidebar-bottom">
  {#if accountMenuOpen}
    <div class="account-menu-panel">
      {#if account}
        <div class="account-menu-heading">
          Signed in as
          <strong>{account.displayName}</strong>
          <span>@{account.acct}</span>
        </div>

        <form method="POST" action="/auth/logout">
          <button class="account-menu-item" type="submit">
            Log out
          </button>
        </form>
      {:else}
        <a class="account-menu-item" href="/auth/login">
          Connect account
        </a>
      {/if}

      <div class="account-menu-about">
        <strong>Noctiluna</strong>
        <a href="https://github.com/luchadave/Noctiluna-client" target="_blank" rel="noopener noreferrer">
          Version {APP_VERSION}
        </a>
      </div>
    </div>
  {/if}

  <button
    class="account"
    type="button"
    aria-expanded={accountMenuOpen}
    aria-label="Account menu"
    onclick={() => accountMenuOpen = !accountMenuOpen}
  >
    {#if account}
      <img
        class="account-avatar"
        src={account.avatar}
        alt=""
      />
      <div class="account-info">
        <strong>{account.displayName}</strong>
        <span>@{account.acct}</span>
      </div>
    {:else}
      <div class="account-avatar">?</div>
      <div class="account-info">
        <strong>Not connected</strong>
        <span>Connect your Hollo account</span>
      </div>
    {/if}
    <span class="account-menu">···</span>
  </button>
</div>
  </aside>

<style>
 .sidebar {
  height: 100dvh;
  min-height: 0;
  position: sticky;
  top: 0;
  background: #111111;
  border-right: 1px solid #242424;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: clamp(8px, 1.8vh, 16px) 20px
           clamp(6px, 1.4vh, 12px);
  padding-top: 28px;
}

  .brand {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 0 10px;
margin-top: 24px;
margin-bottom: clamp(5px, 1.4vh, 12px);
  font-size: clamp(18px, 2.5vh, 23px);
  font-weight: 750;
  letter-spacing: -0.8px;
  flex-shrink: 0;
}

.brand-mark {
  width: clamp(34px, 4.8vh, 40px);
  height: clamp(34px, 4.8vh, 40px);
  flex-shrink: 0;
  display: block;
  object-fit: contain;
}

.navigation {
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 1.5vh, 13px);
  flex-shrink: 0;
}

.nav-item {
  position: relative;
  width: 100%;
  min-height: clamp(40px, 7vh, 54px);
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: clamp(10px, 1.5vh, 17px);
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #d4d4d4;
  cursor: pointer;
  text-align: left;
  font-size: clamp(12px, 1.8vh, 14px);
  flex-shrink: 0;
  transition: background 150ms, color 150ms;
}

  .nav-item:hover {
    background: #222222;
    color: #f5f5f5;
  }

  .nav-item.active {
    background: #f472b6;
    color: #0a0a0a;
    font-weight: 650;
  }

  .nav-icon {
    width: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .notification-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #f472b6;
    margin-left: auto;
  }

  .sidebar-bottom {
    position: relative;
    margin-top: auto;
  }

  .account {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: clamp(7px, 1.5vh, 13px) 8px;
  border-top: 1px solid #303030;
}

.account-avatar {
  width: clamp(30px, 5vh, 38px);
  height: clamp(30px, 5vh, 38px);
  border-radius: 50%;
  background: #353035;
  color: #f472b6;
  display: grid;
  place-items: center;
  font-weight: 700;
  object-fit: cover;
  flex-shrink: 0;
}

  .account-info {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .account-info strong {
    font-size: 13px;
  }

  .account-info span {
    color: #888888;
    font-size: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .account-menu {
    margin-left: auto;
    color: #999999;
    font-size: 20px;
  }
/* Account dropdown */

.account {
  width: 100%;
  border: 0;
  background: transparent;
  color: #f5f5f5;
  text-align: left;
  cursor: pointer;
}

.account:hover {
  background: #222222;
  border-radius: 8px;
}

.account-menu-panel {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 0;
  right: 0;
  padding: 12px;
  background: #202020;
  border: 1px solid #393039;
  border-radius: 9px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 20;
}

.account-menu-heading {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 5px 6px 12px;
  color: #858585;
  font-size: 11px;
}

.account-menu-heading strong {
  color: #f5f5f5;
  font-size: 13px;
}

.account-menu-heading span {
  color: #858585;
}

.account-menu-item {
  display: block;
  width: 100%;
  padding: 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #f472b6;
  font: inherit;
  font-size: 13px;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.account-menu-item:hover {
  background: #302530;
}

.account-menu-about {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 9px;
  padding: 12px 10px 3px;
  border-top: 1px solid #393039;
  font-size: 12px;
}

.account-menu-about strong {
  color: #f5f5f5;
  font-weight: 650;
}

.account-menu-about a {
  width: fit-content;
  color: #f472b6;
  text-decoration: none;
}

.account-menu-about a:hover {
  color: #f9a8d4;
  text-decoration: underline;
}

  
.sidebar-section-divider {
  height: 1px;
  margin: 12px 16px;
  background: #303030;
}
.sidebar .navigation {
  gap: 2px;
}
.sidebar .nav-item {
  padding-top: 9px;
  padding-bottom: 9px;
  text-decoration: none;
}
.sidebar .nav-item:hover {
  text-decoration: none;
}
.sidebar-section-divider {
  height: 1px;
  margin: 8px 16px;
  background: #303030;
}

@media (max-width: 900px) {
  .sidebar {
    padding-left: 14px;
    padding-right: 14px;
  }
}

@media (max-width: 650px) {
    .sidebar {
      position: fixed;
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: 65px;
      z-index: 10;
      padding: 5px 8px;
      border-right: 0;
      border-top: 1px solid #303030;
      background: #171717;
    }

    .brand,
    .sidebar-bottom {
      display: none;
    }

    .navigation {
      height: 100%;
      flex-direction: row;
      justify-content: space-around;
      gap: 2px;
    }

    .nav-item {
      flex: 1;
      min-height: 52px;
      padding: 4px;
      flex-direction: column;
      justify-content: center;
      gap: 2px;
      font-size: 9px;
    }

    .nav-icon {
      font-size: 20px;
    }

    .notification-dot {
      position: absolute;
      top: 5px;
      right: 22%;
    }


}
</style>
