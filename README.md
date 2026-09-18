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

Rough map of the file (5,634 lines):

| Lines | What |
| --- | --- |
| 11–2269 | All CSS, in one `<style>` block |
| 2293–2534 | Hero section |
| 2535–2579 | Admission Open band |
| 2580–2641 | Our Value System, with the constellation game |
| 2642–2678 | About section |
| 2679–2752 | Our Popular Classes — the school train and its level cards |
| 2753–2805 | Campus section — the 3D scene's container |
| 2806–2909 | Admissions section, including the enquiry form |
| 2910–2943 | Closing call-to-action with the counters |
| 2944–3005 | Footer and contact details |
| 3006–3955 | Page JavaScript: nav, scroll effects, counters, each section's motion |
| 3956– | The three.js campus scene, as one ES module |

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
