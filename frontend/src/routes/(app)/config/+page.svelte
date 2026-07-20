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
        configId: currentConfig.id,
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

<svelte:head><title>SMTP Configuration — MailPrecision</title></svelte:head>

<div class="flex justify-between items-center mb-8">
  <div>
    <h2 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">SMTP Configuration</h2>
    <p class="font-body-md text-on-surface-variant">Manage your email sending servers and credentials.</p>
  </div>
  <button class="px-5 py-2.5 rounded-lg active-gradient text-white font-label-md flex items-center shadow-md hover:shadow-lg transition-all" onclick={openAddModal}>
    <span class="material-symbols-outlined mr-2">add</span>
    Add Config
  </button>
</div>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {#if loading}
    <div class="glass-card h-[250px] rounded-xl animate-pulse bg-surface-container"></div>
    <div class="glass-card h-[250px] rounded-xl animate-pulse bg-surface-container"></div>
  {:else if configs.length === 0}
    <div class="glass-card col-span-full p-12 rounded-xl flex flex-col items-center justify-center text-center border-dashed border-2 border-outline-variant/50">
      <span class="material-symbols-outlined text-[48px] text-on-surface-variant mb-4 opacity-50">dns</span>
      <h3 class="font-headline-md text-headline-md text-on-surface mb-2">No Configurations Found</h3>
      <p class="font-body-sm text-on-surface-variant mb-6">Add an SMTP server configuration to start sending emails.</p>
      <button class="px-6 py-3 rounded-lg active-gradient text-white font-label-md hover:shadow-lg transition-shadow" onclick={openAddModal}>Add Your First Config</button>
    </div>
  {:else}
    {#each configs as config}
      <div class="glass-card rounded-xl overflow-hidden relative transition-all duration-300 hover:shadow-lg hover:-translate-y-1 {config.isDefault ? 'border-2 border-primary' : 'border border-outline-variant/30'}">
        {#if config.isDefault}
          <div class="absolute top-3 -right-6 bg-primary text-white text-[10px] font-bold uppercase py-1 px-8 rotate-45 shadow-sm shadow-primary/30 z-10">Default</div>
        {/if}
        
        <div class="p-5 border-b border-outline-variant/20 flex justify-between items-start bg-surface-bright/50">
          <div class="flex items-center">
            <div class="w-10 h-10 rounded-lg {config.isDefault ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'} flex items-center justify-center mr-3">
              <span class="material-symbols-outlined">router</span>
            </div>
            <h3 class="font-headline-md text-lg text-on-surface font-bold truncate max-w-[150px]">{config.name}</h3>
          </div>
          <div class="flex gap-1 z-20 relative">
            <button class="w-8 h-8 rounded-md flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors" onclick={() => openEditModal(config)} title="Edit">
              <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button class="w-8 h-8 rounded-md flex items-center justify-center text-on-surface-variant hover:bg-error-container hover:text-error transition-colors" onclick={() => deleteConfig(config.id)} title="Delete">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>
        
        <div class="p-5 space-y-3 font-body-sm">
          <div class="flex items-start justify-between border-b border-outline-variant/10 pb-2">
            <span class="text-on-surface-variant w-16">Host:</span>
            <span class="text-on-surface font-medium text-right break-all">{config.host}:{config.port}</span>
          </div>
          <div class="flex items-center justify-between border-b border-outline-variant/10 pb-2">
            <span class="text-on-surface-variant w-20">Security:</span>
            {#if config.secure}
              <span class="px-2 py-0.5 bg-success/10 text-success text-[10px] font-bold rounded uppercase">SSL/TLS</span>
            {:else}
              <span class="px-2 py-0.5 bg-warning/10 text-warning text-[10px] font-bold rounded uppercase">STARTTLS/None</span>
            {/if}
          </div>
          <div class="flex items-start justify-between border-b border-outline-variant/10 pb-2">
            <span class="text-on-surface-variant w-16">User:</span>
            <span class="text-on-surface font-medium text-right truncate max-w-[180px]" title={config.user}>{config.user}</span>
          </div>
          <div class="flex items-start justify-between pb-1">
            <span class="text-on-surface-variant w-16">From:</span>
            <span class="text-on-surface font-medium text-right truncate max-w-[180px]" title={config.fromEmail}>
              {config.fromName ? `${config.fromName} <${config.fromEmail}>` : config.fromEmail}
            </span>
          </div>
        </div>
        
        <div class="p-4 bg-surface-container-lowest border-t border-outline-variant/20 flex justify-end">
          {#if !config.isDefault}
            <button class="px-3 py-1.5 rounded-md border border-outline-variant text-on-surface-variant text-xs font-label-sm hover:border-primary hover:text-primary transition-colors bg-surface" onclick={() => setDefault(config.id)}>
              Set as Default
            </button>
          {:else}
            <span class="text-xs text-on-surface-variant italic py-1.5 flex items-center">
              <span class="material-symbols-outlined text-[14px] mr-1">check_circle</span>
              Active Configuration
            </span>
          {/if}
        </div>
      </div>
    {/each}
  {/if}
</div>

{#if showModal}
<div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onclick={closeModal} role="presentation">
  <div class="bg-surface-bright rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up relative" onclick={(e) => e.stopPropagation()} role="dialog">
    
    <div class="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface">
      <h2 class="font-headline-md text-headline-md text-on-surface">{formMode === 'add' ? 'Add SMTP Configuration' : 'Edit Configuration'}</h2>
      <button class="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors" onclick={closeModal}>
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
    
    <form onsubmit={saveConfig} class="flex-1 overflow-y-auto px-6 py-6 space-y-6">
      
      <div class="flex flex-col gap-1.5">
        <label for="c-name" class="font-label-md text-on-surface-variant">Configuration Name <span class="text-error">*</span></label>
        <input id="c-name" type="text" bind:value={currentConfig.name} placeholder="e.g. Work Gmail, Marketing Server" required class="px-4 py-2.5 border border-outline-variant rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body-sm outline-none" />
      </div>
      
      <div class="grid grid-cols-3 gap-4">
        <div class="col-span-2 flex flex-col gap-1.5">
          <label for="c-host" class="font-label-md text-on-surface-variant">SMTP Host <span class="text-error">*</span></label>
          <input id="c-host" type="text" bind:value={currentConfig.host} placeholder="smtp.gmail.com" required class="px-4 py-2.5 border border-outline-variant rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body-sm outline-none" />
        </div>
        <div class="col-span-1 flex flex-col gap-1.5">
          <label for="c-port" class="font-label-md text-on-surface-variant">Port <span class="text-error">*</span></label>
          <input id="c-port" type="number" bind:value={currentConfig.port} required class="px-4 py-2.5 border border-outline-variant rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body-sm outline-none" />
        </div>
      </div>
      
      <label class="flex items-center gap-3 p-3 border border-outline-variant/50 rounded-lg cursor-pointer hover:bg-surface-container-low transition-colors group">
        <div class="relative inline-block w-10 h-5 rounded-full transition-colors duration-200 {currentConfig.secure ? 'bg-primary' : 'bg-surface-container-highest'}">
          <input id="c-secure" type="checkbox" bind:checked={currentConfig.secure} class="opacity-0 w-0 h-0" />
          <span class="absolute left-1 top-1 w-3 h-3 rounded-full bg-white transition-transform duration-200 {currentConfig.secure ? 'transform translate-x-5' : ''}"></span>
        </div>
        <div>
          <span class="font-label-md text-on-surface block">Use SSL/TLS</span>
          <span class="text-[10px] text-on-surface-variant">Port 465 usually true, 587 usually false</span>
        </div>
      </label>
      
      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1.5">
          <label for="c-user" class="font-label-md text-on-surface-variant">Username <span class="text-error">*</span></label>
          <input id="c-user" type="text" bind:value={currentConfig.user} placeholder="email@example.com" required autocomplete="off" class="px-4 py-2.5 border border-outline-variant rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body-sm outline-none" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="c-pass" class="font-label-md text-on-surface-variant flex items-center justify-between">
            <span>Password {formMode === 'add' ? '<span class="text-error">*</span>' : ''}</span>
            {#if formMode !== 'add'}<span class="text-[10px] opacity-70 font-normal italic">(Leave blank to keep)</span>{/if}
          </label>
          <input id="c-pass" type="password" bind:value={currentConfig.pass} placeholder="App Password" required={formMode === 'add'} autocomplete="new-password" class="px-4 py-2.5 border border-outline-variant rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body-sm outline-none" />
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1.5">
          <label for="c-from-email" class="font-label-md text-on-surface-variant">From Email <span class="text-error">*</span></label>
          <input id="c-from-email" type="email" bind:value={currentConfig.fromEmail} placeholder="sender@example.com" required class="px-4 py-2.5 border border-outline-variant rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body-sm outline-none" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="c-from-name" class="font-label-md text-on-surface-variant">From Name</label>
          <input id="c-from-name" type="text" bind:value={currentConfig.fromName} placeholder="John Doe" class="px-4 py-2.5 border border-outline-variant rounded-lg bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body-sm outline-none" />
        </div>
      </div>
      
      <label class="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg cursor-pointer border border-transparent hover:border-outline-variant/30 transition-colors">
        <input type="checkbox" bind:checked={currentConfig.isDefault} class="w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary" />
        <span class="font-label-md text-on-surface">Set as default configuration</span>
      </label>
      
      <div class="pt-6 border-t border-outline-variant/30 flex justify-between items-center mt-2">
        <button type="button" class="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant font-label-md hover:bg-surface-container-high transition-colors flex items-center" onclick={testConnection} disabled={testingConnection}>
          {#if testingConnection}
            <div class="w-4 h-4 border-2 border-on-surface-variant/30 border-t-on-surface-variant rounded-full animate-spin mr-2"></div> Testing...
          {:else}
            <span class="material-symbols-outlined mr-2 text-[18px]">vital_signs</span> Test Connection
          {/if}
        </button>
        <div class="flex gap-3">
          <button type="button" class="px-4 py-2 rounded-lg text-on-surface-variant font-label-md hover:bg-surface-container-high transition-colors" onclick={closeModal}>Cancel</button>
          <button type="submit" class="px-6 py-2 rounded-lg active-gradient text-white font-label-md shadow-md hover:shadow-lg transition-all flex items-center disabled:opacity-60" disabled={submitting}>
            {#if submitting}
              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div> Saving...
            {:else}
              Save
            {/if}
          </button>
        </div>
      </div>
    </form>
  </div>
</div>
{/if}

<style>
  @keyframes slide-up {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .animate-slide-up {
    animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
</style>
