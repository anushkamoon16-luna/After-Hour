import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import { getState, saveState } from './db.js'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') })

function buildFallbackMessage(messages) {
  const latestUser = [...messages].reverse().find((message) => message.role === 'user' && typeof message.content === 'string')
  const rawText = (latestUser?.content || '').trim()
  const preview = rawText.length > 80 ? `${rawText.slice(0, 77)}...` : rawText

  if (!preview) {
    return 'I am here with you. You do not have to carry every thought by yourself tonight.'
  }

  return `I am here with you. That replay loop can feel loud and sticky, and ${preview} does not need a perfect answer tonight.`
}

export function createApp() {
  const app = express()
  const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'

  app.use(cors({ origin: [allowedOrigin, 'http://127.0.0.1:5173'] }))
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true, service: 'after-hours-api', chatConfigured: false, provider: 'local-fallback' })
  })

  app.post('/api/chat', (request, response) => {
    const messages = Array.isArray(request.body?.messages) ? request.body.messages : []
    if (!messages.length) return response.status(400).json({ error: 'At least one message is required.' })

    return response.json({
      message: buildFallbackMessage(messages),
      provider: 'local-fallback',
    })
  })

  app.get('/api/state/:userId', (request, response) => {
    response.json({ userId: request.params.userId, state: getState(request.params.userId) })
  })

  app.put('/api/state/:userId', (request, response) => {
    if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) {
      return response.status(400).json({ error: 'State must be a JSON object.' })
    }
    return response.json({ userId: request.params.userId, state: saveState(request.params.userId, request.body) })
  })

  app.use((_request, response) => {
    response.status(404).json({ error: 'Route not found.' })
  })

  return app
}

const app = createApp()

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4000)
  app.listen(port, () => {
    console.log(`After Hours API listening on http://localhost:${port}`)
  })
}

export default app
