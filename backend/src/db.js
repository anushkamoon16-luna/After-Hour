import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const dataDirectory = path.resolve('database/data')
fs.mkdirSync(dataDirectory, { recursive: true })

const database = new Database(path.join(dataDirectory, 'after-hours.sqlite'))
database.pragma('journal_mode = WAL')
database.exec(`
  CREATE TABLE IF NOT EXISTS user_state (
    user_id TEXT PRIMARY KEY,
    state_json TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`)

const readState = database.prepare('SELECT state_json FROM user_state WHERE user_id = ?')
const writeState = database.prepare(`
  INSERT INTO user_state (user_id, state_json, updated_at)
  VALUES (?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(user_id) DO UPDATE SET
    state_json = excluded.state_json,
    updated_at = CURRENT_TIMESTAMP
`)

export function getState(userId) {
  const row = readState.get(userId)
  if (!row) return {}
  try {
    return JSON.parse(row.state_json)
  } catch {
    return {}
  }
}

export function saveState(userId, state) {
  writeState.run(userId, JSON.stringify(state))
  return state
}

export default database
