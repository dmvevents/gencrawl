# GenCrawl State Machine - Quick Reference

## Installation

```bash
cd /Users/antonalexander/projects/gencrawl/backend
pip install psutil pydantic fastapi websockets
```

## Import Statements

```python
# State Machine
from models.crawl_state import (
    CrawlState, CrawlSubstate, CrawlStateData,
    CrawlStateMachine, CrawlProgress
)

# Metrics
from utils.metrics import MetricsCollector, MetricsAggregator

# Events
from events.event_bus import (
    event_bus, EventType, CrawlEvent,
    emit_state_change, emit_progress_update,
    emit_document_found, emit_quality_assessed
)

# Manager
from crawlers.manager import CrawlerManager
```

## Common Patterns

### 1. Create and Execute Crawl

```python
manager = CrawlerManager()

# Create
crawl_id = manager.create_crawl({
    "crawler": "scrapy",
    "targets": ["https://example.com"],
    "strategy": "bfs"
}, user_id="user123")

# Execute (async)
await manager.execute_crawl(crawl_id)

# Check status
status = manager.get_status(crawl_id)
```

### 2. Monitor Progress with Events

```python
async def on_progress(event):
    if event.event_type == EventType.PROGRESS_UPDATE:
        print(f"Progress: {event.data['overall_percentage']}%")

event_bus.subscribe(crawl_id, on_progress)
```

### 3. Get Real-time Metrics

```python
# Get snapshot
metrics = manager.get_metrics(crawl_id)
latest_speed = metrics['metrics']['pages_per_second']['latest']

# Get collector directly
collector = manager.metrics_aggregator.collectors[crawl_id]
perf = collector.get_performance_summary()
```

### 4. Pause/Resume

```python
# Pause
await manager.pause_crawl(crawl_id)

# Resume
await manager.resume_crawl(crawl_id)

# Cancel
await manager.cancel_crawl(crawl_id)
```

### 5. Custom Event Handler

```python
async def my_handler(event: CrawlEvent):
    if event.event_type == EventType.ERROR:
        # Send alert
        send_alert(event.data['message'])
    elif event.event_type == EventType.DOCUMENT_FOUND:
        # Log to analytics
        log_document(event.data['url'])

event_bus.subscribe(crawl_id, my_handler)
```

## State Checks

```python
state_machine = manager.state_machines[crawl_id]

# Check state
is_running = state_machine.state_data.current_state == CrawlState.CRAWLING
is_done = state_machine.is_terminal_state()

# Check capabilities
can_pause = state_machine.can_pause()
can_resume = state_machine.can_resume()

# Get history
for transition in state_machine.state_data.state_history:
    print(f"{transition.from_state} -> {transition.to_state}")
```

## Metrics Recording

```python
collector = MetricsCollector(crawl_id)

# Record custom metric
collector.record("custom_metric", 42.0, {"context": "info"})

# Record system metrics
collector.record_system_metrics()

# Calculate throughput
throughput = collector.calculate_throughput(
    current_count=100,
    start_time=start_time,
    metric_name="pages_per_second"
)

# Calculate success rate
rate = collector.calculate_success_rate(successful=95, failed=5)

# Get aggregated metrics
agg = collector.get_aggregated_metrics(window_seconds=300)
```

## Event Emission

```python
# State change
await emit_state_change(crawl_id, "CRAWLING", "EXTRACTING")

# Progress update
await emit_progress_update(crawl_id, {
    "overall_percentage": 45.2,
    "urls": {"completed": 452, "total": 1000}
})

# Document found
await emit_document_found(
    crawl_id,
    "https://example.com/doc.pdf",
    "pdf",
    {"size": 1024000}
)

# Quality assessed
await emit_quality_assessed(crawl_id, "doc123", 0.85, True)

# Error
await emit_error(crawl_id, "timeout", "Connection timeout", {"url": "..."})
```

## API Request Examples

### cURL

