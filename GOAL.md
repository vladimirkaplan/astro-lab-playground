# AST110 lab sims: build brief

You are building a free, static web service that teaches the BMCC AST110 (Intro to
Astronomy) labs through imitations: for each lab, a student reads a short explanation,
plays with a simulation, and checks themselves with exercises. Any student should be
able to open it in a browser and learn the lab without the physical kit. This is
practice and understanding only; it is not a lab submission tool (see guardrails).

Start by reading `/home/openwork/workspaces/main/BMCC/AST110/extracted/AST110-overview.md`
for what each lab actually asks for, and the per-lab `labN-how-to.md` files in the same
folder for worked details. Use them to make sure the sims answer the real questions the
course asks. Do not copy text from the lab manual into the site; rewrite everything (see
guardrails). Keep the student's personal data (name, scans, answers) out of this project
entirely.

## What to build

Repo `lab-sims/` becomes a public GitHub repo. Plain HTML, CSS, ES modules and canvas,
no build step, works from `file://` and from GitHub Pages. Node 22 is available here for
test scripts; do not add a framework unless you hit a real wall.

Structure:

- `site/index.html`: landing page, one card per lab, progress ticks saved in
  localStorage.
- `site/labs/<NN>-<slug>/index.html`: every lab page has three tabs:
  - Learn: what the lab is about, the physics in a few paragraphs, a
    "why this matters to astronomers" note, and common mistakes. Written fresh, in
    plain English, grounded on OpenStax Astronomy 2e (cite it as the source, CC BY 4.0).
  - Simulate: the interactive imitation. Specific per-lab specs below.
  - Check: self-graded exercises with tolerances (a real instrument is imprecise, so
    accept a range, show the right working, never a bare answer first). A Fun Mode
    toggle adds realistic instrument noise to measurements; Ideal Mode is exact.
- `site/shared/`: `plot.js` (canvas scatter + slope tool + line fit), `sky.js`
  (RA/Dec grids, star charts drawn from the catalog), `ephem.js` (sun/moon positions;
  vendor the MIT `astronomy-engine` library), `store.js` (localStorage of the
  student's data tables, export as CSV or a printable table they can copy into their
  report), `ui.js` (tabs, hint system, banner).
- `site/data/`: emission-line wavelengths for H, He, Ne, Hg, Kr and lamp continua
  (published values, cite NIST), bright-star catalog subset (~200 stars with the ones
  the course needs), planet orbital elements.
- `LICENSE` = MIT for code; `LICENSE.docs.md` = CC BY 4.0 for the written explanations;
  `assets/img/ATTRIBUTION.md` for any public-domain image.
- README.md: what it is, how to run locally, how to deploy to Pages, and the intro
  disclaimer.

## Lab specs, in build order

Phase 0, skeleton plus the flagship:

1. Spectra (student Lab 9): a bench with a diffraction-grating viewer. Click a source
   (incandescent bulb, H, He, Ne, Hg, Kr tubes, fluorescent lamp) and render its true
   spectrum on canvas (lamp = continuous; gases = their real lines; fluorescent =
   phosphor continuum plus mercury lines). Replay the data-page task: click a color
   word to mark lines, note the outer lines' wavelengths, subtract, and match unknown
   spectra to gases. Check questions: fingerprints, what lines in a star mean.
2. Hubble's law (Lab 15): dots on an inflating balloon (also a flat 2-D mode), distance
   vs recession-velocity measurements at chosen expansions, scatter plot, student fits
   the slope, compare with a chosen H0, noise mode included.
3. Measurement (Lab 1): on-screen ruler with parallax/error questions, coin-mass
   readings vs a set "true" value, percent-error trainer. Small, but it sets the pattern
   for the graded numeric exercises every later lab reuses.

Phase 1, easy physics playgrounds:

4. Pendulum gravity (Lab 8): drag the length (30/55/75/100 cm presets per the course),
   run 15 timed swings, timer button like the real kit, auto-fill the data table,
   plot T-squared vs L, slope tool, get g from the slope, compare 9.8, percent error.
