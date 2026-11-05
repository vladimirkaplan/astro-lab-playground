"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

require("../site/shared/units.js");
require("../site/labs/07-lenses/lenses.js");
const L = globalThis.LS.lenses;
const FAR = Infinity;

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + " vs " + b);

test("thin lens equation, the clean course numbers", () => {
  close(L.imageDist(20, 30), 60);              // 1/20 - 1/30 = 1/60
  close(L.imageDist(10, 20), 20);
  assert.equal(L.imageDist(20, FAR), 20);      // distant object lands at f
  assert.ok(!isFinite(L.imageDist(20, 20)));   // object on the focal point
});

test("virtual images come out negative and upright", () => {
  const di = L.imageDist(20, 10);              // object inside f: magnifier
  assert.equal(di, -20);
  close(L.magn(20, 10), 2);              // upright, twice as big
  close(L.magn(20, 30), -2);             // inverted pair for the real one
});

test("screen sharpness peaks on the true image plane", () => {
  assert.equal(L.sharpness(60, 60), 1);
  assert.ok(L.sharpness(63, 60) > 0.85);
  assert.ok(L.sharpness(90, 60) < 0.15);
});

test("two-lens afocal setup: exit beam parallel, no finite image", () => {
  // f1=20 with do=30 puts the real image at 60; lens 2 at sep=90 has the
  // intermediate image exactly on its front focal point (dO2 = 30 = f2).
  const s = L.system(20, 30, 90, 30);
  close(s.di1, 60);
  close(s.dO2, 30);
  assert.equal(s.afocal, true);
  assert.equal(s.finalReal, "parallel");
  assert.equal(s.m2, null);
});

test("two-lens finite system multiplies magnifications", () => {
  const s = L.system(20, 30, 90, 15);
  close(s.di2, 30);
  close(s.m1, -2);
  close(s.m2, -1);
  close(s.totalM, 2);
});

test("telescope helper and geometric ray angles agree on M and inversion", () => {
  const t = L.telescope(100, 10);
  assert.equal(t.M, 10);
  assert.equal(t.tube, 110);
  const g = L.rayAngles(100, 10, 1.5);
  assert.ok(g.exit < 0, "Keplerian exit beam must be inverted");
  const ratio = Math.tan(g.exit * Math.PI / 180) / Math.tan(1.5 * Math.PI / 180);
  assert.ok(Math.abs(ratio + 10) < 1e-9);      // tan b / tan a = -fO/fE
});
