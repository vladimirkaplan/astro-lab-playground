"use strict";
// PHY110 Lab 2 maths module (site/phy110/labs/02-graphs-and-slope/graphlab.js).
//
// The graph rules this course marks are strict on purpose: only 1-2-5 scales, the
// scale must span the data, the data must cover 40 percent of the paper, and the
// slope comes off the trendline. The practice tables are the manual's own numbers,
// so the Earth set must still fit to 9.4 and not to a tidy 9.8.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const MOD = path.join(__dirname, "..", "site", "phy110", "labs",
  "02-graphs-and-slope", "graphlab.js");
require(MOD);
const G = globalThis.LS.graphlab;

const near = (x, y, tol, msg) => assert.ok(Math.abs(x - y) <= tol,
  msg + ": got " + x + ", want " + y + " +/-" + tol);

test("module loads on the LS namespace with the course rules", () => {
  assert.deepEqual(G.SCALE_BASES.slice(), [1, 2, 5]);
  assert.equal(G.TOP_BRACKET, 10);
  assert.equal(G.MIN_COVERAGE, 0.4);
  assert.equal(G.N_PIN, 30, "the practice tables pin N = 30");
});

test("pre-scale divides the data range by the available divisions", () => {
  near(G.preScale(10, 50, 30), 1.3333, 1e-3, "x scale, 10-50 on 30");
  near(G.preScale(65, 240, 30), 5.8333, 1e-3, "y scale, 65-240 on 30");
  near(G.preScale(6, 46, 20), 2, 1e-12, "6-46 on 20");
  assert.ok(Number.isNaN(G.preScale(0, 10, 0)), "zero divisions has no pre-scale");
});

test("chooseScale takes the smallest 1-2-5 step that still spans the range", () => {
  assert.equal(G.chooseScale(G.preScale(10, 50, 30)), 2, "1.333 -> 2 s per division");
  assert.equal(G.chooseScale(G.preScale(65, 240, 30)), 10, "5.833 -> 10 m per division");
  assert.equal(G.chooseScale(G.preScale(6, 46, 20)), 2, "2 exactly stays 2 per division");
  assert.equal(G.chooseScale(0.07), 0.1, "small ranges keep 1-2-5 spacing");
  assert.equal(G.chooseScale(0.07).toPrecision(3), "0.100", "no floating dust in the step");
  assert.equal(G.chooseScale(3.7), 5);
  assert.equal(G.chooseScale(12), 20);
  assert.ok(Number.isNaN(G.chooseScale(0)), "a zero pre-scale is not a question");
});

test("designScale reports the whole axis plan at once", () => {
  const plan = G.designScale(10, 50, 30);
  near(plan.preScale, 1.3333, 1e-3, "pre-scale");
  assert.equal(plan.scale, 2);
  assert.equal(plan.sf, 2, "the scale factor a student circles");
  assert.equal(plan.span, 60, "30 divisions of 2 s reach 60 s");
  near(plan.coverage, 40 / 60, 1e-9, "coverage of the axis length");
  assert.ok(G.coversEnough(10, 50, 30, 2), "67% coverage clears the 40% bar");
});

test("start value centres the data band on the paper", () => {
  near(G.startValue(12, 108, 100, 1), 10, 1e-9, "12 - (100 - 96)/2 = 10 m");
  near(G.startValue(10, 50, 30, 2), 10 - (60 - 40) / 2, 1e-9, "x plan start");
  assert.ok(Number.isNaN(G.startValue(0, 10, 30, 0)), "a zero scale is not a plan");
});

test("a rounder origin is allowed only while every point still fits", () => {
  assert.equal(G.simpleOrigin(12, 108, 100, 1), 10, "10 is already a clean origin");
  const plan = G.designScale(10, 50, 30);
  const xo = G.simpleOrigin(10, 50, 30, plan.scale);
  assert.ok(xo <= 10, "the origin never sits right of the first point");
  assert.ok(G.fitsOnGrid(xo, 30, 2, 10, 50), "every point stays on the grid");
  const half = xo / (plan.scale / 2);
  assert.ok(Math.abs(half - Math.round(half)) < 1e-9,
    "a nudged origin lands on a whole or half division, not a stray number");
  // a start that pushes the last point off the paper is refused
  assert.equal(G.fitsOnGrid(14, 30, 2, 10, 50), false, "14 leaves 50 s off the grid");
});

