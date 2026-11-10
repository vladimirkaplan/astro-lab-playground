"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

require("../site/shared/units.js");
require("../site/ast110/labs/08-venus-phases/venus.js");
const V = globalThis.LS.venus;

const near = (x, target, tol) => Math.abs(x - target) < tol;

test("inferior conjunction: nearest, dark, and on the Sun", () => {
  // straight line Sun-Venus-Earth, so dist = 1 - A = 0.277 AU
  assert.ok(near(V.distEV(0), 0.277, 1e-12));
  assert.ok(near(V.distEV(360), 0.277, 1e-12));      // out-of-range input
  assert.ok(near(V.distEV(-720), 0.277, 1e-12));
  assert.ok(near(V.illum(0), 0, 1e-9));              // phase angle 180 -> new
  assert.ok(near(V.phaseAngle(0), 180, 1e-9));
  assert.ok(near(V.elongation(0), 0, 1e-9));
  assert.equal(V.name(0), "new");
  assert.equal(V.elongLabel(0), "");
  const p = V.pos(0);
  assert.ok(near(p.vx, 0.723, 1e-12) && near(p.vy, 0, 1e-12));
  assert.equal(p.ex, 1);
  assert.equal(p.ey, 0);
});

test("superior conjunction: farthest, full, and behind the Sun", () => {
  assert.ok(near(V.distEV(180), 1.723, 1e-12));      // 1 + A
  assert.ok(near(V.illum(180), 100, 1e-9));
  assert.ok(near(V.phaseAngle(180), 0, 1e-9));
  assert.ok(near(V.elongation(180), 0, 1e-9));
  assert.equal(V.name(180), "full");
});

test("greatest elongation is a right angle at Venus: 46.3 deg, half lit", () => {
  // tangent geometry: elongation maxes at acos(A) = 43.6973 deg, where
  // elong = asin(A) = 46.3027 deg and the phase angle is exactly 90 deg.
  assert.ok(near(V.elongation(43.7), 46.3, 0.6));
  assert.ok(near(V.illum(43.7), 50, 0.05));
  assert.ok(near(V.phaseAngle(43.7), 90, 0.05));
  assert.equal(V.name(43.7), "half (dichotomy)");
  assert.equal(V.elongLabel(43.7), "evening (east of the Sun)");
  // it really is the peak: both neighbours are smaller
  assert.ok(V.elongation(43.7) > V.elongation(43.6));
  assert.ok(V.elongation(43.7) > V.elongation(43.8));
  let max = 0;
  for (let th = 0; th <= 90; th += 0.1) max = Math.max(max, V.elongation(th));
  assert.ok(max < 47 && max > 46, "scan max " + max);
  assert.ok(near(V.MAX_ELONG_THEORY, Math.asin(V.A) * 180 / Math.PI, 0.05));
});

test("elongation is signed, antisymmetric, and never escapes 47 degrees", () => {
  // th = 90 puts Venus at (0, 0.723): the angle off the Earth->Sun line is
  // atan(0.723 / 1) = 35.867 deg.
  assert.ok(near(V.elongation(90), 35.8669, 1e-3));
  assert.ok(near(V.elongation(-90), -35.8669, 1e-3));
  assert.ok(near(V.elongation(300), -V.elongation(60), 1e-9));
  assert.equal(V.elongLabel(-43.7), "morning (west of the Sun)");
  let max = 0;
  for (let th = 0; th < 360; th += 0.1) max = Math.max(max, Math.abs(V.elongation(th)));
  assert.ok(max < 47, "max |elongation| " + max);
});

test("Venus looks 6.2x wider at inferior than at superior conjunction", () => {
  // 2*atan(r/d) is essentially 2r/d here, so the ratio is the distance ratio
  // 1.723 / 0.277 = 6.2202 (not 8x: the circular orbits keep it at ~6.2).
  assert.ok(near(V.apparentDiamArcsec(0), 60.248, 0.01));
  assert.ok(near(V.apparentDiamArcsec(180), 9.686, 0.01));
  const ratio = V.apparentDiamArcsec(0) / V.apparentDiamArcsec(180);
  assert.ok(ratio > 6 && ratio < 6.5, "ratio " + ratio);
  assert.ok(near(ratio, 6.2202, 0.001));
});

test("illumination is symmetric about the Earth-Sun line", () => {
  assert.ok(near(V.illum(300), V.illum(60), 0.05));
  assert.ok(near(V.illum(300), 62.4682, 1e-3));
  assert.ok(near(V.illum(330), V.illum(30), 1e-9));
  assert.ok(near(V.distEV(-45), V.distEV(45), 1e-12));
});

test("phase names follow the illumination bands", () => {
  assert.equal(V.name(90), "gibbous");     // illum 79.3: Venus is past dichotomy
  assert.equal(V.name(180), "full");
  assert.equal(V.name(30), "crescent");    // illum 36.2
  assert.equal(V.name(45), "half (dichotomy)");  // illum 51.1
  assert.ok(near(V.illum(90), 79.2952, 1e-3));
});

test("Ptolemy forbids gibbous Venus and any change of size", () => {
  for (let th = -360; th < 360; th += 0.5) {
    assert.ok(V.ptoLeansIllum(th) <= 50, "pto illum past half at " + th);
    assert.equal(V.ptoApparentDiamArcsec(th), V.apparentDiamArcsec(180));
  }
  assert.equal(V.ptoLeansIllum(0), 0);           // still new at inferior conj
  assert.equal(V.ptoLeansIllum(180), 50);        // capped at dichotomy, never full
  assert.equal(V.ptoLeansIllum(90), 50);
});

test("summary rounds to one decimal", () => {
  assert.deepEqual(V.summary(43.7), {
    elong: 46.3,
    illum: 50,
    diamArcsec: 24.2,
    name: "half (dichotomy)",
    elongLabel: "evening (east of the Sun)"
  });
  assert.deepEqual(V.summary(315), {
    elong: -46.3,
    illum: 51.1,
    diamArcsec: 23.6,
    name: "half (dichotomy)",
    elongLabel: "morning (west of the Sun)"
  });
});
