import { useEffect, useState } from 'react'
import './App.css'
import './GameAccessibility.css'
import { loadRemoteState, saveRemoteState, sendChatMessage } from './api'

const starterMessages = [
  { id: 1, role: 'assistant', time: '11:47 PM', content: "Hey. You made it here. What's taking up all the room in your head?" },
  { id: 2, role: 'user', time: '11:49 PM', content: 'I keep replaying a conversation from today and finding new ways I could have messed it up.' },
  { id: 3, role: 'assistant', time: '11:49 PM', content: "That late-night replay loop is convincing, but it isn't always telling the truth. Want to look at what actually happened, or just get it off your chest?" },
]

const starterJournalEntries = [
  { date: 'Tonight, 11:38 PM', mood: 'Restless', title: 'The things I am carrying', preview: 'I do not need to solve everything before I sleep...' },
  { date: 'Yesterday, 10:12 PM', mood: 'Soft', title: 'A tiny good thing', preview: 'The light from the kitchen was on when I got home...' },
]

const starterChatHistory = [
  { id: 'conversation', title: 'That conversation', detail: 'Tonight · 3 messages' },
  { id: 'sunday', title: 'Sunday feelings', detail: 'Yesterday · 8 messages' },
  { id: 'figure-out', title: 'Things to figure out', detail: 'Sep 7 · 12 messages' },
]

const moodOptions = ['Tender', 'Restless', 'Heavy', 'Bright', 'Numb', 'Hopeful']

const readStored = (key, fallback) => {
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

const todayLabel = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const games = [
  { id: 'questions', group: 'bored', icon: '◌', title: '20 Questions', text: 'A curious little guessing game.', how: 'Ask yes-or-no questions until you guess the soft thing.', prompt: 'I am thinking of something soft. Ask me a yes-or-no question.' },
  { id: 'this-that', group: 'bored', icon: '⇄', title: 'This or That', text: 'Rapid-fire choices, friend-text style.', how: 'Pick one of two options quickly. There is no wrong answer.', prompt: 'Late-night snack: sweet or salty?' },
  { id: 'would', group: 'racing', icon: '◇', title: 'Would You Rather', text: 'A binary question with no emotional lift needed.', how: 'Choose the option that feels easiest. You can change your mind.', prompt: 'Would you rather always have perfect timing or always know exactly what to say?' },
  { id: 'words', group: 'racing', icon: '✳', title: 'Word Association Chain', text: 'Follow a neutral thread, one word at a time.', how: 'Reply with the first neutral word that comes to mind.', prompt: 'The first word is: moonlight. What word comes next?' },
  { id: 'sprint', group: 'racing', icon: '5', title: 'Category Sprint', text: 'Name five things before your brain wanders.', how: 'Name five things in the category. Speed matters less than play.', prompt: 'Name 5 comfort foods. No overthinking the list.' },
  { id: 'roast', group: 'low', icon: '☼', title: 'Roast My 3AM Thought', text: 'A kind little reframe for a dramatic spiral.', how: 'Share the thought, and we will tease the spiral without teasing you.', prompt: 'Your 3AM thought is wearing a tiny detective hat and needs a nap.' },
  { id: 'truth', group: 'low', icon: '◒', title: 'Two Truths and a Lie', text: 'Playfully curious, with no heavy self-focus.', how: 'Make three statements about yourself and let the other player guess the lie.', prompt: 'I have never seen the ocean. I can fold my tongue. I once met a famous person.' },
  { id: 'nostalgia', group: 'low', icon: '⌁', title: 'Would You Rather: Nostalgia', text: 'Pick the warm, low-stakes memory.', how: 'Choose between two cozy memories and notice which one makes you smile.', prompt: 'Childhood snack or childhood show?' },
  { id: 'grounding', group: 'anxious', icon: '5', title: '5-4-3-2-1 Find It', text: 'A scavenger hunt, not an exercise.', how: 'Find the objects around you like you are on a gentle treasure hunt.', prompt: 'Find 5 things in the room that are blue, green, or grey.' },
  { id: 'story', group: 'anxious', icon: '…', title: 'Slow Build Story', text: 'Add one gentle line to a tiny story.', how: 'Add one sentence, then let the story come back to you.', prompt: 'The window opened, and a paper boat floated in...' },
]

const gameGroups = [
  { id: 'bored', title: 'When you are just bored or lonely', note: 'Low-stakes, friendly little detours.' },
  { id: 'racing', title: 'When your mind is racing', note: 'Simple prompts to give your attention somewhere else to go.' },
  { id: 'low', title: 'When your mood is low', note: 'Warm reframes and playful questions, never forced positivity.' },
  { id: 'anxious', title: 'When you feel anxious or overstimulated', note: 'Gentle finding games with no clinical language.' },
]

function Splash({ onContinue }) {
  return <main className="welcome-screen"><div className="welcome-orbit orbit-one" /><div className="welcome-orbit orbit-two" /><div className="welcome-content"><span className="welcome-mark">✦</span><p className="welcome-kicker">A SOFT PLACE TO LAND</p><h1>after<br /><i>hours.</i></h1><p className="welcome-copy">For the thoughts that get louder<br />when everything else goes quiet.</p><button type="button" className="primary-button welcome-button" onClick={onContinue}>come in <span>↗</span></button><p className="welcome-footnote">private by default · gentle by design</p></div></main>
}

function Onboarding({ onFinish }) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [comfort, setComfort] = useState('listen')
  return <main className="onboarding-screen"><div className="onboarding-top"><span className="auth-brand"><span>✦</span> after hours</span><span className="step-count">1 of 1</span></div><section className="onboarding-card"><span className="large-star">✳</span><p className="eyebrow">JUST A FEW THINGS</p><h1>Let us meet<br /><i>you gently.</i></h1><p className="auth-copy">This helps us make the room feel a little more like yours. Nothing here is shared.</p><form onSubmit={(event) => { event.preventDefault(); onFinish(name || 'A') }}><label>What should we call you?<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your first name" required /></label><label>How old are you?<span className="label-note">This helps us keep things age-appropriate.</span><input type="number" min="13" max="120" value={age} onChange={(event) => setAge(event.target.value)} placeholder="Your age" required /></label><fieldset><legend>When you are here, what feels best?</legend><div className="comfort-options">{[['listen', 'Just listen'], ['sort', 'Help me sort it out'], ['light', 'Distract me']].map(([value, label]) => <button type="button" className={comfort === value ? 'comfort-option chosen' : 'comfort-option'} onClick={() => setComfort(value)} aria-pressed={comfort === value} key={value}><span>{comfort === value ? '●' : '○'}</span>{label}</button>)}</div></fieldset><button type="submit" className="primary-button auth-submit">Make my space <span>↗</span></button></form></section></main>
}

