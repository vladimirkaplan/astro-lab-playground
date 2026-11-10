// Phases of Venus pure geometry + the rival Ptolemaic predictions.
// Geometry convention (matches the sim): circular coplanar orbits, Sun at the
// origin, Earth fixed at (1, 0) AU, Venus at (A cos th, A sin th) AU with
// A = 0.723. th is the heliocentric angle Venus-minus-Earth in DEGREES,
// counterclockwise: th = 0 is inferior conjunction (Venus between Earth and
// Sun), th = 180 is superior conjunction. Positive th means Venus is east of
// the Sun as seen from Earth (evening object), negative th west (morning).
//
// elong = signed Sun->Earth->Venus angle, capped at asin(A) = 46.3 deg, which
// is why Venus never strays far from the Sun. i = phase angle Sun-Venus-Earth;
// lit percent = (1 + cos i) / 2 * 100, so Venus looks full behind the Sun and
// crescent between Earth and the Sun. The pto* functions are the Ptolemaic
// model, where Venus rides an epicycle centred on the Earth-Sun line.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var V = {};

  V.A = 0.723;                  // Venus semi-major axis, AU
  V.VENUS_DIAM_KM = 12104;
  V.AU_KM = 1.496e8;
  V.MAX_ELONG_THEORY = 46.3;    // asin(A) in degrees

  function rad(deg) { return deg * Math.PI / 180; }
  function deg(x) { return x * 180 / Math.PI; }
  function acos(x) { return deg(Math.acos(x < -1 ? -1 : (x > 1 ? 1 : x))); }
  function round1(x) { return Math.round(x * 10) / 10; }

  // Fold any input angle onto (-180, 180]; nothing else normalizes.
  function normDeg(thDeg) {
    var e = ((thDeg % 360) + 360) % 360;
    return e > 180 ? e - 360 : e;
  }

  V.pos = function (thDeg) {
    var t = rad(normDeg(thDeg));
    return { vx: V.A * Math.cos(t), vy: V.A * Math.sin(t), ex: 1, ey: 0 };
  };

  V.distEV = function (thDeg) {
    var p = V.pos(thDeg);
    var dx = p.vx - p.ex, dy = p.vy - p.ey;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Angle between the Earth->Sun and Earth->Venus directions, signed by the
  // cross product (positive = Venus east of the Sun) and normalized so it can
  // never run past the asin(A) = 46.3 degree ceiling.
  V.elongation = function (thDeg) {
    var p = V.pos(thDeg);
    var vx = p.vx - p.ex, vy = p.vy - p.ey;   // Earth -> Venus
    var sx = -p.ex, sy = -p.ey;               // Earth -> Sun
    var m = Math.sqrt(vx * vx + vy * vy) * Math.sqrt(sx * sx + sy * sy);
    var ang = acos((vx * sx + vy * sy) / m);
    return vx * sy - vy * sx < 0 ? -ang : ang;
  };

  // Phase angle at Venus, Sun-Venus-Earth: 0 at superior conjunction (fully
  // lit disk), 180 at inferior conjunction (new).
  V.phaseAngle = function (thDeg) {
    var p = V.pos(thDeg);
    var sx = -p.vx, sy = -p.vy;               // Venus -> Sun
    var ex = p.ex - p.vx, ey = p.ey - p.vy;   // Venus -> Earth
    var m = Math.sqrt(sx * sx + sy * sy) * Math.sqrt(ex * ex + ey * ey);
    return acos((sx * ex + sy * ey) / m);
  };

  V.illum = function (thDeg) {
    return (1 + Math.cos(rad(V.phaseAngle(thDeg)))) / 2 * 100;
  };

  V.apparentDiamArcsec = function (thDeg) {
    var distKM = V.distEV(thDeg) * V.AU_KM;
    return deg(2 * Math.atan((V.VENUS_DIAM_KM / 2) / distKM)) * 3600;
  };

  V.name = function (thDeg) {
    var f = V.illum(thDeg);
    if (f < 2) return "new";
    if (f < 45) return "crescent";
    if (f < 55) return "half (dichotomy)";
    if (f < 98) return "gibbous";
    return "full";
  };

  V.elongLabel = function (thDeg) {
    var e = V.elongation(thDeg);
    if (Math.abs(e) < 1) return "";
    return e > 0 ? "evening (east of the Sun)" : "morning (west of the Sun)";
  };

  // Ptolemy: Venus rides an epicycle centred on the Earth-Sun line, so it is
  // never carried far enough from that line to show more than a half-lit disk.
  // The model forbids gibbous and full Venus, and it also predicts an almost
  // constant apparent size, since the epicycle holds Venus at a fixed distance.
  V.ptoLeansIllum = function (thDeg) {
    var f = V.illum(thDeg);
    return f > 50 ? 50 : f;
  };

  V.ptoApparentDiamArcsec = function (thDeg) {
    return V.apparentDiamArcsec(180);
  };

  V.summary = function (thDeg) {
    return {
      elong: round1(V.elongation(thDeg)),
      illum: round1(V.illum(thDeg)),
      diamArcsec: round1(V.apparentDiamArcsec(thDeg)),
      name: V.name(thDeg),
      elongLabel: V.elongLabel(thDeg)
    };
  };

  root.LS.venus = V;
})(typeof globalThis !== "undefined" ? globalThis : window);
