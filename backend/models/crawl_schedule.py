"""
Crawl Schedule Model

Schedules allow automated running of crawl jobs on a recurring basis
using cron expressions for flexible scheduling.
"""

from enum import Enum
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator
import uuid
import re


class ScheduleType(str, Enum):
    """Types of schedules."""
    ONCE = "once"           # Run once at specific time
    DAILY = "daily"         # Run every day
    WEEKLY = "weekly"       # Run every week
    MONTHLY = "monthly"     # Run every month
    CRON = "cron"           # Custom cron expression


class ScheduleStatus(str, Enum):
    """Status of a schedule."""
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"  # For one-time schedules
    FAILED = "failed"       # Last run failed


class NotificationSettings(BaseModel):
    """Notification configuration."""
    on_start: bool = Field(default=False, description="Notify on crawl start")
    on_complete: bool = Field(default=True, description="Notify on completion")
    on_failure: bool = Field(default=True, description="Notify on failure")
    on_quality_drop: bool = Field(default=False, description="Notify on quality drop")
    include_summary: bool = Field(default=True, description="Include summary in notification")


class EmailNotification(BaseModel):
    """Email notification settings."""
    enabled: bool = Field(default=False)
    recipients: List[str] = Field(default=[])
    settings: NotificationSettings = Field(default_factory=NotificationSettings)


class SlackNotification(BaseModel):
    """Slack notification settings."""
    enabled: bool = Field(default=False)
    webhook_url: str = Field(default="")
    channel: str = Field(default="#crawl-alerts")
    settings: NotificationSettings = Field(default_factory=NotificationSettings)


class WebhookNotification(BaseModel):
    """Webhook notification settings."""
    enabled: bool = Field(default=False)
    url: str = Field(default="")
    headers: Dict[str, str] = Field(default_factory=dict)
    settings: NotificationSettings = Field(default_factory=NotificationSettings)


class NotificationConfig(BaseModel):
    """All notification configurations."""
    email: EmailNotification = Field(default_factory=EmailNotification)
    slack: SlackNotification = Field(default_factory=SlackNotification)
    webhook: WebhookNotification = Field(default_factory=WebhookNotification)


class ScheduleRunRecord(BaseModel):
    """Record of a single schedule run."""
    run_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    crawl_id: str = Field(..., description="ID of the crawl job started")
    scheduled_at: datetime = Field(..., description="When it was scheduled to run")
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    status: str = Field(default="running", description="running, completed, failed, skipped")
    documents_found: int = Field(default=0)
    error_message: Optional[str] = None
    duration_seconds: Optional[float] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class CrawlSchedule(BaseModel):
    """A scheduled crawl job configuration."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str = Field(..., min_length=1, max_length=100, description="Schedule name")
    description: str = Field(default="", max_length=500, description="Schedule description")

    # Schedule configuration
    schedule_type: ScheduleType = Field(default=ScheduleType.DAILY)
    cron_expression: str = Field(default="0 2 * * *", description="Cron expression")
    timezone: str = Field(default="America/Port_of_Spain", description="Timezone for schedule")

    # Timing
    start_date: Optional[datetime] = Field(default=None, description="When to start schedule")
    end_date: Optional[datetime] = Field(default=None, description="When to stop schedule")
    next_run: Optional[datetime] = Field(default=None, description="Next scheduled run time")
    last_run: Optional[datetime] = Field(default=None, description="Last run time")

    # Limits
    max_runs: Optional[int] = Field(default=None, ge=1, description="Maximum number of runs")
    run_count: int = Field(default=0, ge=0, description="Number of times run")

    # Behavior
    skip_if_running: bool = Field(default=True, description="Skip if previous crawl still running")
    retry_on_failure: bool = Field(default=True, description="Retry if crawl fails")
    max_retry_attempts: int = Field(default=3, ge=0, le=10, description="Maximum retry attempts")

    # Status
    status: ScheduleStatus = Field(default=ScheduleStatus.ACTIVE)

    # Crawl configuration (either template_id or inline config)
    template_id: Optional[str] = Field(default=None, description="Template to use")
    crawl_config: Optional[Dict[str, Any]] = Field(default=None, description="Inline crawl config")

    # Notifications
    notifications: NotificationConfig = Field(default_factory=NotificationConfig)

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    user_id: str = Field(default="default")

    # Run history (last N runs)
    run_history: List[ScheduleRunRecord] = Field(default=[], description="History of runs")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

    @validator('cron_expression')
    def validate_cron(cls, v, values):
        """Validate cron expression format."""
        # Basic cron validation (5 or 6 fields)
        parts = v.strip().split()
        if len(parts) not in [5, 6]:
            raise ValueError(f"Invalid cron expression: expected 5-6 fields, got {len(parts)}")

        # Validate each field has valid characters
        valid_chars = re.compile(r'^[\d,\-\*/]+$|^\*$')
        for i, part in enumerate(parts):
            if not valid_chars.match(part):
                raise ValueError(f"Invalid cron field {i+1}: {part}")

        return v


class ScheduleCreateRequest(BaseModel):
    """Request to create a new schedule."""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    schedule_type: ScheduleType = Field(default=ScheduleType.DAILY)
    cron_expression: Optional[str] = Field(default=None)
    timezone: str = Field(default="America/Port_of_Spain")
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    max_runs: Optional[int] = None
    skip_if_running: bool = True
    template_id: Optional[str] = None
    crawl_config: Optional[Dict[str, Any]] = None
    notifications: Optional[NotificationConfig] = None

    @validator('cron_expression', pre=True, always=True)
    def set_cron_from_type(cls, v, values):
        """Set default cron expression based on schedule type."""
        if v is not None:
            return v

        schedule_type = values.get('schedule_type', ScheduleType.DAILY)

        cron_defaults = {
            ScheduleType.ONCE: "0 0 * * *",      # Midnight (will run once)
            ScheduleType.DAILY: "0 2 * * *",    # 2 AM daily
            ScheduleType.WEEKLY: "0 2 * * 5",   # 2 AM Friday
            ScheduleType.MONTHLY: "0 2 1 * *",  # 2 AM 1st of month
            ScheduleType.CRON: "0 2 * * *",     # Default daily
        }

        return cron_defaults.get(schedule_type, "0 2 * * *")


class ScheduleUpdateRequest(BaseModel):
    """Request to update an existing schedule."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    schedule_type: Optional[ScheduleType] = None
    cron_expression: Optional[str] = None
    timezone: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    max_runs: Optional[int] = None
    skip_if_running: Optional[bool] = None
    template_id: Optional[str] = None
    crawl_config: Optional[Dict[str, Any]] = None
    notifications: Optional[NotificationConfig] = None


class ScheduleListResponse(BaseModel):
    """Response for listing schedules."""
    schedules: List[CrawlSchedule]
    total: int
    active_count: int
    paused_count: int


class NextRunsResponse(BaseModel):
    """Response showing next scheduled runs."""
    schedule_id: str
    next_runs: List[datetime]
    timezone: str
