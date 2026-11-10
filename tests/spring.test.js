"use strict";
// PHY110 Lab 5 maths module (site/phy110/labs/05-vibrating-spring/spring.js).
//
// F = K x and T = 2 pi sqrt(m/K) with the course pi = 3.14. The numbers that
// matter are the course settings (g = 9.80, hanger 50 g, spring near 50 N/m,
// 50 g steps, ten cycles per timing) and the one honesty item: the formula
// ignores the spring's own mass, so measured periods run a few percent long.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOD = path.join(__dirname, "..", "site", "phy110", "labs",
  "05-vibrating-spring", "spring.js");
require(MOD);
const S = globalThis.LS.spring;

const near = (x, y, tol, msg) => assert.ok(Math.abs(x - y) <= tol,
  msg + ": got " + x + ", want " + y + " +/-" + tol);
const round = (x, d) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d);

test("course settings are the printed ones", () => {
  assert.equal(S.G, 9.80);
  assert.equal(S.PI, 3.14, "course mode uses the printed 3.14, not Math.PI");
  assert.equal(S.CYCLE_COUNT, 10);
  assert.deepEqual(S.K_TABLE_ADDED_G.slice(), [50, 100, 150, 200, 250]);
  assert.deepEqual(S.T_TABLE_ADDED_G.slice(), [200, 220, 240]);
  // not printed in the manual, so the page has to show them
  assert.equal(S.HANGER_G, 50);
  assert.equal(S.K_ASSUMED, 50);
  assert.equal(S.MAX_LOAD_G, 300);
});

test("Hooke's law: the hanging weight over the elongation", () => {
  near(S.force(250), 2.45, 1e-12, "250 g -> 2.45 N");
  near(S.force(150), 1.47, 1e-12, "150 g -> 1.47 N");
  // the spec row: total 250 g, x = 4.9 cm -> K = 2.45 / 0.049
  near(S.hookK(250, 4.9), 2.45 / 0.049, 1e-12, "spec row 250 g / 4.9 cm");
  near(S.hookK(250, 4.9), 50.0, 1e-9, "prints K = 50.0 N/m");
  // the other direction: what 150 g stretches the 50 N/m spring by
  near(S.elongationM(150, 50), 1.47 / 50, 1e-12, "x = F / K");
  near(S.elongationCm(150, 50), 2.94, 1e-9, "prints 2.94 cm");
  // x is the mark difference, figure style (float-safe compare)
  near(S.elongationFromMarks(2.4, 1.6), 0.8, 1e-9, "2.4 - 1.6 cm");
  near(S.elongationFromMarks(1.7, 1.1), 0.6, 1e-9, "the figure's own row: 1.7 - 1.1 = 0.6");
  assert.ok(Number.isNaN(S.hookK(250, 0)), "a zero elongation has no K");
});

test("the K table rows land in the 1.0-5.9 cm band on a 50 N/m spring", () => {
  for (const a of S.K_TABLE_ADDED_G) {
    const x = S.elongationCm(S.totalG(S.HANGER_G, a), S.K_ASSUMED);
    assert.ok(x >= 1.0 && x <= 5.9, a + " g added -> " + x + " cm stays in the band");
  }
  // hanger-only baseline
  near(S.elongationCm(S.HANGER_G, S.K_ASSUMED), 0.98, 1e-9, "hanger alone: about 1.0 cm");
});

test("the period line with the course pi", () => {
  // the spec row: 6.28 x sqrt(0.250/50) = 6.28 x 0.07071 = 0.444 s
  near(S.period(250, 50), 6.28 * Math.sqrt(0.25 / 50), 1e-12, "spec row 250 g");
  near(round(S.period(250, 50), 3), 0.444, 1e-9, "prints 0.444 s");
  near(round(S.t10(250, 50), 2), 4.44, 1e-9, "t10 = 4.44 s");
  // the two neighbours from the spec
  near(round(S.period(270, 50), 3), 0.461, 5e-4, "270 g -> 0.461 s");
  near(round(S.period(290, 50), 3), 0.478, 5e-4, "290 g -> 0.478 s");
  // frequency
  near(round(S.freq(250, 50), 2), 2.25, 2e-2, "f = 1/T = 2.25 Hz");
  // mass x4 -> period x2 exactly
  near(S.period(4 * 250, 50) / S.period(250, 50), 2, 1e-12, "x4 mass, x2 period");
  assert.equal(S.periodRatioForMassScale(4), 2, "the module says the same");
  // the course pi is doing work: Math.PI would shift T by ~0.05 %
  assert.ok(S.period(250, 50) !== 2 * Math.PI * Math.sqrt(0.25 / 50),
    "3.14 is not 3.14159");
  assert.ok(Number.isNaN(S.period(250, 0)), "a zero-stiffness spring has no period");
});

