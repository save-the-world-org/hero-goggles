import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import footprint from './live/venue/salt-palace-footprint.json'
import { SEEKER } from './Find.jsx'
import LensAlert from './LensAlert.jsx'
import './map.css'

// Map, in the lens: the Salt Palace's outline, this seeker, the hero they seek and the other beacons, drawn to scale
// and zoomed to fit the two. Plain SVG and one small request every 1.5 s (the API's state), so the glasses' first load
// stays light; the phone's /live/ has the full map. Swipe left and right to move between the list, Map and Find.
const API = (import.meta.env.VITE_API_BASE || 'https://influence-api.darkshift.cloud').replace(/\/$/, '')
const FRESH_MS = 5000 // a reading older than this is no signal
const RING = footprint.geometry.coordinates[0] // [lon, lat], the building's outline from OpenStreetMap
const VENUE = { lat: 40.767437, lon: -111.8962966 } // the building's centre
const M_PER_DEG = 111320
const SIZE = 600 // the drawing's square; the glasses' display is 600 x 600
const CX = 300
const CY = 300

// Metres east (x) and south (y) of a centre: equirectangular, good to centimetres across a building.
function metres(centre, p) {
  return {
    x: (p.lon - centre.lon) * M_PER_DEG * Math.cos((centre.lat * Math.PI) / 180),
    y: (centre.lat - p.lat) * M_PER_DEG,
  }
}

const fresh = (r) => r && Date.now() - Date.parse(r.at) <= FRESH_MS

export default function MapView({ onBack }) {
  const [state, setState] = useState(null)
  const [offline, setOffline] = useState(false)
  const [alert, setAlert] = useState(null)
  const back = useRef(null)
  useLayoutEffect(() => back.current?.focus(), [])

  useEffect(() => {
    let alive = true
    let timer
    const poll = async () => {
      try {
        const res = await fetch(`${API}/api/state`, { cache: 'no-store' })
        const s = await res.json()
        if (alive) (setState(s), setOffline(false))
      } catch {
        if (alive) setOffline(true)
      }
      if (alive) timer = setTimeout(poll, 1500)
    }
    poll()
    return () => ((alive = false), clearTimeout(timer))
  }, [])

  // Distance alerts ride on the target, which the state does not carry: one small request a second, only while Map is
  // open. It fails quietly, and an API without alerts shows nothing.
  useEffect(() => {
    let alive = true
    let timer
    const poll = async () => {
      try {
        const res = await fetch(`${API}/api/target?seeker=${encodeURIComponent(SEEKER)}`, { cache: 'no-store' })
        const t = await res.json()
        if (alive) setAlert(t?.alert || null)
      } catch {
        /* no link: the state poll says Offline */
      }
      if (alive) timer = setTimeout(poll, 1000)
    }
    poll()
    return () => ((alive = false), clearTimeout(timer))
  }, [])

  const me = state?.seekers?.find((s) => s.id === SEEKER && s.lat != null) || null
  const target = state?.targets?.find((t) => t && t.seekerId === SEEKER && t.name) || null
  const beacons = (state?.beacons || []).filter((b) => b.reading?.estimate)
  const sought = target ? beacons.find((b) => b.id === target.beaconId) : null
  const soughtAt = sought?.reading?.estimate || null
  const live = sought && fresh(sought.reading)

  // Centre on this seeker, else the hero, else the building; zoom so both fit with room around them.
  const centre = me || soughtAt || VENUE
  let span = 480 // metres across: the whole building
  if (me && soughtAt) {
    const d = metres(me, soughtAt)
    span = Math.min(480, Math.max(24, 2.8 * Math.hypot(d.x, d.y)))
  } else if (me || soughtAt) span = 60
  const scale = (SIZE - 80) / span
  const at = (p) => {
    const m = metres(centre, p)
    return { x: CX + m.x * scale, y: CY + m.y * scale }
  }
  const outline = RING.map(([lon, lat], i) => {
    const p = at({ lon, lat })
    return `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  }).join('') + 'Z'
  const bar = niceBar(span) // a scale bar about a fifth of the view

  const dist = sought?.reading?.distance
  const words = !target
    ? 'Nobody to find'
    : live && dist != null
      ? `${target.name} · ${dist < 10 ? dist.toFixed(1) : Math.round(dist)} M`
      : `${target.name} · No signal`

  return (
    <section className="screen detail map">
      <h2 className="title">Map</h2>
      <p className={`map-words${target && !live ? ' map-lost' : ''}`}>{offline ? 'Offline' : words}</p>
      <svg className="map-svg" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Map of the venue">
        <path d={outline} className="map-building" />
        {me && soughtAt && (() => {
          const a = at(me)
          const b = at(soughtAt)
          return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="map-line" />
        })()}
        {beacons.map((b) => {
          const p = at(b.reading.estimate)
          const isSought = sought && b.id === sought.id
          const colour = b.influencer?.color || '#d9f5f3'
          const label = (b.influencer?.show?.name !== false && b.influencer?.name) || b.name
          const r = Math.max(10, Math.min(120, (b.reading.estimate.radius || 2) * scale))
          return (
            <g key={b.id} className={isSought ? 'map-sought' : 'map-other'}>
              <circle cx={p.x} cy={p.y} r={r} fill={colour} fillOpacity={isSought ? 0.16 : 0.08} />
              {isSought && <circle cx={p.x} cy={p.y} r="18" className="map-pulse" stroke={colour} />}
              <circle cx={p.x} cy={p.y} r={isSought ? 10 : 7} fill={colour} />
              <text x={p.x} y={p.y - (isSought ? 22 : 16)} textAnchor="middle" className="map-label">{label}</text>
            </g>
          )
        })}
        {me && (() => {
          const p = at(me)
          return (
            <g className="map-me">
              {me.heading != null && (
                <path d="M0 -34 L12 -8 L-12 -8 Z" transform={`translate(${p.x} ${p.y}) rotate(${me.heading})`} className="map-heading" />
              )}
              <circle cx={p.x} cy={p.y} r="9" className="map-you" />
              <text x={p.x} y={p.y + 30} textAnchor="middle" className="map-label">You</text>
            </g>
          )
        })()}
        <g className="map-scale">
          <line x1="40" y1="570" x2={40 + bar * scale} y2="570" />
          <text x="40" y="556">{bar} M</text>
        </g>
      </svg>
      <button ref={back} className="pill ghost" onClick={onBack}>
        Back
      </button>
      <LensAlert alert={alert} seeker={SEEKER} />
    </section>
  )
}

// A round length for the scale bar: 1, 2, 5, 10, 20, 50 ... metres, about a fifth of the span.
function niceBar(span) {
  const raw = span / 5
  const p = 10 ** Math.floor(Math.log10(raw))
  return [1, 2, 5, 10].map((n) => n * p).reduce((best, n) => (Math.abs(n - raw) < Math.abs(best - raw) ? n : best))
}
