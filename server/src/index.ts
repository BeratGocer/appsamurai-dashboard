import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { PrismaClient, Prisma } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()
const app = Fastify({ 
  logger: true,
  bodyLimit: 50 * 1024 * 1024 // 50MB limit
})

await app.register(cors, { origin: true })
await app.register(helmet)

// Ensure text uploads are parsed as strings (for CSV/chunked ingest)
app.addContentTypeParser('text/plain', { parseAs: 'string' }, (_req, body: string, done) => {
  done(null, body)
})
app.addContentTypeParser('text/csv', { parseAs: 'string' }, (_req, body: string, done) => {
  done(null, body)
})
app.addContentTypeParser('application/octet-stream', { parseAs: 'string' }, (_req, body: string, done) => {
  done(null, body)
})

app.get('/health', async () => ({ ok: true }))

// Types
interface InitBody {
  orgId?: string
  orgName?: string
  name: string
  size?: number
  storageKey?: string
  customerName?: string | null
  accountManager?: string | null
}

interface SettingsBody {
  settings: Record<string, unknown>
  updatedBy?: string | null
}

interface IngestParams { id: string }
interface IngestQuery { append?: string }

interface CampaignRowInput {
  fileId: string
  app: string
  campaignNetwork: string
  adgroupNetwork: string
  day: Date
  installs: number
  ecpi: number | string | null
  adjustCost: number | string | null
  adRevenue: number | string | null
  roas_d0: number | string | null
  roas_d7: number | string | null
  roas_d30: number | string | null
  roas_d45: number | string | null
}

interface AggregatedDate {
  date: string
  installs: number
  roas_d0: number
  roas_d7: number
  roas_d30: number
  adjustCost: number
  adRevenue: number
  ecpi?: number | null
}

interface GroupAgg {
  game: string
  country: string
  platform: string
  publisher: string
  byDate: Map<string, AggregatedDate>
}

// Minimal files endpoints (list/init placeholders)
app.get('/files', async (_req: FastifyRequest, reply: FastifyReply) => {
  const files = await prisma.file.findMany({ orderBy: { uploadedAt: 'desc' } })
  // Convert BigInt to string for JSON serialization
  const serializedFiles = files.map(file => ({
    ...file,
    size: file.size.toString()
  }))
  reply.send(serializedFiles)
})

app.post('/files/init', async (req: FastifyRequest<{ Body: InitBody }>, reply: FastifyReply) => {
  const body = req.body
  const orgId = body.orgId || 'demo-org'
  // Ensure organization exists to avoid FK errors in production
  await prisma.organization.upsert({
    where: { id: orgId },
    update: {},
    create: { id: orgId, name: body.orgName || 'Demo Org' },
  })
  const file = await prisma.file.create({
    data: {
      orgId,
      name: body.name,
      size: BigInt(body.size || 0),
      storageKey: body.storageKey || `uploads/${Date.now()}_${body.name}`,
      customerName: body.customerName || null,
      accountManager: body.accountManager || null,
    }
  })
  reply.send({ fileId: file.id, storageKey: file.storageKey })
})

app.get('/files/:id/settings', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  const { id } = req.params
  const settings = await prisma.fileSettings.findUnique({ where: { fileId: id } })
  reply.send(settings ?? { fileId: id, settings: {} })
})

app.patch('/files/:id/settings', async (req: FastifyRequest<{ Params: { id: string }, Body: SettingsBody }>, reply: FastifyReply) => {
  const { id } = req.params
  const body = req.body
  const saved = await prisma.fileSettings.upsert({
    where: { fileId: id },
    update: { settings: body.settings as Prisma.InputJsonValue, updatedBy: body.updatedBy || null },
    create: { fileId: id, settings: body.settings as Prisma.InputJsonValue, updatedBy: body.updatedBy || null },
  })
  reply.send(saved)
})

