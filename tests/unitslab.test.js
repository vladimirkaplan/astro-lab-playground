"use strict";
// PHY110 Lab 1 physics module (site/phy110/labs/01-units-and-measurement/unitslab.js).
//
// Every number the module is graded on comes out of the BMCC PHY110 course table,
// so this file pins the printed course factors, the arithmetic the Check tab uses,
// and the honest places where the course's rounded factors disagree with exact
// values by up to about 1 percent.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const MOD = path.join(__dirname, "..", "site", "phy110", "labs",
  "01-units-and-measurement", "unitslab.js");
require(MOD);
const P = globalThis.LS.unitslab;

const near = (x, y, tol, msg) => assert.ok(Math.abs(x - y) <= tol,
  msg + ": got " + x + ", want " + y + " +/-" + tol);

test("module loads as a plain script on the LS namespace", () => {
  assert.equal(typeof P, "object");
  assert.equal(P.G, 9.80);
  assert.equal(P.PI, 3.14);
  assert.equal(P.RHO_WATER, 1000);
});

test("course constants are the printed ones, quoted exactly", () => {
  assert.equal(P.directFactor("in", "cm"), 2.54);
  assert.equal(P.directFactor("yd", "m"), 0.91);
  assert.equal(P.directFactor("mi", "km"), 1.61);
  assert.equal(P.directFactor("gal", "L"), 3.8);
  assert.equal(P.directFactor("fl oz", "mL"), 29.57);
  assert.equal(P.directFactor("lb", "kg"), 0.45);
  assert.equal(P.directFactor("kg", "lb"), 2.2);
  assert.equal(P.directFactor("lbf", "kgf"), 0.45);
  assert.equal(P.directFactor("kgf", "lbf"), 2.2);
  // same-system definitions
  assert.equal(P.directFactor("ft", "in"), 12);
  assert.equal(P.directFactor("yd", "ft"), 3);
  assert.equal(P.directFactor("mi", "yd"), 1760);
  assert.equal(P.directFactor("lb", "oz"), 16);
  assert.equal(P.directFactor("ton", "lb"), 2000);
  assert.equal(P.directFactor("ft3", "gal"), 7.48);
  assert.equal(P.directFactor("yd3", "ft3"), 27);
  assert.equal(P.directFactor("gal", "qt"), 4);
  assert.equal(P.directFactor("qt", "pt"), 2);
  assert.equal(P.directFactor("cup", "fl oz"), 8);
  assert.equal(P.directFactor("fl oz", "tbsp"), 2);
  assert.equal(P.directFactor("tbsp", "tsp"), 3);
});

test("convert uses the printed factor for the pair it prints", () => {
  near(P.convert(66, "in", "cm"), 167.64, 1e-9, "66 in to cm");
  near(P.convert(150, "lb", "kg"), 67.5, 1e-9, "150 lb to kg");
  near(P.convert(8, "kg", "lb"), 17.6, 1e-9, "8 kg to lb");
  near(P.convert(40, "mi", "km"), 64.4, 1e-9, "40 mi to km");
  near(P.convert(3.25, "in", "cm"), 8.255, 1e-9, "3 1/4 in to cm");
  near(P.convert(1, "yd", "m"), 0.91, 1e-9, "yd to m uses 0.91");
  near(P.convert(1, "fl oz", "mL"), 29.57, 1e-9, "fl oz to mL");
});

test("convert chains printed factors when a pair is not printed", () => {
  // 1 ft is not printed in metres, so the chain runs through the yard factor.
  const ftM = P.convert(1, "ft", "m");
  near(ftM, 0.91 / 3, 1e-9, "ft to m via yd");
  const path = P.convertPath("ft", "m");
  assert.equal(path.steps.length, 2, "two printed steps: ft->yd, yd->m");
  // exactly defined chain stays exact
  near(P.convert(1, "ft", "cm"), 30.48, 1e-9, "ft to cm via in");
  near(P.convert(1, "yd", "in"), 36, 1e-9, "yd to in");
  // unrelated units give NaN, never a silent number
  assert.ok(Number.isNaN(P.convert(1, "kg", "cm")), "mass to length is NaN");
  assert.ok(Number.isNaN(P.convert(1, "N", "gal")), "force to volume is NaN");
  assert.equal(P.convertPath("kg", "cm"), null, "no path at all returns null");
});

