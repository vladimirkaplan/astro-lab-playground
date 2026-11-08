"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("../site/labs/05-moonrise-eclipses/moonrise.js");
const MR = globalThis.LS.moonrise;

const DAY = 86400000;
const near = (a, b, tol, msg) =>
  assert.ok(Math.abs(a - b) <= tol, (msg ? msg + ": " : "") + a + " vs " + b);

// Days since J2000 for a UTC date/time at 12:00 unless a time is given.
const toT = (y, mo, d, h = 12, mi = 0) => (Date.UTC(y, mo - 1, d, h, mi) - MR.J2000_MS) / DAY;

test("export surface: frozen, cited NASA constants carried verbatim", () => {
  assert.ok(Object.isFrozen(MR), "export must be frozen");
  assert.ok(Object.isFrozen(MR.LAG_RANGE_MIN), "array export must be frozen too");
  assert.equal(MR.SYNODIC_D, 29.53059);
  assert.equal(MR.ANOMALISTIC_D, 27.55455);
  assert.equal(MR.SEMIMAJOR_KM, 384400);
  assert.equal(MR.ECCENTRICITY, 0.0549);
  assert.equal(MR.MOON_DIAM_KM, 3474);
  assert.equal(MR.MEAN_APPARENT_ARCMIN, 31.1);
  assert.equal(MR.MEAN_LAG_MIN, 48.8);
  assert.deepEqual(Array.from(MR.LAG_RANGE_MIN), [40, 70]);
  // mean lag is the 12.19 deg of extra Earth rotation between moonrises
  near(360 / MR.SYNODIC_D, 12.19, 0.02, "deg of extra rotation per day");
});

test("illumination and phase names match the shared eight-phase convention", () => {
  assert.equal(MR.illumFraction(0), 0);
  near(MR.illumFraction(180), 1, 1e-12, "full");
  near(MR.illumFraction(90), 0.5, 1e-12, "quarter");
  near(MR.illumFraction(270), 0.5, 1e-12, "quarter is symmetric");
  assert.equal(MR.phaseName(0), "new moon");
  assert.equal(MR.phaseName(45), "waxing crescent");
  assert.equal(MR.phaseName(90), "first quarter");
  assert.equal(MR.phaseName(180), "full moon");
  assert.equal(MR.phaseName(200), "waning gibbous");
  assert.equal(MR.phaseName(270), "last quarter");
  assert.equal(MR.phaseName(350), "new moon");   // wraps
});

test("moonriseOffsetHours pins the four phase landmarks (+/- 0.1 h)", () => {
  near(MR.moonriseOffsetHours(0), 0, 0.1, "new moon rises with the Sun");
  near(MR.moonriseOffsetHours(90), 6.2, 0.1, "first quarter about noon");
  near(MR.moonriseOffsetHours(180), 12.4, 0.1, "full moon at sunset");
  near(MR.moonriseOffsetHours(270), 18.6, 0.1, "last quarter about midnight");
});

test("moonriseOffsetHours wraps the lunar day, never negative", () => {
  near(MR.moonriseOffsetHours(359.9), 24.8, 0.1, "just before new");
  assert.ok(MR.moonriseOffsetHours(359.9) >= 0, "must not go negative");
  for (let e = 0; e < 360; e += 0.5) {
    const v = MR.moonriseOffsetHours(e);
    assert.ok(v >= 0 && v < MR.LUNAR_DAY_H + 1e-9, "in [0, 24.84) at " + e + ": " + v);
  }
});

test("elongation is 0 at the cited new moon and beats at the synodic rate", () => {
  near(MR.elongationDeg(MR.T_NEW_MOON), 0, 1e-9, "0 at the reference new moon");
  near(MR.elongationDeg(MR.T_NEW_MOON + MR.SYNODIC_D / 2), 180, 1e-9, "180 at full");
  near(MR.elongationDeg(MR.T_NEW_MOON + MR.SYNODIC_D), 0, 1e-6, "recurs each synodic month");
  // one day later the elongation has gained 360/synodic degrees
  const step = MR.elongationDeg(4000) - MR.elongationDeg(3999);
  near(((step % 360) + 360) % 360, 360 / MR.SYNODIC_D, 1e-6, "daily beat");
  // the J2000-era new moon lands on the cited calendar date
  assert.equal(MR.isoOf(MR.T_NEW_MOON), "2000-01-06");
});

test("dailyLagMin: anomalistic modulation about 48.8, honest bounds, right mean", () => {
  // NB: the brief asked to pin "never outside [42,56]", but the cited formula
  // 48.8 + 7*cos(...) has exact extremes 41.8 and 55.8, so 41.8 sits just under
  // 42 and the literal bound cannot hold. We pin the model's true extremes and
  // keep it inside the honest observed band LAG_RANGE_MIN = [40,70].
  const y0 = toT(2000, 1, 1), y1 = toT(2030, 12, 31);
  let lo = Infinity, hi = -Infinity, sum = 0, n = 0;
  for (let t = Math.ceil(y0); t <= Math.floor(y1); t++) {
    const v = MR.dailyLagMin(t);
    if (v < lo) lo = v; if (v > hi) hi = v;
    sum += v; n++;
    assert.ok(v >= MR.LAG_RANGE_MIN[0] && v <= MR.LAG_RANGE_MIN[1], "inside [40,70] at " + t);
  }
  near(lo, 41.8, 0.01, "model minimum");
  near(hi, 55.8, 0.01, "model maximum");
  near(sum / n, 48.8, 1.5, "2000-2030 mean within 1.5 min of 48.8");
  // near perigee the fast Moon rises LATER than the mean; near apogee earlier
  assert.ok(MR.dailyLagMin(MR.T_PERIGEE) > MR.MEAN_LAG_MIN, "perigee lag above mean");
  assert.ok(MR.dailyLagMin(MR.T_PERIGEE + MR.ANOMALISTIC_D / 2) < MR.MEAN_LAG_MIN, "apogee below mean");
});

