// PHY110 Lab 9 maths: Ohm's law from a V-I line.
// R = V / I, and with V (vertical) against I (horizontal) the line runs
// through the origin with slope R in ohms.
// Printed course values: the two resistor modules, nominal 200 ohm and
// 100 ohm, and the printed set-points - 200 ohm at 2, 4, 6, 8, 10, 11 V;
// 100 ohm at 1, 2, 3, 4, 5, 5.5 V. Ammeter on the 100 mA scale in series,
// voltmeter on the 15 V range across the resistor. 1 A = 1000 mA.
//
// Honesty items: carbon resistors warm up and drift by up to 1-2 %, so the
// best-fit line is not perfect; analog faces give parallax, so a +-1 mA
// reading noise is allowed. Ammeter lead resistance pushes the slope
// slightly low and voltmeter loading slightly high; both are below this
// bench's resolution and are named rather than hidden. The 5.5 V cap on the
// 100 ohm run is a meter-range artefact, not physics: 11 V would give
// 110 mA, past the 100 mA stop.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var O = {};

  // ---------- course constants ----------
  O.SETS = Object.freeze({
    R200: { nominal: 200, setpoints: [2, 4, 6, 8, 10, 11] },
    R100: { nominal: 100, setpoints: [1, 2, 3, 4, 5, 5.5] }
  });
  O.AMMETER_MA = 100;       // the ammeter scale stop
  O.VOLTMETER_V = 15;       // the voltmeter range
  O.MA_PER_A = 1000;        // 1 A = 1000 mA, printed

  // ---------- Ohm's law both directions ----------
  O.currentA = function (R, V) {
    if (!R) return NaN;
    return (V || 0) / R;
  };
  O.currentMa = function (R, V) { return O.currentA(R, V) * O.MA_PER_A; };
  O.voltageV = function (R, I_A) { return R * (I_A || 0); };
  // would this point peg the ammeter?
  O.overAmmeter = function (R, V) { return O.currentMa(R, V) > O.AMMETER_MA; };
  // the highest set-point a run can use without passing the stop
  O.highestSafeSetpoint = function (R, list) {
    var best = null;
    for (var i = 0; i < list.length; i++) {
      if (!O.overAmmeter(R, list[i])) best = list[i];
    }
    return best;
  };

  // ---------- slopes ----------
  // the two-point slope through the origin and one point
  O.slope2pt = function (x1, y1, x2, y2) {
    if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) return NaN;
    if (x2 === x1) return NaN;
    return (y2 - y1) / (x2 - x1);
  };
  // least-squares slope of V (vertical) against I (horizontal), forced
  // through (0,0): R = sum(V I) / sum(I^2)
  O.slopeThroughOrigin = function (points) {
    var sivi = 0, sii = 0;
    for (var i = 0; i < points.length; i++) {
      var v = points[i].v, ia = points[i].i;
      if (!isFinite(v) || !isFinite(ia)) return NaN;
      sivi += v * ia;
      sii += ia * ia;
    }
    if (!sii) return NaN;
    return sivi / sii;
  };

  // ---------- error against the nominal ----------
  O.pctError = function (measured, nominal) {
    if (!nominal) return NaN;
    return Math.abs(measured - nominal) / Math.abs(nominal) * 100;
  };

  // ---------- the honest instruments ----------
  O.WARM_DRIFT_MAX = 0.02;  // up to 2 % warm-up drift, Fun Mode
  O.NOISE_MA = 1;           // +-1 mA parallax, Fun Mode
  O.driftedR = function (nominal, rnd) {
    return nominal * (1 + O.WARM_DRIFT_MAX * (rnd || 0));
  };

  // the printed run the bench names out loud
  O.accepted = Object.freeze({
    r200: 200, r100: 100,
    ammeterMa: 100, voltmeterV: 15
  });

  root.LS.ohmslaw = O;
})(typeof globalThis !== "undefined" ? globalThis : window);
