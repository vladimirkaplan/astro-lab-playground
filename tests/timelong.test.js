"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const root = path.join(__dirname, "..");
require("../site/shared/units.js");
require("../site/labs/16-time-lat-long/timelong.js");
const T = globalThis.LS.timeLong;

test("roundHalf rounds halves upward, both signs", () => {
  assert.equal(T.roundHalf(7.5), 8);
  assert.equal(T.roundHalf(-7.5), -7);
  assert.equal(T.roundHalf(9.4), 9);
});

test("ideal 15-deg zone offsets, half zones credited east", () => {
  assert.equal(T.zoneOffsetHours(0), 0);
  assert.equal(T.zoneOffsetHours(7.4), 0);
  assert.equal(T.zoneOffsetHours(7.6), 1);
  assert.equal(T.zoneOffsetHours(7.5), 1);   // boundary goes to the east
  assert.equal(T.zoneOffsetHours(-7.5), 0);  // ...so -7.5 stays in zone 0
  assert.equal(T.zoneOffsetHours(-74.0), -5);
  assert.equal(T.zoneOffsetHours(150), 10);
  assert.equal(T.zoneOffsetHours(180), 12);  // the fold pins +/-180 at +12
  assert.equal(T.zoneOffsetHours(-180), 12);
});

test("course cities land in the zones the exercises assume", () => {
  const C = T.CITIES;
  assert.equal(T.zoneOffsetHours(C.newyork.lon), -5);
  assert.equal(T.zoneOffsetHours(C.london.lon), 0);
  assert.equal(T.zoneOffsetHours(C.tokyo.lon), 9);
  assert.equal(T.zoneOffsetHours(C.sydney.lon), 10);
  assert.equal(T.zoneOffsetHours(C.rio.lon), -3);
  assert.equal(T.zoneOffsetHours(C.cairo.lon), 2);
});

test("solar time gap is (lonA - lonB)/15 the short way around", () => {
  assert.equal(T.solarTimeGapHours(15, -75), 6);
  assert.equal(T.solarTimeGapHours(-75, 15), -6);
  // 179 vs -179: the short way crosses the date line, A is BEHIND B
  assert.ok(T.solarTimeGapHours(179, -179) < 0);
  assert.ok(Math.abs(T.solarTimeGapHours(179, -179) + 2 / 15) < 1e-9);
});

test("convertClock: 3 PM London is midnight next day in Tokyo", () => {
  const r = T.convertClock(3, 0, true, -0.1, 139.7);
  assert.equal(r.hour, 12);
  assert.equal(r.minute, 0);
  assert.equal(r.isPM, false);
  assert.equal(r.dayShift, 1);
});

test("convertClock: the return leg subtracts a day", () => {
  const r = T.convertClock(12, 0, false, 139.7, -0.1);
  assert.equal(r.hour, 3);
  assert.equal(r.isPM, true);
  assert.equal(r.dayShift, -1);
});

test("convertClock: Tokyo 3 PM Friday is 1 AM Friday in New York", () => {
  // the easy-way fold rolls past midnight (+1),
  // the eastward date-line crossing takes it back (-1): net same day
  const r = T.convertClock(3, 0, true, 139.7, -74.0);
  assert.equal(r.hour, 1);
  assert.equal(r.isPM, false);
  assert.equal(r.dayShift, 0);
});

test("convertClock: Tokyo 11 AM Wednesday is 9 PM Tuesday in New York", () => {
  const r = T.convertClock(11, 0, false, 139.7, -74.0);
  assert.equal(r.hour, 9);
  assert.equal(r.isPM, true);
  assert.equal(r.dayShift, -1);   // date line alone, midnight untouched
});

test("convertClock round trips return the original time and day", () => {
  const out = T.convertClock(11, 0, false, -74.0, 139.7);
  assert.equal(out.dayShift, 1);
  assert.equal(out.hour, 1);      // NY 11 AM = Tokyo 1 AM next day
  const back = T.convertClock(out.hour, out.minute, out.isPM, 139.7, -74.0);
  assert.equal(back.hour, 11);
  assert.equal(back.isPM, false);
  assert.equal(back.dayShift, -1);
});

test("degree-to-km constants and the cosine squeeze", () => {
  assert.equal(T.kmPerDegLat, 111);
  assert.ok(Math.abs(T.kmPerDegLon(60) - 55.5) < 1e-9);
  assert.ok(Math.abs(T.kmPerDegLon(0) - 111) < 1e-9);
  // the Q6 exercise figure: 11.5 deg of longitude at latitude 34
  const q6 = 11.5 * T.kmPerDegLon(34);
  assert.ok(Math.abs(q6 - 1058) < 5);
});

test("coordinate and zone labels carry the direction letters", () => {
  assert.equal(T.coordLabel(40.7, -74.0), "40.7 deg N, 74.0 deg W");
  assert.equal(T.coordLabel(-33.9, 151.2), "33.9 deg S, 151.2 deg E");
  assert.equal(T.zoneLabel(9), "UTC+9");
  assert.equal(T.zoneLabel(-5), "UTC-5");
  assert.equal(T.zoneLabel(0), "UTC+0");
});
