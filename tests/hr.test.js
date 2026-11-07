"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

require("../site/shared/units.js");
require("../site/labs/hr-diagram/hr.js");
const H = globalThis.LS.hr;

const near = (x, target, tol) => Math.abs(x - target) < tol;

test("Stefan-Boltzmann: the Sun is the unit, and the law is a law", () => {
  assert.ok(near(H.lumFromTR(1, 5772), 1, 1e-9));
  assert.ok(near(H.radiusFromTL(1, 5772), 1, 1e-12));
  // L goes as R^2 at fixed temperature ...
  assert.ok(near(H.lumFromTR(2, 5772) / H.lumFromTR(1, 5772), 4, 1e-9));
  // ... and as T^4 at fixed radius
  assert.ok(near(H.lumFromTR(1, 2 * 5772) / H.lumFromTR(1, 5772), 16, 1e-9));
});

test("radiusFromTL inverts lumFromTR for every shipped star", () => {
  for (const s of H.STARS) {
    const r = H.radiusFromTL(s.lum, s.teff);
    assert.ok(near(H.lumFromTR(r, s.teff), s.lum, s.lum * 1e-9), s.name);
  }
  assert.ok(Number.isNaN(H.radiusFromTL(0, 5000)));
  assert.ok(Number.isNaN(H.radiusFromTL(-1, 5000)));
});

test("derived radii land in a believable band for their region", () => {
  const BAND = {
    "main sequence": [0.08, 8.5],
    "giant": [8, 90],
    "supergiant": [60, 1500],
    "white dwarf": [0.005, 0.02]
  };
  for (const s of H.STARS) {
    const r = H.radiusFromTL(s.lum, s.teff);
    const [lo, hi] = BAND[s.region];
    assert.ok(r >= lo && r <= hi, s.name + " R=" + r + " region=" + s.region);
  }
  // three anchors the course quotes: Rigel ~79 solar radii, Betelgeuse ~930,
  // Sirius B ~5,900 km (about one Earth radius on a solar scale).
  assert.ok(near(H.radiusFromTL(120000, 12100), 78.8, 0.6));
  assert.ok(near(H.radiusFromTL(130000, 3600), 926.9, 6));
  const km = H.radiusFromTL(0.026, 25200) * H.R_SUN_KM;
  assert.ok(km > 5200 && km < 6400, "Sirius B radius " + km + " km");
  assert.ok(near(H.radiusAU(H.radiusFromTL(130000, 3600)), 4.31, 0.05));
});

test("classify agrees with the region label on all 29 stars", () => {
  assert.equal(H.STARS.length, 29);
  const counts = {};
  for (const s of H.STARS) {
    const got = H.classify(s.teff, s.lum);
    assert.equal(got, s.region, s.name + ": classify said " + got + ", data says " + s.region);
    counts[s.region] = (counts[s.region] || 0) + 1;
  }
  assert.ok(counts["main sequence"] >= 12, "MS count " + counts["main sequence"]);
  assert.equal(counts["giant"], 5);
  assert.equal(counts["supergiant"], 6);
  assert.equal(counts["white dwarf"], 3);
});

test("classify reads the corners of the diagram, not just the shipped stars", () => {
  assert.equal(H.classify(10000, 0.01), "white dwarf");      // hot and dim
  assert.equal(H.classify(10000, 40), "main sequence");      // hot and moderate
  assert.equal(H.classify(3500, 1e6), "supergiant");         // cool and enormous
  assert.equal(H.classify(5772, 0.05), "below the main sequence");
  assert.equal(H.classify(5772, 100), "giant");              // same colour, 100x the Sun
  assert.equal(H.classify(-100, 10), "unknown");
  assert.equal(H.classify(5772, 0), "unknown");
});

test("spectral class follows the printed temperature boundaries", () => {
  const cases = [
    [33000, "O"], [30000, "O"], [29999, "B"], [12460, "B"], [10000, "B"], [9999, "A"],
    [7500, "A"], [7499, "F"], [6000, "F"], [5999, "G"], [5200, "G"], [5199, "K"],
    [3700, "K"], [3699, "M"], [2800, "M"]
  ];
  for (const [t, want] of cases) assert.equal(H.spectralClass(t), want, String(t));
  const named = {
    Sun: "G", Vega: "A", Rigel: "B", Betelgeuse: "M", Arcturus: "K",
    Procyon: "F", "Barnard's Star": "M", Deneb: "A", "Sirius B": "B"
  };
  for (const name of Object.keys(named)) {
    const s = H.findByName(name);
    assert.equal(H.spectralClass(s.teff), named[name], name);
  }
});

test("colour swatches: hot stars blue, cool stars red, the Sun warm white", () => {
  const hot = H.colorFromT(30000), cool = H.colorFromT(3000), sun = H.colorFromT(5772);
  assert.ok(hot[2] - hot[0] > 50, "hot: " + hot);
  assert.ok(cool[0] - cool[2] > 100, "cool: " + cool);
  assert.ok(sun[0] > 240 && sun[2] > 180, "sun: " + sun);
  assert.equal(H.rgb(sun), "rgb(255,241,214)");
  // clamped outside the swatch table instead of throwing
  assert.deepEqual(H.colorFromT(100000), [157, 180, 255]);
});

test("the main-sequence ridge rises with temperature and clamps at the ends", () => {
  assert.ok(near(H.ridgeLogL(5770), 0, 1e-12));
  assert.ok(near(H.ridgeLogL(2500), -2.6, 1e-12));   // below the table
  assert.ok(near(H.ridgeLogL(40000), 4.48, 1e-12));  // above the table
  for (let t = 2500; t <= 35000; t += 100) {
    assert.ok(H.ridgeLogL(t + 50) >= H.ridgeLogL(t) - 1e-12, "ridge fell at " + t);
  }
  // a giant sits about three decades above a dwarf of the same colour
  assert.ok(near(H.aboveMS(108, 4290), 2.94, 0.25));
  assert.ok(near(H.aboveMS(1, 5770), 0, 1e-12));
  assert.ok(H.aboveMS(43, 4590) > 2 && H.aboveMS(43, 4590) < 3);
  assert.ok(H.aboveMS(130000, 3600) > 6);
});

test("summary rounds for display and keeps the region word", () => {
  assert.deepEqual(H.summary(3600, 130000), {
    teff: 3600, lum: 130000, lumText: "1.3e5", radius: 927, radiusAU: 4.31,
    spectral: "M", region: "supergiant", aboveMS: 6.6
  });
  assert.deepEqual(H.summary(5772, 1), {
    teff: 5770, lum: 1, lumText: "1", radius: 1, radiusAU: 0,
    spectral: "G", region: "main sequence", aboveMS: 0
  });
  const b = H.summary(25200, 0.026);
  assert.equal(b.radius, 0.01);
  assert.equal(b.region, "white dwarf");
});

test("findByName is forgiving, and the catalog stays honest", () => {
  assert.equal(H.findByName("  betelgeuse ").con, "Ori");
  assert.equal(H.findByName("Vega").teff, 9600);
  assert.equal(H.findByName("Unobtainium"), null);
  assert.equal(H.findByName(null), null);
  const names = H.STARS.map((s) => s.name.toLowerCase());
  assert.equal(new Set(names).size, names.length);
  for (const s of H.STARS) {
    assert.ok(s.teff >= 2500 && s.teff <= 35000, s.name);
    assert.ok(s.lum > 0 && s.lum < 1e6, s.name);
    assert.ok(H.classHint[H.spectralClass(s.teff)], s.name);
  }
});
