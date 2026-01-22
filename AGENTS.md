# Repository Guidelines

## Project Structure & Module Organization
- `backend/` houses the FastAPI service, crawler orchestration, and models. API routes live in `backend/api/routers`, crawler implementations in `backend/crawlers`, and shared utilities in `backend/utils`.
- `frontend/` is the Next.js dashboard. Route files are in `frontend/app`, and reusable UI pieces live in `frontend/components`.
- `data/` stores runtime state and crawl outputs (e.g., `data/raw/`, `data/settings.json`). `logs/` captures crawl event logs.
- `docs/` and `analysis/` contain architecture notes, UX/monitoring reports, and research artifacts.

## Build, Test, and Development Commands
- `docker-compose up -d`: start the full stack (API, dashboard, and dependencies).
- `cd backend && uvicorn api.main:app --reload --port 8000`: run the API locally with hot reload.
- `cd frontend && pnpm dev`: run the dashboard at `http://localhost:3000`.
- `cd frontend && pnpm build`: production build for the dashboard.
- `cd frontend && pnpm lint`: run Next.js/ESLint checks.
- `./test_deployment.sh`: smoke-test API health, crawl submission, and dashboard access.

## Coding Style & Naming Conventions
- Python uses 4-space indentation and `snake_case` modules/functions; keep routers organized by resource in `backend/api/routers`.
- TypeScript/React uses 2-space indentation; components are `PascalCase` (e.g., `JobOverview.tsx`), hooks are `useX` (e.g., `useWebSocket`).
- Prefer Tailwind utility classes in JSX and keep layout concerns in `frontend/app` with reusable logic in `frontend/components`.

## Testing Guidelines
- Backend tests use `pytest` and live in `backend/tests` with `test_*.py` naming.
- Frontend automated tests are not set up; rely on `pnpm lint` and manual dashboard checks.
- Use `./test_deployment.sh` for quick end-to-end verification.

## Commit & Pull Request Guidelines
- No Git history exists yet, so no established commit convention. Use short, imperative summaries (e.g., `Add crawl schedule endpoints`).
- PRs should include: a clear description, test commands run, and screenshots/GIFs for UI changes. Link related issues when applicable.

## Security & Configuration Tips
- Keep API keys in `.env` (e.g., `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) and never commit secrets.
- Preset templates live in `backend/config/*.json`; update these alongside any changes to crawl defaults.
