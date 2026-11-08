# RESUME RULE (added 2026-11-07 by Vladimir's instruction)

Long sessions on the current model corrupt output: the last two work sessions
produced fully garbled visible replies partway through (first seen 2026-11-06,
repeated 2026-11-07). Two delegated sub-agent runs also degraded into garbage
near their ends. This is a harness/model stability problem, not a code problem.

Project rules for lab-sims work (user directive 2026-11-07):

1. Work in SHORT sessions. One work item = one session. Never piggyback a
   second item onto a session that already shipped something.
2. Delegate the actual building to sub-agents (fresh small contexts). Verify
   their output mechanically in the main session: `node --check`, `npm test`,
   a quick headless page load, then commit + push to GitHub.
   Brief size limit: a 6-file brief came back EMPTY with zero files written
   twice on 2026-11-07. Split multi-file items into narrow delegations
   (e.g. data + pure logic + tests first, then the page/sim + landing card).
3. If ANY visible garbling appears (in the main session or a sub-agent
   report): stop immediately, commit the verified state, update the BMC-1
   plan document, and continue in a new session with the prompt below.
4. Sub-agents write files and run tests but NEVER run git commit/push.

## New-session prompt (paste this)

    Continue the astro-lab-playground work in Paperclip task BMC-1.
    Clone https://github.com/vladimirkaplan/astro-lab-playground, then read
    in order: RESUME.md (rules), GOAL.md, and the BMC-1 plan document for
    the live queue and state. Check the repo first:
    npm test && git status (must be clean, 98+ tests green).
    Per RESUME.md: one work item only, in a short session. Pick the next item
    from the plan document's queue. Prefer delegating the build to a fresh
    sub-agent with a narrow scope; then you verify (node --check on changed
    JS, npm test, quick page load) and commit + push.
    Update the plan document before ending. If any output garbles: stop,
    commit what is green, and tell me to start a new session.

## Queue snapshot

- DONE: labs 01, 05, 07, 08, 09, 12, 15, 16, 17, 03 (celestial sphere +
  site/data/stars.js catalog) + shared modules + ephemeris. The old small gaps
  (eclipse card live, inset label) shipped in ce40635.
- DONE 2026-11-07 (Paperclip "Chief", BMC-1): Phases of Venus at
  site/labs/venus-phases/ (venus.js pure geometry + 9 tests, sim with the
  Ptolemaic-prediction inset, observing log + CSV). 81 tests green. Built
  unnumbered: GOAL.md lists both the pendulum and Venus as "Lab 8", so the
  course number for Venus is unconfirmed and the page carries none. NOT YET
  PUSHED - this run had no GitHub write path; the work left the company as a
  `git am` patch attached to BMC-1. Apply it, then push to both remotes.
- DONE 2026-11-07 (Paperclip "Chief", BMC-1, second run): Lab 2 mathematics at
  site/labs/02-math/ (mathlab.js pure module + 7 tests -> 88 green, circle-bench
  pi measurement, small-angle bench with coin/Moon/Sun/Jupiter and telescope
  inset, eclipse coincidence, two CSV logs, 6 exercises). Vladimir answered the
  BMC-1 card: a classic GitHub token is coming (propose as Paperclip secret,
  then push Venus + this), manual transcriptions will arrive later and set the
  authoritative lab order, PHY110 is the next course after AST110.
- DONE 2026-11-07 (Paperclip "Chief", BMC-1, third run): The H-R diagram at
  site/labs/hr-diagram/ (hr.js: 29-star catalog + Stefan-Boltzmann core + 10
  tests -> 98 green; sim: clickable diagram with log-luminosity axes, reversed
  temperature axis, true star colours, main-sequence guide, and a radius machine
  that derives every radius from L and T; reading log + CSV; 7 exercises). Also
  three hires on Vladimir's directive (Lab Builder on qwen3.8-flash, Repo Steward
  for GitHub issues, License Counsel for the free-use frame). Still NOT PUSHED:
  no GitHub token in this run either, so Venus + Lab 2 + this ship as three
  `git am` patches attached to BMC-1. Variable stars and the Cepheid yardstick
  are split out of this card into their own queued lab. Next lab goes to the Lab
  Builder as a narrow brief, with the Chief verifying.
