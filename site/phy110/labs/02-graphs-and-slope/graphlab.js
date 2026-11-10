// PHY110 Lab 2 maths: the graph rules this course grades. Axis scale design
// (the 1-2-5 choice), where the axis may start, how much of the paper the data
// must cover, and the slope of one straight trendline. No sim, no DOM: pure
// numbers, so node --test can pin every result the Check tab reuses.
//
// Course rules this module enforces:
//   - scale per division comes from 1, 2, 5 (and 10 as the top bracket) only;
//   - the chosen scale must be big enough that every division count still spans
//     the data, and it is the smallest choice that does;
//   - data must cover at least 40 % of the axis length;
//   - slope comes from two far-apart points ON the trendline, never from data
//     points and never from two dots joined with segments.
// shared/fit.js carries the same least-squares maths for the plot tools; this
// module keeps its own copy so the lab maths loads and tests on its own.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var G = {};

  G.SCALE_BASES = Object.freeze([1, 2, 5]);
  G.TOP_BRACKET = 10;             // 10 is the top of the bracket, not a base step
  G.MIN_COVERAGE = 0.40;          // data must fill at least 40 % of the axis
  G.N_PIN = 30;                   // the manual leaves N open for the practice
                                  // tables, so this lab pins 30 and shows it

  // Pre-scale: what one division would have to be if the paper simply absorbed
  // the data range in N steps.
  G.preScale = function (xSmall, xLarge, divisions) {
    if (!divisions) return NaN;
    return (xLarge - xSmall) / divisions;
  };

  // The scale per division: the smallest 1-2-5 (or 10) step that still spans the
  // range. ps = 1.333 -> 2, ps = 5.83 -> 10, ps = 2 exactly -> 2.
  G.chooseScale = function (ps) {
    if (!isFinite(ps) || ps <= 0) return NaN;
    var power = Math.floor(Math.log(ps) / Math.LN10);
    var options = [];
    G.SCALE_BASES.forEach(function (b) { options.push(b * Math.pow(10, power)); });
    options.push(G.TOP_BRACKET * Math.pow(10, power));
    options.sort(function (a, b) { return a - b; });
    for (var i = 0; i < options.length; i++) {
      if (options[i] >= ps - 1e-9) {
        var s = options[i];
        // round away log/power dust: 2.0000000000000004 -> 2
        return Math.abs(s - Math.round(s * 1e6) / 1e6) < 1e-9
          ? Math.round(s * 1e6) / 1e6 : s;
      }
    }
    return NaN;
  };

  G.scaleFactorOf = function (scale) {
    if (!isFinite(scale) || scale <= 0) return NaN;
    var power = Math.floor(Math.log(scale) / Math.LN10);
    return Math.round(scale / Math.pow(10, power) * 1000) / 1000;
  };

  // Everything the student fills onto the axis plan at once.
  G.designScale = function (xSmall, xLarge, divisions) {
    var ps = G.preScale(xSmall, xLarge, divisions);
    var scale = G.chooseScale(ps);
    return {
      range: xLarge - xSmall,
      divisions: divisions,
      preScale: ps,
      scale: scale,
      sf: G.scaleFactorOf(scale),
      span: scale * divisions,
      coverage: isFinite(scale) ? (xLarge - xSmall) / (divisions * scale) : NaN
    };
  };

  // Start value: centre the data band on the paper the scale now spans.
  //   Xc = XS - (N*S - (XL - XS)) / 2
  G.startValue = function (xSmall, xLarge, divisions, scale) {
    if (!scale) return NaN;
    return xSmall - (divisions * scale - (xLarge - xSmall)) / 2;
  };

  // Nudge the start to a rounder number, as long as every point still fits.
  // A "rounder" start is a multiple of the scale, otherwise half a scale.
  G.simpleOrigin = function (xSmall, xLarge, divisions, scale) {
    var xc = G.startValue(xSmall, xLarge, divisions, scale);
    if (!isFinite(xc)) return NaN;
    var candidates = [
      Math.floor(xc / scale + 1e-9) * scale,
      Math.floor(xc / (scale / 2) + 1e-9) * (scale / 2)
    ];
    candidates.sort(function (a, b) { return b - a; });
    for (var i = 0; i < candidates.length; i++) {
      if (G.fitsOnGrid(candidates[i], divisions, scale, xSmall, xLarge)) {
        return Math.round(candidates[i] * 1e6) / 1e6;
      }
    }
    return xc;
  };

  G.fitsOnGrid = function (origin, divisions, scale, xSmall, xLarge) {
    return origin <= xSmall + 1e-9 && origin + divisions * scale >= xLarge - 1e-9;
  };

  G.coverage = function (xSmall, xLarge, divisions, scale) {
    if (!divisions || !scale) return NaN;
    return (xLarge - xSmall) / (divisions * scale);
  };
  G.coversEnough = function (xSmall, xLarge, divisions, scale) {
    var c = G.coverage(xSmall, xLarge, divisions, scale);
    return isFinite(c) && c >= G.MIN_COVERAGE - 1e-9;
  };

  // ---------- slope ----------
  // Two points ON the line, far apart. Never two data dots.
  G.slope = function (x1, y1, x2, y2) {
    if (x2 === x1) return NaN;
    return (y2 - y1) / (x2 - x1);
  };
  G.slopeText = function (x1, y1, x2, y2, digits) {
    var d = digits === undefined ? 2 : digits;
    var s = G.slope(x1, y1, x2, y2);
    return "(" + y2 + " - " + y1 + ") / (" + x2 + " - " + x1 + ") = " +
      (Math.round(s * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  };
  G.lineAt = function (slope, intercept, x) { return intercept + slope * x; };

  G.pointsPerSide = function (points, slope, intercept) {
    var above = 0, below = 0, on = 0;
    points.forEach(function (p) {
      var d = p[1] - G.lineAt(slope, intercept, p[0]);
      if (Math.abs(d) < 1e-9) on++;
      else if (d > 0) above++;
      else below++;
    });
    return { above: above, below: below, on: on, balanced: Math.abs(above - below) <= 1 };
  };

  // Least squares y = a + b x. The sim shows this as the honest reference line.
  G.bestFit = function (xs, ys) {
    var n = Math.min(xs.length, ys.length);
    if (n < 2) return null;
    var sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (var i = 0; i < n; i++) {
      sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i];
    }
    var den = n * sxx - sx * sx;
    if (den === 0) return null;
    var slope = (n * sxy - sx * sy) / den;
    return { slope: slope, intercept: (sy - slope * sx) / n, n: n };
  };

  // On a v-t graph the slope is an acceleration, so the slope of the practice
  // table IS the local g. Percent error against the accepted value the course names.
  G.percentError = function (measured, accepted) {
    if (!accepted) return NaN;
    return Math.abs(measured - accepted) / Math.abs(accepted) * 100;
  };

  // ---------- the data this lab plots ----------
  // Car example: constant-speed run with the manual's own trendline endpoints.
  // The v-t style tables for Earth and Moon are the manual's practice numbers,
  // kept exactly so an in-class answer matches the class.
  G.SETS = Object.freeze({
    car: {
      label: "Car at constant speed (worked example)",
      xLabel: "time t (s)", yLabel: "distance d (m)",
      xs: [10, 20, 30, 40, 50],
      ys: [65, 93, 155, 185, 240],
      trend: [[0, 15], [60, 280]],
      slopeMeaning: "speed, in m/s",
      accepted: null
    },
    earth: {
      label: "Falling ball on Earth",
      xLabel: "time t (s)", yLabel: "speed v (m/s)",
      xs: [1, 3, 5, 7, 9],
      ys: [8, 34, 52, 66, 86],
      trend: null,
      slopeMeaning: "acceleration, so local g in m/s^2",
      accepted: 9.80
    },
    moon: {
      label: "Falling ball on the Moon",
      xLabel: "time t (s)", yLabel: "speed v (m/s)",
      xs: [0, 10, 20, 30, 40],
      ys: [402, 415, 433, 448, 466],
      trend: null,
      slopeMeaning: "acceleration, so local g in m/s^2",
      accepted: 1.62
    },
    spring: {
      label: "Spring stretch against pulling force",
      xLabel: "elongation x (cm)", yLabel: "force F (N)",
      // The manual's own elongation-vs-force graph is a picture with no numbers,
      // so this set is the sim's own bench: a steel spring with a stiff start.
      xs: [1.0, 2.0, 3.0, 4.0, 5.0],
      ys: [6.1, 12.2, 17.8, 24.1, 30.2],
      trend: null,
      slopeMeaning: "the spring constant, in N per cm",
      accepted: null
    }
  });

  G.setFit = function (key) {
    var set = G.SETS[key];
    return set ? G.bestFit(set.xs, set.ys) : null;
  };

  // A trendline is drawn as far as the line needs to run; the car example comes
  // with its endpoints already printed.
  G.setLine = function (key) {
    var set = G.SETS[key];
    if (!set) return null;
    if (set.trend) {
      var s = G.slope(set.trend[0][0], set.trend[0][1], set.trend[1][0], set.trend[1][1]);
      return { slope: s, intercept: set.trend[0][1] - s * set.trend[0][0],
        from: set.trend[0][0], to: set.trend[1][0] };
    }
    var fit = G.setFit(key);
    if (!fit) return null;
    var lo = set.xs[0], hi = set.xs[set.xs.length - 1];
    return { slope: fit.slope, intercept: fit.intercept, from: lo, to: hi };
  };

  // The reading question: one predicted force at a stretch beyond the table.
  G.predictAt = function (key, x) {
    var line = G.setLine(key);
    return line ? G.lineAt(line.slope, line.intercept, x) : NaN;
  };
  G.SPRING_READ_X = 7;

  root.LS.graphlab = G;
})(typeof globalThis !== "undefined" ? globalThis : window);
