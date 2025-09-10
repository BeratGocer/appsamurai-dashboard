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
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

const pool = DATABASE_URL ? new Pool({ 
  connectionString: DATABASE_URL, 
  ssl: DATABASE_URL.includes('proxy.rlwy.net') ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
}) : undefined

// Initialize database schema once at startup
const initializeDatabase = async () => {
  if (!pool) return
  try {
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
    
    // Create file settings table
    await pool.query(`CREATE TABLE IF NOT EXISTS file_settings (
      file_id TEXT PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
      dashboard_settings JSONB,
      kpi_settings JSONB,
      hidden_tables JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`)
    
    logger.info('Database initialized successfully')
  } catch (err) {
    logger.error({ err }, 'Database initialization failed')
  }
}

app.use(helmet())
app.use(express.json({ limit: '10mb' }))
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (CORS_ORIGINS.length === 0) return cb(null, true)
    if (CORS_ORIGINS.includes(origin)) return cb(null, true)
    return cb(new Error('CORS blocked'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
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
    
    // Validate required fields
    if (!name || !size || !uploadDate) {
      return res.status(400).json({ error: 'Missing required fields: name, size, uploadDate' })
    }
    
    // Validate data array
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Data must be an array' })
    }
    
    // Check data size limit (prevent memory issues)
    if (data.length > 100000) {
      return res.status(400).json({ error: 'Data too large: maximum 100,000 records allowed' })
    }
    
    const id = randomUUID()
    
    // Add timeout for large data operations
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database operation timeout')), 30000)
    })
    
    const insertPromise = pool.query(
      'INSERT INTO files(id,name,size,upload_date,data,customer_name,account_manager) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id', 
      [id, name, size, uploadDate, JSON.stringify(data), customerName || null, accountManager || null]
    )
    
    const result = await Promise.race([insertPromise, timeoutPromise]) as any
    
    logger.info({ id, name, size, recordCount: data.length }, 'File uploaded successfully')
    res.json({ id: result.rows[0].id })
  } catch (err) {
    logger.error({ err, name: req.body?.name, size: req.body?.size }, 'files insert error')
    
    if (err.message === 'Database operation timeout') {
      return res.status(408).json({ error: 'Upload timeout - file too large' })
    }
    
    res.status(500).json({ error: 'Insert failed' })
  }
})

app.get('/api/files', async (_req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: 'Database not configured' })
    
    const r = await pool.query('SELECT id, name, size, upload_date, customer_name, account_manager, jsonb_array_length(data) as record_count FROM files ORDER BY upload_date DESC')
    
    res.json({ files: r.rows })
  } catch (err) {
    logger.error({ err }, 'files list error')
    res.status(500).json({ error: 'List failed' })
  }
})

app.get('/api/files/:id', async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: 'Database not configured' })
    
    const r = await pool.query('SELECT id, name, size, upload_date, data, customer_name, account_manager FROM files WHERE id=$1', [req.params.id])
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    
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
    
    const r = await pool.query('DELETE FROM files WHERE id=$1 RETURNING id', [req.params.id])
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    
    res.json({ id: r.rows[0].id, message: 'File deleted successfully' })
  } catch (err) {
    logger.error({ err }, 'file delete error')
    res.status(500).json({ error: 'Delete failed' })
  }
})

// File settings endpoints
app.get('/api/files/:id/settings', async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: 'Database not configured' })
    
    const r = await pool.query('SELECT dashboard_settings, kpi_settings, hidden_tables FROM file_settings WHERE file_id=$1', [req.params.id])
    if (r.rows.length === 0) {
      // Return default settings if none exist
      return res.json({
        dashboard_settings: { dateRange: { startDate: '', endDate: '' }, conditionalRules: [] },
        kpi_settings: { fileId: req.params.id, configs: [] },
        hidden_tables: []
      })
    }
    
    res.json(r.rows[0])
  } catch (err) {
    logger.error({ err }, 'file settings get error')
    res.status(500).json({ error: 'Get settings failed' })
  }
})

app.put('/api/files/:id/settings', async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: 'Database not configured' })
    
    const { dashboard_settings, kpi_settings, hidden_tables } = req.body || {}
    
    // Upsert settings
    await pool.query(`
      INSERT INTO file_settings (file_id, dashboard_settings, kpi_settings, hidden_tables, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (file_id) 
      DO UPDATE SET 
        dashboard_settings = EXCLUDED.dashboard_settings,
        kpi_settings = EXCLUDED.kpi_settings,
        hidden_tables = EXCLUDED.hidden_tables,
        updated_at = NOW()
    `, [req.params.id, JSON.stringify(dashboard_settings), JSON.stringify(kpi_settings), JSON.stringify(hidden_tables)])
    
    res.json({ message: 'Settings saved successfully' })
  } catch (err) {
    logger.error({ err }, 'file settings update error')
    res.status(500).json({ error: 'Update settings failed' })
  }
})

// ChatGPT API endpoint
app.post('/api/chat', async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' })
    }

    const { messages } = req.body || {}
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Sen AppSamurai Dashboard için yardımcı bir AI asistanısın. Kullanıcılar sana kampanya performansı, oyun verileri ve dashboard hakkında sorular sorabilir. Türkçe cevap ver ve kısa, net açıklamalar yap. Eğer kullanıcı belirli bir oyun veya publisher hakkında soru sorarsa, dashboard verilerini analiz etmelerine yardımcı ol.`
          },
          ...messages
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.status}`)
    }

    const data = await response.json()
    const reply = data.choices[0]?.message?.content || 'Üzgünüm, cevap oluşturulamadı.'
    
    res.json({ message: reply })
  } catch (err) {
    logger.error({ err }, 'chat API error')
    res.status(500).json({ error: 'Chat request failed' })
  }
})

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error')
  res.status(500).json({ error: 'Internal Server Error' })
})

app.listen(PORT, async () => {
  await initializeDatabase()
  logger.info({ port: PORT, cors: CORS_ORIGINS }, 'Server started')
})