test("moonDiameterArcmin: extremes in [29.2,34.2], recurs every anomalistic month", () => {
  const y0 = toT(2000, 1, 1), y1 = toT(2030, 12, 31);
  let lo = Infinity, hi = -Infinity;
  for (let t = y0; t <= y1; t += 0.02) {
    const v = MR.moonDiameterArcmin(t);
    if (v < lo) lo = v; if (v > hi) hi = v;
  }
  assert.ok(lo >= 29.2 && hi <= 34.2, "extremes in band, got " + lo + ".." + hi);
  // fixed-e model tops out near 32.9; the real 33.5-34.1 needs a varying e
  near(hi, 32.9, 0.1, "model perigee diameter (below real, fixed-e)");
  near(lo, 29.4, 0.1, "model apogee diameter");
  // mean distance (M_anom = 90) gives the cited mean apparent diameter
  near(MR.moonDiameterArcmin(MR.T_PERIGEE + MR.ANOMALISTIC_D / 4), 31.1, 0.1, "mean apparent");
  // size is exactly periodic in the anomalistic month, to 0.01 arcmin
  for (const t of [0, 123.4, 9000]) {
    near(MR.moonDiameterArcmin(t + MR.ANOMALISTIC_D), MR.moonDiameterArcmin(t), 0.01, "period t=" + t);
    near(MR.moonDistanceKm(t + MR.ANOMALISTIC_D), MR.moonDistanceKm(t), 1, "distance period t=" + t);
  }
  // distance brackets a(1-e)..a(1+e)
  near(MR.moonDistanceKm(MR.T_PERIGEE), MR.SEMIMAJOR_KM * (1 - MR.ECCENTRICITY), 1e-6, "perigee distance");
  near(MR.moonDistanceKm(MR.T_PERIGEE + MR.ANOMALISTIC_D / 2), MR.SEMIMAJOR_KM * (1 + MR.ECCENTRICITY), 1e-6, "apogee distance");
});

test("moonriseSeries rows are the direct calls, and inputs are validated", () => {
  const startT = toT(2027, 2, 6, 16);          // a new moon near the eclipse board
  const rows = MR.moonriseSeries(startT, 30, 1);
  assert.equal(rows.length, 30);
  rows.forEach((r, i) => {
    const t = startT + i;
    const elong = MR.elongationDeg(t);
    assert.match(r.iso, /^\d{4}-\d{2}-\d{2}$/, "iso shape " + r.iso);
    assert.equal(r.elongDeg, elong);
    assert.equal(r.phase, MR.phaseName(elong));
    assert.equal(r.illum, MR.illumFraction(elong));
    assert.equal(r.riseOffsetH, MR.moonriseOffsetHours(elong));
    assert.equal(r.lagMin, MR.dailyLagMin(t));
    assert.equal(r.diamArcmin, MR.moonDiameterArcmin(t));
  });
  // default span covers one synodic month
  const d = MR.moonriseSeries(startT);
  assert.ok(d.length >= Math.floor(MR.SYNODIC_D) && d.length <= Math.ceil(MR.SYNODIC_D));
  // the new moon starts at elongation 0, phase new
  assert.equal(d[0].phase, "new moon");
  assert.throws(() => MR.moonriseSeries(startT, 0, 1), RangeError);
  assert.throws(() => MR.moonriseSeries(startT, 2.5, 1), RangeError);
  assert.throws(() => MR.moonriseSeries(NaN, 10, 1), RangeError);
  assert.throws(() => MR.moonriseSeries(startT, 10, NaN), RangeError);
});

test("purity: frozen export rejects mutation; same input gives same output", () => {
  const before = MR.MEAN_LAG_MIN;
  assert.throws(() => { "use strict"; MR.MEAN_LAG_MIN = 99; }, TypeError);
  assert.equal(MR.MEAN_LAG_MIN, before);
  assert.throws(() => { "use strict"; MR.LAG_RANGE_MIN[0] = 0; }, TypeError);

  // a returned row is a fresh object, not shared state, and does not alias later calls
  const a = MR.moonriseSeries(100, 4, 2);
  const b = MR.moonriseSeries(100, 4, 2);
  assert.deepEqual(a, b, "same input, same output");
  a[0].lagMin = -1;
  assert.notEqual(MR.moonriseSeries(100, 4, 2)[0].lagMin, -1, "rows are not shared");
  // a bad t is rejected by the time-based functions
  for (const fn of ["elongationDeg", "dailyLagMin", "moonDiameterArcmin", "moonriseSeries"]) {
    assert.throws(() => MR[fn](NaN), RangeError, fn + " must guard NaN");
  }
});

test("module is deterministic: no wall-clock reads anywhere in the source", () => {
  const raw = fs.readFileSync(
    path.join(__dirname, "..", "site", "labs", "05-moonrise-eclipses", "moonrise.js"), "utf8");
  // Scan only executable source: the header comment legitimately says "no Date.now()".
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  assert.ok(!/Date\s*\.\s*now/.test(src), "no Date.now() in the module");
  assert.ok(!/new Date\s*\(\s*\)/.test(src), "no zero-arg new Date() in the module");
  // Date is only ever given an explicit computed/UTC value
  const dateCalls = src.match(/new Date\([^)]*\)/g) || [];
  dateCalls.forEach((c) => assert.notEqual(c, "new Date()", c));
  // two calls in the same tick are identical: nothing depends on the real clock
  assert.equal(MR.isoOf(1234.5), MR.isoOf(1234.5));
});
