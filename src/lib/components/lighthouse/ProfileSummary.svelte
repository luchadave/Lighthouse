<script lang="ts">
  type Account = {
    avatar: string;
    displayName: string;
    acct: string;
    followingCount: number;
    followersCount: number;
    statusesCount: number;
  };

  let { account }: { account: Account | null } = $props();
</script>

{#if account}
  <section class="profile-summary" aria-label="Your Fediverse profile">
    <div class="profile-identity">
      <img class="profile-avatar" src={account.avatar} alt="" />

      <div class="profile-name">
        <strong>{account.displayName}</strong>
        <span>@{account.acct}</span>
      </div>
    </div>

    <div class="profile-stats">
      <div>
        <strong>{account.statusesCount.toLocaleString()}</strong>
        <span>Posts</span>
      </div>

      <div>
        <strong>{account.followingCount.toLocaleString()}</strong>
        <span>Following</span>
      </div>

      <div>
        <strong>{account.followersCount.toLocaleString()}</strong>
        <span>Followers</span>
      </div>
    </div>
  </section>
{/if}

<style>

  .profile-summary {
  padding: 16px;
  background: #171717;
  border: 1px solid #292929;
  border-radius: 12px;
}

  .profile-identity {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .profile-avatar {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    border-radius: 50%;
    object-fit: cover;
  }

  .profile-name {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .profile-name strong {
    color: #f5f5f5;
    font-size: 14px;
    overflow-wrap: anywhere;
  }

  .profile-name span {
    color: #a3a3a3;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .profile-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #303030;
}

  .profile-stats > div {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    min-width: 0;
  }

  .profile-stats strong {
    color: #f5f5f5;
    font-size: 14px;
    font-weight: 700;
  }

  .profile-stats span {
    color: #a3a3a3;
    font-size: 11px;
  }
</style>
