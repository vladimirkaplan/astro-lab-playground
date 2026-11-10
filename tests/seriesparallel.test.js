"use strict";
// PHY110 Lab 10 maths module (site/phy110/labs/10-series-parallel/seriesparallel.js).
//
// Series: I0 = I1 = I2, V0 = V1 + V2, R_total = R1 + R2.
// Parallel: V0 = V1 = V2, I0 = I1 + I2, 1/R_total = 1/R1 + 1/R2.
// Printed: R1 100 ohm, R2 200 ohm, supply 6.0 V fixed, ammeter 100 mA,
// voltmeter 15 V, 1 A = 1000 mA. Honesty: +-5 % tolerance band (not
// printed), meter internal resistance, a third parallel resistor pegs the
// 100 mA stop, one run hides scatter.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOD = path.join(__dirname, "..", "site", "phy110", "labs",
  "10-series-parallel", "seriesparallel.js");
require(MOD);
const O = globalThis.LS.seriesparallel;

const near = (x, y, tol, msg) => assert.ok(Math.abs(x - y) <= tol,
  msg + ": got " + x + ", want " + y + " +/-" + tol);
const round = (x, d) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d);

test("course settings are the printed ones", () => {
  assert.equal(O.V0, 6.0, "the fixed supply set-point");
  assert.equal(O.R1, 100, "nominal, printed");
  assert.equal(O.R2, 200, "nominal, printed");
  assert.equal(O.AMMETER_MA, 100, "the ammeter scale stop");
  assert.equal(O.VOLTMETER_V, 15, "the voltmeter range");
  assert.equal(O.MA_PER_A, 1000, "1 A = 1000 mA, printed");
  assert.equal(O.TOL_PCT, 5, "the tolerance band, not printed");
  assert.deepEqual(O.accepted, {
    v0: 6.0, r1: 100, r2: 200, seriesRt: 300,
    parallelRt: O.parallelRt(100, 200), ammeterMa: 100, voltmeterV: 15 });
});

test("the combination rules", () => {
  near(O.seriesRt(100, 200), 300, 1e-12, "series: 100 + 200");
  near(O.parallelRt(100, 200), 20000 / 300, 1e-12, "parallel: 100*200/300");
  near(O.parallelOf([100, 200]), 20000 / 300, 1e-12, "parallelOf agrees for two");
  near(O.parallelOf([100, 200, 100]), 40, 1e-12, "the borrowed third bank is 40 ohm");
  assert.ok(Number.isNaN(O.parallelRt(0, 200)), "a missing resistor is not a question");
  assert.ok(Number.isNaN(O.parallelOf([])), "no branches is not a bank");
});

test("the series pair at 6.0 V: 20 mA, drops 2.0 and 4.0, power 0.12 W", () => {
  const I0 = O.currentA(O.seriesRt(100, 200), 6.0);
  near(I0, 0.020, 1e-12, "I0 = 6.0/300");
  near(O.currentMa(O.seriesRt(100, 200), 6.0), 20.0, 1e-9, "20.0 mA on the face");
  near(O.dropV(100, I0), 2.0, 1e-12, "V1 across the 100 ohm");
  near(O.dropV(200, I0), 4.0, 1e-12, "V2 across the 200 ohm");
  near(O.dropV(100, I0) + O.dropV(200, I0), 6.0, 1e-12, "the drops add to V0");
  near(O.powerW(6.0, I0), 0.12, 1e-12, "series power");
  near(O.powerFromI(I0, 300), 0.12, 1e-12, "I^2 R agrees");
});

test("the parallel pair at 6.0 V: 90 mA total, 60 and 30 in the branches", () => {
  const Rt = O.parallelRt(100, 200);
  near(Rt, 66.7, 0.05, "nominal 66.7 ohm");
  const I0 = O.currentA(Rt, 6.0);
  near(I0, 0.090, 1e-9, "I0 = 6.0/66.67");
  near(O.currentMa(100, 6.0), 60, 1e-9, "I1, the 100 ohm branch sees all 6 V");
  near(O.currentMa(200, 6.0), 30, 1e-9, "I2, the 200 ohm branch");
  near(O.currentMa(100, 6.0) + O.currentMa(200, 6.0),
    O.currentMa(Rt, 6.0), 1e-9, "the branch currents add to I0");
  near(O.powerW(6.0, I0), 0.54, 1e-12, "parallel power");
  near(O.powerW(6.0, I0) / O.powerW(6.0, O.currentA(300, 6.0)), 4.5, 1e-9,
    "the power ratio is 4.5");
});