5. Lenses and telescopes (Lab 7): thin-lens ray diagram that updates live, object and
   focal-length handles, image location/magnification, then a two-lens telescope mode
   with the course magnification definition.
6. Moon phases (Lab 5): draggable Sun-ball-Earth geometry, phase renderer, percent-lit
   and age readouts, then the course table task: given a date and time the student
   predicts phase/rise/set times and checks against the ephemeris.
7. Moonrise and eclipses (manual Pos. 5 aspirational board): top-down eclipse-board
   simulator that matches the manual task: Earth with a tilted Moon orbit lettered A-H,
   four yearly positions (June, September, December, March), shades the lit side,
   student places the full/new/eclipse positions and learns why eclipses need nodes.
8. Time, latitude and longitude (Labs 16 and 17): a flat graticule with place dropper
   plus a clock-face time-zone board; exercises mirror the course clock problems.

Phase 2, sky geometry and graphs:

9. Celestial sphere (Lab 3): draggable RA/Dec chart of the bright-star catalog,
   Sun-on-the-ecliptic-by-date, quiz mode "name that star from coordinates", the
   birthday Sun position problem as a worked simulation.
10. Phases of Venus (Lab 8): inner-planet orbit viewer, phases at four orbit points,
    match phase to position, why it killed the pure geocentric model.
11. Mathematics for astronomy (Lab 2): measure pi with a drawn circle, small-angle
    formula playground (hold a coin at arm's length), scientific-notation drill.
12. HR diagram and variable stars (Labs 12 and 13): a plot explorer with real star
    samples, then a light-curve editor: the sim generates an eclipsing-binary curve,
    student finds period and amplitude from it and plots the amplitudes.
13. Heliocentric parallax (Lab 11): 3-D sandbox, crawl to other orbits and watch the
    parallax baseline change; annual-parallax animation for nearby stars vs far ones.

Phase 3, the heavy one and the cleanups:

14. Retrograde Mars (Lab 4): two circular orbits (Earth and Mars, real periods), a date
    scrubber, and the line of sight from Earth projected onto a canvas star chart, so
    the student watches the retrograde loop build and can export the RA/Dec table for a
    date range. This is the hardest sim; circular orbits are honest enough for this
    course, say so in the Learn text.
15. Galaxy identification (Lab 14): quiz gallery from public-domain images (Wikimedia
    Commons license-tagged, record every attribution) or procedural drawings if
    licensing looks risky.
16. Homeworks 1 and 2 (HW1 paragraph topics, HW2 ratio tables): plain interactive
    worksheets with self-check. They are quizzes, not sims.

## Guardrails, these are hard rules

- Never copy the BMCC lab manual text or figures; the site explains the physics itself,
  citing OpenStax Astronomy 2e as an open source.
- Every lab page carries a visible line: "Practice sim, not your BMCC submission. Do
  the real lab and follow your instructor's rules."
- No student names, no student data, no answer files from this workspace ever go into
  the repo or the site.
- Cite data every sim renders (line lists, catalogs, ephemeris accuracy note).
- Numbers the course treats as fixed (pi = 3.14 for the pendulum lab, 15 swings, the
  fixed pendulum lengths) stay fixed in Course Mode; sims may offer a free-play sandbox
  on top.

## Done means

Every lab page: Learn text, working sim, graded Check exercises with tolerances, CSV
export of the student's own data table, works offline after one load (service worker),
keyboard usable, `node --test` passing for the pure math/ephem/data modules, and a
`npx http-server` run through every page at phone and desktop widths. README covers
local run, Pages deploy, and adding a lab. Then one GitHub issue per lab as the task
tracker.

## Deploy notes

Canonical origin is the public GitHub repo:
`https://github.com/vladimirkaplan/astro-lab-playground` (main branch).
A private self-hosted mirror stays current as a backup remote; keep all
private identifiers (tokens, internal hostnames, credentials) out of the
tree so every push to GitHub is safe. Repo-local git identity uses the
owner's GitHub name with the noreply email.

