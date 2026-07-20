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
</script>

<svelte:head><title>Dashboard — Bulk Email Sender</title></svelte:head>

<div class="dashboard">
  <!-- Stats Cards -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon" style="background: var(--primary-bg); color: var(--primary);">📊</div>
      <div class="stat-info">
        <span class="stat-value">{pollStatus ? (pollStatus.hasActiveBatch ? 'Active' : 'Idle') : '—'}</span>
        <span class="stat-label">System Status</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: var(--success-bg); color: var(--success);">⚡</div>
      <div class="stat-info">
        <span class="stat-value">{pollStatus?.activeBatchCount ?? 0}</span>
        <span class="stat-label">Active Batches</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: var(--info-bg); color: var(--info);">📅</div>
      <div class="stat-info">
        <span class="stat-value">{pollStatus?.scheduledJobCount ?? 0}</span>
        <span class="stat-label">Scheduled Jobs</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background: var(--warning-bg); color: var(--warning);">🔄</div>
      <div class="stat-info">
        <span class="stat-value">{pollStatus?.pollNeeded ? `${(pollStatus.pollInterval / 1000).toFixed(0)}s` : 'Off'}</span>
        <span class="stat-label">Poll Interval</span>
      </div>
    </div>
  </div>

  <!-- Active Batch Monitor -->
  {#if batchStatus?.isRunning && batchStatus.currentJob}
    {@const job = batchStatus.currentJob}
    <div class="card batch-monitor">
      <div class="card-header">
        <h3>⚡ Active Batch Job</h3>
        <span class="badge badge-{job.status.toLowerCase()}">{job.status}</span>
      </div>
      <div class="card-body">
        <div class="progress-section">
          <div class="progress-info">
            <span>Progress: {job.emailsSent + job.emailsFailed} / {job.totalContacts}</span>
            <span>{job.totalContacts > 0 ? formatPercent((job.emailsSent + job.emailsFailed) / job.totalContacts * 100) : '0%'}</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar progress-success" style="width: {job.totalContacts > 0 ? (job.emailsSent / job.totalContacts * 100) : 0}%"></div>
            <div class="progress-bar progress-danger" style="width: {job.totalContacts > 0 ? (job.emailsFailed / job.totalContacts * 100) : 0}%"></div>
          </div>
        </div>

        <div class="batch-details">
          <div class="detail"><span class="label">Sent</span><span class="value success">{job.emailsSent}</span></div>
          <div class="detail"><span class="label">Failed</span><span class="value danger">{job.emailsFailed}</span></div>
          <div class="detail"><span class="label">Batch</span><span class="value">{job.currentBatch}/{job.totalBatches}</span></div>
          {#if countdownText}
            <div class="detail"><span class="label">Next Batch</span><span class="value">{countdownText}</span></div>
          {/if}
        </div>

        <div class="batch-actions">
          {#if job.status === 'Running'}
            <button class="btn btn-sm btn-warning" onclick={pauseBatch}>⏸ Pause</button>
          {:else if job.status === 'Paused'}
            <button class="btn btn-sm btn-success" onclick={resumeBatch}>▶ Resume</button>
          {/if}
          <button class="btn btn-sm btn-danger" onclick={cancelBatch}>✕ Cancel</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Scheduled Jobs -->
  <div class="card">
    <div class="card-header">
      <h3>📅 Scheduled Jobs</h3>
    </div>
    <div class="card-body">
      {#if loading}
        <div class="skeleton" style="height: 60px; margin-bottom: 8px;"></div>
        <div class="skeleton" style="height: 60px;"></div>
      {:else if scheduledJobs.length === 0}
        <div class="empty-state">
          <span class="empty-icon">📭</span>
          <p>No scheduled jobs</p>
          <a href="/send" class="btn btn-sm btn-primary">Schedule a campaign</a>
        </div>
      {:else}
        <div class="jobs-list">
          {#each scheduledJobs as job}
            <div class="job-item">
              <div class="job-info">
                <strong>{job.subject || 'Untitled Campaign'}</strong>
                <span class="text-muted text-sm">
                  {formatDate(job.scheduled_time)} · {job.contact_count} contacts
                  {#if job.config_name} · {job.config_name}{/if}
                </span>
              </div>
              <span class="badge badge-{job.status}">{job.status}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .dashboard { display: flex; flex-direction: column; gap: 1.5rem; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
  .stat-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: all var(--transition);
  }
  .stat-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
  .stat-icon {
    width: 48px; height: 48px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    flex-shrink: 0;
  }
  .stat-info { display: flex; flex-direction: column; }
  .stat-value { font-size: 1.25rem; font-weight: 700; }
  .stat-label { font-size: 0.75rem; color: var(--text-secondary); }

  .card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  .card-header {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .card-header h3 { font-size: 1rem; }
  .card-body { padding: 1.25rem; }

  .badge {
    padding: 0.25rem 0.625rem;
    border-radius: 999px;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .badge-running, .badge-Running { background: var(--success-bg); color: var(--success); }
  .badge-paused, .badge-Paused { background: var(--warning-bg); color: var(--warning); }
  .badge-scheduled { background: var(--info-bg); color: var(--info); }
  .badge-completed, .badge-Completed { background: var(--primary-bg); color: var(--primary); }
  .badge-failed, .badge-Failed, .badge-cancelled { background: var(--danger-bg); color: var(--danger); }

  .progress-section { margin-bottom: 1rem; }
  .progress-info { display: flex; justify-content: space-between; font-size: 0.8125rem; margin-bottom: 0.5rem; }
  .progress-bar-container {
    height: 8px;
    background: var(--bg-tertiary);
    border-radius: 4px;
    overflow: hidden;
    display: flex;
  }
  .progress-bar { height: 100%; transition: width 0.5s ease; }
  .progress-success { background: var(--success); }
  .progress-danger { background: var(--danger); }

  .batch-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
  .detail { display: flex; flex-direction: column; text-align: center; padding: 0.5rem; background: var(--bg-tertiary); border-radius: var(--radius); }
  .detail .label { font-size: 0.6875rem; color: var(--text-secondary); text-transform: uppercase; }
  .detail .value { font-weight: 700; font-size: 1.125rem; }
  .detail .value.success { color: var(--success); }
  .detail .value.danger { color: var(--danger); }

  .batch-actions { display: flex; gap: 0.5rem; }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: var(--radius);
    font-weight: 500;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all var(--transition);
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
  }
  .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.75rem; }
  .btn-primary { background: var(--gradient); color: white; }
  .btn-primary:hover { background: var(--gradient-hover); }
  .btn-warning { background: var(--warning); color: white; }
  .btn-success { background: var(--success); color: white; }
  .btn-danger { background: var(--danger); color: white; }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
  }
  .empty-icon { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
  .empty-state p { margin-bottom: 1rem; }

  .jobs-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .job-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: var(--bg-tertiary);
    border-radius: var(--radius);
    gap: 1rem;
  }
  .job-info { display: flex; flex-direction: column; gap: 0.125rem; min-width: 0; }
  .job-info strong { font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .batch-monitor { border: 2px solid var(--success); }
</style>
