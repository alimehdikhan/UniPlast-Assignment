<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api/client';
  import { toasts } from '$lib/stores/toast';
  import type { SMTPConfig } from '$lib/types';

  let configs: SMTPConfig[] = $state([]);
  let selectedConfigId = $state('');
  let loadingConfigs = $state(true);
  let sending = $state(false);
  let quill: any;

  // Form State
  let subject = $state('');
  let excelFile: FileList | null = $state(null);
  let htmlTemplate: FileList | null = $state(null);
  let emailRangeStart = $state(0);
  let emailRangeCount = $state(0);
  let totalContacts = $state(0);
  let previewContacts: any[] = $state([]);
  
  // Batch State
  let useBatch = $state(false);
  let batchSize = $state(20);
  let batchDelay = $state(60);
  let emailDelay = $state(45);
  let delay = $state(20); // Normal delay
  
  // Schedule State
  let scheduleEmail = $state(false);
  let scheduledTime = $state('');
  let notifyEmail = $state('');
  let notifyBrowser = $state(true);

  // Timezone display
  let userTimezone = $state('');

  onMount(async () => {
    userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await fetchConfigs();
    
    // Initialize Quill dynamically (to avoid SSR issues)
    const Quill = (await import('quill')).default;
    // Load quill CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
    document.head.appendChild(link);
    
    await tick();
    const editorEl = document.getElementById('editor');
    if (editorEl) {
      quill = new Quill('#editor', {
        theme: 'snow',
        placeholder: 'Write your email content here... Use {{FirstName}}, {{Company}} for personalization.',
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ align: [] }],
            ['link', 'image'],
            ['clean']
          ]
        }
      });
    }

    // Setup minimum scheduled time
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const localOneHour = new Date(oneHourLater.getTime() - oneHourLater.getTimezoneOffset() * 60000);
    scheduledTime = localOneHour.toISOString().slice(0, 16);
  });

  async function fetchConfigs() {
    try {
      const res = await api.get('/config/smtp');
      if (res.success) {
        configs = res.userConfigs || [];
        const def = configs.find(c => c.isDefault);
        if (def) selectedConfigId = def.id;
        else if (configs.length > 0) selectedConfigId = configs[0].id;
      }
    } catch {
      toasts.error('Failed to load SMTP configs');
    } finally {
      loadingConfigs = false;
    }
  }

  async function handleExcelChange() {
    if (!excelFile || excelFile.length === 0) return;
    const file = excelFile[0];
    
    const formData = new FormData();
    formData.append('excelFile', file);
    
    try {
      const res = await api.post('/parse-excel', formData);
      if (res.success) {
        totalContacts = res.totalCount;
        previewContacts = res.contacts;
        emailRangeCount = totalContacts;
        toasts.success(`Loaded ${totalContacts} contacts`);
      } else {
        toasts.error(res.message || 'Failed to parse Excel');
        excelFile = null;
      }
    } catch (err: any) {
      toasts.error(err.message || 'Error processing Excel file');
      excelFile = null;
    }
  }

  async function handleSend(e: SubmitEvent) {
    e.preventDefault();
    if (!selectedConfigId) { toasts.warning('Please select an SMTP configuration'); return; }
    if (!excelFile || excelFile.length === 0) { toasts.warning('Please select an Excel file'); return; }
    
    const htmlContent = quill.root.innerHTML;
    const hasTemplate = htmlTemplate && htmlTemplate.length > 0;
    
    if (!hasTemplate && (!htmlContent || htmlContent.trim() === '' || htmlContent === '<p><br></p>')) {
      toasts.warning('Email content is required (editor or template file)');
      return;
    }
    
    if (scheduleEmail && !scheduledTime) {
      toasts.warning('Please select a schedule time');
      return;
    }

    sending = true;
    const formData = new FormData();
    
    const config = configs.find(c => c.id === selectedConfigId);
    if (!config) return;
    
    formData.append('configId', selectedConfigId);
    formData.append('subject', subject);
    formData.append('htmlContent', htmlContent);
    formData.append('excelFile', excelFile[0]);
    if (hasTemplate) formData.append('htmlTemplate', htmlTemplate![0]);
    
    formData.append('emailRangeStart', emailRangeStart.toString());
    formData.append('emailRangeCount', emailRangeCount.toString());
    
    formData.append('useBatch', useBatch ? 'on' : 'off');
    if (useBatch) {
      formData.append('batchSize', batchSize.toString());
      formData.append('batchDelay', batchDelay.toString());
      formData.append('emailDelay', emailDelay.toString());
    } else {
      formData.append('delay', delay.toString());
    }
    
    if (scheduleEmail) {
      const utcTime = new Date(scheduledTime).toISOString();
      formData.append('scheduleEmail', 'on');
      formData.append('scheduledTime', utcTime);
      if (notifyEmail) formData.append('notifyEmail', notifyEmail);
      if (notifyBrowser) formData.append('notifyBrowser', 'on');
    }

    try {
      const res = await api.post('/send', formData);
      if (res.success) {
        if (res.scheduledMode) toasts.success('Campaign scheduled!', `Scheduled for ${new Date(res.scheduledTime).toLocaleString()}`);
        else if (res.batchMode) toasts.success('Batch processing started!');
        else toasts.success('Sending started!');
        
        goto('/dashboard');
      } else {
        toasts.error(res.message || 'Failed to start sending');
      }
    } catch (err: any) {
      toasts.error(err.message || 'Error occurred while sending');
    } finally {
      sending = false;
    }
  }
