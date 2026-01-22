# GenCrawl Multi-Iteration Architecture Diagrams

## System Overview

```mermaid
graph TB
    subgraph "API Layer"
        API[FastAPI Main App]
        IR[Iterations Router]
        CR[Crawls Router]
        MR[Monitoring Router]
    end

    subgraph "Core Managers"
        CM[Crawler Manager]
        IM[Iteration Manager]
        CKM[Checkpoint Manager]
    end

    subgraph "State & Events"
        SM[State Machine]
        EB[Event Bus]
        LG[Logger]
        MT[Metrics Collector]
    end

    subgraph "Storage"
        ITER_DB[(Iterations Data)]
        CKPT_DB[(Checkpoints Data)]
        LOGS_DB[(Event Logs)]
    end

    API --> IR
    API --> CR
    API --> MR

    IR --> IM
    IR --> CKM
    CR --> CM

    CM --> SM
    CM --> IM
    CM --> CKM
    CM --> EB
    CM --> LG
    CM --> MT

    IM --> ITER_DB
    CKM --> CKPT_DB
    EB --> LOGS_DB
```

## Multi-Iteration Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant CrawlerMgr
    participant IterMgr
    participant Storage

    User->>API: POST /crawl/{id}/iterations
    API->>IterMgr: create_iteration(crawl_id, config)
    IterMgr->>IterMgr: Check existing iterations
    IterMgr->>Storage: Create iteration_0 (BASELINE)
    IterMgr-->>API: iteration_id

    User->>API: POST /iterations/next
    API->>IterMgr: create_iteration(mode=INCREMENTAL)
    IterMgr->>Storage: Link to parent (iteration_0)
    IterMgr->>Storage: Load parent fingerprints
    IterMgr-->>API: iteration_1_id

    User->>API: Start crawl
    API->>CrawlerMgr: execute_crawl(iteration_1_id)

    loop For each URL
        CrawlerMgr->>IterMgr: should_crawl_url(url, etag, last_mod)
        IterMgr->>IterMgr: Check fingerprints
        alt Document unchanged
            IterMgr-->>CrawlerMgr: skip (UNCHANGED)
        else Document new/modified
            IterMgr-->>CrawlerMgr: crawl (NEW/MODIFIED)
            CrawlerMgr->>CrawlerMgr: Download document
            CrawlerMgr->>IterMgr: record_document(url, content, metadata)
            IterMgr->>Storage: Save fingerprint
        end
    end

    CrawlerMgr->>IterMgr: complete_iteration(stats)
    IterMgr->>Storage: Save iteration metadata

    User->>API: GET /iterations/compare
    API->>IterMgr: compare_iterations(0, 1)
    IterMgr->>Storage: Load both fingerprints
    IterMgr->>IterMgr: Calculate diff
    IterMgr-->>API: ComparisonResult
```

## Checkpoint/Resume Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant CrawlerMgr
    participant CkptMgr
    participant Storage

    Note over CrawlerMgr: Crawl running...

    User->>API: POST /crawl/{id}/pause
    API->>CrawlerMgr: pause_crawl(crawl_id)
    CrawlerMgr->>CkptMgr: create_checkpoint(PAUSE)
    CkptMgr->>CkptMgr: Extract state data
    CkptMgr->>Storage: Save checkpoint (compressed)
    CkptMgr-->>CrawlerMgr: checkpoint_id
    CrawlerMgr->>CrawlerMgr: Set pause flag
    CrawlerMgr-->>API: paused

    Note over Storage: Checkpoint saved with:<br/>- Crawled URLs<br/>- Queued URLs<br/>- State/Substate<br/>- Progress<br/>- Metrics

    User->>API: POST /crawl/{id}/continue
    API->>CkptMgr: resume_from_checkpoint(latest)
    CkptMgr->>Storage: Load checkpoint
    CkptMgr->>CkptMgr: Validate state
    CkptMgr-->>API: CheckpointData

    API->>CrawlerMgr: resume_from_checkpoint(data)
    CrawlerMgr->>CrawlerMgr: Restore state
    CrawlerMgr->>CrawlerMgr: Resume from queued_urls
    CrawlerMgr-->>API: resumed

    Note over CrawlerMgr: Crawl continues...
```

## State Machine with Checkpointing

