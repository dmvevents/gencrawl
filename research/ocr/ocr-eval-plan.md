# OCR Evaluation Plan

## Hypotheses
1. Multi-model OCR improves coverage and structural fidelity on SEA/CXC PDFs (tables, handwritten notes, scanned text).
2. Document AI OCR + Layout Parser provides the best price/performance baseline for tables, while VLMs provide higher-quality semantic structure on complex layouts.
3. Hybrid routing (cheap OCR first, VLM only on low-quality pages) reduces cost by >50% with minimal quality loss.

## Test Set
- 30 PDFs across SEA/CXC with diverse layouts:
  - Scanned tests (math + diagrams)
  - Forms (registration/review)
  - Rubrics (structured text)
  - Tables/grade sheets
- Include at least 5 handwritten-heavy pages.

## Experimental Design
- Run OCR on identical page sets for each provider:
  - VLMs: Gemini, OpenAI, Claude (when available)
  - GCP: Vision OCR + Document AI Layout
- Use the same prompt schema and output format for VLMs.
- Log raw outputs, parsed outputs, usage, and errors for each page in `data/ocr_tests/<run_id>`.

## Evaluation Criteria
Quantitative:
- Character Error Rate (CER) against ground-truth for 10 annotated pages.
- Table fidelity score (cell accuracy vs. a reference table CSV/Markdown).
- Layout completeness: % of detected headings/sections vs. reference.

Qualitative:
- Visual inspection of 10 pages (table borders, merged cells, multi-column text).
- Human-labeled score: 1–5 for usability in downstream retrieval.

## Acceptance Criteria
- CER < 5% on clean scans and < 12% on noisy scans.
- Table fidelity >= 85% on the 10 annotated tables.
- 90% of pages have non-empty structured output.
- Hybrid routing yields >= 50% cost savings vs. full VLM pass.

## Reporting
- Store all raw outputs and parsed outputs in `data/ocr_tests/<run_id>`.
- Produce a summary report with:
  - Per-provider metrics
  - Cost per 1,000 pages
  - Failure modes and recommendations

## Next Steps
- Build a small ground-truth set (10 pages) with labeled text + tables.
- Add a table scoring script to compute cell-level accuracy.
- Add a dashboard view for OCR test comparisons.
