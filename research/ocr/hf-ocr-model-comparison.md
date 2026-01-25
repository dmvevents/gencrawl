# Hugging Face OCR / Document-VLM Comparison Matrix

This matrix catalogs open OCR and document-VLM models commonly compared to DeepSeek-OCR-class systems, with a focus on structured extraction (tables, formulas) and document understanding.

## Comparison Matrix

| Model (HF ID) | Category | Output Formats (claimed) | Strengths / Notes (from model cards/docs) |
| --- | --- | --- | --- |
| deepseek-ai/DeepSeek-OCR | OCR VLM | Markdown (prompted) | OCR model with markdown conversion prompt; vLLM support noted in model card. |
| PaddlePaddle/PaddleOCR-VL | OCR VLM | Markdown, JSON, HTML tables/charts | 109 languages; strong on text, tables, formulas, charts; claims SOTA on document parsing and handles handwriting/historical docs. |
| nanonets/Nanonets-OCR2-3B | OCR VLM | Structured Markdown + HTML tables + LaTeX | Rich structure: equations, tables, flowcharts (Mermaid), checkboxes, signatures, watermarks; multilingual and handwriting support. |
| rednote-hilab/dots.ocr | OCR VLM | Markdown, JSON | Layout-aware; strong results on OmniDocBench; limitations on complex tables/formulas noted. |
| allenai/olmOCR-2-7B-1025 | OCR pipeline VLM | Markdown, HTML, LaTeX (via toolkit) | Fine-tuned with RL for math/tables; recommends toolkit + vLLM for scale. |
| kitjesen/MinerU | OCR pipeline | Markdown | Multi-model pipeline: layout detection, formula detection/recognition, table reconstruction. |
| facebook/nougat-base | PDF to Markdown | Markdown | Academic PDF transcription baseline (Nougat). |
| microsoft/trocr-base-printed | Line OCR | Text | Line-level OCR baseline (printed/SROIE). |
| microsoft/trocr-base-handwritten | Line OCR | Text | Line-level OCR baseline (handwritten/IAM). |
| naver-clova-ix/donut-base-finetuned-docvqa | Doc VQA | Text answers | OCR-free document understanding (DocVQA). |
| google/pix2struct-docvqa-large | Doc VQA | Text answers | Doc VQA model (image encoder - text decoder). |
| stepfun-ai/GOT-OCR-2.0-hf | OCR-2.0 | Formatted output (prompted) | Unified OCR-2.0 model for tables, charts, formulas; supports formatted outputs (e.g., markdown/tikz). |

## Notes for Evaluation

- For SEA/CXC content (forms, tables, math, handwriting), prioritize: DeepSeek-OCR, PaddleOCR-VL, Nanonets-OCR2, olmOCR-2, dots.ocr, MinerU, and TrOCR (handwriting baseline).
- DocVQA models (Donut/Pix2Struct) are strong for question-answering but not a direct OCR substitute.

## Sources

- DeepSeek-OCR model card: https://huggingface.co/deepseek-ai/DeepSeek-OCR
- PaddleOCR-VL model card: https://huggingface.co/PaddlePaddle/PaddleOCR-VL
- Nanonets-OCR2-3B model card: https://huggingface.co/nanonets/Nanonets-OCR2-3B
- dots.ocr model card: https://huggingface.co/rednote-hilab/dots.ocr
- olmOCR-2-7B-1025 model card: https://huggingface.co/allenai/olmOCR-2-7B-1025
- MinerU model card: https://huggingface.co/kitjesen/MinerU
- Nougat model card: https://huggingface.co/facebook/nougat-base
- TrOCR printed/handwritten: https://huggingface.co/microsoft/trocr-base-printed
- Donut DocVQA: https://huggingface.co/naver-clova-ix/donut-base-finetuned-docvqa
- Pix2Struct DocVQA: https://huggingface.co/google/pix2struct-docvqa-large
- GOT-OCR2 docs: https://huggingface.co/docs/transformers/en/model_doc/got_ocr2
