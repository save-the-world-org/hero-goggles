import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Find from '../Find.jsx'
import MapView from '../MapView.jsx'
import './lens.css'

// The Lens: what the Ray-Ban Display shows, beside the map. It draws the glasses' own Find and Map, with their alert band,
// for this page's seeker, laid out at the lens's 600 x 600 and scaled into the frame, so it reads exactly as the lens
// does. Only the screen showing is mounted, so it makes the requests the glasses make and no more. Auto flips every 6 s.
const LENS_PX = 600
const FLIP_MS = 6000
const MODES = [
  ['auto', 'Auto'],
  ['find', 'Find'],
  ['map', 'Map'],
]

export default function Lens({ seeker, live }) {
  const [mode, setMode] = useState('auto')
  const [flip, setFlip] = useState('find')
  const [scale, setScale] = useState(0.5)
  const frame = useRef(null)

  useEffect(() => {
    if (mode !== 'auto') return
    const t = setInterval(() => setFlip((v) => (v === 'find' ? 'map' : 'find')), FLIP_MS)
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

  const view = mode === 'auto' ? flip : mode
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
          {MODES.map(([id, label]) => (
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
        <div className="lens-stage" style={{ transform: `scale(${scale})` }}>
          {view === 'find' ? <Find key="find" seeker={seeker} mirror /> : <MapView key="map" seeker={seeker} mirror />}
        </div>
      </div>
    </section>
  )
}
