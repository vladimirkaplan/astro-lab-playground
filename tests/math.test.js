"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

require("../site/shared/units.js");
require("../site/ast110/labs/02-math/mathlab.js");
const M = globalThis.LS.mathlab;
const U = globalThis.LS.units;

const near = (x, target, tol) => Math.abs(x - target) < tol;

test("circle bench: pi is a ratio, so any shared unit works", () => {
  assert.ok(near(M.piMeasured(94.2, 30), 3.14, 1e-9));
  assert.ok(near(M.piMeasured(9.42, 3), 3.14, 1e-9));       // same ratio, cm->?
  assert.ok(near(M.piMeasured(88, 28), 88 / 28, 1e-12));    // nothing is rounded
  assert.ok(Number.isNaN(M.piMeasured(10, 0)));
  // a sloppy measurement lands near 3.14 and the course error stays small
  const err = U.percentError(M.piMeasured(94.2, 30), Math.PI);
  assert.ok(err < 0.1);
});

test("small-angle: the Moon reads 31 arcmin on the course numbers", () => {
  const moon = M.OBJECTS.moon;
  assert.ok(near(M.angArcsec(moon.dKm, moon.Dkm), 1863, 2));
  assert.ok(near(M.angArcmin(moon.dKm, moon.Dkm), 31.05, 0.1));
  assert.ok(near(M.angDeg(moon.dKm, moon.Dkm), 0.5176, 0.002));
});

test("small-angle trio inverts: angular -> distance round-trips", () => {
  const d = M.distFromAng(M.OBJECTS.moon.dKm, M.angArcsec(
    M.OBJECTS.moon.dKm, M.OBJECTS.moon.Dkm));
  assert.ok(U.percentError(d, M.OBJECTS.moon.Dkm) < 1e-9);
  assert.ok(near(M.linearFromAng(1863.5, 384400), 3472.9, 1.5));
  assert.ok(Number.isNaN(M.distFromAng(3475, 0)));
});

test("coin at arm's length: a fat thumb, and the Moon still dwarfs it", () => {
  // matched units: coin diameter and arm's length both in millimeters
  const q = M.COINS.quarter.mm;
  const arm = M.ARM_LENGTH_M * 1000;
  assert.ok(near(M.angArcmin(q, arm), 111.2, 0.3));
  assert.ok(near(M.angDeg(q, arm), 1.85, 0.02));
  const moon = M.OBJECTS.moon;
  const ratio = M.angArcsec(q, arm) / M.angArcsec(moon.dKm, moon.Dkm);
  assert.ok(near(ratio, 3.6, 0.2));   // ~3.6 quarter-widths span the Moon
});

test("small-angle formula agrees with exact trig well inside reading error", () => {
  const moon = M.OBJECTS.moon, sun = M.OBJECTS.sun;
  assert.ok(U.percentError(M.angDeg(moon.dKm, moon.Dkm),
    M.exactAngDeg(moon.dKm, moon.Dkm)) < 0.01);
  assert.ok(U.percentError(M.angDeg(sun.dKm, sun.Dkm),
    M.exactAngDeg(sun.dKm, sun.Dkm)) < 0.02);
  // Jupiter at opposition is still tiny: the approximation cannot bite here.
  const jup = M.OBJECTS.jupiter;
  assert.ok(M.angArcsec(jup.dKm, jup.Dkm - 1) < 60);
});

test("the eclipse coincidence: Sun ~400x wider AND ~400x farther", () => {
  const rs = M.sunMoonSizeRatio(), rd = M.sunMoonDistRatio();
  assert.ok(near(rs, 400, 5));
  assert.ok(near(rd, 390, 10));
  // within 4 percent of each other, which is why the disks nearly match
  assert.ok(Math.abs(rs - rd) / rd * 100 < 4);
  assert.ok(U.percentError(M.angArcsec(M.OBJECTS.sun.dKm, M.OBJECTS.sun.Dkm),
    M.angArcsec(moonAgain(), moonAgainDist())) < 4);
  function moonAgain() { return M.OBJECTS.moon.dKm; }
  function moonAgainDist() { return M.OBJECTS.moon.Dkm; }
});

test("scientific notation splits, formats, and parses every honest spelling", () => {
  const p = M.sciParts(384400);
  assert.equal(p.exp, 5);
  assert.ok(near(p.coef, 3.844, 1e-9));
  assert.ok(near(M.sciParts(0.00025).coef, 2.5, 1e-9));
  assert.equal(M.sciParts(0.00025).exp, -4);
  assert.equal(M.sciFormat(1.496e8, 3), "1.496 x 10^8");

  const forms = ["1.5e8", "1.5x10^8", "1.5*10^8", "150,000,000", "1.5 x 10 ^ 8"];
  forms.forEach(f => assert.ok(near(M.parseSci(f), 1.5e8, 1e3), f));
  assert.ok(near(M.parseSci("3.844 x 10^5"), 384400, 1e-6));
  assert.ok(near(M.parseSci("2.5e-4"), 0.00025, 1e-12));
  assert.ok(near(M.parseSci("x10^3"), 1000, 1e-9));
  assert.ok(Number.isNaN(M.parseSci("lots")));
  assert.ok(Number.isNaN(M.parseSci("")));
  // parse(round-trip) recovers the value the sim displays
  assert.ok(near(M.parseSci(M.sciFormat(3475, 3)), 3475, 1));
});
