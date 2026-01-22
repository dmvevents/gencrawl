# Quick Start: Multi-Iteration Crawling

Get started with GenCrawl's multi-iteration and checkpoint/resume features in 5 minutes.

---

## Prerequisites

1. GenCrawl backend running:
```bash
cd ~/projects/gencrawl/backend
uvicorn api.main:app --reload --port 8000
```

2. API accessible at `http://localhost:8000`

---

## Scenario 1: Daily SEA Papers Check

Monitor a website for new documents daily.

### Step 1: Create Baseline Crawl

```bash
curl -X POST http://localhost:8000/api/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Find all SEA past papers",
    "targets": ["moe.gov.tt"],
    "crawler": "scrapy",
    "keywords": ["SEA", "past paper", "examination"],
    "file_types": ["pdf"]
  }'
```

**Response:**
```json
{
  "crawl_id": "abc123-def456-ghi789",
  "status": "queued"
}
```

Save the `crawl_id` for next steps.

### Step 2: Configure Multi-Iteration

```bash
CRAWL_ID="abc123-def456-ghi789"

curl -X POST http://localhost:8000/api/v1/crawl/$CRAWL_ID/iterations \
  -H "Content-Type: application/json" \
  -d '{
    "max_iterations": 30,
    "iteration_interval_hours": 24.0,
    "mode": "incremental",
    "stop_if_no_changes": true
  }'
```

**Response:**
```json
{
  "crawl_id": "abc123-def456-ghi789",
  "baseline_iteration_id": "abc123-def456-ghi789_iter_0",
  "configured_iterations": 30,
  "mode": "incremental",
  "message": "Multi-iteration crawl configured"
}
```

### Step 3: Run Daily (Next Day)

```bash
# Day 2: Create incremental iteration
curl -X POST http://localhost:8000/api/v1/crawl/$CRAWL_ID/iterations/next \
  -H "Content-Type: application/json" \
  --data-urlencode "mode=incremental"
```

**Response:**
```json
{
  "crawl_id": "abc123-def456-ghi789",
  "iteration_id": "abc123-def456-ghi789_iter_1",
  "iteration_number": 1,
  "mode": "incremental",
  "status": "created"
}
```

### Step 4: Check What's New

```bash
# Compare iteration 1 with baseline (0)
curl "http://localhost:8000/api/v1/crawl/$CRAWL_ID/iterations/compare?baseline=0&current=1"
```

**Response:**
```json
{
  "baseline_iteration_id": "abc123-def456-ghi789_iter_0",
  "current_iteration_id": "abc123-def456-ghi789_iter_1",
  "new_documents": [
    "https://moe.gov.tt/sea-2026-math.pdf",
    "https://moe.gov.tt/sea-2026-english.pdf"
  ],
  "modified_documents": [
    "https://moe.gov.tt/sea-syllabus.pdf"
  ],
  "unchanged_documents": [...],
  "deleted_documents": [],
  "total_changes": 3,
  "has_changes": true,
  "summary": "Iteration 1 vs 0: 2 new, 1 modified, 0 deleted, 97 unchanged"
}
```

---

## Scenario 2: Resume After Interruption

Your crawl was interrupted. Pick up where it left off.

### Step 1: Check Checkpoint Status

```bash
CRAWL_ID="xyz789-abc123"

curl http://localhost:8000/api/v1/crawl/$CRAWL_ID/checkpoints/stats
```

**Response:**
```json
{
  "crawl_id": "xyz789-abc123",
  "total_checkpoints": 3,
  "latest_checkpoint_id": "xyz789-abc123_ckpt_2",
  "latest_checkpoint_created": "2026-01-20T10:25:00Z",
  "latest_checkpoint_state": "crawling",
  "can_resume": true,
  "checkpoint_types": {
    "auto": 2,
    "manual": 0,
    "pause": 1,
    "error": 0
  }
}
```

### Step 2: Resume from Latest Checkpoint

```bash
curl -X POST http://localhost:8000/api/v1/crawl/$CRAWL_ID/continue \
  -H "Content-Type: application/json" \
  -d '{
    "validate": true
  }'
```

**Response:**
```json
{
  "crawl_id": "xyz789-abc123",
  "checkpoint_id": "xyz789-abc123_ckpt_2",
  "resumed_from_state": "crawling",
  "resumed_from_substate": "downloading_pages",
  "crawled_urls": 523,
  "queued_urls": 147,
  "message": "Crawl resumed successfully from checkpoint"
}
```

The crawl continues from where it stopped!

---

## Scenario 3: Manual Checkpoint Before Risky Operation

Save state before a potentially problematic phase.

### Step 1: Create Manual Checkpoint

