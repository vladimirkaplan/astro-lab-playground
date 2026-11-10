"use strict";
// PHY110 Lab 7 maths module (site/phy110/labs/07-archimedes/archimedes.js).
//
// F_b = rho_f V_f g with fully submerged V_f = V_o, and the weight route
// F_g - F_g(apparent) = rho_f V_o g. Course values: g = 9.80, rho_water =
// 1000 kg/m^3, 1 mL = 1e-6 m^3, Table I densities Cu 8.92 / tin 7.30 / zinc
// 7.10 g/cm^3. Not printed: the three object volumes, 2.50 mL each. Honesty:
// the 50 mL cylinder reads to 1 mL, so the volume route carries a ~20 % slip
// on a 2.5 mL object; percent differences are taken on the mean.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOD = path.join(__dirname, "..", "site", "phy110", "labs",
  "07-archimedes", "archimedes.js");
require(MOD);
const A = globalThis.LS.archimedes;

const near = (x, y, tol, msg) => assert.ok(Math.abs(x - y) <= tol,
  msg + ": got " + x + ", want " + y + " +/-" + tol);
const round = (x, d) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d);

test("course settings are the printed ones", () => {
  assert.equal(A.G, 9.80);
  assert.equal(A.RHO_WATER, 1000);
  assert.equal(A.ML_TO_M3, 1e-6);
  assert.deepEqual(A.DENSITIES, { Cu: 8.92, Sn: 7.30, Zn: 7.10 }, "Table I");
  assert.deepEqual(A.MATERIALS.slice(), ["Cu", "Sn", "Zn"]);
  assert.deepEqual(A.STAMPS, { Cu: "Cu", Sn: "T", Zn: "Z" }, "the hook stamps");
  // not printed: the object sizes, about 2.5 mL each (the drawer shows them)
  assert.deepEqual(A.OBJECTS, { Cu: 2.50, Sn: 2.50, Zn: 2.50 });
  assert.equal(A.WIRE_ML, 0.10);
  assert.equal(A.WEIGH_JITTER_G, 0.05);
});

test("the volume route: F_b = rho V g with the unit line", () => {
  near(A.mLtoM3(2.5), 2.5e-6, 1e-15, "2.5 mL in m^3");
  near(A.buoyantN(1000, 2.5e-6, 9.80), 0.0245, 1e-12, "the accepted F_b");
  near(A.buoyantFromMl(2.5), 0.0245, 1e-12, "same thing from mL");
  near(A.buoyantFromMl(3.0), 0.0294, 1e-12, "a 3 mL coarse read");
  assert.ok(Number.isNaN(A.buoyantN(1000, NaN, 9.80)), "no volume, no force");
});

test("the weight route: masses, weights, apparent mass", () => {
  near(A.massG("Cu", 2.5), 22.3, 1e-12, "copper 22.3 g");
  near(A.massG("Sn", 2.5), 18.25, 1e-12, "tin 18.25 g");
  near(A.massG("Zn", 2.5), 17.75, 1e-12, "zinc 17.75 g");
  near(A.weightN(22.3), 0.21854, 1e-12, "F_g of the copper");
  near(A.apparentMassG(22.3, 2.5), 19.8, 1e-12, "22.3 - 2.5");
  near(A.buoyantFromWeightN(22.3, 19.8), 0.0245, 1e-12,
    "the weight route ties back to the volume route");
  assert.ok(Number.isNaN(A.massG("Xx", 2.5)), "unknown metal has no mass");
});

test("copper check from the spec: 0.219 / 0.194 / 0.0245 N", () => {
  const fg = A.weightN(22.3);
  const fgApp = A.weightN(A.apparentMassG(22.3, 2.5));
  const fb = A.buoyantFromWeightN(22.3, A.apparentMassG(22.3, 2.5));
  near(round(fg, 3), 0.219, 1e-9, "prints 0.219 N");
  near(round(fgApp, 3), 0.194, 1e-9, "prints 0.194 N");
  near(round(fb, 4), 0.0245, 1e-9, "difference ties back to F_b");
});

test("percent difference is on the mean, as the data page computes it", () => {
  near(A.pctDiffMean(0.0245, 0.0230), 6.3158, 0.01, "0.0015 / 0.02375 x 100");
  near(round(A.pctDiffMean(0.0245, 0.0230), 1), 6.3, 1e-9, "prints 6.3 %");
  near(A.pctDiffMean(0.0245, 0.0245), 0, 1e-12, "equal routes, zero difference");
  assert.ok(Number.isNaN(A.pctDiffMean(NaN, 1)), "an uncomputed route is not a difference");
});

test("density back-out identifies the metal from Table I", () => {
  near(A.densityBackGcm3(22.3, 2.5), 8.92, 1e-12, "22.3 / 2.5");
  assert.equal(A.identify(8.92), "Cu", "copper line");
  assert.equal(A.identify(7.31), "Sn", "within 0.05 of tin");
  assert.equal(A.identify(7.10), "Zn", "zinc line");
  assert.equal(A.identify(3.0), null, "far from every Table I line");
  assert.ok(Number.isNaN(A.densityBackGcm3(22.3, 0)), "zero volume is not a density");
});

