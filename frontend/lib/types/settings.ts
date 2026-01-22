/**
 * Settings Type Definitions
 *
 * TypeScript interfaces matching the backend CrawlSettings models.
 */

export type OutputFormat = 'jsonl' | 'json' | 'csv' | 'parquet';
export type QualityAction = 'pause' | 'stop' | 'continue';

// Category 1: Limits & Constraints
export interface LimitsSettings {
  max_pages: number;
  max_documents: number;
  max_duration_minutes: number;
  max_file_size_mb: number;
  max_total_size_gb: number;
  min_file_size_kb: number;
  max_depth: number;
  max_retries: number;
  timeout_seconds: number;
  enable_budget_controls: boolean;
  pause_at_limit: boolean;
}

// Category 2: Quality Gates
export interface QualitySettings {
  min_quality_score: number;
  min_relevance_score: number;
  max_duplicate_percentage: number;
  min_text_length: number;
  require_date: boolean;
  require_metadata: string[];
  stop_on_quality_drop: boolean;
  quality_threshold_percentage: number;
  quality_check_interval: number;
  quality_gate_action: QualityAction;
}

// Category 3: Performance & Politeness
export interface PerformanceSettings {
  concurrent_requests: number;
  delay_seconds: number;
  respect_robots_txt: boolean;
  user_agent: string;
  enable_caching: boolean;
  enable_compression: boolean;
  follow_redirects: boolean;
  max_redirects: number;
  adaptive_delay: boolean;
  rate_limit_backoff: boolean;
}

// Category 4: Data Processing
export interface ProcessingSettings {
  extract_text: boolean;
  extract_tables: boolean;
  extract_images: boolean;
  run_ocr: boolean;
  enable_deduplication: boolean;
  dedupe_threshold: number;
  enable_pii_redaction: boolean;
  generate_embeddings: boolean;
  run_nemo_curator: boolean;
  extract_metadata: boolean;
  language_detection: boolean;
  content_classification: boolean;
}

// Category 5: Output Configuration
export interface OutputSettings {
  format: OutputFormat;
  include_raw_files: boolean;
  create_manifest: boolean;
  hierarchical_structure: boolean;
  preserve_filenames: boolean;
  add_timestamps: boolean;
  compress_output: boolean;
  max_filename_length: number;
  include_failed_urls: boolean;
}

// Category 6: Budget Controls
export interface BudgetSettings {
  max_api_cost_usd: number;
  warn_at_percentage: number;
  pause_at_percentage: number;
  hard_stop_at_100: boolean;
  track_token_usage: boolean;
  cost_per_page_estimate: number;
}

// Category 7: Notifications
export interface EmailNotificationSettings {
  enabled: boolean;
  recipients: string[];
  on_complete: boolean;
  on_failure: boolean;
  on_quality_drop: boolean;
  include_summary: boolean;
}

export interface SlackNotificationSettings {
  enabled: boolean;
  webhook_url: string;
  channel: string;
  on_complete: boolean;
  on_failure: boolean;
}

export interface WebhookNotificationSettings {
  enabled: boolean;
  url: string;
  headers: Record<string, string>;
  on_complete: boolean;
  on_failure: boolean;
}

export interface NotificationSettings {
  email: EmailNotificationSettings;
  slack: SlackNotificationSettings;
  webhook: WebhookNotificationSettings;
}

// Complete Settings
export interface CrawlSettings {
  limits: LimitsSettings;
  quality: QualitySettings;
  performance: PerformanceSettings;
  processing: ProcessingSettings;
  output: OutputSettings;
  budget: BudgetSettings;
  notifications: NotificationSettings;
}

// Preset Configuration
export interface PresetConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  settings: CrawlSettings;
  is_builtin: boolean;
  created_at?: string;
  usage_count?: number;
}

// API Responses
export interface SettingsResponse {
  settings: CrawlSettings;
  last_updated: string | null;
  active_preset: string | null;
}

export interface UpdateResponse {
  success: boolean;
  message: string;
  settings: CrawlSettings;
}

export interface PresetListResponse {
  presets: PresetConfig[];
  total: number;
}

// Settings Category metadata
export interface SettingsCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// Default settings helper
export const defaultSettings: CrawlSettings = {
  limits: {
    max_pages: 10000,
    max_documents: 5000,
    max_duration_minutes: 360,
    max_file_size_mb: 50,
    max_total_size_gb: 10,
    min_file_size_kb: 10,
    max_depth: 5,
    max_retries: 3,
    timeout_seconds: 60,
    enable_budget_controls: true,
    pause_at_limit: true,
  },
  quality: {
    min_quality_score: 0.7,
    min_relevance_score: 0.6,
    max_duplicate_percentage: 10,
    min_text_length: 100,
    require_date: false,
    require_metadata: ['title'],
    stop_on_quality_drop: false,
    quality_threshold_percentage: 50,
    quality_check_interval: 100,
    quality_gate_action: 'continue',
  },
  performance: {
    concurrent_requests: 10,
    delay_seconds: 1.0,
    respect_robots_txt: true,
    user_agent: 'GenCrawl/1.0 (+https://gencrawl.io/bot)',
    enable_caching: true,
    enable_compression: true,
    follow_redirects: true,
    max_redirects: 5,
    adaptive_delay: true,
    rate_limit_backoff: true,
  },
  processing: {
    extract_text: true,
    extract_tables: true,
    extract_images: false,
    run_ocr: false,
    enable_deduplication: true,
    dedupe_threshold: 0.85,
    enable_pii_redaction: false,
    generate_embeddings: false,
    run_nemo_curator: false,
    extract_metadata: true,
    language_detection: true,
    content_classification: false,
  },
  output: {
    format: 'jsonl',
    include_raw_files: true,
    create_manifest: true,
    hierarchical_structure: true,
    preserve_filenames: true,
    add_timestamps: true,
    compress_output: false,
    max_filename_length: 200,
    include_failed_urls: true,
  },
  budget: {
    max_api_cost_usd: 10.0,
    warn_at_percentage: 80,
    pause_at_percentage: 95,
    hard_stop_at_100: true,
    track_token_usage: true,
    cost_per_page_estimate: 0.001,
  },
  notifications: {
    email: {
      enabled: false,
      recipients: [],
      on_complete: true,
      on_failure: true,
      on_quality_drop: true,
      include_summary: true,
    },
    slack: {
      enabled: false,
      webhook_url: '',
      channel: '#crawl-alerts',
      on_complete: true,
      on_failure: true,
    },
    webhook: {
      enabled: false,
      url: '',
      headers: {},
      on_complete: true,
      on_failure: true,
    },
  },
};

// Categories list
export const settingsCategories: SettingsCategory[] = [
  { id: 'limits', name: 'Limits & Constraints', description: 'Control crawl boundaries and resource usage', icon: 'Gauge' },
  { id: 'quality', name: 'Quality Gates', description: 'Set quality thresholds and validation rules', icon: 'Shield' },
  { id: 'performance', name: 'Performance', description: 'Configure crawl speed and politeness', icon: 'Zap' },
  { id: 'processing', name: 'Processing', description: 'Data extraction and transformation options', icon: 'Cpu' },
  { id: 'output', name: 'Output', description: 'Configure output format and structure', icon: 'FileOutput' },
  { id: 'budget', name: 'Budget', description: 'Cost limits and spending controls', icon: 'DollarSign' },
  { id: 'notifications', name: 'Notifications', description: 'Alerts and notification channels', icon: 'Bell' },
];
