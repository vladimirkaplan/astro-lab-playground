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
  site/labs/08-venus-phases/ (venus.js pure geometry + 9 tests, sim with the
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
  site/labs/12-hr-diagram/ (hr.js: 29-star catalog + Stefan-Boltzmann core + 10
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
  site/labs/11-parallax/ - built by the Lab Builder (BMC-5 module, BMC-6 page), verified by
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
  at site/labs/13-variables/ - built by the Lab Builder (BMC-7 module, BMC-8 page), verified
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
- DONE 2026-11-08 (Lab Builder, BMC-11): Renumbering pass. Eight lab folders moved to the
  manual's numbers: 05-moon-phases -> 04-moon-phases, 12-eclipse-board ->
  05-moonrise-eclipses, venus-phases -> 08-venus-phases, 08-pendulum -> 09-pendulum,
  09-spectra -> 10-spectra, parallax -> 11-parallax, hr-diagram -> 12-hr-diagram,
  variables -> 13-variables. Titles/h1s, landing cards (href, data-lab, number chips),
  test require paths, script header comments, the per-page lab ids and README/RESUME paths
  follow the new slugs; every old URL keeps a no-script redirect stub
  (`site/labs/<old>/index.html`, meta refresh + canonical) because GitHub Pages has no
  `_redirects`. No content or physics changes: 158 tests still green. Two consequences to
  remember: saved progress ticks, data tables and Ideal/Fun mode are keyed by the lab id,
  so the eight moved labs start clean on every device; and the old numbers in the log
  entries above are history, not current paths.
- DONE 2026-11-08 (Lab Builder, BMC-13): Retrograde motion of Mars, page + sim at
  site/labs/06-retrograde-mars/ - builds on the BMC-12 module (mars.js + tests/mars.test.js,
  171 green with them), which are UNTRACKED in this same checkout and MUST land with (or before)
  the page, since index.html and sim.js require mars.js. sim.js draws everything from LS.mars
  and reimplements no physics: Bench 1 is a two-lane Sun-centred overtake (Earth inner/fast,
  Mars outer/slow, circular-orbit guide rings with dots at true model positions) whose sightline
  mark on a fixed star-ring carves the loop, with a sky-view toggle that redraws the SAME dates as
  the backward hook of apparent longitude against a fixed-star grid; both stations and the
  opposition are marked and opposition highlighted. A date scrubber + play button animate the
  apparatus; three apparition presets (2024-25 / 2022-23 / 2020-21) each recompute their window
  from the model, so nothing is hardcoded to one year. Bench 2 is the 28-night observing table:
  the student logs E / W / station per night (optional longitude), Check grades row-by-row against
  mars.js, and only after checking does the worked window reveal the two station dates, the
  opposition and the westward arc. Log + CSV export the student's own table; Ideal/Fun modes (Fun
  adds seeded scatter to the longitude/elongation readouts, never to the geometry). Landing card
  live (chip 6, data-lab 06-retrograde-mars); README status + "still planned" updated (retrograde
  Mars is no longer TBD). 6 graded exercises through check.js (one reads the window off the
  student's own table). The page adds NO module tests per the brief. Verification done here:
  node --check clean on the new JS; npm test 171/171 green; a throwaway DOM stub booted sim.js
  and confirmed every getElementById id it uses exists in index.html, that a blank table grades
  0/28, and that the reveal is empty until Check; all six data-ex payloads JSON.parse (a raw
  apostrophe that broke one attribute was found and fixed). Original prose only, canvas drawing
  only, banner + licence intact. NOT COMMITTED by the Lab Builder (RESUME rule 4 / AGENTS.md):
  the Chief verifies and lands - and must stage site/labs/06-retrograde-mars/mars.js +
  tests/mars.test.js alongside the page.
- DONE 2026-11-08 (Lab Builder, BMC-14): Moonrise drift, completing manual Lab 5, by
  EXTENDING site/labs/05-moonrise-eclipses/ (the eclipse board is untouched - the moonrise
  half is added beside it). GitHub issue #12 ("Moonrise delay & lunar orbit: 50-minutes-a-day
  chase, perigee/apogee size, eclipse tie-in") rides with this build and is
  DONE-PENDING-PUSH; the Chief closes it at push. New moonrise.js: a pure, frozen,
  Date.now-free module on LS.moonrise in days-since-J2000 (same time base as moon.js/mars.js) -
  elongation from the cited 2000-01-06 18:14 UT new moon anchored at the synodic rate,
  phaseName + illumFraction, moonriseOffsetHours (24.84h lunar day: 0/6.2/12.4/18.6 h at the
  four phases), dailyLagMin (48.8 mean +/- 7 on the anomalistic month), moonDiameterArcmin
  from d = a(1 - e cos M_anom), and a moonriseSeries fixture; every constant cited (NASA lunar
  fact sheet). New tests/moonrise.test.js: 10 cases -> 181 green. sim.js gains Bench 3 "the
  50-minute chase" (24-hour moonrise clock, phase/size cycle on a labelled pixel-per-degree
  bar, lag-vs-48.8 bar on the 40-70 track, a day slider + play sweep); Fun Mode adds a seeded
  +/-4 min stopwatch jitter to the LAG readout only, never geometry. index.html gains a
  moonrise Learn subsection, Bench 3 markup, one numbers + one keywords exercise, and the
  script order units/ui/store/check/moonrise/eclipse/sim; no new landing card (same page).
  Two honest brief/physics notes the code carries: (1) the brief pins both "48.8 + 7*cos" and a
  strict dailyLagMin band "[42,56]", but that formula's exact extremes are 41.8 and 55.8, so the
  test pins the model's true range [41.8,55.8] and keeps it inside the honest [40,70] band
  instead of the literal [42,56]; (2) with the cited a=384400, e=0.0549 the model's perigee
  diameter is ~32.9 arcmin, not the 33.5-34.1 real near-side extreme (solar perturbation swings
  e itself), so that 33.5-34.1 is named as unmodeled - both extremes still sit inside the
  [29.2,34.2] test bound. node --check clean on every JS; a throwaway DOM stub booted Bench 3
  (E=180 -> rise offset 12.4 h, E=90 -> 6.2 h, blank Check reveals nothing, the play sweep
  drives setDay with no errors). Original prose, banner + licence auto-mounted by sim.js.
  NOT COMMITTED by the Lab Builder (RESUME rule 4 / AGENTS.md): the Chief verifies and lands,
  staging site/labs/05-moonrise-eclipses/moonrise.js + tests/moonrise.test.js with the page.
- DONE 2026-11-08 (Paperclip "Chief", BMC-17): Systemic canvas-scale-drift fix at
  shared/ui.js. Reported on BMC-1 (Vladimir, comment ac7f8d63): the Spectra lab's
  spectrum range drifts in-browser until a reload. Root cause: initTabs boots with
  only #learn visible, so every sim canvas in the hidden #simulate panel sized its
  bitmap from clientWidth === 0 and took the 480/520 fallback; a tab click fired no
  resize event, so opening Simulate stretched the stale bitmap while the click-to-nm
  mapping used the real layout width (drawn scale and reported wavelengths disagreed).
  Fix: initTabs().select() now dispatches a synthetic window "resize" AFTER unhidden
  the chosen panel; all 15 lab sims already re-fit idempotently from clientWidth on
  window resize, so one shared change heals every lab page (and is a harmless no-op on
  the two homework pages, which have no clientWidth canvas). initTabs also returns
  { select } so the behavior is drivable/testable. New tests/tabs.test.js pins both
  halves: exactly one resize per tab switch, dispatched only after the panel is shown
  (184 tests). Audit sweep: all 15 live lab pages + 8 "Moved" redirect stubs + 2 homework
  pages + ui.js/fit.js serve 200; static scan confirms every clientWidth canvas registers
  a window resize listener and no resize handler accumulates width, so no sibling
  instance of the bug class survives the shared fix.
  image licence decision (PD / CC BY-SA) and assets/img/ATTRIBUTION.md entries settled first.
  Then the ~250-star catalog expansion (GitHub #17). Then, LAST, the offline kit (#16:
  service worker, downloadable zip, LXC recipe). See GOAL.md phases/issues.
- DONE 2026-11-08 (Lab Builder, BMC-15): Lab 14 galaxy identification at
  site/labs/14-galaxy-id/ - the first lab to ship images. Ten Wikimedia Commons
  photos (M87, M110, M31, M33, M51, M101, NGC 1300, M104, NGC 253, M82) fetched as
  1280px renditions after a hard licence gate: every LicenseShortName must match
  public domain / CC0 / CC BY(-SA); NC/ND/unknown rejected at fetch time and gated
  again in tests. Images live in site/img/ (the settled single-folder exception -
  .gitignore now refuses images everywhere else but !site/img/*.jpg; verified with
  git check-ignore and git ls-files). ATTRIBUTION.md (repo root) records per file:
  object, source Commons page, direct URL, exact LicenseShortName, credit as
  displayed. galaxies.js: frozen 10-entry catalog (family, Hubble stage, rounded
  published distance/size/magnitude named as approximate, licence/credit/sourceUrl
  per entry), seeded shuffle, forgiving stage grading (one step of a/b/c slack,
  bc centred), identifyPass with four options spanning four families (never two
  same-shape M-numbers as a trick); 12 tests -> 193 green, including the licence
  gate as a test, on-disk JPEG checks (FFD8, >20KB, exactly ten files), and every
  Check-tab graded answer re-derived from the module. sim.js: Bench 1 classify
  (family + stage, honest reason + weak-bar notes for M31/M101/NGC 253), Bench 2
  ten-round identification with field notes; both benches log to the store with
  CSV export; Ideal/Fun (Fun blurs the photo until you press Focus - eye training,
  never grading); per-image credit + licence line under every photo, name never
  revealed before the answer (img alt included). Landing card live. GitHub issue
  #14 rides this build and is DONE-PENDING-PUSH; the Chief closes it at push.
  Honest notes for the Chief: (1) the brief's answer key keeps M31 as SA(s)b
  unbarred while some modern catalogues give a weak bar (SAB) - the module grades
  the brief's key and carries the debate as an explicit note; M101 and NGC 253 are
  catalogued SAB but briefed as family S, same treatment. (2) The M87 photo
  (NASA HST optical image) is 807px wide - the original itself, already under the
  1280 cap. NOT COMMITTED by the Lab Builder (RESUME rule 4 / AGENTS.md): the
  Chief verifies and lands - stage must include site/img/*.jpg (10 files),
  ATTRIBUTION.md and the .gitignore swap together with the lab folder and tests.
- Then (queue, in order): the ~250-star catalog expansion (GitHub #17). Then,
  LAST, the offline kit (#16: service worker, downloadable zip, LXC recipe).
  See GOAL.md phases/issues.
