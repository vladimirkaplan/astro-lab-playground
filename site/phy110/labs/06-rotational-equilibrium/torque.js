// PHY110 Lab 6 maths: torque balance on a meter stick.
// Two equations carry the lab:
//   tau = F d           (torque in N m; d is the lever arm from the pivot, in m)
//   tau_ccw = tau_cw    (equilibrium: F1 d1 = F2 d2)
// With hanging masses g cancels in the balance condition, so the bench
// reasons in gram-metres and prints newton-metres.
//
// Printed course values: g = 9.80 m/s^2; Part I runs 100 g on the left at
// X1 = 0.30 m against 50 g on the right; the gate figure is the 3-4-5 m
// layout of Figure 3 with a 400 N force at the far corner; the bag question
// is 20 lb at 80 cm against a bag at 60 cm, with the course factor 0.45
// taking lb to kg.
//
// Measured, not printed: the clamp-and-hanger mass (40 g in the drawer) and
// the balance point X0 (0.50 m in the drawer). Real sticks balance near 50
// cm, rarely exactly at it, and the clamps are not massless; the bench shows
// both and treats a 1-3 % torque difference as level.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var F = {};

  // ---------- course constants ----------
  F.G = 9.80;                  // m/s^2, printed
  F.CLAMP_G = 40;              // clamp + hanger, measured, not printed
  F.X0 = 0.50;                 // balance point in m, measured, not printed
  F.X1 = 0.30;                 // printed Part I / Part II left mark, in m
  F.PART1_LEFT_G = 100;        // printed Part I hook weight, left
  F.PART1_RIGHT_G = 50;        // printed Part I hook weight, right
  F.PART2_KNOWN_G = 100;       // Part II known hook weight on the right
  F.GATE_FORCE_N = 400;        // the Figure 3 force
  F.GATE = Object.freeze({ shortM: 3, longM: 4, diagM: 5 });
  F.LB_TO_KG = 0.45;           // course factor, as printed
  F.BAG = Object.freeze({ lb: 20, nearCm: 80, farCm: 60 });
  F.PART3 = Object.freeze({ leftG: 140, leftD: 0.20, rightG: 90, rightD: 0.25, d3: 0.10 });
  F.LEVEL_OK_PCT = 3;          // a 1-3 % torque difference still reads level

  // ---------- the sim's own props (shown in the drawer) ----------
  F.FUN_X0 = 0.497;            // Fun Mode: the stick's true balance point sits off 50 cm
  F.WEIGH_JITTER_G = 1;        // Fun Mode triple-beam reading, +-1 g
  F.WOBBLE_DEG = 0.6;          // Fun Mode: the eye-level wobble, in degrees of tilt

  // ---------- forces and torques ----------
  F.forceN = function (massG) {
    return (massG || 0) / 1000 * F.G;
  };
  F.torque = function (forceN, dM) {
    return forceN * dM;
  };
  // gram-metres: the balance condition before g is cancelled out
  F.torqueGm = function (massG, dM) {
    return (massG || 0) * dM;
  };
  F.pctDiff = function (a, b) {
    if (!isFinite(a) || !isFinite(b) || !b) return NaN;
    return Math.abs(a - b) / Math.abs(b) * 100;
  };
  // lever arms from the marks on the stick: left of the pivot is X0 - X1
  F.dLeft = function (x0, x1) { return x0 - x1; };
  F.dRight = function (x0, x2) { return x2 - x0; };

  // ---------- the balance condition ----------
  // left total x d1 = right total x d2 (grams are fine: g cancels)
  F.balanceD2 = function (mLeftG, d1, mRightG) {
    if (!mRightG || !isFinite(d1)) return NaN;
    return mLeftG * d1 / mRightG;
  };
  F.balanceX2 = function (x0, d2) { return x0 + d2; };
  // Part II printed form: M_u = (M_k + M_c) d2/d1 - M_c
  F.unknownMassG = function (mkG, clampG, d1, d2) {
    if (!d1) return NaN;
    return (mkG + clampG) * d2 / d1 - clampG;
  };
  // Part III: what the third clamp must supply
  F.missingTorqueNm = function (leftG, d1, rightG, d2) {
    return Math.abs(F.forceN(leftG) * d1 - F.forceN(rightG) * d2);
  };
  F.thirdClampTotalG = function (leftG, d1, rightG, d2, d3) {
    if (!d3) return NaN;
    return F.missingTorqueNm(leftG, d1, rightG, d2) / (F.G * d3) * 1000;
  };
  F.thirdClampAddG = function (totalG, clampG) { return totalG - clampG; };

  // ---------- the printed theory questions ----------
  F.bagMassLb = function (lb, nearCm, farCm) {
    if (!farCm) return NaN;
    return lb * nearCm / farCm;
  };
  F.bagMassKg = function (lb, nearCm, farCm) {
    return F.bagMassLb(lb, nearCm, farCm) * F.LB_TO_KG;
  };
  // Figure 3, the standard 3-4-5 reading: the lever arm is 3 x 4/5
  F.gateLeverArm = function (shortM, longM, diagM) {
    if (!diagM) return NaN;
    return shortM * longM / diagM;
  };
  F.gateTorque = function (forceN, dM) { return forceN * dM; };

  // ---------- level judgement ----------
  F.isLevel = function (tauCcw, tauCw, okPct) {
    if (okPct === undefined) okPct = F.LEVEL_OK_PCT;
    if (!isFinite(tauCcw) || !isFinite(tauCw)) return false;
    var big = Math.max(Math.abs(tauCcw), Math.abs(tauCw));
    if (!big) return true;
    return Math.abs(tauCcw - tauCw) / big * 100 <= okPct;
  };

  root.LS.torque = F;
})(typeof globalThis !== "undefined" ? globalThis : window);
