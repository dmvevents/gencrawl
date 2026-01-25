# Table Evaluation Framework

This project uses a table evaluation loop to score table extraction quality
and store tables in markdown for easy retrieval and UI display.

## Recommended Extractors

- **Vision OCR + Table model**: Use Google Vision OCR for text, then a
  high-quality table model (Docling or Table Transformer) for structure.
- **Docling (Granite-Docling)**: End-to-end document conversion with strong
  table handling and markdown output.
- **Table Transformer (TATR)**: Dedicated table detection/structure recognition,
  paired with OCR for cell text.

## Metrics

- **Cell match ratio**: Exact string match of overlapping cells.
- **Row/column match**: Shape agreement between predicted and ground truth.
- Optional advanced metrics:
  - **TEDS** (PubTabNet)
  - **GriTS** (PubTables-1M / Table Transformer)

## Table Storage

Store tables as:

- `tables`: array of `{markdown, bbox, confidence, source_page}`
- `content_markdown`: append tables as markdown blocks after text

## Evaluation Runner

Create a JSONL manifest with:

```
{"id":"doc-1","extracted_markdown_path":"data/tables/doc-1.md","ground_truth_csv_path":"data/gt/doc-1.csv"}
```

Run:

```
python3 scripts/table_eval_runner.py --manifest data/table_eval_manifest.jsonl --output data/table_eval_report.json
```

The report includes per-item metrics and aggregate cell match ratio.
