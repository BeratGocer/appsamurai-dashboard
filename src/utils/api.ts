const base = (import.meta as any).env?.VITE_API_BASE || ''

export async function health(): Promise<{ status: string }> {
  const res = await fetch(`${base}/api/health`)
  if (!res.ok) throw new Error(`health failed: ${res.status}`)
  return res.json()
}

export function getApiBase(): string {
  return base
}