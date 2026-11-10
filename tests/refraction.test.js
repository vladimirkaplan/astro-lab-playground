"use strict";
// PHY110 Lab 12 maths module (site/phy110/labs/12-reflection-refraction/refraction.js).
//
// theta_i = theta_r (reflection); n1 sin theta_1 = n2 sin theta_2 (Snell);
// critical water to air: n = 1/sin(theta_c). Printed: c = 3.0e8, water 1.333
// at 589 nm, air 1.000, reflection set 45-80 in 5, refraction set 10-80 in 10.
// Not printed (drawer): red 650 nm laser; the manual keeps the single index.
// Honesty: +-1 degree scale noise (beam width), gradual TIR dimming, tilted
// surface and off-centre laser as selectable error modes.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOD = path.join(__dirname, "..", "site", "phy110", "labs",
  "12-reflection-refraction", "refraction.js");
require(MOD);
const O = globalThis.LS.refraction;

const near = (x, y, tol, msg) => assert.ok(Math.abs(x - y) <= tol,
  msg + ": got " + x + ", want " + y + " +/-" + tol);
const round = (x, d) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d);

test("course settings are the printed ones", () => {
  assert.equal(O.C, 3.0e8, "c, printed");
  assert.equal(O.N_WATER, 1.333, "water index at 589 nm, printed Table III");
  assert.equal(O.N_AIR, 1.000, "air index, printed");
  assert.equal(O.LASER_NM, 650, "red laser, not printed");
  assert.deepEqual(O.REFLECTION_SET, [45, 50, 55, 60, 65, 70, 75, 80],
    "the printed reflection set");
  assert.deepEqual(O.REFRACTION_SET, [10, 20, 30, 40, 50, 60, 70, 80],
    "the printed refraction set");
  assert.equal(O.SCALE_NOISE_DEG, 1, "the beam-width reading honesty");
  assert.equal(O.TILT_DEG, 2, "the levelling-screw error mode");
  assert.equal(O.OFFCENTER_DEG, 1.5, "the off-centre laser error mode");
  assert.ok(Object.isFrozen(O.REFLECTION_SET) && Object.isFrozen(O.REFRACTION_SET),
    "the printed sets are frozen");
});

test("the law of reflection", () => {
  for (const t of [0, 10, 45, 60, 80, 89]) {
    assert.equal(O.reflect(t), t, "theta_r = theta_i at " + t);
  }
});

test("Snell air to water: the spec angles", () => {
  near(O.refractDeg(O.N_AIR, 30, O.N_WATER), 22.0, 0.05, "30 deg in, 22.0 out");
  near(O.refractDeg(O.N_AIR, 60, O.N_WATER), 40.5, 0.05, "60 deg in, 40.5 out");
  for (const t of O.REFRACTION_SET) {
    const t2 = O.refractDeg(O.N_AIR, t, O.N_WATER);
    assert.ok(t2 < t, t + " deg: into the dense medium the ray bends toward the normal");
  }
  assert.ok(Number.isNaN(O.refractDeg(O.N_WATER, 80, O.N_AIR)),
    "80 deg water to air is not a refraction");
});

test("the critical angle and total internal reflection", () => {
  const tc = O.criticalDeg(O.N_WATER, O.N_AIR);
  near(tc, 48.6, 0.05, "the spec's 48.6 degrees");
  assert.equal(O.isTIR(O.N_WATER, tc - 1, O.N_AIR), false, "just under: it refracts");
  assert.equal(O.isTIR(O.N_WATER, tc + 1, O.N_AIR), true, "just over: TIR");
  assert.equal(O.isTIR(O.N_AIR, 89, O.N_WATER), false, "air to water never TIRs");
  assert.ok(O.refractDeg(O.N_WATER, tc - 0.1, O.N_AIR) > 85,
    "near critical the ray hugs the surface");
});

test("the index from a measured critical angle", () => {
  near(O.indexFromCritical(49.0), 1.325, 0.0005, "the spec's 49.0 -> 1.325");
  near(O.indexFromCritical(O.criticalDeg(O.N_WATER, O.N_AIR)), 1.333, 1e-9,
    "the true critical angle round-trips the printed index");
  assert.ok(O.indexFromCritical(30) > O.indexFromCritical(60),
    "the smaller the angle, the bigger the index");
});

test("the gradual TIR dimming", () => {
  const tc = O.criticalDeg(O.N_WATER, O.N_AIR);
  near(O.tirDim(tc - 2, tc), 1, 1e-12, "well under: full strength");
  near(O.tirDim(tc, tc), 0.5, 1e-12, "at the critical angle: half");
  near(O.tirDim(tc + 2, tc), 0, 1e-12, "well over: gone");
  assert.ok(O.tirDim(tc + 0.5, tc) < 0.5, "it dims across, not switches off");
});

test("boundary bookkeeping: speed, wavelength, frequency", () => {
  near(O.speedIn(O.N_WATER), 3.0e8 / 1.333, 1e-6, "light slows to c/n in the water");
  near(O.lambdaIn(650e-9, O.N_AIR, O.N_WATER), 650e-9 / 1.333, 1e-15,
    "the wavelength shortens by 1/n");
  near(O.lambdaIn(650e-9, O.N_WATER, O.N_AIR), 650e-9 * 1.333, 1e-15,
    "and stretches back out");
});

