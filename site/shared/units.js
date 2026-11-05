// Shared units, conversions, and math helpers. Plain script so the whole site
// works over file:// (browsers block ES module imports there). Same file loads
// in Node for unit tests. Prose-free: pure data and functions only.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var U = {};

  // Fixed conversion values. COURSE_* are the numbers this course's lab manual
  // treats as given (e.g. its ounce-to-gram factor); TRUE_* are the accepted SI
  // equivalents. Both are kept so Course Mode and reality can disagree honestly.
  U.CM_PER_IN = 2.54;               // exact by definition since 1959
  U.COURSE_G_PER_OZ = 28.57;        // the lab manual's conversion demonstration value
  U.TRUE_G_PER_OZ = 28.3495;        // international avoirdupois ounce
  U.OZ_PER_LB = 16;
  U.C_PER_K = function (k) { return k - 273.15; };
  U.K_PER_C = function (c) { return c + 273.15; };

  // US Mint design weights in grams (the coins this lab uses).
  U.COINS = {
    penny:   { label: "Penny (1 cent)",   g: 2.500,  note: "zinc core with copper plating" },
    nickel:  { label: "Nickel (5 cent)",  g: 5.000,  note: "75% copper, 25% nickel" },
    dime:    { label: "Dime (10 cent)",   g: 2.268,  note: "copper-nickel clad" },
    quarter: { label: "Quarter (25 cent)", g: 5.670,  note: "copper-nickel clad" }
  };

  // Percent error, always positive (lab courses want magnitude).
  U.percentError = function (measured, accepted) {
    if (!accepted) return NaN;
    return Math.abs(measured - accepted) / Math.abs(accepted) * 100;
  };

  // Is x within a percent tolerance of target? tol is given in percent.
  U.near = function (x, target, tolPercent) {
    if (!isFinite(x)) return false;
    if (target === 0) return Math.abs(x) <= tolPercent;
    return Math.abs(x - target) / Math.abs(target) * 100 <= tolPercent;
  };

  U.inchesToFeetInches = function (totalInches) {
    var sign = totalInches < 0 ? -1 : 1;
    var t = Math.round(Math.abs(totalInches) * 1000) / 1000;
    var ft = Math.floor(t / 12);
    var inch = t - ft * 12;
    return { ft: sign * ft, in: inch, inTotal: t };
  };

  // Parse "44 ft 2 in" style strings loosely: returns {ft, in} or null.
  U.parseFeetInches = function (text) {
    var ft = null, inch = null;
    var mft = /(-?\d+(?:\.\d+)?)\s*(?:ft|feet|')/i.exec(text);
    var min = /(-?\d+(?:\.\d+)?)\s*(?:in|inches?|")/i.exec(text);
    if (mft) ft = parseFloat(mft[1]);
    if (min) inch = parseFloat(min[1]);
    if (ft === null && inch === null) {
      var plain = parseFloat(text);
      if (isFinite(plain)) return { ft: null, in: plain, inTotal: plain };
      return null;
    }
    var total = null;
    if (ft !== null && inch !== null) total = ft * 12 + inch;
    else if (ft !== null) total = ft * 12;
    else total = inch;
    return { ft: ft, in: inch, inTotal: total };
  };

  // Round to n decimal places without float noise surprises like 0.30000000004.
  U.round = function (x, n) {
    var p = Math.pow(10, n || 0);
    return Math.round((x + Number.EPSILON * Math.abs(x)) * p) / p;
  };

  // Deterministic little PRNG (mulberry32). Sims use it so Fun Mode noise is
  // reproducible per seed, and tests can pin results.
  U.mulberry32 = function (seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  U.clamp = function (x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); };

  root.LS.units = U;
})(typeof globalThis !== "undefined" ? globalThis : window);
