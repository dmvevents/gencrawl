FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY pyproject.toml ./

# Install Python dependencies
RUN pip install --no-cache-dir fastapi "uvicorn[standard]" sqlmodel psycopg2-binary redis celery \
    scrapy playwright beautifulsoup4 lxml pymupdf pdfplumber pytesseract pillow \
    anthropic openai weaviate-client python-multipart pydantic-settings python-dotenv httpx psutil \
    pytest pytest-asyncio jsonlines nv-ingest-client==25.9.0 nv-ingest-api==25.9.0

# Install Playwright browsers
RUN playwright install chromium
RUN playwright install-deps

# Copy application code
COPY . .

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
