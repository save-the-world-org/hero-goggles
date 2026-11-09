import { useEffect, useRef, useState } from 'react'
import { api } from './api.js'

const GITAR_RULE = 'https://github.com/save-the-world-org/hero-goggles/blob/main/.gitar/rules/instrumentation.md'
const RADAR_FRESH_MS = 10000
const VENUE_TZ = 'America/Denver' // the Salt Palace

// What influence-api is wired to: {elasticsearch: {on, url}, telemetry: {on, endpoint},
// radar: {lastSeen, mirrored, lastEvent, confirmed, lastConfirmedAt, latencyMs}, alerts: {count, last}}, read every 5 s
// by the map page for this panel and Radar's strip. While the API answers 404 the rows stay grey and the links work.
export function useIntegrations() {
  const [info, setInfo] = useState(null)
  useEffect(() => {
    let alive = true
    let timer
    const poll = async () => {
      try {
        const r = await api('/api/integrations')
        if (alive) setInfo(r && typeof r === 'object' ? r : null)
      } catch {
        if (alive) setInfo(null)
      }
      if (alive) timer = setTimeout(poll, 5000)
    }
    poll()
    return () => ((alive = false), clearTimeout(timer))
  }, [])
  return info
}

// A string, or the message an event or alert carries.
const said = (x) => (x == null ? '' : typeof x === 'string' ? x : x.message || x.note || x.reason || x.title || x.name || '')

function Dot({ on }) {
  return <span className={`int-dot${on === true ? ' on' : on === false ? ' off' : ''}`} aria-label={on === true ? 'On' : on === false ? 'Off' : 'Unknown'} />
}

// Radar is on while it was seen, or confirmed an alert, in the last 10 s; undefined while the API says nothing of it.
const ms = (t) => (typeof t === 'number' ? (t < 1e12 ? t * 1000 : t) : Date.parse(t))
export function radarLive(info) {
  if (!info?.radar) return undefined
  const last = Math.max(...[info.radar.lastSeen, info.radar.lastConfirmedAt].map(ms).filter(Number.isFinite))
  return Number.isFinite(last) && Date.now() - last < RADAR_FRESH_MS
}

export default function Integrations({ info, onClose }) {
  const radarOn = radarLive(info)
  const confirmed = info?.radar?.confirmed
  const latency = Number.isFinite(info?.radar?.latencyMs) ? `, ${(info.radar.latencyMs / 1000).toFixed(1)} s to confirm` : ''
  return (
    <aside className="panel integrations" aria-label="Integrations">
      <header>
        <h2>Integrations</h2>
        {!info && <span className="muted int-wait">Waiting for influence-api</span>}
        <button className="btn small ghost" onClick={onClose} aria-label="Close integrations">
          Close
        </button>
      </header>
      <ul className="int-rows">
        <li>
          <Dot on={radarOn} />
          <div>
            <strong>Skyhook Radar</strong>
            <span>{info?.radar?.mirrored ?? 0} alerts mirrored to the cluster's event timeline</span>
            {confirmed != null && <span>{`${confirmed} alerts confirmed${latency}`}</span>}
            {said(info?.radar?.lastEvent) && <span className="int-last">{said(info.radar.lastEvent)}</span>}
          </div>
        </li>
        <li>
          <Dot on={info?.telemetry ? !!info.telemetry.on : undefined} />
          <div>
            <strong>Dash0</strong>
            <span>Traces and metrics from influence-api</span>
            <a href="https://app.dash0.com" target="_blank" rel="noreferrer">
              Open Dash0
            </a>
          </div>
        </li>
        <li>
          <Dot on={info?.elasticsearch ? !!info.elasticsearch.on : undefined} />
          <div>
            <strong>Elasticsearch</strong>
            <Search />
          </div>
        </li>
        <li>
          <Dot on={true} />
          <div>
            <strong>Gitar</strong>
            <span>Reviews every pull request against the instrumentation rule</span>
            <a href={GITAR_RULE} target="_blank" rel="noreferrer">
              The rule
            </a>
          </div>
        </li>
        <li>
          <Dot on={info?.alerts ? (info.alerts.count ?? 0) > 0 : undefined} />
          <div>
            <strong>Alerts</strong>
            <span>{info?.alerts?.count ?? 0} sent</span>
            {said(info?.alerts?.last) && <span className="int-last">{said(info.alerts.last)}</span>}
          </div>
        </li>
      </ul>
    </aside>
  )
}

// A session's time at the venue. A time without a zone is shown as written.
function when(s) {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return String(s)
  const zoned = /(?:[zZ]|[+-]\d\d:?\d\d)$/.test(s)
  return d.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit', ...(zoned ? { timeZone: VENUE_TZ } : {}) })
}
const names = (sp) => (Array.isArray(sp) ? sp.map((p) => (typeof p === 'string' ? p : p?.name)).filter(Boolean).join(', ') : typeof sp === 'string' ? sp : '')
const kindOf = (index = '') => (index.startsWith('kubecon-sessions') ? 'Session' : index.startsWith('kubecon-speakers') ? 'Speaker' : index.startsWith('influence') ? 'Influence' : '')

// Search KubeCon: sessions, speakers and Influence's own records, the top five as you type.
function Search() {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState(null)
  const seq = useRef(0)
  const run = async (text) => {
    const mine = ++seq.current
    if (!text.trim()) return setHits(null)
    try {
      const r = await api(`/api/search?q=${encodeURIComponent(text.trim())}`)
      const rows = Array.isArray(r) ? r : Array.isArray(r?.hits) ? r.hits : []
      if (mine === seq.current) setHits(rows.slice(0, 5))
    } catch {
      if (mine === seq.current) setHits([])
    }
  }
  useEffect(() => {
    const t = setTimeout(() => run(q), 300)
    return () => clearTimeout(t)
  }, [q])
  return (
    <div className="int-search">
      <form
        className="typed"
        onSubmit={(e) => {
          e.preventDefault()
          run(q)
        }}
      >
        <input value={q} onInput={(e) => setQ(e.currentTarget.value)} placeholder="Search KubeCon: try “ebpf”" aria-label="Search KubeCon" enterKeyHint="search" />
      </form>
      {hits && (
        <ol className="int-hits">
          {hits.length === 0 && <li className="muted">Nothing found</li>}
          {hits.map((h, i) => {
            const kind = kindOf(h.index)
            const sub =
              kind === 'Session' ? [when(h.startsAt), (h.room || '').replace(/^Salt Palace \| /, ''), names(h.speakers)].filter(Boolean).join(' · ') : h.tagline || [h.room, when(h.startsAt)].filter(Boolean).join(' · ')
            return (
              <li key={h.id || `${h.index}-${i}`}>
                {kind && <span className="int-kind">{kind}</span>}
                <strong>{h.title || h.name || 'Untitled'}</strong>
                {sub && <span>{sub}</span>}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
