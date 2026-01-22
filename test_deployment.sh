#!/bin/bash

echo "🧪 Testing GenCrawl Deployment..."
echo

# Test 1: API Health
echo "Test 1: API Health Check"
response=$(curl -s http://localhost:8000/api/v1/health 2>/dev/null)
if echo "$response" | grep -q '"status":"healthy"'; then
    echo "✅ API is healthy"
else
    echo "❌ API health check failed"
    echo "Response: $response"
fi
echo

# Test 2: Submit Crawl
echo "Test 2: Submit Natural Language Crawl"
response=$(curl -s -X POST http://localhost:8000/api/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{"query": "Find CXC CSEC Mathematics papers", "user_id": "test"}' 2>/dev/null)

crawl_id=$(echo "$response" | grep -o '"crawl_id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$crawl_id" ]; then
    echo "✅ Crawl submitted successfully"
    echo "Crawl ID: $crawl_id"
else
    echo "❌ Crawl submission failed"
    echo "Response: $response"
fi
echo

# Test 3: Check Status
if [ -n "$crawl_id" ]; then
    echo "Test 3: Check Crawl Status"
    sleep 3
    response=$(curl -s http://localhost:8000/api/v1/crawl/$crawl_id/status 2>/dev/null)
    if echo "$response" | grep -q '"crawl_id"'; then
        echo "✅ Status check successful"
        echo "Status: $(echo $response | grep -o '"current_state":"[^"]*"' | cut -d'"' -f4)"
    else
        echo "❌ Status check failed"
        echo "Response: $response"
    fi
fi
echo

# Test 4: Ingestion Pipeline
if [ -n "$crawl_id" ]; then
    echo "Test 4: Ingestion Pipeline"
    response=$(curl -s -X POST http://localhost:8000/api/v1/ingest \
      -H "Content-Type: application/json" \
      -d "{\"crawl_id\":\"$crawl_id\",\"overwrite\":true}" 2>/dev/null)

    ingested_count=$(echo "$response" | grep -o '"ingested_count":[0-9]*' | cut -d':' -f2)
    if [ -n "$ingested_count" ] && [ "$ingested_count" -gt 0 ]; then
        echo "✅ Ingestion completed"
        echo "Ingested documents: $ingested_count"
    else
        echo "❌ Ingestion failed or produced no documents"
        echo "Response: $response"
    fi
fi
echo

# Test 5: Dashboard
echo "Test 5: Dashboard Accessibility"
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:13000 2>/dev/null)
if [ "$response" = "200" ]; then
    echo "✅ Dashboard is accessible"
else
    echo "❌ Dashboard not accessible (HTTP $response)"
fi
echo

echo "🎉 Testing complete!"
echo
echo "Services:"
echo "  - API: http://localhost:8000"
echo "  - Docs: http://localhost:8000/docs"
echo "  - Dashboard: http://localhost:13000"
echo
