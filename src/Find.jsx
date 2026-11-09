import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import LensAlert from './LensAlert.jsx'
import './find.css'

// Find, in the lens: who this seeker seeks ("find Kunal"), how far, and which way. Ported from influence's Find.jsx,
// but it shows only this seeker's own readings, and "No signal" when the latest is stale. It polls the API once a
// second (one small request, no stream, for the glasses' slow link).
const API = (import.meta.env.VITE_API_BASE || 'https://influence-api.darkshift.cloud').replace(/\/$/, '')
// Who is seeking: ?seeker=<id> in the address Meta AI opens. Meta may drop the query string, so a build-time
// seeker stands in; "phone" is the shared seeker the API keeps as its default.
const SEEKER_FALLBACK = import.meta.env.VITE_SEEKER || 'phone'
export const SEEKER = new URLSearchParams(location.search).get('seeker') || SEEKER_FALLBACK
// A reading older than this is no signal.
const FRESH_MS = 5000
// The mirror hides Back but keeps its room, so the screen lays out as it does on the glasses.
export const HIDDEN = { visibility: 'hidden' }

// mirror: /live/'s Lens draws this same screen for the page's seeker: no focus taken, the Back button kept in its place but
// hidden, nothing else changed.
export default function Find({ onBack, seeker = SEEKER, mirror = false }) {
  const [target, setTarget] = useState(undefined) // undefined while loading, null when nobody is sought
  const [offline, setOffline] = useState(false)
  const [alert, setAlert] = useState(null) // the seeker's latest distance alert while it is under 8 s old
  const [, tick] = useState(0)
  const turn = useRef(0)
  const back = useRef(null)
  useLayoutEffect(() => {
    if (!mirror) back.current?.focus()
  }, [])

  useEffect(() => {
    let alive = true
    let timer
    const poll = async () => {
      try {
        const res = await fetch(`${API}/api/target?seeker=${encodeURIComponent(seeker)}`, { cache: 'no-store' })
        const t = await res.json()
        if (alive) (setTarget(t && t.name ? t : null), setAlert(t?.alert || null), setOffline(false))
      } catch {
        if (alive) setOffline(true)
      }
      if (alive) (tick((n) => n + 1), (timer = setTimeout(poll, 1000)))
    }
    poll()
    return () => ((alive = false), clearTimeout(timer))
  }, [seeker])

  // Only this seeker's reading (the API gives the seeker's own as lastReading), and only while it is fresh.
  const last = target?.lastReading
  const fresh = last && last.seekerId === target.seekerId && Date.now() - Date.parse(last.at) <= FRESH_MS
  const r = fresh ? last : null
  const az = r?.azimuthDeg
  // Turn the short way round: 350 -> 10 is +20, not -340.
  if (az != null) turn.current += ((((az - turn.current + 180) % 360) + 360) % 360) - 180
  const dist = r?.distance != null ? (r.distance < 10 ? r.distance.toFixed(1) : Math.round(r.distance)) : null

  return (
    <section className="screen detail find">
      <h2 className="title">Find</h2>
      <div className="body">
        {target === undefined && <p className="muted">{offline ? 'No link to Influence.' : 'Looking…'}</p>}
        {target === null && <p className="muted">Nobody yet. Say “find Kunal” on the phone.</p>}
        {target && (
          <>
            <p className="find-name">{target.name}</p>
            {dist != null ? (
              <div className="find-way">
                {az != null && (
                  <svg className="find-arrow" viewBox="0 0 48 48" style={{ transform: `rotate(${turn.current}deg)` }} aria-label="Direction">
                    <path d="M24 4 L37 38 L24 30 L11 38 Z" />
                  </svg>
                )}
                <span className="find-dist">{dist} M</span>
              </div>
            ) : (
              <p className="find-nosignal">{target.note || 'No signal'}</p>
            )}
          </>
        )}
        <p className="muted find-seeker">Seeker {seeker}</p>
      </div>
      <button ref={back} className="pill ghost" onClick={onBack} style={mirror ? HIDDEN : undefined} aria-hidden={mirror || undefined}>
        Back
      </button>
      <LensAlert alert={alert} seeker={seeker} />
    </section>
  )
}
