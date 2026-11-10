// PHY110 Lab 12 maths: reflection, refraction, and the critical angle.
// theta_i = theta_r (law of reflection, angles from the normal).
// n = c/v = lambda_0 / lambda_m (index of refraction).
// n1 sin theta_1 = n2 sin theta_2 (Snell's law).
// Critical angle, dense to rare: n = 1 / sin(theta_c), n_air = 1.
//
// Printed: c = 3.0e8 m/s; water index 1.333 at 589 nm (printed Table III,
// Appendix p 89 / PDF 91); air 1.000; the printed incidence sets - reflection
// 45 to 80 degrees in 5-degree steps, refraction 10 to 80 in 10-degree steps.
// Not printed, shown in the drawer: the laser wavelength, red 650 nm; the
// manual keeps its single water index 1.333 at that wavelength too (an honest
// footnote, not a grading difference).
// Honesty: the beam has width, so scale readings are about +-1 degree off;
// total internal reflection comes on gradually, dimming the refracted beam
// near the critical angle instead of switching it off; a tilted surface or an
// off-centre laser biases every reading (both are selectable error modes).
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var O = {};
  var RAD = Math.PI / 180;

  // ---------- course constants ----------
  O.C = 3.0e8;                 // m/s, printed
  O.N_WATER = 1.333;           // at 589 nm, printed Table III
  O.N_AIR = 1.000;
  O.LASER_NM = 650;            // red laser, NOT printed
  O.REFLECTION_SET = Object.freeze([45, 50, 55, 60, 65, 70, 75, 80]);
  O.REFRACTION_SET = Object.freeze([10, 20, 30, 40, 50, 60, 70, 80]);
  O.SCALE_NOISE_DEG = 1;       // +-1 degree beam-width reading, Fun Mode
  O.TILT_DEG = 2;              // levelling-screw error mode
  O.OFFCENTER_DEG = 1.5;       // off-centre laser error mode

  O.rad = function (d) { return d * RAD; };
  O.deg = function (r) { return r / RAD; };

  // ---------- the two laws ----------
  O.reflect = function (thetaI) { return thetaI; };
  // Snell: NaN when the ray cannot refract (total internal reflection)
  O.refractDeg = function (n1, theta1Deg, n2) {
    var s = (n1 * Math.sin(O.rad(theta1Deg))) / n2;
    if (s > 1) return NaN;
    return O.deg(Math.asin(s));
  };
  O.isTIR = function (n1, theta1Deg, n2) {
    return (n1 * Math.sin(O.rad(theta1Deg))) / n2 > 1;
  };
  // critical angle, dense (n1) to rare (n2): sin theta_c = n2 / n1
  O.criticalDeg = function (n1, n2) {
    if (!(n1 > n2)) return NaN;
    return O.deg(Math.asin(n2 / n1));
  };
  // dense-side index from a measured critical angle, n_rare = 1
  O.indexFromCritical = function (thetaC) {
    if (!(thetaC > 0)) return NaN;
    return 1 / Math.sin(O.rad(thetaC));
  };

  // ---------- the boundary bookkeeping ----------
  O.speedIn = function (n) { return n ? O.C / n : NaN; };
  // frequency is unchanged; the wavelength scales
  O.lambdaIn = function (lam0, n1, n2) {
    if (!n2) return NaN;
    return lam0 * (n1 / n2);
  };

  O.pctError = function (measured, accepted) {
    if (!accepted) return NaN;
    return Math.abs(measured - accepted) / Math.abs(accepted) * 100;
  };

  // ---------- graphs ----------
  // least squares y = m x + b
  O.fitLine = function (pts) {
    if (!pts || pts.length < 2) return null;
    var n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (var i = 0; i < n; i++) {
      sx += pts[i].x; sy += pts[i].y;
      sxx += pts[i].x * pts[i].x; sxy += pts[i].x * pts[i].y;
    }
    var den = n * sxx - sx * sx;
    if (!den) return null;
    var m = (n * sxy - sx * sy) / den;
    return { m: m, b: (sy - m * sx) / n };
  };

  // ---------- the honest instrument ----------
  // the refracted beam dims across the critical angle instead of switching off
  O.tirDim = function (thetaI, thetaC) {
    return Math.max(0, Math.min(1, (thetaC + 1.5 - thetaI) / 3));
  };

  O.accepted = Object.freeze({
    c: 3.0e8, nWater: 1.333, nAir: 1.000,
    criticalWaterAir: O.criticalDeg(1.333, 1.000),   // 48.6
    slopeReflect: 1.0
  });

  root.LS.refraction = O;
})(typeof globalThis !== "undefined" ? globalThis : window);
