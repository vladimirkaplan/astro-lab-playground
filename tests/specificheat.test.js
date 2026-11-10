"use strict";
// PHY110 Lab 8 maths module (site/phy110/labs/08-specific-heat/specificheat.js).
//
// c_s m_s (T_s - T_f) = (m_c c_c + m_w c_w) (T_f - T_i), course units cal/g C.
// Printed: c_cup = 0.22, c_water = 1.000, Table II Cu 0.093 / Zn 0.093 /
// Sn 0.054 / Pb 0.031, T_s = 100 C (assumed 1 atm, labeled). Not printed:
// the course run (95.0 g sample, 60.0 g cup, 210.0 g cup+water, T_i 22.0 C).
// Honesty: heat loss moves c_s low, riding water high, a cooler arrival low -
// a few percent, like the real bench.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOD = path.join(__dirname, "..", "site", "phy110", "labs",
  "08-specific-heat", "specificheat.js");
require(MOD);
const SH = globalThis.LS.specificheat;

const near = (x, y, tol, msg) => assert.ok(Math.abs(x - y) <= tol,
  msg + ": got " + x + ", want " + y + " +/-" + tol);
const round = (x, d) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d);

test("course settings are the printed ones", () => {
  assert.equal(SH.C_CUP, 0.22);
  assert.equal(SH.C_WATER, 1.000);
  assert.equal(SH.T_BOIL, 100, "assumed 1 atm, labeled");
  assert.deepEqual(SH.TABLE2, { Cu: 0.093, Zn: 0.093, Sn: 0.054, Pb: 0.031 });
  assert.deepEqual(SH.METALS.slice(), ["Sn", "Zn", "Cu", "Pb"]);
  // not printed: the course run the drawer shows
  assert.deepEqual(SH.RUN, { ms: 95.0, mc: 60.0, mcw: 210.0, ti: 22.0, ts: 100.0 });
  assert.equal(SH.FUN_LOSS_CAL, 30);
  assert.equal(SH.FUN_RIDE_ALONG_G, 0.5);
});

test("the spec run: c_s = 652.8 / 7030 = 0.0929, copper", () => {
  // m_c = 60.0, m_w = 150.0, m_s = 95.0; T_i 22.0, T_s 100.0, T_f 26.0
  const cw = SH.capacityCW(60, 150);
  near(cw, 163.2, 1e-12, "cup + water heat capacity");
  const cs = SH.cFrom(60, 150, 95, 22, 100, 26);
  near(cs, 652.8 / 7030, 1e-12, "652.8 / 7030");
  near(round(cs, 4), 0.0929, 1e-12, "prints 0.0929");
  assert.ok(Number.isNaN(SH.cFrom(60, 150, 95, 22, 100, 100)),
    "T_f at T_s is not a measurement");
});

test("the ideal mix lands T_f where the balance says, and the thermometer reads it", () => {
  for (const m of SH.METALS) {
    const tf = SH.finalT(m, 60, 150, 95, 22, 100);
    const back = SH.cFrom(60, 150, 95, 22, 100, tf);
    near(back, SH.TABLE2[m], 1e-9, m + ": the balance round-trips the table value");
    const read = SH.readC(tf);
    assert.ok(Math.abs(read - tf) <= 0.05, m + ": the 0.1 C thermometer rounds");
  }
  // copper, the spec case
  near(SH.finalT("Cu", 60, 150, 95, 22, 100), 26.0056, 0.01, "T_f just past 26");
  assert.equal(SH.readC(SH.finalT("Cu", 60, 150, 95, 22, 100)), 26.0, "reads 26.0");
});

test("heat per gram and the water-to-cup ratio", () => {
  near(SH.heatPerGram(SH.C_WATER, 10), 10, 1e-12, "water over 10 C");
  near(SH.heatPerGram(SH.C_CUP, 10), 2.2, 1e-12, "cup over 10 C");
  near(SH.ratioWaterCup(), 4.5455, 0.001, "1.000 / 0.220");
  near(round(SH.ratioWaterCup(), 1), 4.5, 1e-12, "prints 4.5 x");
});

test("percent error against the accepted line", () => {
  near(SH.pctError(0.088, 0.093), 5.376, 0.01, "0.005 / 0.093");
  near(round(SH.pctError(0.088, 0.093), 1), 5.4, 1e-12, "prints 5.4 %");
  assert.ok(Number.isNaN(SH.pctError(0.1, 0)), "zero accepted is not a question");
});

test("a cooler arrival reads LOW: the used gap is bigger than the true drop", () => {
  // arrives at 95 C, student still uses T_s = 100
  const c = SH.coolerArrivalC("Cu", 60, 150, 95, 22, 100, 95);
  assert.ok(c < SH.TABLE2.Cu, "measured c_s is below the table value");
  near(c, 0.0867, 0.005, "roughly a 7 % low");
  const c70 = SH.coolerArrivalC("Cu", 60, 150, 95, 22, 100, 70);
  assert.ok(c70 < c, "the cooler the arrival, the lower the reading");
});

