"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

require("../site/ast110/labs/13-variables/variables.js");
const V = globalThis.LS.variables;

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + " vs " + b);
const near = (a, b, tol, msg) =>
  assert.ok(Math.abs(a - b) < tol, (msg ? msg + ": " : "") + a + " vs " + b);

const entry = (name) => {
  const e = V.CATALOG.find((s) => s.name === name);
  assert.ok(e, "catalog missing " + name);
  return e;
};

// Deterministic little PRNG, same trick as LS.units.mulberry32 (copied so
// this test file stays standalone like the other lab tests).
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("catalog holds the six variable-star teaching cases", () => {
  assert.equal(V.CATALOG.length, 6);
  const names = V.CATALOG.map((s) => s.name);
  for (const want of ["Delta Cephei", "Eta Aquilae", "Beta Doradus",
    "RR Lyrae", "Algol", "Mira"]) {
    assert.ok(names.includes(want), "missing " + want);
  }
  for (const s of V.CATALOG) {
    assert.ok(["cepheid", "rrlyrae", "mira", "eclipsing"].includes(s.family),
      s.name + " has an unknown family");
    assert.ok(s.periodDays > 0, s.name + " needs a positive period");
    assert.ok(s.minMag > s.maxMag, s.name + " minMag must be numerically fainter");
    if (s.family === "eclipsing") {
      // a flat curve with short dips: the mean sits near the bright end,
      // not at the midpoint of min and max
      assert.ok(s.meanMag < (s.minMag + s.maxMag) / 2,
        s.name + " mean should be biased bright");
    } else {
      near(s.meanMag, (s.minMag + s.maxMag) / 2, 0.06);
    }
    near(s.ampMag, s.minMag - s.maxMag, 1e-9);
    assert.equal(typeof s.isStandardCandle, "boolean");
    assert.ok(s.note.length > 10, s.name + " needs a teaching note");
  }
  assert.equal(entry("Delta Cephei").periodDays, 5.366);
  assert.equal(entry("Eta Aquilae").periodDays, 7.177);
  assert.equal(entry("Beta Doradus").periodDays, 9.843);
  assert.equal(entry("RR Lyrae").periodDays, 0.4501);
  assert.equal(entry("Algol").periodDays, 2.867);
  assert.ok(!entry("Mira").isStandardCandle && !entry("Algol").isStandardCandle);
  near(entry("RR Lyrae").absMag, 0.65, 0.01);
  assert.equal(V.RR_ABS_MAG, 0.65);
  assert.equal(V.PC_TO_LY, 3.26156);
});

test("the catalog is deep-frozen against callers", () => {
  assert.ok(Object.isFrozen(V.CATALOG));
  for (const s of V.CATALOG) assert.ok(Object.isFrozen(s), s.name + " row not frozen");
  assert.throws(() => { V.CATALOG[0].name = "Not Delta Cephei"; }, TypeError);
  assert.throws(() => { V.CATALOG.push({}); }, TypeError);
  assert.equal(V.CATALOG[0].name, "Delta Cephei");
});

test("five magnitudes is exactly a factor of 100, both directions", () => {
  close(V.fluxRatio(-5), 100);
  close(V.fluxRatio(5), 0.01);
  close(V.fluxRatio(0), 1);
  close(V.magFromRatio(100), -5);   // 100x brighter = 5 mag brighter (smaller m)
  close(V.magFromRatio(0.01), 5);
  close(V.magFromRatio(1 / 100), 5);
  for (const dm of [0.3, 1.7, 2.5, 4.9, 7.8]) {
    near(V.magFromRatio(V.fluxRatio(dm)), dm, 1e-9);
    near(V.fluxRatio(V.magFromRatio(0.4)), 0.4, 1e-9);
  }
});

test("magnitude arithmetic rejects impossible inputs", () => {
  assert.throws(() => V.fluxRatio(NaN), RangeError);
  assert.throws(() => V.fluxRatio(Infinity), RangeError);
  assert.throws(() => V.magFromRatio(0), RangeError);
  assert.throws(() => V.magFromRatio(-2), RangeError);
  assert.throws(() => V.magFromRatio("0.5"), RangeError);
  assert.throws(() => V.distanceModulus(NaN, 0), RangeError);
  assert.throws(() => V.distanceFromModulus("5"), RangeError);
});

test("distance modulus anchors 10 pc at zero and inverts cleanly", () => {
  assert.equal(V.distanceFromModulus(0), 10);
  close(V.distanceModulus(10, 5), 5);
  assert.equal(V.distancePcFromMag(10, 5), 100);
  for (const m of [2.3, 5.5, 9.1]) {
    for (const M of [-4, 0, 6]) {
      const mu = V.distanceModulus(m, M);
      const d = V.distanceFromModulus(mu);
      close(V.distancePcFromMag(m, M), d);
      close(V.distanceModulus(m, m), 0);
      assert.ok(d > 0 && isFinite(d));
    }
  }
});

