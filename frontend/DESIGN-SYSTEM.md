# Design System

Color palette, typography, and component styling guidelines for GenCrawl monitoring dashboard.

## Color Palette

### Light Mode

#### Primary Colors
- **Blue**: `bg-blue-600` (#2563eb) - Primary actions, links, active states
- **Blue Light**: `bg-blue-100` (#dbeafe) - Backgrounds, hover states
- **Blue Dark**: `bg-blue-700` (#1d4ed8) - Hover on primary actions

#### Semantic Colors
```
Success:  bg-green-600 (#16a34a)  text-green-600  border-green-200
Warning:  bg-yellow-600 (#ca8a04) text-yellow-600 border-yellow-200
Error:    bg-red-600 (#dc2626)    text-red-600    border-red-200
Info:     bg-cyan-600 (#0891b2)   text-cyan-600   border-cyan-200
```

#### Event Type Colors
```
crawl_start:     bg-blue-50    border-blue-200   text-blue-800
page_crawled:    bg-green-50   border-green-200  text-green-800
page_failed:     bg-red-50     border-red-200    text-red-800
document_found:  bg-purple-50  border-purple-200 text-purple-800
extraction:      bg-yellow-50  border-yellow-200 text-yellow-800
quality_check:   bg-cyan-50    border-cyan-200   text-cyan-800
error:           bg-red-100    border-red-300    text-red-900
```

#### Neutral Colors
```
Background:    bg-gray-50   (#f9fafb)
Surface:       bg-white     (#ffffff)
Border:        border-gray-200 (#e5e7eb)
Text Primary:  text-gray-900 (#111827)
Text Secondary: text-gray-600 (#4b5563)
Text Muted:    text-gray-500 (#6b7280)
```

### Dark Mode

#### Primary Colors
- **Blue**: `dark:bg-blue-600` (#2563eb)
- **Blue Light**: `dark:bg-blue-900/20` - Backgrounds with opacity

#### Neutral Colors
```
Background:    dark:bg-gray-900 (#111827)
Surface:       dark:bg-gray-800 (#1f2937)
Border:        dark:border-gray-700 (#374151)
Text Primary:  dark:text-white (#ffffff)
Text Secondary: dark:text-gray-400 (#9ca3af)
Text Muted:    dark:text-gray-500 (#6b7280)
```

#### Semantic Colors (Dark)
```
Success:  dark:bg-green-900/20  dark:text-green-300  dark:border-green-800
Warning:  dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800
Error:    dark:bg-red-900/20    dark:text-red-300    dark:border-red-800
Info:     dark:bg-cyan-900/20   dark:text-cyan-300   dark:border-cyan-800
```

## Typography

### Font Families
```css
/* System font stack (default) */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

/* Monospace (for code, logs) */
font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
```

### Font Sizes
```
text-xs:   0.75rem  (12px) - Badges, small labels
text-sm:   0.875rem (14px) - Secondary text, metadata
text-base: 1rem     (16px) - Body text
text-lg:   1.125rem (18px) - Section headers
text-xl:   1.25rem  (20px) - Component titles
text-2xl:  1.5rem   (24px) - Page section headers
text-4xl:  2.25rem  (36px) - Page titles
```

### Font Weights
```
font-medium:   500 - Headings, labels
font-semibold: 600 - Section headers
font-bold:     700 - Page titles, emphasis
```

## Spacing

### Padding/Margin Scale
```
p-2:  0.5rem  (8px)   - Tight spacing
p-3:  0.75rem (12px)  - Compact elements
p-4:  1rem    (16px)  - Standard padding
p-6:  1.5rem  (24px)  - Card/section padding
p-8:  2rem    (32px)  - Page margins
```

### Gap (for flex/grid)
```
gap-2: 0.5rem  (8px)   - Tight groups
gap-4: 1rem    (16px)  - Standard spacing
gap-6: 1.5rem  (24px)  - Section spacing
gap-8: 2rem    (32px)  - Major sections
```

## Border Radius

```
rounded:     0.25rem (4px)  - Small elements (badges)
rounded-lg:  0.5rem  (8px)  - Cards, buttons, inputs
rounded-full: 9999px         - Pills, avatars
```

## Shadows

```
shadow:    0 1px 3px rgba(0, 0, 0, 0.1)     - Subtle elevation
shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1)     - Cards
shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1)   - Modals, dropdowns
```

## Component Patterns

### Card
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
  {/* Content */}
</div>
```

### Section Header
```tsx
<h2 className="text-2xl font-semibold mb-4 dark:text-white">
  Section Title
</h2>
```

### Button (Primary)
```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
  Action
</button>
```

### Button (Secondary)
```tsx
<button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
  Cancel
</button>
```

### Input
```tsx
<input
  type="text"
  className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
/>
```

### Badge
```tsx
<span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs">
  Badge
</span>
```

### Metric Card
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Label</p>
  <p className="text-3xl font-bold dark:text-white">42</p>
</div>
```

### Status Badge
```tsx
{/* Success */}
<span className="px-3 py-1 rounded text-sm bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
  Completed
</span>

{/* Running */}
<span className="px-3 py-1 rounded text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
  Running
</span>

{/* Failed */}
<span className="px-3 py-1 rounded text-sm bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
  Failed
</span>
```

### Loading Skeleton
```tsx
<div className="animate-pulse space-y-4">
  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
  <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
</div>
```

### Empty State
```tsx
<div className="text-center py-8 text-gray-500 dark:text-gray-400">
  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
    <Icon size={32} />
  </div>
  <p className="font-medium">No items yet</p>
  <p className="text-sm">Get started by creating something</p>
</div>
```

## Animations

### Transitions
```css
transition-colors   /* 150ms - Color changes */
transition-all      /* 150ms - All properties */
transition-opacity  /* 150ms - Opacity only */
```

### Keyframe Animations
```tsx
{/* Fade In */}
<div className="animate-fadeIn">
  {/* Content appears smoothly */}
</div>

{/* Pulse (for active states) */}
<div className="animate-pulse">
  {/* Loading indicator */}
</div>

{/* Spin (for loaders) */}
<Loader2 className="animate-spin" />
```

### Custom Animations
Defined in `tailwind.config.ts`:
```typescript
animation: {
  'fadeIn': 'fadeIn 0.3s ease-out',
},
keyframes: {
  fadeIn: {
    '0%': { opacity: '0', transform: 'translateY(10px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
}
```

## Icons

Using `lucide-react` for consistent iconography:

```tsx
import {
  Activity,     // System status
  AlertCircle,  // Errors
  Award,        // Quality/achievements
  CheckCircle,  // Success
  Clock,        // Time/duration
  Download,     // Download actions
  FileText,     // Documents
  Filter,       // Filtering
  Loader2,      // Loading states (with animate-spin)
  Moon,         // Dark mode
  Search,       // Search functionality
  Sun,          // Light mode
  Tag,          // Tags/labels
  TrendingUp,   // Metrics/growth
  X,            // Close/dismiss
} from 'lucide-react'
```

**Icon Sizes**:
- Small: `size={16}` - Inline with text
- Medium: `size={20}` - Buttons, cards
- Large: `size={24}` - Headers, emphasis
- Hero: `size={32}` - Empty states

## Responsive Design

### Breakpoints
```
sm:  640px  - Mobile landscape
md:  768px  - Tablet
lg:  1024px - Desktop
xl:  1280px - Large desktop
```

### Grid Patterns
```tsx
{/* Responsive 1/2/3 column */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

{/* Responsive sidebar layout */}
<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
  <aside className="lg:col-span-1">{/* Sidebar */}</aside>
  <main className="lg:col-span-3">{/* Main content */}</main>
</div>

{/* Auto-fit columns */}
<div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6">
```

### Responsive Text
```tsx
{/* Responsive heading sizes */}
<h1 className="text-2xl md:text-3xl lg:text-4xl">

{/* Hide on mobile */}
<div className="hidden md:block">

{/* Show only on mobile */}
<div className="block md:hidden">
```

## Accessibility

### Focus States
```tsx
{/* Always include focus rings */}
<button className="focus:ring-2 focus:ring-blue-500 focus:outline-none">

{/* Visible focus for keyboard navigation */}
<input className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
```

### ARIA Labels
```tsx
<button aria-label="Toggle dark mode">
  <Moon size={20} />
</button>

<div role="status" aria-live="polite">
  Loading...
</div>
```

### Color Contrast
Minimum contrast ratios (WCAG AA):
- Normal text: 4.5:1
- Large text: 3:1
- UI components: 3:1

## Dark Mode Implementation

### Strategy
Using class-based dark mode with Tailwind:

```typescript
// tailwind.config.ts
{
  darkMode: 'class',
  // ...
}
```

### Toggle Implementation
```tsx
const [darkMode, setDarkMode] = useState(false)

useEffect(() => {
  const saved = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  if (saved === 'dark' || (!saved && prefersDark)) {
    setDarkMode(true)
    document.documentElement.classList.add('dark')
  }
}, [])

const toggleDarkMode = () => {
  setDarkMode(!darkMode)
  if (darkMode) {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  } else {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  }
}
```

### Component Pattern
Always pair light and dark classes:
```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  {/* Content */}
</div>
```

## File Type Colors

For document type indicators:

```typescript
const fileTypeColors: Record<string, string> = {
  pdf:  'text-red-600',
  doc:  'text-blue-600',
  docx: 'text-blue-600',
  xls:  'text-green-600',
  xlsx: 'text-green-600',
  ppt:  'text-orange-600',
  pptx: 'text-orange-600',
  txt:  'text-gray-600',
  md:   'text-purple-600',
  html: 'text-cyan-600',
}
```

## Quality Score Colors

```tsx
const getQualityColor = (score: number) => {
  if (score >= 80) return 'text-green-600 bg-green-100 dark:bg-green-900/20'
  if (score >= 60) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
  return 'text-red-600 bg-red-100 dark:bg-red-900/20'
}
```

## State Colors

```tsx
const stateColors = {
  queued:     'bg-gray-100 border-gray-300 text-gray-600',
  running:    'bg-blue-100 border-blue-500 text-blue-600',
  extracting: 'bg-purple-100 border-purple-500 text-purple-600',
  processing: 'bg-yellow-100 border-yellow-500 text-yellow-600',
  completed:  'bg-green-100 border-green-500 text-green-600',
  failed:     'bg-red-100 border-red-500 text-red-600',
}
```

## Best Practices

### 1. Consistency
- Use design tokens (Tailwind classes) instead of arbitrary values
- Follow established patterns for similar components
- Keep spacing consistent across pages

### 2. Performance
- Use `transition-colors` instead of `transition-all` when only colors change
- Prefer CSS animations over JavaScript for simple animations
- Lazy load heavy components (charts, images)

### 3. Accessibility
- Always include focus states
- Provide aria-labels for icon-only buttons
- Maintain color contrast ratios
- Support keyboard navigation

### 4. Responsive
- Mobile-first approach
- Test on multiple screen sizes
- Hide/show content appropriately
- Use responsive text sizes

### 5. Dark Mode
- Always pair light/dark classes
- Test in both modes
- Use opacity for subtle dark mode effects (`dark:bg-blue-900/20`)

---

Last updated: 2026-01-20
