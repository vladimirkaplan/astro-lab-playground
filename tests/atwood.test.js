"use strict";
// PHY110 Lab 4 maths module (site/phy110/labs/04-atwood-newton2/atwood.js).
//
// a_theory = (m2 - m1) g / (m1 + m2 + M/2) and a_measured = 2h / t^2.
// The numbers that matter are the course settings (g = 9.80, holders 50 g,
// pulley 70 g, 10 g difference, 20 g per side per trial) and the one real
// physics choice the page has to make honest: the pulley enters as M/2, and
// ignoring it pushes a up by about 11 %.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOD = path.join(__dirname, "..", "site", "phy110", "labs",
  "04-atwood-newton2", "atwood.js");
require(MOD);
const A = globalThis.LS.atwood;

const near = (x, y, tol, msg) => assert.ok(Math.abs(x - y) <= tol,
  msg + ": got " + x + ", want " + y + " +/-" + tol);
const round = (x, d) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d);

test("course settings are the printed ones", () => {
  assert.equal(A.G, 9.80);
  assert.equal(A.TIMINGS_PER_TRIAL, 5);
  assert.equal(A.TRIALS, 4);
  assert.equal(A.MAX_DIFF_G, 20);
  // not printed in the manual, so the page has to show them
  assert.equal(A.HOLDER_G, 50);
  assert.equal(A.PULLEY_G, 70);
  // the course bench pattern: 10 g apart, then +20 g on both sides
  assert.deepEqual(A.COURSE_TRIALS.map((t) => [t.m1, t.m2]),
    [[150, 160], [170, 180], [190, 200], [210, 220]]);
  for (const t of A.COURSE_TRIALS) {
    assert.equal(t.m2 - t.m1, 10, "the difference stays 10 g");
  }
  assert.ok(Object.isFrozen(A.COURSE_TRIALS), "course pattern is frozen");
});

test("the theory line: a = (m2 - m1) g / (m1 + m2 + M/2)", () => {
  // the spec example: (10 x 9.80) / 345 = 98/345
  near(A.aTheory(150, 160, 70), 98 / 345, 1e-12, "spec row 150/160/70");
  near(round(A.aTheory(150, 160, 70), 3), 0.284, 1e-9, "prints 0.284 m/s^2");
  // grams cancel: the same masses in kg give the same a
  near(A.aTheory(0.150, 0.160, 0.070), A.aTheory(150, 160, 70), 1e-12,
    "kg vs g agree, the ratio cancels the units");
  // the pulley enters as half a solid disc: the denominator is m1 + m2 + M/2
  near(A.aTheory(150, 160, 70), 10 * 9.80 / (150 + 160 + 70 / 2), 1e-12,
    "the denominator is m1 + m2 + M/2");
  near(A.aTheory(150, 160, 140), 10 * 9.80 / (150 + 160 + 140 / 2), 1e-12,
    "double the pulley, double its half");
  assert.equal(A.aTheory(150, 150, 70), 0, "equal masses, zero acceleration");
  assert.ok(A.aTheory(160, 150, 70) < 0, "if m2 is lighter, a is negative (m1 falls)");
  assert.ok(Number.isNaN(A.aTheory(0, 0, 0)), "no mass, no answer");
});

test("the measured line: a = 2h / t^2", () => {
  // the spec row: h = 0.80 m, mean t = 2.74 s -> 1.6 / 7.5076
  near(A.aMeasured(0.80, 2.74), 1.6 / 7.5076, 1e-12, "spec row h 0.80, t 2.74");
  near(round(A.aMeasured(0.80, 2.74), 3), 0.213, 1e-9, "prints 0.213 m/s^2");
  // round trip: the fall time of a_theory gives a_theory back
  const a = A.aTheory(150, 160, 70);
  near(A.aMeasured(1.00, A.fallTime(1.00, a)), a, 1e-12, "round trip at h = 1.00 m");
  // the spec row: fall time for h = 1.00 m at a = 0.284
  near(A.fallTime(1.00, A.aTheory(150, 160, 70)), 2.6534, 1e-3,
    "t = sqrt(2/0.284) = 2.65 s");
  assert.ok(Number.isNaN(A.aMeasured(0.8, 0)), "a zero time is not a measurement");
  assert.ok(Number.isNaN(A.fallTime(1, 0)), "no fall for zero acceleration");
});

