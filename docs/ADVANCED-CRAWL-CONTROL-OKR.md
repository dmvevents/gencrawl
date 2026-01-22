# Advanced Crawl Configuration & Control System - OKR

**Project:** GenCrawl Advanced Features
**Owner:** Full-Stack Team
**Timeline:** Days 1-5
**Status:** Planning → Execution
**Date:** January 20, 2026

---

## Executive Summary

Build an **Advanced Crawl Configuration & Control System** that provides:
- **Configurable settings** (min/max constraints, quality gates, budgets)
- **Multi-iteration support** (repeated crawls, incremental updates)
- **Resume/continue functionality** (pick up where it left off)
- **Crawl templates** (save and reuse configurations)
- **Scheduling** (automated crawls on schedule)
- **Advanced controls** (quality gates, budget limits, notifications)

---

## Objective 1: Implement Configurable Crawl Settings

**Owner:** Backend Team
**Timeline:** Days 1-2

### Key Results

| KR | Metric | Target | Measurement |
|----|--------|--------|-------------|
| **KR 1.1** | Configuration options | 30+ | All crawl parameters configurable |
| **KR 1.2** | Settings UI implemented | 100% | Settings page in dashboard |
| **KR 1.3** | Validation rules | 100% | Min/max enforcement |
| **KR 1.4** | Preset templates | 5+ | Quick start configurations |
| **KR 1.5** | Save custom templates | 100% | User-defined templates |

### Configurable Settings Categories

#### 1. Crawl Limits & Constraints
```json
{
  "limits": {
    "max_pages": 10000,              // Maximum pages to crawl
    "max_documents": 5000,            // Maximum documents to download
    "max_duration_minutes": 360,      // 6 hour timeout
    "max_file_size_mb": 50,           // Per-file size limit
    "max_total_size_gb": 10,          // Total download limit
    "min_file_size_kb": 10,           // Skip tiny files
    "max_depth": 5,                   // Link depth
    "max_retries": 3,                 // Retry failed requests
    "timeout_seconds": 60             // Per-request timeout
  }
}
```

#### 2. Quality Gates
```json
{
  "quality": {
    "min_quality_score": 0.7,         // Reject low quality
    "min_relevance_score": 0.6,       // Reject irrelevant
    "max_duplicate_percentage": 10,   // Stop if >10% duplicates
    "min_text_length": 100,           // Min characters
    "require_date": false,            // Must have publish date
    "require_metadata": ["title"],    // Required fields
    "stop_on_quality_drop": false,    // Pause if quality drops
    "quality_threshold_percentage": 50 // % of docs must pass quality
  }
}
```

#### 3. Performance & Politeness
```json
{
  "performance": {
    "concurrent_requests": 10,        // Parallel requests
    "delay_seconds": 1,               // Delay between requests
    "respect_robots_txt": true,       // Honor robots.txt
    "user_agent": "GenCrawl/1.0",     // Custom user agent
    "enable_caching": true,           // Cache responses
    "enable_compression": true,       // Compress downloads
    "follow_redirects": true,         // Follow redirects
    "max_redirects": 5                // Redirect limit
  }
}
```

#### 4. Data Processing
```json
{
  "processing": {
    "extract_text": true,             // Extract text from PDFs
    "extract_tables": true,           // Extract tables
    "extract_images": false,          // Extract images
    "run_ocr": false,                 // OCR scanned docs
    "enable_deduplication": true,     // Remove duplicates
    "dedupe_threshold": 0.85,         // Similarity threshold
    "enable_pii_redaction": false,    // Redact PII
    "generate_embeddings": false,     // Vector embeddings
    "run_nemo_curator": false         // Nemo processing
  }
}
```

#### 5. Output Configuration
```json
{
  "output": {
    "format": "jsonl",                // Output format
    "include_raw_files": true,        // Keep original files
    "create_manifest": true,          // Generate manifest.json
    "hierarchical_structure": true,   // Organize by hierarchy
    "preserve_filenames": true,       // Keep original names
    "add_timestamps": true,           // Add timestamps to filenames
    "compress_output": false          // ZIP the output
  }
}
```

---

