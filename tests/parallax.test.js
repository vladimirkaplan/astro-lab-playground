"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

require("../site/labs/11-parallax/parallax.js");
const P = globalThis.LS.parallax;

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + " vs " + b);
const near = (a, b, tol) => assert.ok(Math.abs(a - b) < tol, a + " vs " + b);

test("catalog holds the eight nearest-star teaching cases", () => {
  assert.equal(P.CATALOG.length, 8);
  for (const s of P.CATALOG) {
    assert.equal(typeof s.name, "string");
    assert.ok(s.mas > 0, s.name + " needs a positive parallax");
    assert.equal(typeof s.vmag, "number");
    assert.equal(typeof s.sptype, "string");
    assert.ok(Math.abs(s.betaDeg) <= 90, s.name + " ecliptic latitude out of range");
  }
  const names = P.CATALOG.map((s) => s.name);
  for (const want of ["Proxima Centauri", "Barnard's Star", "Wolf 359",
    "Lalande 21185", "Sirius A", "Epsilon Eridani", "Ross 128", "Tau Ceti"]) {
    assert.ok(names.includes(want), "missing " + want);
  }
});

test("distancePc reproduces the textbook parsec distances", () => {
  near(P.distancePc(768.07), 1.302, 1e-3);    // Proxima ~1.30 pc
  near(P.distancePc(273.83), 3.652, 1e-3);    // Tau Ceti ~3.65 pc
  near(P.distancePc(374.49), 2.670, 1e-3);    // Sirius ~2.67 pc
  close(P.distancePc(1000), 1);               // 1 arcsec = 1 pc by definition
});

test("distancePc throws on non-positive or non-finite parallaxes", () => {
  assert.throws(() => P.distancePc(0), RangeError);
  assert.throws(() => P.distancePc(-415.18), RangeError);
  assert.throws(() => P.distancePc(NaN), RangeError);
  assert.throws(() => P.distancePc(Infinity), RangeError);
});

test("distanceLy converts with 1 pc = 3.26156 ly", () => {
  close(P.distanceLy(768.07), P.distancePc(768.07) * 3.26156);
  assert.equal(P.PC_TO_LY, 3.26156);
  near(P.distanceLy(768.07), 4.2465, 1e-3);   // Proxima ~4.25 ly
});

test("shiftMas: a 2 AU January-to-July baseline sweeps 2p", () => {
  for (const s of P.CATALOG) {
    close(P.shiftMas(s.mas, 2), 2 * s.mas);
    close(P.shiftMas(s.mas, 1), s.mas);
    close(P.shiftMas(s.mas, 0), 0);
  }
});

test("shiftMas rejects impossible inputs", () => {
  assert.throws(() => P.shiftMas(0, 2), RangeError);
  assert.throws(() => P.shiftMas(-374.49, 2), RangeError);
  assert.throws(() => P.shiftMas(374.49, -2), RangeError);
  assert.throws(() => P.shiftMas(374.49, NaN), RangeError);
});

test("wobble closes the loop after exactly one year", () => {
  for (const s of P.CATALOG) {
    const a = P.wobble(s.mas, s.betaDeg, 100);
    const b = P.wobble(s.mas, s.betaDeg, 100 + P.YEAR_DAYS);
    close(a.eastMas, b.eastMas);
    close(a.northMas, b.northMas);
  }
});

test("wobble traces the ellipse with semi-axes p and p*sin(beta)", () => {
  const p = 374.49, beta = -40;               // Sirius
  const sb = Math.sin(beta * Math.PI / 180);
  for (let day = 1; day <= 365; day += 7) {
    const w = P.wobble(p, beta, day);
    const u = w.eastMas / p, v = w.northMas / (p * sb);
    close(u * u + v * v, 1);                  // exact ellipse identity
  }
});

test("wobble axis ratio equals |sin(beta)| and the phase matches the equinox", () => {
  const p = 546.98, beta = 47;                // Barnard's Star
  const eq = P.wobble(p, beta, P.EQUINOX_DAY);
  close(eq.eastMas, 0);                       // equinox: extreme of the minor axis
  assert.ok(eq.northMas > 0, "north positive for positive beta at equinox");
  const qtr = P.wobble(p, beta, P.EQUINOX_DAY + P.YEAR_DAYS / 4);
  near(Math.abs(qtr.eastMas), p, 1e-9);       // quarter year later: extreme of p
  near(Math.abs(eq.northMas) / Math.abs(qtr.eastMas),
    Math.abs(Math.sin(beta * Math.PI / 180)), 1e-9);
});

test("a star on the ecliptic wobbles along a straight line", () => {
  for (let day = 1; day <= 365; day += 11) {
    near(P.wobble(415.18, 0, day).northMas, 0, 1e-12);
  }
  near(Math.abs(P.wobble(415.18, 0, P.EQUINOX_DAY + P.YEAR_DAYS / 4).eastMas),
    415.18, 1e-9);
});

test("ladderOrder sorts nearest-first with computed distances", () => {
  const rungs = P.ladderOrder();
  assert.equal(rungs.length, 8);
  assert.equal(rungs[0].name, "Proxima Centauri");
  assert.equal(rungs[rungs.length - 1].name, "Tau Ceti");
  for (let i = 1; i < rungs.length; i++) {
    assert.ok(rungs[i].pc >= rungs[i - 1].pc, "must be sorted nearest-first");
    close(rungs[i].pc, P.distancePc(rungs[i].mas));
    close(rungs[i].ly, rungs[i].pc * P.PC_TO_LY);
  }
  rungs[0].mas = -1;                          // caller must not alias the catalog
  assert.ok(P.ladderOrder()[0].mas > 0);
});
