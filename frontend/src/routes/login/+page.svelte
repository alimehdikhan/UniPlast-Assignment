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
  <title>{mode === 'login' ? 'Sign In' : 'Sign Up'} — Bulk Email Sender</title>
</svelte:head>

<div class="auth-page">
  <div class="auth-bg">
    <div class="auth-orb orb-1"></div>
    <div class="auth-orb orb-2"></div>
    <div class="auth-orb orb-3"></div>
  </div>

  <div class="auth-card">
    <div class="auth-header">
      <div class="brand">
        <span class="brand-icon">📧</span>
        <h1>Email Sender</h1>
      </div>
      <p class="tagline">Secure bulk email campaign management</p>
    </div>

    <div class="tab-switcher">
      <button class:active={mode === 'login'} onclick={() => switchMode('login')}>Sign In</button>
      <button class:active={mode === 'register'} onclick={() => switchMode('register')}>Sign Up</button>
    </div>

    {#if error}
      <div class="alert alert-error animate-fade-in">{error}</div>
    {/if}

    {#if mode === 'login'}
      <form onsubmit={handleLogin} class="animate-fade-in">
        <div class="field">
          <label for="login-email">Email</label>
          <input id="login-email" type="email" bind:value={email} placeholder="you@example.com" required autocomplete="email" />
        </div>
        <div class="field">
          <label for="login-pass">Password</label>
          <input id="login-pass" type="password" bind:value={password} placeholder="••••••••" required autocomplete="current-password" />
        </div>
        <button type="submit" class="btn-primary" disabled={loading}>
          {#if loading}<span class="spinner-sm"></span>{:else}Sign In{/if}
        </button>
      </form>
    {:else}
      <form onsubmit={handleRegister} class="animate-fade-in">
        <div class="field">
          <label for="reg-name">Full Name</label>
          <input id="reg-name" type="text" bind:value={name} placeholder="John Doe" required />
        </div>
        <div class="field">
          <label for="reg-email">Email</label>
          <input id="reg-email" type="email" bind:value={email} placeholder="you@example.com" required autocomplete="email" />
        </div>
        <div class="field">
          <label for="reg-pass">Password</label>
          <input id="reg-pass" type="password" bind:value={password} placeholder="Min 6 characters" required minlength="6" autocomplete="new-password" />
        </div>
        <button type="submit" class="btn-primary" disabled={loading}>
          {#if loading}<span class="spinner-sm"></span>{:else}Create Account{/if}
        </button>
      </form>
    {/if}

    <p class="footer-text">Secure authentication with session management</p>
  </div>
</div>

<style>
  .auth-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4c1d95 70%, #581c87 100%);
    position: relative;
    overflow: hidden;
    padding: 1rem;
  }

  .auth-bg { position: absolute; inset: 0; pointer-events: none; }
  .auth-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.35;
  }
  .orb-1 { width: 400px; height: 400px; background: #667eea; top: -100px; right: -100px; }
  .orb-2 { width: 300px; height: 300px; background: #764ba2; bottom: -80px; left: -80px; }
  .orb-3 { width: 200px; height: 200px; background: #a78bfa; top: 50%; left: 50%; transform: translate(-50%, -50%); }

  .auth-card {
    position: relative;
    width: 100%;
    max-width: 420px;
    background: rgba(255, 255, 255, 0.97);
    backdrop-filter: blur(20px);
    border-radius: var(--radius-xl);
    padding: 2.5rem;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .auth-header { text-align: center; margin-bottom: 1.5rem; }
  .brand { display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
  .brand-icon { font-size: 2rem; }
  .brand h1 {
    font-size: 1.75rem;
    font-weight: 800;
    background: var(--gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .tagline { color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.25rem; }

  .tab-switcher {
    display: flex;
    gap: 0.25rem;
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    padding: 4px;
    margin-bottom: 1.5rem;
  }
  .tab-switcher button {
    flex: 1;
    padding: 0.625rem;
    border: none;
    border-radius: var(--radius);
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all var(--transition);
    background: transparent;
    color: var(--text-secondary);
    font-family: inherit;
  }
  .tab-switcher button.active {
    background: var(--gradient);
    color: white;
    box-shadow: var(--shadow);
  }

  .alert { padding: 0.75rem 1rem; border-radius: var(--radius); margin-bottom: 1rem; font-size: 0.8125rem; }
  .alert-error { background: var(--danger-bg); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.15); }

  form { display: flex; flex-direction: column; gap: 1rem; }
  .field { display: flex; flex-direction: column; gap: 0.375rem; }
  .field label { font-weight: 500; font-size: 0.8125rem; color: var(--text-secondary); }
  .field input {
    padding: 0.75rem 1rem;
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    font-size: 0.9375rem;
    transition: border-color var(--transition), box-shadow var(--transition);
    outline: none;
    font-family: inherit;
    background: var(--bg-secondary);
  }
  .field input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-bg);
  }
  .field input::placeholder { color: var(--text-tertiary); }

  .btn-primary {
    padding: 0.875rem;
    background: var(--gradient);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all var(--transition);
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }
  .btn-primary:hover:not(:disabled) { background: var(--gradient-hover); transform: translateY(-1px); box-shadow: var(--shadow-md); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

  .spinner-sm {
    width: 20px; height: 20px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  .footer-text {
    text-align: center;
    color: var(--text-tertiary);
    font-size: 0.75rem;
    margin-top: 1.5rem;
  }

  @media (max-width: 480px) {
    .auth-card { padding: 1.5rem; }
    .brand h1 { font-size: 1.5rem; }
  }
</style>
