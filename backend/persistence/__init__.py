"""Persistence layer for GenCrawl."""

from .job_store import JSONJobStore, job_store

__all__ = ["JSONJobStore", "job_store"]
