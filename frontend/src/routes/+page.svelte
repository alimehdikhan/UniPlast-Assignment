<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { api, ApiError } from '$lib/api/client';

  onMount(async () => {
    try {
      const result = await api.get('/auth/me');
      if (result.success) {
        goto('/dashboard', { replaceState: true });
      } else {
        goto('/login', { replaceState: true });
      }
    } catch {
      goto('/login', { replaceState: true });
    }
  });
</script>

<div class="loader">
  <div class="spinner"></div>
  <p>Loading...</p>
</div>

<style>
  .loader {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 1rem;
    color: var(--text-secondary);
  }
  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
</style>
