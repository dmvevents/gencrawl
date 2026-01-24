/**
 * Centralized API Client
 *
 * Provides a unified interface for all API calls with:
 * - Automatic error handling
 * - Request/response type safety
 * - Retry logic with exponential backoff
 * - Request timeout support
 * - Centralized configuration
 */

import {
  API_BASE_URL,
  DEFAULT_TIMEOUT,
  MAX_RETRIES,
  RETRY_DELAY,
  API_ENDPOINTS,
} from './config';

/**
 * API Error class for structured error handling
 */
export class ApiError extends Error {
  status: number;
  data?: any;
  endpoint: string;

  constructor(message: string, status: number, endpoint: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.endpoint = endpoint;
  }
}

/**
 * Request options extending fetch options
 */
interface ApiOptions extends Omit<RequestInit, 'body'> {
  timeout?: number;
  retries?: number;
  body?: any;
}

/**
 * API Client class
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a fetch request with retry logic and timeout
   */
  private async fetchWithRetry(
    endpoint: string,
    options: ApiOptions = {}
  ): Promise<Response> {
    const {
      timeout = DEFAULT_TIMEOUT,
      retries = MAX_RETRIES,
      ...fetchOptions
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Don't retry on successful responses or client errors (4xx)
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }

        // Retry on server errors (5xx) if we have attempts left
        if (attempt < retries - 1) {
          await this.delay(RETRY_DELAY * Math.pow(2, attempt));
          continue;
        }

        return response;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on abort (timeout)
        if ((error as Error).name === 'AbortError') {
          throw new ApiError(
            'Request timeout',
            0,
            endpoint,
            { timeout: true }
          );
        }

        // Retry on network errors if we have attempts left
        if (attempt < retries - 1) {
          await this.delay(RETRY_DELAY * Math.pow(2, attempt));
          continue;
        }
      }
    }

    // All retries failed
    throw new ApiError(
      lastError?.message || 'Network error: Unable to connect to server',
      0,
      endpoint,
      { networkError: true }
    );
  }

  /**
   * Delay helper for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parse response and handle errors
   */
  private async handleResponse<T>(response: Response, endpoint: string): Promise<T> {
    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = null;
      }

      throw new ApiError(
        errorData?.detail || errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        endpoint,
        errorData
      );
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new ApiError('Invalid JSON response', 0, endpoint, { raw: text });
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    const response = await this.fetchWithRetry(endpoint, {
      ...options,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...options?.headers,
      },
    });
    return this.handleResponse<T>(response, endpoint);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any, options?: ApiOptions): Promise<T> {
    const response = await this.fetchWithRetry(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response, endpoint);
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any, options?: ApiOptions): Promise<T> {
    const response = await this.fetchWithRetry(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response, endpoint);
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    const response = await this.fetchWithRetry(endpoint, {
      ...options,
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        ...options?.headers,
      },
    });
    return this.handleResponse<T>(response, endpoint);
  }
}

// Export singleton instance
export const api = new ApiClient();

// =============================================================================
// Typed API Methods
// =============================================================================

/**
 * Health API
 */
export const healthApi = {
  check: () => api.get<HealthResponse>(API_ENDPOINTS.health),
};

/**
 * Crawls API
 */
export const crawlsApi = {
  list: (params?: CrawlListParams) => {
    const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return api.get<CrawlsListResponse>(`${API_ENDPOINTS.crawls}${query}`);
  },
  getById: (crawlId: string) => api.get<CrawlFullData>(API_ENDPOINTS.crawlFull(crawlId)),
  getStatus: (crawlId: string) => api.get<CrawlStatus>(API_ENDPOINTS.crawlStatus(crawlId)),
  getStats: () => api.get<CrawlStats>(API_ENDPOINTS.crawlStats),
  getOverallStats: () => api.get<OverallStats>(API_ENDPOINTS.crawlsStats),
  getRecent: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return api.get<RecentCrawlsResponse>(`${API_ENDPOINTS.crawlsRecent}${query}`);
  },
  create: (data: CreateCrawlRequest) => api.post<CreateCrawlResponse>(API_ENDPOINTS.crawls.replace('/crawls', '/crawl'), data),
  plan: (data: CreateCrawlRequest) => api.post<CrawlPlanResponse>(API_ENDPOINTS.crawlPlan, data),
  recommendations: (data: CrawlRecommendationRequest) =>
    api.post<CrawlRecommendationResponse>(API_ENDPOINTS.crawlRecommendations, data),
  rerun: (crawlId: string) => api.post<RerunResponse>(API_ENDPOINTS.crawlRerun(crawlId)),
  delete: (crawlId: string) => api.delete<DeleteResponse>(API_ENDPOINTS.crawl(crawlId)),
  download: (crawlId: string, format: 'json' | 'jsonl' | 'csv' = 'json') =>
    api.get<any>(`${API_ENDPOINTS.crawlDownload(crawlId)}?format=${format}`),
};