```bash
# Get state
curl http://localhost:8000/api/v1/crawl/{crawl_id}/state

# Get metrics
curl http://localhost:8000/api/v1/crawl/{crawl_id}/metrics?aggregated=true

# Get time series
curl http://localhost:8000/api/v1/crawl/{crawl_id}/metrics/time-series?metric_name=pages_per_second

# Get events
curl http://localhost:8000/api/v1/crawl/{crawl_id}/events?limit=50

# Pause
curl -X POST http://localhost:8000/api/v1/crawl/{crawl_id}/pause

# Resume
curl -X POST http://localhost:8000/api/v1/crawl/{crawl_id}/resume

# Cancel
curl -X POST http://localhost:8000/api/v1/crawl/{crawl_id}/cancel
```

### Python (requests)

```python
import requests

base_url = "http://localhost:8000/api/v1"

# Get state
response = requests.get(f"{base_url}/crawl/{crawl_id}/state")
state = response.json()

# Pause
response = requests.post(f"{base_url}/crawl/{crawl_id}/pause")
result = response.json()
```

### WebSocket Client (Python)

```python
import asyncio
import websockets
import json

async def monitor_crawl(crawl_id):
    uri = f"ws://localhost:8000/api/v1/crawl/{crawl_id}/ws"

    async with websockets.connect(uri) as websocket:
        while True:
            message = await websocket.recv()
            event = json.loads(message)

            if event['event_type'] == 'PROGRESS_UPDATE':
                print(f"Progress: {event['data']['overall_percentage']}%")

asyncio.run(monitor_crawl(crawl_id))
```

### WebSocket Client (JavaScript)

```javascript
const ws = new WebSocket(`ws://localhost:8000/api/v1/crawl/${crawlId}/ws`);

