"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

require("../site/ast110/labs/06-retrograde-mars/mars.js");
const M = globalThis.LS.mars;

const DAY = 86400000;
const J2000 = Date.UTC(2000, 0, 1, 12);          // matches M.J2000_MS (t = 0)
const toT = (ms) => (ms - J2000) / DAY;
const utc = (y, m, d) => Date.UTC(y, m - 1, d, 12, 0, 0);

const near = (a, b, tol, msg) =>
  assert.ok(Math.abs(a - b) < tol, (msg || "") + " " + a + " vs " + b);
const close = (a, b) => near(a, b, 1e-9, "");

// Deviation of an elongation from opposition (180 deg), as a positive angle.
const fromOpposition = (el) => Math.abs(((el % 360) + 360) % 360 - 180);

test("synodic period is 1/(1/365.25 - 1/686.98) within a day", () => {
  near(M.synodicPeriodDays(), 779.9, 1.0, "synodic");
  close(M.synodicPeriodDays(), 1 / (1 / 365.25 - 1 / 686.98));
});

test("heliocentricAU places Earth near 1 AU and Mars near 1.52 AU, fresh each call", () => {
  for (const t of [0, 137.5, 400, 3000, -900]) {
    const e = M.heliocentricAU("earth", t);
    const m = M.heliocentricAU("mars", t);
    near(Math.hypot(e.x, e.y), 1.0, 0.02, "earth radius");
    const rm = Math.hypot(m.x, m.y);
    assert.ok(rm > 1.38 && rm < 1.67, "mars heliocentric range, got " + rm);
    assert.notEqual(M.heliocentricAU("mars", t), m, "must not hand back a shared object");
  }
  for (const bad of ["sun", "", "Earth1", 7, null]) {
    assert.throws(() => M.heliocentricAU(bad, 0), RangeError);
  }
  assert.throws(() => M.heliocentricAU("mars", NaN), RangeError);
});

test("apparent longitude stays in [0,360) and moves by small steps", () => {
  let prev = M.geocentricLongitudeDeg(0);
  for (let t = 1; t <= 2500; t++) {
    const lon = M.geocentricLongitudeDeg(t);
    assert.ok(lon >= 0 && lon < 360, "out of range at t=" + t + ": " + lon);
    const step = ((lon - prev + 540) % 360) - 180;
    assert.ok(Math.abs(step) < 2.0, "jumpy at t=" + t + ": " + step);
    prev = lon;
  }
});

test("isRetrograde agrees exactly with the sign of the apparent speed", () => {
  for (let t = -500; t < 4000; t += 0.5) {
    assert.equal(M.isRetrograde(t), M.apparentSpeedDegPerDay(t) < 0, "t=" + t);
  }
});

test("retrograde happens only near opposition (solar elongation within ~60 deg of 180)", () => {
  // A superior planet's retrograde loop is wide: it opens ~50 deg of elongation
  // before opposition and closes ~50 deg after, so the honest bound is ~60, not
  // the ~30 the brief guessed (30 would clip the stations).
  let worst = 0;
  for (let t = 0; t < 3 * 780; t += 0.05) {
    if (M.isRetrograde(t)) worst = Math.max(worst, fromOpposition(M.solarElongationDeg(t)));
  }
  assert.ok(worst < 60, "retrograde reached elongation " + worst + " deg from opposition");
  assert.ok(worst > 30, "sanity: the loop really is wider than 30 deg, got " + worst);
});

test("nextOppositionT sits at elongation 180 and steps by ~one synodic period", () => {
  let t = toT(utc(2018, 1, 1));
  for (let k = 0; k < 5; k++) {
    const opp = M.nextOppositionT(t);
    assert.ok(opp > t, "opposition must follow the reference");
    near(fromOpposition(M.solarElongationDeg(opp)), 0, 0.05, "at opposition");
    if (k > 0) {
      // True opposition-to-opopposition gaps swing ~763-811 d because both orbits
      // are eccentric; 779.9 is only the mean. Bound the spread, do not pin it.
      const gap = opp - prevOpp;
      assert.ok(gap > 750 && gap < 820, "spacing " + gap);
    }
    t = opp + 1;
    var prevOpp = opp;
  }
  assert.throws(() => M.nextOppositionT(NaN), RangeError);
});

test("retrogradeWindow straddles a centred opposition, with sane span and arc", () => {
  let t = toT(utc(2016, 1, 1));
  let arcs = [], spans = [];
  for (let k = 0; k < 8; k++) {
    const w = M.retrogradeWindow(t);
    assert.ok(w.startT < w.oppositionT && w.oppositionT < w.endT, "opposition inside window");
    // The brief's "stations within ~8 d of opposition" is not physical for Mars:
    // the loop is ~80 days wide, so each station sits ~30-40 d out, symmetric.
    const mid = (w.startT + w.endT) / 2;
    assert.ok(Math.abs(mid - w.oppositionT) < 8, "opposition must be near the midpoint");
    assert.ok(w.oppositionT - w.startT < 55 && w.endT - w.oppositionT < 55, "station distance");
    assert.ok(w.days > 55 && w.days < 90, "days " + w.days);
    // Favorable apparitions reach ~19-20 deg of retrograde arc; the brief's 16
    // ceiling only fits a strictly circular model that fails the date check.
    assert.ok(w.arcDeg > 8 && w.arcDeg < 20, "arc " + w.arcDeg);
    arcs.push(w.arcDeg); spans.push(w.days);
    t = w.endT + 1;
  }
  assert.equal(arcs.length, 8);
});

