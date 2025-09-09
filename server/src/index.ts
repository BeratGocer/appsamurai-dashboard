import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import pino from 'pino'

const app = express()
const logger = pino()

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000
const API_KEY = process.env.API_KEY || ''
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)

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

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error')
  res.status(500).json({ error: 'Internal Server Error' })
})

app.listen(PORT, () => {
  logger.info({ port: PORT, cors: CORS_ORIGINS }, 'Server started')
})


