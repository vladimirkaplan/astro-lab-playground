// PHY110 Lab 4 maths: Atwood's machine and Newton's second law.
// One equation carries the lab:
//   a_theory = (m2 - m1) g / (m1 + m2 + M/2)
// the measured side reads the same motion the other way:
//   a_measured = 2h / t^2
// with course g = 9.80 m/s^2 and a data page of four trials, five
// timed drops each.
//
// Grams stay grams: every mass in the theory line sits inside one ratio, so
// the units cancel and no kg conversion is needed. The pulley is a solid
// disc, so it enters with half its mass.
//
// Not printed in the manual: the holder and pulley masses are stamped on the
// real apparatus, so the sim assumes holders 50 g and pulley 70 g and prints
// them in its constants drawer.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var F = {};

  // ---------- course constants ----------
  F.G = 9.80;                    // m/s^2, the course value
  F.HOLDER_G = 50;               // each weight holder (stamped, not printed)
  F.PULLEY_G = 70;               // the pulley (stamped, not printed)
  F.TIMINGS_PER_TRIAL = 5;
  F.TRIALS = 4;
  // Course bench pattern: trial 1 differs by about 10 g between the holders;
  // each later trial adds about 20 g to BOTH holders, so the difference
  // stays 10 g and the fall stays slow enough to time.
  F.COURSE_TRIALS = Object.freeze([
    Object.freeze({ m1: 150, m2: 160 }),
    Object.freeze({ m1: 170, m2: 180 }),
    Object.freeze({ m1: 190, m2: 200 }),
    Object.freeze({ m1: 210, m2: 220 })
  ]);
  // Course rule: keep the mass difference small (about 10 g). A bigger
  // difference makes the fall fast to time.
  F.MAX_DIFF_G = 20;
  // Fun Mode instrument bias: a real pulley loses part of the drive to
  // friction and its string, so measured a lands a little BELOW theory.
  F.FUN_BIAS_MIN = 0.02;
  F.FUN_BIAS_MAX = 0.08;
  // The stop-button slip a hand adds to each recorded time, in seconds.
  F.STOP_SLIP_S = 0.05;

  // ---------- the theory side ----------
  // m1 rises, m2 falls; M is the pulley mass. Grams are fine: the ratio
  // cancels the units.
  F.aTheory = function (m1, m2, M, g) {
    g = g || F.G;
    var inertia = (m1 || 0) + (m2 || 0) + (M || 0) / 2;
    if (inertia <= 0) return NaN;
    return (m2 - m1) * g / inertia;
  };
  // The pulley-less form, so the page can show what ignoring the pulley costs.
  F.aTheoryNoPulley = function (m1, m2, g) {
    g = g || F.G;
    var inertia = (m1 || 0) + (m2 || 0);
    if (inertia <= 0) return NaN;
    return (m2 - m1) * g / inertia;
  };
  // Percent by which the pulley-less value sits above the true one.
  F.pulleyCostPct = function (m1, m2, M) {
    var aTrue = F.aTheory(m1, m2, M);
    var aBare = F.aTheoryNoPulley(m1, m2);
    if (!isFinite(aTrue) || !aTrue) return NaN;
    return (aBare - aTrue) / aTrue * 100;
  };

  // ---------- the measured side ----------
  // From rest over a drop h in a time t.
  F.aMeasured = function (h, t) {
    if (!isFinite(t) || t <= 0) return NaN;
    return 2 * h / (t * t);
  };
  F.fallTime = function (h, a) {
    if (!isFinite(a) || a <= 0) return NaN;
    return Math.sqrt(2 * h / a);
  };

  // ---------- the data-page bookkeeping ----------
  F.mean = function (values) {
    if (!values || !values.length) return NaN;
    var s = 0;
    for (var i = 0; i < values.length; i++) s += values[i];
    return s / values.length;
  };
  // a for one trial: from the AVERAGE of that trial's five times.
  F.aForTrial = function (h, timings) {
    var list = (timings || []).filter(isFinite);
    if (!list.length) return NaN;
    return F.aMeasured(h, F.mean(list));
  };

  // The manual prints no denominator for the percent difference, so the sim
  // picks one, prints it, and the check accepts the other:
  //   on the mean    |m - t| / ((m + t) / 2)
  //   on the theory  |m - t| / |t|
  F.pctDiffMean = function (meas, theory) {
    var mid = (meas + theory) / 2;
    if (!mid) return NaN;
    return Math.abs(meas - theory) / Math.abs(mid) * 100;
  };
  F.pctDiffTheory = function (meas, theory) {
    if (!theory) return NaN;
    return Math.abs(meas - theory) / Math.abs(theory) * 100;
  };

  // ---------- Fun Mode model ----------
  // The instrument's per-trial loss: a fraction of the drive, drawn once per
  // trial by the sim (the module stays pure, so the draw lives in sim.js).
  F.biasA = function (a, bias) {
    return a * (1 - bias);
  };
  F.inBiasBand = function (bias) {
    return bias >= F.FUN_BIAS_MIN && bias <= F.FUN_BIAS_MAX;
  };

  // ---------- mass bookkeeping ----------
  F.total = function (holderG, addedG) { return (holderG || 0) + (addedG || 0); };
  F.diff = function (m1, m2) { return Math.abs(m2 - m1); };
  F.breaksDiffRule = function (m1, m2) { return F.diff(m1, m2) > F.MAX_DIFF_G; };
  F.balanced = function (m1, m2) { return m1 === m2; };

  root.LS.atwood = F;
})(typeof globalThis !== "undefined" ? globalThis : window);
