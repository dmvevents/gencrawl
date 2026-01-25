# Crawl + Document Harvest Strategies

This doc summarizes the working approaches used to find SEA/CSEC/CAPE PDFs and
keep them as **separate datasets** (each crawl/harvest gets its own ingestion
output folder and Nemo JSONL).

## 1) Standard crawler discovery (fast)
Use the built-in crawler with filters:
- `file_types: ["pdf"]`
- `document_types: ["past_paper","practice","mark_scheme","syllabus","curriculum"]`
- `exclude_document_types: ["newsletter","notice","results","report","timetable","registration","guidance"]`

Pros: Low compute, easy to repeat.
Cons: Some targets (e.g., CXC `/documents/` links) 404 or hide files.

## 2) Sitemap harvesting (reliable where available)
Use the sitemap index + subject/page sitemaps to find content pages, then scrape
those pages for PDF links.
- CXC sitemap index: `https://www.cxc.org/sitemap_index.xml`
- Subject sitemap: `https://www.cxc.org/subject-sitemap.xml`
- Page sitemap: `https://www.cxc.org/page-sitemap.xml`

Script: `scripts/harvest_sitemaps.py` (direct sitemap → PDFs)

## 3) Page scrape → PDF links (works when sitemap is page-only)
When sitemaps only list pages (not attachments), crawl pages and extract PDF
links by regex.

Script: inline Python / `scripts/harvest_sitemaps.py` variants.

## 4) Playwright browser harvest (best yield)
Some pages are rendered or hide links. Use Playwright to render and extract
all PDF/DOC links, then download.

Script: `scripts/harvest_playwright_links.py`
Example:
```
python scripts/harvest_playwright_links.py \
  --sitemap https://www.cxc.org/subject-sitemap.xml \
  --max-pages 40 \
  --keywords syllabus,past,paper,specimen,practice,csec,cape,ccslc \
  --download \
  --out-dir data/crawl_runs/cxc_playwright_test
```

## 5) WordPress media API (if not blocked)
Try `https://<domain>/wp-json/wp/v2/media`. If blocked (403), fall back to
Playwright or sitemap page scraping.

Script: `scripts/harvest_wp_media.py`

## 6) Ingestion pipeline (separate datasets)
Each harvest is ingested into a separate output folder:
```
data/ingestion/<crawl_id>/
  documents.jsonl
  structured/
  raw/
  nemo_curator.jsonl
  nemo_curated.jsonl
```

Local manifest ingest:
```
python scripts/ingest_local_manifest.py --manifest <manifest.json> --crawl-id <id> ...
```

## 7) 404 mitigation
If `/documents/` URLs 404:
- Prefer sitemap + page scraping (subject/page sitemaps)
- Use Playwright harvest to get links from rendered pages
- Look for `wp-content/uploads` and `cxcedu.wpengine.com` domains

## 8) Keep datasets isolated
Do **not** merge local + online runs unless explicitly requested.
Treat each crawl/harvest as its own database for evaluation and QA.
