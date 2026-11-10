"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

require("../site/data/stars.js");
require("../site/ast110/labs/03-celestial-sphere/sphere.js");
const S = globalThis.LS.stars;
const P = globalThis.LS.sphere;

// Curated magnitude cap of the catalog (see the stars.js header): the added
// tier stops at V = 3.4 and two older proper-name entries sit at 4.1 and 4.2,
// so nothing may be fainter than 4.2 (+0.2 rounding slack in the test below).
const MAG_CAP = 4.2;

test("catalog is populated and complete enough", () => {
  assert.ok(Array.isArray(S.list));
  assert.ok(S.list.length >= 150, "expected at least 150 stars, got " + S.list.length);
});

test("catalog sits in the 250-285 band GitHub #17 asked for", () => {
  assert.ok(S.list.length >= 250, "expected at least 250 stars, got " + S.list.length);
  assert.ok(S.list.length <= 285, "expected at most 285 stars, got " + S.list.length);
});

test("every entry has the six fields with sane types and ranges", () => {
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
    assert.ok(s.mag <= MAG_CAP + 0.2 && s.mag >= -2.0, s.name + " mag out of range");
  }
});

test("every entry carries a format-valid spectral type", () => {
  // Temperature class, optional subclass (and the catalogue's M1-2 ranges), an
  // optional single lower-case peculiar marker kept when the catalogue prints no
  // luminosity class (Am, Ap, A0p, O5f), then an optional luminosity class.
  // Permissive on the class on purpose: the catalogue prints ranges (III-IV) and
  // sub-classes (Iab, IIIb). WC is the one entry outside the OBAFGKM families -
  // gamma-squared Velorum (Regor) is a Wolf-Rayet.
  const SP_RE = /^(?:WC\d|[OBAFGKM]\d?(?:\.\d)?(?:-\d)?[a-z]?(?: ?[IVX]{1,3}[abc]{0,2}(?:-[IVX]{1,3}[abc]{0,2})?)?)$/;
  for (const s of S.list) {
    assert.equal(typeof s.sp, "string", s.name + " has no sp field");
    assert.ok(s.sp.length > 0, s.name + " has an empty sp");
    assert.ok(SP_RE.test(s.sp), s.name + " has an unparseable sp: " + s.sp);
  }
});

test("spectral types of the stars every textbook names", () => {
  const want = {
    Betelgeuse: /^M[12]/, "Rigel": /^B8/, "Vega": /^A0 V/, "Sirius": /^A1 V/,
    Arcturus: /^K1\.5 III/, "Antares": /^M1/, "Canopus": /^F0/, "Procyon": /^F5/,
    "Altair": /^A7/, "Deneb": /^A2/, "Pollux": /^K0 III/, "Regulus": /^B[78]/,
    "Spica": /^B1/, "Alnitak": /^O9/, "Capella": /^G/
  };
  for (const name of Object.keys(want)) {
    const s = S.findByName(name);
    assert.ok(s, "missing anchor star: " + name);
    assert.ok(want[name].test(s.sp), name + " sp is " + s.sp + ", expected " + want[name]);
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
