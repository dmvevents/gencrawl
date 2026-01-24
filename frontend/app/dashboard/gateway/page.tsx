'use client'

import { useMemo, useState } from 'react'
import {
  Cloud,
  Mail,
  HardDrive,
  Link as LinkIcon,
  Upload,
  PlugZap,
  ShieldCheck,
  Server,
  Database,
  FileText,
  RefreshCw,
} from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'

type IntegrationStatus = 'connected' | 'pending' | 'disconnected'

const integrations = [
  { name: 'Outlook 365', icon: Mail, status: 'disconnected', detail: 'Pull attachments and shared inboxes.' },
  { name: 'Gmail', icon: Mail, status: 'disconnected', detail: 'Import labeled mail threads and PDFs.' },
  { name: 'Google Drive', icon: Cloud, status: 'disconnected', detail: 'Sync shared drives and folders.' },
  { name: 'SharePoint', icon: HardDrive, status: 'disconnected', detail: 'Secure doc libraries & lists.' },
  { name: 'Dropbox', icon: Cloud, status: 'disconnected', detail: 'Sync folders and shared links.' },
  { name: 'S3 / Object Storage', icon: Server, status: 'pending', detail: 'Bucket ingest with manifest.' },
  { name: 'Web Uploads', icon: Upload, status: 'connected', detail: 'Drag & drop, bulk zip imports.' },
  { name: 'API Intake', icon: PlugZap, status: 'connected', detail: 'POST documents + metadata.' },
] as const

const ocrModels = [
  { id: 'gemini', label: 'Gemini 2.5 Pro (Vision OCR)' },
  { id: 'openai', label: 'OpenAI Vision OCR' },
  { id: 'textract', label: 'AWS Textract' },
  { id: 'azure', label: 'Azure Document Intelligence' },
  { id: 'tesseract', label: 'Tesseract (Local)' },
]

const parsers = [
  { id: 'layout', label: 'Layout-aware extraction' },
  { id: 'tables', label: 'Table reconstruction' },
  { id: 'forms', label: 'Form key-value detection' },
  { id: 'math', label: 'Math/Formula preservation' },
]

const supportedFormats = [
  'PDF',
  'DOC/DOCX',
  'XLS/XLSX',
  'PPT/PPTX',
  'Images (PNG/JPG)',
  'HTML',
  'TXT/RTF',
]

