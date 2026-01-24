'use client'

import { useMemo, useState, useEffect } from 'react'
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
import { integrationsApi, ingestApi, IntegrationConfig, IngestRunSummary } from '@/lib/api/client'

type IntegrationStatus = 'connected' | 'pending' | 'disconnected'

const integrations = [
  { id: 'outlook', name: 'Outlook 365', icon: Mail, detail: 'Pull attachments and shared inboxes.' },
  { id: 'gmail', name: 'Gmail', icon: Mail, detail: 'Import labeled mail threads and PDFs.' },
  { id: 'google_drive', name: 'Google Drive', icon: Cloud, detail: 'Sync shared drives and folders.' },
  { id: 'google_cloud_storage', name: 'Google Cloud Storage', icon: Server, detail: 'Ingest buckets with lifecycle rules.' },
  { id: 'sharepoint', name: 'SharePoint', icon: HardDrive, detail: 'Secure doc libraries & lists.' },
  { id: 'dropbox', name: 'Dropbox', icon: Cloud, detail: 'Sync folders and shared links.' },
  { id: 'azure_blob', name: 'Azure Blob Storage', icon: Server, detail: 'Container ingest with metadata tags.' },
  { id: 's3', name: 'S3 / Object Storage', icon: Server, detail: 'Bucket ingest with manifest.' },
  { id: 'web_uploads', name: 'Web Uploads', icon: Upload, detail: 'Drag & drop, bulk zip imports.' },
  { id: 'api_intake', name: 'API Intake', icon: PlugZap, detail: 'POST documents + metadata.' },
  { id: 'local_drive', name: 'Local Drive', icon: HardDrive, detail: 'Watch folders for local imports.' },
] as const

