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

<svelte:head><title>Reports & Analytics — Bulk Email Sender</title></svelte:head>

<div class="page-header">
  <div class="header-content">
    <h2>Campaign Reports</h2>
    <p class="text-muted">View email delivery logs and statistics</p>
  </div>
  <div class="header-actions">
    <button class="btn btn-outline" onclick={downloadCSV}>📄 Export CSV</button>
    <button class="btn btn-outline" onclick={downloadJSON}>{`{ }`} Export JSON</button>
    <button class="btn btn-danger" onclick={clearLogs}>🗑️ Clear Logs</button>
  </div>
</div>

{#if loading}
  <div class="skeleton" style="height: 120px; margin-bottom: 1.5rem;"></div>
  <div class="skeleton" style="height: 400px;"></div>
{:else}
  <!-- Stats Summary -->
  {#if stats}
  <div class="stats-row">
    <div class="stat-box">
      <span class="stat-title">Total Sent Attempted</span>
      <span class="stat-value">{stats.total}</span>
    </div>
    <div class="stat-box success">
      <span class="stat-title">Successfully Sent</span>
      <span class="stat-value">{stats.sent}</span>
    </div>
    <div class="stat-box danger">
      <span class="stat-title">Failed</span>
      <span class="stat-value">{stats.failed}</span>
    </div>
    <div class="stat-box primary">
      <span class="stat-title">Success Rate</span>
      <span class="stat-value">{formatPercent(stats.successRate)}</span>
    </div>
  </div>
  {/if}

  <!-- Logs Table -->
  <div class="card logs-card">
    <div class="card-header">
      <div class="filters">
        <input type="text" placeholder="Search emails or subjects..." bind:value={searchQuery} class="search-input" />
        <select bind:value={filterStatus} class="status-select">
          <option value="All">All Statuses</option>
          <option value="Sent">Sent (Success)</option>
          <option value="Failed">Failed</option>
          <option value="Error">Error</option>
        </select>
      </div>
    </div>
    
    <div class="table-container">
      {#if filteredLogs.length === 0}
        <div class="empty-state">
          <span class="empty-icon">📝</span>
          <p>No logs found matching your criteria.</p>
        </div>
      {:else}
        <table class="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Recipient</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredLogs as log (log.id)}
              <tr>
                <td class="text-nowrap">{formatDate(log.timestamp)}</td>
                <td>
                  <div class="recipient-info">
                    <span class="email">{log.email}</span>
                    {#if log.firstName || log.company}
                      <span class="text-xs text-muted">
                        {log.firstName || ''} {log.company ? `(${log.company})` : ''}
                      </span>
                    {/if}
                  </div>
                </td>
                <td><span class="truncate" title={log.subject}>{log.subject || '—'}</span></td>
                <td>
                  <span class="badge badge-{log.status.toLowerCase()}">{log.status}</span>
                </td>
                <td class="text-xs text-muted truncate-msg" title={log.message || log.messageId || ''}>
                  {log.message || log.messageId || '—'}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  </div>
{/if}

<style>
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .header-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .stat-box {
    background: var(--bg-secondary);
    padding: 1.25rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .stat-box.success { border-bottom: 4px solid var(--success); }
  .stat-box.danger { border-bottom: 4px solid var(--danger); }
  .stat-box.primary { border-bottom: 4px solid var(--primary); }
  
  .stat-title { font-size: 0.8125rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }
  .stat-value { font-size: 1.75rem; font-weight: 700; color: var(--text-primary); }
  
  .card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  
  .card-header {
    padding: 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-tertiary);
  }
  
  .filters {
    display: flex;
    gap: 1rem;
  }
  
  .search-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 0.875rem;
  }
  
  .status-select {
    padding: 0.5rem 2rem 0.5rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 0.875rem;
    background: var(--bg-secondary);
  }
  
  .table-container {
    overflow-x: auto;
  }
  
  .table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  
  .table th, .table td {
    padding: 0.875rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }
  
  .table th {
    font-weight: 600;
    color: var(--text-secondary);
    background: rgba(0,0,0,0.02);
  }
  
  .table tbody tr:hover {
    background: var(--bg-tertiary);
  }
  
  .text-nowrap { white-space: nowrap; }
  .recipient-info { display: flex; flex-direction: column; gap: 2px; }
  .email { font-weight: 500; }
  
  .truncate {
    display: inline-block;
    max-width: 250px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: middle;
  }
  
  .truncate-msg {
    max-width: 200px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .badge-sent, .badge-success { background: var(--success-bg); color: var(--success); }
  .badge-failed, .badge-error { background: var(--danger-bg); color: var(--danger); }
  
  .btn {
    padding: 0.5rem 1rem;
    border: 1px solid transparent;
    border-radius: var(--radius);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
  .btn-outline { background: transparent; border-color: var(--border); color: var(--text-primary); }
  .btn-outline:hover { background: var(--bg-tertiary); }
  .btn-danger { background: var(--danger); color: white; }
  
  .empty-state {
    padding: 3rem;
    text-align: center;
    color: var(--text-secondary);
  }
  .empty-icon { font-size: 2.5rem; margin-bottom: 1rem; display: block; opacity: 0.5; }
</style>
