// The Cloud Native Hackathon's sponsors, by their own logo files (public/sponsors/, copied, never redrawn), shown
// wherever their product does the work on /live/. Only /live/ loads these: the glasses' first load stays as it was.
// OpenAI sponsored the hackathon and is thanked; Hero Goggles makes no use of it, so it is never shown as an integration.
const S = '/sponsors/'

export const LOGOS = {
  radar: { src: `${S}radar.svg`, alt: 'Skyhook Radar' },
  dash0: { src: `${S}dash0.png`, alt: 'Dash0' },
  elasticsearch: { src: `${S}elasticsearch.png`, alt: 'Elasticsearch' },
  gitar: { src: `${S}gitar.svg`, alt: 'Gitar', chip: true }, // purple on transparent: a light chip behind it
  sonar: { src: `${S}sonar.svg`, alt: 'Sonar' },
  openai: { src: `${S}openai.svg`, alt: 'OpenAI' },
  wemakedevs: { src: `${S}wemakedevs.svg`, alt: 'WeMakeDevs' },
  infrared: { src: `${S}infrared-landscape-color-white.svg`, alt: 'Infrared' },
  darkshift: { src: `${S}darkshift-landscape-white.svg`, alt: 'Darkshift' },
}

export function Logo({ name, className = '', alt }) {
  const l = LOGOS[name]
  return (
    <span className={`sp-logo sp-${name}${l.chip ? ' chip' : ''}${className ? ` ${className}` : ''}`}>
      <img src={l.src} alt={alt ?? l.alt} loading="lazy" decoding="async" />
    </span>
  )
}

// "Search by Elasticsearch": under every search box Elasticsearch answers.
export function SearchBy() {
  return (
    <span className="sp-by">
      Search by <Logo name="elasticsearch" alt="" /> Elasticsearch
    </span>
  )
}

// The thank-you: the hackathon, its sponsors and its host; then what Hero Goggles is built and hosted on.
export function Credits({ corner = false }) {
  return (
    <footer className={`sp-credits${corner ? ' corner' : ''}`} aria-label="Thanks">
      <p>
        Built at the <a href="https://www.wemakedevs.org/hackathons/cnh" target="_blank" rel="noreferrer">Cloud Native Hackathon</a> by WeMakeDevs, with Sonar, Dash0,
        Radar, Elasticsearch and OpenAI
      </p>
      <div className="sp-row">
        <Logo name="wemakedevs" />
        <Logo name="sonar" />
        <Logo name="dash0" />
        <Logo name="radar" />
        <Logo name="elasticsearch" />
        <Logo name="openai" />
      </div>
      <p>
        Built and hosted on <a href="https://darkshift.io" target="_blank" rel="noreferrer">Infrared by Darkshift</a>
      </p>
      <div className="sp-row">
        <Logo name="infrared" />
        <Logo name="darkshift" />
      </div>
    </footer>
  )
}
