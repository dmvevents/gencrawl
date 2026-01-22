"""
Crawl Settings Models

Pydantic models for all configuration options across 7 categories:
- Limits: max_pages, max_documents, duration, file sizes
- Quality: quality scores, relevance thresholds, duplicate detection
- Performance: concurrency, delays, robots.txt, caching
- Processing: text extraction, OCR, deduplication, embeddings
- Output: format, compression, structure
- Budget: cost limits, warnings, hard stops
- Notifications: email, slack, webhooks
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator


class OutputFormat(str, Enum):
    """Supported output formats."""
    JSONL = "jsonl"
    JSON = "json"
    CSV = "csv"
    PARQUET = "parquet"


class IncrementalMode(str, Enum):
    """Incremental crawl modes."""
    NEW_ONLY = "new_only"
    MODIFIED_ONLY = "modified_only"
    ALL = "all"


class QualityAction(str, Enum):
    """Actions on quality gate failure."""
    PAUSE = "pause"
    STOP = "stop"
    CONTINUE = "continue"


# ============================================================
# Category 1: Limits & Constraints
# ============================================================
class LimitsSettings(BaseModel):
    """Crawl limits and constraints."""
    max_pages: int = Field(
        default=10000,
        ge=0,
        le=100000,
        description="Maximum pages to crawl (0 = unlimited)"
    )
    max_documents: int = Field(
        default=5000,
        ge=0,
        le=50000,
        description="Maximum documents to download"
    )
    max_duration_minutes: int = Field(
        default=360,
        ge=0,
        le=1440,
        description="Maximum crawl duration in minutes (0 = unlimited)"
    )
    max_file_size_mb: int = Field(
        default=50,
        ge=1,
        le=500,
        description="Maximum size per file in MB"
    )
    max_total_size_gb: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Maximum total download size in GB"
    )
    min_file_size_kb: int = Field(
        default=10,
        ge=0,
        le=1000,
        description="Minimum file size in KB (skip smaller files)"
    )
    max_depth: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Maximum link depth to follow"
    )
    max_retries: int = Field(
        default=3,
        ge=0,
        le=10,
        description="Maximum retries for failed requests"
    )
    timeout_seconds: int = Field(
        default=60,
        ge=5,
        le=300,
        description="Per-request timeout in seconds"
    )
    enable_budget_controls: bool = Field(
        default=True,
        description="Enable budget and limit controls"
    )
    pause_at_limit: bool = Field(
        default=True,
        description="Pause crawl when approaching limits"
    )


# ============================================================
# Category 2: Quality Gates
# ============================================================
class QualitySettings(BaseModel):
    """Quality gate settings."""
    min_quality_score: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Minimum quality score (0-1) to accept document"
    )
    min_relevance_score: float = Field(
        default=0.6,
        ge=0.0,
        le=1.0,
        description="Minimum relevance score (0-1)"
    )
    max_duplicate_percentage: int = Field(
        default=10,
        ge=0,
        le=100,
        description="Stop if duplicate percentage exceeds this"
    )
    min_text_length: int = Field(
        default=100,
        ge=0,
        le=10000,
        description="Minimum characters in extracted text"
    )
    require_date: bool = Field(
        default=False,
        description="Require documents to have publish date"
    )
    require_metadata: List[str] = Field(
        default=["title"],
        description="Required metadata fields"
    )
    stop_on_quality_drop: bool = Field(
        default=False,
        description="Pause crawl if quality drops significantly"
    )
    quality_threshold_percentage: int = Field(
        default=50,
        ge=0,
        le=100,
        description="Percentage of docs that must pass quality"
    )
    quality_check_interval: int = Field(
        default=100,
        ge=10,
        le=1000,
        description="Check quality every N documents"
    )
    quality_gate_action: QualityAction = Field(
        default=QualityAction.CONTINUE,
        description="Action when quality gate fails"
    )


# ============================================================
# Category 3: Performance & Politeness
# ============================================================
class PerformanceSettings(BaseModel):
    """Performance and politeness settings."""
    concurrent_requests: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Maximum parallel requests"
    )
    delay_seconds: float = Field(
        default=1.0,
        ge=0.0,
        le=30.0,
        description="Delay between requests in seconds"
    )
    respect_robots_txt: bool = Field(
        default=True,
        description="Honor robots.txt directives"
    )
    user_agent: str = Field(
        default="GenCrawl/1.0 (+https://gencrawl.io/bot)",
        description="HTTP User-Agent string"
    )
    enable_caching: bool = Field(
        default=True,
        description="Cache responses to avoid re-downloading"
    )
    enable_compression: bool = Field(
        default=True,
        description="Request gzip/deflate compression"
    )
    follow_redirects: bool = Field(
        default=True,
        description="Follow HTTP redirects"
    )
    max_redirects: int = Field(
        default=5,
        ge=0,
        le=20,
        description="Maximum redirects to follow"
    )
    adaptive_delay: bool = Field(
        default=True,
        description="Automatically adjust delay based on response times"
    )
    rate_limit_backoff: bool = Field(
        default=True,
        description="Back off when rate limited"
    )


# ============================================================
# Category 4: Data Processing
# ============================================================
class ProcessingSettings(BaseModel):
    """Data processing settings."""
    extract_text: bool = Field(
        default=True,
        description="Extract text from PDFs and documents"
    )
    extract_tables: bool = Field(
        default=True,
        description="Extract tables from documents"
    )
    extract_images: bool = Field(
        default=False,
        description="Extract images from documents"
    )
    run_ocr: bool = Field(
        default=False,
        description="Run OCR on scanned documents"
    )
    enable_deduplication: bool = Field(
        default=True,
        description="Remove duplicate documents"
    )
    dedupe_threshold: float = Field(
        default=0.85,
        ge=0.5,
        le=1.0,
        description="Similarity threshold for deduplication"
    )
    enable_pii_redaction: bool = Field(
        default=False,
        description="Redact personally identifiable information"
    )
    generate_embeddings: bool = Field(
        default=False,
        description="Generate vector embeddings"
    )
    run_nemo_curator: bool = Field(
        default=False,
        description="Run NVIDIA Nemo Curator processing"
    )
    extract_metadata: bool = Field(
        default=True,
        description="Extract document metadata"
    )
    language_detection: bool = Field(
        default=True,
        description="Detect document language"
    )
    content_classification: bool = Field(
        default=False,
        description="Classify document content type"
    )


# ============================================================
# Category 5: Output Configuration
# ============================================================
class OutputSettings(BaseModel):
    """Output configuration settings."""
    format: OutputFormat = Field(
        default=OutputFormat.JSONL,
        description="Output file format"
    )
    include_raw_files: bool = Field(
        default=True,
        description="Keep original downloaded files"
    )
    create_manifest: bool = Field(
        default=True,
        description="Generate manifest.json with crawl info"
    )
    hierarchical_structure: bool = Field(
        default=True,
        description="Organize output by domain/path hierarchy"
    )
    preserve_filenames: bool = Field(
        default=True,
        description="Keep original filenames"
    )
    add_timestamps: bool = Field(
        default=True,
        description="Add timestamps to filenames"
    )
    compress_output: bool = Field(
        default=False,
        description="ZIP the final output"
    )
    max_filename_length: int = Field(
        default=200,
        ge=50,
        le=500,
        description="Maximum filename length"
    )
    include_failed_urls: bool = Field(
        default=True,
        description="Include list of failed URLs in output"
    )


# ============================================================
# Category 6: Budget Controls
# ============================================================
class BudgetSettings(BaseModel):
    """Budget and cost control settings."""
    max_api_cost_usd: float = Field(
        default=10.0,
        ge=0.0,
        le=1000.0,
        description="Maximum LLM API cost in USD"
    )
    warn_at_percentage: int = Field(
        default=80,
        ge=0,
        le=100,
        description="Warn when budget reaches this percentage"
    )
    pause_at_percentage: int = Field(
        default=95,
        ge=0,
        le=100,
        description="Auto-pause at this percentage of budget"
    )
    hard_stop_at_100: bool = Field(
        default=True,
        description="Hard stop when budget exhausted"
    )
    track_token_usage: bool = Field(
        default=True,
        description="Track LLM token usage"
    )
    cost_per_page_estimate: float = Field(
        default=0.001,
        ge=0.0,
        le=1.0,
        description="Estimated cost per page for budgeting"
    )


# ============================================================
# Category 7: Notifications
# ============================================================
class EmailNotificationSettings(BaseModel):
    """Email notification settings."""
    enabled: bool = Field(default=False, description="Enable email notifications")
    recipients: List[str] = Field(default=[], description="Email recipients")
    on_complete: bool = Field(default=True, description="Notify on completion")
    on_failure: bool = Field(default=True, description="Notify on failure")
    on_quality_drop: bool = Field(default=True, description="Notify on quality drop")
    include_summary: bool = Field(default=True, description="Include crawl summary")


class SlackNotificationSettings(BaseModel):
    """Slack notification settings."""
    enabled: bool = Field(default=False, description="Enable Slack notifications")
    webhook_url: str = Field(default="", description="Slack webhook URL")
    channel: str = Field(default="#crawl-alerts", description="Slack channel")
    on_complete: bool = Field(default=True, description="Notify on completion")
    on_failure: bool = Field(default=True, description="Notify on failure")


class WebhookNotificationSettings(BaseModel):
    """Webhook notification settings."""
    enabled: bool = Field(default=False, description="Enable webhook notifications")
    url: str = Field(default="", description="Webhook URL")
    headers: Dict[str, str] = Field(default={}, description="Custom headers")
    on_complete: bool = Field(default=True, description="Notify on completion")
    on_failure: bool = Field(default=True, description="Notify on failure")


class NotificationSettings(BaseModel):
    """Combined notification settings."""
    email: EmailNotificationSettings = Field(default_factory=EmailNotificationSettings)
    slack: SlackNotificationSettings = Field(default_factory=SlackNotificationSettings)
    webhook: WebhookNotificationSettings = Field(default_factory=WebhookNotificationSettings)


# ============================================================
# Complete Settings Model
# ============================================================
class CrawlSettings(BaseModel):
    """Complete crawl settings with all categories."""
    limits: LimitsSettings = Field(default_factory=LimitsSettings)
    quality: QualitySettings = Field(default_factory=QualitySettings)
    performance: PerformanceSettings = Field(default_factory=PerformanceSettings)
    processing: ProcessingSettings = Field(default_factory=ProcessingSettings)
    output: OutputSettings = Field(default_factory=OutputSettings)
    budget: BudgetSettings = Field(default_factory=BudgetSettings)
    notifications: NotificationSettings = Field(default_factory=NotificationSettings)

    class Config:
        use_enum_values = True


# ============================================================
# Preset Configuration
# ============================================================
class PresetConfig(BaseModel):
    """A preset configuration template."""
    id: str
    name: str
    description: str
    category: str  # education, legal, research, news, general
    icon: str = "Settings"
    settings: CrawlSettings
    is_builtin: bool = True
    created_at: Optional[str] = None
    usage_count: int = 0


class PresetListResponse(BaseModel):
    """Response for listing presets."""
    presets: List[PresetConfig]
    total: int


# ============================================================
# API Request/Response Models
# ============================================================
class SettingsUpdateRequest(BaseModel):
    """Request to update settings."""
    settings: CrawlSettings


class SettingsCategoryUpdateRequest(BaseModel):
    """Request to update a single category."""
    category: str
    data: Dict[str, Any]


class SettingsResponse(BaseModel):
    """Response containing current settings."""
    settings: CrawlSettings
    last_updated: Optional[str] = None
    active_preset: Optional[str] = None


# ============================================================
# Default Settings Factory
# ============================================================
def get_default_settings() -> CrawlSettings:
    """Get default settings instance."""
    return CrawlSettings()


def get_settings_metadata() -> Dict[str, Any]:
    """Get metadata about all settings for UI generation."""
    return {
        "categories": [
            {
                "id": "limits",
                "name": "Limits & Constraints",
                "description": "Control crawl boundaries and resource usage",
                "icon": "Gauge"
            },
            {
                "id": "quality",
                "name": "Quality Gates",
                "description": "Set quality thresholds and validation rules",
                "icon": "Shield"
            },
            {
                "id": "performance",
                "name": "Performance",
                "description": "Configure crawl speed and politeness",
                "icon": "Zap"
            },
            {
                "id": "processing",
                "name": "Processing",
                "description": "Data extraction and transformation options",
                "icon": "Cpu"
            },
            {
                "id": "output",
                "name": "Output",
                "description": "Configure output format and structure",
                "icon": "FileOutput"
            },
            {
                "id": "budget",
                "name": "Budget",
                "description": "Cost limits and spending controls",
                "icon": "DollarSign"
            },
            {
                "id": "notifications",
                "name": "Notifications",
                "description": "Alerts and notification channels",
                "icon": "Bell"
            }
        ],
        "total_settings": 50  # Approximate count
    }
