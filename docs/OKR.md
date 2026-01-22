# GenCrawl OKR — End-to-End Completion

## Objective 1: Deliver a complete prompt-to-dataset workflow
Provide a fully integrated workflow that converts a natural language prompt into a structured, ingestion-ready dataset.

Key Results:
- Prompt → plan → crawl → ingest → export completed in a single UI flow (Command Center + Ingestion).
- Ingestion output includes taxonomy hints, structured paths, and manifest visibility.
- Export options available for both JSONL and JSON from the dashboard.
- Caribbean education use-case has built-in templates (SEA, CSEC, CAPE).

## Objective 2: Ship a cohesive, production-grade UI/UX
Unify visual language across all dashboard surfaces with consistent spacing, typography, and components.

Key Results:
- All primary dashboard surfaces use the GC design system (panels, buttons, pills, muted surfaces).
- Logs, analytics, history, state flow, and ingestion tables match the same visual grammar.
- Navigation surfaces include ingestion as a first-class operation.

## Objective 3: Validate reliability and observability end-to-end
Ensure that system health, status tracking, and ingestion outputs can be verified in a single pass.

Key Results:
- Health checks, crawl stats, and logs visible live in the dashboard.
- Ingestion status and counts update without manual file inspection.
- Smoke test script validates API, crawl submission, and dashboard availability.

## Objective 4: Close the loop with a documented test run
Prove the full pipeline works on a real crawl and document the output flow.

Key Results:
- Run `docker-compose up -d`, then execute `./test_deployment.sh`.
- Submit a crawl, verify status transitions, ingest results, and download JSONL output.
- Capture the crawl ID and ingestion manifest location in a short run log.