export default function IngestionGatewayPage() {
  const [selectedModel, setSelectedModel] = useState('gemini')
  const [selectedParser, setSelectedParser] = useState<string[]>(['layout', 'tables'])
  const [structuredOutput, setStructuredOutput] = useState({
    markdown: true,
    jsonl: true,
    tables: true,
    entities: true,
  })

  const statusLabel = useMemo(
    () => ({
      connected: 'Connected',
      pending: 'Pending',
      disconnected: 'Not connected',
    }),
    []
  )

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Document Gateway"
        title="Ingestion & Document Understanding"
        description="Connect source systems, ingest documents at scale, and configure OCR + structure outputs for downstream AI workflows."
        actions={
          <>
            <button className="gc-button-secondary">
              <RefreshCw size={16} />
              Refresh status
            </button>
            <button className="gc-button">
              <Upload size={16} />
              New ingestion run
            </button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="gc-panel p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--gc-ink)] font-display">Integration Console</h2>
            <p className="text-sm text-[var(--gc-muted)]">
              Manage connectors for inboxes, drives, and storage buckets. Each integration feeds into the unified ingestion queue.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {integrations.map((integration) => {
              const Icon = integration.icon
              return (
                <div key={integration.name} className="gc-panel-muted p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[var(--gc-ink)] font-medium">
                      <Icon className="w-4 h-4 text-[var(--gc-muted)]" />
                      {integration.name}
                    </div>
                    <span className="text-xs uppercase tracking-wider text-[var(--gc-muted)]">
                      {statusLabel[integration.status]}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--gc-muted)]">{integration.detail}</p>
                  <div className="flex items-center gap-2">
                    <button className="gc-button-secondary text-xs">
                      {integration.status === 'connected' ? 'Manage' : 'Connect'}
                    </button>
                    {integration.status !== 'connected' && (
                      <button className="gc-button-secondary text-xs">
                        View setup
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="gc-panel p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--gc-ink)] font-display">Ingestion Runbook</h2>
            <p className="text-sm text-[var(--gc-muted)]">
              Standardize how documents move from source to structured output.
            </p>
          </div>
          <div className="space-y-3 text-sm text-[var(--gc-muted)]">
            <div className="flex items-start gap-3">
              <Database className="w-4 h-4 mt-0.5 text-[var(--gc-muted)]" />
              <div>
                <p className="text-[var(--gc-ink)] font-medium">1. Intake</p>
                <p>Queue documents from connectors or direct uploads.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 mt-0.5 text-[var(--gc-muted)]" />
              <div>
                <p className="text-[var(--gc-ink)] font-medium">2. Normalize</p>
                <p>Apply OCR + parsing profiles to extract structured content.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 mt-0.5 text-[var(--gc-muted)]" />
              <div>
                <p className="text-[var(--gc-ink)] font-medium">3. Structure</p>
                <p>Output JSONL, markdown, and tables ready for AI pipelines.</p>
              </div>
            </div>
          </div>
          <div className="gc-panel-muted p-4 text-xs text-[var(--gc-muted)]">
            Tip: Use the “Polite Research” preset for official ministries and exam boards.
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="gc-panel p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--gc-ink)] font-display">OCR + Parsing Profiles</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="gc-panel-muted p-4 space-y-2">
              <label className="text-xs uppercase tracking-wider text-[var(--gc-muted)]">OCR Model</label>
              <select
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                className="w-full rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-sm text-[var(--gc-ink)]"
              >
                {ocrModels.map((model) => (
                  <option key={model.id} value={model.id}>{model.label}</option>
                ))}
              </select>
              <p className="text-xs text-[var(--gc-muted)]">
                Current selection optimizes for tables, handwriting, and math layouts.
              </p>
            </div>

            <div className="gc-panel-muted p-4 space-y-2">
              <label className="text-xs uppercase tracking-wider text-[var(--gc-muted)]">Parsing Modules</label>
              <div className="space-y-2">
                {parsers.map((parser) => (
                  <label key={parser.id} className="flex items-center gap-2 text-sm text-[var(--gc-muted)]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--gc-accent)]"
                      checked={selectedParser.includes(parser.id)}
                      onChange={(event) => {
                        setSelectedParser((prev) =>
                          event.target.checked
                            ? [...prev, parser.id]
                            : prev.filter((item) => item !== parser.id)
                        )
                      }}
                    />
                    {parser.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="gc-panel p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--gc-ink)] font-display">Structured Outputs</h2>
          <div className="gc-panel-muted p-4 space-y-3">
            {[
              { key: 'markdown', label: 'Markdown narrative output' },
              { key: 'jsonl', label: 'JSONL for training pipelines' },
              { key: 'tables', label: 'Table extraction (CSV fragments)' },
              { key: 'entities', label: 'Entities + metadata tags' },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 text-sm text-[var(--gc-muted)]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--gc-accent)]"
                  checked={structuredOutput[item.key as keyof typeof structuredOutput]}
                  onChange={(event) =>
                    setStructuredOutput((prev) => ({
                      ...prev,
                      [item.key]: event.target.checked,
                    }))
                  }
                />
                {item.label}
              </label>
            ))}
          </div>
          <div className="gc-panel-muted p-4 text-xs text-[var(--gc-muted)]">
            Outputs are stored under <span className="font-mono">data/ingestion/&lt;run_id&gt;/</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="gc-panel p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--gc-ink)] font-display">Supported Formats</h2>
          <div className="flex flex-wrap gap-2">
            {supportedFormats.map((format) => (
              <span
                key={format}
                className="rounded-full border border-[var(--gc-border)] px-3 py-1 text-xs text-[var(--gc-muted)]"
              >
                {format}
              </span>
            ))}
          </div>
          <div className="gc-panel-muted p-4 text-xs text-[var(--gc-muted)]">
            Need a new format? Add a parser plugin and map it to the ingestion profile.
          </div>
        </div>

        <div className="gc-panel p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--gc-ink)] font-display">Recent Ingestion Runs</h2>
          <div className="overflow-hidden rounded-xl border border-[var(--gc-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gc-surface-muted)] text-left text-xs uppercase tracking-wider text-[var(--gc-muted)]">
                <tr>
                  <th className="px-4 py-3">Run</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Documents</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gc-border)]">
                {[
                  { id: 'SEA-2026-01', source: 'Web Uploads', docs: 42, status: 'Completed' },
                  { id: 'SEA-2026-02', source: 'S3 / Object Storage', docs: 120, status: 'Queued' },
                  { id: 'CXC-2025-04', source: 'API Intake', docs: 18, status: 'Ingesting' },
                ].map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-[var(--gc-ink)]">{row.id}</td>
                    <td className="px-4 py-3 text-[var(--gc-muted)]">{row.source}</td>
                    <td className="px-4 py-3 text-[var(--gc-muted)]">{row.docs}</td>
                    <td className="px-4 py-3 text-[var(--gc-muted)]">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--gc-muted)]">
            <LinkIcon className="w-4 h-4" />
            View full audit trail in the Ingestion page.
          </div>
        </div>
      </div>
    </div>
  )
}