## Objective 2: Multi-Iteration & Incremental Crawling

**Owner:** Backend Team
**Timeline:** Days 2-3

### Key Results

| KR | Metric | Target | Measurement |
|----|--------|--------|-------------|
| **KR 2.1** | Multi-iteration support | 100% | Can run crawl N times |
| **KR 2.2** | Incremental crawling | 100% | Only fetch new content |
| **KR 2.3** | Change detection | 100% | Detect modified documents |
| **KR 2.4** | Iteration comparison | 100% | Compare runs |
| **KR 2.5** | Schedule support | 100% | Daily/weekly/monthly |

### Features

#### 1. Multi-Iteration Crawling
```json
{
  "multi_iteration": {
    "enabled": true,
    "max_iterations": 5,              // Run 5 times
    "iteration_interval_hours": 24,   // Wait 24h between runs
    "stop_if_no_new_docs": true,      // Stop if nothing new
    "notify_on_completion": true      // Send notification
  }
}
```

**Use Cases:**
- Daily SEA paper checks
- Weekly curriculum updates
- Monthly comprehensive crawl

#### 2. Incremental Updates
```json
{
  "incremental": {
    "enabled": true,
    "mode": "new_only",               // Options: new_only, modified_only, all
    "check_last_modified": true,      // Check HTTP Last-Modified header
    "check_etag": true,               // Check HTTP ETag
    "check_content_hash": true,       // Hash-based change detection
    "baseline_crawl_id": "previous",  // Compare with previous run
    "save_baseline": true             // Save for next incremental
  }
}
```

**Benefits:**
- Faster crawls (skip unchanged content)
- Lower bandwidth usage
- Track what's new

#### 3. Resume/Continue Functionality
```json
{
  "resume": {
    "enabled": true,
    "save_checkpoints": true,         // Save state every N pages
    "checkpoint_interval": 100,       // Every 100 pages
    "resume_on_failure": true,        // Auto-resume on crash
    "max_resume_attempts": 3          // Give up after 3 tries
  }
}
```

**Scenarios:**
- Network interruption → auto-resume
- Rate limit hit → pause and resume later
- Manual pause → resume when ready

---

## Objective 3: Scheduling & Automation

**Owner:** Backend + DevOps Team
**Timeline:** Days 3-4

### Key Results

| KR | Metric | Target | Measurement |
|----|--------|--------|-------------|
| **KR 3.1** | Scheduler implemented | 100% | Cron-like scheduling |
| **KR 3.2** | Schedule types | 4+ | Once, daily, weekly, monthly, custom cron |
| **KR 3.3** | Schedule management UI | 100% | Create/edit/delete schedules |
| **KR 3.4** | Notification system | 3+ channels | Email, Slack, webhook |
| **KR 3.5** | Schedule reliability | >99% | Executes on time |

### Features

#### 1. Scheduled Crawls
```json
{
  "schedule": {
    "enabled": true,
    "type": "cron",                   // Options: once, daily, weekly, monthly, cron
    "cron_expression": "0 2 * * *",   // Run at 2 AM daily
    "timezone": "America/Port_of_Spain",
    "start_date": "2026-01-21",
    "end_date": null,                 // Run indefinitely
    "max_runs": null,                 // No limit
    "skip_if_running": true,          // Don't overlap
    "notify_on_start": false,
    "notify_on_complete": true,
    "notify_on_failure": true
  }
}
```

**Examples:**
- Daily SEA paper check at 2 AM
- Weekly curriculum update Friday 9 PM
- Monthly comprehensive crawl 1st of month
- One-time crawl on specific date

#### 2. Notifications
```json
{
  "notifications": {
    "email": {
      "enabled": true,
      "recipients": ["admin@example.com"],
      "on_complete": true,
      "on_failure": true,
      "on_quality_drop": true,
      "include_summary": true
    },
    "slack": {
      "enabled": false,
      "webhook_url": "https://hooks.slack.com/...",
      "channel": "#crawl-alerts"
    },
    "webhook": {
      "enabled": false,
      "url": "https://api.example.com/webhook",
      "headers": {"Authorization": "Bearer token"}
    }
  }
}
```

---