test("Delta Cephei lands on the period-luminosity line", () => {
  const M = V.plAbsoluteMag(5.366);
  near(M, -3.41, 0.05);
  near(M, entry("Delta Cephei").absMag, 0.2);
  // the classic Leavitt ordering: longer period, brighter absolute mag
  assert.ok(V.plAbsoluteMag(7.177) < M);
  assert.ok(V.plAbsoluteMag(9.843) < V.plAbsoluteMag(7.177));
});

test("Eta Aquilae and Beta Doradus are consistent with the same line", () => {
  for (const name of ["Eta Aquilae", "Beta Doradus"]) {
    const e = entry(name);
    near(V.plAbsoluteMag(e.periodDays), e.absMag, 0.2);
  }
  near(V.PL_SLOPE, -2.76, 1e-12);
  near(V.PL_INTERCEPT, -1.40, 1e-12);
});

test("RR Lyrae is a different yardstick and refuses the Cepheid line", () => {
  assert.throws(() => V.plAbsoluteMag(0.4501), RangeError);
  // even the brightest end of the line's validity window misses RR Lyrae
  // by over two magnitudes: the two families cannot be one yardstick
  assert.ok(V.RR_ABS_MAG - V.plAbsoluteMag(1) > 1.5);
  assert.ok(V.RR_ABS_MAG - V.plAbsoluteMag(100) > 1.5);
});

test("the yardstick refuses periods outside 1-100 days", () => {
  assert.throws(() => V.plAbsoluteMag(0.1), RangeError);
  assert.throws(() => V.plAbsoluteMag(332), RangeError);
  assert.throws(() => V.plAbsoluteMag(0), RangeError);
  assert.throws(() => V.plAbsoluteMag(-5.366), RangeError);
  assert.throws(() => V.plAbsoluteMag(NaN), RangeError);
  assert.doesNotThrow(() => V.plAbsoluteMag(1));
  assert.doesNotThrow(() => V.plAbsoluteMag(100));
  // Mira's own period must always throw, however the call is dressed up
  assert.throws(() => V.plDistancePc(entry("Mira").meanMag, entry("Mira").periodDays), RangeError);
});

test("every catalog light curve hits its min, max and mean magnitudes", () => {
  const N = 2400;
  for (const e of V.CATALOG) {
    let brightest = Infinity, faintest = -Infinity, sum = 0;
    for (let i = 0; i < N; i++) {
      const m = V.magnitudeAt(e, i / N);
      if (m < brightest) brightest = m;
      if (m > faintest) faintest = m;
      sum += m;
    }
    near(brightest, e.maxMag, 0.02, e.name + " max");
    near(faintest, e.minMag, 0.02, e.name + " min");
    near(sum / N, e.meanMag, 0.02, e.name + " mean (sampled)");
    near(V.meanOfCycle(e), e.meanMag, 0.02, e.name + " mean (meanOfCycle)");
  }
});

test("Cepheids and RR Lyrae stars are sawtooth with a fast rise", () => {
  const N = 2400;
  const riseFraction = (e) => {
    let pMin = 0, pMax = 0, faintest = -Infinity, brightest = Infinity;
    for (let i = 0; i < N; i++) {
      const m = V.magnitudeAt(e, i / N);
      if (m > faintest) { faintest = m; pMin = i / N; }
      if (m < brightest) { brightest = m; pMax = i / N; }
    }
    return (pMax - pMin + 1) % 1;
  };
  for (const e of V.CATALOG) {
    if (e.family !== "cepheid" && e.family !== "rrlyrae") continue;
    const rise = riseFraction(e);
    assert.ok(rise < 0.4, e.name + " rises over " + rise.toFixed(2) + " of the period");
  }
  assert.ok(riseFraction(entry("RR Lyrae")) < riseFraction(entry("Delta Cephei")),
    "RR Lyrae sawtooth must be steeper than a Cepheid's");
});

test("Algol is flat with a deep primary dip and a shallower secondary", () => {
  const e = entry("Algol");
  const N = 2400;
  let flat = 0, secP = 0, secMag = -Infinity;
  for (let i = 0; i < N; i++) {
    const p = i / N, m = V.magnitudeAt(e, p);
    if (Math.abs(m - e.maxMag) < 0.02) flat++;
    if (p > 0.3 && p < 0.7 && m > secMag) { secMag = m; secP = p; }
  }
  assert.ok(flat / N > 0.8, "Algol is flat only " + (flat / N).toFixed(2) + " of the cycle");
  const primary = V.magnitudeAt(e, 0);
  near(primary, e.minMag, 0.02);
  near(secP, 0.5, 0.02);
  assert.ok(secMag - e.maxMag > 0.1, "secondary dip should be real");
  assert.ok(primary - e.maxMag > secMag - e.maxMag, "primary dip must be deeper");
});

test("Mira rises slowly, drops fast, and swings huge amplitudes", () => {
  const e = entry("Mira");
  assert.ok(e.ampMag >= 5, "a Mira-type is supposed to swing mightily");
  const N = 2400;
  let pMin = 0, pMax = 0, faintest = -Infinity, brightest = Infinity;
  for (let i = 0; i < N; i++) {
    const m = V.magnitudeAt(e, i / N);
    if (m > faintest) { faintest = m; pMin = i / N; }
    if (m < brightest) { brightest = m; pMax = i / N; }
  }
  const rise = (pMax - pMin + 1) % 1;
  assert.ok(rise >= 0.7 - 1e-3, "Mira must take most of the cycle to climb bright");
  assert.ok(1 - rise < rise, "and drop back down again fast");
});

