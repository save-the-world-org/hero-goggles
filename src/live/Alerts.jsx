import { useEffect, useRef, useState } from 'react'
import { DEMO_ALERTS, alertBig, alertTone, demoAlert } from '../alerts.js'
import { emitAlert, listAlerts, onAlert } from './api.js'

const BANNER_MS = 4000
const KEEP = 10

// Newest first, one row per id, the last ten.
function merge(prev, more) {
  const byId = new Map()
  for (const a of [...more, ...prev]) if (a?.id && !byId.has(a.id)) byId.set(a.id, a)
  return [...byId.values()].sort((x, y) => (Date.parse(y.at) || 0) - (Date.parse(x.at) || 0)).slice(0, KEEP)
}

// This page's seeker's distance alerts: the last ten (loaded once, then from the stream) and the one banner showing.
// One banner at a time, a newer alert replaces it, and an id already shown (or loaded with the history) never shows
// again. An API without alerts gives none, quietly.
export function useSeekerAlerts(seeker, influencers) {
  const [list, setList] = useState([])
  const [banner, setBanner] = useState(null)
  const seen = useRef(new Set())
  const timer = useRef(0)
  const people = useRef(influencers)
  people.current = influencers

  useEffect(() => {
    let closed = false
    listAlerts(seeker)
      .then((rows) => {
        if (closed) return
        rows.forEach((a) => a?.id && seen.current.add(a.id))
        setList((prev) => merge(prev, rows))
      })
      .catch(() => {})
    const off = onAlert((a) => {
      if (a.seekerId !== seeker) return
      setList((prev) => merge(prev, [a]))
      if (seen.current.has(a.id)) return
      seen.current.add(a.id)
      setBanner(a)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setBanner(null), BANNER_MS)
    })
    let demo
    if (DEMO_ALERTS) {
      let n = 0
      demo = setInterval(() => {
        const inf = (people.current || [])[Math.floor(n / 8) % Math.max(1, (people.current || []).length)]
        emitAlert(demoAlert(n++, seeker, inf))
      }, 5000)
    }
    return () => ((closed = true), off(), clearTimeout(timer.current), clearInterval(demo))
  }, [seeker])

  const dismiss = () => (clearTimeout(timer.current), setBanner(null))
  return { list, banner, dismiss }
}

const colourOf = (a, influencers) => influencers?.find((i) => i.id === a.influencerId)?.color || '#3DA992'

// Across the top for 4 s: the influencer's colour, the big words, the message and where it came from.
export function AlertBanner({ alert, influencers, onDismiss }) {
  if (!alert) return null
  return (
    <div key={alert.id} className={`alert-banner ${alertTone(alert)}`} style={{ '--c': colourOf(alert, influencers) }} role="alert" onClick={onDismiss}>
      <span className="alert-dot" />
      <strong className="alert-big">{alertBig(alert)}</strong>
      <span className="alert-msg">{alert.message || alert.name}</span>
      <span className="alert-via">via Radar</span>
    </div>
  )
}

const clock = (at) => {
  const d = new Date(at)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
}

// The last ten, folded away until opened. Nothing at all until there is one.
export function AlertsList({ list, influencers }) {
  if (!list.length) return null
  return (
    <details className="alerts">
      <summary>
        Alerts <span className="muted">· {list.length}</span>
        <span className="alerts-last">{list[0].message}</span>
      </summary>
      <ol>
        {list.map((a) => (
          <li key={a.id} className={alertTone(a)} style={{ '--c': colourOf(a, influencers) }}>
            <span className="alert-dot" />
            <span className="alerts-big">{alertBig(a)}</span>
            <span className="alerts-msg">{a.message || a.name}</span>
            <time dateTime={a.at}>{clock(a.at)}</time>
          </li>
        ))}
      </ol>
    </details>
  )
}
