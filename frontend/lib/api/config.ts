/**
 * API Configuration
 *
 * Centralized configuration for API endpoints and base URLs.
 * Uses environment variables with sensible defaults for local development.
 */

// Base API URL - from environment or default to localhost
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://localhost:8000');

// WebSocket URL - from environment or derived from API URL
export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');

// API version prefix
export const API_VERSION = '/api/v1';

// Full API base path
export const API_BASE = `${API_BASE_URL}${API_VERSION}`;

/**
 * API Endpoints - centralized endpoint definitions
 */
export const API_ENDPOINTS = {
  // Health
  health: `${API_VERSION}/health`,

  // Crawls
  crawls: `${API_VERSION}/crawls`,
  crawlsStats: `${API_VERSION}/crawls/stats`,
  crawlsRecent: `${API_VERSION}/crawls/recent`,
  crawl: (id: string) => `${API_VERSION}/crawl/${id}`,
  crawlFull: (id: string) => `${API_VERSION}/crawl/${id}/full`,
  crawlStatus: (id: string) => `${API_VERSION}/crawl/${id}/status`,
  crawlRerun: (id: string) => `${API_VERSION}/crawl/${id}/rerun`,
  crawlDownload: (id: string) => `${API_VERSION}/crawl/${id}/download`,
  crawlStats: `${API_VERSION}/crawl/stats`,
  crawlRetry: `${API_VERSION}/crawl/retry`,
  crawlPlan: `${API_VERSION}/crawl/plan`,
  crawlRecommendations: `${API_VERSION}/crawl/recommendations`,

  // Documents
  documentsRecent: `${API_VERSION}/documents/recent`,
  crawlDocuments: (id: string) => `${API_VERSION}/crawl/${id}/documents`,

  // Errors
  errorsAll: `${API_VERSION}/errors/all`,
  crawlErrors: (id: string) => `${API_VERSION}/crawl/${id}/errors`,

  // Logs
  logsAll: `${API_VERSION}/logs/all`,
  crawlLogs: (id: string) => `${API_VERSION}/logs/${id}`,

  // Templates
  templates: `${API_VERSION}/templates`,
  template: (id: string) => `${API_VERSION}/templates/${id}`,

  // Settings
  settings: `${API_VERSION}/settings`,
  settingsCategory: (category: string) => `${API_VERSION}/settings/${category}`,
  settingsReset: `${API_VERSION}/settings/reset`,
  settingsPresets: `${API_VERSION}/settings/presets`,
  settingsPreset: (id: string) => `${API_VERSION}/settings/presets/${id}`,

  // Schedules
  schedules: `${API_VERSION}/schedules`,
  schedule: (id: string) => `${API_VERSION}/schedules/${id}`,

  // Ingestion
  ingest: `${API_VERSION}/ingest`,
  ingestAsync: `${API_VERSION}/ingest/async`,
  ingestRuns: `${API_VERSION}/ingest/runs`,
  ingestStatus: (id: string) => `${API_VERSION}/ingest/${id}/status`,
  ingestStatusAsync: (id: string) => `${API_VERSION}/ingest/${id}/status-async`,
  ingestDocuments: (id: string) => `${API_VERSION}/ingest/${id}/documents`,
  ingestDownload: (id: string) => `${API_VERSION}/ingest/${id}/download`,
  ingestCurate: (id: string) => `${API_VERSION}/ingest/${id}/curate`,
  ingestNvIngest: (id: string) => `${API_VERSION}/ingest/${id}/nv-ingest`,
  ingestStructured: (id: string) => `${API_VERSION}/ingest/${id}/structured`,
  ingestFile: (id: string) => `${API_VERSION}/ingest/${id}/file`,

  // Archive
  archive: `${API_VERSION}/archive`,
  archiveEntry: (hash: string) => `${API_VERSION}/archive/${hash}`,

  // Integrations
  integrations: `${API_VERSION}/integrations`,
  integrationConnect: (id: string) => `${API_VERSION}/integrations/${id}/connect`,
  integrationDisconnect: (id: string) => `${API_VERSION}/integrations/${id}/disconnect`,
  integrationTest: (id: string) => `${API_VERSION}/integrations/${id}/test`,
} as const;

/**
 * Default request options
 */
export const DEFAULT_REQUEST_OPTIONS: RequestInit = {
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Request timeout in milliseconds
 */
export const DEFAULT_TIMEOUT = 30000;

/**
 * Maximum retry attempts for failed requests
 */
export const MAX_RETRIES = 3;

/**
 * Delay between retries in milliseconds (doubles each attempt)
 */
export const RETRY_DELAY = 1000;
