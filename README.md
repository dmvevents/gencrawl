# GenCrawl

**General-purpose LLM-ready web crawler with natural language interface**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)

---

## Overview

GenCrawl uses **LLM orchestration** to interpret natural language queries and automatically configure distributed web crawling pipelines. Just describe what you want to crawl, and GenCrawl handles the rest.

**Example:**
```
User: "Find all CXC CSEC Mathematics past papers from 2020-2025"

GenCrawl: [Automatically configures Scrapy crawler with filters]
Result: 47 PDF files organized hierarchically
```

---

## Key Features

- **Natural Language Interface** - No configuration needed, just describe what you want
- **Multi-Crawler Support** - Scrapy, Crawl4AI, Playwright (auto-selected)
- **LLM-Ready Output** - NVIDIA Nemo Curator-compatible JSONL format
- **Real-Time Monitoring** - Live dashboard with progress tracking
- **100% Open Source** - MIT License, deploy anywhere, no limits
- **Production-Ready** - Docker Compose, health checks, error handling

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- API Keys: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (optional)

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/gencrawl.git
cd gencrawl
```

### 2. Set API Keys

Edit `.env`:
```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
OPENAI_API_KEY=sk-proj-your-key-here
```

### 3. Start Services

```bash
docker-compose up -d
```

### 4. Open Dashboard

```
http://localhost:3000
```

That's it! You're ready to start crawling.

---

## Usage

### Natural Language Crawl

1. Open dashboard at `http://localhost:3000`
2. Click "Get Started" or go to `/dashboard`
3. Enter a query like:
   - "Find all CXC CSEC Mathematics past papers from 2020-2025"
   - "Get recent AI research papers on web scraping from arxiv.org"
   - "Download Trinidad and Tobago Ministry of Education documents"
4. Click "Start Crawl"
5. Monitor progress in real-time
6. Download results in JSONL format

### API Usage

```bash
# Submit crawl
curl -X POST http://localhost:8000/api/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{"query": "Find CXC CSEC Math papers", "user_id": "demo"}'

# Check status
curl http://localhost:8000/api/v1/crawl/{crawl_id}/status

# Get results
curl http://localhost:8000/api/v1/crawl/{crawl_id}/results
```

---

## Architecture

```
User Query → LLM Orchestrator → Crawler Manager → Scrapy/Crawl4AI/Playwright
                ↓                      ↓                      ↓
           Config Generator     Job Tracking         Content Extraction
                ↓                      ↓                      ↓
          Quality Scoring        Progress Updates    JSONL Export → Nemo Curator
```

**Tech Stack:**
- **Backend:** FastAPI (Python 3.11), Celery, Redis
- **Crawlers:** Scrapy, Crawl4AI, Playwright
- **LLM:** Claude Sonnet 4.5 (orchestration), GPT-5.2 (backup)
- **Storage:** PostgreSQL, Weaviate (vector DB)
- **Frontend:** Next.js 16, React, Tailwind CSS
- **Deployment:** Docker Compose

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture.

---

## Project Structure

```
gencrawl/
├── backend/                   # Python backend
│   ├── api/                   # FastAPI application
│   ├── crawlers/              # Crawler implementations
│   ├── orchestrator.py        # LLM query interpreter
│   └── Dockerfile
├── frontend/                  # Next.js dashboard
│   ├── app/                   # Pages (landing, dashboard)
│   ├── components/            # React components
│   └── Dockerfile
├── data/                      # Crawled data
│   ├── raw/                   # Original files
│   └── processed/             # JSONL output
├── docs/                      # Documentation
├── docker-compose.yml         # Full stack deployment
└── README.md                  # This file
```

---

## Output Format

GenCrawl outputs data in **JSONL (JSON Lines)** format compatible with NVIDIA Nemo Curator:

```jsonl
{"id": "doc_001", "text": "Document content...", "metadata": {"source": "cxc.org", "url": "https://...", "crawl_date": "2026-01-20T10:30:00Z", "publish_date": "2023-05-15", "document_type": "past_paper", "subject": "mathematics", "exam_type": "CSEC", "quality_score": 0.92, "word_count": 3452, "file_hash": "sha256:abc123..."}}
```

