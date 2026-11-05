"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Load the vendored library and the wrapper exactly the way a classic
// <script> pair loads them in a browser (fresh realm, self === globalThis).
function loadEphem() {
  const ctx = { console };
  ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext("__D = iso => new Date(iso);", ctx);
  const root = path.join(__dirname, "..");
  vm.runInContext(fs.readFileSync(path.join(root, "site/vendor/astronomy-engine/astronomy.browser.min.js"), "utf8"), ctx);
  vm.runInContext(fs.readFileSync(path.join(root, "site/shared/ephem.js"), "utf8"), ctx);
  return { E: ctx.LS.ephem, D: ctx.__D };
}

const { E, D } = loadEphem();

test("wrapper reports ready and exposes the API", () => {
  assert.ok(E.ready());
  for (const fn of ["sun", "moon", "riseSet", "moonrise", "sunrise", "nyLocalToUTC", "utcToNYParts"]) {
    assert.equal(typeof E[fn], "function", fn);
  }
});

test("sun on 2001-03-01 matches the course script values", () => {
  const s = E.sun(D("2001-03-01T00:00Z"), "london");
  assert.ok(Math.abs(s.lonDeg - 340.48) < 0.05, "lon " + s.lonDeg);
  assert.ok(Math.abs(s.raH - 22.80) < 0.02, "ra " + s.raH);
  assert.ok(Math.abs(s.decDeg - (-7.64)) < 0.05, "dec " + s.decDeg);
});

test("moon phases: full near 2012-03-08, new near 2012-03-22 (course lab dates)", () => {
  const m1 = E.moon(D("2012-03-08T04:04Z"));
  assert.ok(m1.illumPct > 99.5, "illum " + m1.illumPct);
  assert.equal(m1.phaseName, "full moon");
  const m2 = E.moon(D("2012-03-22T17:37Z"));
  assert.ok(m2.illumPct < 1, "illum " + m2.illumPct);
  assert.equal(m2.phaseName, "new moon");
  // age bookkeeping: full ~ 14.5-15.0 d after new Mar 22? go forward:
  const m3 = E.moon(D("2012-04-06T19:20Z"));   // next full
  assert.ok(m3.illumPct > 99.5);
});

test("rise/set: March 22 2012 NYC moonrise lands near 10:3x UTC, sunrise 10:55 UTC", () => {
  const r = E.moonrise("newyork", D("2012-03-22T05:00Z"));
  assert.ok(r);
  assert.equal(r.getUTCHours(), 10);
  assert.ok(r.getUTCMinutes() <= 40);
  const sr = E.sunrise("newyork", D("2012-03-22T05:00Z"));
  assert.equal(sr.getUTCHours(), 10);
  assert.ok(sr.getUTCMinutes() >= 50);
});

test("NY DST: +0Z probe dates land on the right side, wall clock round trip", () => {
  assert.equal(E.nyOffsetHours(D("2012-03-14T16:00Z")), -4); // after Mar 11 2012
  assert.equal(E.nyOffsetHours(D("2012-03-09T16:00Z")), -5); // before it starts
  assert.equal(E.nyOffsetHours(D("2012-09-09T16:00Z")), -4); // Sept is mid-DST
  assert.equal(E.nyOffsetHours(D("2012-11-03T16:00Z")), -4);  // Nov 4 end
  assert.equal(E.nyOffsetHours(D("2012-11-05T16:00Z")), -5);
  const utc = E.nyLocalToUTC(2012, 3, 16, 16, 0);
  assert.ok(Math.abs(utc.getTime() - Date.UTC(2012, 2, 16, 20, 0)) < 1000);
  const p = E.utcToNYParts(utc);
  assert.equal(p.hh, 16);
  assert.equal(p.d, 16);
});

test("sidereal: Greenwich sidereal at 18:12 UT Mar 22 2012 ~ 6.24 h; NYC LST behind", () => {
  const gst = E.siderealTime(D("2012-03-22T18:12Z"));
  assert.ok(Math.abs(gst - 6.243) < 0.01, "gst " + gst);
  const lst = E.lstHours(D("2012-03-22T18:12Z"), "newyork");
  assert.ok(Math.abs(lst - 1.31) < 0.02);
});
