import { useEffect, useRef, useState } from 'react'
import { DEMO_ALERTS, alertBig, alertTone, demoAlert } from './alerts.js'
import './lens-alert.css'

const SHOW_MS = 3000
// Ids already shown, for the page's life: Find and Map each mount their own band, and an alert stays in the target
// poll for 8 s, so moving between them must not show it again.
const shown = new Set()

// A distance alert in the lens: a full-width band over the card for 3 s, the big words, the name and a colour pulse,
// light on black. It takes the `alert` the target poll already carries; nothing to focus, so keys pass by it.
export default function LensAlert({ alert, seeker }) {
  const demo = useDemoAlert(seeker)
  const a = demo || alert
  const [current, setCurrent] = useState(null)
  const timer = useRef(0)

  useEffect(() => {
    if (!a?.id || shown.has(a.id)) return
    shown.add(a.id)
    setCurrent(a)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCurrent(null), SHOW_MS)
  }, [a?.id])
  useEffect(() => () => clearTimeout(timer.current), [])

  if (!current) return null
  return (
    <div key={current.id} className={`lens-alert ${alertTone(current)}`} role="alert">
      <span className="lens-alert-big">{alertBig(current)}</span>
      <span className="lens-alert-name">{current.name || current.message}</span>
    </div>
  )
}

function useDemoAlert(seeker) {
  const [a, setA] = useState(null)
  useEffect(() => {
    if (!DEMO_ALERTS) return
    let n = 0
    const t = setInterval(() => setA(demoAlert(n++, seeker)), 5000)
    return () => clearInterval(t)
  }, [seeker])
  return a
}
