import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import pino from 'pino'
import { Pool } from 'pg'
import { randomUUID } from 'node:crypto'

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
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  })
  res.json({ status: 'ok' })
})

// Minimal persistence for files (id, name, size, upload_date, data JSON, customer_name, account_manager)
app.post('/api/files', async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: 'Database not configured' })
    const { name, size, uploadDate, data, customerName, accountManager } = req.body || {}
    if (!name || !size || !uploadDate || !Array.isArray(data)) return res.status(400).json({ error: 'Invalid payload' })
    await pool.query(`CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      size BIGINT NOT NULL,
      upload_date TEXT NOT NULL,
      data JSONB NOT NULL,
      customer_name TEXT,
      account_manager TEXT
    );`)
    
    // Add missing columns if they don't exist (migration)
    try {
      await pool.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS customer_name TEXT;`)
      await pool.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS account_manager TEXT;`)
    } catch (migrationErr) {
      logger.warn({ err: migrationErr }, 'Migration warning - columns may already exist')
    }
    
    const id = randomUUID()
    const result = await pool.query('INSERT INTO files(id,name,size,upload_date,data,customer_name,account_manager) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id', [id, name, size, uploadDate, JSON.stringify(data), customerName || null, accountManager || null])
    
    // Set cache control headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    })
    
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
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      size BIGINT NOT NULL,
      upload_date TEXT NOT NULL,
      data JSONB NOT NULL,
      customer_name TEXT,
      account_manager TEXT
    );`)
    
    // Add missing columns if they don't exist (migration)
    try {
      await pool.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS customer_name TEXT;`)
      await pool.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS account_manager TEXT;`)
    } catch (migrationErr) {
      logger.warn({ err: migrationErr }, 'Migration warning - columns may already exist')
    }
    
    const r = await pool.query('SELECT id, name, size, upload_date, customer_name, account_manager, jsonb_array_length(data) as record_count FROM files ORDER BY upload_date DESC')
    
    // Set cache control headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    })
    
    res.json({ files: r.rows })
  } catch (err) {
    logger.error({ err }, 'files list error')
    res.status(500).json({ error: 'List failed' })
  }
})

app.get('/api/files/:id', async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: 'Database not configured' })
    
    // Add missing columns if they don't exist (migration)
    try {
      await pool.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS customer_name TEXT;`)
      await pool.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS account_manager TEXT;`)
    } catch (migrationErr) {
      logger.warn({ err: migrationErr }, 'Migration warning - columns may already exist')
    }
    
    const r = await pool.query('SELECT id, name, size, upload_date, data, customer_name, account_manager FROM files WHERE id=$1', [req.params.id])
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    
    // Set cache control headers to prevent 304 responses
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    })
    
    res.json(r.rows[0])
  } catch (err) {
    logger.error({ err }, 'file get error')
    res.status(500).json({ error: 'Get failed' })
  }
})

// Delete file endpoint
app.delete('/api/files/:id', async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: 'Database not configured' })
    
    // Set cache control headers first
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    })
    
    const r = await pool.query('DELETE FROM files WHERE id=$1 RETURNING id', [req.params.id])
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    
    res.json({ id: r.rows[0].id, message: 'File deleted successfully' })
  } catch (err) {
    logger.error({ err }, 'file delete error')
    res.status(500).json({ error: 'Delete failed' })
  }
})

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error')
  res.status(500).json({ error: 'Internal Server Error' })
})

app.listen(PORT, () => {
  logger.info({ port: PORT, cors: CORS_ORIGINS }, 'Server started')
})