app.delete('/files/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  const { id } = req.params
  await prisma.campaignRow.deleteMany({ where: { fileId: id } })
  await prisma.fileSettings.deleteMany({ where: { fileId: id } })
  await prisma.file.delete({ where: { id } })
  reply.send({ ok: true })
})

function parseCampaignNetworkBasic(cn: string) {
  const result = { platform: 'Unknown', country: 'Global' }
  if (!cn) return result
  if (cn.includes('|') && cn.includes(':')) {
    const parts = cn.split('|')
    for (const p of parts) {
      const [k, v] = p.split(':')
      if (k === 'p') result.platform = v || 'Unknown'
      if (k === 'g') result.country = v || 'Global'
    }
    return result
  }
  const parts = cn.split('_')
  for (const part of parts) {
    if (['AND', 'Android', 'GP'].includes(part)) result.platform = 'Android'
    if (['iOS', 'IOS'].includes(part)) result.platform = 'iOS'
    if (['US','UK','GB','TR','DE','FR','KR','JP','CN','IN','BR','RU','CA','AU','MX'].includes(part)) result.country = part
  }
  return result
}

function normalizePublisherPrefix(adg: string): string {
  if (!adg) return 'Unknown'
  const m = adg.match(/^([A-Za-z]{3})_/)
  return m ? `${m[1]}_` : adg
}

app.post('/files/:id/ingest', async (req: FastifyRequest<{ Params: IngestParams, Querystring: IngestQuery }>, reply: FastifyReply) => {
  try {
    const { id } = req.params
    const { append } = req.query || {}
    const bodyText: string = typeof (req.body as unknown) === 'string' ? (req.body as string) : (req.body as { toString?: () => string })?.toString?.() || ''
    if (!bodyText || bodyText.trim().length === 0) return reply.code(400).send({ error: 'Empty body' })

    // Normalize newlines and trim trailing whitespace
    const normalized = bodyText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
    const lines = normalized.split('\n').filter((l: string) => l.length > 0)
    if (lines.length < 2) return reply.code(400).send({ error: 'No data rows' })

    // CSV helpers (handle quotes and commas inside quotes)
    const parseCsvLine = (line: string): string[] => {
      const out: string[] = []
      let cur = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Escaped quote
            cur += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (ch === ',' && !inQuotes) {
          out.push(cur)
          cur = ''
        } else {
          cur += ch
        }
      }
      out.push(cur)
      return out
    }

    // Parse header (strip BOM if exists)
    let headerLine = lines[0]
    if (headerLine.charCodeAt(0) === 0xFEFF) {
      headerLine = headerLine.slice(1)
    }
    const headers = parseCsvLine(headerLine).map((h: string) => h.trim())
    const idx = (name: string) => headers.indexOf(name)
    const iApp = idx('app')
    const iCN = idx('campaign_network')
    const iAN = idx('adgroup_network')
    const iDay = idx('day')
    const iInst = idx('installs')
    const iEcpi = idx('ecpi')
    const iCost = idx('adjust_cost') >= 0 ? idx('adjust_cost') : idx('cost')
    const iRev = idx('ad_revenue') >= 0 ? idx('ad_revenue') : idx('all_revenue')
    const iD0 = idx('roas_d0')
    const iD7 = idx('roas_d7')
    const iD30 = idx('roas_d30')
    const iD45 = idx('roas_d45')

    if (iApp < 0 || iCN < 0 || iAN < 0 || iDay < 0 || iInst < 0) {
      return reply.code(400).send({ error: 'Missing required headers' })
    }

    const rows: CampaignRowInput[] = []
    const toNullIfEmpty = (val: string | undefined) => {
      if (val === undefined) return null
      const t = val.trim()
      return t === '' ? null : t
    }
    for (let li = 1; li < lines.length; li++) {
      const row = lines[li]
      if (!row.trim()) continue
      const v = parseCsvLine(row)
      if (v.length < 5) continue
      rows.push({
        fileId: id,
        app: v[iApp] || '',
        campaignNetwork: v[iCN] || '',
        adgroupNetwork: v[iAN] || '',
        day: new Date(v[iDay] || Date.now()),
        installs: Number(v[iInst] || 0),
        ecpi: iEcpi >= 0 ? toNullIfEmpty(v[iEcpi]) : null,
        adjustCost: iCost >= 0 ? toNullIfEmpty(v[iCost]) : null,
        adRevenue: iRev >= 0 ? toNullIfEmpty(v[iRev]) : null,
        roas_d0: iD0 >= 0 ? toNullIfEmpty(v[iD0]) : null,
        roas_d7: iD7 >= 0 ? toNullIfEmpty(v[iD7]) : null,
        roas_d30: iD30 >= 0 ? toNullIfEmpty(v[iD30]) : null,
        roas_d45: iD45 >= 0 ? toNullIfEmpty(v[iD45]) : null,
      })
    }

    if (rows.length === 0) return reply.code(400).send({ error: 'No valid rows' })

    if (!append || append === '0' || append === 'false') {
      await prisma.campaignRow.deleteMany({ where: { fileId: id } })
    }
    // Batch insert to avoid parameter limits
    const batchSize = 1000
    for (let i = 0; i < rows.length; i += batchSize) {
      const slice = rows.slice(i, i + batchSize)
      await prisma.campaignRow.createMany({ data: slice })
    }
    reply.send({ inserted: rows.length, appended: !!append && append !== '0' && append !== 'false' })
  } catch (err) {
    req.log.error({ err }, 'ingest failed')
    reply.code(500).send({ error: 'ingest_failed' })
  }
})