See [docs/GENCRAWL-DATA-FORMAT-SPEC.md](docs/GENCRAWL-DATA-FORMAT-SPEC.md) for complete format specification.

---

## Development

### Local Development (without Docker)

**Backend:**
```bash
cd backend
source .venv/bin/activate
uvicorn api.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
pnpm dev
```

**Services:**
```bash
# Start only infrastructure
docker-compose up -d postgres redis weaviate
```

### Testing

```bash
# Backend tests
cd backend
pytest tests/

# Frontend tests
cd frontend
pnpm test

# Integration tests
./test_deployment.sh
```

---

## First Use Case: Caribbean Education

GenCrawl's first deployment targets Caribbean educational materials:

- **SEA** (Trinidad & Tobago Secondary Entrance Assessment)
- **CXC CSEC/CAPE** (Caribbean Examinations Council)
- **GSAT** (Jamaica Grade Six Achievement Test)
- **Other Caribbean standardized tests**

**Target:** 5,000+ documents organized hierarchically by country, exam, subject, and year.

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key (required) | - |
| `OPENAI_API_KEY` | OpenAI API key (optional) | - |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://admin:password@localhost:5432/gencrawl` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `WEAVIATE_URL` | Weaviate endpoint | `http://localhost:8080` |
| `MAX_CONCURRENT_CRAWLS` | Max parallel crawls | `10` |
| `POLITENESS_DELAY` | Delay between requests (seconds) | `1` |

### Crawler Selection

GenCrawl automatically selects the optimal crawler:

| Content Type | Crawler | Speed |
|-------------|---------|-------|
| Static HTML | Scrapy | 100+ pages/min |
| JS-heavy sites | Playwright | 10+ pages/min |
| LLM-ready content | Crawl4AI | 20+ pages/min |
| APIs | Custom | Varies |

---

## Roadmap

### v1.0 (Current) - MVP
- ✅ Natural language interface
- ✅ LLM orchestration (Claude Sonnet 4.5)
- ✅ Basic Scrapy crawler
- ✅ FastAPI backend
- ✅ Next.js dashboard
- ✅ Docker Compose deployment

### v1.1 (Next) - Full Crawlers
- Full Scrapy spider with anti-blocking
- Crawl4AI integration for markdown
- Playwright for JavaScript rendering
- PDF extraction (PyMuPDF, MinerU)

### v1.2 - Quality Pipeline
- NVIDIA Nemo Curator integration
- Deduplication (exact + fuzzy)
- PII redaction
- Quality scoring

### v2.0 - Production
- PostgreSQL persistence
- Celery distributed workers
- Weaviate semantic search
- Monitoring & alerting

---

## Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture and diagrams
- [OKR Document](docs/CARIBBEAN-EDUCATION-CRAWLER-OKR.md) - Objectives and key results
- [Data Format Spec](docs/GENCRAWL-DATA-FORMAT-SPEC.md) - JSONL format specification
- [Dashboard UI Spec](docs/GENCRAWL-DASHBOARD-UI-SPEC.md) - Frontend design

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/gencrawl/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/gencrawl/discussions)
- **Documentation:** [Wiki](https://github.com/yourusername/gencrawl/wiki)

---

## Acknowledgments

Built with:
- [Anthropic Claude](https://anthropic.com) - LLM orchestration
- [Scrapy](https://scrapy.org/) - Web crawling framework
- [Crawl4AI](https://github.com/unclecode/crawl4ai) - LLM-ready markdown
- [Playwright](https://playwright.dev/) - Browser automation
- [NVIDIA Nemo Curator](https://github.com/NVIDIA-NeMo/Curator) - Data curation
- [FastAPI](https://fastapi.tiangolo.com/) - API framework
- [Next.js](https://nextjs.org/) - Frontend framework

---

**Made with ❤️ for the LLM community**
