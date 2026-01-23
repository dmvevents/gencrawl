#!/usr/bin/env python3
"""
Evaluate table extraction quality by comparing extracted markdown tables
against ground-truth tables (markdown or CSV).

Input manifest: JSONL with fields:
  - id: unique identifier
  - extracted_markdown_path: path to extracted markdown (required)
  - ground_truth_markdown_path OR ground_truth_csv_path: one required
  - notes (optional)

Outputs a JSON report with per-item metrics and aggregate scores.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import List, Optional, Tuple


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def parse_markdown_table(text: str) -> List[List[str]]:
    lines = [line.strip() for line in text.splitlines() if "|" in line]
    if not lines:
        return []
    # Remove header separator line if present (---|---)
    cleaned = []
    for line in lines:
        if set(line.replace("|", "").strip()) <= {"-", ":", " "}:
            continue
        cleaned.append(line)
    rows: List[List[str]] = []
    for line in cleaned:
        parts = [cell.strip() for cell in line.strip("|").split("|")]
        rows.append(parts)
    return rows


def parse_csv_table(path: Path) -> List[List[str]]:
    rows: List[List[str]] = []
    with path.open(newline="", encoding="utf-8", errors="ignore") as handle:
        reader = csv.reader(handle)
        for row in reader:
            rows.append([cell.strip() for cell in row])
    return rows


def normalize_rows(rows: List[List[str]]) -> List[List[str]]:
    max_cols = max((len(r) for r in rows), default=0)
    return [r + [""] * (max_cols - len(r)) for r in rows]


def cell_match_ratio(pred: List[List[str]], truth: List[List[str]]) -> float:
    if not pred or not truth:
        return 0.0
    pred_norm = normalize_rows(pred)
    truth_norm = normalize_rows(truth)
    rows = min(len(pred_norm), len(truth_norm))
    cols = min(len(pred_norm[0]), len(truth_norm[0])) if rows else 0
    if rows == 0 or cols == 0:
        return 0.0
    matches = 0
    total = rows * cols
    for r in range(rows):
        for c in range(cols):
            if pred_norm[r][c] == truth_norm[r][c]:
                matches += 1
    return matches / total


def evaluate_item(extracted_md: Path, gt_md: Optional[Path], gt_csv: Optional[Path]) -> dict:
    pred_rows = parse_markdown_table(_read_text(extracted_md))
    if gt_md:
        truth_rows = parse_markdown_table(_read_text(gt_md))
    elif gt_csv:
        truth_rows = parse_csv_table(gt_csv)
    else:
        truth_rows = []
    row_match = 1.0 if len(pred_rows) == len(truth_rows) and truth_rows else 0.0
    col_match = 0.0
    if pred_rows and truth_rows:
        col_match = 1.0 if len(pred_rows[0]) == len(truth_rows[0]) else 0.0
    cell_ratio = cell_match_ratio(pred_rows, truth_rows)
    return {
        "rows_pred": len(pred_rows),
        "rows_truth": len(truth_rows),
        "cols_pred": len(pred_rows[0]) if pred_rows else 0,
        "cols_truth": len(truth_rows[0]) if truth_rows else 0,
        "row_match": row_match,
        "col_match": col_match,
        "cell_match_ratio": round(cell_ratio, 4),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, help="Path to JSONL manifest")
    parser.add_argument("--output", required=True, help="Output JSON report path")
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    results = []
    for line in manifest_path.read_text().splitlines():
        if not line.strip():
            continue
        item = json.loads(line)
        extracted_md = Path(item["extracted_markdown_path"])
        gt_md = Path(item["ground_truth_markdown_path"]) if item.get("ground_truth_markdown_path") else None
        gt_csv = Path(item["ground_truth_csv_path"]) if item.get("ground_truth_csv_path") else None
        metrics = evaluate_item(extracted_md, gt_md, gt_csv)
        results.append({"id": item.get("id"), "metrics": metrics, "notes": item.get("notes")})

    if results:
        avg_cell = sum(r["metrics"]["cell_match_ratio"] for r in results) / len(results)
    else:
        avg_cell = 0.0

    report = {
        "total": len(results),
        "avg_cell_match_ratio": round(avg_cell, 4),
        "items": results,
    }
    Path(args.output).write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
