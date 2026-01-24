# Engineering Guidelines

These guidelines define the engineering standards for the GenCrawl platform (frontend + backend + ingestion).

## 1) Repo Structure
- `backend/`: FastAPI, crawlers, ingestion, services, models.
- `frontend/`: Next.js UI and dashboard.
- `data/`: runtime data, crawl outputs, ingestion outputs (ignored in git).
- `docs/`: design notes, OKRs, stability notes.

## 2) API Design
- Follow REST conventions under `/api/v1`.
- Return consistent JSON: include `status`, `message`, or typed payloads.
- Use HTTP error codes with structured `detail`.
- Prefer async tasks for long-running work (ingest, crawl).

## 3) Ingestion & OCR
- All ingestion runs must produce:
  - `documents.jsonl`
  - `manifest.json`
  - `structured/` output
- Every document must include `metadata.extraction` fields:
  - `attempted`, `method`, `text_length`, `error`, `content_length`
- Use OCR model selection via env/config; no hardcoded provider.

## 4) Crawler Politeness
- Respect `robots.txt` by default.
- Use per-domain throttling and `Retry-After`.
- Prefer sitemap-first discovery and limit page scans in polite mode.
- Avoid any bypass techniques.

## 5) UI/UX Standards
- Use `gc-panel`, `gc-panel-muted`, `gc-button` classes for consistency.
- Keep card padding and table row heights uniform across pages.
- Always include loading/empty states.
- New pages must support desktop + mobile layouts.

## 6) Coding Style
- Python: 4 spaces, `snake_case`, explicit typing where possible.
- TS/React: 2 spaces, components in `PascalCase`.
- Keep side effects in `useEffect`, avoid inline data fetches in render.

## 7) Security & Secrets
- Secrets live in `config/runtime.env` or system env.
- Never commit tokens or OAuth credentials.
- Store only references in settings (no raw secrets).

## 8) Testing Expectations
- Smoke test every new endpoint with curl or minimal client.
- For ingestion changes: run a small async ingest and verify metadata fields.
- For UI changes: verify in `http://localhost:3000/dashboard/...`.

## 9) Documentation
- Update `docs/STABILITY-NOTES.md` for behavior changes.
- Add an OKR or run report when scope changes materially.
- Keep docs short, operational, and actionable.
