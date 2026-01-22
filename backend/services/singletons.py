"""Singleton service instances shared across routers."""

from crawlers.manager import CrawlerManager
from orchestrator import LLMOrchestrator

crawler_manager = CrawlerManager()
orchestrator = LLMOrchestrator()
