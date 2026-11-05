// Lab 8 pendulum: pure physics, shared by the sim and the tests.
// The sim integrates theta'' = -(g/L) sin(theta) for animation, but keeps
// honest scores using the analytic large-amplitude period correction.
(function (root) {
  "use strict";
  root.LS = root.LS || {};
  var P = {};

  // Model gravity of the sim ("Earth station"). Displayed in the sim chrome
  // so exercises can be graded honestly.
  P.G_SIM = 9.806;
  P.COURSE_PI = 3.14;             // the course's fixed pi for hand arithmetic

  // Series for the period ratio vs release angle theta0 (small-angle period
  // is multiplied by this; accurate far past the angles this lab uses).
  P.periodRatio = function (theta0Deg) {
    var t = theta0Deg * Math.PI / 180 / 2;
    var s = Math.sin(t);
    return 1 + s * s + (9 / 16) * Math.pow(s, 4);
  };

  // Full period in seconds. L in meters.
  P.period = function (LMeters, g, theta0Deg) {
    return 2 * Math.PI * Math.sqrt(LMeters / g) * P.periodRatio(theta0Deg || 0);
  };

  // Course formula direction: from a measured T and L, what g do you get,
  // using a chosen value of pi (class hand math uses 3.14).
  P.gFromTL = function (LMeters, T, piValue) {
    var pi = piValue || Math.PI;
    return 4 * pi * pi * LMeters / (T * T);
  };

  // T^2 = (4 pi^2 / g) L  =>  slope of T^2-vs-L (SI units).
  P.slopeFromG = function (g, ratio) { return 4 * Math.PI * Math.PI / g * Math.pow(ratio || 1, 2); };
  P.gFromSlope = function (slope) { return 4 * Math.PI * Math.PI / slope; };

  // Course-preset lengths, cm (kept fixed in Course Mode).
  P.PRESETS_CM = [30, 55, 75, 100];

  // Half-period wall-clock between the 'swing gate' flashes for the UI.
  P.gateInterval = function (LMeters, g, theta0Deg, speedScale) {
    return P.period(LMeters, g, theta0Deg) / (2 * (speedScale || 1));
  };

  root.LS.pendulum = P;
})(typeof globalThis !== "undefined" ? globalThis : window);
