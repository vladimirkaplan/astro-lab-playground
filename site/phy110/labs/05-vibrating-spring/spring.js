// PHY110 Lab 5 maths: spring constant and vertical spring periods.
// Two equations carry the lab:
//   F = K x          (Hooke's law; the hanging weight is the force)
//   T = 2 pi sqrt(m/K)   (course mode uses pi = 3.14, as printed)
// with course g = 9.80 m/s^2, a 50 g hanger, loads in 50 g steps for the K
// table and 200/220/240 g added for the period table, ten cycles per timing.
//
// Not printed in the manual: the hanger mass and the spring's stiffness are
// measured values, so the sim assumes a 50 g hanger and a spring near
// K = 50 N/m (extensions land in the 1.0-5.9 cm band) and prints both in its
// constants drawer.
//
// The period formula ignores the spring's own mass. A real coil carries some,
// and a third of it moves with the spring, so measured periods run a few
// percent long. Fun Mode models that with a 75 g spring (25 g effective);
// a few percent difference is correct behaviour, not failure.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var F = {};

  // ---------- course constants ----------
  F.G = 9.80;                 // m/s^2, printed
  F.PI = 3.14;                // printed: course mode uses 3.14, not 3.14159...
  F.HANGER_G = 50;            // the weight hanger (measured, not printed)
  F.K_ASSUMED = 50;           // N/m, the spring this sim hangs (measured, not printed)
  F.CYCLE_COUNT = 10;         // ten oscillations per timing
  // Table 1 (K): added masses, 50 g steps.
  F.K_TABLE_ADDED_G = Object.freeze([50, 100, 150, 200, 250]);
  // Table 2 (T): added masses.
  F.T_TABLE_ADDED_G = Object.freeze([200, 220, 240]);
  // The K table also carries the hanger-only baseline row plus the (0,0)
  // origin point on the F-x graph.
  F.ORIGIN = Object.freeze({ added: 0, total: 0 });

  // ---------- the sim's own props (shown in the drawer) ----------
  F.SPRING_MASS_G = 75;       // the coil's mass; a third of it moves with the spring
  F.EFFECTIVE_MASS_G = F.SPRING_MASS_G / 3;
  F.MAX_LOAD_G = 300;         // real springs creep and go non-linear near max load
  F.READ_JITTER_CM = 0.2;     // Fun Mode scale reading, +-0.2 cm
  F.STOP_SLIP_S = 0.10;       // Fun Mode stop-button slip at the 10th pass, up to
  F.X0_CM = 4.0;              // the no-hanger level the sim's scale starts from

  // ---------- Hooke's law, both directions ----------
  F.force = function (totalG) {
    return (totalG || 0) / 1000 * F.G;
  };
  // Elongation for a total hanging mass on a spring of stiffness K.
  F.elongationM = function (totalG, K) {
    if (K === undefined || K === null) K = F.K_ASSUMED;
    if (!K || K <= 0) return NaN;
    return F.force(totalG) / K;
  };
  F.elongationCm = function (totalG, K) {
    return F.elongationM(totalG, K) * 100;
  };
  // K from one load point: the hanging weight over the elongation.
  F.hookK = function (totalG, xCm) {
    if (!xCm) return NaN;
    return F.force(totalG) / (xCm / 100);
  };
  // x as the data page does it: x = x_f - x_0 (the figure style, e.g. 1.7 - 1.1 = 0.6 cm).
  F.elongationFromMarks = function (xfCm, x0Cm) {
    return xfCm - x0Cm;
  };

  // ---------- the period side ----------
  // T = 2 pi sqrt(m/K) with the course pi. m is the TOTAL hanging mass, in kg.
  F.period = function (totalG, K, extraG) {
    if (K === undefined || K === null) K = F.K_ASSUMED;
    if (!K || K <= 0 || (totalG || 0) <= 0) return NaN;
    var m = ((totalG || 0) + (extraG || 0)) / 1000;
    return 2 * F.PI * Math.sqrt(m / K);
  };
  F.freq = function (totalG, K, extraG) {
    var T = F.period(totalG, K, extraG);
    if (!isFinite(T)) return NaN;
    return 1 / T;
  };
  F.t10 = function (totalG, K, extraG) {
    var T = F.period(totalG, K, extraG);
    if (!isFinite(T)) return NaN;
    return F.CYCLE_COUNT * T;
  };
  // The spring's own mass, the reason measured T runs a few percent long.
  F.effectiveTotalG = function (totalG) {
    return (totalG || 0) + F.EFFECTIVE_MASS_G;
  };
  // Fun Mode period: the coil's moving third rides along.
  F.periodWithSpringMass = function (totalG, K) {
    return F.period(F.effectiveTotalG(totalG), K);
  };
  // The stretch that extra mass adds, as a percent of the massless period.
  F.springMassStretchPct = function (totalG, K) {
    var T0 = F.period(totalG, K);
    if (!isFinite(T0)) return NaN;
    return (F.periodWithSpringMass(totalG, K) / T0 - 1) * 100;
  };

  // ---------- the data-page bookkeeping ----------
  F.mean = function (values) {
    if (!values || !values.length) return NaN;
    var s = 0;
    for (var i = 0; i < values.length; i++) s += values[i];
    return s / values.length;
  };
  // K_average: the mean of the per-row K values (the five 50-250 g rows).
  F.kAverage = function (kList) {
    var list = (kList || []).filter(isFinite);
    return list.length ? F.mean(list) : NaN;
  };
  // % relative difference, denominator the trendline slope (as the spec computes it).
  F.kRelDiff = function (kAvg, kSlope) {
    if (!isFinite(kAvg) || !isFinite(kSlope) || !kSlope) return NaN;
    return Math.abs(kAvg - kSlope) / Math.abs(kSlope) * 100;
  };
  // % difference in T, denominator the theory value.
  F.tPctDiff = function (tMeas, tTheory) {
    if (!isFinite(tMeas) || !isFinite(tTheory) || !tTheory) return NaN;
    return Math.abs(tMeas - tTheory) / Math.abs(tTheory) * 100;
  };
  F.totalG = function (hangerG, addedG) {
    return (hangerG || 0) + (addedG || 0);
  };
  // Doubling behaviour: mass x4 -> period x2, exactly, because T goes as sqrt(m).
  F.periodRatioForMassScale = function (scale) {
    return Math.sqrt(scale);
  };

  root.LS.spring = F;
})(typeof globalThis !== "undefined" ? globalThis : window);
