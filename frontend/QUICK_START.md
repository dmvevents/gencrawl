# GenCrawl Landing Page - Quick Start Guide

## View the Landing Page

### Option 1: Development Server (Recommended)
```bash
cd /Users/antonalexander/projects/gencrawl/frontend
pnpm dev
```
Open: http://localhost:3000

### Option 2: Production Build
```bash
cd /Users/antonalexander/projects/gencrawl/frontend
pnpm build
pnpm start
```
Open: http://localhost:3000

## What You'll See

### 1. Hero Section (Top)
- Full-screen gradient background (blue → purple)
- Large "GenCrawl" heading
- Animated background blobs
- Two buttons:
  - **Launch Dashboard** → goes to /dashboard
  - **See Live Demo** → scrolls to demo section
- Stats: 100% Open Source, 3+ Crawlers, 0 Config

### 2. Features Section
6 feature cards explaining:
- Natural Language Interface
- Multi-Crawler Support (Scrapy, Crawl4AI, Playwright)
- NVIDIA Nemo Curator Compatible Output
- Real-Time Monitoring Dashboard
- 100% Open Source & Free
- LLM-Powered Quality (Claude, GPT)

### 3. Live Demo Section
- **Interactive demo** where you can:
  1. Type a query like "Find all CXC CSEC Math papers 2020-2025"
  2. Click "Analyze Query"
  3. See generated JSON configuration
  4. Copy config to clipboard
- **Try example queries** (4 pre-written examples)

### 4. Use Cases Section
4 real-world applications:
- **Caribbean Education**: SEA, CSEC, CAPE materials
- **Legal Documents**: Case law, statutes, regulations
- **Academic Papers**: ArXiv, PubMed research
- **Market Research**: Competitive intelligence

### 5. Tech Stack Section
6 technology categories showing all tools used:
- LLM Orchestration (Claude, GPT, Llama)
- Crawlers (Scrapy, Crawl4AI, Playwright)
- Data Processing (PyMuPDF, MinerU, OCR)
- Vector Storage (Weaviate, PostgreSQL)
- Task Queue (Celery, Redis, Flower)
- Infrastructure (Docker, FastAPI, Next.js)

### 6. Get Started Section
Quick start guide with:
- 4 code snippets (git clone, env setup, docker-compose)
- Copy button for each snippet
- Links to dashboard and GitHub
- Stats: <5 min setup, MIT license, $0 cost

### 7. Footer
Links to:
- Product pages (Features, Demo, Dashboard)
- Resources (GitHub, Docs, Issues)
- Community (Discord, Twitter, Discussions)

## Interactive Features

### ✅ Working Interactions
1. **Scroll to Demo**: Click "See Live Demo" button
2. **Example Queries**: Click any example to populate textarea
3. **Analyze Query**: Shows generated config after 2s
4. **Copy Buttons**: Copy config or code snippets
5. **Navigation**: All footer links work
6. **Hover Effects**: Cards scale and glow on hover

### 🔄 Simulated Features (Backend Not Connected)
- **Live Demo Analysis**: Uses 2-second delay + mock JSON (not real LLM)
- **Dashboard Link**: Points to /dashboard (needs backend running)

## Customization Examples

### Change Hero Gradient
```tsx
// components/landing/HeroSection.tsx
<div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800" />

// Change to green:
<div className="absolute inset-0 bg-gradient-to-br from-green-600 via-teal-600 to-blue-800" />
```

### Add a New Feature
```tsx
// components/landing/FeaturesSection.tsx
const features = [
  // ... existing features
  {
    icon: YourIcon, // from lucide-react
    title: 'Your Feature Name',
    description: 'Description of your feature',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  }
]
```

### Add Example Query
```tsx
// components/landing/LiveDemoSection.tsx
const exampleQueries = [
  // ... existing queries
  "Your custom example query here"
]
```

## Troubleshooting

### Port 3000 Already in Use
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or use different port
pnpm dev -p 3001
```

### TypeScript Errors
```bash
# Clear cache and rebuild
rm -rf .next
pnpm build
```

### Styles Not Loading
```bash
# Restart dev server
# Ctrl+C to stop
pnpm dev
```

## File Structure Reference

```
frontend/
├── app/
│   ├── page.tsx                    # ← Main landing page (imports all sections)
│   ├── layout.tsx                  # ← Root layout (fixed React.ReactNode)
│   ├── globals.css                 # ← Custom animations
│   └── dashboard/
│       └── page.tsx                # ← Dashboard page (separate)
│
├── components/
│   └── landing/                    # ← All landing page sections
│       ├── HeroSection.tsx         # ← Top hero with gradient
│       ├── FeaturesSection.tsx     # ← 6 feature cards
│       ├── LiveDemoSection.tsx     # ← Interactive demo
│       ├── UseCasesSection.tsx     # ← 4 use case cards
│       ├── TechStackSection.tsx    # ← Technology showcase
│       └── GetStartedSection.tsx   # ← Quick start guide
│
├── package.json                    # ← Dependencies
├── tailwind.config.ts              # ← Tailwind config
├── next.config.ts                  # ← Next.js config
│
└── Documentation/
    ├── LANDING_PAGE_README.md      # ← Full documentation
    ├── COMPONENT_CHECKLIST.md      # ← Implementation status
    └── QUICK_START.md              # ← This file
```

## Testing Checklist

### ✅ Quick Visual Test
1. Open http://localhost:3000
2. Scroll through all sections
3. Check animations play smoothly
4. Click "Launch Dashboard" button
5. Click "See Live Demo" button (should scroll)
6. Type in demo textarea
7. Click an example query
8. Click "Analyze Query"
9. Click copy buttons

### ✅ Responsive Test
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test at:
   - Mobile: 375px
   - Tablet: 768px
   - Desktop: 1440px
4. Verify layouts adapt correctly

### ✅ Performance Test
```bash
# Build production version
pnpm build

# Check bundle size (should be < 150KB First Load JS)
# Output shows route sizes
```

## Next Steps

1. ✅ Landing page is complete and working
2. 🔄 Connect backend API for live demo
3. 🔄 Implement dashboard page
4. 🔄 Add analytics tracking
5. 🔄 Deploy to production

## Need Help?

### Common Issues
- **Button not working?** Check browser console for errors
- **Styles look wrong?** Clear cache and reload
- **Animation stuttering?** Check GPU acceleration in browser
- **Build failing?** Check Node.js version (need 20+)

### Resources
- Next.js Docs: https://nextjs.org/docs
- Tailwind CSS: https://tailwindcss.com/docs
- Lucide Icons: https://lucide.dev/icons

---

**Status**: ✅ Ready to use
**Last Updated**: January 20, 2026
**Version**: 1.0.0
