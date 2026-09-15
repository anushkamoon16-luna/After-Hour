import test from 'node:test'
import assert from 'node:assert/strict'

import { createApp } from '../src/server.js'

test('chat endpoint uses a local fallback instead of Google API when no provider key is configured', async () => {
  const app = createApp()
  const server = app.listen(0, '127.0.0.1')

  await new Promise((resolve) => server.once('listening', resolve))
  const { port } = server.address()

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'I am replaying a bad conversation and cannot stop thinking about it.' }],
      }),
    })

    assert.equal(response.status, 200)
    const body = await response.json()
    assert.ok(body.message)
    assert.match(body.message, /replay|conversation|you|here/i)
    assert.equal(body.provider, 'local-fallback')
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
})
