# Hero Goggles

Hero Goggles, by Darkshift: how close you are to the influencer you are looking for, on Ray-Ban Display glasses.
A React app (on `preact/compat`), shipped by Infrared.

## Run it

    npm install
    npm run dev      # http://localhost:5173, preview in a desktop browser
    npm run build    # dist/, what production serves

Infrared builds this repo with Paketo buildpacks: it finds `vite.config.js`, runs `npm run build` and serves `dist/`
with nginx.

## On the glasses

The glasses run Web Apps from an HTTPS address, so it works the same whether the paired phone is Android or iPhone.

1. Meta AI app: Settings, App Info, tap the App version five times, Enable (Developer Mode).
2. App Settings, App connections, Add a Web App, and give it the production address, `https://hero-goggles.darkshift.cloud`.
3. Open Hero Goggles from the glasses' apps.

## Building for the display

- 600 x 600, additive: black is see-through, so keep the ground black and draw light.
- Input is arrow keys and Enter from the touchpad and Neural Band. Use real `<button>`s and let the browser move
  focus; Enter fires `click`. Don't handle keys yourself, or a press activates twice.
- Back is `history.back()`. The host allows five history entries, so push at most one per screen.
- `<meta name="mrbd-web-app-capable" content="yes">` and `application-name` stay in `index.html`.
- `public/.well-known/meta-wearables-manifest.json` gives the glasses the app's name, icon (a one-colour mask) and
  colour.
- Keep the first load under 300 KB and 15 requests: the glasses' link is slow. React runs on `preact/compat`
  (`vite.config.js`), and the one web font is Syncopate cut to capitals and digits.

## The icon

`public/brand/hero-goggles.svg` is the Darkshift goat from the brand kit, its path unchanged, in a cape and an eye
mask, one colour, the cape and mask set apart by cut lines (the glasses want a one-colour mask).
