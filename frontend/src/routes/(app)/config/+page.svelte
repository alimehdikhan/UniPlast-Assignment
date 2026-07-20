<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';
  import { toasts } from '$lib/stores/toast';
  import type { SMTPConfig, SMTPConfigResponse } from '$lib/types';
  import { formatDate } from '$lib/utils/formatters';

  let configs: SMTPConfig[] = $state([]);
  let loading = $state(true);
  
  // Form state
  let showModal = $state(false);
  let formMode: 'add' | 'edit' = $state('add');
  let submitting = $state(false);
  let testingConnection = $state(false);
  
  let currentConfig: Partial<SMTPConfig> = $state({
    name: '', host: '', port: 587, secure: false, user: '', pass: '', fromEmail: '', fromName: '', isDefault: false
  });

  onMount(async () => {
    await fetchConfigs();
  });

  async function fetchConfigs() {
    loading = true;
    try {
      const res = await api.get<SMTPConfigResponse>('/config/smtp');
      if (res.success) {
        configs = res.userConfigs || [];
      }
    } catch {
      toasts.error('Failed to load SMTP configurations');
    } finally {
      loading = false;
    }
  }

  function openAddModal() {
    formMode = 'add';
    currentConfig = { name: '', host: '', port: 587, secure: false, user: '', pass: '', fromEmail: '', fromName: '', isDefault: configs.length === 0 };
    showModal = true;
  }

  function openEditModal(config: SMTPConfig) {
    formMode = 'edit';
    currentConfig = { ...config, pass: '' }; // Don't populate password for security, require re-entry if changing
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  async function saveConfig(e: SubmitEvent) {
    e.preventDefault();
    submitting = true;
    try {
      if (formMode === 'add') {
        await api.post('/config/smtp', currentConfig);
        toasts.success('Configuration added successfully');
      } else {
        await api.put(`/config/smtp/${currentConfig.id}`, currentConfig);
        toasts.success('Configuration updated successfully');
      }
      closeModal();
      await fetchConfigs();
    } catch (err: any) {
      toasts.error(err.message || 'Failed to save configuration');
    } finally {
      submitting = false;
    }
  }

  async function deleteConfig(id: string) {
    if (!confirm('Are you sure you want to delete this configuration?')) return;
    try {
      await api.delete(`/config/smtp/${id}`);
      toasts.success('Configuration deleted');
      await fetchConfigs();
    } catch {
      toasts.error('Failed to delete configuration');
    }
  }

  async function setDefault(id: string) {
    try {
      await api.post(`/config/smtp/${id}/default`);
      toasts.success('Default configuration updated');
      await fetchConfigs();
    } catch {
      toasts.error('Failed to set default configuration');
    }
  }

  async function testConnection() {
    if (!currentConfig.host || !currentConfig.user || (!currentConfig.pass && formMode === 'add')) {
      toasts.warning('Please fill in host, user, and password to test connection');
      return;
    }
    
    testingConnection = true;
    try {
      const res = await api.post('/config/smtp/test', {
        host: currentConfig.host,
        port: currentConfig.port,
        secure: currentConfig.secure,
        user: currentConfig.user,
        pass: currentConfig.pass
      });
      
      if (res.success) {
        toasts.success('Connection successful!');
      } else {
        toasts.error(res.message || 'Connection failed');
      }
    } catch (err: any) {
      toasts.error(err.message || 'Connection test failed');
    } finally {
      testingConnection = false;
    }
  }
</script>

<svelte:head><title>SMTP Configuration — Bulk Email Sender</title></svelte:head>

<div class="page-header">
  <p class="text-muted">Manage your email sending servers and credentials.</p>
  <button class="btn btn-primary" onclick={openAddModal}>+ Add Configuration</button>
</div>

<div class="configs-grid">
  {#if loading}
    <div class="skeleton" style="height: 200px;"></div>
    <div class="skeleton" style="height: 200px;"></div>
  {:else if configs.length === 0}
    <div class="empty-state">
      <span class="empty-icon">⚙️</span>
      <h3>No Configurations Found</h3>
      <p>Add an SMTP server configuration to start sending emails.</p>
      <button class="btn btn-primary" onclick={openAddModal}>Add Your First Config</button>
    </div>
  {:else}
    {#each configs as config}
      <div class="config-card" class:is-default={config.isDefault}>
        {#if config.isDefault}
          <div class="default-badge">Default</div>
        {/if}
        
        <div class="config-header">
          <h3>{config.name}</h3>
          <div class="config-actions">
            <button class="icon-btn" onclick={() => openEditModal(config)} title="Edit">✏️</button>
            <button class="icon-btn danger" onclick={() => deleteConfig(config.id)} title="Delete">🗑️</button>
          </div>
        </div>
        
        <div class="config-details">
          <div class="detail-row">
            <span class="label">Host:</span>
            <span class="value">{config.host}:{config.port}</span>
          </div>
          <div class="detail-row">
            <span class="label">Security:</span>
            <span class="value">
              {#if config.secure}
                <span class="badge badge-secure">SSL/TLS</span>
              {:else}
                <span class="badge badge-insecure">STARTTLS / None</span>
              {/if}
            </span>
          </div>
          <div class="detail-row">
            <span class="label">User:</span>
            <span class="value">{config.user}</span>
          </div>
          <div class="detail-row">
            <span class="label">From:</span>
            <span class="value">{config.fromName ? `${config.fromName} <${config.fromEmail}>` : config.fromEmail}</span>
          </div>
          <div class="detail-row">
            <span class="label">Added:</span>
            <span class="value text-sm text-muted">{formatDate(config.createdAt || '')}</span>
          </div>
        </div>
        
        <div class="config-footer">
          {#if !config.isDefault}
            <button class="btn btn-sm btn-outline" onclick={() => setDefault(config.id)}>Set as Default</button>
          {:else}
            <span class="text-sm text-muted">Active for next campaign</span>
          {/if}
        </div>
      </div>
    {/each}
  {/if}
</div>

{#if showModal}
<div class="modal-backdrop" onclick={closeModal} role="presentation">
  <div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog">
    <div class="modal-header">
      <h2>{formMode === 'add' ? 'Add SMTP Configuration' : 'Edit Configuration'}</h2>
      <button class="close-btn" onclick={closeModal}>✕</button>
    </div>
    
    <form onsubmit={saveConfig} class="modal-body">
      <div class="form-group">
        <label for="c-name">Configuration Name <span class="required">*</span></label>
        <input id="c-name" type="text" bind:value={currentConfig.name} placeholder="e.g. Work Gmail, Marketing Server" required />
      </div>
      
      <div class="form-row">
        <div class="form-group flex-2">
          <label for="c-host">SMTP Host <span class="required">*</span></label>
          <input id="c-host" type="text" bind:value={currentConfig.host} placeholder="smtp.gmail.com" required />
        </div>
        <div class="form-group flex-1">
          <label for="c-port">Port <span class="required">*</span></label>
          <input id="c-port" type="number" bind:value={currentConfig.port} required />
        </div>
      </div>
      
      <div class="form-group checkbox-group">
        <input id="c-secure" type="checkbox" bind:checked={currentConfig.secure} />
        <label for="c-secure">Use SSL/TLS (Port 465 usually true, 587 usually false)</label>
      </div>
      
      <div class="form-row">
        <div class="form-group flex-1">
          <label for="c-user">Username <span class="required">*</span></label>
          <input id="c-user" type="text" bind:value={currentConfig.user} placeholder="email@example.com" required autocomplete="off" />
        </div>
        <div class="form-group flex-1">
          <label for="c-pass">Password {formMode === 'add' ? '<span class="required">*</span>' : '<span class="text-xs text-muted">(Leave blank to keep current)</span>'}</label>
          <input id="c-pass" type="password" bind:value={currentConfig.pass} placeholder="App Password" required={formMode === 'add'} autocomplete="new-password" />
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group flex-1">
          <label for="c-from-email">From Email <span class="required">*</span></label>
          <input id="c-from-email" type="email" bind:value={currentConfig.fromEmail} placeholder="sender@example.com" required />
        </div>
        <div class="form-group flex-1">
          <label for="c-from-name">From Name</label>
          <input id="c-from-name" type="text" bind:value={currentConfig.fromName} placeholder="John Doe" />
        </div>
      </div>
      
      <div class="form-group checkbox-group">
        <input id="c-default" type="checkbox" bind:checked={currentConfig.isDefault} />
        <label for="c-default">Set as default configuration</label>
      </div>
      
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" onclick={testConnection} disabled={testingConnection}>
          {#if testingConnection}<span class="spinner-sm"></span> Testing...{:else}🧪 Test Connection{/if}
        </button>
        <div class="right-actions">
          <button type="button" class="btn btn-ghost" onclick={closeModal}>Cancel</button>
          <button type="submit" class="btn btn-primary" disabled={submitting}>
            {#if submitting}<span class="spinner-sm"></span> Saving...{:else}Save Configuration{/if}
          </button>
        </div>
      </div>
    </form>
  </div>
</div>
{/if}

<style>
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .configs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.25rem;
  }
  
  .config-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    position: relative;
    overflow: hidden;
    transition: all var(--transition);
  }
  
  .config-card:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--border-hover);
  }
  
  .config-card.is-default {
    border: 2px solid var(--primary);
  }
  
  .default-badge {
    position: absolute;
    top: 12px;
    right: -24px;
    background: var(--primary);
    color: white;
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 24px;
    transform: rotate(45deg);
    box-shadow: var(--shadow-sm);
  }
  
  .config-header {
    padding: 1.25rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  
  .config-header h3 {
    margin: 0;
    font-size: 1.125rem;
    color: var(--text-primary);
  }
  
  .config-actions {
    display: flex;
    gap: 0.25rem;
  }
  
  .icon-btn {
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition);
    opacity: 0.6;
  }
  
  .icon-btn:hover {
    opacity: 1;
    background: var(--bg-tertiary);
  }
  
  .icon-btn.danger:hover {
    background: var(--danger-bg);
  }
  
  .config-details {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .detail-row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }
  
  .label {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    min-width: 60px;
  }
  
  .value {
    font-size: 0.875rem;
    font-weight: 500;
    word-break: break-all;
  }
  
  .badge {
    font-size: 0.6875rem;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
  }
  .badge-secure { background: var(--success-bg); color: var(--success); }
  .badge-insecure { background: var(--warning-bg); color: var(--warning); }
  
  .config-footer {
    padding: 1rem 1.25rem;
    background: var(--bg-tertiary);
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    align-items: center;
  }
  
  /* Buttons */
  .btn {
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all var(--transition);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border: 1px solid transparent;
  }
  .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.8125rem; }
  .btn-primary { background: var(--gradient); color: white; border: none; }
  .btn-primary:hover { background: var(--gradient-hover); box-shadow: var(--shadow-sm); transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
  .btn-outline { background: transparent; border-color: var(--border); color: var(--text-primary); }
  .btn-outline:hover { border-color: var(--border-hover); background: var(--bg-tertiary); }
  .btn-ghost { background: transparent; color: var(--text-secondary); }
  .btn-ghost:hover { background: var(--bg-tertiary); color: var(--text-primary); }
  
  /* Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    animation: fadeIn 0.2s ease;
  }
  
  .modal-content {
    background: var(--bg-secondary);
    border-radius: var(--radius-xl);
    width: 100%;
    max-width: 600px;
    box-shadow: var(--shadow-xl);
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.3s ease;
  }
  
  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .modal-header h2 { margin: 0; font-size: 1.25rem; }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.25rem;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: color var(--transition);
  }
  .close-btn:hover { color: var(--text-primary); }
  
  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  
  .form-group { display: flex; flex-direction: column; gap: 0.375rem; }
  .form-row { display: flex; gap: 1rem; }
  .flex-1 { flex: 1; }
  .flex-2 { flex: 2; }
  
  label { font-size: 0.8125rem; font-weight: 500; color: var(--text-secondary); }
  .required { color: var(--danger); }
  
  input[type="text"],
  input[type="email"],
  input[type="password"],
  input[type="number"] {
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-primary);
    font-size: 0.875rem;
    transition: border-color var(--transition);
  }
  
  input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px var(--primary-bg);
  }
  
  .checkbox-group {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }
  
  .modal-actions {
    margin-top: 1rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .right-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .spinner-sm {
    width: 16px; height: 16px;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  
  .empty-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    background: var(--bg-secondary);
    border: 1px dashed var(--border);
    border-radius: var(--radius-lg);
    text-align: center;
  }
  .empty-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; }
  .empty-state h3 { margin-bottom: 0.5rem; }
  .empty-state p { color: var(--text-secondary); margin-bottom: 1.5rem; }
</style>
