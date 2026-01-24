# Stability Notes

This release focuses on crawl politeness and ingestion resilience for academic/official sources.

## What changed
- **Adaptive throttling + WAF awareness**: Ingestion downloads now honor `Retry-After`, back off per domain, and pause domains after repeated 429/403/WAF signals.
- **DNS preflight**: Invalid domains are skipped immediately with `dns_unresolved` instead of timing out.
- **Conditional GET cache**: ETag/Last-Modified are persisted and reused to avoid re-downloading unchanged files (default scope: global).
- **Sitemap-first discovery**: Discovery skips page scans when sitemaps already satisfy the document target and can run in sitemap-only mode.
- **Per-domain budgets**: Optional cap on documents per host to prevent overloading a single domain.
- **New preset**: `Polite Research` preset with conservative concurrency and delay.
- **Ingestion Gateway UI**: New workspace page for integrations, OCR profile selection, and structured output preferences.

## Key environment controls
```
# Ingestion
INGESTION_DNS_PREFLIGHT=true
INGESTION_DNS_CACHE_TTL=600
INGESTION_HTTP_CACHE=true
INGESTION_HTTP_CACHE_SCOPE=global
INGESTION_DOWNLOAD_RETRIES=3
INGESTION_DOMAIN_MIN_INTERVAL=1.0
INGESTION_DOMAIN_MAX_FAILURES=3
INGESTION_DOMAIN_BLOCK_COOLDOWN=600

# Discovery
DISCOVERY_USER_AGENT=GenCrawl/1.0 (+https://gencrawl.local)
DISCOVERY_POLITE_MODE=true
DISCOVERY_POLITE_MAX_PAGE_SCANS=10
DISCOVERY_POLITE_MAX_SEED_PAGES=3
DISCOVERY_MAX_DOCS_PER_DOMAIN=200
```

## Recommended defaults
- Use the **Polite Research** preset for official education sites.
- Keep `DISCOVERY_POLITE_MODE=true` and `DISCOVERY_MAX_DOCS_PER_DOMAIN` set to a conservative value during initial collection.
- Use global HTTP cache unless you need per-run isolation.

## Validation
- Async ingestion reports `dns_unresolved` for dead domains immediately.
- `http_cache.json` is stored at `data/cache/ingestion_http_cache.json` by default.
- Discovery reports sitemap usage and skipped URLs in crawl logs.
