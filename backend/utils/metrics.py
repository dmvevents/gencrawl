"""
Real-time metrics collection and aggregation for crawl jobs.
"""

import psutil
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from collections import deque
from dataclasses import dataclass, field
import statistics


@dataclass
class MetricPoint:
    """A single metric measurement."""
    timestamp: datetime
    value: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MetricSeries:
    """Time series of metric measurements."""
    name: str
    unit: str
    points: deque = field(default_factory=lambda: deque(maxlen=1000))

    def add(self, value: float, metadata: Dict[str, Any] = None):
        """Add a metric point."""
        point = MetricPoint(
            timestamp=datetime.utcnow(),
            value=value,
            metadata=metadata or {}
        )
        self.points.append(point)

    def get_latest(self) -> Optional[float]:
        """Get the latest value."""
        return self.points[-1].value if self.points else None

    def get_average(self, window_seconds: int = 300) -> Optional[float]:
        """Get average over time window (default 5 minutes)."""
        cutoff = datetime.utcnow() - timedelta(seconds=window_seconds)
        values = [p.value for p in self.points if p.timestamp >= cutoff]
        return statistics.mean(values) if values else None

    def get_min(self, window_seconds: int = 300) -> Optional[float]:
        """Get minimum over time window."""
        cutoff = datetime.utcnow() - timedelta(seconds=window_seconds)
        values = [p.value for p in self.points if p.timestamp >= cutoff]
        return min(values) if values else None

    def get_max(self, window_seconds: int = 300) -> Optional[float]:
        """Get maximum over time window."""
        cutoff = datetime.utcnow() - timedelta(seconds=window_seconds)
        values = [p.value for p in self.points if p.timestamp >= cutoff]
        return max(values) if values else None

    def get_percentile(self, percentile: float, window_seconds: int = 300) -> Optional[float]:
        """Get percentile over time window."""
        cutoff = datetime.utcnow() - timedelta(seconds=window_seconds)
        values = [p.value for p in self.points if p.timestamp >= cutoff]
        if not values:
            return None
        sorted_values = sorted(values)
        index = int(len(sorted_values) * percentile / 100)
        return sorted_values[index]

    def get_recent_points(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent metric points."""
        recent = list(self.points)[-limit:]
        return [
            {
                "timestamp": p.timestamp.isoformat(),
                "value": p.value,
                "metadata": p.metadata
            }
            for p in recent
        ]


class MetricsCollector:
    """Collects and aggregates metrics for a crawl job."""

    def __init__(self, crawl_id: str):
        self.crawl_id = crawl_id
        self.metrics: Dict[str, MetricSeries] = {}
        self.start_time = datetime.utcnow()
        self.process = psutil.Process()

        # Initialize standard metrics
        self._init_metrics()

    def _init_metrics(self):
        """Initialize standard metric series."""
        self.metrics = {
            # Throughput metrics
            "pages_per_second": MetricSeries("pages_per_second", "pages/s"),
            "pages_per_minute": MetricSeries("pages_per_minute", "pages/min"),
            "documents_per_second": MetricSeries("documents_per_second", "docs/s"),

            # Download metrics
            "download_speed_mbps": MetricSeries("download_speed_mbps", "MB/s"),
            "download_bytes": MetricSeries("download_bytes", "bytes"),

            # Success metrics
            "success_rate": MetricSeries("success_rate", "%"),
            "error_rate": MetricSeries("error_rate", "%"),

            # Quality metrics
            "quality_score": MetricSeries("quality_score", "score"),
            "quality_pass_rate": MetricSeries("quality_pass_rate", "%"),

            # Resource metrics
            "memory_usage_mb": MetricSeries("memory_usage_mb", "MB"),
            "cpu_usage_percent": MetricSeries("cpu_usage_percent", "%"),
            "thread_count": MetricSeries("thread_count", "threads"),

            # Queue metrics
            "queue_size": MetricSeries("queue_size", "items"),
            "active_tasks": MetricSeries("active_tasks", "tasks"),

            # Timing metrics
            "avg_page_time": MetricSeries("avg_page_time", "seconds"),
            "avg_extraction_time": MetricSeries("avg_extraction_time", "seconds"),
        }

    def record(self, metric_name: str, value: float, metadata: Dict[str, Any] = None):
        """Record a metric value."""
        if metric_name not in self.metrics:
            # Auto-create metric series if not exists
            self.metrics[metric_name] = MetricSeries(metric_name, "units")

        self.metrics[metric_name].add(value, metadata)

    def record_system_metrics(self):
        """Record system resource metrics."""
        # Memory usage
        memory_info = self.process.memory_info()
        self.record("memory_usage_mb", memory_info.rss / 1024 / 1024)

        # CPU usage
        cpu_percent = self.process.cpu_percent(interval=0.1)
        self.record("cpu_usage_percent", cpu_percent)

        # Thread count
        thread_count = self.process.num_threads()
        self.record("thread_count", thread_count)

    def calculate_throughput(
        self,
        current_count: int,
        start_time: datetime,
        metric_name: str = "pages_per_second"
    ) -> float:
        """Calculate and record throughput."""
        elapsed = (datetime.utcnow() - start_time).total_seconds()
        if elapsed > 0:
            throughput = current_count / elapsed
            self.record(metric_name, throughput)
            return throughput
        return 0.0

    def calculate_success_rate(self, successful: int, failed: int) -> float:
        """Calculate and record success rate."""
        total = successful + failed
        if total > 0:
            rate = (successful / total) * 100
            self.record("success_rate", rate)
            self.record("error_rate", 100 - rate)
            return rate
        return 100.0

    def calculate_quality_metrics(self, scores: List[float], threshold: float = 0.7):
        """Calculate and record quality metrics."""
        if not scores:
            return

        avg_score = statistics.mean(scores)
        self.record("quality_score", avg_score)

        passed = sum(1 for s in scores if s >= threshold)
        pass_rate = (passed / len(scores)) * 100
        self.record("quality_pass_rate", pass_rate)

    def get_snapshot(self) -> Dict[str, Any]:
        """Get current metrics snapshot."""
        return {
            "crawl_id": self.crawl_id,
            "timestamp": datetime.utcnow().isoformat(),
            "uptime_seconds": (datetime.utcnow() - self.start_time).total_seconds(),
            "metrics": {
                name: {
                    "latest": series.get_latest(),
                    "avg_5min": series.get_average(300),
                    "avg_1hour": series.get_average(3600),
                    "min_5min": series.get_min(300),
                    "max_5min": series.get_max(300),
                    "p50": series.get_percentile(50, 300),
                    "p95": series.get_percentile(95, 300),
                    "p99": series.get_percentile(99, 300),
                    "unit": series.unit,
                }
                for name, series in self.metrics.items()
            }
        }

    def get_time_series(
        self,
        metric_name: str,
        window_seconds: int = 300,
        limit: int = 100
    ) -> Dict[str, Any]:
        """Get time series data for a specific metric."""
        if metric_name not in self.metrics:
            return {"error": f"Metric {metric_name} not found"}

        series = self.metrics[metric_name]
        cutoff = datetime.utcnow() - timedelta(seconds=window_seconds)

        points = [
            {"timestamp": p.timestamp.isoformat(), "value": p.value}
            for p in series.points
            if p.timestamp >= cutoff
        ][-limit:]

        return {
            "metric": metric_name,
            "unit": series.unit,
            "window_seconds": window_seconds,
            "point_count": len(points),
            "points": points,
        }

    def get_aggregated_metrics(self, window_seconds: int = 300) -> Dict[str, Any]:
        """Get aggregated metrics over time window."""
        aggregated = {}

        for name, series in self.metrics.items():
            cutoff = datetime.utcnow() - timedelta(seconds=window_seconds)
            values = [p.value for p in series.points if p.timestamp >= cutoff]

            if values:
                aggregated[name] = {
                    "count": len(values),
                    "latest": values[-1],
                    "avg": statistics.mean(values),
                    "min": min(values),
                    "max": max(values),
                    "median": statistics.median(values),
                    "stdev": statistics.stdev(values) if len(values) > 1 else 0,
                    "unit": series.unit,
                }

        return {
            "crawl_id": self.crawl_id,
            "window_seconds": window_seconds,
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": aggregated,
        }

    def estimate_completion(
        self,
        total_items: int,
        completed_items: int,
        start_time: datetime
    ) -> Optional[datetime]:
        """Estimate completion time based on current progress."""
        if completed_items == 0 or total_items == 0:
            return None

        elapsed = (datetime.utcnow() - start_time).total_seconds()
        rate = completed_items / elapsed  # items per second
        remaining = total_items - completed_items

        if rate > 0:
            seconds_remaining = remaining / rate
            return datetime.utcnow() + timedelta(seconds=seconds_remaining)

        return None

    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary with key metrics."""
        return {
            "crawl_id": self.crawl_id,
            "throughput": {
                "pages_per_second": self.metrics["pages_per_second"].get_latest(),
                "pages_per_minute": self.metrics["pages_per_minute"].get_latest(),
                "avg_page_time": self.metrics["avg_page_time"].get_average(300),
            },
            "success": {
                "success_rate": self.metrics["success_rate"].get_latest(),
                "error_rate": self.metrics["error_rate"].get_latest(),
            },
            "quality": {
                "avg_quality_score": self.metrics["quality_score"].get_average(300),
                "quality_pass_rate": self.metrics["quality_pass_rate"].get_latest(),
            },
            "resources": {
                "memory_mb": self.metrics["memory_usage_mb"].get_latest(),
                "cpu_percent": self.metrics["cpu_usage_percent"].get_latest(),
                "threads": self.metrics["thread_count"].get_latest(),
            },
        }


class MetricsAggregator:
    """Aggregates metrics across multiple crawl jobs."""

    def __init__(self):
        self.collectors: Dict[str, MetricsCollector] = {}

    def get_or_create_collector(self, crawl_id: str) -> MetricsCollector:
        """Get or create metrics collector for a crawl."""
        if crawl_id not in self.collectors:
            self.collectors[crawl_id] = MetricsCollector(crawl_id)
        return self.collectors[crawl_id]

    def remove_collector(self, crawl_id: str):
        """Remove collector for completed crawl."""
        if crawl_id in self.collectors:
            del self.collectors[crawl_id]

    def get_all_snapshots(self) -> List[Dict[str, Any]]:
        """Get snapshots for all active crawls."""
        return [collector.get_snapshot() for collector in self.collectors.values()]

    def get_system_summary(self) -> Dict[str, Any]:
        """Get system-wide metrics summary."""
        total_memory = sum(
            c.metrics["memory_usage_mb"].get_latest() or 0
            for c in self.collectors.values()
        )

        avg_cpu = statistics.mean([
            c.metrics["cpu_usage_percent"].get_latest() or 0
            for c in self.collectors.values()
        ]) if self.collectors else 0

        return {
            "active_crawls": len(self.collectors),
            "total_memory_mb": total_memory,
            "avg_cpu_percent": avg_cpu,
            "crawl_ids": list(self.collectors.keys()),
        }