- DONE 2026-11-07 (Paperclip "Chief", BMC-1, sixth run): Heliocentric parallax at
  site/labs/parallax/ - built by the Lab Builder (BMC-5 module, BMC-6 page), verified by
  the Chief. parallax.js: 8 nearest systems on Gaia EDR3/HIPPARCOS parallaxes, d = 1000/p,
  the 2 AU January-to-July baseline, the parallactic ellipse with the equinox phase,
  11 tests -> 109 green. sim.js: the watch-the-wobble bench (protractor sky grid, ellipse
  squashing to a line as beta -> 0, Sun-Earth inset on the same phase) and the Be-a-Bessel
  bench (hidden target, two nights, p = shift/2, graded against the catalog) with a
  measurement log + CSV; 6 exercises. Landing card live. Also shipped in this chain: the
  Counsel's licence hygiene (MIT/CC BY line on every lab page via shared/ui.js, all data
  sources named in the landing footer, .gitignore image/scan guard, private paths out of
  GOAL/RESUME). Still NOT PUSHED: the token is in Paperclip but bound to the Repo Steward,
  and the Chief's secret grant has not landed, so the chain (Venus, Lab 2, H-R, hygiene,
  parallax module, parallax page) ships as six `git am` patches attached to BMC-1.
- DONE 2026-11-07 (Paperclip "Chief", BMC-1, seventh run): Variable stars and Cepheids
  at site/labs/variables/ - built by the Lab Builder (BMC-7 module, BMC-8 page), verified
  by the Chief. variables.js: 6-star catalog (three classical Cepheids, RR Lyrae, Algol,
  Mira), magnitude/distance-modulus arithmetic, the classroom Cepheid line
  M_V = -2.76 log P - 1.40 gated to 1-100 d so Mira's 332 d cannot be laundered into a
  distance, four light-curve families with the sawtooth, and the Leavitt move as code
  (fold, phase-dispersion statistic, coarse-to-fine period search); 18 tests -> 127 green.
  sim.js: the fold-smear bench (log period slider, live theta^2, knife-thin/smear/blob
  verdicts) and the be-Leavitt bench (hidden cluster Cepheid, two-step reduction graded
  against the truth) with a reduction log + CSV; 6 exercises. Landing card live.
  Still NOT PUSHED: the Chief-side github-token grant has not landed, so the chain now
  ships as eight `git am` patches attached to BMC-1.
- DONE 2026-11-08 (Lab Builder, BMC-10): Homework worksheets at
  site/homework/homework-1/ and site/homework/homework-2/, built on the verified
  hw-core engine (BMC-9). Each page is Learn / Practice / Check with the shared
  ui banner + licence, a per-page attempt log + CSV, Ideal-free (all generative,
  seeded fresh every attempt) and a 6-question exam-style quiz graded by check.js.
  HW1: concept-check pool (12 topics) + unit-factor-chain, light-travel (course
  c = 300000 km/s with the precise 299792.458 caveat), and scientific-notation
  benches (mantissa + exponent graded, micro-vs-milli trap). HW2: forward/reverse
  inverse-square and constant-force ratio tables, a live-ratio slider bench, and
  the honest k = G m1 m2 ratio-invariance intro. Landing page gains a "Homework
  practice" section with two live cards. New tests/hw-content.test.js re-derives
  every authored quiz answer from hw-core (light-week, prefix sci-notation, and a
  reverse-table row worked by hand): +9 tests -> 158 green. All new JS node --check
  clean; pages also driven through a throwaway DOM shim to catch wiring errors.
  NOT COMMITTED by the Lab Builder (per RESUME rule 4 and AGENTS.md): the Chief
  verifies and lands. Note hw-core.js + hw-core.test.js from BMC-9 are present in
  the same checkout and must land with (or before) these pages, which require them.
- Then: Phase 2 charts still planned on the landing page:
  galaxy gallery with Wikimedia images + ATTRIBUTION.md.
  Then Phase 3 data labs, worksheets, offline kit (service worker, zip, LXC
  recipe). See GOAL.md phases/issues.