test("ignoring the pulley pushes a up by about 11 %", () => {
  near(A.aTheoryNoPulley(150, 160), 98 / 310, 1e-12, "spec: 98/310 without the pulley");
  near(round(A.aTheoryNoPulley(150, 160), 3), 0.316, 1e-9, "prints 0.316 m/s^2");
  near(round(A.pulleyCostPct(150, 160, 70), 1), 11.3, 0.05, "+11 % vs 0.284");
  assert.ok(A.aTheoryNoPulley(150, 160) > A.aTheory(150, 160, 70),
    "dropping the M/2 term always makes a bigger");
});

test("the percent difference: the sim picks a denominator and prints it", () => {
  // spec: measured 0.27 vs theory 0.284 -> 5.1 % on the mean 0.277, 4.9 % on theory
  near(A.pctDiffMean(0.27, 0.284), 0.014 / 0.277 * 100, 1e-9, "on the mean");
  near(round(A.pctDiffMean(0.27, 0.284), 1), 5.1, 1e-9, "prints 5.1 %");
  near(A.pctDiffTheory(0.27, 0.284), 0.014 / 0.284 * 100, 1e-9, "on the theory");
  near(round(A.pctDiffTheory(0.27, 0.284), 1), 4.9, 1e-9, "prints 4.9 %");
  // the check must accept both: span both values with the stated tolerance
  const lo = Math.min(A.pctDiffMean(0.27, 0.284), A.pctDiffTheory(0.27, 0.284)) - 0.3;
  const hi = Math.max(A.pctDiffMean(0.27, 0.284), A.pctDiffTheory(0.27, 0.284)) + 0.3;
  assert.ok(5.0 - 0.4 <= lo && 5.0 + 0.4 >= hi,
    "the page's 5.0 +/- 0.4 covers 4.9 and 5.1 with the spec's +/- 0.3");
});

test("doubling the mass difference does not double a", () => {
  // the student doubles the difference the natural way: +10 g on the heavy side
  const a1 = A.aTheory(150, 160, 70);
  const a2 = A.aTheory(150, 170, 70);
  assert.ok(a2 > a1, "more difference, more acceleration");
  assert.ok(a2 < 2 * a1,
    "but the added mass also adds inertia, so a comes out under double");
  near(a2, 196 / 355, 1e-12, "196/355 for 150/170/70");
});

test("the five-timing average is what feeds a_measured", () => {
  const times = [2.70, 2.75, 2.72, 2.76, 2.71];
  near(A.mean(times), 2.728, 1e-12, "average of the five");
  near(A.aForTrial(0.80, times), A.aMeasured(0.80, 2.728), 1e-12,
    "a comes from the averaged time");
  assert.ok(Number.isNaN(A.aForTrial(0.8, [])), "no timings, no a");
  assert.ok(Number.isNaN(A.mean([])), "an empty list has no mean");
});

test("the mass bookkeeping keeps the course rule honest", () => {
  assert.equal(A.total(50, 100), 150, "holder 50 + added 100 = 150 g");
  assert.equal(A.diff(150, 160), 10);
  assert.equal(A.breaksDiffRule(150, 160), false, "10 g is the course pattern");
  assert.equal(A.breaksDiffRule(150, 180), true, "30 g breaks the rule");
  assert.equal(A.balanced(150, 150), true, "equal masses, nothing to time");
  // Fun Mode bias band from the spec
  assert.equal(A.FUN_BIAS_MIN, 0.02);
  assert.equal(A.FUN_BIAS_MAX, 0.08);
  const aBase = A.aTheory(150, 160, 70);
  near(A.biasA(aBase, 0.02) / aBase, 0.98, 1e-12, "2 % loss");
  near(A.biasA(aBase, 0.08) / aBase, 0.92, 1e-12, "8 % loss");
  assert.ok(A.inBiasBand(0.05) && !A.inBiasBand(0.11), "the band is 2-8 %");
});

// ---- Check-tab payloads re-derived from the module ---------------------------

