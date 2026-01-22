"""
Crawl Scheduler

Manages scheduled crawl jobs using APScheduler.
Handles cron-based scheduling, execution, and history tracking.
"""

import json
import asyncio
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from zoneinfo import ZoneInfo
import uuid
import os
import sys

# Add parent to path
backend_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, backend_dir)

from models.crawl_schedule import (
    CrawlSchedule,
    ScheduleType,
    ScheduleStatus,
    ScheduleRunRecord,
    ScheduleCreateRequest,
    ScheduleUpdateRequest,
    NotificationConfig,
)

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.jobstores.memory import MemoryJobStore
    from apscheduler.executors.asyncio import AsyncIOExecutor
    HAS_APSCHEDULER = True
except ImportError:
    HAS_APSCHEDULER = False
    print("Warning: APScheduler not installed. Scheduling features will be limited.")

try:
    from croniter import croniter
    HAS_CRONITER = True
except ImportError:
    HAS_CRONITER = False
    print("Warning: croniter not installed. Next run calculations will be estimated.")


class CrawlScheduler:
    """Manages scheduled crawl jobs."""

    def __init__(self, data_dir: str = None):
        # Data directory for persisting schedules
        if data_dir is None:
            self.data_dir = Path(__file__).parent.parent.parent / "data" / "schedules"
        else:
            self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        # In-memory schedule storage
        self._schedules: Dict[str, CrawlSchedule] = {}

        # Callback for executing crawls
        self._crawl_executor: Optional[Callable] = None

        # APScheduler instance
        self._scheduler: Optional[Any] = None
        self._is_running = False

        # Load saved schedules
        self._load_schedules()

    def _load_schedules(self):
        """Load schedules from disk."""
        for schedule_file in self.data_dir.glob("*.json"):
            try:
                with open(schedule_file, 'r') as f:
                    data = json.load(f)

                    # Parse dates
                    for date_field in ['created_at', 'updated_at', 'start_date', 'end_date', 'next_run', 'last_run']:
                        if data.get(date_field):
                            data[date_field] = datetime.fromisoformat(data[date_field])

                    # Parse run history dates
                    for run in data.get('run_history', []):
                        for date_field in ['scheduled_at', 'started_at', 'completed_at']:
                            if run.get(date_field):
                                run[date_field] = datetime.fromisoformat(run[date_field])

                    schedule = CrawlSchedule(**data)
                    self._schedules[schedule.id] = schedule
            except Exception as e:
                print(f"Error loading schedule {schedule_file}: {e}")

    def _save_schedule(self, schedule: CrawlSchedule) -> bool:
        """Save a schedule to disk."""
        try:
            schedule_path = self.data_dir / f"{schedule.id}.json"
            with open(schedule_path, 'w') as f:
                json.dump(schedule.dict(), f, indent=2, default=str)
            return True
        except Exception as e:
            print(f"Error saving schedule {schedule.id}: {e}")
            return False

    def _delete_schedule_file(self, schedule_id: str) -> bool:
        """Delete a schedule file."""
        try:
            schedule_path = self.data_dir / f"{schedule_id}.json"
            if schedule_path.exists():
                schedule_path.unlink()
                return True
            return False
        except Exception as e:
            print(f"Error deleting schedule {schedule_id}: {e}")
            return False

    def _calculate_next_run(self, schedule: CrawlSchedule) -> Optional[datetime]:
        """Calculate the next run time for a schedule."""
        if schedule.status != ScheduleStatus.ACTIVE:
            return None

        # Check if max runs reached
        if schedule.max_runs and schedule.run_count >= schedule.max_runs:
            return None

        # Check if past end date
        if schedule.end_date and datetime.utcnow() > schedule.end_date:
            return None

        try:
            tz = ZoneInfo(schedule.timezone)
        except:
            tz = ZoneInfo("UTC")

        now = datetime.now(tz)

        if HAS_CRONITER:
            try:
                cron = croniter(schedule.cron_expression, now)
                next_time = cron.get_next(datetime)

                # Check start_date
                if schedule.start_date:
                    start = schedule.start_date
                    if start.tzinfo is None:
                        start = start.replace(tzinfo=tz)
                    while next_time < start:
                        next_time = cron.get_next(datetime)

                # Check end_date
                if schedule.end_date:
                    end = schedule.end_date
                    if end.tzinfo is None:
                        end = end.replace(tzinfo=tz)
                    if next_time > end:
                        return None

                return next_time.replace(tzinfo=None)
            except Exception as e:
                print(f"Error calculating next run for {schedule.id}: {e}")

        # Fallback: estimate based on schedule type
        if schedule.schedule_type == ScheduleType.DAILY:
            return now.replace(hour=2, minute=0, second=0, microsecond=0, tzinfo=None) + timedelta(days=1)
        elif schedule.schedule_type == ScheduleType.WEEKLY:
            days_until_friday = (4 - now.weekday()) % 7
            if days_until_friday == 0:
                days_until_friday = 7
            return (now + timedelta(days=days_until_friday)).replace(hour=2, minute=0, second=0, microsecond=0, tzinfo=None)
        elif schedule.schedule_type == ScheduleType.MONTHLY:
            next_month = now.replace(day=1, hour=2, minute=0, second=0, microsecond=0, tzinfo=None) + timedelta(days=32)
            return next_month.replace(day=1)
        else:
            return now.replace(tzinfo=None) + timedelta(hours=24)

    def get_next_runs(self, schedule_id: str, count: int = 5) -> List[datetime]:
        """Get the next N scheduled run times."""
        schedule = self._schedules.get(schedule_id)
        if not schedule:
            return []

        runs = []

        if HAS_CRONITER:
            try:
                tz = ZoneInfo(schedule.timezone)
            except:
                tz = ZoneInfo("UTC")

            now = datetime.now(tz)
            cron = croniter(schedule.cron_expression, now)

            for _ in range(count):
                next_time = cron.get_next(datetime)
                runs.append(next_time.replace(tzinfo=None))
        else:
            # Fallback estimation
            base_time = datetime.utcnow()
            interval = timedelta(days=1)  # Default daily

            if schedule.schedule_type == ScheduleType.WEEKLY:
                interval = timedelta(days=7)
            elif schedule.schedule_type == ScheduleType.MONTHLY:
                interval = timedelta(days=30)

            for i in range(count):
                runs.append(base_time + (interval * (i + 1)))

        return runs

    def set_crawl_executor(self, executor: Callable):
        """Set the callback function for executing crawls."""
        self._crawl_executor = executor

    async def _execute_scheduled_crawl(self, schedule_id: str):
        """Execute a scheduled crawl."""
        schedule = self._schedules.get(schedule_id)
        if not schedule:
            print(f"Schedule {schedule_id} not found")
            return

        if schedule.status != ScheduleStatus.ACTIVE:
            print(f"Schedule {schedule_id} is not active")
            return

        # Check if we should skip (another crawl still running)
        if schedule.skip_if_running:
            # Check last run
            if schedule.run_history:
                last_run = schedule.run_history[-1]
                if last_run.status == "running":
                    print(f"Skipping schedule {schedule_id} - previous run still active")
                    return

        # Create run record
        run_record = ScheduleRunRecord(
            crawl_id="",  # Will be filled by executor
            scheduled_at=schedule.next_run or datetime.utcnow(),
            started_at=datetime.utcnow(),
            status="running",
        )

        try:
            # Execute crawl
            if self._crawl_executor:
                crawl_id = await self._crawl_executor(
                    template_id=schedule.template_id,
                    config=schedule.crawl_config,
                    schedule_id=schedule_id,
                )
                run_record.crawl_id = crawl_id
                run_record.status = "started"
            else:
                # No executor - simulate
                run_record.crawl_id = f"sim_{uuid.uuid4().hex[:8]}"
                run_record.status = "simulated"

        except Exception as e:
            run_record.status = "failed"
            run_record.error_message = str(e)
            run_record.completed_at = datetime.utcnow()

        # Update schedule
        schedule.run_count += 1
        schedule.last_run = datetime.utcnow()
        schedule.next_run = self._calculate_next_run(schedule)

        # Add to history (keep last 50)
        schedule.run_history.append(run_record)
        if len(schedule.run_history) > 50:
            schedule.run_history = schedule.run_history[-50:]

        # Check if completed (for one-time schedules)
        if schedule.schedule_type == ScheduleType.ONCE:
            schedule.status = ScheduleStatus.COMPLETED

        # Check if max runs reached
        if schedule.max_runs and schedule.run_count >= schedule.max_runs:
            schedule.status = ScheduleStatus.COMPLETED

        schedule.updated_at = datetime.utcnow()
        self._save_schedule(schedule)

    def start(self):
        """Start the scheduler."""
        if not HAS_APSCHEDULER:
            print("APScheduler not available - scheduler not started")
            return False

        if self._is_running:
            return True

        try:
            # Configure APScheduler
            jobstores = {
                'default': MemoryJobStore()
            }
            executors = {
                'default': AsyncIOExecutor()
            }
            job_defaults = {
                'coalesce': True,
                'max_instances': 1,
                'misfire_grace_time': 3600,  # 1 hour
            }

            self._scheduler = AsyncIOScheduler(
                jobstores=jobstores,
                executors=executors,
                job_defaults=job_defaults,
                timezone='UTC'
            )

            # Add jobs for all active schedules
            for schedule in self._schedules.values():
                if schedule.status == ScheduleStatus.ACTIVE:
                    self._add_scheduler_job(schedule)

            self._scheduler.start()
            self._is_running = True
            print("Scheduler started successfully")
            return True

        except Exception as e:
            print(f"Error starting scheduler: {e}")
            return False

    def stop(self):
        """Stop the scheduler."""
        if self._scheduler and self._is_running:
            self._scheduler.shutdown(wait=False)
            self._is_running = False
            print("Scheduler stopped")

    def _add_scheduler_job(self, schedule: CrawlSchedule):
        """Add a schedule to APScheduler."""
        if not self._scheduler or not HAS_APSCHEDULER:
            return

        try:
            # Parse cron expression
            parts = schedule.cron_expression.split()
            if len(parts) == 5:
                minute, hour, day, month, day_of_week = parts
            elif len(parts) == 6:
                minute, hour, day, month, day_of_week, _ = parts
            else:
                return

            trigger = CronTrigger(
                minute=minute,
                hour=hour,
                day=day,
                month=month,
                day_of_week=day_of_week,
                timezone=schedule.timezone,
            )

            self._scheduler.add_job(
                self._execute_scheduled_crawl,
                trigger=trigger,
                id=schedule.id,
                args=[schedule.id],
                replace_existing=True,
            )
        except Exception as e:
            print(f"Error adding job for schedule {schedule.id}: {e}")

    def _remove_scheduler_job(self, schedule_id: str):
        """Remove a schedule from APScheduler."""
        if not self._scheduler or not HAS_APSCHEDULER:
            return

        try:
            self._scheduler.remove_job(schedule_id)
        except Exception:
            pass  # Job may not exist

    # Public API

    def get_all_schedules(self) -> List[CrawlSchedule]:
        """Get all schedules."""
        return list(self._schedules.values())

    def get_active_schedules(self) -> List[CrawlSchedule]:
        """Get only active schedules."""
        return [s for s in self._schedules.values() if s.status == ScheduleStatus.ACTIVE]

    def get_schedule(self, schedule_id: str) -> Optional[CrawlSchedule]:
        """Get a specific schedule."""
        return self._schedules.get(schedule_id)

    def create_schedule(self, request: ScheduleCreateRequest) -> CrawlSchedule:
        """Create a new schedule."""
        schedule = CrawlSchedule(
            name=request.name,
            description=request.description,
            schedule_type=request.schedule_type,
            cron_expression=request.cron_expression or "0 2 * * *",
            timezone=request.timezone,
            start_date=request.start_date,
            end_date=request.end_date,
            max_runs=request.max_runs,
            skip_if_running=request.skip_if_running,
            template_id=request.template_id,
            crawl_config=request.crawl_config,
            notifications=request.notifications or NotificationConfig(),
            status=ScheduleStatus.ACTIVE,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        # Calculate next run
        schedule.next_run = self._calculate_next_run(schedule)

        # Save
        self._schedules[schedule.id] = schedule
        self._save_schedule(schedule)

        # Add to APScheduler if running
        if self._is_running:
            self._add_scheduler_job(schedule)

        return schedule

    def update_schedule(self, schedule_id: str, request: ScheduleUpdateRequest) -> Optional[CrawlSchedule]:
        """Update an existing schedule."""
        schedule = self._schedules.get(schedule_id)
        if not schedule:
            return None

        # Update fields
        if request.name is not None:
            schedule.name = request.name
        if request.description is not None:
            schedule.description = request.description
        if request.schedule_type is not None:
            schedule.schedule_type = request.schedule_type
        if request.cron_expression is not None:
            schedule.cron_expression = request.cron_expression
        if request.timezone is not None:
            schedule.timezone = request.timezone
        if request.start_date is not None:
            schedule.start_date = request.start_date
        if request.end_date is not None:
            schedule.end_date = request.end_date
        if request.max_runs is not None:
            schedule.max_runs = request.max_runs
        if request.skip_if_running is not None:
            schedule.skip_if_running = request.skip_if_running
        if request.template_id is not None:
            schedule.template_id = request.template_id
        if request.crawl_config is not None:
            schedule.crawl_config = request.crawl_config
        if request.notifications is not None:
            schedule.notifications = request.notifications

        schedule.next_run = self._calculate_next_run(schedule)
        schedule.updated_at = datetime.utcnow()

        self._save_schedule(schedule)

        # Update APScheduler job
        if self._is_running and schedule.status == ScheduleStatus.ACTIVE:
            self._remove_scheduler_job(schedule_id)
            self._add_scheduler_job(schedule)

        return schedule

    def delete_schedule(self, schedule_id: str) -> bool:
        """Delete a schedule."""
        if schedule_id not in self._schedules:
            return False

        # Remove from APScheduler
        self._remove_scheduler_job(schedule_id)

        # Remove from memory and disk
        del self._schedules[schedule_id]
        self._delete_schedule_file(schedule_id)

        return True

    def pause_schedule(self, schedule_id: str) -> Optional[CrawlSchedule]:
        """Pause a schedule."""
        schedule = self._schedules.get(schedule_id)
        if not schedule:
            return None

        schedule.status = ScheduleStatus.PAUSED
        schedule.updated_at = datetime.utcnow()

        self._save_schedule(schedule)
        self._remove_scheduler_job(schedule_id)

        return schedule

    def resume_schedule(self, schedule_id: str) -> Optional[CrawlSchedule]:
        """Resume a paused schedule."""
        schedule = self._schedules.get(schedule_id)
        if not schedule:
            return None

        if schedule.status != ScheduleStatus.PAUSED:
            return schedule

        schedule.status = ScheduleStatus.ACTIVE
        schedule.next_run = self._calculate_next_run(schedule)
        schedule.updated_at = datetime.utcnow()

        self._save_schedule(schedule)

        if self._is_running:
            self._add_scheduler_job(schedule)

        return schedule

    async def trigger_schedule(self, schedule_id: str) -> Optional[Dict[str, Any]]:
        """Manually trigger a schedule to run now."""
        schedule = self._schedules.get(schedule_id)
        if not schedule:
            return None

        await self._execute_scheduled_crawl(schedule_id)

        return {
            "schedule_id": schedule_id,
            "triggered_at": datetime.utcnow().isoformat(),
            "run_count": schedule.run_count,
        }

    def get_schedule_history(self, schedule_id: str, limit: int = 20) -> List[ScheduleRunRecord]:
        """Get run history for a schedule."""
        schedule = self._schedules.get(schedule_id)
        if not schedule:
            return []

        history = schedule.run_history[-limit:]
        return list(reversed(history))  # Most recent first

    def update_run_status(
        self,
        schedule_id: str,
        crawl_id: str,
        status: str,
        documents_found: int = 0,
        error_message: Optional[str] = None
    ):
        """Update the status of a schedule run (called when crawl completes)."""
        schedule = self._schedules.get(schedule_id)
        if not schedule:
            return

        # Find the run record
        for run in schedule.run_history:
            if run.crawl_id == crawl_id:
                run.status = status
                run.completed_at = datetime.utcnow()
                run.documents_found = documents_found
                run.error_message = error_message

                if run.started_at:
                    run.duration_seconds = (run.completed_at - run.started_at).total_seconds()

                break

        self._save_schedule(schedule)

    def get_stats(self) -> Dict[str, Any]:
        """Get scheduler statistics."""
        all_schedules = self.get_all_schedules()
        active = len([s for s in all_schedules if s.status == ScheduleStatus.ACTIVE])
        paused = len([s for s in all_schedules if s.status == ScheduleStatus.PAUSED])
        total_runs = sum(s.run_count for s in all_schedules)

        return {
            "total_schedules": len(all_schedules),
            "active_count": active,
            "paused_count": paused,
            "total_runs": total_runs,
            "scheduler_running": self._is_running,
        }


# Create singleton instance
crawl_scheduler = CrawlScheduler()