```bash
CRAWL_ID="your-crawl-id"

curl -X POST "http://localhost:8000/api/v1/crawl/$CRAWL_ID/checkpoint?checkpoint_type=manual"
```

**Response:**
```json
{
  "checkpoint_id": "your-crawl-id_ckpt_5",
  "crawl_id": "your-crawl-id",
  "checkpoint_number": 5,
  "created_at": "2026-01-20T15:30:00Z",
  "message": "Checkpoint created successfully"
}
```

### Step 2: If Something Goes Wrong

```bash
# Resume from the manual checkpoint
curl -X POST http://localhost:8000/api/v1/crawl/$CRAWL_ID/continue \
  -H "Content-Type: application/json" \
  -d '{
    "checkpoint_id": "your-crawl-id_ckpt_5"
  }'
```

---

## Scenario 4: Weekly Full Re-Crawl with Comparison

Do a full re-crawl weekly to detect all changes.

### Step 1: Create Full Iteration

```bash
CRAWL_ID="abc123"

curl -X POST "http://localhost:8000/api/v1/crawl/$CRAWL_ID/iterations/next?mode=full"
```

### Step 2: View Iteration History

```bash
curl http://localhost:8000/api/v1/crawl/$CRAWL_ID/iterations
```

**Response:**
```json
[
  {
    "iteration_id": "abc123_iter_0",
    "iteration_number": 0,
    "mode": "baseline",
    "started_at": "2026-01-13T10:00:00Z",
    "completed_at": "2026-01-13T10:30:00Z",
    "duration_seconds": 1800,
    "stats": {
      "total_documents": 100
    }
  },
  {
    "iteration_id": "abc123_iter_1",
    "iteration_number": 1,
    "mode": "incremental",
    "stats": {
      "new_documents": 5,
      "modified_documents": 2
    }
  },
  {
    "iteration_id": "abc123_iter_2",
    "iteration_number": 2,
    "mode": "full",
    "stats": {
      "total_documents": 120,
      "new_documents": 20,
      "modified_documents": 8
    }
  }
]
```

### Step 3: Get Detailed Statistics

```bash
curl http://localhost:8000/api/v1/crawl/$CRAWL_ID/iterations/stats
```

---

## Common Commands Cheat Sheet

### Iterations

```bash
# Configure multi-iteration
POST /api/v1/crawl/{crawl_id}/iterations

# List all iterations
GET /api/v1/crawl/{crawl_id}/iterations

# Get specific iteration
GET /api/v1/crawl/{crawl_id}/iterations/{number}

# Create next iteration
POST /api/v1/crawl/{crawl_id}/iterations/next?mode=incremental

# Compare iterations
GET /api/v1/crawl/{crawl_id}/iterations/compare?baseline=0&current=1

# Get iteration stats
GET /api/v1/crawl/{crawl_id}/iterations/stats
```

### Checkpoints

```bash
# List checkpoints
GET /api/v1/crawl/{crawl_id}/checkpoints

# Create manual checkpoint
POST /api/v1/crawl/{crawl_id}/checkpoint?checkpoint_type=manual

# Get latest checkpoint
GET /api/v1/crawl/{crawl_id}/checkpoints/latest

# Resume from checkpoint
POST /api/v1/crawl/{crawl_id}/continue

# Delete checkpoint
DELETE /api/v1/crawl/{crawl_id}/checkpoints/{checkpoint_id}

# Cleanup old checkpoints
POST /api/v1/crawl/{crawl_id}/checkpoints/cleanup?keep_last=3

# Get checkpoint stats
GET /api/v1/crawl/{crawl_id}/checkpoints/stats
```

---

## Python Client Example