```mermaid
stateDiagram-v2
    [*] --> QUEUED
    QUEUED --> INITIALIZING: start
    INITIALIZING --> CRAWLING: initialized

    state CRAWLING {
        [*] --> discovering_urls
        discovering_urls --> downloading_pages
        downloading_pages --> downloading_docs
        downloading_docs --> [*]
    }

    CRAWLING --> PAUSED: pause (auto-checkpoint)
    PAUSED --> CRAWLING: resume

    CRAWLING --> EXTRACTING: crawl complete

    state EXTRACTING {
        [*] --> pdf_extraction
        pdf_extraction --> ocr
        ocr --> table_detection
        table_detection --> [*]
    }

    EXTRACTING --> PAUSED: pause (auto-checkpoint)
    PAUSED --> EXTRACTING: resume

    EXTRACTING --> PROCESSING: extraction complete

    state PROCESSING {
        [*] --> metadata_extraction
        metadata_extraction --> quality_scoring
        quality_scoring --> deduplication
        deduplication --> nemo_curation
        nemo_curation --> [*]
    }

    PROCESSING --> PAUSED: pause (auto-checkpoint)
    PAUSED --> PROCESSING: resume

    PROCESSING --> COMPLETED: success
    CRAWLING --> FAILED: error (auto-checkpoint)
    EXTRACTING --> FAILED: error (auto-checkpoint)
    PROCESSING --> FAILED: error (auto-checkpoint)

    QUEUED --> CANCELLED: cancel
    INITIALIZING --> CANCELLED: cancel
    CRAWLING --> CANCELLED: cancel
    PAUSED --> CANCELLED: cancel

    COMPLETED --> [*]
    FAILED --> [*]
    CANCELLED --> [*]

    note right of PAUSED: Auto-checkpoint created<br/>on pause
    note right of FAILED: Error checkpoint created<br/>for recovery
```

## Iteration Hierarchy

```mermaid
graph TD
    subgraph "Crawl: abc123"
        IT0[Iteration 0<br/>BASELINE<br/>100 docs]
        IT1[Iteration 1<br/>INCREMENTAL<br/>+15 new, 3 mod]
        IT2[Iteration 2<br/>INCREMENTAL<br/>+5 new, 1 mod]
        IT3[Iteration 3<br/>FULL<br/>120 docs total]

        IT0 ---|parent| IT1
        IT1 ---|parent| IT2
        IT2 ---|parent| IT3

        IT1 -.-|baseline| IT0
        IT2 -.-|baseline| IT0
        IT3 -.-|baseline| IT0
    end

    subgraph "Fingerprints"
        FP0[(Fingerprints 0<br/>100 docs)]
        FP1[(Fingerprints 1<br/>118 docs)]
        FP2[(Fingerprints 2<br/>123 docs)]
        FP3[(Fingerprints 3<br/>120 docs)]
    end

    IT0 --> FP0
    IT1 --> FP1
    IT2 --> FP2
    IT3 --> FP3

    style IT0 fill:#e1f5ff
    style IT1 fill:#fff9e1
    style IT2 fill:#fff9e1
    style IT3 fill:#e1ffe1
```

## Change Detection Process

```mermaid
flowchart TD
    START([URL to crawl])
    CHECK_MODE{Iteration<br/>mode?}
    BASELINE[BASELINE mode]
    INCREMENTAL[INCREMENTAL mode]

    CHECK_PARENT{Has parent<br/>iteration?}
    CRAWL_NEW[Crawl - NEW]
    LOAD_FP[Load parent fingerprints]
    CHECK_FP{URL in<br/>fingerprints?}

    CHECK_ETAG{Has ETag?}
    COMPARE_ETAG{ETag<br/>matches?}
    SKIP_UNCHANGED[Skip - UNCHANGED]

    CHECK_LASTMOD{Has Last-Mod?}
    COMPARE_LASTMOD{Last-Mod<br/>matches?}

    DOWNLOAD[Download document]
    HASH[Calculate SHA-256]
    COMPARE_HASH{Hash<br/>matches?}
    CRAWL_MOD[Crawl - MODIFIED]

    RECORD[Record fingerprint]
    END([Done])

    START --> CHECK_MODE
    CHECK_MODE -->|baseline| BASELINE
    CHECK_MODE -->|incremental| INCREMENTAL

    BASELINE --> CRAWL_NEW
    CRAWL_NEW --> RECORD

    INCREMENTAL --> CHECK_PARENT
    CHECK_PARENT -->|no parent| CRAWL_NEW
    CHECK_PARENT -->|has parent| LOAD_FP

    LOAD_FP --> CHECK_FP
    CHECK_FP -->|not found| CRAWL_NEW
    CHECK_FP -->|found| CHECK_ETAG

    CHECK_ETAG -->|yes| COMPARE_ETAG
    CHECK_ETAG -->|no| CHECK_LASTMOD

    COMPARE_ETAG -->|match| SKIP_UNCHANGED
    COMPARE_ETAG -->|diff| CRAWL_MOD

    CHECK_LASTMOD -->|yes| COMPARE_LASTMOD
    CHECK_LASTMOD -->|no| DOWNLOAD

    COMPARE_LASTMOD -->|match| SKIP_UNCHANGED
    COMPARE_LASTMOD -->|diff| CRAWL_MOD

    DOWNLOAD --> HASH
    HASH --> COMPARE_HASH
    COMPARE_HASH -->|match| SKIP_UNCHANGED
    COMPARE_HASH -->|diff| CRAWL_MOD

    CRAWL_MOD --> RECORD
    RECORD --> END
    SKIP_UNCHANGED --> END
```

