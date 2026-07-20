<script lang="ts">
  import { toasts } from '$lib/stores/toast';

  let toastList: any[] = $state([]);

  toasts.subscribe(v => { toastList = v; });

  const icons: Record<string, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
</script>

{#if toastList.length > 0}
<div class="toast-container" role="alert" aria-live="polite">
  {#each toastList as toast (toast.id)}
    <div class="toast toast-{toast.type}" style="animation: slideIn 0.3s ease forwards;">
      <span class="toast-icon">{icons[toast.type]}</span>
      <div class="toast-body">
        <strong>{toast.title}</strong>
        {#if toast.message}<p>{toast.message}</p>{/if}
      </div>
      <button class="toast-close" onclick={() => toasts.remove(toast.id)} aria-label="Close">✕</button>
    </div>
  {/each}
</div>
{/if}

<style>
  .toast-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 400px;
    width: 100%;
  }
  .toast {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-lg);
    font-size: 0.875rem;
  }
  .toast-success { border-left: 4px solid var(--success); }
  .toast-error { border-left: 4px solid var(--danger); }
  .toast-warning { border-left: 4px solid var(--warning); }
  .toast-info { border-left: 4px solid var(--info); }
  .toast-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
  }
  .toast-success .toast-icon { background: var(--success-bg); color: var(--success); }
  .toast-error .toast-icon { background: var(--danger-bg); color: var(--danger); }
  .toast-warning .toast-icon { background: var(--warning-bg); color: var(--warning); }
  .toast-info .toast-icon { background: var(--info-bg); color: var(--info); }
  .toast-body { flex: 1; }
  .toast-body strong { display: block; margin-bottom: 2px; }
  .toast-body p { margin: 0; color: var(--text-secondary); font-size: 0.8125rem; }
  .toast-close {
    background: none;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    font-size: 0.875rem;
    padding: 2px;
    line-height: 1;
  }
  .toast-close:hover { color: var(--text-primary); }
</style>
