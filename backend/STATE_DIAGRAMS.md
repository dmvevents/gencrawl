# GenCrawl State Machine Diagrams

## Main State Flow

```mermaid
stateDiagram-v2
    [*] --> QUEUED
    QUEUED --> INITIALIZING: Start crawl
    QUEUED --> CANCELLED: Cancel

    INITIALIZING --> CRAWLING: Setup complete
    INITIALIZING --> FAILED: Setup error
    INITIALIZING --> CANCELLED: Cancel

    CRAWLING --> EXTRACTING: Pages crawled
    CRAWLING --> PAUSED: Pause requested
    CRAWLING --> FAILED: Crawl error
    CRAWLING --> CANCELLED: Cancel

    EXTRACTING --> PROCESSING: Extraction complete
    EXTRACTING --> PAUSED: Pause requested
    EXTRACTING --> FAILED: Extraction error
    EXTRACTING --> CANCELLED: Cancel

    PROCESSING --> COMPLETED: Processing complete
    PROCESSING --> PAUSED: Pause requested
    PROCESSING --> FAILED: Processing error
    PROCESSING --> CANCELLED: Cancel

    PAUSED --> CRAWLING: Resume from crawling
    PAUSED --> EXTRACTING: Resume from extracting
    PAUSED --> PROCESSING: Resume from processing
    PAUSED --> CANCELLED: Cancel

    COMPLETED --> [*]
    FAILED --> [*]
    CANCELLED --> [*]
```

## CRAWLING Substates

```mermaid
stateDiagram-v2
    [*] --> DISCOVERING_URLS
    DISCOVERING_URLS --> DOWNLOADING_PAGES: URLs queued
    DOWNLOADING_PAGES --> DOWNLOADING_DOCUMENTS: Pages crawled
    DOWNLOADING_DOCUMENTS --> [*]: Documents downloaded

    note right of DISCOVERING_URLS
        Finding and queuing
        URLs to crawl
    end note

    note right of DOWNLOADING_PAGES
        Fetching and parsing
        HTML pages
    end note

    note right of DOWNLOADING_DOCUMENTS
        Downloading PDFs,
        documents, etc.
    end note
```

## EXTRACTING Substates

```mermaid
stateDiagram-v2
    [*] --> PDF_EXTRACTION
    PDF_EXTRACTION --> OCR: Text extracted
    OCR --> TABLE_DETECTION: OCR complete
    TABLE_DETECTION --> [*]: Tables detected

    note right of PDF_EXTRACTION
        Extracting text
        from PDF documents
    end note

    note right of OCR
        Running OCR on images
        and scanned documents
    end note

    note right of TABLE_DETECTION
        Detecting and
        extracting tables
    end note
```

## PROCESSING Substates

```mermaid
stateDiagram-v2
    [*] --> METADATA_EXTRACTION
    METADATA_EXTRACTION --> QUALITY_SCORING: Metadata extracted
    QUALITY_SCORING --> DEDUPLICATION: Quality scored
    DEDUPLICATION --> NEMO_CURATION: Duplicates removed
    NEMO_CURATION --> [*]: Curation complete

    note right of METADATA_EXTRACTION
        Extracting metadata
        from documents
    end note

    note right of QUALITY_SCORING
        Scoring document
        quality
    end note

    note right of DEDUPLICATION
        Removing duplicate
        content
    end note

    note right of NEMO_CURATION
        Running NeMo Curator
        pipeline
    end note
```

## Event Flow

```mermaid
sequenceDiagram
    participant Client
    participant Manager
    participant StateMachine
    participant EventBus
    participant Metrics
    participant WebSocket

    Client->>Manager: create_crawl(config)
    Manager->>StateMachine: Initialize state
    Manager->>EventBus: Emit CRAWL_START
    Manager-->>Client: crawl_id

    Client->>Manager: execute_crawl(crawl_id)
    Manager->>StateMachine: Transition to INITIALIZING
    StateMachine->>EventBus: Emit STATE_CHANGE
    EventBus->>WebSocket: Broadcast event

    loop Crawling
        Manager->>Metrics: Record metrics
        Manager->>EventBus: Emit PROGRESS_UPDATE
        EventBus->>WebSocket: Broadcast progress
        Manager->>EventBus: Emit PAGE_CRAWLED
    end

    Manager->>StateMachine: Transition to COMPLETED
    StateMachine->>EventBus: Emit STATE_CHANGE
    EventBus->>WebSocket: Broadcast completion
    Manager-->>Client: Results
```

## Pause/Resume Flow