test("the ammeter margin: 90 mA sits under the stop, the borrowed bank pegs it", () => {
  assert.equal(O.overAmmeter(O.currentMa(O.parallelRt(100, 200), 6.0)), false,
    "the two-branch bank stays under 100 mA");
  assert.equal(O.overAmmeter(150), true, "150 mA is past the stop");
  near(O.currentMa(O.parallelOf([100, 200, 100]), 6.0), 150, 1e-9,
    "the borrowed third branch draws 150 mA at the nominal");
  assert.equal(O.overAmmeter(O.currentMa(O.parallelOf([100, 200, 100]), 6.0)), true,
    "and that pegs the 100 mA ammeter");
});

test("R_measured from V and I, and percent error against the rule", () => {
  near(O.rFromVI(6.0, 0.020), 300, 1e-9, "series R_measured");
  near(O.rFromVI(6.0, 0.090), 66.667, 0.001, "parallel R_measured");
  near(O.pctError(306, 300), 2.0, 1e-12, "306 against 300");
  near(round(O.pctError(67.4, O.parallelRt(100, 200)), 1), 1.1, 1e-9,
    "a 0.73 ohm slip on the parallel nominal");
  assert.ok(Number.isNaN(O.pctError(1, 0)), "zero nominal is not a question");
});

test("the Fun Mode tolerance draw stays inside +-5 %", () => {
  near(O.toleranceR(100, 1), 105, 1e-12, "full band high on the small chip");
  near(O.toleranceR(100, -1), 95, 1e-12, "full band low on the small chip");
  near(O.toleranceR(200, 0.5), 205, 1e-9, "half band high on the big chip");
  near(O.toleranceR(200, 0), 200, 1e-12, "zero draw is the nominal");
  // worst-case bench scatter inside the band
  const rHi = O.toleranceR(100, 1) + O.toleranceR(200, 1);
  const rLo = O.toleranceR(100, -1) + O.toleranceR(200, -1);
  assert.ok(rHi > 300 && rHi <= 315.0001, "series total stays under +5 %");
  assert.ok(rLo < 300 && rLo >= 284.9999, "series total stays above -5 %");
});

// ---- Check-tab payloads re-derived from the module ---------------------------

const LAB_DIR = path.join(__dirname, "..", "site", "phy110", "labs", "10-series-parallel");

