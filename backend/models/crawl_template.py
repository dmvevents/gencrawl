"""
Crawl Template Model

Templates are reusable crawl configurations that can be saved, shared, and used
to quickly start new crawl jobs with pre-configured settings.
"""

from enum import Enum
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
import uuid


class TemplateCategory(str, Enum):
    """Categories for organizing templates."""
    EDUCATION = "education"
    LEGAL = "legal"
    RESEARCH = "research"
    NEWS = "news"
    GOVERNMENT = "government"
    TECHNICAL = "technical"
    CUSTOM = "custom"


class CrawlLimits(BaseModel):
    """Crawl limit settings."""
    max_pages: int = Field(default=10000, ge=1, le=1000000, description="Maximum pages to crawl")
    max_documents: int = Field(default=5000, ge=1, le=500000, description="Maximum documents to download")
    max_duration_minutes: int = Field(default=360, ge=1, le=1440, description="Maximum duration in minutes")
    max_file_size_mb: int = Field(default=50, ge=1, le=500, description="Maximum file size per document")
    max_total_size_gb: float = Field(default=10.0, ge=0.1, le=100.0, description="Maximum total download size")
    min_file_size_kb: int = Field(default=10, ge=0, le=10000, description="Minimum file size (skip smaller)")
    max_depth: int = Field(default=5, ge=1, le=20, description="Maximum link depth")
    max_retries: int = Field(default=3, ge=0, le=10, description="Maximum retries per request")
    timeout_seconds: int = Field(default=60, ge=5, le=300, description="Request timeout")


class QualitySettings(BaseModel):
    """Quality gate settings."""
    min_quality_score: float = Field(default=0.7, ge=0.0, le=1.0, description="Minimum quality score")
    min_relevance_score: float = Field(default=0.6, ge=0.0, le=1.0, description="Minimum relevance score")
    max_duplicate_percentage: int = Field(default=10, ge=0, le=100, description="Max duplicates before stopping")
    min_text_length: int = Field(default=100, ge=0, le=10000, description="Minimum text characters")
    require_date: bool = Field(default=False, description="Require publish date")
    require_metadata: List[str] = Field(default=["title"], description="Required metadata fields")
    stop_on_quality_drop: bool = Field(default=False, description="Pause if quality drops")
    quality_threshold_percentage: int = Field(default=50, ge=0, le=100, description="Percentage that must pass quality")


class PerformanceSettings(BaseModel):
    """Performance and politeness settings."""
    concurrent_requests: int = Field(default=10, ge=1, le=50, description="Parallel requests")
    delay_seconds: float = Field(default=1.0, ge=0.0, le=60.0, description="Delay between requests")
    respect_robots_txt: bool = Field(default=True, description="Honor robots.txt")
    user_agent: str = Field(default="GenCrawl/1.0", description="Custom user agent")
    enable_caching: bool = Field(default=True, description="Cache responses")
    enable_compression: bool = Field(default=True, description="Compress downloads")
    follow_redirects: bool = Field(default=True, description="Follow HTTP redirects")
    max_redirects: int = Field(default=5, ge=0, le=20, description="Maximum redirects to follow")


class ProcessingSettings(BaseModel):
    """Data processing settings."""
    extract_text: bool = Field(default=True, description="Extract text from PDFs")
    extract_tables: bool = Field(default=True, description="Extract tables")
    extract_images: bool = Field(default=False, description="Extract images")
    run_ocr: bool = Field(default=False, description="Run OCR on scanned docs")
    enable_deduplication: bool = Field(default=True, description="Remove duplicates")
    dedupe_threshold: float = Field(default=0.85, ge=0.0, le=1.0, description="Similarity threshold")
    enable_pii_redaction: bool = Field(default=False, description="Redact PII")
    generate_embeddings: bool = Field(default=False, description="Generate vector embeddings")
    run_nemo_curator: bool = Field(default=False, description="Run Nemo curation")


class OutputSettings(BaseModel):
    """Output configuration settings."""
    format: str = Field(default="jsonl", description="Output format: jsonl, json, csv")
    include_raw_files: bool = Field(default=True, description="Keep original files")
    create_manifest: bool = Field(default=True, description="Generate manifest.json")
    hierarchical_structure: bool = Field(default=True, description="Organize by hierarchy")
    preserve_filenames: bool = Field(default=True, description="Keep original filenames")
    add_timestamps: bool = Field(default=True, description="Add timestamps to filenames")
    compress_output: bool = Field(default=False, description="ZIP the output")


class CrawlConfig(BaseModel):
    """Complete crawl configuration."""
    # Target configuration
    targets: List[str] = Field(default=[], description="Target URLs or domains")
    keywords: List[str] = Field(default=[], description="Keywords to search for")
    file_types: List[str] = Field(default=["pdf", "doc", "docx"], description="File types to download")

    # Crawler selection
    crawler: str = Field(default="crawl4ai", description="Crawler to use: crawl4ai, scrapy, playwright")

    # Settings sections
    limits: CrawlLimits = Field(default_factory=CrawlLimits)
    quality: QualitySettings = Field(default_factory=QualitySettings)
    performance: PerformanceSettings = Field(default_factory=PerformanceSettings)
    processing: ProcessingSettings = Field(default_factory=ProcessingSettings)
    output: OutputSettings = Field(default_factory=OutputSettings)

    # Additional settings
    extra: Dict[str, Any] = Field(default_factory=dict, description="Additional custom settings")


class CrawlTemplate(BaseModel):
    """A reusable crawl configuration template."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str = Field(..., min_length=1, max_length=100, description="Template name")
    description: str = Field(default="", max_length=500, description="Template description")
    category: TemplateCategory = Field(default=TemplateCategory.CUSTOM, description="Template category")
    config: CrawlConfig = Field(default_factory=CrawlConfig, description="Crawl configuration")

    # Metadata
    is_builtin: bool = Field(default=False, description="Whether this is a built-in template")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    used_count: int = Field(default=0, ge=0, description="Number of times used")
    last_used_at: Optional[datetime] = Field(default=None)

    # Optional user association
    user_id: str = Field(default="default", description="User who created the template")

    # Tags for searchability
    tags: List[str] = Field(default=[], description="Tags for searching")

    # Icon (for UI)
    icon: str = Field(default="file-text", description="Icon name for UI")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class TemplateCreateRequest(BaseModel):
    """Request to create a new template."""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    category: TemplateCategory = Field(default=TemplateCategory.CUSTOM)
    config: CrawlConfig = Field(default_factory=CrawlConfig)
    tags: List[str] = Field(default=[])
    icon: str = Field(default="file-text")


class TemplateUpdateRequest(BaseModel):
    """Request to update an existing template."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[TemplateCategory] = None
    config: Optional[CrawlConfig] = None
    tags: Optional[List[str]] = None
    icon: Optional[str] = None


class TemplateListResponse(BaseModel):
    """Response for listing templates."""
    templates: List[CrawlTemplate]
    total: int
    builtin_count: int
    custom_count: int


class TemplateUseResponse(BaseModel):
    """Response when using a template."""
    template_id: str
    template_name: str
    config: CrawlConfig
    message: str
