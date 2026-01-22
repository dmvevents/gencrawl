# Deployment Checklist

Pre-deployment verification for GenCrawl Monitoring Dashboard.

## Pre-Deployment

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] No console.error in production code
- [ ] Components properly typed
- [ ] Props interfaces exported
- [ ] No hardcoded URLs (use env vars)

### Testing
- [ ] Dashboard loads without errors
- [ ] All tabs switch correctly
- [ ] Dark mode toggle works
- [ ] Crawl submission creates entry
- [ ] Real-time updates fetch data
- [ ] Charts render correctly
- [ ] Export functions work (JSON, CSV)
- [ ] Responsive on mobile (320px+)
- [ ] Responsive on tablet (768px+)
- [ ] Responsive on desktop (1024px+)

### Backend Integration
- [ ] `/api/v1/crawl/{id}/status` implemented
- [ ] `/api/v1/logs/{id}` implemented
- [ ] `/api/v1/crawl/{id}/documents` implemented
- [ ] `/api/v1/crawl/{id}/analytics` implemented
- [ ] `/api/v1/crawl/{id}/errors` implemented
- [ ] `/api/v1/health` working
- [ ] CORS configured correctly
- [ ] Response formats match expected schemas
- [ ] Error responses handled gracefully

### Performance
- [ ] Bundle size < 500 KB (gzipped < 150 KB)
- [ ] Initial load < 3 seconds
- [ ] Tab switch < 500ms
- [ ] Chart render < 1 second
- [ ] No memory leaks in polling
- [ ] Images optimized
- [ ] Lazy loading enabled

### Accessibility
- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible
- [ ] ARIA labels on icon-only buttons
- [ ] Color contrast WCAG AA compliant
- [ ] Screen reader tested
- [ ] Semantic HTML used
- [ ] Alt text on images

### Security
- [ ] No API keys in frontend code
- [ ] XSS prevention (no dangerouslySetInnerHTML)
- [ ] CORS properly configured
- [ ] Input validation on forms
- [ ] Error messages don't leak sensitive info
- [ ] localStorage only for theme preference

### Environment Variables
- [ ] `.env.local` configured
- [ ] `NEXT_PUBLIC_API_URL` set
- [ ] Production API URL ready
- [ ] CORS origins whitelisted

## Build & Deploy

### Build Process
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build

# Test production build
npm start
```

### Build Verification
- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Bundle size acceptable
- [ ] Production build runs locally

### Deployment Options

#### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Option 2: Docker
```bash
# Build image
docker build -t gencrawl-dashboard .

# Run container
docker run -p 3000:3000 gencrawl-dashboard
```

#### Option 3: Manual
```bash
# Build
npm run build

# Copy to server
scp -r .next package.json server:/var/www/gencrawl/

# On server
cd /var/www/gencrawl
npm install --production
npm start
```

## Post-Deployment

### Smoke Tests
- [ ] Dashboard loads at production URL
- [ ] System health shows all services up
- [ ] Can submit a test crawl
- [ ] Logs appear in Logs tab
- [ ] Analytics charts render
- [ ] Dark mode toggle works
- [ ] Mobile view works
- [ ] No console errors

### Monitoring Setup
- [ ] Error tracking configured (Sentry?)
- [ ] Analytics configured (GA, Plausible?)
- [ ] Uptime monitoring enabled
- [ ] Performance monitoring enabled

### Documentation
- [ ] README updated with production URL
- [ ] API documentation updated
- [ ] User guide created
- [ ] Support contact info added

### Communication
- [ ] Team notified of deployment
- [ ] Changelog shared
- [ ] Known issues documented
- [ ] Rollback plan communicated

## Rollback Plan

If issues arise:

1. **Immediate**: Revert to previous version
   ```bash
   vercel rollback  # If using Vercel
   # Or redeploy previous Docker image
   ```

2. **Backend Issue**: Point to previous backend
   - Update `NEXT_PUBLIC_API_URL` env var
   - Redeploy

3. **Critical Bug**: Display maintenance page
   - Replace with static HTML
   - Show "Under Maintenance" message
   - Provide status page link

## Maintenance

### Daily
- [ ] Check error logs
- [ ] Monitor uptime
- [ ] Review user feedback

### Weekly
- [ ] Check bundle size
- [ ] Review performance metrics
- [ ] Update dependencies (security)

### Monthly
- [ ] Full dependency update
- [ ] Accessibility audit
- [ ] Performance audit
- [ ] Security scan

### Quarterly
- [ ] User survey
- [ ] Feature review
- [ ] Code refactoring
- [ ] Documentation update

## Success Metrics

Track these after deployment:

### User Experience
- Time to understand dashboard: < 2 minutes
- Time to find specific log: < 30 seconds
- Dark mode adoption: > 40%
- Mobile usage: > 20%

### Performance
- Initial load: < 3 seconds (target < 2s)
- Tab switch: < 500ms
- Real-time update latency: < 2 seconds
- Chart render: < 1 second

### Reliability
- Uptime: > 99.9%
- Error rate: < 0.1%
- Failed API calls: < 5%

## Emergency Contacts

- **DevOps**: [contact info]
- **Backend Team**: [contact info]
- **On-Call**: [contact info]

## Useful Commands

```bash
# Check deployment status
curl https://your-domain.com/api/health

# View logs (if using PM2)
pm2 logs gencrawl-dashboard

# Restart (if using PM2)
pm2 restart gencrawl-dashboard

# Check memory usage
pm2 monit

# View production build
npm run build && npm start
```

---

**Checklist Version**: 1.0.0
**Last Updated**: 2026-01-20
**Status**: Ready for Deployment