```python
import requests
import time

API_URL = "http://localhost:8000/api/v1"

class GenCrawlClient:
    def __init__(self, base_url=API_URL):
        self.base_url = base_url

    def create_crawl(self, query, targets, **kwargs):
        """Create a new crawl."""
        response = requests.post(f"{self.base_url}/crawl", json={
            "query": query,
            "targets": targets,
            **kwargs
        })
        return response.json()

    def configure_iterations(self, crawl_id, max_iter=30, interval=24, mode="incremental"):
        """Configure multi-iteration crawling."""
        response = requests.post(
            f"{self.base_url}/crawl/{crawl_id}/iterations",
            json={
                "max_iterations": max_iter,
                "iteration_interval_hours": interval,
                "mode": mode,
                "stop_if_no_changes": True
            }
        )
        return response.json()

    def next_iteration(self, crawl_id, mode="incremental"):
        """Create next iteration."""
        response = requests.post(
            f"{self.base_url}/crawl/{crawl_id}/iterations/next",
            params={"mode": mode}
        )
        return response.json()

    def compare_iterations(self, crawl_id, baseline, current):
        """Compare two iterations."""
        response = requests.get(
            f"{self.base_url}/crawl/{crawl_id}/iterations/compare",
            params={"baseline": baseline, "current": current}
        )
        return response.json()

    def create_checkpoint(self, crawl_id, checkpoint_type="manual"):
        """Create a checkpoint."""
        response = requests.post(
            f"{self.base_url}/crawl/{crawl_id}/checkpoint",
            params={"checkpoint_type": checkpoint_type}
        )
        return response.json()

    def resume_crawl(self, crawl_id, checkpoint_id=None):
        """Resume from checkpoint."""
        response = requests.post(
            f"{self.base_url}/crawl/{crawl_id}/continue",
            json={"checkpoint_id": checkpoint_id, "validate": True}
        )
        return response.json()

# Usage Example
client = GenCrawlClient()

# Day 1: Baseline
result = client.create_crawl(
    query="Find SEA past papers",
    targets=["moe.gov.tt"],
    keywords=["SEA", "past paper"],
    file_types=["pdf"]
)
crawl_id = result["crawl_id"]

# Configure for daily updates
client.configure_iterations(crawl_id, max_iter=30, interval=24)

# Day 2: Incremental update
iteration = client.next_iteration(crawl_id, mode="incremental")
print(f"Created iteration {iteration['iteration_number']}")

# Check what's new
comparison = client.compare_iterations(crawl_id, baseline=0, current=1)
print(f"New documents: {len(comparison['new_documents'])}")
print(f"Modified: {len(comparison['modified_documents'])}")

# Create manual checkpoint before risky operation
checkpoint = client.create_checkpoint(crawl_id)
print(f"Checkpoint created: {checkpoint['checkpoint_id']}")

# If something goes wrong, resume
result = client.resume_crawl(crawl_id)
print(f"Resumed from: {result['resumed_from_state']}")
```

---

## Testing

### Verify Installation

```bash
# Check if iterations router is loaded
curl http://localhost:8000/docs | grep iterations

# Should see endpoints like:
# - /api/v1/crawl/{crawl_id}/iterations
# - /api/v1/crawl/{crawl_id}/checkpoints
```

### Run Test Crawl

```bash
# 1. Create test crawl
CRAWL_ID=$(curl -s -X POST http://localhost:8000/api/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "targets": ["example.com"]}' \
  | jq -r '.crawl_id')

echo "Crawl ID: $CRAWL_ID"

# 2. Configure iterations
curl -X POST http://localhost:8000/api/v1/crawl/$CRAWL_ID/iterations \
  -H "Content-Type: application/json" \
  -d '{"max_iterations": 3, "mode": "incremental"}'

# 3. List iterations
curl http://localhost:8000/api/v1/crawl/$CRAWL_ID/iterations | jq

# 4. Create checkpoint
curl -X POST "http://localhost:8000/api/v1/crawl/$CRAWL_ID/checkpoint?checkpoint_type=manual"

# 5. List checkpoints
curl http://localhost:8000/api/v1/crawl/$CRAWL_ID/checkpoints | jq
```

---

## Troubleshooting

### "Iteration not found"

**Problem:** API returns 404 for iteration endpoints

**Solution:**
1. Verify crawl ID exists: `GET /api/v1/crawl/{crawl_id}/full`
2. Check if iterations configured: `GET /api/v1/crawl/{crawl_id}/iterations`
3. Create baseline if missing: `POST /api/v1/crawl/{crawl_id}/iterations`

### "Cannot resume from checkpoint"

**Problem:** Resume fails with validation error

**Solution:**
1. Check checkpoint state: `GET /api/v1/crawl/{crawl_id}/checkpoints/latest`
2. Verify state is not terminal (completed/failed/cancelled)
3. Use different checkpoint if latest is terminal

### "High storage usage"

**Problem:** Checkpoints consuming too much disk space

**Solution:**
```bash
# Cleanup old checkpoints, keep last 3
curl -X POST "http://localhost:8000/api/v1/crawl/{crawl_id}/checkpoints/cleanup?keep_last=3"
```

---

## Next Steps

1. **Read Full Documentation:** [MULTI-ITERATION-SYSTEM.md](./MULTI-ITERATION-SYSTEM.md)
2. **View Architecture:** [ARCHITECTURE-DIAGRAMS.md](./ARCHITECTURE-DIAGRAMS.md)
3. **Explore API:** http://localhost:8000/docs
4. **Advanced Features:**
   - Scheduled iterations (coming soon)
   - Notifications on changes (coming soon)
   - Quality gates (coming soon)

---

**Last Updated:** January 20, 2026
**Questions?** Check the full documentation or API docs at `/docs`
