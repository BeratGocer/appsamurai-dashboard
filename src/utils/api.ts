import type { GameCountryPublisherGroup } from '@/types'

// Force Railway URL in production
const API_BASE = 'https://backend-production-80f6.up.railway.app'

export async function apiGetFiles(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/files`)
  if (!res.ok) throw new Error('files fetch failed')
  return res.json()
}

export async function apiInitFile(payload: {
  name: string;
  size: number;
  customerName?: string;
  accountManager?: string;
}): Promise<{ fileId: string; storageKey: string }> {
  const res = await fetch(`${API_BASE}/files/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('init failed')
  return res.json()
}

export async function apiIngestCsv(fileId: string, csvText: string): Promise<{ inserted: number }> {
  const res = await fetch(`${API_BASE}/files/${fileId}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: csvText,
  })
  if (!res.ok) throw new Error('ingest failed')
  return res.json()
}

export async function apiGetGroups(fileId: string): Promise<GameCountryPublisherGroup[]> {
  const res = await fetch(`${API_BASE}/files/${fileId}/groups`)
  if (!res.ok) throw new Error('groups fetch failed')
  return res.json()
}

export async function apiGetFileSettings(fileId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/files/${fileId}/settings`)
  if (!res.ok) throw new Error('settings fetch failed')
  return res.json()
}

export async function apiUpdateFileSettings(fileId: string, settings: any): Promise<any> {
  const res = await fetch(`${API_BASE}/files/${fileId}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings }),
  })
  if (!res.ok) throw new Error('settings update failed')
  return res.json()
}

export async function apiDeleteFile(fileId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/files/${fileId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('file deletion failed')
  return res.json()
}


