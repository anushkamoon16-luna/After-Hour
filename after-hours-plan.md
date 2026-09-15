# After Hours — Full Project Plan

A chatbot you text when you can't sleep. Vent, overthink, journal, play small games, or just talk — it remembers your ongoing stories across sessions.

---

## 1. Core Feature Set (MVP scope)

- **Vent/talk mode** — freeform chat, late-night tone (calm, non-clinical, non-preachy)
- **Overthink mode** — structured prompts to help spiral productively ("ok what's the actual worst case") instead of infinitely
- **Journal mode** — saved entries, mood tag, timestamp
- **Ongoing story memory** — the bot remembers threads across sessions ("how did that conversation with your roommate go?")
- **Mini games** — two truths and a lie, would-you-rather, word association, "roast my 3am thought" — light, low-stakes, distracting
- **Night-mode UI** — dark, minimal, soft. This is a large part of the product feel

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Tailwind, PWA (installable, feels app-like without App Store overhead) |
| Backend | Node.js + Express |
| Database | SQLite for MVP → Postgres when concurrent users / better full-text search are needed |
| AI | Claude API (Sonnet for main chat, Haiku for cheap background tasks like summarization) |
| Auth | Email magic link, or anonymous device-ID for low-friction late-night use |
| Realtime | WebSockets (socket.io) for typing indicators, streaming responses |
| Hosting | Render/Railway (backend), Vercel (frontend) |

---

## 3. The Memory System

The piece that separates After Hours from a basic wrapper. Don't dump full chat history into every prompt — it gets expensive and the model loses the plot. Use a **three-tier memory model**.

**Tier 1 — Working memory**
Last ~10–15 messages of the current session, passed raw.

**Tier 2 — Story threads**
A `threads` table. When the user mentions an ongoing situation (a person, a conflict, a decision), tag it as a thread. Each session, run a cheap background call (Haiku) that extracts: "any updates to existing threads?" and updates a short summary per thread.

```
threads: id, user_id, title, summary, status (active/resolved), last_updated
thread_messages: id, thread_id, message, created_at
```

**Tier 3 — User profile memory**
Slow-changing facts (name, general life context, recurring people), updated rarely, injected into every system prompt.

**At chat time:** pull user profile + top 2–3 relevant active threads (by recency/keyword match) + working memory → inject into system prompt. Keeps token cost sane and continuity real.

---

## 4. Data Model (core tables)

```
users: id, created_at, timezone, preferences (json)
sessions: id, user_id, started_at, mode (vent/journal/game)
messages: id, session_id, role, content, created_at
journal_entries: id, user_id, content, mood, created_at
threads: id, user_id, title, summary, status, updated_at
game_state: id, user_id, game_type, state (json), updated_at
```

---

## 5. AI Layer Design

- **System prompt** needs real personality work — warm, a little witty, never clinical/therapist-voice unless the user wants that. This is where the product lives or dies.
- **Safety layer is non-negotiable.** Late-night + emotional venting means a real chance of someone in distress. Build a lightweight classifier step (can be a Haiku call) that flags crisis language and triggers a resource-response path — a redirect with care, not a refusal. Bake this in from day one.
- Stream responses — feels alive, matters a lot at 3am when people want a fast reply.

---

## 6. Games Module

Keep it simple — a `game_type` enum with handlers, state stored as a JSON blob, Claude generates prompts/responses per game type. Flavor, not core loop — don't over-engineer.

---

## 7. Architecture — File Structure

```
after-hours/
├── frontend/
├── backend/
├── database/
├── docs/
└── README.md
```

### frontend/ (React + Tailwind PWA)

```
frontend/
├── public/
│   ├── manifest.json          # PWA config
│   └── icons/
├── src/
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── TypingIndicator.jsx
│   │   │   └── InputBar.jsx
│   │   ├── journal/
│   │   │   ├── JournalEntry.jsx
│   │   │   └── JournalList.jsx
│   │   ├── games/
│   │   │   ├── GameSelector.jsx
│   │   │   ├── TwoTruths.jsx
│   │   │   └── WouldYouRather.jsx
│   │   ├── shared/
│   │   │   ├── NightModeToggle.jsx
│   │   │   ├── ModeSwitcher.jsx       # vent/journal/game tabs
│   │   │   └── CrisisResourceCard.jsx
│   │   └── layout/
│   │       ├── Sidebar.jsx            # thread list
│   │       └── Header.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Journal.jsx
│   │   └── Games.jsx
│   ├── hooks/
│   │   ├── useSocket.js               # socket.io connection
│   │   ├── useAuth.js
│   │   └── useThreads.js
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── SessionContext.jsx
│   ├── api/
│   │   ├── client.js                  # axios/fetch base config
│   │   ├── chat.js
│   │   ├── journal.js
│   │   └── threads.js
│   ├── styles/
│   │   └── theme.js                   # night-mode palette, tokens
│   ├── App.jsx
│   └── main.jsx
├── tailwind.config.js
├── vite.config.js
└── package.json
```