// Grouped data with weighted averages by installs and publisher prefix
app.get('/files/:id/groups', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  const { id } = req.params
  const rows = await prisma.campaignRow.findMany({ where: { fileId: id } })
  type Key = string
  const map = new Map<Key, GroupAgg>()
  for (const r of rows) {
    const { platform, country } = parseCampaignNetworkBasic(r.campaignNetwork)
    const game = r.app.replace(/ Android$/, '').replace(/ iOS$/, '').trim()
    const publisher = normalizePublisherPrefix(r.adgroupNetwork)
    const key = `${game}|${country}|${platform}|${publisher}`
    if (!map.has(key)) map.set(key, { game, country, platform, publisher, byDate: new Map<string, AggregatedDate>() })
    const g = map.get(key)!
    const date = new Date(r.day).toISOString().split('T')[0]
    if (!g.byDate.has(date)) g.byDate.set(date, { date, installs: 0, roas_d0: 0, roas_d7: 0, roas_d30: 0, adjustCost: 0, adRevenue: 0 })
    const d = g.byDate.get(date)!
    const prevInst = d.installs
    const addInst = r.installs || 0
    const total = prevInst + addInst
    const wavg = (a: number, b: number) => total > 0 ? ((a * prevInst) + (b * addInst)) / total : 0
    d.roas_d0 = wavg(Number(d.roas_d0||0), Number(r.roas_d0||0))
    d.roas_d7 = wavg(Number(d.roas_d7||0), Number(r.roas_d7||0))
    d.roas_d30 = wavg(Number(d.roas_d30||0), Number(r.roas_d30||0))
    d.installs = total
    d.adjustCost += Number(r.adjustCost||0)
    d.adRevenue += Number(r.adRevenue||0)
    d.ecpi = d.installs > 0 ? d.adjustCost / d.installs : null
  }
  const groups = Array.from(map.values()).map((g: GroupAgg) => ({
    game: g.game,
    country: g.country,
    platform: g.platform,
    publisher: g.publisher,
    dailyData: Array.from(g.byDate.values()).sort((a: AggregatedDate, b: AggregatedDate)=>a.date.localeCompare(b.date))
  }))
  reply.send(groups)
})

const port = Number(process.env.PORT || 8787)
app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`Server listening on ${port}`)
})


