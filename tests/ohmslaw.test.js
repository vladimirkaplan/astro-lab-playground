"use strict";
// PHY110 Lab 9 maths module (site/phy110/labs/09-ohms-law/ohmslaw.js).
//
// R = V / I, with V vertical against I horizontal the line runs through the
// origin with slope R in ohms. Printed: nominal 200 ohm and 100 ohm modules,
// set-points 200 ohm at 2, 4, 6, 8, 10, 11 V; 100 ohm at 1, 2, 3, 4, 5, 5.5 V;
// ammeter 100 mA scale, voltmeter 15 V range; 1 A = 1000 mA. Honesty: 1-2 %
// warm-up drift, +-1 mA parallax, the 5.5 V cap is the ammeter stop, not
// physics.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOD = path.join(__dirname, "..", "site", "phy110", "labs",
  "09-ohms-law", "ohmslaw.js");
require(MOD);
const O = globalThis.LS.ohmslaw;

const near = (x, y, tol, msg) => assert.ok(Math.abs(x - y) <= tol,
  msg + ": got " + x + ", want " + y + " +/-" + tol);
const round = (x, d) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d);

test("course settings are the printed ones", () => {
  assert.deepEqual(O.SETS.R200, { nominal: 200, setpoints: [2, 4, 6, 8, 10, 11] });
  assert.deepEqual(O.SETS.R100, { nominal: 100, setpoints: [1, 2, 3, 4, 5, 5.5] });
  assert.equal(O.AMMETER_MA, 100, "ammeter scale stop");
  assert.equal(O.VOLTMETER_V, 15, "voltmeter range");
  assert.equal(O.MA_PER_A, 1000, "1 A = 1000 mA, printed");
  assert.equal(O.WARM_DRIFT_MAX, 0.02, "up to 2 % warm-up drift");
  assert.equal(O.NOISE_MA, 1, "+-1 mA parallax");
  assert.deepEqual(O.accepted, { r200: 200, r100: 100, ammeterMa: 100, voltmeterV: 15 });
});

test("Ohm's law both directions", () => {
  near(O.currentA(200, 8), 0.040, 1e-12, "8 V across 200 ohm");
  near(O.currentMa(200, 8), 40, 1e-9, "40 mA on the face");
  near(O.currentMa(100, 5.5), 55, 1e-9, "55 mA under the stop");
  near(O.voltageV(200, 0.050), 10, 1e-12, "I = V / R, back the other way");
  assert.ok(Number.isNaN(O.currentA(0, 8)), "zero resistance is not a question");
});

test("the ammeter stop: 11 V across 100 ohm pegs, 5.5 V does not", () => {
  assert.equal(O.overAmmeter(100, 11), true, "110 mA is past the 100 mA stop");
  assert.equal(O.overAmmeter(100, 5.5), false, "55 mA is under the stop");
  assert.equal(O.overAmmeter(200, 11), false, "200 ohm takes the whole run");
  assert.equal(O.highestSafeSetpoint(100, O.SETS.R100.setpoints), 5.5,
    "the printed 100 ohm run ends at 5.5 V");
  assert.equal(O.highestSafeSetpoint(100, [1, 2, 3, 4, 5, 5.5, 11]), 5.5,
    "extend the list and the stop still cuts at 5.5");
  assert.equal(O.highestSafeSetpoint(200, O.SETS.R200.setpoints), 11,
    "the 200 ohm run uses every set-point");
});

test("the two-point slope through the origin is the resistance", () => {
  near(O.slope2pt(0, 0, 0.050, 10), 200, 1e-9, "(10 V, 0.050 A) gives 200 ohm");
  near(O.slope2pt(0, 0, 0.110, 11), 100, 1e-9, "(11 V, 0.110 A) would give 100 ohm");
  assert.ok(Number.isNaN(O.slope2pt(0, 0, 0, 10)), "vertical line is not a run");
});

test("the forced best fit of the printed 200 ohm run lands on 200", () => {
  const pts = O.SETS.R200.setpoints.map((v) => ({ v, i: O.currentA(200, v) }));
  near(O.slopeThroughOrigin(pts), 200, 1e-9, "ideal run round-trips the nominal");
  const pts100 = O.SETS.R100.setpoints.map((v) => ({ v, i: O.currentA(100, v) }));
  near(O.slopeThroughOrigin(pts100), 100, 1e-9, "the small run round-trips too");
  assert.ok(Number.isNaN(O.slopeThroughOrigin([])), "no points is not a line");
});