test("shapeAt wraps any real phase and stays inside [-0.5, +0.5]", () => {
  for (const fam of ["cepheid", "rrlyrae", "mira", "eclipsing"]) {
    for (const p of [-3.7, -0.25, 0, 0.5, 1, 2.999999, 1234.5]) {
      const s = V.shapeAt(fam, p);
      assert.ok(s >= -0.5 - 1e-12 && s <= 0.5 + 1e-12, fam + " shape out of range at " + p);
      near(s, V.shapeAt(fam, p % 1 < 0 ? p % 1 + 1 : p % 1), 1e-9);
    }
  }
  assert.throws(() => V.shapeAt("nova", 0.2), RangeError);
  assert.throws(() => V.shapeAt("cepheid", NaN), RangeError);
});

test("fold wraps, sorts and keeps phases inside [0, 1)", () => {
  const P = 5.366;
  const times = [-11.0, -0.4, 0, 1.7, 5.366, 12.9, 20.0, 33.3];
  const mags = times.map((t) => 4 + 0.4 * Math.sin(t));
  const f = V.fold(times, P, 1.0, mags);
  assert.equal(f.phase.length, times.length);
  assert.equal(f.time.length, times.length);
  for (let i = 0; i < f.phase.length; i++) {
    assert.ok(f.phase[i] >= 0 && f.phase[i] < 1, "phase out of [0,1): " + f.phase[i]);
    if (i > 0) assert.ok(f.phase[i] >= f.phase[i - 1], "phases must be sorted");
  }
  // same phase one period apart, epoch actually shifts the fold
  const a = V.fold([2.5], P, 0).phase[0];
  const b = V.fold([2.5 + 3 * P], P, 0).phase[0];
  const c = V.fold([2.5], P, 2.5).phase[0];
  near(a, b, 1e-9);
  close(c, 0);
  assert.equal(f.mag.length, times.length);
  assert.throws(() => V.fold(times, 0), RangeError);
  assert.throws(() => V.fold([1, 2], P, 0, [1]), RangeError);
  assert.throws(() => V.pdm(V.fold(times, P)), RangeError);  // folded without mags
});

test("pdm rewards the true fold and punishes a wrong one", () => {
  const e = entry("Delta Cephei"), P = e.periodDays;
  const rnd = mulberry32(424242);
  const times = [], mags = [];
  for (let i = 0; i < 90; i++) {
    const t = (i + (rnd() - 0.5) * 0.8) * (3 * P / 90);
    times.push(t);
    mags.push(V.magnitudeAt(e, t / P) + (rnd() - 0.5) * 0.08);
  }
  const good = V.pdm(V.fold(times, P, 0, mags));
  const bad = V.pdm(V.fold(times, P * 1.2, 0, mags));
  assert.ok(good < 0.15, "true-period fold should be tidy, got " + good);
  assert.ok(bad > 3 * good, "wrong-period fold should scatter far more: " + bad + " vs " + good);
});

test("searchPeriod recovers Delta Cephei's period from noisy data", () => {
  const e = entry("Delta Cephei"), P = 5.366;
  const rnd = mulberry32(1618033);
  const times = [], mags = [];
  for (let i = 0; i < 90; i++) {
    const t = (i + (rnd() - 0.5) * 0.8) * (3 * P / 90);   // ~3 cycles
    times.push(t);
    mags.push(V.magnitudeAt(e, t / P) + (rnd() - 0.5) * 0.08);
  }
  const r = V.searchPeriod(times, mags, 4.2, 6.6, 60);
  near(r.period, P, 0.02 * P);
  assert.ok(r.pdm < 0.25);
  assert.throws(() => V.searchPeriod(times, mags, 6.6, 4.2, 60), RangeError);
  assert.throws(() => V.searchPeriod(times, mags.slice(1), 4.2, 6.6, 60), RangeError);
  assert.throws(() => V.searchPeriod(times.slice(0, 5), mags.slice(0, 5), 4.2, 6.6, 60), RangeError);
});

test("plDistancePc runs the yardstick backwards from a Cepheid", () => {
  for (const name of ["Delta Cephei", "Eta Aquilae", "Beta Doradus"]) {
    const e = entry(name);
    const d = V.plDistancePc(e.meanMag, e.periodDays);
    const viaM = V.distancePcFromMag(e.meanMag, V.plAbsoluteMag(e.periodDays));
    close(d, viaM);
    assert.ok(d > 100 && d < 1000, e.name + " distance " + d + " pc is absurd");
  }
  const d = V.plDistancePc(entry("Delta Cephei").meanMag, 5.366);
  assert.ok(d > 250 && d < 350, "Delta Cephei is ~270 pc, got " + d);
});
