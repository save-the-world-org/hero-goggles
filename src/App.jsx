import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Find from './Find.jsx'
import MapView from './MapView.jsx'

// Ray-Ban Display gives a Web App arrow keys and Enter from the touchpad and the
// Neural Band. The browser moves focus between real buttons and Enter fires a
// normal click, so the app uses plain <button>s and never translates keys itself.
// Back is history.back(): opening a card pushes one entry, so Back comes home.
// The host allows five history entries in all, so at most one is pushed at a time.

const CARDS = [
  { id: 'find', title: 'Find', hint: 'Who you seek' },
  { id: 'map', title: 'Map', hint: 'Where they are' },
  { id: 'hello', title: 'Hello', hint: 'Say hi' },
  { id: 'now', title: 'Now', hint: 'Time and date' },
  { id: 'about', title: 'About', hint: 'What this is' },
]

export default function App() {
  const [view, setView] = useState('splash')
  const lastCard = useRef('find')

  useEffect(() => {
    const onPop = () => setView('home')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const open = (id) => {
    lastCard.current = id
    history.pushState({ view: id }, '')
    setView(id)
  }
  const back = () => history.back()

  // Swipes, which reach a Web App as ArrowLeft and ArrowRight, move along list, Map, Find. The list is one column and
  // Map and Find hold a single button, so left and right move no focus there. Enter is never handled here. Map and Find
  // replace each other's history entry, so the one entry a card pushes still brings Back home.
  useEffect(() => {
    const swipe = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const right = e.key === 'ArrowRight'
      const go = (id) => (e.preventDefault(), history.replaceState({ view: id }, ''), (lastCard.current = id), setView(id))
      if (view === 'home' && right) (e.preventDefault(), open('map'))
      else if (view === 'map' && !right) (e.preventDefault(), back())
      else if (view === 'map' && right) go('find')
      else if (view === 'find' && !right) go('map')
    }
    window.addEventListener('keydown', swipe)
    return () => window.removeEventListener('keydown', swipe)
  }, [view])

  // The splash: the hero in this release's cape for a moment, then home (any key goes there at once).
  useEffect(() => {
    if (view !== 'splash') return
    const go = () => setView('home')
    const t = setTimeout(go, 1400)
    window.addEventListener('keydown', go, { once: true })
    return () => (clearTimeout(t), window.removeEventListener('keydown', go))
  }, [view])

  return (
    <main className="frame">
      {view === 'splash' && <Splash />}
      {view === 'home' && <Home onOpen={open} focusId={lastCard.current} />}
      {view === 'find' && <Find onBack={back} />}
      {view === 'map' && <MapView onBack={back} />}
      {view === 'hello' && <Hello onBack={back} />}
      {view === 'now' && <Now onBack={back} />}
      {view === 'about' && <About onBack={back} />}
    </main>
  )
}

// The glasses move focus from wherever it is, so each screen focuses its first control as it mounts.
function useAutoFocus() {
  const ref = useRef(null)
  useLayoutEffect(() => ref.current?.focus(), [])
  return ref
}

function Home({ onOpen, focusId }) {
  const first = useAutoFocus()
  return (
    <section className="screen home">
      <header>
        <p className="eyebrow">Darkshift</p>
        <h1 className="wordmark">Hero<br />Goggles</h1>
        <p className="lede">Hello, world.</p>
      </header>
      <nav className="cards" aria-label="Hero Goggles">
        {CARDS.map((c) => (
          <button
            key={c.id}
            ref={c.id === focusId ? first : undefined}
            className="card"
            onClick={() => onOpen(c.id)}
          >
            <span className="card-title">{c.title}</span>
            <span className="card-hint">{c.hint}</span>
          </button>
        ))}
      </nav>
    </section>
  )
}

function Screen({ title, onBack, children, focus = true }) {
  const backRef = useAutoFocus()
  return (
    <section className="screen detail">
      <h2 className="title">{title}</h2>
      <div className="body">{children}</div>
      <button ref={focus ? backRef : undefined} className="pill ghost" onClick={onBack}>
        Back
      </button>
    </section>
  )
}

function Hello({ onBack }) {
  const [count, setCount] = useState(0)
  const waveRef = useAutoFocus()
  return (
    <Screen title="Hello" onBack={onBack} focus={false}>
      <p className="big">{count === 0 ? 'Hi there.' : `${count} ${count === 1 ? 'wave' : 'waves'}`}</p>
      <button ref={waveRef} className="pill" onClick={() => setCount((n) => n + 1)}>
        Wave
      </button>
    </Screen>
  )
}

function Now({ onBack }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <Screen title="Now" onBack={onBack}>
      <p className="clock">{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
      <p className="muted">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
    </Screen>
  )
}

function Splash() {
  return (
    <section className="screen splash" aria-label="Hero Goggles">
      <img className="splash-hero" src="/brand/hero-goggles-color.svg" alt="" />
      <h1 className="wordmark">Hero<br />Goggles</h1>
    </section>
  )
}

function About({ onBack }) {
  return (
    <Screen title="About" onBack={onBack}>
      <p className="muted">
        Hero Goggles finds the influencer you are looking for and shows how close you are. Built and shipped by Infrared.
      </p>
      <img className="logo hero" src="/brand/hero-goggles-color.svg" alt={`The Darkshift goat in a ${__CAPE__.name.toLowerCase()} cape and mask`} />
      <p className="version">Version {__APP_VERSION__} · <span style={{ color: __CAPE__.hex }}>{__CAPE__.name}</span> cape</p>
    </Screen>
  )
}