### backend/ (Node + Express)

```
backend/
├── src/
│   ├── config/
│   │   ├── env.js                     # env var loader/validator
│   │   └── claude.js                  # Claude API client setup
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── chat.routes.js
│   │   ├── journal.routes.js
│   │   ├── threads.routes.js
│   │   └── games.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── chat.controller.js
│   │   ├── journal.controller.js
│   │   ├── threads.controller.js
│   │   └── games.controller.js
│   ├── services/
│   │   ├── claude.service.js          # prompt construction, streaming calls
│   │   ├── memory.service.js          # tier 1/2/3 memory assembly logic
│   │   ├── thread.service.js          # extract/update threads (Haiku calls)
│   │   ├── safety.service.js          # crisis-language classifier + redirect
│   │   └── summarizer.service.js      # background summarization jobs
│   ├── sockets/
│   │   ├── index.js                   # socket.io server setup
│   │   └── chat.socket.js             # streaming message events
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   ├── models/                        # DB access layer
│   │   ├── user.model.js
│   │   ├── session.model.js
│   │   ├── message.model.js
│   │   ├── thread.model.js
│   │   └── journal.model.js
│   ├── prompts/
│   │   ├── systemPrompt.js            # core personality
│   │   ├── overthinkPrompt.js
│   │   └── gamePrompts.js
│   ├── utils/
│   │   ├── logger.js
│   │   └── tokenCounter.js
│   └── app.js                         # Express app setup
├── server.js                          # entry point
├── .env.example
└── package.json
```

### database/ (SQLite → Postgres-ready)

```
database/
├── schema/
│   ├── 001_users.sql
│   ├── 002_sessions.sql
│   ├── 003_messages.sql
│   ├── 004_threads.sql
│   ├── 005_journal_entries.sql
│   └── 006_game_state.sql
├── migrations/
│   └── (numbered migration files as schema evolves)
├── seeds/
│   └── dev_seed.js                    # sample data for local dev
├── db.js                              # connection/init logic
└── knexfile.js                        # if using Knex for migrations — recommended
```

### docs/

```
docs/
├── architecture.md
├── memory-system.md                   # the tiered memory design
└── safety-guidelines.md               # crisis-response protocol details
```

### Key wiring notes

- Frontend never calls Claude directly — everything routes through `backend/services/claude.service.js`, so API keys stay server-side and memory injection is controlled centrally.
- `memory.service.js` ties `thread.model.js` + `user.model.js` + working session messages into one assembled context before every Claude call — the file that will take the most iteration.
- `safety.service.js` sits before the response is sent to the user — runs a lightweight check first, and either lets the normal flow continue or swaps in a care/resource response.
- `db.js` should use a driver-agnostic query layer if possible (Knex is a good fit) so the SQLite → Postgres migration later is a config change, not a rewrite.

---

## 8. Phased Roadmap

- **Phase 1 (MVP):** vent chat + basic journal + working memory only. Ship this first, no thread system yet.
- **Phase 2:** thread/story memory system + night-mode UI polish
- **Phase 3:** games + mood analytics ("your overthinking peaks on Sundays" type insights)
- **Phase 4:** notifications/check-ins, real SMS channel if desired

---

## 9. Immediate Next Build Step

A single-file MVP backend (`server.js`) already exists as a starting point: Express + SQLite + Claude API, covering `/api/chat`, `/api/journal`, `/api/threads`, with a basic local crisis-word check and mode-specific system prompts.

**Next real gap to close:** the thread-extraction job — a cheap Claude (Haiku) call run after each session that decides whether the conversation updates an existing thread or starts a new one, and writes to the `threads` table.