test("riding water reads HIGH: hot heat the line does not count", () => {
  const c = SH.rideAlongC("Cu", 60, 150, 95, 22, 100, 0.5);
  assert.ok(c > SH.TABLE2.Cu, "measured c_s is above the table value");
  near(c, 0.0983, 0.005, "roughly a 5 % high");
  const c2 = SH.finalTWithRideAlong("Cu", 60, 150, 95, 22, 100, 0.5);
  assert.ok(c2 > SH.finalT("Cu", 60, 150, 95, 22, 100), "T_f comes out higher");
});

test("heat loss alone moves T_f (and c_s) low, a few percent", () => {
  const clean = SH.finalT("Cu", 60, 150, 95, 22, 100);
  const lost = SH.finalTWithLoss("Cu", 60, 150, 95, 22, 100, 30);
  assert.ok(lost < clean, "losing heat cools the mix");
  const csLost = SH.cFrom(60, 150, 95, 22, 100, lost);
  assert.ok(csLost < SH.TABLE2.Cu, "and the measured c_s follows it down");
  assert.ok(SH.pctError(csLost, SH.TABLE2.Cu) < 8, "a few percent, not a failed lab");
});

test("the combined Fun Mode route stays inside a few percent of the table", () => {
  const tf = SH.finalTWithErrors("Cu", 60, 150, 95, 22, 100, 20, 0.3);
  const cs = SH.cFrom(60, 150, 95, 22, 100, SH.readC(tf));
  assert.ok(SH.pctError(cs, SH.TABLE2.Cu) < 10, "the honest scatter stays small");
});

// ---- Check-tab payloads re-derived from the module ---------------------------

const LAB_DIR = path.join(__dirname, "..", "site", "phy110", "labs", "08-specific-heat");

test("index.html check payloads: all parse, and graded answers match the module", () => {
  const html = fs.readFileSync(path.join(LAB_DIR, "index.html"), "utf8");
  const payloads = [];
  const re = /data-ex='([\s\S]*?)'/g;
  let m;
  while ((m = re.exec(html))) payloads.push(JSON.parse(m[1]));
  assert.ok(payloads.length >= 7, "expected 7+ exercises, found " + payloads.length);

  const byQ = (re2) => payloads.find((p) => re2.test(p.q));

  const ex1 = byQ(/What specific heat does the balance give/);
  assert.ok(ex1 && ex1.type === "numbers", "exercise 1: the spec run");
  assert.equal(ex1.parts[0].value, round(SH.cFrom(60, 150, 95, 22, 100, 26), 4),
    "c_s re-derived");

  const ex2 = byQ(/What does the table tell you/);
  assert.ok(ex2 && ex2.type === "choice", "exercise 2: the identification");
  assert.match(ex2.options[ex2.correct], /copper and zinc match/i,
    "the correct option names the shared 0.093 line");
  assert.match(ex2.options[ex2.correct], /copper/, "and the stamp says copper");

  const ex3 = byQ(/times more heat per gram/);
  assert.ok(ex3 && ex3.type === "numbers", "exercise 3: the ratio");
  assert.equal(ex3.parts[0].value, round(SH.ratioWaterCup(), 1), "ratio re-derived");

  const ex4 = byQ(/percent error/);
  assert.ok(ex4 && ex4.type === "numbers", "exercise 4: the percent error");
  assert.equal(ex4.parts[0].value, round(SH.pctError(0.088, 0.093), 1),
    "percent re-derived");

  const ex5 = byQ(/arrives in the cup cooler/);
  assert.ok(ex5 && ex5.type === "choice", "exercise 5: cooler arrival");
  assert.match(ex5.options[ex5.correct], /too low/i,
    "the physically correct direction: too low");
  assert.ok(SH.coolerArrivalC("Cu", 60, 150, 95, 22, 100, 95) < SH.TABLE2.Cu,
    "and the module agrees the arrival reads low");

  const ex6 = byQ(/rides along/);
  assert.ok(ex6 && ex6.type === "choice", "exercise 6: riding water");
  assert.match(ex6.options[ex6.correct], /too high/i,
    "the physically correct direction: too high");
  assert.ok(SH.rideAlongC("Cu", 60, 150, 95, 22, 100, 0.5) > SH.TABLE2.Cu,
    "and the module agrees riding water reads high");

  const ex7 = byQ(/long enough before the transfer/);
  assert.ok(ex7 && ex7.type === "keywords", "exercise 7: why wait in the boil");
  assert.ok(ex7.words.length >= 5 && ex7.need >= 2, "the keyword set is real");

  for (const p of payloads) {
    assert.ok(Array.isArray(p.hints) && p.hints.length >= 1, p.q.slice(0, 30) + " needs hints");
    assert.ok(p.working && p.answer, p.q.slice(0, 30) + " needs working+answer");
  }
});

// ---- purity ------------------------------------------------------------------

test("specificheat.js is pure: no wall clock, no DOM", () => {
  const src = fs.readFileSync(MOD, "utf8");
  assert.doesNotMatch(src, /Date\.now|new Date|performance\.now/, "no clock reads");
  assert.doesNotMatch(src, /\bdocument\b|querySelector/, "no DOM access");
});
