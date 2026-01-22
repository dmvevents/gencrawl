# OCR API Cost Report (Max-Token Scenario)

Date: 2026-01-22

This report estimates **API OCR costs for 2,000 pages/year** using a **worst-case (max-token) scenario**. It compares three high-quality, widely used OCR-capable APIs. Pricing is sourced from vendor documentation and is subject to change.

## Assumptions (Max-Token Page)
- **Input tokens per page:** 8,000  
- **Output tokens per page:** 1,000  
- **Pages/year:** 2,000  
- Formula:  
  `Cost = pages × (input_tokens/1e6 × input_price) + pages × (output_tokens/1e6 × output_price)`

Token limits and prices used:
- **DeepInfra DeepSeek‑OCR:** $0.03 / 1M input tokens, $0.10 / 1M output tokens, **8k context**.  
  citeturn0search1
- **OpenAI GPT‑4o mini:** $0.25 / 1M input tokens, $1.00 / 1M output tokens.  
  citeturn2view3
- **Gemini 2.0 Flash (Standard):** $0.10 / 1M input tokens, $0.40 / 1M output tokens.  
  citeturn1search0

## Cost Results (2,000 Pages, Max-Token)
| Provider / Model | Input Price | Output Price | Cost @ 2,000 Pages |
| --- | --- | --- | --- |
| DeepInfra DeepSeek‑OCR | $0.03 / 1M | $0.10 / 1M | **$0.68** |
| OpenAI GPT‑4o mini | $0.25 / 1M | $1.00 / 1M | **$6.00** |
| Gemini 2.0 Flash | $0.10 / 1M | $0.40 / 1M | **$2.40** |

## Takeaways
- For **2,000 pages/year**, the **lowest cost-per-dollar** option under max-token assumptions is **DeepInfra DeepSeek‑OCR (~$0.68)**. citeturn0search1
- **OpenAI GPT‑4o mini** and **Gemini 2.0 Flash** are higher-cost in this worst-case scenario, but may offer stronger structured extraction or better general reasoning on complex layouts. citeturn2view3turn1search0

## Notes & Caveats
- **Actual costs are often lower** than this maximum scenario because many pages use fewer tokens (especially when extracting only text).  
- **Image tokenization varies by provider and resolution**; these figures assume high-detail processing.  
- If you want precise budgeting, run a **token audit** on a representative sample of documents.
