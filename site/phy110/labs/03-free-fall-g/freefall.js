// PHY110 Lab 3 maths: the free-fall bench. One equation carries the lab
//   h = g t^2 / 2   so   g = 2h / t^2
// with the course accepted value g = 9.80 m/s^2, a timer that prints four decimals,
// three set heights, five trials per height, and the average of the three g values
// as the answer.
//
// The post-question model g = G M_E / (R_E + h)^2 needs M_E and R_E, and the manual
// prints neither. Standard values live here and the page prints them in its
// "numbers this bench uses" drawer, so no student has to guess where they came from.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var F = {};

  // ---------- course constants ----------
  F.G_ACCEPT = 9.80;            // m/s^2, the value this course accepts
  F.GRAV_G = 6.67e-11;          // N m^2 / kg^2, printed by the manual
  F.TIMER_RESOLUTION = 0.0001;  // s, the display the timer really shows
  F.TRIALS_PER_HEIGHT = 5;
  F.HEIGHTS_M = Object.freeze([0.200, 0.400, 0.800]);
  // Not printed in the manual: standard values, shown in the page's drawer.
  F.M_EARTH = 5.97e24;          // kg
  F.R_EARTH = 6.37e6;           // m

  // ---------- the sim's own props (not course values) ----------
  F.BALL_DIAM_M = 0.020;        // 2 cm steel ball
  F.PAD_ALIGN_TOL_M = 0.03;     // a miss wider than this never trips the pad switch

  // ---------- the two directions of one equation ----------
  F.fallTime = function (h, g) {
    var gg = g || F.G_ACCEPT;
    if (h < 0 || gg <= 0) return NaN;
    return Math.sqrt(2 * h / gg);
  };
  F.gFrom = function (h, t) {
    if (!t) return NaN;
    return 2 * h / (t * t);
  };

  // ---------- averaging the way the data page asks ----------
  F.mean = function (values) {
    if (!values || !values.length) return NaN;
    var s = 0;
    for (var i = 0; i < values.length; i++) s += values[i];
    return s / values.length;
  };
  // g for one height: from the AVERAGE time of that height's trials, which is what
  // the manual's footer row does.
  F.gForHeight = function (h, times) {
    var list = (times || []).filter(isFinite);
    if (!list.length) return NaN;
    return F.gFrom(h, F.mean(list));
  };
  // The lab answer: the average of the three heights' g values.
  F.averageG = function (perHeightG) {
    var list = (perHeightG || []).filter(isFinite);
    return list.length ? F.mean(list) : NaN;
  };

  F.percentError = function (measured, accepted) {
    var acc = accepted === undefined ? F.G_ACCEPT : accepted;
    if (!acc) return NaN;
    return Math.abs(measured - acc) / Math.abs(acc) * 100;
  };

  // ---------- the two errors this bench actually makes ----------
  // Stopping the timer late lengthens t, and g goes as 1 / t^2.
  F.gAfterLateStop = function (h, t, extraSeconds) {
    return F.gFrom(h, t + (extraSeconds || 0));
  };
  // Reading the height to the ball's centre instead of its bottom adds half a ball
  // to every height, so g comes out high by the same fraction.
  F.centreReadOffsetM = function () { return F.BALL_DIAM_M / 2; };
  F.gFromCentreReading = function (trueH, t) {
    return F.gFrom(trueH + F.centreReadOffsetM(), t);
  };

  // ---------- does g care about height? ----------
  // g(h) = G M_E / (R_E + h)^2. At bench heights the change is about 2h / R_E,
  // which is why nobody measures it with a falling ball.
  F.gAtHeight = function (h) {
    var r = F.R_EARTH + (h || 0);
    return F.GRAV_G * F.M_EARTH / (r * r);
  };
  F.fractionalChange = function (h) {
    return F.gAtHeight(h) / F.gAtHeight(0) - 1;
  };
  F.twoHOverR = function (h) {
    return 2 * (h || 0) / F.R_EARTH;
  };
  F.detectableAtBenchHeights = function () {
    // the timer shows 0.0001 s, but the real limit is milliseconds of release and
    // geometry error, so compare against a millisecond-scale timing uncertainty
    return Math.abs(F.fractionalChange(1)) > 0.001;
  };

  root.LS.freefall = F;
})(typeof globalThis !== "undefined" ? globalThis : window);
