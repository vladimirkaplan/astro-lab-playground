// PHY110 Lab 1 physics: the course's own conversion table, instrument maths, and
// percent error. No sim, no DOM: pure numbers, so node --test can pin every
// result and the Check tab can recompute its own answers.
//
// Conversion rule used everywhere below: a conversion uses the factor the course
// prints for that pair when it prints one. Only when the pair is not printed does
// it chain through printed factors, and the chain is shown so the student sees
// every step. Five of the course factors are rounded (1 yd = 0.91 m,
// 1 mi = 1.61 km, 1 gal = 3.8 L, 1 lb = 0.45 kg, 1 kg = 2.2 lb), so a two-step
// chain can disagree with a one-step factor by about 1 %. TRUE_* holds the exact
// values for that honest comparison.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var P = {};

  // ---------- course constants (printed values, quoted as the course gives them) ----------
  P.G = 9.80;                    // m/s^2, the course accepted value
  P.PI = 3.14;                   // the course's hand-arithmetic pi
  P.FREEZE_C = 0;
  P.FREEZE_F = 32;
  P.BOIL_C = 100;
  P.BOIL_F = 212;
  P.RHO_WATER = 1000;            // kg/m^3

  // Factors the manual prints as measured values (rounded), keyed for the honesty note.
  P.COURSE_ROUNDED = Object.freeze({ "yd->m": 0.91, "mi->km": 1.61, "gal->L": 3.8,
    "lb->kg": 0.45, "kg->lb": 2.2, "lbf->kgf": 0.45, "kgf->lbf": 2.2 });

  // Exact values, for "how far off is the course factor" only. Never used to grade.
  P.TRUE = Object.freeze({
    IN_CM: 2.54,        // exact by definition since 1959
    YD_M: 0.9144,
    MI_KM: 1.609344,
    GAL_L: 3.785412,
    LB_KG: 0.453592,
    KG_LB: 2.204623,
    FLOZ_ML: 29.5735
  });

  // ---------- the printed conversion table ----------
  // Each edge: [from, to, factor, exactWithinSystem?]. "within" edges are the
  // exact same-system definitions (1 ft = 12 in); the others are printed values.
  var EDGES = [
    // length
    ["m", "cm", 100, true], ["cm", "mm", 10, true], ["km", "m", 1000, true],
    ["in", "cm", 2.54, true],
    ["ft", "in", 12, true], ["yd", "ft", 3, true], ["mi", "yd", 1760, true],
    ["yd", "m", 0.91, false], ["mi", "km", 1.61, false],
    // volume
    ["L", "mL", 1000, true], ["gal", "L", 3.8, false],
    ["gal", "qt", 4, true], ["qt", "pt", 2, true],
    ["cup", "fl oz", 8, true], ["fl oz", "tbsp", 2, true], ["tbsp", "tsp", 3, true],
    ["fl oz", "mL", 29.57, true], ["ft3", "gal", 7.48, false], ["yd3", "ft3", 27, true],
    // mass
    ["kg", "g", 1000, true], ["lb", "oz", 16, true], ["ton", "lb", 2000, true],
    ["lb", "kg", 0.45, false], ["kg", "lb", 2.2, false],
    // force
    ["lbf", "kgf", 0.45, false], ["kgf", "lbf", 2.2, false],
    ["kgf", "N", P.G, false]
  ];

  var ADJ = {};
  // Two passes on purpose. As-printed edges are pushed first, so a pair the
  // manual prints in one direction converts with that printed factor instead of
  // with the reciprocal of the same row read backwards.
  EDGES.forEach(function (e) {
    (ADJ[e[0]] = ADJ[e[0]] || []).push({ to: e[1], k: e[2], within: e[3] });
  });
  EDGES.forEach(function (e) {
    (ADJ[e[1]] = ADJ[e[1]] || []).push({ to: e[0], k: 1 / e[2], within: e[3] });
  });

  P.UNIT_SYSTEM = Object.freeze({
    mm: "SI", cm: "SI", m: "SI", km: "SI", mL: "SI", L: "SI", g: "SI", kg: "SI",
    N: "SI", C: "SI",
    in: "British", ft: "British", yd: "British", mi: "British", oz: "British",
    lb: "British", ton: "British", gal: "British", qt: "British", pt: "British",
    cup: "British", "fl oz": "British", tbsp: "British", tsp: "British",
    ft3: "British", yd3: "British", lbf: "British", kgf: "SI", F: "British"
  });

  P.systemOf = function (unit) {
    return P.UNIT_SYSTEM[unit] || null;
  };

  // Direct printed factor for one pair, or null when the manual does not print it.
  P.directFactor = function (from, to) {
    var list = ADJ[from] || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].to === to) return list[i].k;
    }
    return null;
  };

  // Breadth-first chain of printed factors from -> to. Fewest steps wins, and a
  // same-system chain beats a mixed one when the step count ties.
  P.convertPath = function (from, to) {
    if (!ADJ[from] || !ADJ[to]) return null;
    if (from === to) return { factor: 1, steps: [] };
    var seen = {}, queue = [{ unit: from, factor: 1, steps: [], mixed: 0 }];
    seen[from] = 0;
    var best = null;
    while (queue.length) {
      var cur = queue.shift();
      if (cur.steps.length > 5) continue;
      var list = ADJ[cur.unit] || [];
      for (var i = 0; i < list.length; i++) {
        var e = list[i], next = e.to;
        var cand = {
          unit: next,
          factor: cur.factor * e.k,
          steps: cur.steps.concat([{ from: cur.unit, to: next, k: e.k }]),
          mixed: cur.mixed + (e.within ? 0 : 1)
        };
        if (next === to) {
          if (!best || cand.steps.length < best.steps.length ||
              (cand.steps.length === best.steps.length && cand.mixed < best.mixed)) {
            best = cand;
          }
          continue;
        }
        if (seen[next] !== undefined && seen[next] <= cand.steps.length) continue;
        seen[next] = cand.steps.length;
        queue.push(cand);
      }
    }
    return best ? { factor: best.factor, steps: best.steps } : null;
  };

  // Convert a value with the course's own table. NaN when the units are unrelated.
  P.convert = function (value, from, to) {
    var p = P.convertPath(from, to);
    return p ? value * p.factor : NaN;
  };

  // Cubic conversion: the length factor, cubed. 1 ft^3 = 12^3 in^3, not 12 in^3.
  P.convertCubic = function (value, fromLen, toLen) {
    var f = P.convert(1, fromLen, toLen);
    return isFinite(f) ? value * f * f * f : NaN;
  };

  // Bigger of two units: ratio of one of the first to the second. null if unrelated.
  P.unitRatio = function (unitA, unitB) {
    return P.convert(1, unitA, unitB);
  };
  P.largerUnit = function (unitA, unitB) {
    var r = P.unitRatio(unitA, unitB);
    if (!isFinite(r)) return null;
    return r >= 1 ? unitA : unitB;
  };

  // Two temperatures, each {value, unit:"C"|"F"}: which one is hotter.
  // Temperature has no multiplicative factor, so it needs its own comparison.
  P.tempLarger = function (a, b) {
    var ca = a.unit === "C" ? a.value : P.fToC(a.value);
    var cb = b.unit === "C" ? b.value : P.fToC(b.value);
    if (ca === cb) return null;
    return ca > cb ? a : b;
  };

  // How far the course factor sits from the exact value, in percent. -1 when the
  // pair is not one of the rounded printed factors.
  P.courseFactorDriftPct = function (pair) {
    var key = pair;
    var table = {
      "yd->m": [P.COURSE_ROUNDED["yd->m"], P.TRUE.YD_M],
      "mi->km": [P.COURSE_ROUNDED["mi->km"], P.TRUE.MI_KM],
      "gal->L": [P.COURSE_ROUNDED["gal->L"], P.TRUE.GAL_L],
      "lb->kg": [P.COURSE_ROUNDED["lb->kg"], P.TRUE.LB_KG],
      "kg->lb": [P.COURSE_ROUNDED["kg->lb"], P.TRUE.KG_LB],
      "in->cm": [2.54, P.TRUE.IN_CM],
      "fl oz->mL": [29.57, P.TRUE.FLOZ_ML]
    };
    var row = table[key];
    if (!row) return -1;
    return (row[0] - row[1]) / row[1] * 100;
  };

  // ---------- temperature ----------
  P.cToF = function (c) { return P.FREEZE_F + (9 / 5) * c; };
  P.fToC = function (f) { return (5 / 9) * (f - P.FREEZE_F); };

  // The manual's worked example rounds 72 F to 22.4 C. Straight 5/9 arithmetic
  // gives 22.2. Both numbers here so the page can print the honest one and say
  // why the two differ.
  P.manualRoundedCfromF = function (f) { return Math.round(P.fToC(f) * 10) / 10; };

  // ---------- mass, weight, volume ----------
  P.weightN = function (massKg) { return massKg * P.G; };
  P.massFromWeightN = function (n) { return n / P.G; };
  P.boxVolume = function (length, width, height) { return length * width * height; };
  P.displacement = function (volumeWithObject, volumeWaterOnly) {
    return volumeWithObject - volumeWaterOnly;
  };
  // Mass of the water a volume holds, in kg. Volume in mL (1 mL water = 1 g).
  P.waterMassKg = function (volumeMl) { return volumeMl / 1000 * (P.RHO_WATER / 1000); };

  // ---------- the pacing bench ----------
  P.stepSize = function (feet, steps) { return steps ? feet / steps : NaN; };
  P.pacedLength = function (steps, stepSizeFt) { return steps * stepSizeFt; };

  // ---------- the pendulum bench ----------
  // g = 4 pi^2 L / T^2, with the course pi, L in m, T = one period in s.
  P.pendulumG = function (lengthM, periodS) {
    if (!periodS) return NaN;
    return 4 * P.PI * P.PI * lengthM / (periodS * periodS);
  };
  P.pendulumPeriod = function (lengthM, g) {
    var gg = g || P.G;
    return 2 * P.PI * Math.sqrt(lengthM / gg);
  };
  P.pendulumTimeFor = function (lengthM, swings, g) {
    return P.pendulumPeriod(lengthM, g) * swings;
  };

  // ---------- reading and reporting ----------
  P.percentError = function (measured, accepted) {
    if (!accepted) return NaN;
    return Math.abs(measured - accepted) / Math.abs(accepted) * 100;
  };
  P.mean = function (values) {
    if (!values || !values.length) return NaN;
    var s = 0;
    for (var i = 0; i < values.length; i++) s += values[i];
    return s / values.length;
  };

  // Decimal inches as a ruler fraction, rounded to the nearest 1/denom inch.
  // Rulers print halves, quarters, eighths and sixteenths; this returns the
  // mixed number the student actually copies into the data table.
  P.toFraction = function (inches, denom) {
    var d = denom || 8;
    var sign = inches < 0 ? "-" : "";
    var ax = Math.abs(inches);
    var whole = Math.floor(ax + 1e-9);
    var num = Math.round((ax - whole) * d);
    if (num === d) { whole += 1; num = 0; }
    if (num === 0) return sign + whole;
    var g = gcd(num, d);
    num /= g;
    var den = d / g;
    return sign + (whole ? whole + " " : "") + num + "/" + den;
  };
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  P.fromFraction = function (text) {
    var t = String(text).trim();
    var m = /^(-?\d+)\s+(\d+)\/(\d+)$/.exec(t);
    if (m) {
      var sign = m[1] < 0 ? -1 : 1;
      return sign * (Math.abs(parseInt(m[1], 10)) + parseInt(m[2], 10) / parseInt(m[3], 10));
    }
    var f = /^(-?\d+)\/(\d+)$/.exec(t);
    if (f) return parseInt(f[1], 10) / parseInt(f[2], 10);
    return parseFloat(t);
  };

  // Print the substitution a student should write, e.g.
  //   66 in x (2.54 cm / 1 in) = 167.64 cm
  P.substitutionText = function (value, from, to, digits) {
    var p = P.convertPath(from, to);
    if (!p) return "";
    var d = digits === undefined ? 2 : digits;
    var chain = p.steps.map(function (s) {
      // Write each factor so the unit on top cancels the unit below it. A
      // same-system division like ft to yd shows the whole number the ruler
      // prints (1 yd / 3 ft); a printed decimal keeps its own form (0.45 kg / 1 lb).
      var inv = 1 / s.k;
      var invIsRound = Math.abs(inv * 100 - Math.round(inv * 100)) < 1e-6;
      return s.k >= 1 || !invIsRound
        ? "(" + trimNum(s.k) + " " + s.to + " / 1 " + s.from + ")"
        : "(1 " + s.to + " / " + trimNum(inv) + " " + s.from + ")";
    }).join(" x ");
    return trimNum(value) + " " + from + " x " + chain + " = " +
      (Math.round(value * p.factor * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d) + " " + to;
  };
  function trimNum(x) {
    return String(Math.round(x * 1e6) / 1e6);
  }

  root.LS.unitslab = P;
})(typeof globalThis !== "undefined" ? globalThis : window);
