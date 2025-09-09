const base = (import.meta as any).env?.VITE_API_BASE || ''

export async function health(): Promise<{ status: string }> {
  const res = await fetch(`${base}/api/health`)
  if (!res.ok) throw new Error(`health failed: ${res.status}`)
  return res.json()
}

export function getApiBase(): string {
  return base
}

export interface BackendFileMeta {
  id: string
  name: string
  size: number | string
  upload_date: string
  record_count?: number
  customer_name?: string
  account_manager?: string
}

export async function createFile(payload: { name: string; size: number; uploadDate: string; data: any[]; customerName?: string; accountManager?: string }): Promise<{ id: string }>{
  const res = await fetch(`${base}/api/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'public-demo-key'
    },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(`createFile failed: ${res.status}`)
  return res.json()
}

export async function listFiles(): Promise<{ files: BackendFileMeta[] }>{
  const res = await fetch(`${base}/api/files`, {
    headers: { 'x-api-key': 'public-demo-key' }
  })
  if (!res.ok) throw new Error(`listFiles failed: ${res.status}`)
  return res.json()
}

export async function getFile(id: string): Promise<{ id: string; name: string; size: number | string; upload_date: string; data: any[]; customer_name?: string; account_manager?: string }>{
  const res = await fetch(`${base}/api/files/${id}`, {
    headers: { 'x-api-key': 'public-demo-key' }
  })
  if (!res.ok) throw new Error(`getFile failed: ${res.status}`)
  return res.json()
}

export async function deleteFile(id: string): Promise<{ id: string; message: string }>{
  const res = await fetch(`${base}/api/files/${id}`, {
    method: 'DELETE',
    headers: { 'x-api-key': 'public-demo-key' }
  })
  if (!res.ok) throw new Error(`deleteFile failed: ${res.status}`)
  return res.json()
}

// File settings API
export interface FileSettings {
  dashboard_settings: {
    dateRange: { startDate: string; endDate: string }
    conditionalRules: any[]
    visibleColumns?: string[]
  }
  kpi_settings: {
    fileId: string
    configs: any[]
  }
  hidden_tables: string[]
}

export async function getFileSettings(fileId: string): Promise<FileSettings> {
  const res = await fetch(`${base}/api/files/${fileId}/settings`, {
    headers: { 'x-api-key': 'public-demo-key' }
  })
  if (!res.ok) throw new Error(`getFileSettings failed: ${res.status}`)
  return res.json()
}

export async function updateFileSettings(fileId: string, settings: FileSettings): Promise<{ message: string }> {
  const res = await fetch(`${base}/api/files/${fileId}/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'public-demo-key'
    },
    body: JSON.stringify(settings)
  })
  if (!res.ok) throw new Error(`updateFileSettings failed: ${res.status}`)
  return res.json()
}