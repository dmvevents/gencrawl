# GenCrawl Landing Page

## Overview

Professional, modern landing page for GenCrawl - an intelligent web crawling system with natural language interface.

## Components

All landing page components are located in `/components/landing/`:

### 1. **HeroSection.tsx**
- Full-screen gradient background (blue to purple)
- Animated background patterns
- Compelling tagline and description
- Dual CTA buttons (Dashboard + Live Demo)
- Stats showcase (100% Open Source, 3+ Crawlers, 0 Config)
- Scroll indicator animation

### 2. **FeaturesSection.tsx**
- 6 key features with icons from lucide-react:
  - Natural Language Interface
  - Multi-Crawler Support (Scrapy, Crawl4AI, Playwright)
  - NVIDIA Nemo Curator Compatible
  - Real-Time Monitoring Dashboard
  - 100% Open Source & Free
  - LLM-Powered Quality (Claude Sonnet 4.5, GPT-5.2)
- Responsive grid (1/2/3 columns)
- Hover effects with scale and shadow

### 3. **LiveDemoSection.tsx**
- Interactive textarea for natural language queries
- 4 example queries as clickable suggestions
- "Analyze Query" button with loading state
- Simulated LLM analysis (2s delay)
- Displays generated JSON configuration
- Copy to clipboard functionality
- Success message with deployment info

### 4. **UseCasesSection.tsx**
- 4 use cases with gradient headers:
  - **Caribbean Education**: SEA, CSEC, CAPE past papers
  - **Legal Document Aggregation**: Case law, statutes
  - **Academic Paper Collection**: ArXiv, PubMed
  - **Market Research**: Competitive intelligence
- Each card shows specific examples
- CTA for custom crawlers

### 5. **TechStackSection.tsx**
- 6 technology categories:
  - **LLM Orchestration**: Claude Sonnet 4.5, GPT-5.2, Llama 3.3
  - **Crawlers**: Scrapy, Crawl4AI, Playwright
  - **Data Processing**: PyMuPDF, MinerU, Tesseract OCR
  - **Vector Storage**: Weaviate, OpenAI Embeddings, PostgreSQL
  - **Task Queue**: Celery, Redis, Flower
  - **Infrastructure**: Docker Compose, FastAPI, Next.js 15
- Color-coded gradient headers
- Descriptions for each tool

### 6. **GetStartedSection.tsx**
- 4-step quick start guide with code snippets
- Copy to clipboard for each step
- Docker Compose highlight box
- Dual CTA buttons (Dashboard + GitHub)
- Stats: <5 min setup, MIT license, $0 self-hosted cost

## Design System

### Color Palette
```css
Primary Blue:    #3B82F6
Purple:          #8B5CF6
Green:           #10B981
Orange:          #F59E0B
Pink:            #EC4899
Gray:            #6B7280
```

### Typography
- **Headings**: font-bold, text-4xl to text-7xl
- **Body**: text-base (16px), leading-relaxed
- **Small**: text-sm (14px)
- **Code**: font-mono, bg-gray-900, text-green-400

### Responsive Breakpoints
- **Mobile**: < 640px (single column)
- **Tablet**: 640px - 1024px (2 columns)
- **Desktop**: > 1024px (3-4 columns)

### Animations
Custom CSS animations in `globals.css`:
- `fade-in-up`: 0.8s ease-out (entry animation)
- `scroll`: 2s infinite (scroll indicator)
- `pulse`: Built-in Tailwind (background blobs)

## Usage

### Development
```bash
cd frontend
pnpm dev
# Opens http://localhost:3000
```

### Production Build
```bash
pnpm build
pnpm start
```

### File Structure
```
frontend/
├── app/
│   ├── page.tsx                    # Main landing page
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles + animations
│   └── dashboard/
│       └── page.tsx                # Dashboard (separate page)
├── components/
│   └── landing/
│       ├── HeroSection.tsx
│       ├── FeaturesSection.tsx
│       ├── LiveDemoSection.tsx
│       ├── UseCasesSection.tsx
│       ├── TechStackSection.tsx
│       └── GetStartedSection.tsx
└── package.json
```

## Customization

### Change Colors
Edit gradient classes in components:
```tsx
// Example: Change hero gradient
<div className="bg-gradient-to-br from-blue-600 to-purple-600" />
```

### Add/Remove Features
Edit `features` array in `FeaturesSection.tsx`:
```tsx
const features = [
  {
    icon: YourIcon,
    title: 'Your Feature',
    description: 'Description here',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  }
]
```

### Modify Example Queries
Edit `exampleQueries` in `LiveDemoSection.tsx`:
```tsx
const exampleQueries = [
  "Your custom example query here"
]
```

## Accessibility

- ✅ Semantic HTML (section, main, footer)
- ✅ Proper heading hierarchy (h1 → h2 → h3)
- ✅ Alt text for icons (via aria-labels where needed)
- ✅ Keyboard navigation (all interactive elements)
- ✅ Focus states (ring-2 on focus)
- ✅ Color contrast (WCAG AA compliant)

## Performance

### Optimizations Applied
- ✅ Client-side components (`'use client'`)
- ✅ No external image dependencies (icon-based)
- ✅ Minimal JavaScript (React + Next.js only)
- ✅ CSS animations (GPU-accelerated)
- ✅ Static generation (`pnpm build` pre-renders)
- ✅ Code splitting (automatic with Next.js)

### Performance Targets
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse Score**: > 90
- **Bundle Size**: < 150KB (First Load JS)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

To add a new section:

1. Create component in `/components/landing/NewSection.tsx`
2. Import in `/app/page.tsx`
3. Add to component order
4. Update this README

## License

MIT License - Same as GenCrawl project

## Author

Created for GenCrawl by Claude Code

---

**Last Updated**: January 20, 2026
**Version**: 1.0.0
