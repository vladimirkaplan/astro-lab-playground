"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

require("../site/shared/units.js");
require("../site/shared/fit.js");
const F = globalThis.LS.fit;

test("throughOrigin recovers an exact proportionality", () => {
  const xs = [1, 2, 3, 4];
  const ys = xs.map(x => 0.05 * x);
  const f = F.throughOrigin(xs, ys);
  assert.ok(Math.abs(f.slope - 0.05) < 1e-12);
  assert.equal(f.intercept, 0);
});

test("throughOrigin is the normal-equations minimum for y=bx", () => {
  // LS slope = sum(xy)/sum(x^2) => verify by hand on a small noisy set
  const xs = [1, 2, 4], ys = [1.1, 1.8, 4.5];
  const expected = (1 * 1.1 + 2 * 1.8 + 4 * 4.5) / (1 + 4 + 16);
  const f = F.throughOrigin(xs, ys);
  assert.ok(Math.abs(f.slope - expected) < 1e-12);
});

test("linearLeastSquares fits slope and intercept", () => {
  const xs = [0, 1, 2, 3];
  const ys = [2, 4, 6, 8];
  const f = F.linearLeastSquares(xs, ys);
  assert.ok(Math.abs(f.slope - 2) < 1e-12);
  assert.ok(Math.abs(f.intercept - 2) < 1e-12);
});

test("hubbleAgeGyr: H0=70 gives about 14.0 Gyr", () => {
  const t = F.hubbleAgeGyr(70);
  assert.ok(t > 13.9 && t < 14.05, "got " + t);
  // conversion sanity: 1 Mpc / 70 (km/s) in years, computed independently here
  const yr = 3.0857e19 / 70 / 3.15576e7 / 1e9;
  assert.ok(Math.abs(t - yr) / yr < 0.002);
});

test("degenerate input returns null instead of dividing by zero", () => {
  assert.equal(F.throughOrigin([0, 0], [1, 2]), null);
  assert.equal(F.linearLeastSquares([1], [1]), null);
});

test("scatterPercent grows with added noise", () => {
  const xs = [10, 20, 30, 40, 50];
  const clean = xs.map(x => 70 * x);
  const noisy = [720, 1330, 2150, 2600, 3600];
  assert.ok(F.scatterPercent(xs, clean, 70) < 1e-9);
  assert.ok(F.scatterPercent(xs, noisy, 70) > 2);
});
