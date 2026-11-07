# Astro Lab Playground

Practice simulations for an introductory astronomy lab course (the BMCC AST110
sequence). Every built lab is three tabs: **Learn** (what the lab is about, in plain
English), **Simulate** (an interactive imitation of the equipment), and **Check**
(self-graded exercises with tolerances, hints, and shown working).

Unofficial student project. Not affiliated with, or sanctioned by, any college. This is
a learning tool, not a way to skip a lab or submit fake work: do the real lab, follow
your instructor's rules. Every lab page repeats this as a banner.

## Status

Eleven lab pages are live; the rest of the brief in [GOAL.md](GOAL.md) is queued.

Built (each one Learn + Simulate + Check, with a CSV export of your own data table):

- Lab 1 Measurement: ruler with parallax, coin balance, percent-error trainer
- Lab 3 Celestial sphere: pan-and-zoom RA/Dec chart, ecliptic, birthday-Sun finder
- Lab 5 Phases of the Moon: geometry sandbox plus a real New York ephemeris
- Lab 7 Lenses and telescopes: live ray bench, then a two-lens spyglass
- Lab 8 Pendulum gravity: 15 timed swings, T^2 vs L fit, get 9.8 out of a stopwatch
- Lab 9 Spectra: bench grating viewer on real NIST line data, unknowns to identify
- Lab 12 Moonrise and eclipses: top-down eclipse board with the node rule
- Lab 15 Hubble's Law: balloon/flat expansion runs, slope fits, a synthetic cosmic sample
- Labs 16-17 Time, latitude, longitude: graticule dropper and clock-face zones
- Lab 2 Mathematics for astronomy: wrap-a-tape pi bench, small-angle playground
  from a pocket coin to the Sun, with the eclipse coincidence built in
- Phases of Venus: orbit viewer where phase, elongation and apparent size move together,
  with the Ptolemaic prediction drawn beside the real thing. The course number for this
  one is not pinned down yet, so the page carries no number.

Still planned: HR diagram and variable stars, heliocentric
parallax, retrograde Mars, galaxy identification, and the two homework worksheets. Their
landing-page cards are placeholders.

## Run it locally

There is no build step. Any of:

- Double-click `site/index.html`. It works from `file://`.
- Serve the folder (recommended for full fidelity, including downloads):

  ```sh
  npx http-server site -p 8080
  # or
  python3 -m http.server -d site 8080
  ```

- Tests only need Node 22+: `npm test` (or `node --test tests/*.test.js`).

A note on modules: browsers refuse to `import` ES modules over `file://` (CORS), so the
shared code loads as plain ordered scripts that attach to one `LS` namespace. Same files
are Node-loadable, which is how the tests exercise the pure math and data modules.

## Deploy to GitHub Pages

Push the repo, then in Settings, Pages: Source "Deploy from a branch", branch `main`,
folder `/site`. Everything uses relative paths, so any base URL works.
A service worker for offline reuse after the first visit is on the phase roadmap; over
`file://` the files are local either way.

## Layout

```
site/
  index.html          landing: one card per lab + saved progress ticks
  styles.css          the site's single stylesheet
  shared/             units, fit math, tabs/hints/banner UI, data tables, plots
  data/               spectral line lists (cited) for the spectra lab
  labs/<nn>-<slug>/   one folder per lab (venus-phases carries no number yet)
    index.html        Learn + Simulate + Check tabs
    sim.js            the interactive imitation
tests/                node --test suites for the pure modules
```

## Adding a lab

1. Create `site/labs/<course-num>-<slug>/index.html`: header, three tab panels, scripts
   `shared/units.js`, `ui.js`, `store.js`, `check.js`, then lab modules, then `sim.js`
   which ends with the standard boot (banner, tabs, mode toggle, check init).
2. Use `LS.ui.hintBox` (built into every exercise) and `LS.check` exercise types:
   `numbers`, `choice`, `sequence`, `keywords`, `feetinches`. Tolerances are part of the
   exercise config: instruments are imprecise, the answers give credit for a band, not a
   string match.
3. Keep Course Mode values fixed (the numbers the course treats as given); put extra
   freedom in free-play only.
4. Fun Mode: route every measurement through the mode flag and jitter it there.
5. Cite rendered data (line lists, catalogs, models) next to what draws it.
6. Put pure math in Node-loadable files and pin it with a small test in `tests/`.
7. Hard rules: never copy BMCC manual text or figures; never place student names, data,
   or answer files anywhere in the tree; keep the disclaimer banner and license headers
   intact on every page (see the guardrails section of GOAL.md).

## Licenses and attribution

- Code: MIT (see [LICENSE](LICENSE)).
- Prose (Learn tabs and these docs): CC BY 4.0 (see [LICENSE.docs.md](LICENSE.docs.md));
  explanations adapted from OpenStax *Astronomy 2e* (CC BY 4.0).
- Spectral data: NIST Atomic Spectra Database, noted in `site/data/lines.js` and in the
  spectra page.
- The cosmic sample in Lab 15 is clearly labeled synthetic (a model sky plus labeled
  peculiar-velocity noise), not catalog data.

No public-domain image assets are used yet; when they arrive they go under
`assets/img/` with entries in `assets/img/ATTRIBUTION.md`.

## Data privacy

Student measurements (data tables, progress ticks, mode choices) live in your browser's
localStorage and never leave your device. The site sends nothing anywhere; there is no
account, analytics, or remote font.