test("the spring's own mass runs measured T a few percent long", () => {
  assert.equal(S.EFFECTIVE_MASS_G, 25, "a third of the 75 g coil moves");
  near(S.springMassStretchPct(250, 50), 4.9, 0.05, "about 5 % at 250 g total");
  assert.ok(S.periodWithSpringMass(250, 50) > S.period(250, 50),
    "the coil's moving third lengthens the period");
  const pct = S.springMassStretchPct(250, 50);
  assert.ok(pct > 1 && pct < 10, "a few percent, not a failure");
});

test("the data-page bookkeeping matches the spec arithmetic", () => {
  // % relative difference K_average 49 vs K_slope 50: 1/50 = 2.0 %
  near(S.kRelDiff(49, 50), 1 / 50 * 100, 1e-12, "spec: 2.0 %");
  near(S.kRelDiff(50, 49), 1 / 49 * 100, 1e-9, "the denominator is the slope, not the average");
  near(S.tPctDiff(0.4658, 0.4441), 4.89, 0.01, "Fun Mode T sits about 5 % above theory");
  near(S.kAverage([49.8, 50.1, 49.9, 50.0, 50.2]), 50.0, 1e-9, "K_average is a mean");
  assert.ok(Number.isNaN(S.kAverage([])), "no rows, no average");
  assert.ok(Number.isNaN(S.kRelDiff(49, 0)), "a zero slope is not a reference");
});

// ---- Check-tab payloads re-derived from the module ---------------------------

const LAB_DIR = path.join(__dirname, "..", "site", "phy110", "labs", "05-vibrating-spring");

test("index.html check payloads: all parse, and graded answers match the module", () => {
  const html = fs.readFileSync(path.join(LAB_DIR, "index.html"), "utf8");
  const payloads = [];
  const re = /data-ex='([\s\S]*?)'/g;
  let m;
  while ((m = re.exec(html))) payloads.push(JSON.parse(m[1]));
  assert.ok(payloads.length >= 7, "expected 7+ exercises, found " + payloads.length);

  const byQ = (re2) => payloads.find((p) => re2.test(p.q));

  const ex1 = byQ(/250 g.*4\.9|4\.9 cm.*250/i);
  assert.ok(ex1 && ex1.type === "numbers", "exercise 1: K from the 250 g / 4.9 cm row");
  assert.equal(ex1.parts[0].value, round(S.force(250), 2), "F re-derived");
  assert.equal(ex1.parts[1].value, round(S.hookK(250, 4.9), 1), "K re-derived");

  const ex2 = byQ(/150 g/);
  assert.ok(ex2 && ex2.type === "numbers", "exercise 2: elongation at 150 g");
  assert.equal(ex2.parts[0].value, round(S.elongationCm(150, 50), 2), "x re-derived");

  const ex3 = byQ(/t10|ten cycles/i);
  assert.ok(ex3 && ex3.type === "numbers", "exercise 3: T and t10 at 250 g");
  assert.equal(ex3.parts[0].value, round(S.period(250, 50), 3), "T re-derived");
  assert.equal(ex3.parts[1].value, round(S.t10(250, 50), 2), "t10 re-derived");

  const ex4 = byQ(/270 g.*290|290 g.*270/i);
  assert.ok(ex4 && ex4.type === "numbers", "exercise 4: the two neighbour periods");
  assert.equal(ex4.parts[0].value, round(S.period(270, 50), 3));
  assert.equal(ex4.parts[1].value, round(S.period(290, 50), 3));

  const ex5 = byQ(/frequency/i);
  assert.ok(ex5 && ex5.type === "numbers", "exercise 5: the frequency");
  assert.equal(ex5.parts[0].value, round(S.freq(250, 50), 2), "f re-derived");

  const ex6 = byQ(/quadruple/i);
  assert.ok(ex6 && ex6.type === "choice", "exercise 6: quadrupling the mass");
  assert.equal(S.periodRatioForMassScale(4), 2, "the module agrees: exactly x2");
  assert.match(ex6.options[ex6.correct], /twice|2/i, "the correct option says twice");

  const ex7 = byQ(/49.*50|50.*49/i);
  assert.ok(ex7 && ex7.type === "numbers", "exercise 7: K_average 49 vs K_slope 50");
  assert.equal(ex7.parts[0].value, round(S.kRelDiff(49, 50), 1), "the percent re-derived");

  for (const p of payloads) {
    assert.ok(Array.isArray(p.hints) && p.hints.length >= 1, p.q.slice(0, 30) + " needs hints");
    assert.ok(p.working && p.answer, p.q.slice(0, 30) + " needs working+answer");
  }
});

// ---- purity ------------------------------------------------------------------

test("spring.js is pure: no wall clock, no DOM", () => {
  const src = fs.readFileSync(MOD, "utf8");
  assert.doesNotMatch(src, /Date\.now|new Date|performance\.now/, "no clock reads");
  assert.doesNotMatch(src, /\bdocument\b|querySelector/, "no DOM access");
});
