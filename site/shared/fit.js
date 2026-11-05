// Line fitting math used by the plot tool (Lab 15 especially). Pure functions,
// no DOM, Node-loadable for tests.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var F = {};

  // Ordinary least squares y = a + b*x. Returns {slope, intercept, n}.
  F.linearLeastSquares = function (xs, ys) {
    var n = Math.min(xs.length, ys.length);
    if (n < 2) return null;
    var sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (var i = 0; i < n; i++) {
      sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i];
    }
    var denom = n * sxx - sx * sx;
    if (denom === 0) return null;
    var slope = (n * sxy - sx * sy) / denom;
    var intercept = (sy - slope * sx) / n;
    return { slope: slope, intercept: intercept, n: n };
  };

  // Best fit forced through the origin: y = b*x. This is what the balloon
  // Hubble-law graph expects (a galaxy at zero distance recedes at zero speed).
  F.throughOrigin = function (xs, ys) {
    var n = Math.min(xs.length, ys.length);
    if (n < 1) return null;
    var sxx = 0, sxy = 0;
    for (var i = 0; i < n; i++) {
      sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i];
    }
    if (sxx === 0) return null;
    return { slope: sxy / sxx, intercept: 0, n: n };
  };

  // Hubble's law bookkeeping. ageGyr(H0): 1/H0 in Gyr for H0 in km/s/Mpc.
  // Derivation: 1 Mpc = 3.0857e19 km; 1 yr = 3.15576e7 s; so 1/H0 years
  // = 3.0857e19 / (3.15576e7 * H0) = 9.778e11 / H0.
  F.hubbleAgeGyr = function (H0) {
    if (!H0) return NaN;
    return 977.8 / H0;
  };

  // Scatter a point cloud makes around a y = b*x law, as a rough percent.
  F.scatterPercent = function (xs, ys, slope) {
    var n = Math.min(xs.length, ys.length);
    if (!n) return 0;
    var s = 0, c = 0;
    for (var i = 0; i < n; i++) {
      var expect = slope * xs[i];
      if (expect > 0) { s += Math.abs(ys[i] - expect) / expect; c++; }
    }
    return c ? (s / c) * 100 : 0;
  };

  root.LS.fit = F;
})(typeof globalThis !== "undefined" ? globalThis : window);