## Objective 4: Crawl Templates & Presets

**Owner:** Full-Stack Team
**Timeline:** Days 2-3

### Key Results

| KR | Metric | Target | Measurement |
|----|--------|--------|-------------|
| **KR 4.1** | Built-in templates | 10+ | Ready-to-use configs |
| **KR 4.2** | Custom template creation | 100% | Save custom configs |
| **KR 4.3** | Template sharing | 100% | Export/import templates |
| **KR 4.4** | Template categories | 5+ | Education, legal, research, etc. |
| **KR 4.5** | Template usage tracking | 100% | Most popular templates |

### Built-in Templates

#### 1. Caribbean Education
```json
{
  "name": "Caribbean SEA Materials",
  "description": "Find all SEA past papers and curriculum",
  "category": "education",
  "config": {
    "targets": ["moe.gov.tt", "sea.gov.tt"],
    "keywords": ["SEA", "past paper", "curriculum"],
    "file_types": ["pdf"],
    "quality": { "min_quality_score": 0.7 }
  }
}
```

#### 2. CXC CSEC Papers
```json
{
  "name": "CXC CSEC Past Papers",
  "description": "Download CXC CSEC examination papers",
  "category": "education",
  "config": {
    "targets": ["cxc.org"],
    "keywords": ["CSEC", "past paper", "examination"],
    "file_types": ["pdf"]
  }
}
```

#### 3. Legal Documents
```json
{
  "name": "TT Legal Statutes",
  "description": "Trinidad legal documents and court opinions",
  "category": "legal",
  "config": {
    "targets": ["ttlawcourts.org", "legalaffairs.gov.tt"],
    "keywords": ["statute", "legislation", "court opinion"],
    "file_types": ["pdf", "doc"]
  }
}
```

#### 4. Academic Papers
```json
{
  "name": "ArXiv Machine Learning",
  "description": "Recent ML research papers from arxiv",
  "category": "research",
  "config": {
    "targets": ["arxiv.org"],
    "keywords": ["machine learning", "neural network"],
    "crawler": "crawl4ai"
  }
}
```

---

## Objective 5: Advanced Control Features

**Owner:** Full-Stack Team
**Timeline:** Days 4-5

### Key Results

| KR | Metric | Target | Measurement |
|----|--------|--------|--------|-------------|
| **KR 5.1** | Budget controls | 100% | Max cost, pages, time |
| **KR 5.2** | Quality gates | 100% | Auto-pause on quality drop |
| **KR 5.3** | Rate limiting | 100% | Adaptive delays |
| **KR 5.4** | Priority queuing | 100% | High/medium/low priority |
| **KR 5.5** | Dependency crawls | 100% | Chain crawls together |

### Advanced Features

#### 1. Budget Controls
```json
{
  "budget": {
    "max_api_cost_usd": 10.0,         // Stop at $10 LLM cost
    "max_pages": 10000,
    "max_documents": 5000,
    "max_duration_hours": 6,
    "max_storage_gb": 10,
    "warn_at_percentage": 80,         // Warn at 80% budget
    "pause_at_percentage": 95,        // Auto-pause at 95%
    "hard_stop_at_percentage": 100
  }
}
```

#### 2. Quality Gates
```json
{
  "quality_gates": {
    "enabled": true,
    "check_interval": 100,            // Check every 100 docs
    "min_pass_rate": 70,              // 70% must pass quality
    "action_on_failure": "pause",     // Options: pause, stop, continue
    "notify_on_failure": true,
    "quality_trends": {
      "track_moving_average": true,
      "window_size": 50,
      "alert_on_drop_percentage": 20  // Alert if 20% drop
    }
  }
}
```

#### 3. Dependency Chains
```json
{
  "dependencies": {
    "enabled": true,
    "parent_crawl_id": "abc123",      // Wait for this to complete
    "on_parent_success": "start",     // Start when parent succeeds
    "on_parent_failure": "skip",      // Skip if parent fails
    "use_parent_results": true,       // Use parent's discovered URLs
    "merge_results": false            // Combine with parent results
  }
}
```

