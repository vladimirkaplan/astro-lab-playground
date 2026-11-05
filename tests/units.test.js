"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

require("../site/shared/units.js");
const U = globalThis.LS.units;

test("percentError is magnitude-based and unitless", () => {
  assert.ok(Math.abs(U.percentError(2.5, 2.0) - 25) < 1e-9);
  assert.ok(Math.abs(U.percentError(1.5, 2.0) - 25) < 1e-9);
  assert.ok(Number.isNaN(U.percentError(5, 0)));
});

test("near uses percent tolerance", () => {
  assert.ok(U.near(2.5417, 2.54, 1));
  assert.ok(!U.near(2.60, 2.54, 1));
  assert.ok(U.near(0.06, 0.05, 25));
});

test("inchesToFeetInches splits the course-trick value", () => {
  const r = U.inchesToFeetInches(530);       // the 10x-table question
  assert.equal(r.ft, 44);
  assert.equal(r.inTotal, 530);
  assert.ok(Math.abs(r.in - 2) < 1e-9);
});

test("parseFeetInches reads the formats students type", () => {
  const a = U.parseFeetInches("44 ft 2 in");
  assert.equal(a.ft, 44);
  assert.equal(a.inTotal, 530);
  const b = U.parseFeetInches("530 in");
  assert.equal(b.ft, null);
  assert.equal(b.inTotal, 530);
});

test("coin specs match US Mint design weights", () => {
  assert.equal(U.COINS.penny.g, 2.5);
  assert.equal(U.COINS.nickel.g, 5);
  assert.ok(Math.abs(U.COINS.dime.g - 2.268) < 1e-9);
  assert.ok(Math.abs(U.COINS.quarter.g - 5.67) < 1e-9);
});

test("mulberry32 is deterministic and in [0,1)", () => {
  const a = U.mulberry32(42), b = U.mulberry32(42);
  for (let i = 0; i < 50; i++) {
    const x = a(), y = b();
    assert.equal(x, y);
    assert.ok(x >= 0 && x < 1);
  }
});

test("course vs true ounce: the manual's 28.57 g value is stored deliberately", () => {
  assert.equal(U.COURSE_G_PER_OZ, 28.57);
  assert.ok(Math.abs(U.TRUE_G_PER_OZ - 28.3495) < 1e-9);
  // the discrepancy the lab's own answer sheet should notice: 457.1 vs 453.6 g/lb
  assert.ok(Math.abs(U.COURSE_G_PER_OZ * 16 - 457.12) < 0.01);
});