/**
 * Documents API
 */
export const documentsApi = {
  getRecent: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return api.get<DocumentsResponse>(`${API_ENDPOINTS.documentsRecent}${query}`);
  },
  getByCrawl: (crawlId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return api.get<DocumentsResponse>(`${API_ENDPOINTS.crawlDocuments(crawlId)}${query}`);
  },
};

/**
 * Errors API
 */
export const errorsApi = {
  getAll: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return api.get<ErrorsResponse>(`${API_ENDPOINTS.errorsAll}${query}`);
  },
  getByCrawl: (crawlId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return api.get<ErrorsResponse>(`${API_ENDPOINTS.crawlErrors(crawlId)}${query}`);
  },
  retry: (errorIds: string[]) => api.post<RetryResponse>(API_ENDPOINTS.crawlRetry, { error_ids: errorIds }),
};

/**
 * Logs API
 */
export const logsApi = {
  getAll: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return api.get<LogsResponse>(`${API_ENDPOINTS.logsAll}${query}`);
  },
  getByCrawl: (crawlId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return api.get<LogsResponse>(`${API_ENDPOINTS.crawlLogs(crawlId)}${query}`);
  },
};

/**
 * Templates API
 */
export const templatesApi = {
  list: () => api.get<TemplatesResponse>(API_ENDPOINTS.templates),
  getById: (templateId: string) => api.get<Template>(API_ENDPOINTS.template(templateId)),
  create: (data: CreateTemplateRequest) => api.post<Template>(API_ENDPOINTS.templates, data),
  update: (templateId: string, data: Partial<CreateTemplateRequest>) =>
    api.put<Template>(API_ENDPOINTS.template(templateId), data),
  delete: (templateId: string) => api.delete<void>(API_ENDPOINTS.template(templateId)),
};

/**
 * Ingestion API
 */
export const ingestApi = {
  run: (
    crawlId: string,
    overwrite: boolean = false,
    options?: { run_nemo_curator?: boolean; curate?: boolean; extract_text?: boolean }
  ) =>
    api.post<IngestResponse>(API_ENDPOINTS.ingest, {
      crawl_id: crawlId,
      overwrite,
      ...options,
    }),
  runAsync: (
    crawlId: string,
    overwrite: boolean = false,
    options?: { run_nemo_curator?: boolean; curate?: boolean; extract_text?: boolean }
  ) =>
    api.post<IngestAsyncQueuedResponse>(API_ENDPOINTS.ingestAsync, {
      crawl_id: crawlId,
      overwrite,
      ...options,
    }),
  status: (crawlId: string) =>
    api.get<IngestStatusResponse>(API_ENDPOINTS.ingestStatus(crawlId)),
  statusAsync: (crawlId: string) =>
    api.get<IngestAsyncStatusResponse>(API_ENDPOINTS.ingestStatusAsync(crawlId)),
  listDocuments: (crawlId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return api.get<IngestDocumentsResponse>(`${API_ENDPOINTS.ingestDocuments(crawlId)}${query}`);
  },
  download: (
    crawlId: string,
    format: 'json' | 'jsonl' | 'nemo_curator_jsonl' | 'nemo_curated_jsonl' = 'jsonl'
  ) =>
    api.get<any>(`${API_ENDPOINTS.ingestDownload(crawlId)}?format=${format}`),
  curate: (crawlId: string) =>
    api.post<any>(API_ENDPOINTS.ingestCurate(crawlId)),
  runNvIngest: (crawlId: string, dryRun: boolean = false) =>
    api.post<any>(API_ENDPOINTS.ingestNvIngest(crawlId), { dry_run: dryRun }),
  getStructured: (crawlId: string, path: string) =>
    api.get<IngestStructuredResponse>(
      `${API_ENDPOINTS.ingestStructured(crawlId)}?path=${encodeURIComponent(path)}`
    ),
};

// =============================================================================
// Type Definitions
// =============================================================================

