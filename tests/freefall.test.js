"use strict";
// PHY110 Lab 3 maths module (site/phy110/labs/03-free-fall-g/freefall.js).
//
// g = 2h / t^2 is one line of arithmetic, so the numbers that matter here are the
// course settings (0.800 m, five trials, four-decimal timer, accepted 9.80) and the
// two errors a real bench actually makes: a late stop, and reading the height to the
// ball's centre instead of its bottom.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const MOD = path.join(__dirname, "..", "site", "phy110", "labs",
  "03-free-fall-g", "freefall.js");
require(MOD);
const F = globalThis.LS.freefall;

const near = (x, y, tol, msg) => assert.ok(Math.abs(x - y) <= tol,
  msg + ": got " + x + ", want " + y + " +/-" + tol);

test("course settings are the printed ones", () => {
  assert.equal(F.G_ACCEPT, 9.80);
  assert.equal(F.GRAV_G, 6.67e-11);
  assert.equal(F.TIMER_RESOLUTION, 0.0001);
  assert.equal(F.TRIALS_PER_HEIGHT, 5);
  assert.deepEqual(F.HEIGHTS_M.slice(), [0.200, 0.400, 0.800]);
  // not printed in the manual, so the page has to show them
  assert.equal(F.M_EARTH, 5.97e24);
  assert.equal(F.R_EARTH, 6.37e6);
});

test("fall time and g are the same equation read two ways", () => {
  near(F.fallTime(0.800), 0.40406, 1e-4, "t = sqrt(2h/g) at 0.800 m");
  near(F.fallTime(0.200), 0.20203, 1e-4, "expected time at 0.200 m is 0.202 s");
  near(F.fallTime(0.400), 0.28571, 1e-4, "expected time at 0.400 m is 0.286 s");
  near(F.gFrom(0.800, 0.404), 9.8029, 1e-3, "g = 1.6 / 0.16322");
  near(F.gFrom(F.HEIGHTS_M[0], F.fallTime(F.HEIGHTS_M[0])), 9.80, 1e-9, "round trip");
  assert.ok(Number.isNaN(F.gFrom(0.8, 0)), "a zero time is not a measurement");
  assert.ok(Number.isNaN(F.fallTime(-1)), "negative height has no fall time");
});

test("the five-trial example from the manual lands on 9.80", () => {
  const trials = [0.4042, 0.4038, 0.4045, 0.4040, 0.4035];
  near(F.mean(trials), 0.40400, 1e-6, "average of the five timings");
  near(F.gForHeight(0.800, trials), 9.8029, 1e-3, "g from the averaged time");
  near(F.percentError(F.gForHeight(0.800, trials)), 0.03, 0.05, "inside a tenth of a percent");
  assert.ok(Number.isNaN(F.gForHeight(0.8, [])), "no trials, no g");
  assert.ok(Number.isNaN(F.mean([])), "an empty list has no mean");
});

test("a slow stop on the timer pulls g down", () => {
  near(F.gFrom(0.800, 0.410), 9.5181, 1e-3, "mean t 0.410 s gives 9.52");
  near(F.percentError(F.gFrom(0.800, 0.410)), 2.88, 0.2, "and 2.9% low");
  near(F.gAfterLateStop(0.800, 0.404, 0.006), 9.5181, 2e-3,
    "six extra milliseconds behave like the 0.410 row");
  assert.ok(F.gAfterLateStop(0.8, 0.404, 0.01) < F.gFrom(0.800, 0.404),
    "a longer recorded time always means a smaller g");
});

test("reading the height to the ball centre pushes g up", () => {
  assert.equal(F.centreReadOffsetM(), 0.010, "half of a 2 cm ball");
  const clean = F.gFrom(0.800, 0.404);
  const sloppy = F.gFromCentreReading(0.800, 0.404);
  assert.ok(sloppy > clean, "a too-long height reads a too-strong gravity");
  near(F.percentError(sloppy), 1.27, 0.05, "one centimetre is about a 1.3% shift");
  assert.ok(Math.abs(F.percentError(sloppy)) > Math.abs(F.percentError(clean)),
    "the systematic shift is bigger than the clean reading's own slip");
});

test("averaging five trials shrinks a millisecond-scale slip", () => {
  const spread = 0.004;                        // +/- 4 ms release and geometry jitter
  const one = F.gFrom(0.800, 0.404 + spread);
  const five = [];
  for (let i = 0; i < 5; i++) five.push(0.404 + spread * (i % 2 ? -1 : 1) * (i + 1) / 5);
  const gFive = F.gForHeight(0.800, five);
  assert.ok(Math.abs(gFive - 9.80) < Math.abs(one - 9.80),
    "the averaged g sits closer than a single timing did");
  assert.equal(F.TRIALS_PER_HEIGHT, 5, "and the course asks for exactly five");
});

test("the three heights are averaged as the data page asks", () => {
  const per = F.HEIGHTS_M.map((h) => F.gFrom(h, F.fallTime(h)));
  assert.equal(per.length, 3);
  near(F.averageG(per), 9.80, 1e-9, "three clean heights average back to 9.80");
  const messy = [9.31, 9.80, 10.12];
  near(F.averageG(messy), 9.7433, 1e-3, "a real class set of three");
  near(F.percentError(F.averageG(messy)), 0.58, 0.02, "percent error of that answer");
  assert.ok(Number.isNaN(F.averageG([])), "nothing to average yet");
});

test("height dependence is far too small to measure at a bench", () => {
  near(F.twoHOverR(1), 3.14e-7, 1e-9, "2h / R_E at one metre is about 3e-7");
  near(F.fractionalChange(1), -3.14e-7, 1e-9, "and it is a fall with height");
  near(F.gAtHeight(0), 9.813, 0.01, "the standard surface value from these constants");
  assert.ok(F.gAtHeight(1) < F.gAtHeight(0), "higher up, gravity is weaker");
  assert.equal(F.detectableAtBenchHeights(), false,
    "no bench timer can see a 3 in 10 million change");
  // a 10 km balloon is still only about 0.3% down, for scale
  near(-F.fractionalChange(10000) * 100, 0.31, 0.02, "10 km up is a third of a percent");
});

test("percent error is a size against the course value by default", () => {
  near(F.percentError(9.3), 5.102, 1e-3, "a real class low");
  near(F.percentError(10.1), 3.061, 1e-3, "a real class high");
  near(F.percentError(1.61, 1.62), 0.617, 1e-3, "an accepted value can be overridden");
  assert.ok(Number.isNaN(F.percentError(9.8, 0)), "zero accepted is not a question");
});

test("a good real class result is 9.3 to 10.1, and the module agrees", () => {
  const good = [9.3, 9.6, 9.8, 10.0, 10.1];
  good.forEach((g) => {
    assert.ok(F.percentError(g) <= 5.2, g + " stays inside a fair class error");
  });
  assert.ok(F.percentError(11.4) > 15, "11.4 means something was mis-measured, not a bad day");
});
