<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { api } from '$lib/api/client';
  import { toasts } from '$lib/stores/toast';
  import { formatDate, formatCountdown, formatNumber, formatPercent } from '$lib/utils/formatters';
  import type { PollStatus, BatchStatus, ScheduledJob } from '$lib/types';

  let pollStatus: PollStatus | null = $state(null);
  let batchStatus: BatchStatus | null = $state(null);
  let scheduledJobs: ScheduledJob[] = $state([]);
  let loading = $state(true);
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let countdownTimer: ReturnType<typeof setInterval> | null = null;
  let countdownText = $state('');

  onMount(async () => {
    await fetchDashboard();
    loading = false;
    startPolling();
  });

  onDestroy(() => {
    if (pollTimer) clearInterval(pollTimer);
    if (countdownTimer) clearInterval(countdownTimer);
  });

  async function fetchDashboard() {
    try {
      const [pollRes, dataRes] = await Promise.all([
        api.get('/dashboard/poll-status'),
        api.get('/dashboard/data'),
      ]);
      if (pollRes.success) pollStatus = pollRes.data;
      if (dataRes.success) {
        batchStatus = dataRes.data.batch;
        scheduledJobs = dataRes.data.scheduledJobs || [];
      }
    } catch { /* silent */ }
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    const interval = pollStatus?.pollInterval || 30000;
    pollTimer = setInterval(fetchDashboard, interval);
  }

  async function pauseBatch() {
    try { await api.post('/batch-pause'); toasts.info('Batch paused'); await fetchDashboard(); } catch { toasts.error('Failed'); }
  }
  async function resumeBatch() {
    try { await api.post('/batch-resume'); toasts.info('Batch resumed'); await fetchDashboard(); } catch { toasts.error('Failed'); }
  }
  async function cancelBatch() {
    if (!confirm('Cancel the current batch job?')) return;
    try { await api.delete('/batch-cancel'); toasts.success('Batch cancelled'); await fetchDashboard(); } catch { toasts.error('Failed'); }
  }

  $effect(() => {
    if (batchStatus?.currentJob?.nextBatchTime) {
      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = setInterval(() => {
        countdownText = formatCountdown(batchStatus!.currentJob!.nextBatchTime!);
      }, 1000);
    }
  });

  let totalEmailsSent = $derived(batchStatus?.currentJob?.emailsSent || 0);
  let totalEmailsFailed = $derived(batchStatus?.currentJob?.emailsFailed || 0);
  let successRate = $derived(
    totalEmailsSent + totalEmailsFailed > 0 
      ? formatPercent(totalEmailsSent / (totalEmailsSent + totalEmailsFailed) * 100) 
      : '—'
  );
</script>

<svelte:head><title>Dashboard — MailPrecision</title></svelte:head>

