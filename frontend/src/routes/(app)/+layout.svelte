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
    { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/send', icon: 'send', label: 'Campaigns' },
    { path: '/config', icon: 'settings', label: 'SMTP Config' },
    { path: '/reports', icon: 'monitoring', label: 'Reports' },
    { path: '/scheduled', icon: 'event', label: 'Scheduled Jobs' },
  ];

  function isActive(path: string): boolean {
    return currentPath === path || (path !== '/dashboard' && currentPath.startsWith(path));
  }

  function toggleDrawer() {
    sidebarOpen = !sidebarOpen;
  }
</script>

{#if user}
<div class="bg-surface text-on-surface min-h-screen pb-24 md:pb-0 md:pl-[280px]">

  <!-- Mobile Navigation Drawer Overlay -->
  <div class="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 md:hidden" 
       class:opacity-0={!sidebarOpen} class:pointer-events-none={!sidebarOpen}
       onclick={toggleDrawer} role="presentation"></div>

  <!-- Sidebar -->
  <aside class="h-full w-[280px] fixed left-0 top-0 z-50 bg-inverse-surface dark:bg-surface-container-lowest drawer-transition flex flex-col py-md shadow-xl md:translate-x-0" 
         class:-translate-x-full={!sidebarOpen} id="drawer">
    
    <div class="px-6 mb-8">
      <h1 class="font-headline-md text-headline-md text-primary-fixed">MailPrecision</h1>
    </div>

    <div class="flex items-center px-6 py-4 mb-6">
      <div class="w-12 h-12 rounded-full overflow-hidden mr-3 border-2 border-primary-fixed-dim bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-lg">
        {user.name.charAt(0).toUpperCase()}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-label-md text-label-md text-white truncate">{user.name}</p>
        <p class="text-xs text-outline-variant truncate">{user.email}</p>
      </div>
    </div>

    <nav class="flex-1 space-y-1">
      {#each navItems as item}
        {#if isActive(item.path)}
          <a class="bg-primary-container text-on-primary-container rounded-full shadow-[0_0_15px_rgba(70,72,212,0.3)] flex items-center px-4 py-3 mx-2 active:translate-x-1 duration-150" href={item.path} onclick={() => sidebarOpen = false}>
            <span class="material-symbols-outlined mr-3">{item.icon}</span>
            <span class="font-label-md text-label-md">{item.label}</span>
          </a>
        {:else}
          <a class="text-surface-variant flex items-center px-4 py-3 mx-2 hover:bg-white/10 rounded-full transition-colors active:translate-x-1 duration-150" href={item.path} onclick={() => sidebarOpen = false}>
            <span class="material-symbols-outlined mr-3">{item.icon}</span>
            <span class="font-label-md text-label-md">{item.label}</span>
          </a>
        {/if}
      {/each}
    </nav>

    <div class="px-6 py-4 border-t border-white/10 flex justify-between items-center">
      <span class="px-3 py-1 bg-primary/20 text-primary-fixed-dim text-[10px] uppercase tracking-wider rounded-full border border-primary/30">Pro Plan</span>
      <button onclick={handleLogout} class="text-surface-variant hover:text-error transition-colors p-2" title="Sign out">
        <span class="material-symbols-outlined">logout</span>
      </button>
    </div>
  </aside>

  <!-- Top App Bar (Mobile & Tablet mostly) -->
  <header class="w-full sticky top-0 z-40 bg-surface/70 dark:bg-surface-container/70 backdrop-blur-xl flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 border-b border-white/20 shadow-sm md:hidden">
    <button class="text-primary dark:text-primary-fixed-dim hover:opacity-80 transition-opacity active:scale-95 duration-200 md:hidden" onclick={toggleDrawer}>
      <span class="material-symbols-outlined">menu</span>
    </button>
    <span class="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim md:hidden">MailPrecision</span>
    <div class="w-8 h-8 rounded-full overflow-hidden border border-primary/20 bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-xs">
      {user.name.charAt(0).toUpperCase()}
    </div>
  </header>

  <main class="mt-6 md:mt-10 px-margin-mobile md:px-margin-desktop min-h-screen">
    {@render children()}
  </main>

  <!-- Bottom Navigation Bar (Mobile only) -->
  <nav class="fixed bottom-0 w-full z-50 rounded-t-xl bg-surface/80 dark:bg-surface-container/80 backdrop-blur-lg flex justify-around items-center h-20 pb-safe px-4 border-t border-white/30 shadow-lg md:hidden">
    <a class="flex flex-col items-center justify-center {isActive('/dashboard') ? 'text-primary dark:text-primary-fixed-dim font-bold opacity-100' : 'text-on-surface-variant dark:text-outline-variant opacity-60'} hover:opacity-100 active:scale-90 duration-200" href="/dashboard">
      <span class="material-symbols-outlined">home</span>
      <span class="font-label-sm text-label-sm">Overview</span>
    </a>
    <a class="flex flex-col items-center justify-center {isActive('/send') ? 'text-primary dark:text-primary-fixed-dim font-bold opacity-100' : 'text-on-surface-variant dark:text-outline-variant opacity-60'} hover:opacity-100 active:scale-90 duration-200" href="/send">
      <span class="material-symbols-outlined">mail</span>
      <span class="font-label-sm text-label-sm">Campaigns</span>
    </a>
    <a class="flex flex-col items-center justify-center {isActive('/scheduled') ? 'text-primary dark:text-primary-fixed-dim font-bold opacity-100' : 'text-on-surface-variant dark:text-outline-variant opacity-60'} hover:opacity-100 active:scale-90 duration-200" href="/scheduled">
      <span class="material-symbols-outlined">event</span>
      <span class="font-label-sm text-label-sm">Scheduled</span>
    </a>
    <a class="flex flex-col items-center justify-center text-on-surface-variant dark:text-outline-variant opacity-60 hover:opacity-100 active:scale-90 duration-200" href="#" onclick={handleLogout}>
      <span class="material-symbols-outlined">logout</span>
      <span class="font-label-sm text-label-sm">Logout</span>
    </a>
  </nav>

</div>
{:else}
<div class="min-h-screen flex items-center justify-center bg-surface">
  <div class="w-8 h-8 border-4 border-surface-container border-t-primary rounded-full animate-spin"></div>
</div>
{/if}