**Use Case:**
1. Crawl main page → discover document URLs
2. Chain: Download all discovered documents
3. Chain: Extract text from all PDFs
4. Chain: Generate embeddings for all text

---

## Dashboard Features (NEW)

### Tab 6: Settings ⭐ NEW

```
┌─────────────────────────────────────────────────────────────┐
│ [Overview] [Active] [History] [Comparison] [Logs] [Settings]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Crawl Settings                                              │
│                                                              │
│ ┌─────────────────────────┐                                │
│ │ Limits & Constraints    │ ← Active Section               │
│ │ Quality Gates           │                                │
│ │ Performance             │                                │
│ │ Processing              │                                │
│ │ Output                  │                                │
│ │ Notifications           │                                │
│ │ Advanced                │                                │
│ └─────────────────────────┘                                │
│                                                              │
│ Limits & Constraints                                         │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Max Pages to Crawl                                       ││
│ │ ────────●────────── 10,000                               ││
│ │                                                          ││
│ │ Max Documents to Download                                ││
│ │ ─────●──────────── 5,000                                 ││
│ │                                                          ││
│ │ Max Duration (hours)                                     ││
│ │ ───────●──────── 6                                       ││
│ │                                                          ││
│ │ Max File Size (MB)                                       ││
│ │ ─────────────●── 50                                      ││
│ │                                                          ││
│ │ Max Total Size (GB)                                      ││
│ │ ─────────●────── 10                                      ││
│ │                                                          ││
│ │ ☑ Enable Budget Controls                                ││
│ │ ☑ Pause at 95% of limits                                ││
│ │ ☐ Stop at 100% of limits                                ││
│ │                                                          ││
│ │                    [Reset to Defaults] [Save]            ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Tab 7: Templates ⭐ NEW

```
┌─────────────────────────────────────────────────────────────┐
│ Crawl Templates                                    [+ New]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Built-in Templates (10)                                     │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ 📚 Caribbean SEA Materials                               ││
│ │    Find all SEA past papers and curriculum guides        ││
│ │    Sources: moe.gov.tt, sea.gov.tt • Files: PDF          ││
│ │    [Use Template] [Preview] [Copy]                       ││
│ ├──────────────────────────────────────────────────────────┤│
│ │ 📝 CXC CSEC Past Papers                                  ││
│ │    Download all CSEC examination papers                  ││
│ │    Sources: cxc.org • Files: PDF • Date: 2020-2025       ││
│ │    [Use Template] [Preview] [Copy]                       ││
│ ├──────────────────────────────────────────────────────────┤│
│ │ ⚖️ Trinidad Legal Documents                              ││
│ │    Legal statutes and court opinions                     ││
│ │    Sources: ttlawcourts.org • Files: PDF, DOC            ││
│ │    [Use Template] [Preview] [Copy]                       ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ Custom Templates (3)                                        │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ My Weekly News Crawl                      Last used: 2d  ││
│ │    [Use] [Edit] [Delete]                                 ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Tab 8: Scheduler ⭐ NEW

```
┌─────────────────────────────────────────────────────────────┐
│ Scheduled Crawls                              [+ Schedule]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Active Schedules (2)                                        │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ 🔵 Daily SEA Materials Check                             ││
│ │    Schedule: Every day at 2:00 AM AST                    ││
│ │    Next run: Today at 2:00 AM (in 8 hours)              ││
│ │    Last run: ✅ Yesterday (47 documents found)           ││
│ │    Template: Caribbean SEA Materials                     ││
│ │    [Pause] [Edit] [Run Now] [View History]              ││
│ ├──────────────────────────────────────────────────────────┤│
│ │ 🔵 Weekly Curriculum Update                              ││
│ │    Schedule: Every Friday at 9:00 PM AST                 ││
│ │    Next run: Friday at 9:00 PM (in 3 days)              ││
│ │    Last run: ✅ Last Friday (123 documents)              ││
│ │    [Pause] [Edit] [Run Now] [View History]              ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ Schedule History                                            │
│ Shows: Run history, success rate, trends over time          │
└─────────────────────────────────────────────────────────────┘
```

---

## Complete Dashboard Structure (8 Tabs)

