# End-to-End OKRs (GenCrawl)

## Objective 1 — Unified Document Ingestion Gateway
Deliver a single intake surface that connects sources, configures OCR, and starts ingestion runs.
- KR1: Gateway UI live with integrations, OCR profile selection, and output controls.
- KR2: Backend endpoints for integration list/connect/disconnect/test (CRUD) deployed.
- KR3: Persist integration status and config references (no secrets committed).
- KR4: Gateway “Recent Runs” table backed by real run status.

## Objective 2 — Reliable Multi-Source Intake
Support core connectors and ensure stable, compliant ingestion.
- KR1: Enable 6 connectors (Email, Drive, S3, Azure, GCS, Local Watch).
- KR2: Provide API intake endpoint for direct uploads + metadata hints.
- KR3: Enforce rate limits, robots compliance, and per-domain throttling.
- KR4: ≥90% successful intake for supported file types in a 200-doc run.

## Objective 3 — Intelligent Document Processing (IDP)
Convert documents to structured, reusable outputs with measurable quality.
- KR1: OCR model selection applied to ingestion runs.
- KR2: Extract JSONL + Markdown + tables for ≥80% of PDFs.
- KR3: Log extraction method + error code for 100% of documents.
- KR4: Taxonomy + dedupe mapping present for 100% of ingested docs.

## Objective 4 — Curated Outputs for Downstream Use
Enable curation and export to training-ready formats.
- KR1: Generate curator-ready JSONL for every run.
- KR2: Provide curation filters (quality, language, length) with counts.
- KR3: Archive index keyed by content hash + canonical URL.
- KR4: Export curated datasets with manifest and run metadata.

## Objective 5 — Stability + Repeatability
Make the system predictable, stable, and demo-ready.
- KR1: Async ingestion status surfaced in UI (queued → running → completed).
- KR2: Conditional GET cache reduces re-download volume by ≥50% on re-runs.
- KR3: Polite mode presets available and used for official sources.
- KR4: End-to-end run report published with logs + artifacts.
