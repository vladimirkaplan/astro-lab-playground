"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

require("../site/data/stars.js");
require("../site/labs/03-celestial-sphere/sphere.js");
const S = globalThis.LS.stars;
const P = globalThis.LS.sphere;

test("catalog is populated and complete enough", () => {
  assert.ok(Array.isArray(S.list));
  assert.ok(S.list.length >= 150, "expected at least 150 stars, got " + S.list.length);
});

test("every entry has the five fields with sane types and ranges", () => {
  for (const s of S.list) {
    assert.equal(typeof s.name, "string");
    assert.ok(s.name.length > 0);
    assert.equal(typeof s.con, "string");
    assert.equal(s.con.length, 3);
    assert.equal(typeof s.ra, "number");
    assert.equal(typeof s.dec, "number");
    assert.equal(typeof s.mag, "number");
    assert.ok(s.ra >= 0 && s.ra < 24, s.name + " ra out of range");
    assert.ok(s.dec >= -90 && s.dec <= 90, s.name + " dec out of range");
    assert.ok(s.mag <= 3.75 && s.mag >= -2.0, s.name + " mag out of range");
  }
});

test("no duplicate names (case-insensitive)", () => {
  const seen = new Set();
  for (const s of S.list) {
    const key = s.name.toLowerCase();
    assert.ok(!seen.has(key), "duplicate: " + s.name);
    seen.add(key);
  }
});

test("every star the course table drills is present", () => {
  const drills = ["Capella", "Arcturus", "Betelgeuse", "Antares", "Vega",
    "Regulus", "Fomalhaut", "Castor", "Canopus", "Rigel",
    "Aldebaran", "Sirius", "Procyon", "Deneb", "Altair"];
  for (const n of drills) {
    assert.ok(S.findByName(n), "course star missing: " + n);
  }
  assert.ok(S.findByName("Polaris") && S.findByName("Eta Cas"));
  assert.equal(S.findByName("nonsense-star-9000"), null);
});

test("pinned catalog values (J2000, Yale values)", () => {
  const vega = S.findByName("Vega");
  assert.ok(Math.abs(vega.dec - 38.8) < 0.5, "vega dec " + vega.dec);
  assert.ok(Math.abs(vega.ra - 18.62) < 0.15);
  assert.ok(Math.abs(vega.mag - 0.0) <= 0.2);

  const sirius = S.findByName("Sirius");
  assert.ok(Math.abs(sirius.dec + 16.7) < 0.5, "sirius dec " + sirius.dec);
  assert.ok(Math.abs(sirius.ra - 6.75) < 0.15, "sirius ra " + sirius.ra);

  const polaris = S.findByName("Polaris");
  assert.ok(polaris.dec > 88, "polaris dec " + polaris.dec);

  const betel = S.findByName("Betelgeuse");
  assert.ok(Math.abs(betel.ra - 5.9) < 0.15, "betelgeuse ra " + betel.ra);
  assert.ok(betel.dec > 5 && betel.dec < 10);

  const canopus = S.findByName("Canopus");
  assert.ok(Math.abs(canopus.ra - 6.4) < 0.25 && canopus.dec < -50);
});

test("June solstice day 172: dec about +23.4, ra about 6h", () => {
  const sun = P.sunEquatorial(172);
  assert.ok(Math.abs(sun.decDeg - 23.4) < 0.5, "jun dec " + sun.decDeg);
  assert.ok(Math.abs(sun.raHours - 6) < 0.25, "jun ra " + sun.raHours);
});

test("December solstice day 355: dec about -23", () => {
  const sun = P.sunEquatorial(355);
  assert.ok(Math.abs(sun.decDeg + 23) < 0.7, "dec dec " + sun.decDeg);
  assert.ok(sun.raHours > 17.5 && sun.raHours < 18.5);
});

test("sunEclipticLon moves about 1 deg per day and wraps", () => {
  const step = P.sunEclipticLon(80) - P.sunEclipticLon(79);
  assert.ok(step > 0.9 && step < 1.05, "daily step " + step);
  // A whole year advances the mean Sun just under 360 deg (0.9856/day),
  // so lon(365) sits about 1 deg short of lon(1).
  const wrap = (P.sunEclipticLon(365) - P.sunEclipticLon(1) + 360) % 360;
  assert.ok(wrap > 357 && wrap < 360, "wrap " + wrap);
});

test("eclipticToEquatorial anchors on the four cardinal points", () => {
  const a = P.eclipticToEquatorial(0);
  assert.ok(Math.abs(a.raHours - 0) < 0.02);
  assert.ok(Math.abs(a.decDeg) < 0.02);
  const b = P.eclipticToEquatorial(90);
  assert.ok(Math.abs(b.raHours - 6) < 0.02);
  assert.ok(Math.abs(b.decDeg - 23.44) < 0.05);
  const c = P.eclipticToEquatorial(180);
  assert.ok(Math.abs(c.raHours - 12) < 0.02 && Math.abs(c.decDeg) < 0.02);
  const d = P.eclipticToEquatorial(270);
  assert.ok(Math.abs(d.raHours - 18) < 0.02 && Math.abs(d.decDeg + 23.44) < 0.05);
});

test("angularSeparation: known pairs and edge cases", () => {
  const sirius = S.findByName("Sirius"), rigel = S.findByName("Rigel");
  const d = P.angularSeparation(sirius.ra, sirius.dec, rigel.ra, rigel.dec);
  // Sirius and Rigel really are about 24 deg apart; keep the true value and
  // just say the result must stay a sane, finite separation.
  assert.ok(d > 22 && d < 25, "sirius-rigel " + d);
  assert.ok(d > 0.4 && d < 12 * 2);
  // Within-asterism sanity band the brief asks for, on the Bowl's pointer pair.
  const dubhe = S.findByName("Dubhe"), merak = S.findByName("Merak");
  const dm = P.angularSeparation(dubhe.ra, dubhe.dec, merak.ra, merak.dec);
  assert.ok(dm > 4.5 && dm < 6.2, "dubhe-merak " + dm);
  assert.ok(dm > 0.4 && dm < 12);
  // same point -> 0, pole check
  assert.ok(P.angularSeparation(5, 20, 5, 20) < 1e-9);
  assert.ok(P.angularSeparation(0, 90, 12, 90) < 1e-6);
});

test("sunPositionForDate is leap-aware", () => {
  assert.equal(P.sunPositionForDate(2024, 2, 29).dayOfYear, 60);
  assert.equal(P.sunPositionForDate(2025, 3, 1).dayOfYear, 60);
  assert.equal(P.sunPositionForDate(2025, 2, 28).dayOfYear, 59);
  assert.equal(P.sunPositionForDate(2024, 12, 31).dayOfYear, 366);
  assert.equal(P.sunPositionForDate(2023, 12, 31).dayOfYear, 365);
});

test("course question check: March 1 puts the Sun in Pisces territory", () => {
  // The Lab 3 answer sheet uses March 1: RA about 22h50m, Dec about -7.5 deg.
  const sun = P.sunPositionForDate(2001, 3, 1);
  assert.ok(sun.raHours > 22.5 && sun.raHours < 23.2, "ra " + sun.raHours);
  assert.ok(sun.decDeg < -6 && sun.decDeg > -9, "dec " + sun.decDeg);
});
