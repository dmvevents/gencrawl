export type IntegrationConfig = {
  id: string
  name: string
  type: string
  description: string
  status: 'connected' | 'disconnected' | 'pending'
  config?: Record<string, any>
  updated_at?: string | null
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function fetchIntegrations(): Promise<IntegrationConfig[]> {
  const resp = await fetch(`${API_BASE}/api/v1/integrations`)
  if (!resp.ok) {
    throw new Error(`Failed to load integrations: ${resp.statusText}`)
  }
  const data = await resp.json()
  return data.integrations || []
}

export async function connectIntegration(id: string, config: Record<string, any> = {}, secretRef?: string) {
  const resp = await fetch(`${API_BASE}/api/v1/integrations/${id}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config, store_sensitive: false, secret_ref: secretRef }),
  })
  if (!resp.ok) {
    throw new Error(`Failed to connect: ${resp.statusText}`)
  }
  return resp.json()
}

export async function disconnectIntegration(id: string) {
  const resp = await fetch(`${API_BASE}/api/v1/integrations/${id}/disconnect`, {
    method: 'POST',
  })
  if (!resp.ok) {
    throw new Error(`Failed to disconnect: ${resp.statusText}`)
  }
  return resp.json()
}

export async function testIntegration(id: string) {
  const resp = await fetch(`${API_BASE}/api/v1/integrations/${id}/test`, {
    method: 'POST',
  })
  if (!resp.ok) {
    throw new Error(`Failed to test: ${resp.statusText}`)
  }
  return resp.json()
}

export type IngestRunSummary = {
  crawl_id: string
  status: string
  created_at?: string | null
  updated_at?: string | null
  counts?: Record<string, any> | null
  output?: Record<string, any> | null
}

export async function fetchIngestRuns(limit = 5): Promise<IngestRunSummary[]> {
  const resp = await fetch(`${API_BASE}/api/v1/ingest/runs?limit=${limit}`)
  if (!resp.ok) {
    throw new Error(`Failed to load ingest runs: ${resp.statusText}`)
  }
  const data = await resp.json()
  return data.runs || []
}
