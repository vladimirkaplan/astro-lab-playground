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
- Then: Phase 2 charts still planned on the landing page:
  variable stars, parallax, galaxy gallery with Wikimedia images + ATTRIBUTION.md.
  Then Phase 3 data labs, worksheets, offline kit (service worker, zip, LXC
  recipe). See GOAL.md phases/issues.