</script>

<svelte:head><title>Compose & Send — MailPrecision</title></svelte:head>

<div class="mb-6">
  <h2 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Compose Campaign</h2>
  <p class="font-body-md text-on-surface-variant">Set up and launch your bulk email campaign.</p>
</div>

{#if loadingConfigs}
  <div class="glass-card h-[400px] rounded-xl animate-pulse bg-surface-container"></div>
{:else if configs.length === 0}
  <div class="glass-card p-12 rounded-xl flex flex-col items-center justify-center text-center border-dashed">
    <span class="material-symbols-outlined text-[48px] text-on-surface-variant mb-4">settings_suggest</span>
    <h3 class="font-headline-md text-headline-md text-on-surface mb-2">SMTP Configuration Required</h3>
    <p class="font-body-sm text-on-surface-variant mb-6">You need to set up at least one SMTP configuration before you can send emails.</p>
    <a href="/config" class="px-6 py-3 rounded-lg active-gradient text-white font-label-md hover:shadow-lg transition-shadow">Go to Config Settings</a>
  </div>
{:else}
  <form onsubmit={handleSend} class="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
    <!-- Main Content Column -->
    <div class="lg:col-span-2 space-y-6">
      <div class="glass-card rounded-xl overflow-hidden">
        <div class="p-6 border-b border-outline-variant/30 bg-surface/50">
          <h3 class="font-headline-md text-headline-md text-on-surface">Email Content</h3>
        </div>
        <div class="p-6 space-y-6">
          <div class="flex flex-col gap-1.5">
            <label for="config" class="font-label-md text-on-surface-variant">Send From <span class="text-error">*</span></label>
            <select id="config" bind:value={selectedConfigId} class="px-4 py-3 border border-outline-variant rounded-lg bg-surface-bright focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body-sm outline-none" required>
              {#each configs as config}
                <option value={config.id}>{config.name} ({config.fromEmail}) {config.isDefault ? '- Default' : ''}</option>
              {/each}
            </select>
          </div>
          
          <div class="flex flex-col gap-1.5">
            <label for="subject" class="font-label-md text-on-surface-variant">Subject Line <span class="text-error">*</span></label>
            <input id="subject" type="text" bind:value={subject} class="px-4 py-3 border border-outline-variant rounded-lg bg-surface-bright focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body-sm outline-none" placeholder="E.g., Special Offer for {{FirstName}} at {{Company}}" required />
            <small class="text-on-surface-variant opacity-80 text-xs">Use {"{{ColumnName}}"} for personalization based on Excel columns.</small>
          </div>
          
          <div class="flex flex-col gap-1.5">
            <label class="font-label-md text-on-surface-variant">Message Body</label>
            <div class="border border-outline-variant rounded-lg overflow-hidden bg-surface-bright transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <div id="editor" class="min-h-[350px]"></div>
            </div>
          </div>
          
          <div class="flex items-center text-center text-on-surface-variant opacity-60">
            <div class="flex-1 border-t border-outline-variant"></div>
            <span class="px-4 font-label-sm uppercase">Or upload template</span>
            <div class="flex-1 border-t border-outline-variant"></div>
          </div>
          
          <div class="flex flex-col gap-1.5">
            <label for="htmlTemplate" class="font-label-md text-on-surface-variant">HTML Template file</label>
            <input id="htmlTemplate" type="file" bind:files={htmlTemplate} accept=".html" class="block w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-label-sm file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-colors" />
            <small class="text-on-surface-variant opacity-80 text-xs">Overrides the editor content if provided.</small>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Settings Column -->
    <div class="lg:col-span-1 space-y-6">
      
      <!-- Contacts Area -->
      <div class="glass-card rounded-xl overflow-hidden">
        <div class="p-4 border-b border-outline-variant/30 bg-surface/50">
          <h3 class="font-headline-md text-headline-md text-on-surface text-lg">Recipients</h3>
        </div>
        <div class="p-4 space-y-4">
          <div class="flex flex-col gap-1.5">
            <label for="excel" class="font-label-md text-on-surface-variant">Excel/CSV File <span class="text-error">*</span></label>
            <div class="border-2 border-dashed border-outline-variant hover:border-primary transition-colors rounded-xl p-6 text-center cursor-pointer relative bg-surface-bright">
              <input id="excel" type="file" bind:files={excelFile} onchange={handleExcelChange} accept=".xlsx,.xls,.csv" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
              <span class="material-symbols-outlined text-[32px] text-primary mb-2">upload_file</span>
              <p class="font-label-sm text-primary">Click or drag file to upload</p>
              <p class="text-xs text-on-surface-variant mt-1">.xlsx, .xls, .csv</p>
            </div>
            {#if excelFile && excelFile.length > 0}
              <div class="text-sm text-on-surface font-label-sm bg-surface-container-highest px-3 py-2 rounded-lg mt-2 flex items-center justify-between">
                <span class="truncate">{excelFile[0].name}</span>
                <span class="material-symbols-outlined text-[16px] text-success">check_circle</span>
              </div>
            {/if}
          </div>
          
          {#if totalContacts > 0}
            <div class="border border-outline-variant/50 rounded-lg overflow-hidden bg-surface-container-low">
              <div class="p-2 border-b border-outline-variant/50 flex justify-between items-center bg-surface-container">
                <strong class="font-label-sm text-on-surface">Found {totalContacts} contacts</strong>
                <span class="px-2 py-0.5 bg-success/20 text-success text-[10px] uppercase font-bold rounded-full">Ready</span>
              </div>
              <div class="p-3 text-sm space-y-1 max-h-[150px] overflow-y-auto">
                {#each previewContacts as contact}
                  <div class="flex justify-between items-center py-1 border-b border-outline-variant/20 last:border-0">
                    <span class="text-on-surface font-body-sm truncate">{contact.Email}</span>
                    <span class="text-on-surface-variant text-xs truncate max-w-[80px]">{contact.FirstName || ''}</span>
                  </div>
                {/each}
              </div>
              <div class="p-3 border-t border-outline-variant/50 bg-surface-container">
                <label class="font-label-sm text-on-surface-variant block mb-2">Send Range</label>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-on-surface-variant block mb-1">Start Index</label>
                    <input type="number" bind:value={emailRangeStart} min="0" max={Math.max(0, totalContacts - 1)} class="w-full px-2 py-1.5 text-sm border border-outline-variant rounded bg-surface-bright focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label class="text-[10px] text-on-surface-variant block mb-1">Count</label>
                    <input type="number" bind:value={emailRangeCount} min="1" max={totalContacts - emailRangeStart} class="w-full px-2 py-1.5 text-sm border border-outline-variant rounded bg-surface-bright focus:border-primary outline-none" />
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Sending Mode -->
      <div class="glass-card rounded-xl overflow-hidden">
        <div class="p-4 border-b border-outline-variant/30 bg-surface/50">
          <h3 class="font-headline-md text-headline-md text-on-surface text-lg">Sending Mode</h3>
        </div>
        <div class="p-4 space-y-4">
          
          <label class="flex items-center justify-between cursor-pointer group">
            <span class="font-label-md text-on-surface group-hover:text-primary transition-colors">Enable Batch Processing</span>
            <div class="relative inline-block w-12 h-6 rounded-full transition-colors duration-200 {useBatch ? 'bg-primary' : 'bg-surface-container-highest'}">
              <input type="checkbox" bind:checked={useBatch} class="opacity-0 w-0 h-0" />
              <span class="absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 {useBatch ? 'transform translate-x-6' : ''}"></span>
            </div>
          </label>
          
          {#if useBatch}
            <div class="p-3 bg-surface-container rounded-lg space-y-3 animate-fade-in border border-outline-variant/30">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-label-md text-on-surface-variant">Emails per Batch</label>
                <input type="number" bind:value={batchSize} class="px-3 py-1.5 border border-outline-variant rounded-md bg-surface-bright focus:border-primary outline-none text-sm" min="1" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-label-md text-on-surface-variant">Batch Delay (minutes)</label>
                <input type="number" bind:value={batchDelay} class="px-3 py-1.5 border border-outline-variant rounded-md bg-surface-bright focus:border-primary outline-none text-sm" min="1" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-label-md text-on-surface-variant">Email Delay (seconds)</label>
                <input type="number" bind:value={emailDelay} class="px-3 py-1.5 border border-outline-variant rounded-md bg-surface-bright focus:border-primary outline-none text-sm" min="1" />
              </div>
            </div>
          {:else}
            <div class="flex flex-col gap-1">
              <label class="text-xs font-label-md text-on-surface-variant">Delay between Emails (seconds)</label>
              <input type="number" bind:value={delay} class="px-3 py-2 border border-outline-variant rounded-md bg-surface-bright focus:border-primary outline-none text-sm" min="1" />
            </div>
          {/if}
          
          <hr class="border-outline-variant/30" />
          
          <label class="flex items-center justify-between cursor-pointer group">
            <span class="font-label-md text-on-surface group-hover:text-primary transition-colors">Schedule for Later</span>
            <div class="relative inline-block w-12 h-6 rounded-full transition-colors duration-200 {scheduleEmail ? 'bg-primary' : 'bg-surface-container-highest'}">
              <input type="checkbox" bind:checked={scheduleEmail} class="opacity-0 w-0 h-0" />
              <span class="absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 {scheduleEmail ? 'transform translate-x-6' : ''}"></span>
            </div>
          </label>
          
          {#if scheduleEmail}
            <div class="p-3 bg-surface-container rounded-lg space-y-3 animate-fade-in border border-outline-variant/30">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-label-md text-on-surface-variant">Date & Time ({userTimezone})</label>
                <input type="datetime-local" bind:value={scheduledTime} class="px-3 py-1.5 border border-outline-variant rounded-md bg-surface-bright focus:border-primary outline-none text-sm" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-label-md text-on-surface-variant">Notification Email (Optional)</label>
                <input type="email" bind:value={notifyEmail} placeholder="alert@me.com" class="px-3 py-1.5 border border-outline-variant rounded-md bg-surface-bright focus:border-primary outline-none text-sm" />
              </div>
            </div>
          {/if}
        </div>
        
        <div class="p-4 border-t border-outline-variant/30 bg-surface-container-lowest">
          <button type="submit" class="w-full py-3.5 rounded-lg active-gradient text-white font-label-md flex items-center justify-center hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed" disabled={sending}>
            {#if sending}
              <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
              Processing...
            {:else if scheduleEmail}
              <span class="material-symbols-outlined mr-2 text-[20px]">calendar_clock</span>
              Schedule Campaign
            {:else}
              <span class="material-symbols-outlined mr-2 text-[20px]">send</span>
              Send Campaign Now
            {/if}
          </button>
        </div>
      </div>
      
    </div>
  </form>
{/if}

<style>
  :global(.ql-toolbar.ql-snow) {
    border: none !important;
    border-bottom: 1px solid rgba(199, 196, 215, 0.5) !important;
    background: var(--surface-container-low, #f2f4f6);
    border-top-left-radius: 0.5rem;
    border-top-right-radius: 0.5rem;
  }
  :global(.ql-container.ql-snow) {
    border: none !important;
    font-family: 'Inter', sans-serif !important;
    font-size: 0.9375rem !important;
  }
</style>
