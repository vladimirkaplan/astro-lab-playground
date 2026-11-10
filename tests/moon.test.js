"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
require("../site/shared/units.js");
require("../site/ast110/labs/04-moon-phases/moon.js");
const M = globalThis.LS.moonPhase;

test("illumination formula at the anchors", () => {
  assert.ok(Math.abs(M.illum(0)) < 1e-9);
  assert.ok(Math.abs(M.illum(90) - 50) < 1e-9);
  assert.ok(Math.abs(M.illum(180) - 100) < 1e-9);
  // the course numbers used by the exercises
  assert.ok(Math.abs(M.illum(135) - 85.36) < 0.1);
  assert.ok(Math.abs(M.illum(215) - 90.96) < 0.1);
});

test("phase names split at the 22.5-degree boundaries", () => {
  assert.equal(M.name(0), "new moon");
  assert.equal(M.name(350), "new moon");
  assert.equal(M.name(45), "waxing crescent");
  assert.equal(M.name(95), "first quarter");
  assert.equal(M.name(135), "waxing gibbous");
  assert.equal(M.name(180), "full moon");
  assert.equal(M.name(215), "waning gibbous");
  assert.equal(M.name(300), "waning crescent");
});

test("waxing is the 0-180 half", () => {
  assert.equal(M.waxing(45), true);
  assert.equal(M.waxing(170), true);
  assert.equal(M.waxing(190), false);
  assert.equal(M.waxing(0), false);
});

test("textbook schedule: transit lags the sun by elong/360 of a day", () => {
  const s1 = M.schedule(0);    // new: transit noon
  assert.equal(s1.transitH, 12);
  const s2 = M.schedule(90);   // first quarter: transit 6 PM, rise noon, set midnight
  assert.equal(s2.transitH, 18);
  assert.equal(s2.riseH, 12);
  assert.equal(s2.setH, 0);
  const s3 = M.schedule(270);  // last quarter: transit 6 AM
  assert.equal(s3.transitH, 6);
  assert.equal(M.hourLabel(6), "6:00 AM");
  assert.equal(M.hourLabel(18), "6:00 PM");
  assert.equal(M.hourLabel(0), "12:00 AM");
});

// The baked EVENTS table must reproduce what the engine says right now.
test("baked EVENTS match the vendored ephemeris (realm-for-realm)", () => {
  const ctx = { console };
  ctx.self = ctx; ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, "site/vendor/astronomy-engine/astronomy.browser.min.js"), "utf8"), ctx);
  vm.runInContext(fs.readFileSync(path.join(root, "site/shared/ephem.js"), "utf8"), ctx);
  vm.runInContext(`
    self.__verify = function (iso, ny, rise, set, target) {
      var E = self.LS.ephem;
      var d = new Date(iso);
      var ang = ((E.moon(d).phaseAngle % 360) + 360) % 360;
      var diff = Math.abs(ang - target) % 360;
      diff = Math.min(diff, 360 - diff);
      var up = E.moonrise("newyork", new Date(+d - 16 * 3600000));
      var dn = E.moonset("newyork", new Date(+d - 16 * 3600000));
      return {
        angDiff: diff,
        nyOk: E.nyDateLabel(d) === ny,
        riseOk: up ? E.nyDateLabel(up) === rise : rise === "-",
        setOk: dn ? E.nyDateLabel(dn) === set : set === "-"
      };
    };
  `, ctx);
  const targets = { "first quarter": 90, "full moon": 180, "last quarter": 270, "new moon": 0 };
  assert.equal(M.EVENTS.length, 8);
  let prev = 0;
  for (const ev of M.EVENTS) {
    const t = targets[ev.name];
    assert.ok(t !== undefined, "unknown phase name: " + ev.name);
    const r = ctx.__verify(ev.iso, ev.ny, ev.rise, ev.set, t);
    assert.ok(r.angDiff < 1.5, ev.iso + " angle off by " + r.angDiff);
    assert.ok(r.nyOk, ev.iso + " NY label mismatch (baked: " + ev.ny + ")");
    assert.ok(r.riseOk, ev.iso + " rise mismatch (baked: " + ev.rise + ")");
    assert.ok(r.setOk, ev.iso + " set mismatch (baked: " + ev.set + ")");
    assert.ok(+new Date(ev.iso) > prev, "events out of order");
    prev = +new Date(ev.iso);
  }
});
