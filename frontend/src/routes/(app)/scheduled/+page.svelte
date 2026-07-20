<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';
  import { toasts } from '$lib/stores/toast';
  import { formatDate } from '$lib/utils/formatters';
  import type { ScheduledJob } from '$lib/types';

  let jobs: ScheduledJob[] = $state([]);
  let loading = $state(true);

  onMount(async () => {
    await fetchJobs();
  });

  async function fetchJobs() {
    loading = true;
    try {
      const res = await api.get('/scheduled-jobs');
      if (res.success) {
        jobs = res.data || [];
      }
    } catch {
      toasts.error('Failed to load scheduled jobs');
    } finally {
      loading = false;
    }
  }

  async function cancelJob(id: string) {
    if (!confirm('Cancel this scheduled campaign?')) return;
    try {
      const res = await api.delete(`/scheduled-jobs/${id}`);
      if (res.success) {
        toasts.success('Job cancelled successfully');
        await fetchJobs();
      } else {
        toasts.error(res.message || 'Failed to cancel job');
      }
    } catch {
      toasts.error('Failed to cancel job');
    }
  }
</script>

<svelte:head><title>Scheduled Campaigns — MailPrecision</title></svelte:head>

<div class="flex justify-between items-center mb-8">
  <div>
    <h2 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Scheduled Campaigns</h2>
    <p class="font-body-md text-on-surface-variant">Manage your upcoming automated email blasts</p>
  </div>
  <button class="px-4 py-2 rounded-lg border border-outline-variant/50 text-on-surface-variant font-label-md hover:bg-surface-container-high transition-colors flex items-center bg-surface-bright" onclick={fetchJobs}>
    <span class="material-symbols-outlined mr-2 text-[18px]">refresh</span> Refresh
  </button>
</div>

{#if loading}
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <div class="glass-card h-[280px] rounded-xl animate-pulse bg-surface-container"></div>
    <div class="glass-card h-[280px] rounded-xl animate-pulse bg-surface-container"></div>
  </div>
{:else if jobs.length === 0}
  <div class="glass-card p-12 rounded-xl flex flex-col items-center justify-center text-center border-dashed border-2 border-outline-variant/50">
    <span class="material-symbols-outlined text-[48px] text-on-surface-variant mb-4 opacity-50">event_busy</span>
    <h3 class="font-headline-md text-headline-md text-on-surface mb-2">No Scheduled Campaigns</h3>
    <p class="font-body-sm text-on-surface-variant mb-6">You don't have any upcoming email campaigns.</p>
    <a href="/send" class="px-6 py-3 rounded-lg active-gradient text-white font-label-md hover:shadow-lg transition-shadow">Schedule a Campaign</a>
  </div>
{:else}
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each jobs as job}
      <div class="glass-card rounded-xl flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-outline-variant/30">
        <div class="p-5 border-b border-outline-variant/20 flex justify-between items-start bg-surface-bright/50">
          <div>
            <span class="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full 
              {job.status === 'Scheduled' || job.status === 'scheduled' ? 'bg-info/10 text-info border border-info/20' : 
               job.status === 'Running' || job.status === 'running' ? 'bg-success/10 text-success border border-success/20' : 
               'bg-outline-variant/20 text-on-surface-variant'}">
              {job.status}
            </span>
          </div>
          {#if job.status === 'Scheduled' || job.status === 'scheduled'}
            <button class="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error-container hover:text-error transition-colors bg-surface" onclick={() => cancelJob(job.id)} title="Cancel job">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          {/if}
        </div>
        
        <div class="p-5 flex-1 flex flex-col">
          <h3 class="font-headline-md text-lg text-on-surface font-bold mb-5 truncate" title={job.subject}>{job.subject || 'Untitled Campaign'}</h3>
          
          <div class="grid grid-cols-1 gap-3 font-body-sm">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
                <span class="material-symbols-outlined text-[16px]">calendar_clock</span>
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">Scheduled For</span>
                <span class="text-on-surface font-medium truncate">{formatDate(job.scheduled_time)}</span>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
                <span class="material-symbols-outlined text-[16px]">group</span>
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">Recipients</span>
                <span class="text-on-surface font-medium">{job.contact_count} contacts</span>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
                <span class="material-symbols-outlined text-[16px]">settings</span>
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">Configuration</span>
                <span class="text-on-surface font-medium truncate">{job.config_name || 'Default Config'}</span>
              </div>
            </div>
            
            {#if job.use_batch}
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <span class="material-symbols-outlined text-[16px]">layers</span>
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">Mode</span>
                  <span class="text-primary font-medium truncate">Batch Processing</span>
                </div>
              </div>
            {/if}
            
            {#if job.notify_email}
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">
                  <span class="material-symbols-outlined text-[16px]">notifications</span>
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">Notify</span>
                  <span class="text-on-surface font-medium truncate" title={job.notify_email}>{job.notify_email}</span>
                </div>
              </div>
            {/if}
          </div>
        </div>
        
        <div class="p-3 bg-surface-container-lowest border-t border-outline-variant/20 text-center">
          <span class="text-[10px] text-on-surface-variant font-mono">Job ID: {job.id.substring(0, 8)}...</span>
        </div>
      </div>
    {/each}
  </div>
{/if}