test("percent error against the nominal", () => {
  near(O.pctError(194, 200), 3.0, 1e-12, "194 against 200 is 3.0 %");
  near(round(O.pctError(194, 200), 1), 3.0, 1e-12, "prints 3.0 %");
  assert.ok(Number.isNaN(O.pctError(194, 0)), "zero nominal is not a question");
});

test("warm-up drift stays inside 1-2 %, either way", () => {
  near(O.driftedR(200, 1), 204, 1e-12, "full warm-up, 2 % high");
  near(O.driftedR(200, -1), 196, 1e-12, "full warm-up, 2 % low");
  near(O.driftedR(200, 0), 200, 1e-12, "no drift, the nominal");
  near(O.driftedR(100, 0.5), 101, 1e-12, "half warm-up on the small module");
});

// ---- Check-tab payloads re-derived from the module ---------------------------

const LAB_DIR = path.join(__dirname, "..", "site", "phy110", "labs", "09-ohms-law");

test("index.html check payloads: all parse, and graded answers match the module", () => {
  const html = fs.readFileSync(path.join(LAB_DIR, "index.html"), "utf8");
  const payloads = [];
  const re = /data-ex='([\s\S]*?)'/g;
  let m;
  while ((m = re.exec(html))) payloads.push(JSON.parse(m[1]));
  assert.ok(payloads.length >= 7, "expected 7+ exercises, found " + payloads.length);

  const byQ = (re2) => payloads.find((p) => re2.test(p.q));

  const ex1 = byQ(/8 V across the 200 ohm/);
  assert.ok(ex1 && ex1.type === "numbers", "exercise 1: the 200 ohm current");
  assert.equal(ex1.parts[0].value, round(O.currentMa(200, 8), 6),
    "40 mA re-derived");

  const ex2 = byQ(/5\.5 V across the 100 ohm/);
  assert.ok(ex2 && ex2.type === "numbers", "exercise 2: the 100 ohm current");
  assert.equal(ex2.parts[0].value, round(O.currentMa(100, 5.5), 6),
    "55 mA re-derived");

  const ex3 = byQ(/What is the slope, in ohms/);
  assert.ok(ex3 && ex3.type === "numbers", "exercise 3: the two-point slope");
  assert.equal(ex3.parts[0].value, round(O.slope2pt(0, 0, 0.050, 10), 6),
    "200 ohm re-derived");

  const ex4 = byQ(/percent error/);
  assert.ok(ex4 && ex4.type === "numbers", "exercise 4: the percent error");
  assert.equal(ex4.parts[0].value, round(O.pctError(194, 200), 1),
    "3.0 % re-derived");

  const ex5 = byQ(/stop at 5\.5 V/);
  assert.ok(ex5 && ex5.type === "choice", "exercise 5: why the run stops");
  assert.match(ex5.options[ex5.correct], /110 mA/i,
    "the correct option names the pegging current");
  assert.match(ex5.options[ex5.correct], /100 mA/i,
    "and the stop it passes");
  assert.equal(O.overAmmeter(100, 11), true,
    "and the module agrees 11 V pegs the ammeter");

  const ex6 = byQ(/which module draws more current/);
  assert.ok(ex6 && ex6.type === "choice", "exercise 6: the current comparison");
  assert.match(ex6.options[ex6.correct], /100 ohm/i,
    "the correct option names the smaller resistor");
  assert.ok(O.currentMa(100, 6) > O.currentMa(200, 6),
    "and the module agrees the small one draws more");

  const ex7 = byQ(/does not pass exactly through \(0, 0\)/);
  assert.ok(ex7 && ex7.type === "keywords", "exercise 7: the offset sources");
  assert.ok(ex7.words.length >= 5 && ex7.need >= 2, "the keyword set is real");

  for (const p of payloads) {
    assert.ok(Array.isArray(p.hints) && p.hints.length >= 1, p.q.slice(0, 30) + " needs hints");
    assert.ok(p.working && p.answer, p.q.slice(0, 30) + " needs working+answer");
  }
});

// ---- purity ------------------------------------------------------------------

test("ohmslaw.js is pure: no wall clock, no DOM", () => {
  const src = fs.readFileSync(MOD, "utf8");
  assert.doesNotMatch(src, /Date\.now|new Date|performance\.now/, "no clock reads");
  assert.doesNotMatch(src, /\bdocument\b|querySelector/, "no DOM access");
});
