import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()
const app = Fastify({ 
  logger: true,
  bodyLimit: 50 * 1024 * 1024 // 50MB limit
})

await app.register(cors, { origin: true })
await app.register(helmet)

app.get('/health', async () => ({ ok: true }))

// Minimal files endpoints (list/init placeholders)
app.get('/files', async (req, reply) => {
  const files = await prisma.file.findMany({ orderBy: { uploadedAt: 'desc' } })
  // Convert BigInt to string for JSON serialization
  const serializedFiles = files.map(file => ({
    ...file,
    size: file.size.toString()
  }))
  reply.send(serializedFiles)
})

app.post('/files/init', async (req, reply) => {
  const body = req.body as any
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

app.get('/files/:id/settings', async (req, reply) => {
  const { id } = req.params as any
  const settings = await prisma.fileSettings.findUnique({ where: { fileId: id } })
  reply.send(settings ?? { fileId: id, settings: {} })
})

app.patch('/files/:id/settings', async (req, reply) => {
  const { id } = req.params as any
  const body = req.body as any
  const saved = await prisma.fileSettings.upsert({
    where: { fileId: id },
    update: { settings: body.settings, updatedBy: body.updatedBy || null },
    create: { fileId: id, settings: body.settings, updatedBy: body.updatedBy || null },
  })
  reply.send(saved)
})

app.delete('/files/:id', async (req, reply) => {
  const { id } = req.params as any
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

app.post('/files/:id/ingest', async (req, reply) => {
  const { id } = req.params as any
  const { append } = (req.query as any) || {}
  const text = typeof req.body === 'string' ? req.body : (req.body as any)?.toString?.() || ''
  if (!text) return reply.code(400).send({ error: 'Empty body' })

  const lines = text.split(/\r?\n/).filter((l: string) => l.length > 0)
  if (lines.length < 2) return reply.code(400).send({ error: 'No data rows' })

  // Ensure the first line is a header; reject if not present
  const headerLine = lines[0]
  const headers = headerLine.split(',').map((h: string) => h.trim())
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

  const rows = [] as any[]
  for (let li = 1; li < lines.length; li++) {
    const row = lines[li]
    if (!row.trim()) continue
    const v = row.split(',')
    if (v.length < 5) continue
    rows.push({
      fileId: id,
      app: v[iApp] || '',
      campaignNetwork: v[iCN] || '',
      adgroupNetwork: v[iAN] || '',
      day: new Date(v[iDay] || Date.now()),
      installs: Number(v[iInst] || 0),
      ecpi: iEcpi >= 0 ? v[iEcpi] : null,
      adjustCost: iCost >= 0 ? v[iCost] : null,
      adRevenue: iRev >= 0 ? v[iRev] : null,
      roas_d0: iD0 >= 0 ? v[iD0] : null,
      roas_d7: iD7 >= 0 ? v[iD7] : null,
      roas_d30: iD30 >= 0 ? v[iD30] : null,
      roas_d45: iD45 >= 0 ? v[iD45] : null,
    })
  }

  if (rows.length === 0) return reply.code(400).send({ error: 'No valid rows' })

  if (!append || append === '0' || append === 'false') {
    await prisma.campaignRow.deleteMany({ where: { fileId: id } })
  }
  await prisma.campaignRow.createMany({ data: rows })
  reply.send({ inserted: rows.length, appended: !!append && append !== '0' && append !== 'false' })
})

// Grouped data with weighted averages by installs and publisher prefix
app.get('/files/:id/groups', async (req, reply) => {
  const { id } = req.params as any
  const rows = await prisma.campaignRow.findMany({ where: { fileId: id } })
  type Key = string
  const map = new Map<Key, any>()
  for (const r of rows) {
    const { platform, country } = parseCampaignNetworkBasic(r.campaignNetwork)
    const game = r.app.replace(/ Android$/, '').replace(/ iOS$/, '').trim()
    const publisher = normalizePublisherPrefix(r.adgroupNetwork)
    const key = `${game}|${country}|${platform}|${publisher}`
    if (!map.has(key)) map.set(key, { game, country, platform, publisher, byDate: new Map<string, any>() })
    const g = map.get(key)
    const date = new Date(r.day).toISOString().split('T')[0]
    if (!g.byDate.has(date)) g.byDate.set(date, { date, installs: 0, roas_d0: 0, roas_d7: 0, roas_d30: 0, adjustCost: 0, adRevenue: 0 })
    const d = g.byDate.get(date)
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
  const groups = Array.from(map.values()).map(g => ({
    game: g.game,
    country: g.country,
    platform: g.platform,
    publisher: g.publisher,
    dailyData: Array.from(g.byDate.values()).sort((a:any,b:any)=>a.date.localeCompare(b.date))
  }))
  reply.send(groups)
})

const port = Number(process.env.PORT || 8787)
app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`Server listening on ${port}`)
})


