// Distance alerts from influence-api, shared by the lens and /live/. An alert is
// {id, seekerId, influencerId, name, beaconId, kind, feet, distanceFt, at, message}: kind is closer, farther, found or
// lost, and feet the threshold crossed (50, 30, 20, 10, 5, or 3 for found). Until the API sends them, nothing shows.

// The big words: "10 FT", "FOUND" or "LOST".
export function alertBig(a) {
  if (a.kind === 'found') return 'FOUND'
  if (a.kind === 'lost') return 'LOST'
  const ft = a.feet ?? (a.distanceFt != null ? Math.round(a.distanceFt) : null)
  return ft != null ? `${ft} FT` : String(a.kind || '').toUpperCase()
}

// The kind as a class: found is green, lost red, farther amber; closer takes the influencer's colour or green.
export const alertTone = (a) => (a?.kind === 'found' || a?.kind === 'lost' || a?.kind === 'farther' ? a.kind : 'closer')

// Dev only: ?demoAlert=1 makes up one alert every 5 s, walking in on a hero and away again. The build drops it.
export const DEMO_ALERTS = import.meta.env.DEV && new URLSearchParams(location.search).has('demoAlert')
const DEMO_STEPS = [['closer', 50], ['closer', 30], ['closer', 20], ['closer', 10], ['closer', 5], ['found', 3], ['farther', 20], ['lost', null]]
export function demoAlert(n, seekerId, inf = {}) {
  const [kind, feet] = DEMO_STEPS[n % DEMO_STEPS.length]
  const name = inf.name || 'Kunal'
  const message = kind === 'found' ? `Found ${name}` : kind === 'lost' ? `Lost ${name}` : kind === 'farther' ? `${name} moving away, ${feet} ft` : `${name} within ${feet} ft`
  return { id: `demo-${Date.now()}`, seekerId, influencerId: inf.id || 'demo', name, beaconId: 'demo', kind, feet, distanceFt: feet ?? 60, at: new Date().toISOString(), message }
}
