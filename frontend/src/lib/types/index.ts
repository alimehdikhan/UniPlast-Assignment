// Frontend TypeScript types matching the backend API responses

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
}

export interface SMTPConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass?: string;
  fromEmail: string;
  fromName: string;
  isDefault: boolean;
  createdAt?: string;
}

export interface SMTPConfigResponse {
  success: boolean;
  data: any;
  hasConfig: boolean;
  hasEnvConfig: boolean;
  currentMode: string;
  envConfig: any;
  userConfigs: SMTPConfig[];
  userId: string;
  userName: string;
}

export interface Contact {
  Email: string;
  FirstName?: string;
  LastName?: string;
  Company?: string;
  Subject?: string;
  [key: string]: any;
}

export interface EmailLog {
  id: string;
  email: string;
  status: 'Sent' | 'Failed' | 'Error';
  message?: string;
  timestamp: string;
  messageId?: string;
  firstName?: string;
  company?: string;
  subject?: string;
}

export interface ReportStats {
  total: number;
  sent: number;
  failed: number;
  successRate: number;
}

export interface BatchStatus {
  isRunning: boolean;
  currentJob: BatchJob | null;
  totalJobs: number;
  completedJobs: number;
}

export interface BatchJob {
  id: string;
  totalContacts: number;
  currentBatch: number;
  totalBatches: number;
  emailsSent: number;
  emailsFailed: number;
  status: 'Running' | 'Paused' | 'Completed' | 'Failed';
  startTime: string;
  config: BatchConfig;
  nextBatchTime?: string;
}

export interface BatchConfig {
  batchSize: number;
  emailDelay: number;
  batchDelay: number;
  enabled: boolean;
}

export interface ScheduledJob {
  id: string;
  user_id?: string;
  scheduled_time: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  contact_count: number;
  subject: string;
  use_batch: boolean;
  notify_email?: string;
  config_name?: string;
}

export interface PollStatus {
  pollNeeded: boolean;
  pollInterval: number;
  hasActiveBatch: boolean;
  hasScheduledJobs: boolean;
  hasRunningScheduledJobs: boolean;
  activeBatchCount: number;
  scheduledJobCount: number;
  lastUpdated: string;
}

export interface DashboardData {
  batch: BatchStatus | null;
  scheduledJobs: ScheduledJob[];
  timestamp: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ProviderInfo {
  provider: string;
  dailyLimit: number;
  maxContacts: number;
  recommendedBatchSize: number;
  recommendedDelay: number;
}
