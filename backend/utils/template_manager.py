"""
Template Manager

Manages crawl templates - both built-in and custom.
Handles CRUD operations and template usage tracking.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
import os
import sys

# Add parent to path
backend_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, backend_dir)

from models.crawl_template import (
    CrawlTemplate,
    TemplateCategory,
    CrawlConfig,
    CrawlLimits,
    QualitySettings,
    PerformanceSettings,
    ProcessingSettings,
    OutputSettings,
    TemplateCreateRequest,
    TemplateUpdateRequest,
)


class TemplateManager:
    """Manages crawl templates."""

    def __init__(self, data_dir: str = None, config_dir: str = None):
        # Data directory for custom templates
        if data_dir is None:
            self.data_dir = Path(__file__).parent.parent.parent / "data" / "templates"
        else:
            self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        # Config directory for built-in templates
        if config_dir is None:
            self.config_dir = Path(__file__).parent.parent / "config"
        else:
            self.config_dir = Path(config_dir)
        self.config_dir.mkdir(parents=True, exist_ok=True)

        # In-memory cache
        self._builtin_templates: Dict[str, CrawlTemplate] = {}
        self._custom_templates: Dict[str, CrawlTemplate] = {}

        # Load templates
        self._load_builtin_templates()
        self._load_custom_templates()

    def _load_builtin_templates(self):
        """Load built-in templates from config."""
        builtin_path = self.config_dir / "templates.json"

        if builtin_path.exists():
            try:
                with open(builtin_path, 'r') as f:
                    data = json.load(f)
                    for template_data in data.get("templates", []):
                        template_data["is_builtin"] = True
                        template = CrawlTemplate(**template_data)
                        self._builtin_templates[template.id] = template
            except Exception as e:
                print(f"Error loading built-in templates: {e}")

        # If no built-in templates loaded, create defaults
        if not self._builtin_templates:
            self._create_default_builtin_templates()

    def _create_default_builtin_templates(self):
        """Create default built-in templates."""
        default_templates = [
            CrawlTemplate(
                id="sea-materials",
                name="Caribbean SEA Materials",
                description="Find all SEA (Secondary Entrance Assessment) past papers and curriculum guides from Trinidad & Tobago Ministry of Education",
                category=TemplateCategory.EDUCATION,
                icon="book-open",
                is_builtin=True,
                tags=["sea", "trinidad", "primary", "past papers", "curriculum"],
                config=CrawlConfig(
                    targets=["moe.gov.tt", "sea.gov.tt", "ttconnect.gov.tt"],
                    keywords=["SEA", "past paper", "curriculum", "primary school", "standard 5"],
                    file_types=["pdf"],
                    limits=CrawlLimits(max_pages=5000, max_documents=1000),
                    quality=QualitySettings(min_quality_score=0.7),
                )
            ),
            CrawlTemplate(
                id="cxc-csec",
                name="CXC CSEC Past Papers",
                description="Download CXC Caribbean Secondary Education Certificate (CSEC) examination papers and mark schemes",
                category=TemplateCategory.EDUCATION,
                icon="file-text",
                is_builtin=True,
                tags=["cxc", "csec", "caribbean", "secondary", "exams"],
                config=CrawlConfig(
                    targets=["cxc.org", "cxcregistration.com"],
                    keywords=["CSEC", "past paper", "examination", "mark scheme", "syllabus"],
                    file_types=["pdf"],
                    limits=CrawlLimits(max_pages=10000, max_documents=5000),
                )
            ),
            CrawlTemplate(
                id="cxc-cape",
                name="CXC CAPE Past Papers",
                description="Download CXC Caribbean Advanced Proficiency Examination (CAPE) papers and resources",
                category=TemplateCategory.EDUCATION,
                icon="graduation-cap",
                is_builtin=True,
                tags=["cxc", "cape", "caribbean", "advanced", "sixth form"],
                config=CrawlConfig(
                    targets=["cxc.org"],
                    keywords=["CAPE", "past paper", "unit 1", "unit 2", "module"],
                    file_types=["pdf"],
                    limits=CrawlLimits(max_pages=10000, max_documents=5000),
                )
            ),
            CrawlTemplate(
                id="tt-legal",
                name="Trinidad Legal Documents",
                description="Trinidad & Tobago legal statutes, court opinions, and legislation from official sources",
                category=TemplateCategory.LEGAL,
                icon="scale",
                is_builtin=True,
                tags=["legal", "trinidad", "statutes", "court", "legislation"],
                config=CrawlConfig(
                    targets=["ttlawcourts.org", "legalaffairs.gov.tt", "agla.gov.tt"],
                    keywords=["statute", "legislation", "court opinion", "judgment", "act"],
                    file_types=["pdf", "doc", "docx"],
                    limits=CrawlLimits(max_pages=20000, max_documents=10000),
                    quality=QualitySettings(min_quality_score=0.6, require_metadata=["title"]),
                )
            ),
            CrawlTemplate(
                id="arxiv-ml",
                name="Academic Papers (ArXiv)",
                description="Recent machine learning and AI research papers from arXiv",
                category=TemplateCategory.RESEARCH,
                icon="flask",
                is_builtin=True,
                tags=["arxiv", "research", "machine learning", "ai", "academic"],
                config=CrawlConfig(
                    targets=["arxiv.org"],
                    keywords=["machine learning", "neural network", "deep learning", "transformer"],
                    file_types=["pdf"],
                    crawler="crawl4ai",
                    limits=CrawlLimits(max_pages=5000, max_documents=2000),
                    processing=ProcessingSettings(extract_text=True, generate_embeddings=True),
                )
            ),
            CrawlTemplate(
                id="news-articles",
                name="News Articles",
                description="General news article crawler for major news sites",
                category=TemplateCategory.NEWS,
                icon="newspaper",
                is_builtin=True,
                tags=["news", "articles", "media", "journalism"],
                config=CrawlConfig(
                    targets=[],  # User must specify
                    keywords=["news", "article", "report"],
                    file_types=["html", "pdf"],
                    limits=CrawlLimits(max_pages=1000, max_documents=500, max_duration_minutes=60),
                    performance=PerformanceSettings(concurrent_requests=5, delay_seconds=2.0),
                    quality=QualitySettings(require_date=True),
                )
            ),
            CrawlTemplate(
                id="govt-publications",
                name="Government Publications",
                description="Government reports, publications, and official documents",
                category=TemplateCategory.GOVERNMENT,
                icon="building",
                is_builtin=True,
                tags=["government", "official", "reports", "publications"],
                config=CrawlConfig(
                    targets=[],  # User specifies gov domain
                    keywords=["report", "publication", "policy", "white paper"],
                    file_types=["pdf", "doc", "docx"],
                    limits=CrawlLimits(max_pages=10000, max_documents=5000),
                    quality=QualitySettings(min_quality_score=0.6),
                )
            ),
            CrawlTemplate(
                id="research-data",
                name="Research Data",
                description="Scientific research data and datasets from research repositories",
                category=TemplateCategory.RESEARCH,
                icon="database",
                is_builtin=True,
                tags=["research", "data", "datasets", "science"],
                config=CrawlConfig(
                    targets=["zenodo.org", "figshare.com", "data.gov"],
                    keywords=["dataset", "research data", "raw data"],
                    file_types=["csv", "json", "xlsx", "pdf"],
                    limits=CrawlLimits(max_pages=5000, max_documents=2000, max_file_size_mb=100),
                    processing=ProcessingSettings(extract_tables=True),
                )
            ),
            CrawlTemplate(
                id="market-reports",
                name="Market Reports",
                description="Industry market reports and analysis documents",
                category=TemplateCategory.RESEARCH,
                icon="trending-up",
                is_builtin=True,
                tags=["market", "industry", "reports", "analysis", "business"],
                config=CrawlConfig(
                    targets=[],  # User specifies
                    keywords=["market report", "industry analysis", "forecast", "market size"],
                    file_types=["pdf"],
                    limits=CrawlLimits(max_pages=2000, max_documents=500),
                    quality=QualitySettings(min_quality_score=0.75),
                )
            ),
            CrawlTemplate(
                id="tech-docs",
                name="Technical Documentation",
                description="Technical documentation, API docs, and developer guides",
                category=TemplateCategory.TECHNICAL,
                icon="code",
                is_builtin=True,
                tags=["technical", "documentation", "api", "developer", "docs"],
                config=CrawlConfig(
                    targets=[],  # User specifies
                    keywords=["documentation", "api", "guide", "reference", "tutorial"],
                    file_types=["html", "md", "pdf"],
                    limits=CrawlLimits(max_pages=5000, max_documents=2000, max_depth=10),
                    performance=PerformanceSettings(concurrent_requests=15),
                    output=OutputSettings(hierarchical_structure=True),
                )
            ),
        ]

        for template in default_templates:
            self._builtin_templates[template.id] = template

        # Save to config file
        self._save_builtin_templates()

    def _save_builtin_templates(self):
        """Save built-in templates to config file."""
        builtin_path = self.config_dir / "templates.json"
        try:
            templates_data = {
                "version": "1.0",
                "updated_at": datetime.utcnow().isoformat(),
                "templates": [
                    t.dict() for t in self._builtin_templates.values()
                ]
            }
            with open(builtin_path, 'w') as f:
                json.dump(templates_data, f, indent=2, default=str)
        except Exception as e:
            print(f"Error saving built-in templates: {e}")

    def _load_custom_templates(self):
        """Load custom templates from data directory."""
        for template_file in self.data_dir.glob("*.json"):
            try:
                with open(template_file, 'r') as f:
                    data = json.load(f)
                    data["is_builtin"] = False
                    template = CrawlTemplate(**data)
                    self._custom_templates[template.id] = template
            except Exception as e:
                print(f"Error loading custom template {template_file}: {e}")

    def _save_custom_template(self, template: CrawlTemplate) -> bool:
        """Save a custom template to file."""
        try:
            template_path = self.data_dir / f"{template.id}.json"
            with open(template_path, 'w') as f:
                json.dump(template.dict(), f, indent=2, default=str)
            return True
        except Exception as e:
            print(f"Error saving template {template.id}: {e}")
            return False

    def _delete_custom_template_file(self, template_id: str) -> bool:
        """Delete a custom template file."""
        try:
            template_path = self.data_dir / f"{template_id}.json"
            if template_path.exists():
                template_path.unlink()
                return True
            return False
        except Exception as e:
            print(f"Error deleting template {template_id}: {e}")
            return False

    # Public API

    def get_all_templates(self) -> List[CrawlTemplate]:
        """Get all templates (built-in + custom)."""
        all_templates = list(self._builtin_templates.values()) + list(self._custom_templates.values())
        return sorted(all_templates, key=lambda t: (not t.is_builtin, t.name))

    def get_builtin_templates(self) -> List[CrawlTemplate]:
        """Get only built-in templates."""
        return list(self._builtin_templates.values())

    def get_custom_templates(self) -> List[CrawlTemplate]:
        """Get only custom templates."""
        return list(self._custom_templates.values())

    def get_template(self, template_id: str) -> Optional[CrawlTemplate]:
        """Get a specific template by ID."""
        if template_id in self._builtin_templates:
            return self._builtin_templates[template_id]
        if template_id in self._custom_templates:
            return self._custom_templates[template_id]
        return None

    def get_templates_by_category(self, category: TemplateCategory) -> List[CrawlTemplate]:
        """Get templates filtered by category."""
        all_templates = self.get_all_templates()
        return [t for t in all_templates if t.category == category]

    def get_categories(self) -> List[Dict[str, Any]]:
        """Get all categories with counts."""
        all_templates = self.get_all_templates()
        category_counts: Dict[str, int] = {}

        for template in all_templates:
            cat = template.category.value
            category_counts[cat] = category_counts.get(cat, 0) + 1

        return [
            {
                "id": cat.value,
                "name": cat.value.replace("_", " ").title(),
                "count": category_counts.get(cat.value, 0)
            }
            for cat in TemplateCategory
        ]

    def get_popular_templates(self, limit: int = 5) -> List[CrawlTemplate]:
        """Get most used templates."""
        all_templates = self.get_all_templates()
        sorted_templates = sorted(all_templates, key=lambda t: t.used_count, reverse=True)
        return sorted_templates[:limit]

    def search_templates(self, query: str) -> List[CrawlTemplate]:
        """Search templates by name, description, or tags."""
        query_lower = query.lower()
        all_templates = self.get_all_templates()

        results = []
        for template in all_templates:
            if (
                query_lower in template.name.lower() or
                query_lower in template.description.lower() or
                any(query_lower in tag.lower() for tag in template.tags)
            ):
                results.append(template)

        return results

    def create_template(self, request: TemplateCreateRequest) -> CrawlTemplate:
        """Create a new custom template."""
        template = CrawlTemplate(
            name=request.name,
            description=request.description,
            category=request.category,
            config=request.config,
            tags=request.tags,
            icon=request.icon,
            is_builtin=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        self._custom_templates[template.id] = template
        self._save_custom_template(template)

        return template

    def update_template(self, template_id: str, request: TemplateUpdateRequest) -> Optional[CrawlTemplate]:
        """Update an existing custom template."""
        template = self._custom_templates.get(template_id)
        if not template:
            return None

        # Update fields if provided
        if request.name is not None:
            template.name = request.name
        if request.description is not None:
            template.description = request.description
        if request.category is not None:
            template.category = request.category
        if request.config is not None:
            template.config = request.config
        if request.tags is not None:
            template.tags = request.tags
        if request.icon is not None:
            template.icon = request.icon

        template.updated_at = datetime.utcnow()

        self._save_custom_template(template)
        return template

    def delete_template(self, template_id: str) -> bool:
        """Delete a custom template."""
        if template_id in self._builtin_templates:
            return False  # Cannot delete built-in templates

        if template_id in self._custom_templates:
            del self._custom_templates[template_id]
            self._delete_custom_template_file(template_id)
            return True

        return False

    def use_template(self, template_id: str) -> Optional[CrawlConfig]:
        """Mark a template as used and return its config."""
        template = self.get_template(template_id)
        if not template:
            return None

        # Update usage stats
        template.used_count += 1
        template.last_used_at = datetime.utcnow()

        # Save if custom template
        if not template.is_builtin:
            self._save_custom_template(template)

        return template.config

    def duplicate_template(self, template_id: str, new_name: str) -> Optional[CrawlTemplate]:
        """Duplicate a template (builtin or custom) as a new custom template."""
        source = self.get_template(template_id)
        if not source:
            return None

        new_template = CrawlTemplate(
            name=new_name,
            description=f"Copy of {source.name}",
            category=source.category,
            config=source.config.copy(),
            tags=source.tags.copy(),
            icon=source.icon,
            is_builtin=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        self._custom_templates[new_template.id] = new_template
        self._save_custom_template(new_template)

        return new_template

    def get_stats(self) -> Dict[str, Any]:
        """Get template statistics."""
        all_templates = self.get_all_templates()
        total_uses = sum(t.used_count for t in all_templates)

        return {
            "total_templates": len(all_templates),
            "builtin_count": len(self._builtin_templates),
            "custom_count": len(self._custom_templates),
            "total_uses": total_uses,
            "categories": self.get_categories(),
        }


# Create singleton instance
template_manager = TemplateManager()
