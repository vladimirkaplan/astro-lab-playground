// PHY110 Lab 8 maths: specific heat of a metal by mixtures.
// The hot solid cools, the cup and water warm, and the energy balance is
//   c_s m_s (T_s - T_f) = (m_c c_c + m_w c_w) (T_f - T_i)
// solved for the unknown specific heat:
//   c_s = (m_c c_c + m_w c_w) (T_f - T_i) / [m_s (T_s - T_f)]
// Course units: cal, g, degrees C, cal/g C.
// Printed course values: c_cup = 0.22 (aluminium), c_water = 1.000, and the
// Table II accepted values Cu 0.093 / Zn 0.093 / Sn 0.054 / Pb 0.031. T_s is
// the boiling-water temperature; the manual states no pressure assumption,
// so the course uses 100 C and labels it.
//
// Not printed (the drawer shows them): the one course run - sample 95.0 g,
// cup 60.0 g, cup plus water 210.0 g (water 150.0 g), T_i = 22.0 C.
//
// Honesty items: a real calorimeter is not isolated. Heat loss and splash
// move the measured c_s a few percent; carry-over water and condensation
// push it high; a metal that arrives cooler than T_s reads low, because the
// (T_s - T_f) gap the student uses is bigger than the metal's true drop.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var SH = {};

  // ---------- course constants ----------
  SH.C_CUP = 0.22;       // cal/g C, aluminium cup, printed
  SH.C_WATER = 1.000;    // cal/g C, printed
  SH.T_BOIL = 100;       // C, assumed 1 atm - labeled, not derived
  SH.TABLE2 = Object.freeze({ Cu: 0.093, Zn: 0.093, Sn: 0.054, Pb: 0.031 });
  SH.METALS = Object.freeze(["Sn", "Zn", "Cu", "Pb"]);
  SH.NAMES = Object.freeze({ Sn: "tin", Zn: "zinc", Cu: "copper", Pb: "lead" });
  // not printed: the one course run (the drawer shows it)
  SH.RUN = Object.freeze({ ms: 95.0, mc: 60.0, mcw: 210.0, ti: 22.0, ts: 100.0 });

  // ---------- the energy balance ----------
  SH.cupCapacity = function (mc) { return (mc || 0) * SH.C_CUP; };
  SH.capacityCW = function (mc, mw) {
    return (mc || 0) * SH.C_CUP + (mw || 0) * SH.C_WATER;
  };
  // final temperature the balance predicts for a metal at arrival temp ta
  SH.finalT = function (metal, mc, mw, ms, ti, ta) {
    var cs = SH.TABLE2[metal];
    if (!cs) return NaN;
    var cw = SH.capacityCW(mc, mw);
    var denom = cw + ms * cs;
    if (!denom) return NaN;
    return (cw * ti + ms * cs * ta) / denom;
  };
  // the measured specific heat from one run
  SH.cFrom = function (mc, mw, ms, ti, ts, tf) {
    var denom = (ms || 0) * (ts - tf);
    if (!denom) return NaN;
    return SH.capacityCW(mc, mw) * (tf - ti) / denom;
  };
  // heat per gram over a temperature span: c x dT, in cal
  SH.heatPerGram = function (c, dT) { return c * (dT || 0); };
  // how many times more heat per gram water takes than the aluminium cup
  SH.ratioWaterCup = function () { return SH.C_WATER / SH.C_CUP; };

  // ---------- percent error against the accepted line ----------
  SH.pctError = function (measured, accepted) {
    if (!accepted) return NaN;
    return Math.abs(measured - accepted) / Math.abs(accepted) * 100;
  };

  // ---------- the honest error routes ----------
  // Q cal of heat lost to the room during the mix: T_f comes out lower
  SH.finalTWithLoss = function (metal, mc, mw, ms, ti, ta, lossCal) {
    var cs = SH.TABLE2[metal];
    if (!cs) return NaN;
    var cw = SH.capacityCW(mc, mw);
    var denom = cw + ms * cs;
    if (!denom) return NaN;
    return (cw * ti + ms * cs * ta - (lossCal || 0)) / denom;
  };
  // mHot grams of boiling water riding along: it arrives hot and adds heat
  // the student's line does not count, so T_f comes out higher
  SH.finalTWithRideAlong = function (metal, mc, mw, ms, ti, ta, mHot) {
    var cs = SH.TABLE2[metal];
    if (!cs) return NaN;
    var cw = SH.capacityCW(mc, mw);
    var extra = (mHot || 0) * SH.C_WATER;
    var denom = cw + ms * cs + extra;
    if (!denom) return NaN;
    return (cw * ti + (ms * cs + extra) * ta) / denom;
  };
  // both honest errors at once (Fun Mode): heat lost to the room and hot
  // water riding along
  SH.finalTWithErrors = function (metal, mc, mw, ms, ti, ta, lossCal, mHot) {
    var cs = SH.TABLE2[metal];
    if (!cs) return NaN;
    var cw = SH.capacityCW(mc, mw);
    var extra = (mHot || 0) * SH.C_WATER;
    var denom = cw + ms * cs + extra;
    if (!denom) return NaN;
    return (cw * ti + (ms * cs + extra) * ta - (lossCal || 0)) / denom;
  };
  // the metal arrives at ta < ts, but the student still uses ts in the line:
  // the gap (ts - tf) is bigger than the metal's true drop, so c_s reads LOW
  SH.coolerArrivalC = function (metal, mc, mw, ms, ti, ts, ta) {
    var cs = SH.TABLE2[metal];
    if (!cs) return NaN;
    var tf = SH.finalT(metal, mc, mw, ms, ti, ta);
    return SH.cFrom(mc, mw, ms, ti, ts, tf);
  };
  // carry-over water in the student's numbers: the arriving heat is counted
  // into the gap, so c_s reads HIGH
  SH.rideAlongC = function (metal, mc, mw, ms, ti, ts, mHot) {
    var cs = SH.TABLE2[metal];
    if (!cs) return NaN;
    var tf = SH.finalTWithRideAlong(metal, mc, mw, ms, ti, ts, mHot);
    return SH.cFrom(mc, mw, ms, ti, ts, tf);
  };

  // ---------- the thermometer ----------
  // a real thermometer reads to 0.1 C
  SH.readC = function (trueC) { return Math.round(trueC * 10) / 10; };
  SH.FUN_LOSS_CAL = 30;      // up to this much heat lost to the room, Fun Mode
  SH.FUN_RIDE_ALONG_G = 0.5; // up to this much boiling water on the cylinder

  // the accepted values the bench names out loud
  SH.accepted = Object.freeze({
    ti: 22.0, ts: 100.0,
    cupC: SH.C_CUP, waterC: SH.C_WATER
  });

  root.LS.specificheat = SH;
})(typeof globalThis !== "undefined" ? globalThis : window);