test("cubic conversion cubes the whole factor", () => {
  near(P.convertCubic(1, "ft", "in"), 1728, 1e-6, "1 ft3 in in3");
  near(P.convertCubic(1, "in", "cm"), 16.387064, 1e-6, "1 in3 in cm3");
  near(P.convertCubic(2, "ft", "in"), 3456, 1e-6, "2 ft3 in in3");
});

test("unit tagging and bigger-unit calls match the worksheet questions", () => {
  assert.equal(P.systemOf("cm"), "SI");
  assert.equal(P.systemOf("mL"), "SI");
  assert.equal(P.systemOf("N"), "SI");
  assert.equal(P.systemOf("kg"), "SI");
  assert.equal(P.systemOf("C"), "SI");
  assert.equal(P.systemOf("fl oz"), "British");
  assert.equal(P.systemOf("yd"), "British");
  assert.equal(P.systemOf("lb"), "British");
  assert.equal(P.systemOf("F"), "British");
  assert.equal(P.systemOf("banana"), null, "unknown unit tags as nothing");

  assert.equal(P.largerUnit("cm", "in"), "in", "an inch is the longer unit");
  assert.equal(P.largerUnit("m", "yd"), "m");
  assert.equal(P.largerUnit("qt", "L"), "L");
  assert.equal(P.largerUnit("mi", "km"), "mi");
  assert.equal(P.largerUnit("kg", "lb"), "kg");
  const hotter = P.tempLarger({ value: 100, unit: "C" }, { value: 100, unit: "F" });
  assert.equal(hotter.unit, "C", "100 C is hotter than 100 F");
});

test("the rounded course factors sit within about 2 percent of exact values", () => {
  const drift = (k) => P.courseFactorDriftPct(k);
  assert.ok(Math.abs(drift("yd->m")) < 2, "yd drift " + drift("yd->m"));
  assert.ok(Math.abs(drift("mi->km")) < 2, "mi drift " + drift("mi->km"));
  assert.ok(Math.abs(drift("gal->L")) < 2, "gal drift " + drift("gal->L"));
  assert.ok(Math.abs(drift("lb->kg")) < 2, "lb drift " + drift("lb->kg"));
  assert.ok(Math.abs(drift("kg->lb")) < 2, "kg drift " + drift("kg->lb"));
  assert.equal(drift("in->cm"), 0, "the inch is exact");
  assert.equal(drift("nope->nope"), -1, "unknown pair reports no drift");
});

test("temperature conversions use the 9/5 and 5/9 pair", () => {
  near(P.cToF(34), 93.2, 1e-9, "34 C to F");
  near(P.fToC(95), 35.0, 1e-9, "95 F to C");
  assert.equal(P.cToF(0), 32, "freezing");
  assert.equal(P.cToF(100), 212, "boiling");
  assert.equal(P.fToC(32), 0);
  assert.equal(P.fToC(212), 100);
  // round trip
  near(P.fToC(P.cToF(21.5)), 21.5, 1e-9, "round trip");
  // the manual's worked example rounds 72 F to 22.4 C; straight math gives 22.2
  near(P.fToC(72), 22.2222, 1e-3, "72 F exact");
  assert.equal(P.manualRoundedCfromF(72), 22.2, "the page prints 22.2, not 22.4");
});

test("mass and weight use g = 9.80 and never swap the two", () => {
  near(P.weightN(0.158), 1.5484, 1e-9, "158 g object weighs 1.55 N");
  near(P.weightN(1.25), 12.25, 1e-9, "1.25 kg manual weighs 12.25 N");
  near(P.massFromWeightN(12.25), 1.25, 1e-9, "weight back to mass");
  near(P.waterMassKg(950), 0.95, 1e-9, "a quart of water is 0.95 kg");
  near(P.waterMassKg(P.convert(1, "gal", "mL")), 3.8, 1e-9, "a gallon of water is 3.8 kg");
});

