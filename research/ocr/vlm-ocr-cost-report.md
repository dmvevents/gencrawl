# VLM OCR Benchmark + Cost Report

## Summary
This report compares VLM-based OCR options (Gemini API), GCP OCR (Vision + Document AI), and open-source alternatives (DeepSeek-OCR) for our crawler ingestion pipeline. It includes benchmark signals for document understanding and a cost model for 1,000 pages.

## Benchmark signals to watch
- OCRBench v2 evaluates OCR-focused skills (recognition, parsing, reasoning). It shows a wide spread across models and highlights that even top models still struggle on harder OCR tasks. This makes it a useful sanity check for table-heavy and handwritten documents. Source: OCRBench v2 leaderboard and paper.
- IDP Leaderboard (DocVQA + ChartQA) tracks VQA performance on documents and charts. It is a good proxy for table/chart understanding at the document level and includes Gemini 3 Pro preview and Gemini 2.5 Pro results.
- OmniDocBench targets end-to-end PDF parsing across diverse document types (tables, figures, layout). It is a useful benchmark for our extraction pipeline quality.

## Pricing anchors (USD)
Gemini API (per 1M tokens):
- gemini-3-pro-preview: $2 input / $12 output (<200k tokens)
- gemini-2.5-pro: $1.25 input / $10 output (<200k tokens)

Google Cloud OCR:
- Document AI Enterprise OCR: $1.50 per 1,000 pages
- Document AI Layout Parser: $10 per 1,000 pages
- Vision API Document Text Detection: $1.50 per 1,000 images (pages)

## Cost model for 1,000 pages
Token costs vary by page size and visual density. A practical estimate is to measure promptTokenCount/outputTokenCount per page in our logs and scale linearly.

Example token-based estimate:
- If 1 page ~= 1,000 input tokens and 1,000 output tokens,
  - Gemini 3 Pro: (1,000,000/1M * $2) + (1,000,000/1M * $12) = ~$14 per 1,000 pages
  - Gemini 2.5 Pro: (1,000,000/1M * $1.25) + (1,000,000/1M * $10) = ~$11.25 per 1,000 pages

Example page-based estimate (Document AI + Layout):
- OCR only: ~$1.50 per 1,000 pages
- OCR + Layout Parser: ~$11.50 per 1,000 pages

## DeepSeek-OCR availability
DeepSeek-OCR is open-source and supports vLLM inference, but there is no official DeepSeek-hosted OCR API in the official DeepSeek API docs. If we want DeepSeek-OCR, we should plan for self-hosting and GPU capacity. Several third-party sites claim API access; treat those as non-official.

## Recommendation for gencrawl
1. Use Gemini 3 Pro preview for highest-quality OCR + structure when the API returns stable outputs and when budget allows.
2. Use Document AI OCR + Layout Parser as a robust, low-cost baseline for table-heavy PDFs.
3. Track OCRBench v2 + IDP Leaderboard scores as quality proxies, then validate with our own document set (SEA/CXC).

## Sources
- Gemini 3 model page + pricing: https://ai.google.dev/gemini-api/docs/gemini-3
- Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Cloud Vision pricing: https://cloud.google.com/vision/pricing
- Document AI pricing: https://cloud.google.com/document-ai/pricing
- OCRBench v2 leaderboard: https://99franklin.github.io/ocrbench_v2/
- OCRBench v2 paper: https://arxiv.org/abs/2501.00321
- OmniDocBench paper: https://arxiv.org/abs/2412.07626
- IDP Leaderboard: https://idp-leaderboard.org/
- DeepSeek API docs: https://api-docs.deepseek.com/
- DeepSeek-OCR repo: https://github.com/deepseek-ai/DeepSeek-OCR
