// Lab 2 mathematics: the circle bench (measure pi as a ratio), the small-angle
// formula (coin at arm's length, Moon and Sun in the sky), and honest scientific
// notation. No sim, no DOM: pure numbers so node --test can pin every result.
//
// Small-angle convention: delta_arcsec = 206265 * d / D, where d is the true
// diameter and D the distance in the SAME length units. 206265 is the number of
// arcseconds in one radian (180/pi*3600 = 206264.8, rounded). The formula is an
// approximation of 2*atan(d/2D); below about 2 degrees the two agree far inside
// any student measurement.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var M = {};

  M.PI_COURSE = 3.14;           // the value this course's manual treats as given
  M.K = 206265;                 // arcseconds per radian, course-rounded
  M.ARM_LENGTH_M = 0.75;        // one honest arm's length used in the exercises

  // Circle bench: the student's OWN measured circumference and diameter give
  // the measured pi. Everything downstream is a ratio, so any ruler unit works
  // as long as both numbers use the same one.
  M.piMeasured = function (circumference, diameter) {
    if (!diameter) return NaN;
    return circumference / diameter;
  };

  // Small-angle trio. angDeg takes/stores DEGREES on the outside, arcsec
  // inside, because 0.5 deg reads as nothing and 1860 arcsec reads as physics.
  M.angArcsec = function (diam, dist) {
    if (!dist) return NaN;
    return M.K * diam / dist;
  };
  M.angDeg = function (diam, dist) { return M.angArcsec(diam, dist) / 3600; };
  M.angArcmin = function (diam, dist) { return M.angArcsec(diam, dist) / 60; };
  M.linearFromAng = function (angArcsec, dist) { return angArcsec * dist / M.K; }
  M.distFromAng = function (diam, angArcsec) {
    if (!angArcsec) return NaN;
    return diam * M.K / angArcsec;
  };

  // Exact angular diameter, same units in and out of the ratio. The sim draws
  // with this; the taught formula is the small-angle one. They must agree.
  M.exactAngDeg = function (diam, dist) {
    if (!dist) return NaN;
    return 2 * Math.atan((diam / 2) / dist) * 180 / Math.PI;
  };

  // Reference objects the sim renders. Values are the standard public ones
  // (OpenStax Astronomy 2e appendix figures, rounded to 4 significant digits).
  M.OBJECTS = {
    moon:    { label: "The Moon",   dKm: 3475,     Dkm: 384400 },
    sun:     { label: "The Sun",    dKm: 1.392e6,  Dkm: 1.496e8 },
    jupiter: { label: "Jupiter",    dKm: 139820,   Dkm: 7.785e8 },
    venus:   { label: "Venus",      dKm: 12104,    Dkm: 1.14e8 }
  };

  // US Mint design DIAMETERS in mm (a different property from the coin masses
  // in shared/units.js, which are weights).
  M.COINS = {
    penny:   { label: "Penny (1 cent)",   mm: 19.05 },
    nickel:  { label: "Nickel (5 cent)",  mm: 21.21 },
    dime:    { label: "Dime (10 cent)",   mm: 17.91 },
    quarter: { label: "Quarter (25 cent)", mm: 24.26 }
  };

  // The eclipse coincidence: the Sun is ~400 times wider than the Moon AND
  // ~400 times farther. If the two ratios do not match, the sizes in the sky
  // do not match either.
  M.sunMoonSizeRatio = function () {
    return M.OBJECTS.sun.dKm / M.OBJECTS.moon.dKm;
  };
  M.sunMoonDistRatio = function () {
    return M.OBJECTS.sun.Dkm / M.OBJECTS.moon.Dkm;
  };

  // Scientific notation: split into coefficient in [1, 10) and exponent.
  M.sciParts = function (x) {
    if (!isFinite(x) || x === 0) return { coef: 0, exp: 0 };
    var sign = x < 0 ? -1 : 1;
    var ax = Math.abs(x);
    var exp = Math.floor(Math.log10(ax));
    var coef = sign * ax / Math.pow(10, exp);
    // log10 can land a hair under an integer boundary; coef fixes it.
    if (Math.abs(coef) >= 10) { coef /= 10; exp += 1; }
    return { coef: coef, exp: exp };
  };

  // Accepts "1.5x10^8", "1.5*10^8", "1.5e8", "150,000,000" or a plain number,
  // and returns the value (NaN if there is no number in there).
  M.parseSci = function (text) {
    if (typeof text === "number") return text;
    if (text === null || text === undefined) return NaN;
    var t = String(text).trim().replace(/\s+/g, "").replace(/,/g, "");
    var m = /^([-+]?\d*\.?\d+)?(?:[x×*]10(?:\^|\u00b9)?|e)([-+]?\d+)$/i.exec(t);
    if (m) return (m[1] === undefined ? 1 : parseFloat(m[1])) *
      Math.pow(10, parseInt(m[2], 10));
    var plain = /^[-+]?\d*\.?\d+$/.test(t) ? parseFloat(t) : NaN;
    return plain;
  };

  // Display form "3.84 x 10^5" with `digits` decimals on the coefficient.
  M.sciFormat = function (x, digits) {
    var p = M.sciParts(x);
    var d = typeof digits === "number" ? digits : 2;
    if (p.coef === 0) return "0";
    return p.coef.toFixed(d) + " x 10^" + p.exp;
  };

  root.LS.mathlab = M;
})(typeof globalThis !== "undefined" ? globalThis : window);