test("the theta_r-against-theta_i fit has slope 1.0", () => {
  const pts = O.REFLECTION_SET.map((t) => ({ x: t, y: O.reflect(t) }));
  const f = O.fitLine(pts);
  near(f.m, 1.0, 1e-9, "slope 1.0 within the stated tolerance");
  near(f.b, 0, 1e-9, "intercept 0");
  assert.equal(O.fitLine([{ x: 1, y: 1 }]), null, "one point is not a line");
});

test("percent error of a measured index against the printed one", () => {
  near(round(O.pctError(1.325, 1.333), 1), 0.6, 1e-9, "1.325 against 1.333");
  assert.ok(Number.isNaN(O.pctError(1, 0)), "zero accepted is not a question");
});

// ---- Check-tab payloads re-derived from the module ---------------------------

const LAB_DIR = path.join(__dirname, "..", "site", "phy110", "labs", "12-reflection-refraction");

test("index.html check payloads: all parse, and graded answers match the module", () => {
  const html = fs.readFileSync(path.join(LAB_DIR, "index.html"), "utf8");
  const payloads = [];
  const re = /data-ex='([\s\S]*?)'/g;
  let m;
  while ((m = re.exec(html))) payloads.push(JSON.parse(m[1]));
  assert.ok(payloads.length >= 7, "expected 7+ exercises, found " + payloads.length);

  const byQ = (re2) => payloads.find((p) => re2.test(p.q));

  const ex1 = byQ(/strikes at 60 degrees/);
  assert.ok(ex1 && ex1.type === "numbers", "exercise 1: the reflection angle");
  assert.equal(ex1.parts[0].value, round(O.reflect(60), 6), "60 re-derived");

  const ex2 = byQ(/Air to water at 30 degrees/);
  assert.ok(ex2 && ex2.type === "numbers", "exercise 2: 30 into water");
  const r30 = O.refractDeg(O.N_AIR, 30, O.N_WATER);
  assert.ok(Math.abs(ex2.parts[0].value - r30) <= 0.5, "22.0 within the stated tolerance");
  assert.equal(ex2.parts[0].value, round(r30, 1), "and it prints 22.0");

  const ex3 = byQ(/Air to water at 60 degrees/);
  assert.ok(ex3 && ex3.type === "numbers", "exercise 3: 60 into water");
  const r60 = O.refractDeg(O.N_AIR, 60, O.N_WATER);
  assert.ok(Math.abs(ex3.parts[0].value - r60) <= 0.5, "40.5 within the stated tolerance");
  assert.equal(ex3.parts[0].value, round(r60, 1), "and it prints 40.5");

  const ex4 = byQ(/What is the critical angle/);
  assert.ok(ex4 && ex4.type === "numbers", "exercise 4: the critical angle");
  const tc = O.criticalDeg(O.N_WATER, O.N_AIR);
  assert.ok(Math.abs(ex4.parts[0].value - tc) <= 0.5, "48.6 within the stated tolerance");
  assert.equal(ex4.parts[0].value, round(tc, 1), "and it prints 48.6");

  const ex5 = byQ(/dying at 49\.0 degrees/);
  assert.ok(ex5 && ex5.type === "numbers", "exercise 5: the index from 49.0");
  assert.ok(Math.abs(ex5.parts[0].value - O.indexFromCritical(49.0)) <= 0.01,
    "1.325 within the stated tolerance");
  assert.equal(ex5.parts[0].value, round(O.indexFromCritical(49.0), 3),
    "and it prints 1.325");

  const ex6 = byQ(/What slope should the line have/);
  assert.ok(ex6 && ex6.type === "numbers", "exercise 6: the fit slope");
  const f = O.fitLine(O.REFLECTION_SET.map((t) => ({ x: t, y: O.reflect(t) })));
  assert.ok(Math.abs(ex6.parts[0].value - f.m) <= 0.02, "1.0 within the stated tolerance");

  const ex7 = byQ(/total internal reflection has started/);
  assert.ok(ex7 && ex7.type === "choice", "exercise 7: where the light goes");
  assert.match(ex7.options[ex7.correct], /reflects back into the water/i,
    "the correct option keeps the light in the dense medium");
  assert.equal(O.isTIR(O.N_WATER, 60, O.N_AIR), true,
    "and the module agrees 60 deg water-to-air is TIR");

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
    "../../../shared/worksheet.js", "./refraction.js", "./worksheet.js", "./sim.js"];
  let last = -1;
  for (const s of order) {
    const i = html.indexOf('<script src="' + s + '"></script>');
    assert.ok(i > last, s + " loads after the previous script");
    last = i;
  }
  const sim = fs.readFileSync(path.join(LAB_DIR, "sim.js"), "utf8");
  assert.match(sim, /var LAB = "12-reflection-refraction";/, "LAB equals the folder name");
  assert.match(sim, /LS\.ui\.banner\(document\.querySelector\("main"\)\)/, "the banner mounts");
  assert.match(sim, /LS\.ui\.initTabs\(\)/, "tabs init");
  assert.match(sim, /LS\.ui\.modeToggle\(LAB/, "mode toggle on the lab key");
  assert.match(sim, /LS\.check\.init\(LAB\)/, "check init");
  const ws = fs.readFileSync(path.join(LAB_DIR, "worksheet.js"), "utf8");
  assert.match(ws, /slug: "12-reflection-refraction"/, "the worksheet slug equals the folder");
});

// ---- purity ------------------------------------------------------------------

test("refraction.js is pure: no wall clock, no DOM", () => {
  const src = fs.readFileSync(MOD, "utf8");
  assert.doesNotMatch(src, /Date\.now|new Date|performance\.now/, "no clock reads");
  assert.doesNotMatch(src, /\bdocument\b|querySelector/, "no DOM access");
});