const LAB_DIR = path.join(__dirname, "..", "site", "phy110", "labs", "04-atwood-newton2");

test("index.html check payloads: all parse, and graded answers match the module", () => {
  const html = fs.readFileSync(path.join(LAB_DIR, "index.html"), "utf8");
  const payloads = [];
  const re = /data-ex='([\s\S]*?)'/g;
  let m;
  while ((m = re.exec(html))) payloads.push(JSON.parse(m[1]));
  assert.ok(payloads.length >= 7, "expected 7+ exercises, found " + payloads.length);

  const byQ = (re2) => payloads.find((p) => re2.test(p.q));

  const a1 = A.aTheory(150, 160, 70);
  const ex1 = byQ(/a_theory.*150.*160.*70|150 g.*160 g.*70|for m1 = 150/i);
  assert.ok(ex1 && ex1.type === "numbers", "exercise 1: a_theory for 150/160/70");
  assert.equal(ex1.parts[0].value, round(a1, 3), "a_theory re-derived from the module");

  const ex2 = byQ(/h = 1\.00/i);
  assert.ok(ex2 && ex2.type === "numbers", "exercise 2: fall time at h = 1.00 m");
  assert.equal(ex2.parts[0].value, round(A.fallTime(1.00, a1), 2),
    "t re-derived from the module");

  const ex3 = byQ(/2\.74/i);
  assert.ok(ex3 && ex3.type === "numbers", "exercise 3: a from h = 0.80, t 2.74");
  assert.equal(ex3.parts[0].value, round(A.aMeasured(0.80, 2.74), 3),
    "a_measured re-derived from the module");

  const ex4 = byQ(/ignor(e|ing) the pulley/i);
  assert.ok(ex4 && ex4.type === "numbers", "exercise 4: the pulley-less value");
  assert.equal(ex4.parts[0].value, round(A.aTheoryNoPulley(150, 160), 3));
  assert.equal(ex4.parts[1].value, round(A.pulleyCostPct(150, 160, 70), 1),
    "the percent cost re-derived from the module");

  const ex5 = byQ(/0\.27/i);
  assert.ok(ex5 && ex5.type === "numbers", "exercise 5: the percent difference");
  assert.ok(typeof ex5.parts[0].tolAbs === "number", "ex5 tolerates the denominator choice");
  const lo = Math.min(A.pctDiffMean(0.27, 0.284), A.pctDiffTheory(0.27, 0.284)) - 0.3;
  const hi = Math.max(A.pctDiffMean(0.27, 0.284), A.pctDiffTheory(0.27, 0.284)) + 0.3;
  assert.ok(ex5.parts[0].value - ex5.parts[0].tolAbs <= lo &&
    ex5.parts[0].value + ex5.parts[0].tolAbs >= hi,
    "ex5 accepts both denominators within the spec tolerance");

  const ex6 = byQ(/double/i);
  assert.ok(ex6 && ex6.type === "choice", "exercise 6: doubling the difference");
  const aDouble = A.aTheory(150, 170, 70);
  assert.ok(aDouble > a1 && aDouble < 2 * a1, "the module agrees: under double");
  assert.match(ex6.options[ex6.correct], /inertia/i,
    "the correct option names the inertia that grows too");

  const ex7 = byQ(/below the theory/i);
  assert.ok(ex7 && ex7.type === "keywords", "exercise 7: why measured lands below");
  assert.ok(ex7.words.length >= 3 && typeof ex7.need === "number",
    "the keywords question names the accepted ideas");

  for (const p of payloads) {
    assert.ok(Array.isArray(p.hints) && p.hints.length >= 1, p.q.slice(0, 30) + " needs hints");
    assert.ok(p.working && p.answer, p.q.slice(0, 30) + " needs working+answer");
  }
});

// ---- purity ------------------------------------------------------------------

test("atwood.js is pure: no wall clock, no DOM", () => {
  const src = fs.readFileSync(MOD, "utf8");
  assert.doesNotMatch(src, /Date\.now|new Date|performance\.now/, "no clock reads");
  assert.doesNotMatch(src, /\bdocument\b|querySelector/, "no DOM access");
});
