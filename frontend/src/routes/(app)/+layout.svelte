<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import { toasts } from '$lib/stores/toast';
  import { onMount } from 'svelte';
  import type { User } from '$lib/types';

  let { children } = $props();
  let user: User | null = $state(null);
  let sidebarOpen = $state(false);
  let currentPath = $state('');

  page.subscribe(p => { currentPath = p.url.pathname; });

  onMount(async () => {
    try {
      const result = await api.get('/auth/me');
      if (result.success) {
        user = result.user;
      } else {
        goto('/login', { replaceState: true });
      }
    } catch {
      goto('/login', { replaceState: true });
    }
  });

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
      toasts.info('Signed out');
      goto('/login', { replaceState: true });
    } catch {
      goto('/login', { replaceState: true });
    }
  }

  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/send', icon: '✉️', label: 'Send Emails' },
    { path: '/config', icon: '⚙️', label: 'SMTP Config' },
    { path: '/reports', icon: '📈', label: 'Reports' },
    { path: '/scheduled', icon: '📅', label: 'Scheduled Jobs' },
  ];

  function isActive(path: string): boolean {
    return currentPath === path || (path !== '/dashboard' && currentPath.startsWith(path));
  }
</script>

{#if user}
<div class="app-layout">
  <!-- Mobile overlay -->
  {#if sidebarOpen}
    <div class="sidebar-overlay" onclick={() => sidebarOpen = false} role="presentation"></div>
  {/if}

  <!-- Sidebar -->
  <aside class="sidebar" class:open={sidebarOpen}>
    <div class="sidebar-brand">
      <span class="sidebar-logo">📧</span>
      <span class="sidebar-title">Email Sender</span>
    </div>

    <nav class="sidebar-nav">
      {#each navItems as item}
        <a
          href={item.path}
          class="nav-item"
          class:active={isActive(item.path)}
          onclick={() => sidebarOpen = false}
        >
          <span class="nav-icon">{item.icon}</span>
          <span class="nav-label">{item.label}</span>
        </a>
      {/each}
    </nav>

    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
        <div class="user-details">
          <span class="user-name">{user.name}</span>
          <span class="user-email">{user.email}</span>
        </div>
      </div>
      <button class="logout-btn" onclick={handleLogout} title="Sign out">
        ↗
      </button>
    </div>
  </aside>

  <!-- Main content -->
  <main class="main-content">
    <header class="top-bar">
      <button class="menu-btn" onclick={() => sidebarOpen = !sidebarOpen} aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
      <div class="page-title">
        {navItems.find(i => isActive(i.path))?.label || 'Dashboard'}
      </div>
      <div class="top-actions">
        <span class="greeting">Hi, {user.name.split(' ')[0]}</span>
      </div>
    </header>

    <div class="content-area">
      {@render children()}
    </div>
  </main>
</div>
{:else}
<div class="loading-screen">
  <div class="spinner"></div>
</div>
{/if}

<style>
  .app-layout {
    display: flex;
    min-height: 100vh;
    background: var(--bg-primary);
  }

  /* Sidebar */
  .sidebar {
    width: var(--sidebar-width);
    background: var(--sidebar-bg);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 100;
    transition: transform var(--transition-slow);
  }
  .sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 99;
    display: none;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .sidebar-logo { font-size: 1.5rem; }
  .sidebar-title { font-weight: 700; font-size: 1.125rem; color: white; }

  .sidebar-nav {
    flex: 1;
    padding: 1rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
  }
  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    color: var(--sidebar-text);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.875rem;
    transition: all var(--transition);
  }
  .nav-item:hover {
    background: var(--sidebar-hover);
    color: var(--sidebar-text-active);
  }
  .nav-item.active {
    background: var(--sidebar-active);
    color: var(--sidebar-text-active);
  }
  .nav-icon { font-size: 1.125rem; width: 24px; text-align: center; }

  .sidebar-footer {
    padding: 1rem 1rem;
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .user-info { display: flex; align-items: center; gap: 0.625rem; flex: 1; min-width: 0; }
  .user-avatar {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: var(--gradient);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.8125rem;
    flex-shrink: 0;
  }
  .user-details { display: flex; flex-direction: column; min-width: 0; }
  .user-name { color: white; font-size: 0.8125rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .user-email { color: var(--sidebar-text); font-size: 0.6875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .logout-btn {
    background: none; border: none;
    color: var(--sidebar-text);
    cursor: pointer;
    font-size: 1rem;
    padding: 0.5rem;
    border-radius: var(--radius-sm);
    transition: all var(--transition);
  }
  .logout-btn:hover { background: rgba(239, 68, 68, 0.15); color: var(--danger); }

  /* Main Content */
  .main-content {
    flex: 1;
    margin-left: var(--sidebar-width);
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  .top-bar {
    height: 60px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    padding: 0 1.5rem;
    gap: 1rem;
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .menu-btn {
    display: none;
    flex-direction: column;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
  }
  .menu-btn span {
    display: block;
    width: 20px;
    height: 2px;
    background: var(--text-primary);
    border-radius: 1px;
    transition: all var(--transition);
  }
  .page-title { font-weight: 600; font-size: 1.125rem; }
  .top-actions { margin-left: auto; }
  .greeting { color: var(--text-secondary); font-size: 0.875rem; }

  .content-area { padding: 1.5rem; flex: 1; }

  .loading-screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .spinner {
    width: 32px; height: 32px;
    border: 3px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .sidebar { transform: translateX(-100%); }
    .sidebar.open { transform: translateX(0); }
    .sidebar-overlay { display: block; }
    .main-content { margin-left: 0; }
    .menu-btn { display: flex; }
    .content-area { padding: 1rem; }
  }
</style>
