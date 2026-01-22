'use client'

import { forwardRef, useState } from 'react'
import { Sparkles, Loader2, Layers3, Wand2, Compass, CheckCircle2, HelpCircle } from 'lucide-react'
import { crawlsApi, ApiError } from '@/lib/api/client'
import type { CrawlRecommendationResponse, CreateCrawlRequest } from '@/lib/api/client'

interface CrawlInputProps {
  onCrawlSubmitted: (crawlId: string) => void
}

const promptExamples = [
  'Find all CXC CSEC Mathematics past papers from 2020-2025',
  'Collect Caribbean education standards PDFs and exam guides',
  'Crawl government education portals for policy documents',
]

const fileTypeOptions = ['pdf', 'doc', 'docx', 'pptx', 'csv', 'html']

export const CrawlInput = forwardRef<HTMLTextAreaElement, CrawlInputProps>(function CrawlInput(
  { onCrawlSubmitted },
  ref
) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [strategy, setStrategy] = useState('auto')
  const [crawler, setCrawler] = useState('auto')
  const [depth, setDepth] = useState('standard')
  const [fileTypes, setFileTypes] = useState<string[]>(['pdf'])
  const [planConfig, setPlanConfig] = useState<Record<string, any> | null>(null)
  const [planning, setPlanning] = useState(false)
  const [wizardData, setWizardData] = useState<CrawlRecommendationResponse | null>(null)
  const [wizardLoading, setWizardLoading] = useState(false)
  const [wizardError, setWizardError] = useState('')
  const [useWizardSettings, setUseWizardSettings] = useState(false)

  const toggleFileType = (type: string) => {
    setFileTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]
    )
  }

  const handleSubmit = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError('')

    try {
      const payload: CreateCrawlRequest = {
        query,
        user_id: 'demo',
        output_format: 'pretraining',
        strategy,
        crawler,
        depth,
      }

      if (useWizardSettings && wizardData) {
        const wizardFilters = {
          ...(wizardData.config?.filters || {}),
          file_types: fileTypes,
        }
        if (wizardData.config?.targets?.length) {
          payload.targets = wizardData.config.targets
        }
        payload.filters = wizardFilters
        payload.limits = wizardData.recommended_limits
        if (wizardData.config?.respect_robots_txt !== undefined) {
          payload.respect_robots_txt = wizardData.config.respect_robots_txt
        }
      } else {
        payload.file_types = fileTypes
      }

      const data = await crawlsApi.create(payload)
      onCrawlSubmitted(data.crawl_id)
      setQuery('')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to submit crawl')
      }
      console.error('Failed to submit crawl:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePlan = async () => {
    if (!query.trim()) return
    setPlanning(true)
    setError('')

    try {
      const result = await crawlsApi.plan({
        query,
        user_id: 'demo',
        output_format: 'pretraining',
        strategy,
        crawler,
        depth,
        file_types: fileTypes,
      })
      setPlanConfig(result.config || null)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to generate crawl plan')
      }
    } finally {
      setPlanning(false)
    }
  }

  const handleWizard = async () => {
    if (!query.trim()) return
    setWizardLoading(true)
    setWizardError('')

    try {
      const result = await crawlsApi.recommendations({
        query,
        file_types: fileTypes,
      })
      setWizardData(result)
      setUseWizardSettings(true)
    } catch (err) {
      if (err instanceof ApiError) {
        setWizardError(err.message)
      } else {
        setWizardError('Failed to run crawl wizard')
      }
    } finally {
      setWizardLoading(false)
    }
  }

  return (
    <div className="gc-panel p-6">
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1.35fr_0.65fr]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[var(--gc-accent)]">
                <Wand2 size={18} />
                <span className="text-xs uppercase tracking-[0.3em] font-semibold">
                  Prompt Studio
                </span>
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--gc-ink)] font-display">
                Natural Language Crawl
              </h2>
              <p className="mt-2 text-sm text-[var(--gc-muted)]">
                Describe the documents you need and let the orchestrator build the crawl plan.
              </p>
            </div>
            <span className="gc-pill">
              <Sparkles size={14} />
              AI-orchestrated
            </span>
          </div>

          <div className="relative">
            <textarea
              ref={ref}
              className="w-full rounded-2xl border border-[var(--gc-border)] bg-[var(--gc-surface-muted)] p-4 text-sm text-[var(--gc-ink)] placeholder:text-[var(--gc-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gc-accent)]"
              rows={6}
              placeholder={`Describe what you want to crawl...\n\nExample: "Find all CXC CSEC Mathematics past papers from 2020-2025"`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
            <div className="mt-2 flex items-center justify-between text-xs text-[var(--gc-muted)]">
              <span>{query.length} characters</span>
              <span>Cmd/Ctrl + N to focus</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {promptExamples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setQuery(example)}
                className="rounded-full border border-[var(--gc-border)] px-3 py-1 text-xs text-[var(--gc-muted)] transition hover:border-[var(--gc-accent)] hover:text-[var(--gc-accent-strong)]"
              >
                {example}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="gc-button-secondary disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handlePlan}
              disabled={planning || !query.trim()}
            >
              {planning && <Loader2 className="animate-spin" size={18} />}
              {planning ? 'Planning...' : 'Generate Plan'}
            </button>
            <button
              className="gc-button-secondary disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleWizard}
              disabled={wizardLoading || !query.trim()}
            >
              {wizardLoading ? <Loader2 className="animate-spin" size={18} /> : <Compass size={18} />}
              {wizardLoading ? 'Scanning...' : 'Run Crawl Wizard'}
            </button>
            <button
              className="gc-button disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleSubmit}
              disabled={loading || !query.trim()}
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              {loading ? 'Submitting...' : 'Start Crawl'}
            </button>
            <div className="text-xs text-[var(--gc-muted)]">
              Output: JSONL ingestion-ready artifacts
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="gc-panel-muted p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--gc-ink)]">
              <Layers3 size={16} />
              Run Settings
            </div>
            <div className="mt-4 space-y-4 text-sm">
              <label className="flex flex-col gap-2 text-[var(--gc-muted)]">
                Strategy
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-[var(--gc-ink)]"
                >
                  <option value="auto">Auto (LLM decides)</option>
                  <option value="search-based">Search-based</option>
                  <option value="sitemap">Sitemap-first</option>
                  <option value="recursive">Recursive crawl</option>
                  <option value="focused">Focused extraction</option>
                </select>
              </label>

              <label className="flex flex-col gap-2 text-[var(--gc-muted)]">
                Crawler Backend
                <select
                  value={crawler}
                  onChange={(e) => setCrawler(e.target.value)}
                  className="rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-[var(--gc-ink)]"
                >
                  <option value="auto">Auto-select</option>
                  <option value="scrapy">Scrapy (fast HTTP)</option>
                  <option value="crawl4ai">Crawl4AI (LLM-ready)</option>
                  <option value="playwright">Playwright (JS-heavy)</option>
                </select>
              </label>

              <label className="flex flex-col gap-2 text-[var(--gc-muted)]">
                Depth
                <select
                  value={depth}
                  onChange={(e) => setDepth(e.target.value)}
                  className="rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-[var(--gc-ink)]"
                >
                  <option value="light">Light (quick scan)</option>
                  <option value="standard">Standard</option>
                  <option value="deep">Deep exploration</option>
                </select>
              </label>
            </div>
          </div>

          <div className="gc-panel-muted p-4">
            <p className="text-sm font-semibold text-[var(--gc-ink)]">File Types</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {fileTypeOptions.map((type) => {
                const active = fileTypes.includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleFileType(type)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      active
                        ? 'border-[var(--gc-accent)] bg-[var(--gc-accent-soft)] text-[var(--gc-accent-strong)]'
                        : 'border-[var(--gc-border)] text-[var(--gc-muted)] hover:border-[var(--gc-accent)]'
                    }`}
                    aria-pressed={active}
                  >
                    {type.toUpperCase()}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="gc-panel-muted p-4">
            <p className="text-sm font-semibold text-[var(--gc-ink)]">Plan Preview</p>
            <ul className="mt-3 space-y-2 text-xs text-[var(--gc-muted)]">
              <li>
                <span className="font-semibold text-[var(--gc-ink)]">Strategy:</span>{' '}
                {planConfig?.strategy || strategy}
              </li>
              <li>
                <span className="font-semibold text-[var(--gc-ink)]">Crawler:</span>{' '}
                {planConfig?.crawler || crawler}
              </li>
              <li>
                <span className="font-semibold text-[var(--gc-ink)]">Targets:</span>{' '}
                {(planConfig?.targets || []).slice(0, 2).join(', ') || 'LLM will decide'}
              </li>
              <li>
                <span className="font-semibold text-[var(--gc-ink)]">Files:</span>{' '}
                {planConfig?.filters?.file_types?.join(', ') || fileTypes.join(', ')}
              </li>
              <li>
                <span className="font-semibold text-[var(--gc-ink)]">Structure:</span>{' '}
                {planConfig?.output?.structure || 'region/program/level/subject/year/document_type/'}
              </li>
            </ul>
            <p className="mt-3 text-xs text-[var(--gc-muted)]">
              {planConfig
                ? 'Plan generated from your prompt. Review before launch.'
                : 'Generate a plan to preview crawl targets and taxonomy.'}
            </p>
          </div>

          <div className="gc-panel-muted p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--gc-ink)]">
                <Compass size={16} />
                Crawl Wizard
              </div>
              <button
                type="button"
                onClick={() => setUseWizardSettings((prev) => !prev)}
                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  useWizardSettings
                    ? 'border-emerald-400 bg-emerald-500/10 text-emerald-700'
                    : 'border-[var(--gc-border)] text-[var(--gc-muted)]'
                }`}
              >
                <CheckCircle2 size={14} />
                {useWizardSettings ? 'Using Wizard Settings' : 'Use Wizard Settings'}
              </button>
            </div>

            {wizardError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {wizardError}
              </div>
            )}

            {wizardData ? (
              <div className="space-y-3 text-xs text-[var(--gc-muted)]">
                <div className="flex flex-wrap gap-3">
                  <div>
                    <span className="font-semibold text-[var(--gc-ink)]">Docs Found:</span>{' '}
                    {wizardData.preview.documents_found}
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--gc-ink)]">URLs Checked:</span>{' '}
                    {wizardData.preview.checked_urls}
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--gc-ink)]">Sitemaps:</span>{' '}
                    {wizardData.preview.sitemaps.length}
                  </div>
                </div>

                <div>
                  <p className="text-[var(--gc-ink)] font-semibold">Recommended Limits</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {Object.entries(wizardData.recommended_limits).map(([key, value]) => (
                      <div key={key} className="rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-2 py-1">
                        <span className="text-[var(--gc-ink)]">{key.replace(/_/g, ' ')}</span>
                        <span className="ml-2 font-semibold text-[var(--gc-ink)]">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {wizardData.questions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-[var(--gc-ink)] font-semibold">
                      <HelpCircle size={14} />
                      Recommended Questions
                    </div>
                    <ul className="mt-2 space-y-1">
                      {wizardData.questions.map((question) => (
                        <li key={question}>{question}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {wizardData.preview.sample_urls.length > 0 && (
                  <div>
                    <p className="text-[var(--gc-ink)] font-semibold">Sample Hits</p>
                    <ul className="mt-2 space-y-1 break-all">
                      {wizardData.preview.sample_urls.slice(0, 3).map((url) => (
                        <li key={url}>{url}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-[var(--gc-muted)]">
                Run the wizard to scan quickly and get suggested limits + prompts.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

CrawlInput.displayName = 'CrawlInput'