test("index.html check payloads: all parse, and graded answers match the module", () => {
  const html = fs.readFileSync(path.join(LAB_DIR, "index.html"), "utf8");
  const payloads = [];
  const re = /data-ex='([\s\S]*?)'/g;
  let m;
  while ((m = re.exec(html))) payloads.push(JSON.parse(m[1]));
  assert.ok(payloads.length >= 7, "expected 7+ exercises, found " + payloads.length);

  const byQ = (re2) => payloads.find((p) => re2.test(p.q));
  const Rt = O.parallelRt(O.R1, O.R2);

  const ex1 = byQ(/series pair is 100 ohm and 200 ohm/);
  assert.ok(ex1 && ex1.type === "numbers", "exercise 1: the series current");
  assert.equal(ex1.parts[0].value, round(O.currentMa(O.seriesRt(100, 200), 6.0), 6),
    "20.0 mA re-derived");

  const ex2 = byQ(/drop across each resistor/);
  assert.ok(ex2 && ex2.type === "numbers", "exercise 2: the series drops");
  const I0 = O.currentA(O.seriesRt(100, 200), 6.0);
  assert.equal(ex2.parts[0].value, round(O.dropV(100, I0), 6), "V1 = 2.0 re-derived");
  assert.equal(ex2.parts[1].value, round(O.dropV(200, I0), 6), "V2 = 4.0 re-derived");

  const ex3 = byQ(/parallel pair of 100 ohm and 200 ohm/);
  assert.ok(ex3 && ex3.type === "numbers", "exercise 3: the parallel nominal");
  assert.ok(Math.abs(ex3.parts[0].value - Rt) <= 0.5, "66.7 within the stated tolerance");
  assert.equal(ex3.parts[0].value, round(Rt, 1), "and it prints 66.7");

  const ex4 = byQ(/main current, and the current in each branch/);
  assert.ok(ex4 && ex4.type === "numbers", "exercise 4: the parallel currents");
  assert.equal(ex4.parts[0].value, round(O.currentMa(Rt, 6.0), 6), "I0 = 90 re-derived");
  assert.equal(ex4.parts[1].value, round(O.currentMa(100, 6.0), 6), "I1 = 60 re-derived");
  assert.equal(ex4.parts[2].value, round(O.currentMa(200, 6.0), 6), "I2 = 30 re-derived");

  const ex5 = byQ(/power ratio/);
  assert.ok(ex5 && ex5.type === "numbers", "exercise 5: the power ratio");
  const ratio = O.powerW(6.0, O.currentA(Rt, 6.0)) / O.powerW(6.0, O.currentA(300, 6.0));
  assert.ok(Math.abs(ex5.parts[0].value - ratio) <= 0.3, "4.5 within the stated tolerance");
  assert.equal(ex5.parts[0].value, round(ratio, 1), "and it prints 4.5");

  const ex6 = byQ(/third 100 ohm resistor joins/);
  assert.ok(ex6 && ex6.type === "choice", "exercise 6: the borrowed bank");
  assert.match(ex6.options[ex6.correct], /150 mA/i,
    "the correct option names the pegging current");
  assert.match(ex6.options[ex6.correct], /100 mA/i,
    "and the stop it passes");
  assert.equal(O.overAmmeter(O.currentMa(O.parallelOf([100, 200, 100]), 6.0)), true,
    "and the module agrees the borrowed bank pegs the ammeter");

  const ex7 = byQ(/percent error comes out near zero/);
  assert.ok(ex7 && ex7.type === "keywords", "exercise 7: why near-zero is suspicious");
  assert.ok(ex7.words.length >= 5 && ex7.need >= 2, "the keyword set is real");

  for (const p of payloads) {
    assert.ok(Array.isArray(p.hints) && p.hints.length >= 1, p.q.slice(0, 30) + " needs hints");
    assert.ok(p.working && p.answer, p.q.slice(0, 30) + " needs working+answer");
    if (p.type === "numbers") {
      for (const part of p.parts) {
        assert.ok(part.unit, p.q.slice(0, 30) + " part " + part.label + " needs a unit");
        assert.ok(part.tolAbs !== undefined,
          p.q.slice(0, 30) + " part " + part.label + " states a tolerance");
      }
    }
  }
});

// ---- page wiring --------------------------------------------------------------

test("the page carries the shared scripts in the repo order, and the sim names the folder", () => {
  const html = fs.readFileSync(path.join(LAB_DIR, "index.html"), "utf8");
  const order = ["../../../shared/courses.js", "../../../shared/units.js",
    "../../../shared/ui.js", "../../../shared/store.js", "../../../shared/check.js",
    "../../../shared/worksheet.js", "./seriesparallel.js", "./worksheet.js", "./sim.js"];
  let last = -1;
  for (const s of order) {
    const i = html.indexOf('<script src="' + s + '"></script>');
    assert.ok(i > last, s + " loads after the previous script");
    last = i;
  }
  const sim = fs.readFileSync(path.join(LAB_DIR, "sim.js"), "utf8");
  assert.match(sim, /var LAB = "10-series-parallel";/, "LAB equals the folder name");
  assert.match(sim, /LS\.ui\.banner\(document\.querySelector\("main"\)\)/, "the banner mounts");
  assert.match(sim, /LS\.ui\.initTabs\(\)/, "tabs init");
  assert.match(sim, /LS\.ui\.modeToggle\(LAB/, "mode toggle on the lab key");
  assert.match(sim, /LS\.check\.init\(LAB\)/, "check init");
  const ws = fs.readFileSync(path.join(LAB_DIR, "worksheet.js"), "utf8");
  assert.match(ws, /slug: "10-series-parallel"/, "the worksheet slug equals the folder");
});

// ---- purity ------------------------------------------------------------------

test("seriesparallel.js is pure: no wall clock, no DOM", () => {
  const src = fs.readFileSync(MOD, "utf8");
  assert.doesNotMatch(src, /Date\.now|new Date|performance\.now/, "no clock reads");
  assert.doesNotMatch(src, /\bdocument\b|querySelector/, "no DOM access");
});