const integrationFields: Record<string, { key: string; label: string; placeholder?: string }[]> = {
  outlook: [
    { key: 'tenant_id', label: 'Tenant ID' },
    { key: 'mailbox', label: 'Mailbox (user or shared)' },
  ],
  gmail: [
    { key: 'label', label: 'Label (optional)' },
    { key: 'query', label: 'Gmail search query' },
  ],
  google_drive: [
    { key: 'drive_id', label: 'Drive ID' },
    { key: 'folder_id', label: 'Folder ID' },
  ],
  google_cloud_storage: [
    { key: 'bucket', label: 'Bucket name' },
    { key: 'prefix', label: 'Prefix (optional)' },
  ],
  sharepoint: [
    { key: 'site_url', label: 'Site URL' },
    { key: 'library', label: 'Library name' },
  ],
  dropbox: [
    { key: 'path', label: 'Path' },
  ],
  azure_blob: [
    { key: 'account', label: 'Storage account' },
    { key: 'container', label: 'Container name' },
  ],
  s3: [
    { key: 'bucket', label: 'Bucket name' },
    { key: 'prefix', label: 'Prefix (optional)' },
  ],
  web_uploads: [
    { key: 'collection', label: 'Collection name' },
  ],
  api_intake: [
    { key: 'collection', label: 'Collection name' },
  ],
  local_drive: [
    { key: 'path', label: 'Watch path' },
  ],
}

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
  const [integrationState, setIntegrationState] = useState<Record<string, IntegrationConfig>>({})
  const [integrationLoading, setIntegrationLoading] = useState(false)
  const [integrationError, setIntegrationError] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [activeIntegration, setActiveIntegration] = useState<string | null>(null)
  const [configValues, setConfigValues] = useState<Record<string, string>>({})
  const [secretRef, setSecretRef] = useState('')
  const [recentRuns, setRecentRuns] = useState<IngestRunSummary[]>([])

  const statusLabel = useMemo(
    () => ({
      connected: 'Connected',
      pending: 'Pending',
      disconnected: 'Not connected',
    }),
    []
  )

  const loadIntegrations = async () => {
    setIntegrationLoading(true)
    try {
      const response = await integrationsApi.list()
      const map: Record<string, IntegrationConfig> = {}
      response.integrations.forEach((integration) => {
        map[integration.id] = integration
      })
      setIntegrationState(map)
      setIntegrationError(null)
    } catch (err) {
      setIntegrationError(err instanceof Error ? err.message : 'Failed to load integrations')
    } finally {
      setIntegrationLoading(false)
    }
  }

  const handleConnect = async (id: string) => {
    setActiveIntegration(id)
    const existing = integrationState[id]?.config || {}
    const fields = integrationFields[id] || []
    const defaults: Record<string, string> = {}
    fields.forEach((field) => {
      defaults[field.key] = String(existing[field.key] ?? '')
    })
    setConfigValues(defaults)
    setSecretRef(String(existing.secret_ref ?? ''))
    setShowConfig(true)
  }

  const handleDisconnect = async (id: string) => {
    setIntegrationLoading(true)
    try {
      await integrationsApi.disconnect(id)
      await loadIntegrations()
    } catch (err) {
      setIntegrationError(err instanceof Error ? err.message : 'Failed to disconnect integration')
    } finally {
      setIntegrationLoading(false)
    }
  }

  const handleTest = async (id: string) => {
    setIntegrationLoading(true)
    try {
      await integrationsApi.test(id)
      await loadIntegrations()
    } catch (err) {
      setIntegrationError(err instanceof Error ? err.message : 'Failed to test integration')
    } finally {
      setIntegrationLoading(false)
    }
  }

  useEffect(() => {
    loadIntegrations()
    ingestApi.listRuns(5).then((resp) => setRecentRuns(resp.runs)).catch(() => setRecentRuns([]))
  }, [])

  const saveConfig = async () => {
    if (!activeIntegration) return
    setIntegrationLoading(true)
    try {
      await integrationsApi.connect(activeIntegration, configValues, false, secretRef || undefined)
      await loadIntegrations()
      setShowConfig(false)
    } catch (err) {
      setIntegrationError(err instanceof Error ? err.message : 'Failed to save integration config')
    } finally {
      setIntegrationLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Document Gateway"
        title="Ingestion & Document Understanding"
        description="Connect source systems, ingest documents at scale, and configure OCR + structure outputs for downstream AI workflows."
        actions={
          <>
            <button className="gc-button-secondary" onClick={loadIntegrations} disabled={integrationLoading}>
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
          {integrationError && (
            <div className="gc-panel-muted border-l-4 border-l-rose-400 p-3 text-xs text-rose-700">
              {integrationError}
            </div>
          )}
          <div className="gc-panel-muted p-3 text-xs text-[var(--gc-muted)]">
            Integration status is backed by the new integrations API. Configure credentials in Settings.
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {integrations.map((integration) => {
              const Icon = integration.icon
              const current = integrationState[integration.id]
              const status: IntegrationStatus = current?.status || 'disconnected'
              return (
                <div key={integration.name} className="gc-panel-muted p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[var(--gc-ink)] font-medium">
                      <Icon className="w-4 h-4 text-[var(--gc-muted)]" />
                      {integration.name}
                    </div>
                    <span className="text-xs uppercase tracking-wider text-[var(--gc-muted)]">
                      {statusLabel[status]}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--gc-muted)]">{integration.detail}</p>
                  <div className="flex items-center gap-2">
                    <button
                      className="gc-button-secondary text-xs"
                      disabled={integrationLoading}
                      onClick={() => (status === 'connected' ? handleDisconnect(integration.id) : handleConnect(integration.id))}
                    >
                      {status === 'connected' ? 'Disconnect' : 'Connect'}
                    </button>
                    <button
                      className="gc-button-secondary text-xs"
                      disabled={integrationLoading}
                      onClick={() => handleConnect(integration.id)}
                    >
                      {status === 'connected' ? 'Manage' : 'Configure'}
                    </button>
                    <button
                      className="gc-button-secondary text-xs"
                      disabled={integrationLoading || status !== 'connected'}
                      onClick={() => handleTest(integration.id)}
                    >
                      Test
                    </button>
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
                {recentRuns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-xs text-[var(--gc-muted)]">
                      No ingestion runs yet.
                    </td>
                  </tr>
                ) : (
                  recentRuns.map((run) => (
                    <tr key={run.crawl_id}>
                      <td className="px-4 py-3 text-[var(--gc-ink)]">{run.crawl_id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-[var(--gc-muted)]">{run.output?.structured_root ? 'Ingestion' : 'Unknown'}</td>
                      <td className="px-4 py-3 text-[var(--gc-muted)]">{run.counts?.ingested ?? '-'}</td>
                      <td className="px-4 py-3 text-[var(--gc-muted)]">{run.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--gc-muted)]">
            <LinkIcon className="w-4 h-4" />
            View full audit trail in the Ingestion page.
          </div>
        </div>
      </div>

      {showConfig && activeIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="gc-panel w-full max-w-2xl p-6 shadow-xl space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--gc-muted)]">Integration settings</p>
              <h3 className="text-lg font-semibold text-[var(--gc-ink)]">
                {integrations.find((item) => item.id === activeIntegration)?.name}
              </h3>
              <p className="text-xs text-[var(--gc-muted)] mt-1">
                Provide non-secret settings here. Use a secret reference (e.g., vault://...) for credentials.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {(integrationFields[activeIntegration] || []).map((field) => (
                <label key={field.key} className="text-xs text-[var(--gc-muted)]">
                  {field.label}
                  <input
                    value={configValues[field.key] || ''}
                    onChange={(event) =>
                      setConfigValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="mt-1 w-full rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-sm text-[var(--gc-ink)]"
                  />
                </label>
              ))}
              <label className="text-xs text-[var(--gc-muted)] md:col-span-2">
                Secret reference
                <input
                  value={secretRef}
                  onChange={(event) => setSecretRef(event.target.value)}
                  placeholder="vault://path/to/credential"
                  className="mt-1 w-full rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-sm text-[var(--gc-ink)]"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button className="gc-button-secondary" onClick={() => setShowConfig(false)}>
                Close
              </button>
              <button className="gc-button" onClick={saveConfig} disabled={integrationLoading}>
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
