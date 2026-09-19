# Ankur International School — website

A single-page website. One self-contained file, no framework and no build step.

## Opening it

Double-click `index.html`, or drag it into a browser. That's the whole site —
it loads and runs straight from disk.

It is also published at
<https://jethavanikhil-dotcom.github.io/Ankur-International-School/>, served by
GitHub Pages from this repository.

The interactive 3D campus section loads three.js from a CDN, so that one section
needs an internet connection. Everything else works offline.

If a browser blocks the ES module (some do for `file://` URLs), serve the folder
over HTTP instead:

```
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.

## Editing it

**All edits go in `index.html`.** Everything lives in that one file:
the markup, the CSS in a single `<style>` block, the JavaScript in a handful of
inline `<script>` blocks, and the photographs as base64 data URIs.

Rough map of the file (7,632 lines):

| Lines | What lives there |
| --- | --- |
| 11–2984 | All CSS, in one `<style>` block |
| 3011–3286 | Hero section |
| 3287–3331 | Admission Open band |
| 3332–3393 | Our Value System, with the constellation game |
| 3394–3430 | About section |
| 3431–3504 | Our Popular Classes — the school train and its level cards |
| 3505–3558 | From the Principal's desk — the well and what comes out of it |
| 3559–3611 | Campus section — the 3D scene's container |
| 3612–3735 | Events & Activities — the wheel of cards |
| 3736–3843 | What families say — the testimonial notebook |
| 3844–3947 | Admissions section, including the enquiry form |
| 3948–3981 | Closing call-to-action with the counters |
| 3982–4043 | Footer and contact details |
| 4049–4679 | The sound button and the sound engine |
| 4680–5945 | Page JavaScript: nav, scroll effects, counters, each section's motion |
| 5946– | The three.js campus scene, as one ES module |

Line numbers drift with every edit; treat them as a starting point, not a
reference.

## ⚠️ `assets/` is a dead copy — editing it changes nothing

The `assets/` folder holds a verbatim extraction of the same CSS and JavaScript
that is already inline in `index.html`. **The page does not reference it.**
There is not a single `assets/` path anywhere in the HTML, so no `<link>` or
`<script src>` pulls those files in.

Someone started splitting the single file into separate parts and stopped before
wiring them up. It is committed here only so the work isn't lost. Until the split
is actually finished, changes made under `assets/` have no effect on what a
browser renders.

`assets/images/globe.png` and `assets/images/plane.png` are unreferenced by
anything at all.

## Sound

The page can make sound, and **every sound is generated in the browser** with the
Web Audio API. There are no audio files in this repository and none are fetched;
the engine builds each one out of oscillators and filtered noise.

It is off until the visitor presses the button at the bottom left (browsers block
audio before a gesture in any case), the choice is kept in `localStorage`, and
everything stops while the tab is hidden.

`window.Sfx` is the whole interface:

| Call | What it does |
| --- | --- |
| `Sfx.play(name)` | one sound: `bell`, `horn`, `whistle`, `chalk`, `chime`, `sparkle`, `thud`, `creak`, `rustle`, `hello`, `pop`, `success` |
| `Sfx.train(true/false)` | starts and stops the chuffing while the train rolls |
| `Sfx.drive(0…1)` | the bus's diesel, at the level given |
| `Sfx.set(true/false)`, `Sfx.toggle()`, `Sfx.on` | the switch |
| `Sfx.theme` | which section's music is playing |

**Every call is a no-op while the sound is off**, so callers never have to check
first.

The background music is one engine reading a different theme for each section —
its chord sequence, how high the melody sits, how often it plays, how long the
notes ring. All the themes are in D major, which is what lets one section hand
over to the next without a seam; a theme in another key would clash at every
boundary. The melody itself is a random walk with rests, rolled as it plays, so
it never repeats.

Two things that are easy to get wrong here, because both were got wrong first
time and both sound like static rather than like a bug:

- The shared noise buffer must not clip. Build it, then remove the mean and
  normalise; do not clamp.
- Never wire a modulator straight onto a gain `AudioParam` with more depth than
  the envelope. The gain goes negative, which is ring modulation, not tremolo.
  Use the `trem()` helper, which modulates a gain node that cannot reach zero.

## External dependencies

Loaded from CDNs at runtime, nothing installed:

- Google Fonts — Outfit and Caveat
- Lenis 1.1.13 — smooth scrolling
- three.js 0.169.0 — the 3D campus scene

## Known placeholders

The branding now reads Ankur International School. These contact details are still
stand-ins and need real values:

| Placeholder | Where it appears |
| --- | --- |
| `+91 00000 00000` (links to `tel:+910000000000`) | Admissions section, the "Call Admissions" button, footer |
| `admissions@yourschool.com` | Admissions section |
| `hello@yourschool.com` | Footer |
| `Your school address, City, State 000000` | Footer |
| `Mon–Sat, 8:00 am – 4:00 pm` | Footer — inherited from the template, so worth confirming |

Also still outstanding:

- The counters (years, students, staff ratio) are placeholder numbers
- Social and policy links point at `#`
- The enquiry form validates and shows a success message, but sends nothing anywhere —
  submissions are lost