ws.onopen = () => {
    console.log('Connected');
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch(data.event_type) {
        case 'STATE_CHANGE':
            updateState(data.data.to_state);
            break;
        case 'PROGRESS_UPDATE':
            updateProgress(data.data.overall_percentage);
            break;
        case 'ERROR':
            showError(data.data.message);
            break;
    }
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

ws.onclose = () => {
    console.log('Disconnected');
};
```

## Testing

```bash
# Run all tests
pytest tests/test_state_machine.py -v

# Run specific test
pytest tests/test_state_machine.py::TestCrawlStateMachine::test_valid_transition -v

# Run with coverage
pytest tests/test_state_machine.py --cov=models.crawl_state --cov=utils.metrics --cov=events.event_bus
```

## State Constants

```python
# Main states
CrawlState.QUEUED
CrawlState.INITIALIZING
CrawlState.CRAWLING
CrawlState.EXTRACTING
CrawlState.PROCESSING
CrawlState.COMPLETED
CrawlState.FAILED
CrawlState.PAUSED
CrawlState.CANCELLED

# Substates - Crawling
CrawlSubstate.DISCOVERING_URLS
CrawlSubstate.DOWNLOADING_PAGES
CrawlSubstate.DOWNLOADING_DOCUMENTS

# Substates - Extracting
CrawlSubstate.PDF_EXTRACTION
CrawlSubstate.OCR
CrawlSubstate.TABLE_DETECTION

# Substates - Processing
CrawlSubstate.METADATA_EXTRACTION
CrawlSubstate.QUALITY_SCORING
CrawlSubstate.DEDUPLICATION
CrawlSubstate.NEMO_CURATION
```

## Event Types

```python
# State events
EventType.STATE_CHANGE
EventType.SUBSTATE_CHANGE

# Progress events
EventType.PROGRESS_UPDATE
EventType.MILESTONE_REACHED

# Document events
EventType.DOCUMENT_FOUND
EventType.DOCUMENT_DOWNLOADED
EventType.DOCUMENT_PROCESSED

# Extraction events
EventType.EXTRACTION_STARTED
EventType.EXTRACTION_COMPLETE
EventType.EXTRACTION_FAILED

# Quality events
EventType.QUALITY_ASSESSED
EventType.QUALITY_THRESHOLD_PASSED
EventType.QUALITY_THRESHOLD_FAILED

# Page events
EventType.PAGE_CRAWLED
EventType.PAGE_FAILED

# Error events
EventType.ERROR
EventType.WARNING

# System events
EventType.METRICS_UPDATE
EventType.CRAWL_PAUSED
EventType.CRAWL_RESUMED
EventType.CRAWL_CANCELLED
EventType.CRAWL_COMPLETED
```

## Metric Names

```python
# Throughput
"pages_per_second"
"pages_per_minute"
"documents_per_second"

# Performance
"download_speed_mbps"
"download_bytes"
"avg_page_time"
"avg_extraction_time"

# Success
"success_rate"
"error_rate"

# Quality
"quality_score"
"quality_pass_rate"

# Resources
"memory_usage_mb"
"cpu_usage_percent"
"thread_count"

# Queue
"queue_size"
"active_tasks"
```

## Common Issues and Solutions

### Issue: Manager not retaining state
**Solution**: Use singleton pattern or dependency injection

```python
# Don't do this
manager = CrawlerManager()  # Creates new instance each time

# Do this
from functools import lru_cache

@lru_cache()
def get_manager():
    return CrawlerManager()

manager = get_manager()
```

### Issue: WebSocket disconnects
**Solution**: Implement reconnection logic

```javascript
let ws;
let reconnectInterval = 5000;

function connect() {
    ws = new WebSocket(url);

    ws.onclose = () => {
        setTimeout(connect, reconnectInterval);
    };
}
```

### Issue: Memory growth with long-running crawls
**Solution**: Clean up completed crawls

```python
# After crawl completes
event_bus.cleanup_crawl(crawl_id)
manager.metrics_aggregator.remove_collector(crawl_id)
```

### Issue: Metrics not updating
**Solution**: Ensure metrics are recorded regularly

```python
# In crawl loop
if page_count % 10 == 0:  # Every 10 pages
    metrics.record_system_metrics()
    await emit_metrics_update(crawl_id, metrics.get_performance_summary())
```

## Performance Tips

1. **Batch Event Emission**: Don't emit progress events on every page
   ```python
   if page_count % 10 == 0:  # Every 10 pages
       await emit_progress_update(crawl_id, progress_data)
   ```

2. **Limit Metric History**: Use bounded deques (already implemented)
   ```python
   points: deque = field(default_factory=lambda: deque(maxlen=1000))
   ```

3. **Aggregate Metrics**: Use aggregated endpoint for dashboards
   ```python
   metrics = collector.get_aggregated_metrics(window_seconds=300)
   ```

4. **Clean Up**: Remove data for completed crawls
   ```python
   event_bus.cleanup_crawl(crawl_id)
   ```

## Debugging

```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Check state machine
state = manager.get_state(crawl_id)
print(json.dumps(state, indent=2))

# Check metrics
metrics = manager.get_metrics(crawl_id)
print(json.dumps(metrics, indent=2))

# Check events
events = event_bus.get_history(crawl_id, limit=10)
for event in events:
    print(f"{event.timestamp}: {event.event_type} - {event.data}")

# Check state history
for transition in state_machine.state_data.state_history:
    print(f"{transition.timestamp}: {transition.from_state} -> {transition.to_state}")
```

## File Locations

```
/Users/antonalexander/projects/gencrawl/backend/
├── models/crawl_state.py              # State machine
├── utils/metrics.py                   # Metrics
├── events/event_bus.py                # Events
├── crawlers/manager.py                # Manager
├── api/routers/monitoring.py          # API
├── tests/test_state_machine.py        # Tests
├── STATE_MACHINE_DOCS.md              # Full docs
├── STATE_MACHINE_README.md            # Summary
├── STATE_DIAGRAMS.md                  # Diagrams
└── QUICK_REFERENCE.md                 # This file
```

## Resources

- Full Documentation: `STATE_MACHINE_DOCS.md`
- Visual Diagrams: `STATE_DIAGRAMS.md`
- Implementation Summary: `STATE_MACHINE_README.md`
- Unit Tests: `tests/test_state_machine.py`

---

**Last Updated**: January 20, 2026
