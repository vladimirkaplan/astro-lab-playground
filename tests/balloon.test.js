"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

require("../site/shared/units.js");
require("../site/shared/fit.js");
require("./../site/ast110/labs/15-hubbles-law/balloon.js");
const B = globalThis.LS.balloon;
const F = globalThis.LS.fit;
const U = globalThis.LS.units;

test("layout is deterministic and labels stay readable", () => {
  const a = B.makeLayout(42), b = B.makeLayout(42);
  assert.deepEqual(a, b);
  assert.equal(a.length, 9);
  assert.ok(a[0] >= 10);
  for (let i = 1; i < a.length; i++) {
    assert.ok(a[i] - a[i - 1] >= 6.5, "dots too close: " + a[i - 1] + "," + a[i]);
  }
});

test("arc distances scale linearly with inflation", () => {
  const ang = B.makeLayout(1);
  const d1 = B.arcDistances(37.7, ang);
  const d2 = B.arcDistances(37.7 * 2, ang);
  d1.forEach((v, i) => assert.ok(Math.abs(d2[i] - 2 * v) < 1e-9));
});

test("a noiseless run reproduces the model Hubble slope exactly", () => {
  const a = 2, t = 10;
  const ang = B.makeLayout(42);
  const C1 = 2 * Math.PI * 6, rnd = () => 0.5;
  const noop = U.mulberry32(1);
  const d1 = B.measureAll(B.arcDistances(C1, ang), 0, noop);
  const d2 = B.measureAll(B.arcDistances(C1 * a, ang), 0, noop);
  const v = B.velocities(d1, d2, t);
  const f = F.throughOrigin(d2, v);
  assert.ok(Math.abs(f.slope - B.hubbleFromInflation(a, t)) < 1e-4, // readings round to 0.01 cm like a real ruler
    f.slope + " vs " + B.hubbleFromInflation(a, t));
  assert.equal(B.ageFromInflation(a, t), a * t / (a - 1));
});

test("noise stays within a teaching band", () => {
  const ang = B.makeLayout(7);
  const truth = B.arcDistances(37.7, ang);
  const noisy = B.measureAll(truth, 0.18, U.mulberry32(5));
  noisy.forEach((v, i) => {
    assert.ok(Math.abs(v - truth[i]) < 1.0, "spread: " + v + " " + truth[i]);
  });
});

test("cosmic sample follows the model H0 in the mean", () => {
  const s = B.cosmicSample(70, 150, 99);
  assert.equal(s.length, 10);
  const f = F.throughOrigin(s.map(g => g.distanceMpc), s.map(g => g.velocityKmS));
  assert.ok(Math.abs(f.slope - 70) < 15, "fit gave " + f.slope);
  const zero = B.cosmicSample(70, 0, 1);
  const f0 = F.throughOrigin(zero.map(g => g.distanceMpc), zero.map(g => g.velocityKmS));
  assert.ok(Math.abs(f0.slope - 70) < 1e-9);
});
