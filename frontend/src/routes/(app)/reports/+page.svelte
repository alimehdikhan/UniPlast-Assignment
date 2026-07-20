<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';
  import { toasts } from '$lib/stores/toast';
  import { formatDate, formatPercent } from '$lib/utils/formatters';
  import type { EmailLog, ReportStats } from '$lib/types';

  let logs: EmailLog[] = $state([]);
  let stats: ReportStats | null = $state(null);
  let loading = $state(true);
  let filterStatus = $state('All');
  let searchQuery = $state('');

  let filteredLogs = $derived(
    logs.filter(log => {
      const matchStatus = filterStatus === 'All' || log.status === filterStatus;
      const matchSearch = !searchQuery || 
        log.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.subject && log.subject.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchStatus && matchSearch;
    })
  );

  onMount(async () => {
    await fetchReports();
  });

  async function fetchReports() {
    loading = true;
    try {
      const res = await api.get('/report');
      if (res.success) {
        logs = res.data.logs || [];
        stats = res.data.stats || null;
      }
    } catch {
      toasts.error('Failed to load reports');
    } finally {
      loading = false;
    }
  }

  async function clearLogs() {
    if (!confirm('Are you sure you want to clear all logs? This cannot be undone.')) return;
    try {
      await api.delete('/report/clear');
      toasts.success('Logs cleared');
      await fetchReports();
    } catch {
      toasts.error('Failed to clear logs');
    }
  }

  function downloadCSV() {
    window.location.href = '/report/export/csv';
  }

  function downloadJSON() {
    window.location.href = '/report/export/json';
  }
</script>

<svelte:head><title>Reports & Analytics — MailPrecision</title></svelte:head>

<div class="flex flex-wrap justify-between items-center gap-4 mb-8">
  <div>
    <h2 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Campaign Reports</h2>
    <p class="font-body-md text-on-surface-variant">View email delivery logs and statistics</p>
  </div>
  <div class="flex gap-2">
    <button class="px-4 py-2 rounded-lg border border-outline-variant/50 text-on-surface-variant font-label-md hover:bg-surface-container-high transition-colors flex items-center bg-surface-bright" onclick={downloadCSV}>
      <span class="material-symbols-outlined mr-2 text-[18px]">description</span> Export CSV
    </button>
    <button class="px-4 py-2 rounded-lg border border-outline-variant/50 text-on-surface-variant font-label-md hover:bg-surface-container-high transition-colors flex items-center bg-surface-bright" onclick={downloadJSON}>
      <span class="material-symbols-outlined mr-2 text-[18px]">data_object</span> Export JSON
    </button>
    <button class="px-4 py-2 rounded-lg bg-error-container text-on-error-container font-label-md hover:bg-error/20 transition-colors flex items-center" onclick={clearLogs}>
      <span class="material-symbols-outlined mr-2 text-[18px]">delete</span> Clear Logs
    </button>
  </div>
</div>

