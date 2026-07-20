<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, ApiError } from '$lib/api/client';
  import { toasts } from '$lib/stores/toast';
  import { onMount } from 'svelte';

  let mode: 'login' | 'register' = $state('login');
  let email = $state('');
  let password = $state('');
  let name = $state('');
  let loading = $state(false);
  let error = $state('');

  onMount(async () => {
    try {
      const result = await api.get('/auth/me');
      if (result.success) goto('/dashboard', { replaceState: true });
    } catch { /* not logged in */ }
  });

  async function handleLogin(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const result = await api.post('/auth/login', { email, password });
      if (result.success) {
        toasts.success('Welcome back!', `Logged in as ${result.user?.name}`);
        goto('/dashboard', { replaceState: true });
      } else {
        error = result.message || 'Login failed';
      }
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }

  async function handleRegister(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    if (password.length < 6) { error = 'Password must be at least 6 characters'; return; }
    loading = true;
    try {
      const result = await api.post('/auth/register', { email, password, name });
      if (result.success) {
        toasts.success('Account created!', 'Welcome aboard!');
        goto('/dashboard', { replaceState: true });
      } else {
        error = result.message || 'Registration failed';
      }
    } catch (err) {
      error = err instanceof ApiError ? err.message : 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }

  function switchMode(m: 'login' | 'register') {
    mode = m;
    error = '';
  }
</script>

<svelte:head>
  <title>{mode === 'login' ? 'Sign In' : 'Sign Up'} — MailPrecision</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] p-4 relative overflow-hidden">
  <!-- Decorative background orbs -->
  <div class="absolute inset-0 pointer-events-none">
    <div class="absolute w-[400px] h-[400px] rounded-full bg-primary/40 blur-[80px] -top-[100px] -right-[100px]"></div>
    <div class="absolute w-[300px] h-[300px] rounded-full bg-secondary/40 blur-[80px] -bottom-[80px] -left-[80px]"></div>
  </div>

  <div class="w-full max-w-[420px] glass-card rounded-2xl p-8 z-10 relative">
    <div class="text-center mb-6">
      <div class="flex items-center justify-center gap-2 mb-2">
        <span class="material-symbols-outlined text-[32px] text-primary">mail</span>
        <h1 class="font-headline-lg text-headline-lg-mobile text-transparent bg-clip-text active-gradient">MailPrecision</h1>
      </div>
      <p class="font-body-sm text-label-md text-on-surface-variant">Secure bulk email campaign management</p>
    </div>

    <!-- Tab Switcher -->
    <div class="flex gap-1 p-1 bg-surface-container rounded-lg mb-6">
      <button 
        class="flex-1 py-2 rounded-md font-label-md transition-all duration-200 {mode === 'login' ? 'active-gradient text-white shadow-md' : 'text-on-surface-variant hover:bg-white/10'}"
        onclick={() => switchMode('login')}>
        Sign In
      </button>
      <button 
        class="flex-1 py-2 rounded-md font-label-md transition-all duration-200 {mode === 'register' ? 'active-gradient text-white shadow-md' : 'text-on-surface-variant hover:bg-white/10'}"
        onclick={() => switchMode('register')}>
        Sign Up
      </button>
    </div>

    {#if error}
      <div class="bg-error-container text-on-error-container border border-error/20 p-3 rounded-lg text-sm mb-4 animate-fade-in flex items-center gap-2">
        <span class="material-symbols-outlined text-[20px]">error</span>
        {error}
      </div>
    {/if}

    {#if mode === 'login'}
      <form onsubmit={handleLogin} class="flex flex-col gap-4 animate-fade-in">
        <div class="flex flex-col gap-1.5">
          <label for="login-email" class="font-label-md text-on-surface-variant">Email</label>
          <input id="login-email" type="email" bind:value={email} placeholder="you@example.com" required autocomplete="email" 
            class="px-4 py-3 border border-outline-variant rounded-lg bg-surface-bright focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface font-body-md outline-none" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="login-pass" class="font-label-md text-on-surface-variant">Password</label>
          <input id="login-pass" type="password" bind:value={password} placeholder="••••••••" required autocomplete="current-password" 
            class="px-4 py-3 border border-outline-variant rounded-lg bg-surface-bright focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface font-body-md outline-none" />
        </div>
        <button type="submit" disabled={loading} class="mt-2 py-3.5 rounded-lg active-gradient text-white font-label-md flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
          {#if loading}
            <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          {:else}
            Sign In
          {/if}
        </button>
      </form>
    {:else}
      <form onsubmit={handleRegister} class="flex flex-col gap-4 animate-fade-in">
        <div class="flex flex-col gap-1.5">
          <label for="reg-name" class="font-label-md text-on-surface-variant">Full Name</label>
          <input id="reg-name" type="text" bind:value={name} placeholder="John Doe" required 
            class="px-4 py-3 border border-outline-variant rounded-lg bg-surface-bright focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface font-body-md outline-none" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="reg-email" class="font-label-md text-on-surface-variant">Email</label>
          <input id="reg-email" type="email" bind:value={email} placeholder="you@example.com" required autocomplete="email" 
            class="px-4 py-3 border border-outline-variant rounded-lg bg-surface-bright focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface font-body-md outline-none" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="reg-pass" class="font-label-md text-on-surface-variant">Password</label>
          <input id="reg-pass" type="password" bind:value={password} placeholder="Min 6 characters" required minlength="6" autocomplete="new-password" 
            class="px-4 py-3 border border-outline-variant rounded-lg bg-surface-bright focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface font-body-md outline-none" />
        </div>
        <button type="submit" disabled={loading} class="mt-2 py-3.5 rounded-lg active-gradient text-white font-label-md flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
          {#if loading}
            <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          {:else}
            Create Account
          {/if}
        </button>
      </form>
    {/if}

    <p class="text-center text-on-surface-variant opacity-70 text-xs mt-6 font-body-sm">
      Secure authentication with session management
    </p>
  </div>
</div>