test("the coarse cylinder: both routes honestly disagree by double digits", () => {
  // course mode: pour to 25 mL, object 2.5 mL -> level 27.5 -> reads 28
  const vWater = 25, vol = A.OBJECTS.Cu;
  const read = A.readMl(vWater + vol);
  assert.equal(read, 28, "half a millilitre rounds up on the coarse scale");
  const vO = read - vWater;
  const fbVol = A.buoyantFromMl(vO);
  const fbWt = A.buoyantFromWeightN(A.massG("Cu", vol), A.apparentMassG(A.massG("Cu", vol), vol));
  near(fbVol, 0.0294, 1e-12, "the volume route from the coarse read");
  near(fbWt, 0.0245, 1e-12, "the weight route stays exact");
  const p = A.pctDiffMean(fbVol, fbWt);
  assert.ok(p >= 10 && p <= 30,
    "a double-digit gap is the honest bench result (got " + p.toFixed(1) + " %)");
});

// ---- Check-tab payloads re-derived from the module ---------------------------

const LAB_DIR = path.join(__dirname, "..", "site", "phy110", "labs", "07-archimedes");

test("index.html check payloads: all parse, and graded answers match the module", () => {
  const html = fs.readFileSync(path.join(LAB_DIR, "index.html"), "utf8");
  const payloads = [];
  const re = /data-ex='([\s\S]*?)'/g;
  let m;
  while ((m = re.exec(html))) payloads.push(JSON.parse(m[1]));
  assert.ok(payloads.length >= 7, "expected 7+ exercises, found " + payloads.length);

  const byQ = (re2) => payloads.find((p) => re2.test(p.q));

  const ex1 = byQ(/displaces 2\.5 mL/);
  assert.ok(ex1 && ex1.type === "numbers", "exercise 1: the accepted F_b");
  assert.equal(ex1.parts[0].value, round(A.buoyantFromMl(2.5), 4), "F_b re-derived");

  const ex2 = byQ(/copper cylinder weighs 22\.3/);
  assert.ok(ex2 && ex2.type === "numbers", "exercise 2: the copper weight-route check");
  assert.equal(ex2.parts[0].value, round(A.weightN(22.3), 3), "F_g re-derived");
  assert.equal(ex2.parts[1].value, round(A.weightN(A.apparentMassG(22.3, 2.5)), 3),
    "F_g apparent re-derived");
  assert.equal(ex2.parts[2].value, round(A.buoyantFromWeightN(22.3, A.apparentMassG(22.3, 2.5)), 4),
    "the difference re-derived");

  const ex3 = byQ(/tin and zinc/);
  assert.ok(ex3 && ex3.type === "numbers", "exercise 3: tin and zinc masses");
  assert.equal(ex3.parts[0].value, A.massG("Sn", 2.5), "tin re-derived");
  assert.equal(ex3.parts[1].value, A.massG("Zn", 2.5), "zinc re-derived");

  const ex4 = byQ(/each displaces 2\.5 mL\. The buoyant force/);
  assert.ok(ex4 && ex4.type === "choice", "exercise 4: same F_b for all three");
  assert.match(ex4.options[ex4.correct], /same for all/i, "the correct option says same for all");

  const ex5 = byQ(/density does that give/);
  assert.ok(ex5 && ex5.type === "numbers", "exercise 5: density back-out");
  assert.equal(ex5.parts[0].value, round(A.densityBackGcm3(22.3, 2.5), 2), "density re-derived");
  assert.equal(A.identify(ex5.parts[0].value), "Cu", "and it points at copper");

  const ex6 = byQ(/percent difference/);
  assert.ok(ex6 && ex6.type === "numbers", "exercise 6: the mean-based percent");
  assert.equal(ex6.parts[0].value, round(A.pctDiffMean(0.0245, 0.0230), 1), "percent re-derived");

  const ex7 = byQ(/unit gap/);
  assert.ok(ex7 && ex7.type === "numbers", "exercise 7: the unit line");
  near(ex7.parts[0].value, A.mLtoM3(2.5), 1e-15, "m^3 re-derived");

  const ex8 = byQ(/true mass is unchanged/);
  assert.ok(ex8 && ex8.type === "keywords", "exercise 8: why apparent weight drops");
  assert.ok(ex8.words.length >= 5 && ex8.need >= 2, "the keyword set is real");

  for (const p of payloads) {
    assert.ok(Array.isArray(p.hints) && p.hints.length >= 1, p.q.slice(0, 30) + " needs hints");
    assert.ok(p.working && p.answer, p.q.slice(0, 30) + " needs working+answer");
  }
});

// ---- purity ------------------------------------------------------------------

test("archimedes.js is pure: no wall clock, no DOM", () => {
  const src = fs.readFileSync(MOD, "utf8");
  assert.doesNotMatch(src, /Date\.now|new Date|performance\.now/, "no clock reads");
  assert.doesNotMatch(src, /\bdocument\b|querySelector/, "no DOM access");
});
