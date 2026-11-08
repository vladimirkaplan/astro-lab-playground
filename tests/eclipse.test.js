"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

require("../site/labs/05-moonrise-eclipses/eclipse.js");
const E = globalThis.LS.eclipse;
const DAY = 86400000;

// Realm for the vendored ephemeris. All Dates used against the engine must be
// created INSIDE this context (it instanceof-checks its own Date).
const root = path.join(__dirname, "..");
const ctx = { console };
ctx.self = ctx; ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "site/vendor/astronomy-engine/astronomy.browser.min.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(root, "site/shared/ephem.js"), "utf8"), ctx);

function realmSky(iso) {
  return JSON.parse(vm.runInContext(`(function(){
    var A = self.Astronomy;
    var d = new Date(${JSON.stringify(iso)});
    var g = A.GeoVector(A.Body.Moon, d, true);
    var el = A.Ecliptic(g);
    var ph = self.LS.ephem.moon(d);
    return JSON.stringify({ elat: el.elat, pa: ph.phaseAngle });
  })()`, ctx));
}

test("the five baked events are the NASA canon set", () => {
  assert.equal(E.EVENTS.length, 5);
  const isos = E.EVENTS.map(e => e.iso).join(" ");
  for (const iso of ["2027-02-06T16:00:00Z", "2027-02-20T23:13:00Z",
    "2027-07-18T16:03:00Z", "2027-08-02T10:07:00Z", "2027-08-17T07:14:00Z"]) {
    assert.ok(isos.includes(iso), "missing " + iso);
  }
  assert.equal(E.EVENTS[0].label, "Annular solar eclipse");
  assert.equal(E.EVENTS[3].label, "Total solar eclipse");
});

test("baked events agree with the ephemeris: phase and height", () => {
  E.EVENTS.forEach(ev => {
    const sky = realmSky(ev.iso);
    const target = ev.type === "solar" ? 0 : 180;
    const diff = Math.abs(((sky.pa - target) % 360 + 540) % 360 - 180);
    assert.ok(diff < 1.5, ev.iso + " phase off: " + sky.pa);
    if (ev.type === "solar") {
      // solar eclipses here are near-central: |gamma| under 0.3
      assert.ok(Math.abs(sky.elat) < 0.45, ev.iso + " elat " + sky.elat);
    } else {
      // all three lunar events are penumbral-only: outside the umbral reach
      assert.ok(Math.abs(sky.elat) > 0.95 && Math.abs(sky.elat) < 1.6,
        ev.iso + " elat " + sky.elat);
    }
  });
  // signs seen from the sim side: Feb 20 south, Aug 17 north
  assert.ok(realmSky(E.EVENTS[1].iso).elat < 0);
  assert.ok(realmSky(E.EVENTS[4].iso).elat > 0);
});

test("BETA_CURVE matches the ephemeris at spot checks", () => {
  assert.ok(E.BETA_CURVE.length > 300);
  const checks = ["2026-12-01T12:00:00Z", "2027-02-06T12:00:00Z",
    "2027-05-15T12:00:00Z", "2027-08-02T12:00:00Z"];
  for (const iso of checks) {
    const want = realmSky(iso).elat;
    const got = E.betaAt(iso);
    assert.ok(Math.abs(want - got) < 0.25, iso + " curve " + got + " vs sky " + want);
  }
  // baked exercise anchor
  assert.ok(Math.abs(E.betaAt("2027-02-20T12:00:00Z") - (-0.42)) < 0.01);
  // clamps
  assert.equal(E.betaAt("2020-01-01T00:00:00Z"), E.BETA_CURVE[0][1]);
});

test("solar longitude, nodes, and season windows", () => {
  const lon = E.sunLonApprox("2027-02-06T16:00:00Z");
  assert.ok(lon >= 0 && lon < 360);
  const nodes = E.nodeLongitudes();
  assert.equal(nodes.length, 2);
  const d = Math.abs(nodes[0] - nodes[1]);
  const sep = Math.min(d, 360 - d);
  // Not exactly 180: the real nodes regress ~19.3 deg/yr, so two node fixes
  // half a year apart legitimately disagree by ~10-18 deg. Cap out the drift.
  assert.ok(Math.abs(sep - 180) < 20, "node pair drifted too much: " + sep);
  // a solar eclipse date sits at its node center
  const at = E.seasonAt("2027-02-06T16:00:00Z");
  assert.ok(at && Math.abs(at.signedDeg) < 1.5);
  // exercise anchor: Aug 17 near the far edge of the August season
  const late = E.seasonAt("2027-08-17T12:00:00Z");
  assert.ok(late && Math.abs(late.signedDeg - 14.5) < 1.0, "got " + (late && late.signedDeg));
  // deep May: between seasons, no eclipse bookable
  assert.equal(E.seasonAt("2027-05-01T12:00:00Z"), null);
});

test("nearest event and the 2-day band", () => {
  const on = E.nearestEvent("2027-08-02T10:07:00Z");
  assert.equal(on.event.type, "solar");
  assert.ok(Math.abs(on.days) < 1e-9);
  assert.equal(on.within, true);
  const later = E.nearestEvent(Date.parse("2027-08-02T10:07:00Z") + 2 * DAY + 60000);
  assert.equal(later.within, false);
  const off = E.nearestEvent("2027-05-01T12:00:00Z");
  assert.ok(Math.abs(off.days) > 60 && Math.abs(off.days) < 92);
});

test("verdicts are honest about where the facts come from", () => {
  assert.equal(E.verdict("2027-02-20T12:00:00Z"),
    "eclipse: Penumbral lunar eclipse on 2027-02-20 (23:13 UT)");
  assert.equal(E.verdict("2027-01-15T12:00:00Z"), "no eclipse");
  const v = E.verdict("2027-08-17T12:00:00Z");
  assert.ok(v.startsWith("eclipse: Penumbral lunar eclipse on 2027-08-17"));
  const s = E.verdict("2027-08-10T12:00:00Z");
  assert.equal(s, "eclipse season: shadows line up near the nodes");
});

test("phase helpers (ephem-free approximations) stay in their lane", () => {
  assert.equal(E.illumApprox(0), 0);
  assert.ok(Math.abs(E.illumApprox(90) - 50) < 1e-9);
  assert.ok(Math.abs(E.illumApprox(180) - 100) < 1e-9);
  assert.equal(E.phaseName(45), "waxing crescent");
  assert.equal(E.phaseName(200), "waning gibbous");
  // the March 8 new moon: close to new, no eclipse booked
  const el = E.elongApprox("2027-03-08T12:00:00Z");
  assert.ok(el < 6 || el > 354, "elong " + el);
  assert.equal(E.verdict("2027-03-08T12:00:00Z"), "no eclipse");
});