{#if loading}
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <div class="glass-card h-28 rounded-xl animate-pulse bg-surface-container"></div>
    <div class="glass-card h-28 rounded-xl animate-pulse bg-surface-container"></div>
    <div class="glass-card h-28 rounded-xl animate-pulse bg-surface-container"></div>
    <div class="glass-card h-28 rounded-xl animate-pulse bg-surface-container"></div>
  </div>
  <div class="glass-card h-[400px] rounded-xl animate-pulse bg-surface-container"></div>
{:else}
  <!-- Stats Summary -->
  {#if stats}
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <div class="glass-card p-5 rounded-xl border-l-4 border-outline-variant">
      <span class="font-label-sm text-on-surface-variant uppercase tracking-wider block mb-1">Attempted</span>
      <span class="font-headline-lg text-3xl text-on-surface font-bold">{stats.total}</span>
    </div>
    <div class="glass-card p-5 rounded-xl border-l-4 border-success">
      <span class="font-label-sm text-on-surface-variant uppercase tracking-wider block mb-1">Successfully Sent</span>
      <span class="font-headline-lg text-3xl text-on-surface font-bold">{stats.sent}</span>
    </div>
    <div class="glass-card p-5 rounded-xl border-l-4 border-error">
      <span class="font-label-sm text-on-surface-variant uppercase tracking-wider block mb-1">Failed</span>
      <span class="font-headline-lg text-3xl text-on-surface font-bold">{stats.failed}</span>
    </div>
    <div class="glass-card p-5 rounded-xl border-l-4 border-primary">
      <span class="font-label-sm text-on-surface-variant uppercase tracking-wider block mb-1">Success Rate</span>
      <span class="font-headline-lg text-3xl text-on-surface font-bold">{formatPercent(stats.successRate)}</span>
    </div>
  </div>
  {/if}

  <!-- Logs Table -->
  <div class="glass-card rounded-xl overflow-hidden border border-outline-variant/30">
    <div class="p-4 border-b border-outline-variant/30 bg-surface/50 flex flex-wrap gap-4 items-center justify-between">
      <h3 class="font-headline-md text-lg text-on-surface">Delivery Logs</h3>
      <div class="flex gap-4 w-full sm:w-auto">
        <div class="relative flex-1 sm:w-64">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60 text-[20px]">search</span>
          <input type="text" placeholder="Search emails or subjects..." bind:value={searchQuery} class="w-full pl-10 pr-4 py-2 border border-outline-variant/50 rounded-lg bg-surface-bright focus:border-primary outline-none font-body-sm transition-colors" />
        </div>
        <select bind:value={filterStatus} class="pl-4 pr-8 py-2 border border-outline-variant/50 rounded-lg bg-surface-bright focus:border-primary outline-none font-body-sm transition-colors cursor-pointer">
          <option value="All">All Statuses</option>
          <option value="Sent">Sent (Success)</option>
          <option value="Failed">Failed</option>
          <option value="Error">Error</option>
        </select>
      </div>
    </div>
    
    <div class="overflow-x-auto">
      {#if filteredLogs.length === 0}
        <div class="p-12 text-center text-on-surface-variant flex flex-col items-center">
          <span class="material-symbols-outlined text-[48px] opacity-30 mb-2">assignment</span>
          <p class="font-label-md">No logs found matching your criteria.</p>
        </div>
      {:else}
        <table class="w-full text-left font-body-sm border-collapse">
          <thead>
            <tr class="border-b border-outline-variant/30 bg-surface-container-lowest/50 text-on-surface-variant font-label-sm">
              <th class="py-4 px-6 font-semibold whitespace-nowrap">Timestamp</th>
              <th class="py-4 px-6 font-semibold">Recipient</th>
              <th class="py-4 px-6 font-semibold">Subject</th>
              <th class="py-4 px-6 font-semibold">Status</th>
              <th class="py-4 px-6 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/20 bg-surface-bright/30">
            {#each filteredLogs as log (log.id)}
              <tr class="hover:bg-surface-container-low transition-colors">
                <td class="py-4 px-6 whitespace-nowrap text-on-surface-variant text-xs">{formatDate(log.timestamp)}</td>
                <td class="py-4 px-6">
                  <div class="flex flex-col gap-0.5">
                    <span class="font-medium text-on-surface">{log.email}</span>
                    {#if log.firstName || log.company}
                      <span class="text-[11px] text-on-surface-variant opacity-80">
                        {log.firstName || ''} {log.company ? `(${log.company})` : ''}
                      </span>
                    {/if}
                  </div>
                </td>
                <td class="py-4 px-6 text-on-surface">
                  <span class="inline-block max-w-[200px] truncate align-middle" title={log.subject}>{log.subject || '—'}</span>
                </td>
                <td class="py-4 px-6">
                  <span class="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full 
                    {log.status === 'Sent' ? 'bg-success/10 text-success' : 
                     log.status === 'Failed' || log.status === 'Error' ? 'bg-error/10 text-error' : 
                     'bg-outline-variant/20 text-on-surface-variant'}">
                    {log.status}
                  </span>
                </td>
                <td class="py-4 px-6 text-xs text-on-surface-variant opacity-80">
                  <span class="inline-block max-w-[200px] truncate align-middle" title={log.message || log.messageId || ''}>
                    {log.message || log.messageId || '—'}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  </div>
{/if}