```mermaid
sequenceDiagram
    participant Client
    participant Manager
    participant StateMachine
    participant EventBus

    Note over Manager: Currently CRAWLING

    Client->>Manager: pause_crawl(crawl_id)
    Manager->>StateMachine: Check can_pause()
    StateMachine-->>Manager: true
    Manager->>StateMachine: Transition to PAUSED
    Manager->>EventBus: Emit CRAWL_PAUSED
    Manager-->>Client: Success

    Note over Manager: Paused for 60 seconds

    Client->>Manager: resume_crawl(crawl_id)
    Manager->>StateMachine: Check can_resume()
    StateMachine-->>Manager: true
    Manager->>StateMachine: Transition back to CRAWLING
    Manager->>EventBus: Emit CRAWL_RESUMED
    Manager-->>Client: Success

    Note over Manager: Continues CRAWLING
```

## Metrics Collection Architecture

```mermaid
graph TB
    subgraph "Crawler Manager"
        A[Execute Crawl] --> B[Record Page]
        B --> C[Update Metrics]
        C --> D[Calculate Throughput]
        D --> E[Record System Metrics]
        E --> F[Emit Metrics Event]
    end

    subgraph "Metrics Collector"
        C --> G[Time Series Storage]
        G --> H[Latest Value]
        G --> I[5min Average]
        G --> J[1hour Average]
        G --> K[Percentiles]
    end

    subgraph "Metrics Aggregator"
        F --> L[Multiple Collectors]
        L --> M[System Summary]
        M --> N[Total Memory]
        M --> O[Avg CPU]
    end

    subgraph "API Endpoints"
        H --> P[GET /metrics]
        I --> P
        J --> P
        K --> Q[GET /metrics/time-series]
        M --> R[GET /system/metrics]
    end
```

## Component Interaction

```mermaid
graph LR
    subgraph "Core Components"
        A[CrawlerManager]
        B[StateMachine]
        C[MetricsCollector]
        D[EventBus]
        E[Logger]
    end

    subgraph "External Interfaces"
        F[REST API]
        G[WebSocket]
        H[Database]
        I[Log Files]
    end

    A -->|state transitions| B
    A -->|record metrics| C
    A -->|emit events| D
    A -->|write logs| E

    B -->|emit state change| D
    C -->|emit metrics update| D

    F -->|query| A
    F -->|query| C
    G -->|subscribe| D
    E -->|write| I
    A -.->|persist| H
```

## Data Flow

```mermaid
flowchart TD
    Start([Start Crawl]) --> Init[Initialize State]
    Init --> Queue[Queue URLs]

    Queue --> Crawl{Crawl Pages}
    Crawl -->|Success| Metrics1[Update Metrics]
    Crawl -->|Failure| Error[Log Error]

    Metrics1 --> Progress1[Emit Progress]
    Progress1 --> Extract{Extract Content}

    Extract -->|PDF| PDF[PDF Extraction]
    Extract -->|Image| OCR[OCR Processing]
    Extract -->|Table| Table[Table Detection]

    PDF --> Metrics2[Update Metrics]
    OCR --> Metrics2
    Table --> Metrics2

    Metrics2 --> Process{Process Data}
    Process --> Meta[Metadata Extraction]
    Meta --> Quality[Quality Scoring]
    Quality --> Dedup[Deduplication]
    Dedup --> Curator[NeMo Curator]

    Curator --> Metrics3[Final Metrics]
    Metrics3 --> Complete([Complete])

    Error --> Metrics1
```

## Monitoring Dashboard Data Flow

```mermaid
flowchart LR
    subgraph "Backend"
        A[Crawler Manager] -->|state updates| B[EventBus]
        A -->|metrics| C[MetricsCollector]
        B -->|events| D[WebSocket Server]
    end

    subgraph "Frontend"
        D -->|real-time events| E[WebSocket Client]
        E --> F[State Display]
        E --> G[Progress Bars]

        H[HTTP Client] -->|polling| I[REST API]
        I --> J[Metrics Display]
        I --> K[Charts/Graphs]
    end

    C -->|snapshot| I
```

## Legend

### State Types
- **Active States**: Can transition to other states
- **Paused State**: Can resume to previous active state
- **Terminal States**: End of lifecycle (COMPLETED, FAILED, CANCELLED)

### Transition Types
- **Solid Arrow**: Normal transition
- **Dashed Arrow**: Optional/conditional transition

### Components
- **Manager**: Orchestrates crawl execution
- **StateMachine**: Validates and tracks state transitions
- **MetricsCollector**: Collects and stores metrics
- **EventBus**: Publishes events to subscribers
- **Logger**: Writes structured logs

---

Generated: January 20, 2026
Version: 1.0.0
