"use strict";
// PHY110 Lab 6 maths module (site/phy110/labs/06-rotational-equilibrium/torque.js).
//
// tau = F d and tau_ccw = tau_cw with course g = 9.80. The numbers that
// matter are the printed ones (100 g at 0.30 m, 400 N on the 3-4-5 gate,
// 20 lb at 80 cm, the 0.45 lb-to-kg factor) and the two measured ones the
// manual leaves off the page: the 40 g clamp-and-hanger and the 0.50 m
// balance point. Honesty items: real sticks balance near 50 cm, clamps are
// not massless, and a 1-3 % torque gap still reads level.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOD = path.join(__dirname, "..", "site", "phy110", "labs",
  "06-rotational-equilibrium", "torque.js");
require(MOD);
const T = globalThis.LS.torque;

const near = (x, y, tol, msg) => assert.ok(Math.abs(x - y) <= tol,
  msg + ": got " + x + ", want " + y + " +/-" + tol);
const round = (x, d) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d);

test("course settings are the printed ones", () => {
  assert.equal(T.G, 9.80);
  assert.equal(T.X1, 0.30, "the printed left mark");
  assert.equal(T.PART1_LEFT_G, 100);
  assert.equal(T.PART1_RIGHT_G, 50);
  assert.equal(T.GATE_FORCE_N, 400);
  assert.deepEqual(T.GATE, { shortM: 3, longM: 4, diagM: 5 }, "Figure 3 layout");
  assert.equal(T.LB_TO_KG, 0.45, "the course factor, as printed");
  assert.deepEqual(T.BAG, { lb: 20, nearCm: 80, farCm: 60 });
  // measured, not printed: the drawer must show them
  assert.equal(T.CLAMP_G, 40);
  assert.equal(T.X0, 0.50);
  assert.equal(T.LEVEL_OK_PCT, 3, "a 1-3 % torque gap reads level");
});

test("forces and torques from the marks", () => {
  near(T.forceN(140), 1.372, 1e-12, "0.140 kg x 9.80");
  near(T.forceN(90), 0.882, 1e-12, "0.090 kg x 9.80");
  near(T.torque(1.372, 0.20), 0.2744, 1e-12, "F1 x d1");
  near(T.torqueGm(140, 0.20), 28, 1e-12, "gram-metres before g cancels");
  assert.equal(T.dLeft(0.50, 0.30), 0.20, "d1 = X0 - X1");
  near(T.dRight(0.50, 0.811), 0.311, 1e-12, "d2 = X2 - X0");
  near(T.pctDiff(0.2744, 0.2205), 24.44, 0.01, "% difference on the bigger torque");
});

test("the Part I balance point with the 40 g clamps included", () => {
  // M1T = 100 + 40 = 140 g at d1 = 0.20 m; M2T = 50 + 40 = 90 g
  near(T.balanceD2(140, 0.20, 90), 140 * 0.20 / 90, 1e-12, "d2 = 140 x 0.20 / 90");
  near(T.balanceD2(140, 0.20, 90), 0.311, 5e-4, "prints 0.311 m");
  near(T.balanceX2(0.50, T.balanceD2(140, 0.20, 90)), 0.811, 5e-4, "X2 = 0.811 m");
  // without the clamps the mark would sit at 0.90 m: ignoring them shifts it
  near(T.balanceX2(0.50, T.balanceD2(100, 0.20, 50)), 0.90, 1e-12, "no clamps: X2 = 0.90");
});

test("Part II: the unknown mass from the printed form", () => {
  // M_u = (M_k + M_c) d2/d1 - M_c with M_k = 100 g, M_c = 40 g, d2 = 0.25, d1 = 0.20
  assert.equal(T.unknownMassG(100, 40, 0.20, 0.25), 135, "140 x 1.25 - 40 = 135 g");
  // the answer closes the balance: left total x d1 = right total x d2
  const mu = T.unknownMassG(100, 40, 0.20, 0.25);
  near(T.torqueGm(mu + 40, 0.20), T.torqueGm(100 + 40, 0.25), 1e-9,
    "measured M_u balances the known side exactly");
});

test("Part III: the missing torque and the third clamp", () => {
  // left 140 g at 0.20 m, right 90 g at 0.25 m
  near(T.missingTorqueNm(140, 0.20, 90, 0.25), 0.0539, 1e-9, "0.2744 - 0.2205");
  near(round(T.missingTorqueNm(140, 0.20, 90, 0.25), 3), 0.054, 1e-9, "prints 0.054 N m");
  near(T.thirdClampTotalG(140, 0.20, 90, 0.25, 0.10), 55, 1e-9, "55 g total at d3 = 0.10");
  assert.equal(T.thirdClampAddG(55, 40), 15, "15 g of extra weight");
  // the third clamp closes the condition: 28 = 22.5 + 5.5 gram-metres
  const total = T.thirdClampTotalG(140, 0.20, 90, 0.25, 0.10);
  near(T.torqueGm(90, 0.25) + T.torqueGm(total, 0.10), T.torqueGm(140, 0.20), 1e-9,
    "all three clamps balance");
});

