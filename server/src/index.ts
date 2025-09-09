import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import pino from 'pino'
import { Pool } from 'pg'

const app = express()
const logger = pino()

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000
const API_KEY = process.env.API_KEY || ''
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
const DATABASE_URL = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || ''

const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('proxy.rlwy.net') ? { rejectUnauthorized: false } : undefined }) : undefined

app.use(helmet())
app.use(express.json({ limit: '10mb' }))
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (CORS_ORIGINS.length === 0) return cb(null, true)
    if (CORS_ORIGINS.includes(origin)) return cb(null, true)
    return cb(new Error('CORS blocked'))
  }
}))

// API key guard
app.use((req, res, next) => {
  if (req.path === '/api/health') return next()
  const key = req.header('x-api-key')
  if (!API_KEY || key === API_KEY) return next()
  return res.status(401).json({ error: 'Unauthorized' })
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Minimal persistence for files (id, name, size, upload_date, data JSON)
app.post('/api/files', async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: 'Database not configured' })
    const { name, size, uploadDate, data } = req.body || {}
    if (!name || !size || !uploadDate || !Array.isArray(data)) return res.status(400).json({ error: 'Invalid payload' })
    await pool.query(`CREATE TABLE IF NOT EXISTS files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      size BIGINT NOT NULL,
      upload_date TEXT NOT NULL,
      data JSONB NOT NULL
    );`)
    const result = await pool.query('INSERT INTO files(name,size,upload_date,data) VALUES ($1,$2,$3,$4) RETURNING id', [name, size, uploadDate, JSON.stringify(data)])
    res.json({ id: result.rows[0].id })
  } catch (err) {
    logger.error({ err }, 'files insert error')
    res.status(500).json({ error: 'Insert failed' })
  }
})

app.get('/api/files', async (_req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: 'Database not configured' })
    await pool.query(`CREATE TABLE IF NOT EXISTS files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      size BIGINT NOT NULL,
      upload_date TEXT NOT NULL,
      data JSONB NOT NULL
    );`)
    const r = await pool.query('SELECT id, name, size, upload_date, jsonb_array_length(data) as record_count FROM files ORDER BY upload_date DESC')
    res.json({ files: r.rows })
  } catch (err) {
    logger.error({ err }, 'files list error')
    res.status(500).json({ error: 'List failed' })
  }
})

app.get('/api/files/:id', async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: 'Database not configured' })
    const r = await pool.query('SELECT id, name, size, upload_date, data FROM files WHERE id=$1', [req.params.id])
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    res.json(r.rows[0])
  } catch (err) {
    logger.error({ err }, 'file get error')
    res.status(500).json({ error: 'Get failed' })
  }
})

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error')
  res.status(500).json({ error: 'Internal Server Error' })
})

app.listen(PORT, () => {
  logger.info({ port: PORT, cors: CORS_ORIGINS }, 'Server started')
})


