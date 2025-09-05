import Fastify from 'fastify'

console.log('🚀 Starting Railway backend v1.0.5...')

const app = Fastify({ 
  logger: true
})

app.get('/health', async () => ({ 
  ok: true, 
  timestamp: new Date().toISOString(),
  version: '1.0.5',
  status: 'Railway 502 fix - brand new backend'
}))

const port = Number(process.env.PORT || 8787)
app.listen({ port, host: '0.0.0.0' }).then(() => {
  console.log(`✅ Server listening on ${port}`)
}).catch((err) => {
  console.error('❌ Server failed to start:', err)
  process.exit(1)
})
