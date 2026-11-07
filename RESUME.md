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
   a quick Camoufox load, then commit + push to origin AND github.
   Brief size limit: a 6-file brief came back EMPTY with zero files written
   twice on 2026-11-07. Split multi-file items into narrow delegations
   (e.g. data + pure logic + tests first, then the page/sim + landing card).
3. If ANY visible garbling appears (in the main session or a sub-agent
   report): stop immediately, commit the verified state, update the newest
   file in ../progress/, and continue in a new session with the prompt below.
4. Sub-agents write files and run tests but NEVER run git commit/push.

## New-session prompt (paste this)

    Continue the lab-sims project at /home/openwork/workspaces/main/lab-sims.
    Read, in order: lab-sims/RESUME.md (rules), the NEWEST file in
    workspaces/main/progress/, and lab-sims/GOAL.md. Check the repo first:
    cd /home/openwork/workspaces/main/lab-sims && npm test && git status
    (must be clean, 49+ tests green; remotes 'origin' = gitea, 'github' =
    GitHub Pages - both take one commit each step).
    Per RESUME.md: one work item only, in a short session. Pick the next item
    from the progress file's queue. Prefer delegating the build to a fresh
    sub-agent with a narrow scope; then you verify (node --check on changed
    JS, npm test, quick page load) and commit + push to BOTH remotes.
    Update the progress file before ending. If any output garbles: stop,
    commit what is green, write a fresh progress note, and tell me to start a
    new session.

## Queue snapshot (mirrored in progress/, progress file wins on conflict)

- DONE: labs 01, 05, 07, 08, 09, 12, 15, 16, 17, 03 (celestial sphere +
  site/data/stars.js catalog) + shared modules + ephemeris. 72 tests. The old
  small gaps (eclipse card live, inset label) shipped in ce40635.
- Then: Phase 2 charts still planned on the landing page: Venus phases, Lab 2,
  sky motions, HR diagram, parallax, galaxy gallery with Wikimedia images +
  ATTRIBUTION.md. Then Phase 3 data labs, worksheets, offline kit
  (service worker, zip, LXC recipe). See GOAL.md phases/issues.