test("retrogradeWindow throws RangeError when the scan cannot contain a window", () => {
  // A 0.02-synodic scan (~16 d) starting just after an opposition cannot fit the
  // station pair, so the no-window guard must fire (same code path as the 2.5 bar).
  assert.throws(() => M.retrogradeWindow(toT(utc(2025, 2, 1)), 0.02), RangeError);
  assert.throws(() => M.retrogradeWindow(0, 0), RangeError);
  assert.throws(() => M.retrogradeWindow(0, NaN), RangeError);
});

test("external cross-check: window nearest 2025-01-01 vs the almanac (+/-12 d)", () => {
  // Published retrograde for the 2024-12/2025-02 apparition, from the standard
  // almanac of Mars retrograde episodes: retrograde 2024-12-06 to 2025-02-24,
  // opposition 2025-01-16. (Almanac values; the circular/mean model would be
  // ~2 weeks off, which is exactly why the model keeps Mars's eccentricity.)
  const w = M.retrogradeWindow(toT(utc(2024, 11, 1)));
  near(w.startT, toT(utc(2024, 12, 6)), 12, "start vs 2024-12-06");
  near(w.endT, toT(utc(2025, 2, 24)), 12, "end vs 2025-02-24");
  near(w.oppositionT, toT(utc(2025, 1, 16)), 12, "opposition vs 2025-01-16");
});

test("dateTable motion labels agree with isRetrograde at every row", () => {
  const startT = toT(utc(2024, 11, 20));
  const rows = M.dateTable(startT, 28, 3);      // the manual's 28-row data page
  assert.equal(rows.length, 28);
  rows.forEach((r, i) => {
    const t = startT + i * 3;
    assert.match(r.iso, /^\d{4}-\d{2}-\d{2}$/, "iso shape " + r.iso);
    assert.ok(r.lonDeg >= 0 && r.lonDeg < 360, "lon range");
    const sp = M.apparentSpeedDegPerDay(t);
    if (r.motion === "station") {
      assert.ok(Math.abs(sp) < M.STATION_EPS, "station row speed " + sp);
    } else if (r.motion === "W") {
      assert.ok(M.isRetrograde(t) && sp <= -M.STATION_EPS, "W row t=" + t);
    } else {
      assert.equal(r.motion, "E");
      assert.ok(!M.isRetrograde(t) && sp >= M.STATION_EPS, "E row t=" + t);
    }
  });
  assert.ok(rows.some((r) => r.motion === "W"), "window crosses a retrograde stretch");
  assert.throws(() => M.dateTable(startT, 0, 3), RangeError);
  assert.throws(() => M.dateTable(startT, 2.5, 3), RangeError);
  assert.throws(() => M.dateTable(NaN, 28, 3), RangeError);
});

test("each planet closes its own sidereal period exactly, so the configuration recurs", () => {
  // The apparent longitude does NOT repeat every synodic period (that realigns
  // Sun-Earth-Mars but leaves the whole figure turned by Earth's new angle); the
  // exact model repeat is each planet's own sidereal period.
  for (const body of ["earth", "mars"]) {
    const P = M.ELEMENTS[body].P;
    for (const t of [0, 100.5, 3210]) {
      const a = M.heliocentricAU(body, t);
      const b = M.heliocentricAU(body, t + P);
      close(a.x, b.x);
      close(a.y, b.y);
    }
  }
});

test("unwrapped longitude is continuous and equals the wrapped value plus whole turns", () => {
  for (const t of [0, 123.4, 1500, -800]) {
    const u = M.geocentricLongitudeUnwrappedDeg(t);
    const w = M.geocentricLongitudeDeg(t);
    const turns = (u - w) / 360;
    assert.ok(Math.abs(turns - Math.round(turns)) < 1e-6,
      "diff must be whole turns, t=" + t + " turns=" + turns);
  }
  // monotone-ish: over a decade the apparent longitude gains many turns
  const u0 = M.geocentricLongitudeUnwrappedDeg(0);
  const u1 = M.geocentricLongitudeUnwrappedDeg(3652.5);
  assert.ok(u1 > u0, "net prograde drift over ten years");
});

test("module is pure: no mutable exported state and same input gives same output", () => {
  assert.ok(Object.isFrozen(M), "export must be frozen");
  assert.ok(Object.isFrozen(M.ELEMENTS) && Object.isFrozen(M.ELEMENTS.mars));
  // Frozen constants cannot be laundered into new values by a caller.
  const before = M.ELEMENTS.mars.a;
  assert.throws(() => { "use strict"; M.ELEMENTS.mars.a = 99; }, TypeError);
  assert.equal(M.ELEMENTS.mars.a, before);

  const w1 = M.retrogradeWindow(toT(utc(2024, 11, 1)));
  const w2 = M.retrogradeWindow(toT(utc(2024, 11, 1)));
  assert.deepEqual(w1, w2, "same input, same output");
  w1.arcDeg = -1;
  assert.notEqual(M.retrogradeWindow(toT(utc(2024, 11, 1))).arcDeg, -1, "returned objects are not shared");

  const r1 = M.dateTable(toT(utc(2024, 11, 20)), 5, 3);
  const r2 = M.dateTable(toT(utc(2024, 11, 20)), 5, 3);
  assert.deepEqual(r1, r2);
});