test("the printed theory questions: bag and gate", () => {
  near(T.bagMassLb(20, 80, 60), 26.667, 5e-4, "20 x 80/60");
  near(round(T.bagMassLb(20, 80, 60), 1), 26.7, 1e-9, "prints 26.7 lb");
  near(T.bagMassKg(20, 80, 60), 12.0, 1e-9, "26.667 x 0.45 = 12.0 kg");
  assert.equal(T.gateLeverArm(3, 4, 5), 2.4, "the standard 3-4-5 reading");
  assert.equal(T.gateTorque(400, 2.4), 960, "400 x 2.4 = 960 N m");
});

test("level judgement: a 1-3 % gap counts as level", () => {
  assert.ok(T.isLevel(1.0, 1.02), "2 % gap is level");
  assert.ok(T.isLevel(1.0, 1.03), "3 % gap is level, at the edge");
  assert.ok(!T.isLevel(1.0, 1.04), "4 % gap is not level");
  assert.ok(!T.isLevel(0.2744, 0.2205), "a 24 % gap is far from level");
  assert.ok(T.isLevel(0, 0), "nothing hanging is level");
  assert.ok(!T.isLevel(NaN, 1.0), "an uncomputed torque is not level");
});

// ---- Check-tab payloads re-derived from the module ---------------------------

const LAB_DIR = path.join(__dirname, "..", "site", "phy110", "labs", "06-rotational-equilibrium");

test("index.html check payloads: all parse, and graded answers match the module", () => {
  const html = fs.readFileSync(path.join(LAB_DIR, "index.html"), "utf8");
  const payloads = [];
  const re = /data-ex='([\s\S]*?)'/g;
  let m;
  while ((m = re.exec(html))) payloads.push(JSON.parse(m[1]));
  assert.ok(payloads.length >= 8, "expected 8+ exercises, found " + payloads.length);

  const byQ = (re2) => payloads.find((p) => re2.test(p.q));

  const ex1 = byQ(/20 lb/);
  assert.ok(ex1 && ex1.type === "numbers", "exercise 1: the bag mass");
  assert.equal(ex1.parts[0].value, round(T.bagMassLb(20, 80, 60), 1), "lb re-derived");
  assert.equal(ex1.parts[1].value, round(T.bagMassKg(20, 80, 60), 1), "kg re-derived");

  const ex2 = byQ(/gate/i);
  assert.ok(ex2 && ex2.type === "numbers", "exercise 2: the gate lever arm and torque");
  assert.equal(ex2.parts[0].value, T.gateLeverArm(3, 4, 5), "d re-derived");
  assert.equal(ex2.parts[1].value, T.gateTorque(400, T.gateLeverArm(3, 4, 5)), "tau re-derived");

  const ex3 = byQ(/at what mark/i);
  assert.ok(ex3 && ex3.type === "numbers", "exercise 3: the Part I balance mark");
  assert.equal(ex3.parts[0].value, round(T.balanceX2(T.X0, T.balanceD2(140, 0.20, 90)), 3),
    "X2 re-derived");

  const ex4 = byQ(/counter-clockwise/i);
  assert.ok(ex4 && ex4.type === "numbers", "exercise 4: F1 and the ccw torque");
  assert.equal(ex4.parts[0].value, round(T.forceN(140), 3), "F1 re-derived");
  assert.equal(ex4.parts[1].value, round(T.torque(T.forceN(140), 0.20), 3), "tau re-derived");

  const ex5 = byQ(/unknown mass/i);
  assert.ok(ex5 && ex5.type === "numbers", "exercise 5: the unknown mass");
  assert.equal(ex5.parts[0].value, T.unknownMassG(100, 40, 0.20, 0.25), "M_u re-derived");

  const ex6 = byQ(/third clamp/i);
  assert.ok(ex6 && ex6.type === "numbers", "exercise 6: the missing torque and the add-on");
  assert.equal(ex6.parts[0].value, round(T.missingTorqueNm(140, 0.20, 90, 0.25), 3),
    "missing torque re-derived");
  assert.equal(ex6.parts[1].value,
    round(T.thirdClampAddG(T.thirdClampTotalG(140, 0.20, 90, 0.25, 0.10), 40), 6),
    "added grams re-derived");

  const ex7 = byQ(/ignore the mass/i);
  assert.ok(ex7 && ex7.type === "choice", "exercise 7: ignoring the clamps");
  assert.match(ex7.options[ex7.correct], /farther/i, "the correct option says farther");

  const ex8 = byQ(/near 50 cm/i);
  assert.ok(ex8 && ex8.type === "keywords", "exercise 8: why the stick sits off 50");
  assert.ok(ex8.words.length >= 5 && ex8.need >= 2, "the keyword set is real");

  for (const p of payloads) {
    assert.ok(Array.isArray(p.hints) && p.hints.length >= 1, p.q.slice(0, 30) + " needs hints");
    assert.ok(p.working && p.answer, p.q.slice(0, 30) + " needs working+answer");
  }
});

// ---- purity ------------------------------------------------------------------

test("torque.js is pure: no wall clock, no DOM", () => {
  const src = fs.readFileSync(MOD, "utf8");
  assert.doesNotMatch(src, /Date\.now|new Date|performance\.now/, "no clock reads");
  assert.doesNotMatch(src, /\bdocument\b|querySelector/, "no DOM access");
});
