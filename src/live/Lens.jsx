import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Find from '../Find.jsx'
import MapView from '../MapView.jsx'
import { API, getWriteKey, onFrame } from './api.js'
import './lens.css'

// The Lens: what the Ray-Ban Display shows, beside the map. It draws the glasses' own Find and Map, with their alert band,
// for this page's seeker, laid out at the lens's 600 x 600 and scaled into the frame, so it reads exactly as the lens
// does. Only the screen showing is mounted, so it makes the requests the glasses make and no more. Auto flips every 6 s.
// Camera shows what the wearer sees: the glasses' camera, relayed by the phone, behind the HUD. It is offered while the
// API has a frame under 30 s old for this seeker, and viewing it needs the write key.
const LENS_PX = 600
const FLIP_MS = 6000
const FRAME_FRESH_MS = 30000
const CAMERA_POLL_MS = 700
const NO_KEY = 'Enter the write key in the registry to watch the camera'
const MODES = [
  ['auto', 'Auto'],
  ['find', 'Find'],
  ['map', 'Map'],
  ['camera', 'Camera'],
]

const isFresh = (at) => !!at && Date.now() - Date.parse(at) <= FRAME_FRESH_MS
const later = (a, b) => (!a ? b : !b ? a : Date.parse(b) > Date.parse(a) ? b : a)

// The seeker's latest camera frame while mounted, fetched with the write key on each `event: frame` and every 700 ms,
// as an object URL; each one is revoked once the next replaces it. status: loading, ok, none (no recent frame), nokey.
function useCameraFrame(seeker) {
  const [frame, setFrame] = useState({ url: '', at: null, status: 'loading' })
  useEffect(() => {
    let alive = true
    let busy = false
    let current = ''
    const show = (next) => {
      if (!alive) return next.url && URL.revokeObjectURL(next.url)
      if (current && current !== next.url) URL.revokeObjectURL(current)
      current = next.url
      setFrame(next)
    }
    const load = async () => {
      if (busy || !alive) return
      const key = getWriteKey()
      if (!key) return show({ url: '', at: null, status: 'nokey' })
      busy = true
      try {
        const res = await fetch(`${API}/api/seekers/${encodeURIComponent(seeker)}/frame`, { headers: { authorization: `Bearer ${key}` }, cache: 'no-store' })
        if (res.status === 401) show({ url: '', at: null, status: 'nokey' })
        else if (!res.ok) show({ url: '', at: null, status: 'none' })
        else {
          const at = res.headers.get('x-frame-at')
          show({ url: URL.createObjectURL(await res.blob()), at, status: 'ok' })
        }
      } catch {
        /* no link this time: the last frame stays until the next try */
      } finally {
        busy = false
      }
    }
    load()
    const t = setInterval(load, CAMERA_POLL_MS)
    const off = onFrame((f) => f.seekerId === seeker && load())
    return () => {
      alive = false
      clearInterval(t)
      off()
      if (current) URL.revokeObjectURL(current)
    }
  }, [seeker])
  return frame
}

// The frame fills the lens, with the HUD the lens last showed on top (Find, or Map dimmed). Without the key, or on a
// 401, only the line asking for it.
function CameraView({ seeker, hud, scale }) {
  const { url, at, status } = useCameraFrame(seeker)
  if (status === 'nokey')
    return (
      <a className="lens-cam-msg" href="#/registry">
        {NO_KEY}
      </a>
    )
  const age = at ? Math.max(0, (Date.now() - Date.parse(at)) / 1000) : null
  return (
    <>
      {url && <div className="lens-cam" style={{ backgroundImage: `url("${url}")` }} />}
      <div className={`lens-stage${hud === 'map' ? ' dim' : ''}`} style={{ transform: `scale(${scale})` }}>
        {hud === 'map' ? <MapView key="map" seeker={seeker} mirror /> : <Find key="find" seeker={seeker} mirror />}
      </div>
      <span className="lens-cam-note">
        {status === 'ok' && age != null ? `about 1 s behind · frame ${age < 10 ? age.toFixed(1) : Math.round(age)} s old` : status === 'none' ? 'No recent frame' : 'Camera…'}
      </span>
    </>
  )
}

export default function Lens({ seeker, live, frameAt = null }) {
  const [mode, setMode] = useState('auto')
  const [flip, setFlip] = useState('find')
  const [hud, setHud] = useState('find')
  const [scale, setScale] = useState(0.5)
  const [heard, setHeard] = useState(null) // the latest `event: frame` for this seeker
  const [, tick] = useState(0)
  const frame = useRef(null)

  useEffect(() => onFrame((f) => f.seekerId === seeker && setHeard((h) => later(h, f.at))), [seeker])
  // A frame goes stale with no event: look again every second.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const camera = isFresh(later(frameAt, heard))
  const fresh = useRef(camera)
  fresh.current = camera

  // Auto: Find, Map, then Camera while its frames are fresh.
  useEffect(() => {
    if (mode !== 'auto') return
    const t = setInterval(() => setFlip((v) => (v === 'find' ? 'map' : v === 'map' && fresh.current ? 'camera' : 'find')), FLIP_MS)
    return () => clearInterval(t)
  }, [mode])

  // The frame's size comes from CSS (about 300 px on a laptop, smaller on a phone); the 600 x 600 stage scales to it.
  useLayoutEffect(() => {
    const el = frame.current
    const fit = () => el?.clientWidth && setScale(el.clientWidth / LENS_PX)
    fit()
    if (typeof ResizeObserver !== 'function') return
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const view = mode === 'auto' ? (flip === 'camera' && !camera ? 'find' : flip) : mode
  useEffect(() => {
    if (view === 'find' || view === 'map') setHud(view)
  }, [view])
  return (
    <section className="lens-mirror" aria-label="Lens: what the glasses show">
      <header className="lens-head">
        <span className="lens-eyebrow">LENS</span>
        <span className="lens-sub">· what the glasses show</span>
        <span className={`live-dot lens-live${live ? ' on' : ''}`} title={live ? 'Live' : 'Connecting'}>
          LIVE
        </span>
      </header>
      <div className="lens-bar">
        <div className="lens-tabs" role="group" aria-label="Lens screen">
          {MODES.filter(([id]) => id !== 'camera' || camera || mode === 'camera').map(([id, label]) => (
            <button
              key={id}
              className={`lens-tab${mode === id ? ' on' : ''}${mode === 'auto' && id === view ? ' showing' : ''}`}
              aria-pressed={mode === id}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div ref={frame} className="lens-frame">
        {view === 'camera' ? (
          <CameraView seeker={seeker} hud={hud} scale={scale} />
        ) : (
          <div className="lens-stage" style={{ transform: `scale(${scale})` }}>
            {view === 'find' ? <Find key="find" seeker={seeker} mirror /> : <MapView key="map" seeker={seeker} mirror />}
          </div>
        )}
      </div>
    </section>
  )
}
