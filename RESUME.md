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

- DONE: labs 01, 05, 07, 08, 09, 12, 15 + shared modules + ephemeris. 49 tests.
- Small gaps: flip landing card "Pos. 5 board" to live for 12-eclipse-board;
  eclipse inset h-label can overlap the road label at some beta values.
- Then: Labs 16-17 (time/lat/long), Phase 2 charts (inline star catalog,
  celestial sphere, Venus, sky motions, HR diagram, parallax, galaxy gallery
  with Wikimedia images + ATTRIBUTION.md), Phase 3 data labs, worksheets,
  offline kit (service worker, zip, LXC recipe). See GOAL.md phases/issues.