test("box volume and displacement volume", () => {
  assert.equal(P.boxVolume(3, 2, 1), 6);
  assert.equal(P.displacement(72.5, 45.0), 27.5);
  // the same box measured in inches and in centimetres agrees once the factor is cubed
  const cmBox = P.boxVolume(34.6, 22.2, 12.7);
  const inBox = P.boxVolume(34.6 / 2.54, 22.2 / 2.54, 12.7 / 2.54);
  near(inBox * P.convertCubic(1, "in", "cm"), cmBox, 1e-6, "same box, two unit systems");
  near(P.convertCubic(cmBox, "cm", "in"), inBox, 1e-6, "the reverse conversion agrees");
});

test("pacing maths: step size from the 50 ft course, then the board span", () => {
  const size = P.stepSize(50, 18);
  near(size, 2.7778, 1e-3, "18 steps over 50 ft");
  near(P.pacedLength(30, size), 83.3333, 1e-3, "30 board steps");
  assert.ok(Number.isNaN(P.stepSize(50, 0)), "zero steps has no step size");
});

test("pendulum g uses the course pi and reproduces the spec exercise", () => {
  const g = P.pendulumG(0.90, 1.91);
  near(g, 9.7296, 1e-3, "L 0.90 m at T 1.91 s");
  near(P.percentError(g, 9.8), 0.72, 0.02, "percent error against 9.8");
  // hand arithmetic with 3.14: 4 x 9.8596 x 0.90 = 35.49456, over 3.6481
  near(4 * 3.14 * 3.14 * 0.90 / (1.91 * 1.91), 9.7296, 1e-3, "hand arithmetic");
  near(P.pendulumPeriod(0.90), 1.9031, 1e-3, "period at course g, with pi = 3.14");
  near(P.pendulumTimeFor(0.90, 10), 19.031, 5e-3, "ten swings take about 19.0 s");
});

test("mean and percent error behave on the lab's real shapes", () => {
  near(P.mean([19.12, 18.98, 19.05, 19.20, 18.95]), 19.06, 1e-9, "five timings");
  assert.ok(Number.isNaN(P.mean([])), "no timings has no mean");
  assert.equal(P.percentError(9.3, 9.8), (0.5 / 9.8) * 100);
  near(P.percentError(10.1, 9.8), (0.3 / 9.8) * 100, 1e-9, "error is always positive");
  assert.ok(Number.isNaN(P.percentError(9.8, 0)), "accepted zero is not a question");
});

test("ruler fractions read the way a shoebox table wants them", () => {
  assert.equal(P.toFraction(3.25, 8), "3 1/4");
  assert.equal(P.toFraction(34.6, 16), "34 10/16".replace("10/16", "5/8"));
  assert.equal(P.toFraction(0.5, 8), "1/2");
  assert.equal(P.toFraction(4.999, 8), "5", "a near-whole reading rounds to the whole inch");
  assert.equal(P.fromFraction("3 1/4"), 3.25);
  assert.equal(P.fromFraction("5/8"), 0.625);
  near(P.fromFraction(P.toFraction(13.6, 8)), 13.5, 0.125, "fraction round trip stays on a tick");
});

test("the substitution string shows every factor the student multiplies by", () => {
  assert.equal(P.substitutionText(66, "in", "cm"),
    "66 in x (2.54 cm / 1 in) = 167.64 cm");
  assert.equal(P.substitutionText(150, "lb", "kg"),
    "150 lb x (0.45 kg / 1 lb) = 67.50 kg");
  assert.equal(P.substitutionText(1, "ft", "m", 4),
    "1 ft x (1 yd / 3 ft) x (0.91 m / 1 yd) = 0.3033 m",
    "a chained conversion prints both printed factors");
  assert.equal(P.substitutionText(1, "kg", "cm"), "", "no path prints nothing");
});