test("coverage must reach 40 percent of the axis length", () => {
  assert.equal(G.coversEnough(10, 50, 30, 2), true, "67% passes");
  assert.equal(G.coversEnough(10, 20, 30, 2), false, "17% fails");
  near(G.coverage(10, 22, 30, 2), 12 / 60, 1e-9, "20% coverage number");
  assert.ok(Number.isNaN(G.coverage(0, 10, 0, 2)), "no divisions, no coverage");
});

test("slope uses two points on the line, printed as rise over run", () => {
  const car = G.SETS.car.trend;
  near(G.slope(car[0][0], car[0][1], car[1][0], car[1][1]), 4.4167, 1e-3,
    "car example (280 - 15) / (60 - 0)");
  assert.equal(G.slopeText(car[0][0], car[0][1], car[1][0], car[1][1]),
    "(280 - 15) / (60 - 0) = 4.42");
  assert.ok(Number.isNaN(G.slope(3, 1, 3, 9)), "a vertical line has no slope");
  near(G.slope(0, 15, 6, 41.5), 265 / 60, 1e-9, "any two points on the same line agree");
});

test("the practice tables fit to the manual's own numbers", () => {
  const earth = G.setFit("earth");
  near(earth.slope, 9.40, 1e-9, "Earth table fits to 9.4, not 9.8");
  near(G.percentError(earth.slope, 9.80), 4.08, 0.02, "a hand line at 9.4 is 4% low");
  const moon = G.setFit("moon");
  near(moon.slope, 1.61, 1e-9, "Moon table fits to 1.61");
  near(G.percentError(moon.slope, 1.62), 0.617, 0.01, "and the Moon lands inside 1%");
  const car = G.setLine("car");
  near(car.slope, 4.4167, 1e-3, "the printed trendline, not the dots");
  const dots = G.bestFit(G.SETS.car.xs, G.SETS.car.ys);
  near(dots.slope, car.slope, 0.02, "a line drawn by eye through this cloud lands on 4.4");
  assert.equal(G.SETS.car.trend[0][1], 15, "the printed line starts at 15 m, not at 0");
});

test("a balanced trendline keeps about the same number of points on each side", () => {
  const set = G.SETS.earth;
  const pts = set.xs.map((x, i) => [x, set.ys[i]]);
  const fit = G.setFit("earth");
  const sides = G.pointsPerSide(pts, fit.slope, fit.intercept);
  assert.equal(sides.above + sides.below + sides.on, pts.length);
  assert.ok(Math.abs(sides.above - sides.below) <= 1, "the fit line balances: " +
    sides.above + " above, " + sides.below + " below");
  const tipped = G.pointsPerSide(pts, fit.slope * 2, fit.intercept);
  assert.equal(tipped.balanced, false, "a steep line stacks the points on one side");
});

test("the spring set is the sim's own bench and keys its own reading answer", () => {
  const line = G.setLine("spring");
  near(line.slope, 6.01, 0.01, "spring constant near 6 N per cm");
  near(line.intercept, 0.05, 0.06, "and this spring starts at zero stretch, as it should");
  near(G.predictAt("spring", G.SPRING_READ_X), 42.1, 0.2,
    "predicted force at 7 cm comes off this line, not a printed table");
  assert.ok(G.SPRING_READ_X > Math.max(...G.SETS.spring.xs),
    "the reading question sits past the last measured point");
});

test("every data set names what its slope measures", () => {
  Object.keys(G.SETS).forEach((key) => {
    const set = G.SETS[key];
    assert.ok(set.label && set.xLabel && set.yLabel, key + ": labelled axes");
    assert.ok(set.slopeMeaning.length > 0, key + ": says what the slope is");
    assert.equal(set.xs.length, 5, key + ": five plotted points");
    assert.equal(set.ys.length, 5, key + ": five y values");
  });
  assert.equal(G.SETS.earth.accepted, 9.80);
  assert.equal(G.SETS.moon.accepted, 1.62);
  assert.match(G.SETS.earth.slopeMeaning, /g/);
  assert.match(G.SETS.car.slopeMeaning, /speed/);
});

test("percent error is a size, never a sign", () => {
  near(G.percentError(9.4, 9.8), 4.0816, 1e-3, "low line");
  near(G.percentError(10.2, 9.8), 4.0816, 1e-3, "high line reads the same");
  assert.ok(Number.isNaN(G.percentError(9.8, 0)), "no accepted value, no percent error");
});
