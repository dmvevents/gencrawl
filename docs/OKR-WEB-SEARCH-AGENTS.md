# OKR: Web Search Agent + Crawl Expansion

## Objective 1: Web search agent drives crawl discovery
**Owner:** Backend agent

**Key Results**
1. `/api/v1/web-search` returns 5+ results for a test query within 5 seconds.
2. Search-based crawl plans auto-seed targets when none are provided.
3. Search provider is configurable via env and defaults to SearXNG.
4. Search response metadata is persisted in crawl config for traceability.

**Acceptance Criteria**
- `curl http://localhost:8000/api/v1/web-search?query=SEA%20CXC` returns non-empty results.
- `POST /api/v1/crawl/plan` with no targets returns a config containing `targets` and `web_search` metadata.

## Objective 2: Environment configuration is persistent and propagates
**Owner:** Backend agent

**Key Results**
1. API loads env from `config/runtime.env` and repo `.env` without code changes per deployment.
2. Docker compose mounts `./config` into the API container for runtime env overrides.
3. Sensitive values are excluded from git and only stored in local runtime env.

**Acceptance Criteria**
- `config/runtime.env` values override `.env` for API runs.
- Secrets are not present in git history or repository.

## Objective 3: Caribbean education corpus expanded and stored locally
**Owner:** Backend agent

**Key Results**
1. Domain harvest includes MOE (TT), MOEY (JM), MOECST (BZ), CXC.
2. Local manifests exist for each harvest method (wp_media, link_harvest, crawl_runs).
3. Total stored documents exceed 1,000 across sources.

**Acceptance Criteria**
- `data/crawl_runs/wp_media/manifest.json` and `data/crawl_runs/link_harvest/*_manifest.json` exist.
- At least 1,000 documents stored in `data/crawl_runs` from harvesters.

## Objective 4: End-to-end crawl pipeline is executable
**Owner:** Backend + Frontend agents

**Key Results**
1. Submit crawl from API and verify completed state.
2. Documents are downloadable locally with manifest.
3. Ingestion can run on a subset and produce structured output.

**Acceptance Criteria**
- `POST /api/v1/crawl` returns a crawl ID, and status reaches `completed`.
- A local `manifest.json` lists downloaded document paths.
- Ingestion outputs structured JSON for at least one document.
