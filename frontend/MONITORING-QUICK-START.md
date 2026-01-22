# Monitoring Dashboard - Quick Start

Get the GenCrawl monitoring dashboard up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Backend API running on `http://localhost:8000`
- npm or pnpm package manager

## Installation

```bash
# Navigate to frontend directory
cd /Users/antonalexander/projects/gencrawl/frontend

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

Dashboard available at: `http://localhost:3000/dashboard`

---

## Quick Tour

### 1. Overview Tab (Landing Page)
- System health indicators
- Live metrics with sparklines
- Recent documents feed
- Error tracker

**When to use**: Quick system health check, see what's happening now

### 2. Active Crawls Tab
- Select specific crawl to monitor
- Visual state machine (queued → running → completed)
- Real-time metrics for selected crawl
- Document feed for that crawl

**When to use**: Deep dive into a specific crawl job

### 3. Logs Tab
- Real-time event streaming
- Search and filter logs
- Color-coded by event type
- Export to JSON

**When to use**: Debugging, auditing, detailed event tracking

### 4. Analytics Tab
- Charts: progress, types, sources, quality
- Export data to CSV
- Historical trends

**When to use**: Performance analysis, reporting, trends

---

## Common Tasks

### Start a Crawl
1. Enter query in top input field
2. Click "Start Crawl"
3. Automatically switches to "Active Crawls" tab
4. Watch progress in real-time

### Monitor Specific Crawl
1. Go to "Active Crawls" tab
2. Select crawl from dropdown (if multiple)
3. View state, metrics, documents, logs

### Search Logs
1. Go to "Logs" tab
2. Type in search box (searches all fields)
3. Or click filter icon → select event types
4. Export results with download button

### View Analytics
1. Go to "Analytics" tab
2. Select crawl or view all
3. Scroll through charts
4. Click "Export CSV" to download data

### Handle Errors
1. View in "Overview" tab or "Active Crawls"
2. Click error group to expand
3. View stack traces
4. Click "Retry" to reprocess

### Toggle Dark Mode
- Click sun/moon icon in top right
- Preference saved automatically
- Works across all tabs and refreshes

---

## Component Imports

```tsx
import { LogViewer } from '@/components/LogViewer'
import { CrawlerStateFlow } from '@/components/CrawlerStateFlow'
import { LiveMetrics } from '@/components/LiveMetrics'
import { DocumentFeed } from '@/components/DocumentFeed'
import { Analytics } from '@/components/Analytics'
import { ErrorTracker } from '@/components/ErrorTracker'
```

---

## Basic Usage Examples

### Show All Logs
```tsx
<LogViewer autoScroll={true} />
```

### Monitor Specific Crawl
```tsx
<CrawlerStateFlow crawlId="crawl-123" />
<LiveMetrics crawlId="crawl-123" />
<DocumentFeed crawlId="crawl-123" />
```

### Analytics Dashboard
```tsx
<Analytics crawlId="crawl-123" />
```

### Error Tracking
```tsx
<ErrorTracker crawlId="crawl-123" />
```

---

## API Endpoints Needed

Your backend must implement these endpoints:

### Required
```
GET  /api/v1/crawl/{crawl_id}/status
GET  /api/v1/logs/{crawl_id}
GET  /api/v1/crawl/{crawl_id}/documents
GET  /api/v1/crawl/{crawl_id}/analytics
GET  /api/v1/crawl/{crawl_id}/errors
```

### Optional
```
GET  /api/v1/logs/all
GET  /api/v1/documents/recent?limit={n}
GET  /api/v1/analytics/overview
GET  /api/v1/errors/all
POST /api/v1/crawl/retry
```

See MONITORING-DASHBOARD.md for full API specifications.

---

## Troubleshooting

### Dashboard shows "Loading..." forever
**Problem**: Backend API not responding
**Fix**:
1. Check backend is running: `curl http://localhost:8000/api/v1/health`
2. Check CORS is configured correctly
3. Open browser console for errors

### "No logs yet" message
**Problem**: Backend not returning logs
**Fix**:
1. Verify endpoint exists: `curl http://localhost:8000/api/v1/logs/all`
2. Check logs are being written to database
3. Verify response format matches expected schema

### Metrics show zero
**Problem**: Crawl hasn't started or data not flowing
**Fix**:
1. Start a crawl first
2. Check crawl status endpoint
3. Verify progress data in response

### Dark mode not working
**Problem**: Tailwind config issue
**Fix**:
1. Verify `tailwind.config.ts` has `darkMode: 'class'`
2. Restart dev server: `npm run dev`
3. Clear browser cache

### Charts not rendering
**Problem**: Recharts not installed or data format wrong
**Fix**:
1. Check installation: `npm list recharts`
2. Reinstall if needed: `npm install recharts`
3. Check browser console for errors

---

## Development Tips

### Hot Reload
- Changes to components auto-reload
- CSS changes apply instantly
- API endpoint changes require backend restart

### Testing Components
```tsx
// Test with mock data
<LogViewer
  crawlId="test-123"
  autoScroll={false}
/>
```

### Debugging
```tsx
// Add console logs in useEffect
useEffect(() => {
  console.log('Fetching logs for:', crawlId)
  // ... fetch logic
}, [crawlId])
```

### Performance
- Use browser DevTools → Performance tab
- Monitor network tab for failed requests
- Check React DevTools for re-renders

---

## Keyboard Shortcuts

- **⌘/Ctrl + K**: Focus search (in logs tab)
- **Escape**: Clear filters
- **Tab**: Navigate between interactive elements
- **Enter**: Submit forms

---

## Browser DevTools

### Useful Console Commands
```javascript
// Check dark mode state
document.documentElement.classList.contains('dark')

// Clear localStorage (reset theme)
localStorage.clear()

// Check for React errors
window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers
```

### Network Tab
Filter by:
- `logs` - See log polling
- `status` - See crawl status updates
- `analytics` - See chart data requests

---

## File Locations

```
Important files:
- Dashboard page: app/dashboard/page.tsx
- Components: components/*.tsx
- Styles: tailwind.config.ts
- Docs: MONITORING-DASHBOARD.md
```

---

## Getting Help

1. **Documentation**: Read MONITORING-DASHBOARD.md
2. **Examples**: See COMPONENT-USAGE.md
3. **Design**: Check DESIGN-SYSTEM.md
4. **Issues**: GitHub Issues or support email

---

## What's Next?

After getting the dashboard running:

1. **Customize**: Modify colors in DESIGN-SYSTEM.md
2. **Extend**: Add new components following patterns
3. **Integrate**: Connect your backend endpoints
4. **Deploy**: Build for production (`npm run build`)

---

## Production Deployment

```bash
# Build optimized bundle
npm run build

# Start production server
npm start

# Or deploy to Vercel/Netlify
# (they auto-detect Next.js)
```

---

## Support

Need help?
- Email: support@gencrawl.io
- GitHub: [gencrawl/issues](https://github.com/your-org/gencrawl/issues)
- Docs: See MONITORING-DASHBOARD.md

---

**Last updated**: 2026-01-20
**Version**: 1.0.0
**Status**: Production Ready