## Data Flow

```mermaid
graph LR
    subgraph "Input"
        CFG[Crawl Config]
        URL[Target URLs]
    end

    subgraph "Iteration 0 (Baseline)"
        I0_CRAWL[Crawl All]
        I0_FP[Generate Fingerprints]
        I0_STORE[Store Docs + FP]
    end

    subgraph "Iteration 1 (Incremental)"
        I1_LOAD[Load Baseline FP]
        I1_CHECK[Check Changes]
        I1_CRAWL[Crawl New/Mod Only]
        I1_FP[Update Fingerprints]
        I1_COMPARE[Compare with Baseline]
    end

    subgraph "Output"
        DOCS[Documents]
        STATS[Statistics]
        DIFF[Change Report]
    end

    CFG --> I0_CRAWL
    URL --> I0_CRAWL
    I0_CRAWL --> I0_FP
    I0_FP --> I0_STORE

    I0_STORE --> I1_LOAD
    I1_LOAD --> I1_CHECK
    URL --> I1_CHECK
    I1_CHECK -->|new/mod| I1_CRAWL
    I1_CHECK -->|unchanged| I1_FP
    I1_CRAWL --> I1_FP
    I1_FP --> I1_COMPARE

    I0_STORE --> DOCS
    I1_CRAWL --> DOCS
    I1_FP --> STATS
    I1_COMPARE --> DIFF
```

## Component Interaction

```mermaid
graph TB
    subgraph "User Interface"
        UI[Web Dashboard]
        CLI[CLI Tool]
    end

    subgraph "API Layer"
        REST[REST API]
        IR[Iterations Router]
        CR[Crawls Router]
    end

    subgraph "Business Logic"
        CM[Crawler Manager]
        IM[Iteration Manager]
        CKM[Checkpoint Manager]
    end

    subgraph "Core Services"
        SM[State Machine]
        EB[Event Bus]
        MT[Metrics]
        LG[Logger]
    end

    subgraph "Crawlers"
        SC[Scrapy Crawler]
        C4[Crawl4AI]
        PC[Playwright]
    end

    subgraph "Processing"
        PDF[PDF Extractor]
        OCR[OCR Engine]
        TBL[Table Detector]
        QS[Quality Scorer]
    end

    subgraph "Storage"
        FS[(File System)]
        DB[(Database)]
        CACHE[(Redis Cache)]
    end

    UI --> REST
    CLI --> REST
    REST --> IR
    REST --> CR

    IR --> IM
    IR --> CKM
    CR --> CM

    CM --> SM
    CM --> EB
    CM --> MT
    CM --> LG
    CM --> IM
    CM --> CKM

    CM --> SC
    CM --> C4
    CM --> PC

    SM --> EB
    EB --> MT
    EB --> LG

    SC --> PDF
    C4 --> PDF
    PC --> PDF

    PDF --> OCR
    PDF --> TBL
    OCR --> QS
    TBL --> QS

    IM --> FS
    CKM --> FS
    LG --> FS
    MT --> DB
    SM --> DB
    SC --> CACHE
```

---

## File Structure

```
gencrawl/backend/
├── api/
│   ├── main.py                      # FastAPI app
│   └── routers/
│       ├── iterations.py            # ⭐ NEW - Iteration endpoints
│       ├── crawls.py                # Crawl management
│       └── monitoring.py            # Metrics/status
│
├── crawlers/
│   └── manager.py                   # ⭐ UPDATED - Checkpoint integration
│
├── utils/
│   ├── iteration_manager.py         # ⭐ NEW - Iteration logic
│   ├── checkpoint.py                # ⭐ NEW - Checkpoint logic
│   ├── metrics.py                   # Metrics collection
│   └── logger.py                    # Event logging
│
├── models/
│   └── crawl_state.py               # State machine models
│
└── data/
    ├── iterations/                  # ⭐ NEW - Iteration data
    │   ├── {crawl_id}_iter_{n}/
    │   │   ├── fingerprints.json
    │   │   └── documents/
    │   └── {crawl_id}_iter_{n}_metadata.json
    │
    └── checkpoints/                 # ⭐ NEW - Checkpoint data
        └── {crawl_id}/
            ├── {crawl_id}_ckpt_{n}.json.gz
            └── {crawl_id}_ckpt_{n}_meta.json
```

---

**Date:** January 20, 2026
**Version:** 1.0.0
**Status:** Production Ready