<div class="space-y-6">
  <!-- Hero Section: Glass Cards Bento-ish -->
  <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="glass-card md:col-span-1 p-md rounded-xl flex items-center space-x-4 border-l-4 border-primary">
      <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
        <span class="material-symbols-outlined text-primary text-[32px]">send</span>
      </div>
      <div>
        <p class="font-label-sm text-label-sm text-on-surface-variant">Active Batches</p>
        <h2 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{pollStatus?.activeBatchCount ?? 0}</h2>
      </div>
    </div>
    <div class="glass-card p-md rounded-xl flex flex-col justify-between border-l-4 border-error">
      <div class="flex justify-between items-start mb-2">
        <span class="material-symbols-outlined text-error">error</span>
      </div>
      <div>
        <p class="font-label-sm text-label-sm text-on-surface-variant">Failed (Current)</p>
        <h3 class="font-headline-md text-headline-md text-on-surface">{totalEmailsFailed}</h3>
      </div>
    </div>
    <div class="glass-card p-md rounded-xl flex flex-col justify-between border-l-4 border-secondary">
      <div class="flex justify-between items-start mb-2">
        <span class="material-symbols-outlined text-secondary">trending_up</span>
        <div class="w-12 h-6 flex items-end space-x-1">
          <div class="w-1 h-2 bg-secondary/30 rounded-full"></div>
          <div class="w-1 h-4 bg-secondary/30 rounded-full"></div>
          <div class="w-1 h-3 bg-secondary/30 rounded-full"></div>
          <div class="w-1 h-5 bg-secondary rounded-full"></div>
          <div class="w-1 h-4 bg-secondary rounded-full"></div>
        </div>
      </div>
      <div>
        <p class="font-label-sm text-label-sm text-on-surface-variant">Success Rate</p>
        <h3 class="font-headline-md text-headline-md text-on-surface">{successRate}</h3>
      </div>
    </div>
  </section>

  <!-- Active Campaign -->
  {#if batchStatus?.isRunning && batchStatus.currentJob}
    {@const job = batchStatus.currentJob}
    {@const progress = job.totalContacts > 0 ? ((job.emailsSent + job.emailsFailed) / job.totalContacts * 100) : 0}
    
    <section class="glass-card p-md rounded-xl relative overflow-hidden border-2 border-primary/20">
      <div class="flex justify-between items-start mb-4">
        <div>
          <span class="text-[10px] font-bold text-primary uppercase tracking-widest mb-1 block">Live Campaign</span>
          <h2 class="font-headline-md text-headline-md text-on-surface">Batch #{job.id}</h2>
          <span class="inline-block mt-1 px-3 py-1 bg-surface-container-highest text-[10px] font-bold text-on-surface-variant rounded-full uppercase">{job.status}</span>
        </div>
        <div class="flex gap-2">
          {#if job.status === 'Running'}
            <button onclick={pauseBatch} class="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center text-warning hover:bg-warning/30 active:scale-90 transition-transform" title="Pause">
              <span class="material-symbols-outlined">pause</span>
            </button>
          {:else if job.status === 'Paused'}
            <button onclick={resumeBatch} class="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center text-success hover:bg-success/30 active:scale-90 transition-transform" title="Resume">
              <span class="material-symbols-outlined">play_arrow</span>
            </button>
          {/if}
          <button onclick={cancelBatch} class="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center text-error hover:bg-error/20 active:scale-90 transition-transform" title="Cancel">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>
      <div class="space-y-2">
        <div class="flex justify-between font-label-sm text-label-sm">
          <span class="text-on-surface-variant">Progress</span>
          <span class="text-primary font-bold">{formatPercent(progress)}</span>
        </div>
        <div class="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden flex">
          <div class="h-full active-gradient progress-shine" style="width: {job.totalContacts > 0 ? (job.emailsSent / job.totalContacts * 100) : 0}%"></div>
          <div class="h-full bg-error" style="width: {job.totalContacts > 0 ? (job.emailsFailed / job.totalContacts * 100) : 0}%"></div>
        </div>
        <div class="flex justify-between pt-2">
          <p class="text-[12px] text-on-surface-variant italic">
            {#if countdownText}Next batch in: {countdownText}{:else}Running...{/if}
          </p>
          <p class="text-[12px] font-bold text-on-surface">{job.emailsSent + job.emailsFailed} / {job.totalContacts}</p>
        </div>
      </div>
    </section>
  {/if}

  <!-- Scheduled Jobs -->
  <section class="space-y-4">
    <div class="flex justify-between items-center">
      <h3 class="font-headline-md text-headline-md text-on-surface">Scheduled Jobs</h3>
      <a href="/scheduled" class="text-primary font-label-md text-label-md hover:underline">View All</a>
    </div>
    
    <div class="space-y-3">
      {#if loading}
        <div class="glass-card h-20 rounded-xl animate-pulse bg-surface-container"></div>
        <div class="glass-card h-20 rounded-xl animate-pulse bg-surface-container"></div>
      {:else if scheduledJobs.length === 0}
        <div class="glass-card p-8 rounded-xl flex flex-col items-center justify-center text-on-surface-variant border-dashed">
          <span class="material-symbols-outlined text-[48px] mb-2 opacity-50">event_busy</span>
          <p class="font-label-md">No scheduled jobs</p>
          <a href="/send" class="mt-4 px-4 py-2 bg-primary/10 text-primary rounded-full font-label-sm hover:bg-primary/20 transition-colors">Schedule a Campaign</a>
        </div>
      {:else}
        {#each scheduledJobs.slice(0, 5) as job}
          <div class="glass-card p-4 rounded-xl flex items-center justify-between {job.status === 'Running' ? 'border-l-4 border-primary/40' : ''}">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-lg {job.status === 'Running' ? 'bg-primary-fixed text-primary' : 'bg-tertiary-fixed text-on-tertiary-fixed'} flex items-center justify-center">
                <span class="material-symbols-outlined">{job.status === 'Running' ? 'flash_on' : 'event'}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-label-md text-label-md text-on-surface truncate">{job.subject || 'Untitled Campaign'}</p>
                <p class="text-[12px] text-on-surface-variant truncate">{formatDate(job.scheduled_time)} · {job.contact_count} contacts</p>
              </div>
            </div>
            <span class="px-3 py-1 rounded-full text-[10px] font-bold ml-4
              {job.status === 'Scheduled' ? 'bg-surface-container-highest text-on-surface-variant' : 
               job.status === 'Running' ? 'bg-primary/10 text-primary' : 
               job.status === 'Failed' ? 'bg-error/10 text-error' : 
               'bg-surface-container text-outline'}">
              {job.status.toUpperCase()}
            </span>
          </div>
        {/each}
      {/if}
    </div>
  </section>
</div>
