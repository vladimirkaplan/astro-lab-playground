// PHY110 Lab 10 maths: series and parallel resistor rules.
// Series: I0 = I1 = I2, V0 = V1 + V2, R_total = R1 + R2.
// Parallel: V0 = V1 = V2, I0 = I1 + I2, 1/R_total = 1/R1 + 1/R2.
// R_measured = V0 / I0; P = V0*I0 = I0^2*R_total; 1 W = 1 V*A.
// Printed course values: R1 100 ohm and R2 200 ohm nominal, supply fixed
// at 6.0 V for both parts, ammeter 100 mA, voltmeter 15 V, 1 A = 1000 mA.
//
// Honesty items: parallel I0 = 90 mA sits close to the 100 mA stop and a
// third parallel resistor pegs it; real meters have internal resistance, so
// node voltages can be off by tens of mV; nominal resistors carry a +-5 %
// tolerance band the manual does not print, so a percent error near zero is
// suspicious, not excellent; a single run hides scatter, repeated runs are
// better practice.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var O = {};

  // ---------- course constants (all printed) ----------
  O.V0 = 6.0;              // the fixed supply, one set-point
  O.R1 = 100;              // nominal, printed
  O.R2 = 200;              // nominal, printed
  O.AMMETER_MA = 100;      // the ammeter scale stop
  O.VOLTMETER_V = 15;      // the voltmeter range
  O.MA_PER_A = 1000;       // 1 A = 1000 mA, printed
  O.TOL_PCT = 5;           // resistor tolerance band, NOT printed

  // ---------- the combination rules ----------
  O.seriesRt = function (r1, r2) { return r1 + r2; };
  O.parallelRt = function (r1, r2) {
    if (!r1 || !r2) return NaN;
    return (r1 * r2) / (r1 + r2);
  };
  // any number of resistors in parallel
  O.parallelOf = function (list) {
    if (!list || !list.length) return NaN;
    var inv = 0;
    for (var i = 0; i < list.length; i++) {
      if (!list[i]) return NaN;
      inv += 1 / list[i];
    }
    return 1 / inv;
  };

  // ---------- Ohm's law, both directions ----------
  O.currentA = function (R, V) { return R ? V / R : NaN; };
  O.currentMa = function (R, V) { return O.currentA(R, V) * O.MA_PER_A; };
  O.dropV = function (R, I_A) { return R * I_A; };
  O.powerW = function (V, I_A) { return V * I_A; };
  O.powerFromI = function (I_A, R) { return I_A * I_A * R; };
  O.rFromVI = function (V, I_A) { return I_A ? V / I_A : NaN; };

  // ---------- error against the rule ----------
  O.pctError = function (measured, nominal) {
    if (!nominal) return NaN;
    return Math.abs(measured - nominal) / Math.abs(nominal) * 100;
  };

  // ---------- the meter margin story ----------
  O.overAmmeter = function (ma) { return ma > O.AMMETER_MA; };

  // ---------- Fun Mode: the tolerance band, stable per resistor ----------
  // rnd in [-1, 1]; 0 is the nominal.
  O.toleranceR = function (nominal, rnd) {
    return nominal * (1 + (O.TOL_PCT / 100) * (rnd || 0));
  };

  // the printed pair the bench grades against
  O.accepted = Object.freeze({
    v0: 6.0, r1: 100, r2: 200,
    seriesRt: O.seriesRt(O.R1, O.R2),
    parallelRt: O.parallelRt(O.R1, O.R2),
    ammeterMa: 100, voltmeterV: 15
  });

  root.LS.seriesparallel = O;
})(typeof globalThis !== "undefined" ? globalThis : window);
