import { useEffect, useRef, useState } from 'react'
import { DEMO_ALERTS, DEMO_CONFIRM_MS, alertBig, alertTone, confirmedIn, demoAlert, demoConfirm, isRadar } from '../alerts.js'
import { emitAlert, listAlerts, onAlert } from './api.js'

const BANNER_MS = 4000
const KEEP = 10

// Newest first, one row per id, the last ten. A later copy of an alert (Radar's confirmation) updates its row in place,
// and never takes the confirmation back.
function merge(prev, more) {
  const byId = new Map()
  for (const a of [...prev, ...more]) {
    if (!a?.id) continue
    const was = byId.get(a.id)
    byId.set(a.id, !was ? a : isRadar(was) && !isRadar(a) ? was : { ...was, ...a })
  }
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
      if (seen.current.has(a.id)) {
        // Radar confirms the alert on show: its banner says so, and its 4 s do not start again.
        if (isRadar(a)) setBanner((b) => (b && b.id === a.id ? { ...b, ...a } : b))
        return
      }
      seen.current.add(a.id)
      setBanner(a)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setBanner(null), BANNER_MS)
    })
    let demo, confirm
    if (DEMO_ALERTS) {
      let n = 0
      demo = setInterval(() => {
        const inf = (people.current || [])[Math.floor(n / 8) % Math.max(1, (people.current || []).length)]
        const a = demoAlert(n++, seeker, inf)
        emitAlert(a)
        confirm = setTimeout(() => emitAlert(demoConfirm(a)), DEMO_CONFIRM_MS)
      }, 5000)
    }
    return () => ((closed = true), off(), clearTimeout(timer.current), clearInterval(demo), clearTimeout(confirm))
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
      <span className={`alert-via${isRadar(alert) ? ' on' : ''}`}>{isRadar(alert) ? 'via Skyhook Radar' : 'Detected'}</span>
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

const KIND = { closer: 'Closer', farther: 'Farther', found: 'Found', lost: 'Lost' }

// Radar's badge on an alert: what Radar confirmed and how long it took, or a dimmer "Detected" until it does.
function RadarBadge({ alert: a }) {
  if (!isRadar(a)) return <span className="radar-badge">Detected</span>
  const took = confirmedIn(a)
  return <span className="radar-badge on">{['Radar', a.radarReason, took ? `confirmed in ${took}` : 'confirmed'].filter(Boolean).join(' · ')}</span>
}

// Front and centre under the top bar, always there: this page's seeker's latest three alerts, big, the newest pulsing,
// each with Radar's badge. Before the first, what Radar is doing and its status dot (/api/integrations).
export function RadarStrip({ list, influencers, radarOn }) {
  const top = list.slice(0, 3)
  return (
    <section className="radar-strip" aria-label="Skyhook Radar live alerts">
      <header className="radar-head">
        <span className={`int-dot${radarOn === true ? ' on' : radarOn === false ? ' off' : ''}`} aria-label={radarOn ? 'Radar on' : 'Radar not seen'} />
        SKYHOOK RADAR · LIVE ALERTS
      </header>
      {top.length === 0 ? (
        <p className="radar-empty">Radar is watching: alerts appear here as you close in</p>
      ) : (
        <ol className="radar-list">
          {top.map((a, i) => (
            <li key={a.id} className={`radar-alert ${alertTone(a)}${i === 0 ? ' newest' : ''}${isRadar(a) ? ' confirmed' : ''}`} style={{ '--c': colourOf(a, influencers) }}>
              <strong className="radar-big">{alertBig(a)}</strong>
              <span className="radar-who">{a.name || a.message}</span>
              <span className="radar-meta">
                {KIND[a.kind] || a.kind}
                {clock(a.at) && (
                  <>
                    {' · '}
                    <time dateTime={a.at}>{clock(a.at)}</time>
                  </>
                )}
              </span>
              <RadarBadge alert={a} />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
