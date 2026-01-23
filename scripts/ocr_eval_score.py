#!/usr/bin/env python3
import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Tuple


def normalize_words(text: str) -> List[str]:
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
    return [tok for tok in cleaned.split() if tok]


def jaccard(a: List[str], b: List[str]) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    sa = set(a)
    sb = set(b)
    return len(sa & sb) / max(len(sa | sb), 1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--test-run-dir", default="data/ocr_tests")
    parser.add_argument("--min-text-chars", type=int, default=120)
    args = parser.parse_args()

    base = Path(args.test_run_dir) / args.run_id
    if not base.exists():
        raise SystemExit(f"Run folder not found: {base}")

    provider_stats: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
    provider_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))

    overlap_scores: List[float] = []

    page_dirs = sorted([p for p in base.rglob("page_*") if p.is_dir()])
    for page_dir in page_dirs:
        providers = {}
        for provider_file in page_dir.glob("*.json"):
            data = json.loads(provider_file.read_text())
            provider = data.get("provider") or provider_file.stem
            parsed = data.get("parsed") or data.get("result") or {}
            text = parsed.get("text") or ""
            markdown = parsed.get("markdown") or ""
            tables = parsed.get("tables") or []
            error = data.get("error")

            provider_counts[provider]["pages"] += 1
            provider_counts[provider]["errors"] += 1 if error else 0
            provider_stats[provider]["text_len_sum"] += len(text)
            provider_stats[provider]["md_len_sum"] += len(markdown)
            provider_counts[provider]["non_empty_text"] += 1 if len(text.strip()) >= args.min_text_chars else 0
            provider_counts[provider]["tables_pages"] += 1 if tables else 0
            provider_stats[provider]["tables_count_sum"] += len(tables)

            providers[provider] = text

        if "openai" in providers and "gemini" in providers:
            a = normalize_words(providers["openai"])
            b = normalize_words(providers["gemini"])
            overlap_scores.append(jaccard(a, b))

    summary = {
        "run_id": args.run_id,
        "pages_total": len(page_dirs),
        "providers": {},
        "openai_gemini_text_jaccard_avg": round(sum(overlap_scores) / len(overlap_scores), 4) if overlap_scores else None,
    }

    for provider, counts in provider_counts.items():
        pages = counts.get("pages", 0)
        summary["providers"][provider] = {
            "pages": pages,
            "errors": counts.get("errors", 0),
            "non_empty_text_pages": counts.get("non_empty_text", 0),
            "non_empty_rate": round((counts.get("non_empty_text", 0) / pages) if pages else 0, 4),
            "avg_text_len": round(provider_stats[provider].get("text_len_sum", 0) / pages, 2) if pages else 0,
            "avg_md_len": round(provider_stats[provider].get("md_len_sum", 0) / pages, 2) if pages else 0,
            "tables_pages": counts.get("tables_pages", 0),
            "avg_tables_per_page": round(provider_stats[provider].get("tables_count_sum", 0) / pages, 3) if pages else 0,
        }

    report_lines = [
        f"# OCR Test Report ({args.run_id})",
        "",
        f"Total pages evaluated: {summary['pages_total']}",
        "",
    ]
    for provider, stats in summary["providers"].items():
        report_lines.extend(
            [
                f"## {provider}",
                f"- pages: {stats['pages']}",
                f"- errors: {stats['errors']}",
                f"- non-empty text rate: {stats['non_empty_rate']}",
                f"- avg text length: {stats['avg_text_len']}",
                f"- avg markdown length: {stats['avg_md_len']}",
                f"- pages with tables: {stats['tables_pages']}",
                f"- avg tables per page: {stats['avg_tables_per_page']}",
                "",
            ]
        )
    if summary["openai_gemini_text_jaccard_avg"] is not None:
        report_lines.append(
            f"OpenAI vs Gemini text overlap (Jaccard avg): {summary['openai_gemini_text_jaccard_avg']}"
        )

    summary_path = base / "summary.json"
    report_path = base / "report.md"
    summary_path.write_text(json.dumps(summary, indent=2))
    report_path.write_text("\n".join(report_lines))

    print("summary:", summary_path)
    print("report:", report_path)


if __name__ == "__main__":
    main()