export interface HealthResponse {
  status: string;
  services: {
    api: string;
    database: string;
    redis: string;
    weaviate: string;
  };
}

export interface CrawlListParams {
  page?: number;
  limit?: number;
  status?: string;
  user_id?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CrawlSummary {
  crawl_id: string;
  query: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  urls_crawled: number;
  urls_total: number;
  documents_found: number;
  success_rate: number;
  quality_score: number;
  targets: string[];
  user_id: string;
}

export interface CrawlsListResponse {
  crawls: CrawlSummary[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CrawlFullData {
  crawl_id: string;
  found: boolean;
  source: string;
  query?: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  urls_crawled: number;
  urls_failed: number;
  urls_total: number;
  documents_found: number;
  success_rate: number;
  quality_score: number;
  targets: string[];
  config: any;
  state_history: StateTransition[];
  metrics: any;
  events: any[];
  error_message?: string;
  error_count?: number;
}

export interface StateTransition {
  from_state: string;
  to_state: string;
  timestamp: string;
  duration_seconds?: number;
  metadata?: any;
}

export interface CrawlStatus {
  crawl_id: string;
  status: string;
  progress: {
    crawled: number;
    total: number;
  };
  config?: any;
  documents_found: number;
  average_quality: number;
  throughput: number;
}

export interface CrawlStats {
  total_crawls: number;
  running: number;
  completed: number;
  failed: number;
  total_urls_crawled: number;
  total_documents_found: number;
  average_success_rate: number;
  average_quality_score: number;
}

export interface OverallStats {
  total_crawls: number;
  completed_crawls: number;
  failed_crawls: number;
  running_crawls: number;
  total_urls_crawled: number;
  total_documents_found: number;
  average_success_rate: number;
  average_duration_seconds: number;
}

export interface RecentCrawlsResponse {
  crawls: CrawlSummary[];
  total: number;
}

export interface CreateCrawlRequest {
  query: string;
  user_id?: string;
  output_format?: string;
  strategy?: string;
  crawler?: string;
  depth?: string;
  file_types?: string[];
  targets?: string[];
  limits?: Record<string, number>;
  filters?: Record<string, any>;
  respect_robots_txt?: boolean;
}

export interface CreateCrawlResponse {
  crawl_id: string;
  status: string;
  config: any;
  message: string;
}

export interface CrawlPlanResponse {
  config: any;
  message: string;
}

export interface CrawlRecommendationRequest {
  query: string;
  targets?: string[];
  file_types?: string[];
  filters?: Record<string, any>;
  respect_robots_txt?: boolean;
}

export interface CrawlRecommendationResponse {
  config: any;
  preview: {
    checked_urls: number;
    skipped_urls: number;
    documents_found: number;
    sitemaps: string[];
    sample_urls: string[];
  };
  recommended_limits: Record<string, number>;
  questions: string[];
}

export interface RerunResponse {
  original_crawl_id: string;
  new_crawl_id: string;
  status: string;
  config: any;
  message: string;
}

export interface DeleteResponse {
  crawl_id: string;
  deleted: boolean;
  deleted_files: string[];
  removed_from_memory: boolean;
  message: string;
}

export interface Document {
  id: string;
  title: string;
  url: string;
  file_type: string;
  document_type?: string | null;
  file_size: number;
  quality_score: number;
  tags: string[];
  discovered_at: string;
  crawl_id: string;
  source_date?: string | null;
  source_page?: string | null;
  content_type?: string | null;
  last_modified?: string | null;
  metadata?: {
    subject?: string;
    exam_type?: string;
    year?: number;
  };
}

export interface IngestResponse {
  crawl_id: string;
  ingested_count: number;
  duplicate_count: number;
  output_dir: string;
  manifest_path: string;
}

export interface IngestAsyncQueuedResponse {
  crawl_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  status_path?: string;
}

export interface IngestAsyncStatusResponse {
  status: 'queued' | 'running' | 'completed' | 'failed';
  started_at?: number;
  completed_at?: number;
  error?: string;
  request?: Record<string, any>;
  result?: Record<string, any>;
}

export interface IngestStatusResponse {
  crawl_id: string;
  created_at: string;
  counts: {
    ingested: number;
    duplicates: number;
    source_documents: number;
  };
  dedupe?: {
    strategy?: string;
    duplicates?: Record<string, string[]>;
  };
  output: {
    documents_jsonl: string;
    manifest: string;
  };
  taxonomy?: any;
  output_structure?: string;
  nemo?: {
    enabled?: boolean;
    nemo_curator_jsonl?: string | null;
    nemo_curated_jsonl?: string | null;
    nv_ingest_manifest?: string | null;
    nv_ingest_run?: {
      status?: string;
      file_count?: number;
      host?: string;
      port?: number;
      duration_seconds?: number;
      results?: number;
      failures?: number;
    } | null;
    counts?: Record<string, any> | null;
    extraction?: Record<string, any> | null;
    curation?: Record<string, any> | null;
  };
}

export interface IngestDocument {
  title: string;
  url: string;
  file_type: string;
  document_type?: string | null;
  file_size?: number;
  quality_score?: number;
  tags?: string[];
  discovered_at?: string;
  crawl_id: string;
  source_domain?: string;
  source_date?: string | null;
  source_page?: string | null;
  content_type?: string | null;
  last_modified?: string | null;
  taxonomy?: Record<string, any>;
  structured_path?: string;
  metadata?: Record<string, any>;
}

export interface ArchiveEntry {
  hash: string;
  hash_basis?: string | null;
  canonical_url?: string | null;
  urls: string[];
  url_count: number;
  title?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  source_date?: string | null;
  taxonomy?: Record<string, any>;
  structured_path?: string | null;
  source_domains: string[];
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  crawl_ids: string[];
  quality_score?: number | null;
}

export interface ArchiveResponse {
  entries: ArchiveEntry[];
  total: number;
}

export const archiveApi = {
  list: (params?: {
    limit?: number;
    search?: string;
    program?: string;
    subject?: string;
    doc_type?: string;
    year?: number;
    domain?: string;
  }) => {
    const query = buildQuery(params || {});
    return api.get<ArchiveResponse>(`${API_ENDPOINTS.archive}${query}`);
  },
  get: (hash: string) => api.get<ArchiveEntry>(API_ENDPOINTS.archiveEntry(hash)),
};

export interface IntegrationConfig {
  id: string;
  name: string;
  type: string;
  description: string;
  status: 'connected' | 'disconnected' | 'pending';
  config?: Record<string, any>;
  updated_at?: string | null;
}

export interface IntegrationsResponse {
  integrations: IntegrationConfig[];
  updated_at?: string;
}

export interface IntegrationStatusResponse {
  id: string;
  status: 'connected' | 'disconnected' | 'pending';
  updated_at?: string | null;
  message?: string;
}

export const integrationsApi = {
  list: () => api.get<IntegrationsResponse>(API_ENDPOINTS.integrations),
  connect: (id: string, config?: Record<string, any>, storeSensitive: boolean = false) =>
    api.post<IntegrationStatusResponse>(API_ENDPOINTS.integrationConnect(id), {
      config: config || {},
      store_sensitive: storeSensitive,
    }),
  disconnect: (id: string) =>
    api.post<IntegrationStatusResponse>(API_ENDPOINTS.integrationDisconnect(id)),
  test: (id: string) =>
    api.post<IntegrationStatusResponse>(API_ENDPOINTS.integrationTest(id)),
};

export interface IngestDocumentsResponse {
  documents: IngestDocument[];
  total: number;
}

export interface IngestStructuredResponse {
  path: string;
  data: any;
}

export interface DocumentsResponse {
  documents: Document[];
  total: number;
}

export interface ErrorEntry {
  id: string;
  timestamp: string;
  error_type: string;
  message: string;
  stack_trace?: string;
  url?: string;
  crawl_id: string;
  count: number;
}

export interface ErrorsResponse {
  errors: ErrorEntry[];
  total: number;
}

export interface RetryResponse {
  success: boolean;
  retried_count: number;
  message: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  event_type: string;
  crawl_id: string;
  details: any;
  level: 'info' | 'warning' | 'error';
}

export interface LogsResponse {
  logs: LogEntry[];
  total: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  config: any;
  is_builtin: boolean;
  created_at: string;
  updated_at: string;
  used_count: number;
  last_used_at: string | null;
  user_id: string;
  tags: string[];
  icon: string;
}

export interface TemplatesResponse {
  templates: Template[];
  total: number;
  builtin_count: number;
  custom_count: number;
}

export interface CreateTemplateRequest {
  name: string;
  description: string;
  category: string;
  config: any;
  tags?: string[];
  icon?: string;
}

export default api;
