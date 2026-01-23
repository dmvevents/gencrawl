#!/usr/bin/env python3
"""Batch-run GCP OCR comparison for a list of PDFs."""
from __future__ import annotations

import argparse
import subprocess
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf-list", required=True, help="Newline-delimited list of local PDF paths")
    parser.add_argument("--run-id", required=True, help="Test run ID (output under data/ocr_tests/<run-id>/gcp)")
    parser.add_argument("--page-limit", type=int, default=1)
    parser.add_argument("--image-scale", type=float, default=3.0)
    parser.add_argument("--grayscale", action="store_true")
    parser.add_argument("--autocontrast", action="store_true")
    parser.add_argument("--sharpen", action="store_true")
    args = parser.parse_args()

    pdf_list = Path(args.pdf_list)
    if not pdf_list.exists():
        raise SystemExit(f"PDF list not found: {pdf_list}")

    out_root = Path("data") / "ocr_tests" / args.run_id / "gcp"
    out_root.mkdir(parents=True, exist_ok=True)

    pdfs = [line.strip() for line in pdf_list.read_text().splitlines() if line.strip()]
    for pdf in pdfs:
        path = Path(pdf)
        if not path.exists() or path.suffix.lower() != ".pdf":
            continue
        doc_slug = path.stem
        out_dir = out_root / doc_slug
        out_dir.mkdir(parents=True, exist_ok=True)
        cmd = [
            "python3",
            "scripts/run_gcp_ocr_compare.py",
            "--pdf-path",
            str(path),
            "--page-limit",
            str(args.page_limit),
            "--image-scale",
            str(args.image_scale),
            "--out-dir",
            str(out_dir),
        ]
        if args.grayscale:
            cmd.append("--grayscale")
        if args.autocontrast:
            cmd.append("--autocontrast")
        if args.sharpen:
            cmd.append("--sharpen")
        subprocess.run(cmd, check=False)


if __name__ == "__main__":
    main()
