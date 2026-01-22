# GenCrawl Critical Fixes - Quick Reference

## 🚨 Top 5 Issues (Fix These First)

### 1. Missing Backend API Endpoints

**What's Broken:**
- `/api/v1/documents/recent` → 404 Not Found
- `/api/v1/crawl/stats` → 405 Method Not Allowed
- `/api/v1/logs/all` → Likely missing
- `/api/v1/errors/all` → Likely missing

**Impact:**
- Document Feed doesn't load
- Live Metrics don't update
- Logs tab is empty
- Error Tracker shows no errors

**Fix:** Implement these 4 endpoints in backend FastAPI code.

---

### 2. Hardcoded API URLs in All Components

**What's Broken:**
All 15+ components use `http://localhost:8000` hardcoded.

**Files Affected:**
```
CrawlInput.tsx:22
SystemHealth.tsx:13
CrawlHistoryTable.tsx:154
JobDetailModal.tsx:149,185,204,222
LiveMetrics.tsx:30
DocumentFeed.tsx:37
ErrorTracker.tsx:31
LogViewer.tsx:45
CrawlProgress.tsx:11
```

**Impact:** App breaks in production, can't configure different environments.

**Fix:** Create `lib/api/config.ts` and use environment variables.

---

### 3. No Error Boundaries

**What's Broken:**
App crashes with white screen when component errors occur.

**Impact:** Poor user experience, no graceful degradation.

**Fix:** Add `ErrorBoundary` component wrapping app layout.

---

### 4. No Centralized API Client

**What's Broken:**
Every component duplicates fetch logic (15+ places).

**Impact:**
- Code duplication
- Inconsistent error handling
- Hard to add auth/retry logic

**Fix:** Create `lib/api/client.ts` with typed API methods.

---

### 5. Missing Dark Mode in CrawlProgress

**What's Broken:**
`CrawlProgress.tsx` is the only component without dark mode support.

**Impact:** Inconsistent UI theming.

**Fix:** Add dark mode classes (30 minutes).

---

## 📦 Quick Fix Code Snippets

### Fix #1: API Config
```typescript
// lib/api/config.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// In any component
import { API_BASE_URL } from '@/lib/api/config'
const res = await fetch(`${API_BASE_URL}/api/v1/crawls`)
```

### Fix #2: Error Boundary
```typescript
// components/ErrorBoundary.tsx
'use client'

import { Component, ReactNode } from 'react'

export class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg"
          >
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  )
}
```

### Fix #3: API Client
```typescript
// lib/api/client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

class ApiClient {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`)
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }
    return response.json()
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }
    return response.json()
  }
}

export const api = new ApiClient()

// Usage in component
import { api } from '@/lib/api/client'

try {
  const data = await api.get('/api/v1/crawls')
  setCrawls(data.crawls)
} catch (error) {
  setError(error.message)
}
```

---

## 🧪 Testing the Fixes

### Test Checklist

**After implementing fixes, verify:**

1. ✅ Environment variables work
   ```bash
   # Set in .env.local
   NEXT_PUBLIC_API_URL=http://localhost:8000

   # Verify in browser console
   console.log(process.env.NEXT_PUBLIC_API_URL)
   ```

2. ✅ Error boundary catches errors
   ```typescript
   // Add temporary error to test
   throw new Error('Test error')
   // Should show error UI, not white screen
   ```

3. ✅ API client works for all endpoints
   ```typescript
   // Test in browser console
   import { api } from '@/lib/api/client'
   const data = await api.get('/api/v1/health')
   console.log(data)
   ```

4. ✅ Dark mode works everywhere
   ```javascript
   // Toggle dark mode and check all tabs
   document.documentElement.classList.add('dark')
   ```

5. ✅ All dashboard tabs load without errors
   - Overview tab
   - Active Crawls tab
   - History tab
   - Logs tab
   - Analytics tab

---

## 📋 Implementation Order

### Day 1: Foundation (4 hours)
1. Create `lib/api/config.ts` (15 min)
2. Create `lib/api/client.ts` (2 hours)
3. Add `ErrorBoundary` component (1 hour)
4. Add `.env.local` with proper variables (15 min)
5. Test in browser (30 min)

### Day 2: Replace Hardcoded URLs (3 hours)
1. Update CrawlInput.tsx
2. Update SystemHealth.tsx
3. Update CrawlHistoryTable.tsx
4. Update JobDetailModal.tsx
5. Update LiveMetrics.tsx
6. Update DocumentFeed.tsx
7. Update ErrorTracker.tsx
8. Update LogViewer.tsx
9. Update CrawlProgress.tsx
10. Test all components

### Day 3: Fix CrawlProgress Dark Mode (1 hour)
1. Add dark mode classes
2. Test in both themes

### Day 4: Backend Endpoints (6 hours)
1. Implement `/api/v1/documents/recent`
2. Implement `/api/v1/crawl/stats`
3. Implement `/api/v1/logs/*`
4. Implement `/api/v1/errors/*`
5. Test all endpoints with curl
6. Test frontend integration

### Day 5: Testing & Polish (2 hours)
1. Test complete user flows
2. Fix any remaining issues
3. Update documentation

**Total: ~16 hours (2 working days)**

---

## 🎯 Success Metrics

After fixes are complete, verify:

- [ ] No console errors on any page
- [ ] All 8 dashboard tabs load successfully
- [ ] Can create a new crawl job
- [ ] Can view crawl history
- [ ] Can view crawl details in modal
- [ ] Dark mode works consistently
- [ ] Environment variables configurable
- [ ] Error boundary catches component errors
- [ ] API calls go through centralized client
- [ ] No hardcoded localhost URLs in code

---

## 🔧 Backend Endpoints to Implement

### 1. Document Recent Endpoint
```python
# backend/routers/documents.py
@router.get("/documents/recent")
async def get_recent_documents(limit: int = 10):
    # TODO: Implement
    return {"documents": []}
```

### 2. Crawl Stats Endpoint
```python
# backend/routers/crawl.py
@router.get("/crawl/stats")
async def get_crawl_stats():
    # TODO: Implement
    return {
        "total_crawls": 0,
        "running": 0,
        "completed": 0,
        "failed": 0
    }
```

### 3. Logs Endpoints
```python
# backend/routers/logs.py
@router.get("/logs/all")
async def get_all_logs(limit: int = 100):
    # TODO: Implement
    return {"logs": []}

@router.get("/logs/{crawl_id}")
async def get_crawl_logs(crawl_id: str, limit: int = 100):
    # TODO: Implement
    return {"logs": []}
```

### 4. Errors Endpoints
```python
# backend/routers/errors.py
@router.get("/errors/all")
async def get_all_errors():
    # TODO: Implement
    return {"errors": []}

@router.get("/crawl/{crawl_id}/errors")
async def get_crawl_errors(crawl_id: str):
    # TODO: Implement
    return {"errors": []}
```

---

## 🚀 Deployment Checklist

Before going to production:

- [ ] All critical fixes implemented
- [ ] Environment variables set for production
- [ ] No hardcoded localhost URLs
- [ ] Error boundaries in place
- [ ] API client handles all errors
- [ ] Dark mode tested
- [ ] All dashboard tabs working
- [ ] CORS configured for production domain
- [ ] HTTPS enabled
- [ ] Rate limiting added
- [ ] Monitoring/logging configured

---

**Last Updated:** January 20, 2026
**Status:** Ready for implementation
