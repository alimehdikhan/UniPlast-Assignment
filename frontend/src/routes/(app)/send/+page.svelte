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

<svelte:head><title>Compose & Send — Bulk Email Sender</title></svelte:head>

<div class="page-header">
  <div>
    <h2>Compose Campaign</h2>
    <p class="text-muted">Set up and launch your bulk email campaign.</p>
  </div>
</div>

{#if loadingConfigs}
  <div class="skeleton" style="height: 400px; border-radius: var(--radius-md);"></div>
{:else if configs.length === 0}
  <div class="empty-state card">
    <span class="empty-icon">⚙️</span>
    <h3>SMTP Configuration Required</h3>
    <p>You need to set up at least one SMTP configuration before you can send emails.</p>
    <a href="/config" class="btn btn-primary mt-4">Go to Config Settings</a>
  </div>
{:else}
  <form class="send-form" onsubmit={handleSend}>
    <!-- Column 1: Main Content -->
    <div class="main-column">
      <div class="card">
        <div class="card-header"><h3>Email Content</h3></div>
        <div class="card-body">
          <div class="form-group">
            <label for="config">Send From <span class="text-danger">*</span></label>
            <select id="config" bind:value={selectedConfigId} class="form-control" required>
              {#each configs as config}
                <option value={config.id}>{config.name} ({config.fromEmail}) {config.isDefault ? '- Default' : ''}</option>
              {/each}
            </select>
          </div>
          
          <div class="form-group mt-3">
            <label for="subject">Subject Line <span class="text-danger">*</span></label>
            <input id="subject" type="text" bind:value={subject} class="form-control" placeholder="E.g., Special Offer for {{FirstName}} at {{Company}}" required />
            <small class="text-muted">Use {"{{ColumnName}}"} for personalization based on Excel columns.</small>
          </div>
          
          <div class="form-group mt-3">
            <label>Message Body</label>
            <div class="editor-container">
              <div id="editor"></div>
            </div>
          </div>
          
          <div class="divider"><span>OR</span></div>
          
          <div class="form-group">
            <label for="htmlTemplate">Upload HTML Template</label>
            <input id="htmlTemplate" type="file" bind:files={htmlTemplate} accept=".html" class="file-input" />
            <small class="text-muted">Overrides the editor content if provided.</small>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Column 2: Settings -->
    <div class="settings-column">
      <!-- Contacts Card -->
      <div class="card">
        <div class="card-header"><h3>Recipients</h3></div>
        <div class="card-body">
          <div class="form-group">
            <label for="excel">Excel/CSV File <span class="text-danger">*</span></label>
            <input id="excel" type="file" bind:files={excelFile} onchange={handleExcelChange} accept=".xlsx,.xls,.csv" class="file-input" required />
          </div>
          
          {#if totalContacts > 0}
            <div class="preview-box mt-3">
              <div class="preview-header">
                <strong>Found {totalContacts} contacts</strong>
              </div>
              <div class="preview-content">
                {#each previewContacts as contact}
                  <div class="preview-contact">
                    <span>{contact.Email}</span>
                    <span class="text-muted text-xs">{contact.FirstName || ''}</span>
                  </div>
                {/each}
                {#if totalContacts > 5}
                  <div class="text-center text-muted text-xs mt-2">...and {totalContacts - 5} more</div>
                {/if}
              </div>
              
              <div class="range-selector mt-3">
                <label class="text-sm font-semibold">Send Range:</label>
                <div class="range-inputs mt-2">
                  <div class="form-group">
                    <label class="text-xs">Start Index (0-based)</label>
                    <input type="number" bind:value={emailRangeStart} min="0" max={Math.max(0, totalContacts - 1)} class="form-control form-control-sm" />
                  </div>
                  <div class="form-group">
                    <label class="text-xs">Count (Max {totalContacts - emailRangeStart})</label>
                    <input type="number" bind:value={emailRangeCount} min="1" max={totalContacts - emailRangeStart} class="form-control form-control-sm" />
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Sending Mode Card -->
      <div class="card mt-4">
        <div class="card-header"><h3>Sending Mode</h3></div>
        <div class="card-body">
          <div class="toggle-group">
            <input type="checkbox" id="useBatch" bind:checked={useBatch} class="toggle-checkbox" />
            <label for="useBatch" class="toggle-label">Enable Batch Processing</label>
          </div>
          
          {#if useBatch}
            <div class="batch-settings mt-3 p-3 bg-tertiary rounded">
              <div class="form-group">
                <label>Emails per Batch</label>
                <input type="number" bind:value={batchSize} class="form-control form-control-sm" min="1" />
              </div>
              <div class="form-group mt-2">
                <label>Delay between Batches (minutes)</label>
                <input type="number" bind:value={batchDelay} class="form-control form-control-sm" min="1" />
              </div>
              <div class="form-group mt-2">
                <label>Delay between Emails (seconds)</label>
                <input type="number" bind:value={emailDelay} class="form-control form-control-sm" min="1" />
              </div>
            </div>
          {:else}
            <div class="form-group mt-3">
              <label>Delay between Emails (seconds)</label>
              <input type="number" bind:value={delay} class="form-control form-control-sm" min="1" />
            </div>
          {/if}
          
          <hr />
          
          <div class="toggle-group mt-3">
            <input type="checkbox" id="scheduleEmail" bind:checked={scheduleEmail} class="toggle-checkbox" />
            <label for="scheduleEmail" class="toggle-label">Schedule for Later</label>
          </div>
          
          {#if scheduleEmail}
            <div class="schedule-settings mt-3 p-3 bg-tertiary rounded">
              <div class="form-group">
                <label>Date & Time ({userTimezone})</label>
                <input type="datetime-local" bind:value={scheduledTime} class="form-control form-control-sm" />
              </div>
              <div class="form-group mt-2">
                <label>Notification Email (Optional)</label>
                <input type="email" bind:value={notifyEmail} placeholder="alert@me.com" class="form-control form-control-sm" />
              </div>
            </div>
          {/if}
        </div>
        
        <div class="card-footer text-right p-3 bg-tertiary border-top">
          <button type="submit" class="btn btn-primary w-100" disabled={sending}>
            {#if sending}
              <span class="spinner-sm"></span> Processing...
            {:else if scheduleEmail}
              📅 Schedule Campaign
            {:else}
              🚀 Send Emails Now
            {/if}
          </button>
        </div>
      </div>
    </div>
  </form>
{/if}

<style>
  .send-form {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1.5rem;
  }
  
  @media (max-width: 992px) {
    .send-form { grid-template-columns: 1fr; }
  }
  
  .card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
    height: fit-content;
  }
  .card-header { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); background: var(--bg-tertiary); }
  .card-header h3 { margin: 0; font-size: 1.125rem; }
  .card-body { padding: 1.25rem; }
  
  .form-group { display: flex; flex-direction: column; gap: 0.375rem; }
  label { font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
  .text-danger { color: var(--danger); }
  .text-muted { color: var(--text-secondary); }
  
  .form-control {
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 0.875rem;
    background: var(--bg-primary);
  }
  .form-control:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-bg); }
  .form-control-sm { padding: 0.375rem 0.625rem; font-size: 0.8125rem; }
  
  .file-input {
    padding: 0.5rem;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    background: var(--bg-tertiary);
    width: 100%;
  }
  
  .editor-container {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  :global(.ql-toolbar.ql-snow) { border: none !important; border-bottom: 1px solid var(--border) !important; background: var(--bg-tertiary); }
  :global(.ql-container.ql-snow) { border: none !important; height: 350px !important; font-family: inherit !important; font-size: 0.9375rem !important; }
  
  .divider {
    display: flex; align-items: center; text-align: center; margin: 1.5rem 0; color: var(--text-tertiary);
  }
  .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid var(--border); }
  .divider span { padding: 0 10px; font-size: 0.75rem; font-weight: 600; }
  
  .preview-box { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .preview-header { padding: 0.5rem 0.75rem; background: var(--bg-tertiary); border-bottom: 1px solid var(--border); font-size: 0.8125rem; }
  .preview-content { padding: 0.75rem; display: flex; flex-direction: column; gap: 0.25rem; }
  .preview-contact { display: flex; justify-content: space-between; font-size: 0.8125rem; padding: 2px 0; }
  
  .range-selector { padding: 0.75rem; border-top: 1px solid var(--border); background: var(--bg-tertiary); }
  .range-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  
  .toggle-group { display: flex; align-items: center; gap: 0.5rem; }
  .toggle-checkbox { width: 1.125rem; height: 1.125rem; cursor: pointer; }
  .toggle-label { cursor: pointer; user-select: none; font-weight: 600; }
  
  .bg-tertiary { background: var(--bg-tertiary); }
  .rounded { border-radius: var(--radius); }
  .p-3 { padding: 1rem; }
  .mt-2 { margin-top: 0.5rem; }
  .mt-3 { margin-top: 1rem; }
  .mt-4 { margin-top: 1.5rem; }
  
  .btn {
    padding: 0.75rem 1rem; border: none; border-radius: var(--radius);
    font-weight: 600; font-size: 0.9375rem; cursor: pointer;
    display: inline-flex; justify-content: center; align-items: center; gap: 0.5rem;
    transition: all var(--transition);
  }
  .btn-primary { background: var(--gradient); color: white; }
  .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: var(--shadow-md); }
  .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
  .w-100 { width: 100%; }
  
  .spinner-sm {
    width: 16px; height: 16px; border: 2px solid currentColor;
    border-right-color: transparent; border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  
  hr { border: none; border-top: 1px solid var(--border); margin: 1.5rem 0; }
</style>
