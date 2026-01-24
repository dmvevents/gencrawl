# Ingestion Gateway (UI + Roadmap)

The Ingestion Gateway is a dedicated workspace for document intake, OCR selection, and structured outputs. It is designed as a front door for IDP (intelligent document processing) workflows and feeds the existing ingestion pipeline.

## Current UI scope
- Integration console with service cards (email, drives, object storage, API intake).
- OCR + parsing profile selection (model and module toggles).
- Structured output preferences (JSONL, markdown, tables, entities).
- Supported file formats and recent run summary.
- Dedicated gateway app on port `4100` (decoupled from the main dashboard).
- Recent runs table is backed by `/api/v1/ingest/runs`.

## Planned integrations
- Email connectors: Outlook 365, Gmail (attachment + mailbox filters).
- Storage connectors: Google Drive, SharePoint, S3/Object Storage, Dropbox.
- API intake: authenticated upload endpoint with metadata + taxonomy hints.

## Data flow
1) Intake source → 2) OCR + parsing profile → 3) Structured JSONL/Markdown → 4) Curator pipeline.

## Integration config
- Store non-secret settings in the integration config.
- Provide credential references via `secret_ref` (e.g., vault://...).
- Secrets are never stored in the repository.

## Remaining work
- Create credential management in Settings (store refs, not secrets).
- Add connector jobs for Drive/S3/Email to feed the ingestion queue.
- Launch the gateway app with `pnpm dev` inside `gateway/`.
