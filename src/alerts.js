// Distance alerts from influence-api, shared by the lens and /live/. An alert is
// {id, seekerId, influencerId, name, beaconId, kind, feet, distanceFt, at, message}: kind is closer, farther, found or
// lost, and feet the threshold crossed (50, 30, 20, 10, 5, or 3 for found). Until the API sends them, nothing shows.

// Skyhook Radar confirms an alert by sending it again, same id, with source 'radar', radarAt, radarReason (HeroCloser,
// HeroFound, HeroFarther or HeroLost) and radarEventId. Without those fields an alert is the API's own, unconfirmed.
export const isRadar = (a) => a?.source === 'radar'
// From the API's alert to Radar's confirmation: "1.2 s", or '' while either time is missing.
export function confirmedIn(a) {
  const ms = Date.parse(a?.radarAt) - Date.parse(a?.at)
  return Number.isFinite(ms) && ms >= 0 ? `${(ms / 1000).toFixed(1)} s` : ''
}

// The big words: "10 FT", "FOUND" or "LOST".
export function alertBig(a) {
  if (a.kind === 'found') return 'FOUND'
  if (a.kind === 'lost') return 'LOST'
  const ft = a.feet ?? (a.distanceFt != null ? Math.round(a.distanceFt) : null)
  return ft != null ? `${ft} FT` : String(a.kind || '').toUpperCase()
}

// The kind as a class: found is green, lost red, farther amber; closer takes the influencer's colour or green.
export const alertTone = (a) => (a?.kind === 'found' || a?.kind === 'lost' || a?.kind === 'farther' ? a.kind : 'closer')

// Dev only: ?demoAlert=1 makes up one alert every 5 s, walking in on a hero and away again, each sent first as the
// API's and then, 1 s later, again as Radar confirms it (demoConfirm). The build drops it.
export const DEMO_ALERTS = import.meta.env.DEV && new URLSearchParams(location.search).has('demoAlert')
const DEMO_STEPS = [['closer', 50], ['closer', 30], ['closer', 20], ['closer', 10], ['closer', 5], ['found', 3], ['farther', 20], ['lost', null]]
export function demoAlert(n, seekerId, inf = {}) {
  const [kind, feet] = DEMO_STEPS[n % DEMO_STEPS.length]
  const name = inf.name || 'Kunal'
  const message = kind === 'found' ? `Found ${name}` : kind === 'lost' ? `Lost ${name}` : kind === 'farther' ? `${name} moving away, ${feet} ft` : `${name} within ${feet} ft`
  return { id: `demo-${Date.now()}`, seekerId, influencerId: inf.id || 'demo', name, beaconId: 'demo', kind, feet, distanceFt: feet ?? 60, at: new Date().toISOString(), message, source: 'api' }
}
const REASONS = { closer: 'HeroCloser', found: 'HeroFound', farther: 'HeroFarther', lost: 'HeroLost' }
export const DEMO_CONFIRM_MS = 1000
export const demoConfirm = (a) => ({ ...a, source: 'radar', radarAt: new Date().toISOString(), radarReason: REASONS[a.kind] || 'HeroCloser', radarEventId: `ev-${a.id}` })