function App() {
  const [screen, setScreen] = useState('splash')
  const [activeMode, setActiveMode] = useState('talk')
  const [messages, setMessages] = useState(() => readStored('after-hours-current-chat', starterMessages))
  const [chatHistory, setChatHistory] = useState(() => readStored('after-hours-chat-history', starterChatHistory))
  const [draft, setDraft] = useState('')
  const [journalDraft, setJournalDraft] = useState('')
  const [saved, setSaved] = useState(false)
  const [journalEntries, setJournalEntries] = useState(() => readStored('after-hours-journal', starterJournalEntries))
  const [profileOpen, setProfileOpen] = useState(false)
  const [name, setName] = useState('A')
  const [selectedMoods, setSelectedMoods] = useState(['Restless'])
  const [moodNote, setMoodNote] = useState('')
  const [savedMoods, setSavedMoods] = useState(() => readStored('after-hours-moods', []))
  const [customMood, setCustomMood] = useState('')
  const [activeGame, setActiveGame] = useState(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameQueue, setGameQueue] = useState(() => readStored('after-hours-game-queue', []))
  const [remoteReady, setRemoteReady] = useState(false)

  useEffect(() => { window.localStorage.setItem('after-hours-current-chat', JSON.stringify(messages)) }, [messages])
  useEffect(() => { window.localStorage.setItem('after-hours-chat-history', JSON.stringify(chatHistory)) }, [chatHistory])
  useEffect(() => { window.localStorage.setItem('after-hours-journal', JSON.stringify(journalEntries)) }, [journalEntries])
  useEffect(() => { window.localStorage.setItem('after-hours-moods', JSON.stringify(savedMoods)) }, [savedMoods])
  useEffect(() => { window.localStorage.setItem('after-hours-game-queue', JSON.stringify(gameQueue)) }, [gameQueue])
  useEffect(() => {
    loadRemoteState()
      .then(({ state }) => {
        if (state.messages) setMessages(state.messages)
        if (state.chatHistory) setChatHistory(state.chatHistory)
        if (state.journalEntries) setJournalEntries(state.journalEntries)
        if (state.savedMoods) setSavedMoods(state.savedMoods)
        if (state.gameQueue) setGameQueue(state.gameQueue)
      })
      .catch(() => {})
      .finally(() => setRemoteReady(true))
  }, [])
  useEffect(() => {
    if (!remoteReady) return
    saveRemoteState({ messages, chatHistory, journalEntries, savedMoods, gameQueue }).catch(() => {})
  }, [remoteReady, messages, chatHistory, journalEntries, savedMoods, gameQueue])

  if (screen === 'splash') return <Splash onContinue={() => setScreen('app')} />
  if (screen === 'onboarding') return <Onboarding onFinish={(newName) => { setName(newName); setScreen('app') }} />

  const sendMessage = async (event) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content) return
    const userMessage = { id: Date.now(), role: 'user', time: 'Now', content }
    setMessages((current) => [...current, userMessage])
    setChatHistory((current) => [{ id: 'conversation', title: content.length > 27 ? `${content.slice(0, 27)}...` : content, detail: 'Just now · current chat' }, ...current.filter((chat) => chat.id !== 'conversation')])
    setDraft('')
    try {
      const { message } = await sendChatMessage([...messages, userMessage])
      setMessages((current) => [...current, { id: Date.now() + 1, role: 'assistant', time: 'Now', content: message }])
    } catch {
      setMessages((current) => [...current, { id: Date.now() + 1, role: 'assistant', time: 'Now', content: 'I am here with you. The chat connection is not configured yet, but your message is saved.' }])
    }
  }

  const handleComposerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (draft.trim()) {
        sendMessage(event)
      }
    }
  }

  const saveJournal = () => {
    if (!journalDraft.trim()) return
    setJournalEntries((current) => [{ date: `Today · ${todayLabel()}`, mood: selectedMoods.join(' · '), title: 'A note from today', preview: journalDraft.trim() }, ...current])
    setSaved(true)
    setJournalDraft('')
  }
  const toggleMood = (item) => {
    setSelectedMoods((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])
  }
  const saveMoodSnapshot = () => {
    if (!selectedMoods.length) return
    setSavedMoods((current) => [{ id: Date.now(), date: todayLabel(), moods: selectedMoods, note: moodNote.trim() }, ...current])
    setMoodNote('')
  }
  const addCustomMood = (event) => {
    event.preventDefault()
    const value = customMood.trim()
    if (!value || moodOptions.includes(value)) return
    setSelectedMoods((current) => [...current, value])
    setCustomMood('')
  }
  const updateMode = (mode) => { setActiveMode(mode); setActiveGame(null); setProfileOpen(false) }
  const playGame = (game) => { setActiveGame(game); setGameStarted(false); setActiveMode('games') }
  const addToQueue = (game) => { setGameQueue((queue) => queue.some((item) => item.id === game.id) ? queue : [...queue, game]) }
  const removeFromQueue = (gameId) => setGameQueue((queue) => queue.filter((game) => game.id !== gameId))
  const playNextQueued = () => {
    const [nextGame, ...remaining] = gameQueue
    if (nextGame) { setActiveGame(nextGame); setGameStarted(false); setGameQueue(remaining) }
  }
  const headings = { talk: 'A little less alone.', journal: 'A place to put it down.', mood: 'How are you, really?', games: 'Something light.' }
  const allMoodOptions = [...new Set([...moodOptions, ...selectedMoods])]

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">✦</span><span>after hours</span></div>
      <button type="button" className="profile-chip" onClick={() => setProfileOpen(true)} aria-label="Open your profile"><span className="avatar">{name[0]}</span><span><strong>{name === 'A' ? 'good evening' : `hi, ${name.toLowerCase()}`}</strong><small>your quiet corner</small></span><span className="profile-more" aria-hidden="true">···</span></button>
      <nav className="primary-nav" aria-label="Main navigation"><button type="button" className={activeMode === 'talk' ? 'nav-item active' : 'nav-item'} onClick={() => updateMode('talk')} aria-current={activeMode === 'talk' ? 'page' : undefined}><span>◌</span> Talk</button><button type="button" className={activeMode === 'journal' ? 'nav-item active' : 'nav-item'} onClick={() => updateMode('journal')} aria-current={activeMode === 'journal' ? 'page' : undefined}><span>▤</span> Journal <em>2</em></button><button type="button" className={activeMode === 'mood' ? 'nav-item active' : 'nav-item'} onClick={() => updateMode('mood')} aria-current={activeMode === 'mood' ? 'page' : undefined}><span>♡</span> Mood</button><button type="button" className={activeMode === 'games' ? 'nav-item active' : 'nav-item'} onClick={() => updateMode('games')} aria-current={activeMode === 'games' ? 'page' : undefined}><span>♧</span> Games</button></nav>
      <div className="sidebar-section"><div className="section-label">PREVIOUS CHATS <span>{chatHistory.length}</span></div>{chatHistory.map((chat, index) => <button type="button" className={index === 0 ? 'thread active-thread' : 'thread'} key={chat.id}><span className={`thread-dot ${index === 0 ? 'amber' : index === 1 ? 'lilac' : 'blue'}`} /><span className="thread-copy"><strong>{chat.title}</strong><small>{chat.detail}</small></span><span aria-hidden="true">›</span></button>)}</div>
      <div className="sidebar-footer"><button type="button" aria-label="Night mode is on">◐ <span>Night mode</span><i aria-hidden="true" /></button><button type="button" aria-label="Open help">?</button></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div><span className="eyebrow">WEDNESDAY · SEPTEMBER 9</span><h1>{headings[activeMode]}</h1></div><button type="button" className="icon-button" onClick={() => setProfileOpen(true)} aria-label="Open profile">{name[0]}</button></header>
      {activeMode === 'talk' && <section className="conversation-view"><div className="conversation-meta"><span className="live-dot" /> private space <span className="meta-divider">/</span> vent mode <button type="button">change</button></div><div className="messages" aria-live="polite">{messages.map((message) => <article className={`message ${message.role}`} key={message.id}><div className="message-avatar" aria-hidden="true">{message.role === 'assistant' ? '✦' : name[0]}</div><div><div className="message-header"><strong>{message.role === 'assistant' ? 'after hours' : 'you'}</strong><time>{message.time}</time></div><p>{message.content}</p></div></article>)}</div><div className="quick-prompts"><span>try starting with</span><button type="button" onClick={() => setDraft('I cannot stop thinking about...')}>I cannot stop thinking about...</button><button type="button" onClick={() => setDraft('The honest version is...')}>The honest version is...</button></div><form className="composer" onSubmit={sendMessage}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder="Say whatever is on your mind..." rows="2" aria-label="Message After Hours" /><div className="composer-actions"><span>↵ to send</span><button type="submit" className="send-button" aria-label="Send message" disabled={!draft.trim()}>↑</button></div></form></section>}
      {activeMode === 'journal' && <section className="journal-view"><div className="journal-intro"><span className="large-star">✳</span><div><p className="eyebrow">NO AUDIENCE REQUIRED</p><h2>Write it down,<br /><i>leave it here.</i></h2><p className="intro-copy">A private place for the thoughts that do not need an answer.</p></div></div><div className="journal-compose"><div className="compose-heading"><span>NEW ENTRY</span><span>SEP 9</span></div><textarea value={journalDraft} onChange={(event) => { setJournalDraft(event.target.value); setSaved(false) }} placeholder="What is present for you right now?" /><div className="journal-actions"><div className="moods"><span>MOOD</span><button type="button" className="mood active">◒ Restless</button><button type="button" className="mood">○ Soft</button><button type="button" className="mood">○ Clear</button></div><button type="button" className="save-button" onClick={saveJournal}>Save entry <span>↗</span></button></div>{saved && <p className="saved-note">Saved to your journal.</p>}</div><div className="entries-heading"><h3>Recent entries</h3><button>view all <span>→</span></button></div><div className="entry-list">{journalEntries.map((entry) => <article className="entry" key={entry.title}><div className="entry-date">{entry.date}</div><div className="entry-body"><span className="mood-tag">{entry.mood}</span><h4>{entry.title}</h4><p>{entry.preview}</p></div><span className="entry-arrow">↗</span></article>)}</div></section>}
      {activeMode === 'mood' && <section className="mood-view"><div className="mood-intro"><span className="large-star" aria-hidden="true">♡</span><p className="eyebrow">NO NEED TO BE PRECISE</p><h2>What is the weather<br /><i>inside you?</i></h2><p>There is no right answer. Pick as many as fit today.</p></div><div className="mood-grid">{allMoodOptions.map((item) => <button type="button" className={selectedMoods.includes(item) ? 'mood-card selected' : 'mood-card'} onClick={() => toggleMood(item)} aria-pressed={selectedMoods.includes(item)} key={item}><span aria-hidden="true">{item === 'Tender' ? '◌' : item === 'Restless' ? '≈' : item === 'Heavy' ? '↓' : item === 'Bright' ? '✦' : item === 'Numb' ? '○' : '↑'}</span>{item}</button>)}</div><form className="custom-mood-form" onSubmit={addCustomMood}><label htmlFor="custom-mood">Add your own mood</label><div><input id="custom-mood" value={customMood} onChange={(event) => setCustomMood(event.target.value)} placeholder="e.g. cautiously okay" /><button type="submit">+ add mood</button></div></form><div className="mood-note"><label>Want to say a little more? <textarea value={moodNote} onChange={(event) => setMoodNote(event.target.value)} placeholder="A few words, or leave it blank..." rows="3" aria-label="Optional mood note" /></label><button type="button" className="primary-button" onClick={saveMoodSnapshot}>Save mood check-in <span>↗</span></button></div>{savedMoods.length > 0 && <div className="saved-moods"><div className="entries-heading"><h3>Saved mood history</h3><span>{savedMoods.length} check-ins</span></div>{savedMoods.map((snapshot) => <article className="saved-mood" key={snapshot.id}><div><strong>{snapshot.date}</strong><p>{snapshot.moods.join(' · ')}</p></div>{snapshot.note && <span>{snapshot.note}</span>}</article>)}</div>}</section>}
      {activeMode === 'games' && <section className="games-view"><div className="games-intro"><span className="large-star">♧</span><p className="eyebrow">A GENTLE DETOUR</p><h2>Give your brain<br /><i>somewhere else to go.</i></h2><p>Small games. No scores. No pressure to be good at them.</p></div>{activeGame ? <div className="game-play" role="region" aria-live="polite"><button type="button" className="back-link" onClick={() => setActiveGame(null)}>← all games</button><span className="game-icon">{activeGame.icon}</span><p className="eyebrow">{activeGame.title.toUpperCase()}</p><h3>{activeGame.prompt}</h3><p className="how-to-play"><strong>How to play</strong>{activeGame.how}</p><div className="game-play-actions"><button type="button" className="primary-button play-now-button" onClick={() => setGameStarted(true)}>{gameStarted ? 'game started ✓' : 'play game'} <span>▶</span></button><button type="button" className="queue-next-button" onClick={() => setActiveGame(games[(games.findIndex((game) => game.id === activeGame.id) + 1) % games.length])}>another one <span>↗</span></button>{gameQueue.length > 0 && <button type="button" className="queue-next-button" onClick={playNextQueued}>play next in queue <span>→</span></button>}</div></div> : <><div className="queue-bar"><div><span className="eyebrow">YOUR GAME QUEUE</span><strong>{gameQueue.length ? `${gameQueue.length} game${gameQueue.length === 1 ? '' : 's'} waiting` : 'Nothing queued yet'}</strong></div>{gameQueue.length > 0 && <button type="button" className="queue-next-button" onClick={playNextQueued}>play next <span>→</span></button>}</div><div className="game-groups">{gameGroups.map((group) => <section className="game-group" key={group.id}><div className="game-group-heading"><h3>{group.title}</h3><p>{group.note}</p></div><div className="game-grid">{games.filter((game) => game.group === group.id).map((game) => { const queued = gameQueue.some((item) => item.id === game.id); return <article className="game-card" key={game.id}><span className="game-icon">{game.icon}</span><h4>{game.title}</h4><p>{game.text}</p><details><summary>How to play</summary><span>{game.how}</span></details><div className="game-card-actions"><button type="button" className="play-game-button" onClick={() => playGame(game)}>Play <span>↗</span></button><button type="button" className={queued ? 'queue-game-button queued' : 'queue-game-button'} onClick={() => queued ? removeFromQueue(game.id) : addToQueue(game)} aria-label={queued ? `Remove ${game.title} from queue` : `Add ${game.title} to queue`}>{queued ? '✓ queued' : '+ queue'}</button></div></article> })}</div></section>)}</div></>}</section>}
    </main>
    {profileOpen && <div className="modal-backdrop" onClick={() => setProfileOpen(false)}><section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title" onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setProfileOpen(false)} aria-label="Close profile">×</button><span className="modal-avatar" aria-hidden="true">{name[0]}</span><p className="eyebrow">YOUR SPACE</p><h2 id="profile-title">{name === 'A' ? 'A little more you.' : `Hi, ${name}.`}</h2><p>Keep your corner feeling like yours.</p><div className="profile-settings"><button type="button">Personal details <span aria-hidden="true">›</span></button><button type="button">Memory & privacy <span aria-hidden="true">›</span></button><button type="button">Sign out <span aria-hidden="true">›</span></button></div></section></div>}
  </div>
}

export default App
