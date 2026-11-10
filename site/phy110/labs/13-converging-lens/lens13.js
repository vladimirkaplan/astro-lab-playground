// PHY110 Lab 13 maths: the converging lens and a two-lens refractor.
// Thin-lens equation: 1/o + 1/i = 1/f (o object distance, i image distance,
// f focal length, all in metres). Lateral magnification m = -i/o (magnitude
// is the size ratio, sign the up/down sense; NOT printed in the manual, flag
// as added). Telescope: spacing = f_objective + f_eyepiece, M = f_o / f_e
// (also not printed, flag as added).
//
// Printed in the manual: the classification object distances 2.5f, 2.0f,
// 1.5f, 0.5f. NOT printed (shown in the drawer): the kit focal lengths
// f_A = 0.20 m and f_B = 0.10 m (read off the lens rims), the 1 mm bench
// division, the 5 cm arrow. Honesty: sharp focus is a RANGE on a real bench
// (+-3 to 5 mm), the sim grades against a +/-4 mm band and never marks one
// pixel-perfect position; two lens positions exist only when the
// object-screen distance is at least 4f, and the sim refuses when it is not;
// at 0.5f nothing appears on the screen - that is the lesson, not a bug.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var O = {};

  // ---------- course constants ----------
  O.F_A = 0.20;              // m, Lens A (blue), kit value, NOT printed
  O.F_B = 0.10;              // m, Lens B (amber), kit value, NOT printed
  O.CLASS_SET = Object.freeze([2.5, 2.0, 1.5, 0.5]); // multiples of f, printed
  O.BENCH_MM = 1;            // bench division, NOT printed
  O.ARROW_CM = 5;            // object arrow size, NOT printed
  O.BENCH_CM = 100;          // bench length the sim lays out
  O.OBJECT_CM = 0;           // object post at the 0 mark (Part 1)
  O.SCREEN_CM = 100;         // screen at the 100 mark: D = 1.00 m (Part 1)
  O.LENS_CM = 50;            // lens post at the 50 mark (Part 2)
  O.FOCUS_BAND_MM = 4;       // sim's own sharpness half-band (real bench +-3-5 mm)
  O.READ_NOISE_MM = 2;       // Fun Mode stable scale-reading jitter
  O.TELES_BAND_MM = 5;       // sim's own in-focus half-band for the viewport

  O.lensF = function (which) { return which === "B" ? O.F_B : O.F_A; };
  O.lensColour = function (which) { return which === "B" ? "amber" : "blue"; };

  // ---------- the thin-lens equation ----------
  // i = f*o/(o-f). Infinity at o = f; negative (virtual) for o < f.
  O.imageDistance = function (o, f) {
    if (!(o > 0) || !(f > 0)) return NaN;
    if (Math.abs(o - f) < 1e-12) return Infinity;
    return (f * o) / (o - f);
  };
  // f from a logged (o, i) pair - the student's own number, may come out wrong.
  O.focalFrom = function (o, i) {
    if (!(o > 0) || !(i > 0) || !isFinite(i)) return NaN;
    return 1 / (1 / o + 1 / i);
  };
  // m = -i/o: magnitude is the size ratio, a minus means inverted (added).
  O.magnification = function (o, i) {
    if (!(o > 0) || !isFinite(i)) return NaN;
    return -i / o;
  };

  // ---------- image classification ----------
  // For a real object in front of a converging lens:
  //   o > 2f  smaller, inverted, real
  //   o = 2f  equal,   inverted, real
  //   f < o < 2f  larger, inverted, real
  //   o = f   no image (at infinity)
  //   o < f   larger, erect, virtual (never on a screen)
  O.classify = function (o, f) {
    if (!(o > 0) || !(f > 0)) return null;
    if (Math.abs(o - f) < 1e-9) {
      return { size: "none", orientation: "none", type: "none" };
    }
    var m = Math.abs(O.imageDistance(o, f) / o);
    var size;
    if (Math.abs(m - 1) < 1e-6) size = "equal";
    else if (m > 1) size = "larger";
    else size = "smaller";
    return {
      size: size,
      orientation: o > f ? "inverted" : "erect",
      type: o > f ? "real" : "virtual"
    };
  };

  // ---------- the two-position (conjugate) method ----------
  // Object and screen fixed D apart: o^2 - D*o + D*f = 0, so
  // o = (D +- sqrt(D^2 - 4*D*f)) / 2. Real solutions only for D >= 4f.
  O.twoPositions = function (D, f) {
    if (!(D > 0) || !(f > 0)) return { ok: false, why: "need D and f above zero" };
    if (D < 4 * f - 1e-12) {
      return { ok: false, why: "the object and screen are less than 4f apart - no lens position works" };
    }
    var s = Math.sqrt(D * D - 4 * D * f);
    var oFar = (D + s) / 2;
    var oNear = (D - s) / 2;
    return {
      ok: true,
      split: s,                 // the lens-position split, sqrt(D^2 - 4Df)
      oFar: oFar, iFar: D - oFar,
      oNear: oNear, iNear: D - oNear
    };
  };

  // ---------- the two-lens refractor ----------
  O.telescopeSpacing = function (fO, fE) {
    if (!(fO > 0) || !(fE > 0)) return NaN;
    return fO + fE;             // first image at the eyepiece's focal plane
  };
  O.telescopeMagnification = function (fO, fE) {
    if (!(fO > 0) || !(fE > 0)) return NaN;
    return fO / fE;             // added; not printed in the manual
  };

  // ---------- bench bookkeeping ----------
  O.average = function (a, b) {
    if (!isFinite(a) || !isFinite(b)) return NaN;
    return (a + b) / 2;
  };
  O.pctError = function (measured, accepted) {
    if (!accepted || !isFinite(measured)) return NaN;
    return Math.abs(measured - accepted) / Math.abs(accepted) * 100;
  };
  // sharpness 0..1 across the focus band (a range, never a point)
  O.sharpness = function (screenX, imageX, bandM) {
    if (!isFinite(imageX)) return 0;
    var d = Math.abs(screenX - imageX) / bandM;
    return Math.max(0, 1 - d);
  };

  O.accepted = Object.freeze({
    fA: O.F_A,
    fB: O.F_B,
    // the Part 1 conjugate pairs on the 1.00 m bench, both lenses
    A: O.twoPositions(1.00, O.F_A),
    B: O.twoPositions(1.00, O.F_B),
    // the classification rows for each kit lens
    rowsA: O.CLASS_SET.map(function (k) { return { k: k, o: k * O.F_A, cls: O.classify(k * O.F_A, O.F_A) }; }),
    rowsB: O.CLASS_SET.map(function (k) { return { k: k, o: k * O.F_B, cls: O.classify(k * O.F_B, O.F_B) }; }),
    // the kit telescope
    telescopeSpacingAB: O.telescopeSpacing(O.F_A, O.F_B),
    telescopeMagnificationAB: O.telescopeMagnification(O.F_A, O.F_B)
  });

  root.LS.lens13 = O;
})(typeof globalThis !== "undefined" ? globalThis : window);