```
GenCrawl Dashboard (8 Tabs)
├── 1. Overview       - Live metrics, quick view
├── 2. Active Crawls  - Real-time monitoring
├── 3. History        - All past jobs
├── 4. Comparison     - Side-by-side analysis
├── 5. Logs           - Event viewer
├── 6. Analytics      - Charts and insights
├── 7. Settings       - Crawl configuration ⭐ NEW
└── 8. Templates      - Saved configurations ⭐ NEW
    └── Scheduler     - (Sub-section) Automated crawls ⭐ NEW
```

---

## API Endpoints (NEW - 20+ endpoints)

### Configuration Management
- `GET /api/v1/settings` - Get current settings
- `PUT /api/v1/settings` - Update settings
- `POST /api/v1/settings/reset` - Reset to defaults
- `GET /api/v1/settings/presets` - Get preset configurations

### Template Management
- `GET /api/v1/templates` - List all templates
- `GET /api/v1/templates/{id}` - Get template details
- `POST /api/v1/templates` - Create custom template
- `PUT /api/v1/templates/{id}` - Update template
- `DELETE /api/v1/templates/{id}` - Delete template
- `POST /api/v1/templates/{id}/use` - Use template for new crawl

### Scheduling
- `GET /api/v1/schedules` - List all schedules
- `POST /api/v1/schedules` - Create schedule
- `PUT /api/v1/schedules/{id}` - Update schedule
- `DELETE /api/v1/schedules/{id}` - Delete schedule
- `POST /api/v1/schedules/{id}/pause` - Pause schedule
- `POST /api/v1/schedules/{id}/resume` - Resume schedule
- `POST /api/v1/schedules/{id}/run-now` - Trigger immediate run

### Multi-Iteration
- `POST /api/v1/crawl/{id}/iterations` - Configure iterations
- `GET /api/v1/crawl/{id}/iterations` - List all iterations
- `GET /api/v1/crawl/{id}/iterations/compare` - Compare iterations

### Resume/Continue
- `POST /api/v1/crawl/{id}/checkpoint` - Save checkpoint
- `POST /api/v1/crawl/{id}/continue` - Resume from checkpoint
- `GET /api/v1/crawl/{id}/checkpoints` - List checkpoints

---

## Feature Matrix

| Feature | MVP | Next | Production |
|---------|-----|------|------------|
| Basic crawling | ✅ | ✅ | ✅ |
| State tracking | ✅ | ✅ | ✅ |
| Metrics | ✅ | ✅ | ✅ |
| Logging | ✅ | ✅ | ✅ |
| History view | ✅ | ✅ | ✅ |
| Configurable settings | ⏸️ | ✅ | ✅ |
| Templates | ⏸️ | ✅ | ✅ |
| Multi-iteration | ⏸️ | ✅ | ✅ |
| Incremental crawl | ⏸️ | ✅ | ✅ |
| Scheduling | ⏸️ | ⏸️ | ✅ |
| Notifications | ⏸️ | ⏸️ | ✅ |
| Quality gates | ⏸️ | ✅ | ✅ |
| Budget controls | ⏸️ | ✅ | ✅ |

---

## Success Criteria

- [ ] Can configure all crawl settings via UI
- [ ] Can save custom templates
- [ ] Can schedule automated crawls
- [ ] Can run multi-iteration crawls
- [ ] Can resume interrupted crawls
- [ ] Can set quality gates
- [ ] Can set budget limits
- [ ] Can receive notifications
- [ ] All settings persist
- [ ] Mobile responsive

---

## Implementation Priority

### Phase 1 (NOW): Essential Settings
1. Settings tab in dashboard
2. Configurable limits (max pages, docs, duration)
3. Quality thresholds
4. Save/load settings

### Phase 2 (This Week): Templates & Iterations
1. Template management (create, save, use)
2. Multi-iteration support
3. Incremental crawling
4. Resume functionality

### Phase 3 (Next Week): Automation
1. Scheduling system
2. Notifications (email, Slack, webhook)
3. Quality gates
4. Budget controls

---

**Status:** Ready for Autonomous Execution
**Estimated Time:** 3-4 hours
**Impact:** Transform GenCrawl into enterprise-grade system
