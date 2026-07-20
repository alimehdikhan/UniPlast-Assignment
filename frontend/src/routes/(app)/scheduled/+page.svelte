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

<svelte:head><title>Scheduled Campaigns — Bulk Email Sender</title></svelte:head>

<div class="page-header">
  <div>
    <h2>Scheduled Campaigns</h2>
    <p class="text-muted">Manage your upcoming automated email blasts</p>
  </div>
  <button class="btn btn-outline" onclick={fetchJobs}>🔄 Refresh</button>
</div>

{#if loading}
  <div class="skeleton" style="height: 300px; border-radius: var(--radius-md);"></div>
{:else if jobs.length === 0}
  <div class="empty-state">
    <span class="empty-icon">📅</span>
    <h3>No Scheduled Campaigns</h3>
    <p>You don't have any upcoming email campaigns.</p>
    <a href="/send" class="btn btn-primary mt-4">Schedule a Campaign</a>
  </div>
{:else}
  <div class="jobs-grid">
    {#each jobs as job}
      <div class="job-card">
        <div class="job-header">
          <div class="job-status">
            <span class="badge badge-{job.status}">{job.status}</span>
          </div>
          <div class="job-actions">
            {#if job.status === 'scheduled'}
              <button class="btn-cancel" onclick={() => cancelJob(job.id)} title="Cancel job">✕</button>
            {/if}
          </div>
        </div>
        
        <div class="job-body">
          <h3 class="job-subject">{job.subject || 'Untitled Campaign'}</h3>
          
          <div class="job-details">
            <div class="detail-item">
              <span class="icon">📅</span>
              <div class="detail-text">
                <span class="label">Scheduled For</span>
                <span class="value">{formatDate(job.scheduled_time)}</span>
              </div>
            </div>
            
            <div class="detail-item">
              <span class="icon">👥</span>
              <div class="detail-text">
                <span class="label">Recipients</span>
                <span class="value">{job.contact_count} contacts</span>
              </div>
            </div>
            
            <div class="detail-item">
              <span class="icon">⚙️</span>
              <div class="detail-text">
                <span class="label">Configuration</span>
                <span class="value">{job.config_name || 'Default Config'}</span>
              </div>
            </div>
            
            {#if job.use_batch}
              <div class="detail-item">
                <span class="icon">📦</span>
                <div class="detail-text">
                  <span class="label">Mode</span>
                  <span class="value">Batch Processing</span>
                </div>
              </div>
            {/if}
            
            {#if job.notify_email}
              <div class="detail-item">
                <span class="icon">🔔</span>
                <div class="detail-text">
                  <span class="label">Notify</span>
                  <span class="value">{job.notify_email}</span>
                </div>
              </div>
            {/if}
          </div>
        </div>
        
        <div class="job-footer text-xs text-muted">
          Job ID: {job.id}
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .jobs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }
  
  .job-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: all var(--transition);
  }
  
  .job-card:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
  
  .job-header {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-tertiary);
  }
  
  .badge {
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  .badge-scheduled { background: var(--info-bg); color: var(--info); }
  .badge-running { background: var(--success-bg); color: var(--success); }
  
  .btn-cancel {
    background: none;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition);
  }
  .btn-cancel:hover {
    background: var(--danger-bg);
    color: var(--danger);
  }
  
  .job-body {
    padding: 1.25rem;
    flex: 1;
  }
  
  .job-subject {
    font-size: 1.125rem;
    margin-bottom: 1.25rem;
    color: var(--text-primary);
  }
  
  .job-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  
  .detail-item {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }
  
  .icon {
    background: var(--bg-tertiary);
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
  }
  
  .detail-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  
  .label {
    font-size: 0.6875rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    font-weight: 600;
  }
  
  .value {
    font-size: 0.875rem;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .job-footer {
    padding: 0.75rem 1.25rem;
    background: var(--bg-tertiary);
    border-top: 1px solid var(--border);
  }
  
  .empty-state {
    padding: 4rem 2rem;
    text-align: center;
    background: var(--bg-secondary);
    border: 1px dashed var(--border);
    border-radius: var(--radius-md);
  }
  .empty-icon { font-size: 3rem; margin-bottom: 1rem; display: inline-block; opacity: 0.5; }
  
  .btn { padding: 0.5rem 1rem; border-radius: var(--radius); font-weight: 500; cursor: pointer; text-decoration: none; border: 1px solid transparent; font-size: 0.875rem;}
  .btn-outline { background: transparent; border-color: var(--border); color: var(--text-primary); }
  .btn-outline:hover { background: var(--bg-tertiary); }
  .btn-primary { background: var(--gradient); color: white; display: inline-block; }
  .mt-4 { margin-top: 1rem; }
</style>
