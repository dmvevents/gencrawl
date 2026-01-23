# Agent Skills OKRs (GenCrawl)

## Objective 1: Expand crawl coverage with safe, repeatable discovery
**Owner skill:** gencrawl-crawl-ops
- KR1: Add/confirm 12+ official education domains in allowlist and harvest sitemaps/media for each.
- KR2: Run search-seeded crawls that return 500+ unique document URLs with <5% hard failures.
- KR3: Produce manifests with reproducible seeds and timestamps for every crawl run.
**Acceptance:** `data/crawl_runs/<id>/manifest.json` exists and includes URL count + paths.

## Objective 2: High-quality ingestion outputs with reliable OCR
**Owner skill:** gencrawl-ingestion-quality
- KR1: 90%+ of ingested PDFs include extracted text or markdown content.
- KR2: Dedupe captures duplicate URLs across runs and surfaces canonical mappings.
- KR3: OCR pipeline logs method + error metadata per file for evaluation.
**Acceptance:** `data/ingestion/<id>/documents.jsonl` contains `content` or `content_markdown`, plus extraction metadata.

## Objective 3: Consistent, actionable UI for monitoring + review
**Owner skill:** gencrawl-ui-ux
- KR1: Ingestion page shows async status, filters, pagination, and structured output preview.
- KR2: Dashboard cards align to consistent spacing + typography across modules.
- KR3: Archive view supports search + duplicate grouping.
**Acceptance:** UI supports browsing by filters and reveals structured outputs with markdown preview.

## Objective 4: Rate-limit resilience and WAF awareness
**Owner skill:** gencrawl-ingestion-quality
- KR1: Adaptive domain throttler honors `Retry-After` and cooldowns for 429/403.
- KR2: Blocked domains are skipped with explicit error metadata, reducing wasted retries.
- KR3: Per-domain pacing reduces repeated 429 responses during ingestion.
**Acceptance:** Ingestion logs show `domain_blocked` or `cloudflare_challenge` without repeated rapid retries.

