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

async function requestGoogleMessage(messages) {
  const model = process.env.GOOGLE_MODEL || 'gemini-3.6-flash'
  const contents = messages
    .filter((message) => typeof message?.content === 'string' && message.content.trim())
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content.trim() }],
    }))

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(process.env.GOOGLE_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'You are After Hours, a warm and grounded late-night companion. Be concise, supportive, and never claim to be a therapist.' }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
    }),
  })

  if (!response.ok) throw new Error(`Google API request failed: ${response.status}`)
  const data = await response.json()
  const message = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim()
  if (!message) throw new Error('Google API returned no message')
  return message
}

function fallbackResponse(messages) {
  return { message: buildFallbackMessage(messages), provider: 'local-fallback', fallback: true, watermark: 'LOCAL FALLBACK' }
}

export function createApp() {
  const app = express()
  const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'

  app.use(cors({ origin: [allowedOrigin, 'http://127.0.0.1:5173'] }))
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_request, response) => {
    const googleConfigured = process.env.AI_PROVIDER === 'google' && Boolean(process.env.GOOGLE_API_KEY)
    response.json({ ok: true, service: 'after-hours-api', chatConfigured: googleConfigured, provider: googleConfigured ? 'google' : 'local-fallback' })
  })

  app.post('/api/chat', (request, response) => {
    const messages = Array.isArray(request.body?.messages) ? request.body.messages : []
    if (!messages.length) return response.status(400).json({ error: 'At least one message is required.' })

    if (process.env.AI_PROVIDER !== 'google' || !process.env.GOOGLE_API_KEY) return response.json(fallbackResponse(messages))

    return requestGoogleMessage(messages)
      .then((message) => response.json({ message, provider: 'google', fallback: false, watermark: 'GOOGLE API' }))
      .catch(() => response.json(fallbackResponse(messages)))
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
