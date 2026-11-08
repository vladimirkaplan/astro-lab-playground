// Pure practice engine for the homework benches: unit conversion with a cited
// factor table, scientific-notation parse/format with SI prefixes,
// light-travel distance arithmetic with the course's rounded c, Newton
// inverse-square and second-law ratio solvers (both directions), and seeded
// generators that make NEW numbers in the handout's problem shapes. Pure
// logic - no DOM, no imports, no network, no clock, zero dependencies - so
// Node can test it and any page can drop it in with a single <script>.
//
// Data sources:
// - Length factors are exact definitions: 1 km = 1000 m, 1 m = 100 cm,
//   1 cm = 10 mm (SI prefixes, NIST SP 811 / SI Brochure); 1 mi = 5280 ft,
//   1 ft = 12 in (US survey/international yard-and-pound agreement of 1959);
//   1 in = 2.54 cm exactly by the same 1959 definition (NIST SP 811).
//   Compound factors are derived from those rows, never quoted separately:
//   1 ft = 12 * 2.54 / 100 m = 0.3048 m, 1 mi = 5280 * 0.3048 m = 1609.344 m.
// - c = 299792.458 km/s exactly in vacuum (defined via the metre and the
//   second; NIST SP 811). C_COURSE = 300000 km/s is the rounded value this
//   course hands out, kept separate so Course Mode and reality can disagree
//   honestly, the same way shared/units.js keeps COURSE_G_PER_OZ.
// - Course time multipliers are the rounded classroom values: 60 s/min,
//   60 min/h, 24 h/d, 7 d/wk, 30 d/month, 365 d/year. With C_COURSE that
//   puts a light-year at 9.4608e12 km, within 0.002% of the 9.4607e12 km
//   that C_TRUE and the IAU Julian year (365.25 d) give.
// - Ratio physics is Newton's law of gravitation (F proportional to 1/d^2)
//   and his second law at constant force (a proportional to 1/m); the course
//   framing follows OpenStax Astronomy 2e (CC BY 4.0).
// This file contains no lab-manual or homework-handout text, figures, or
// answers: it only generates fresh numbers in the same problem shapes.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var H = {};

  // ---- constants ----------------------------------------------------------

  var C_COURSE = 300000;        // km/s, the value the course hands out
  var C_TRUE = 299792.458;      // km/s, exact in vacuum (NIST SP 811)
  var TOL_PERCENT = 2;          // relative tolerance checkers grade against
  var SECONDS_PER_JULIAN_YEAR = 31557600;   // 365.25 d (IAU), for honesty checks

  // Course time multipliers, in seconds. Month and year are the classroom
  // roundings (30 d, 365 d), not calendar or Julian values.
  var TIME_MULT = Object.freeze({
    second: 1,
    minute: 60,
    hour: 3600,
    day: 86400,
    week: 604800,
    month: 2592000,
    year: 31536000
  });

  // ---- conversion factor table -------------------------------------------

  // Each unit is stored as an exact rational number of metres {num, den} plus
  // the cited equalities that derive it, so a checker can show the chain a
  // student is expected to write. num/den stay small enough that products of
  // two of them are exact in a double, so factors like mi -> ft = 5280 come
  // out with no float drift at all.
  var FACTOR_TABLE = {
    km: { label: "kilometre", dim: "length", num: 1000, den: 1,
      chain: ["1 km = 1000 m"] },
    m: { label: "metre", dim: "length", num: 1, den: 1, chain: [] },
    cm: { label: "centimetre", dim: "length", num: 1, den: 100,
      chain: ["1 m = 100 cm"] },
    mm: { label: "millimetre", dim: "length", num: 1, den: 1000,
      chain: ["1 cm = 10 mm", "1 m = 100 cm"] },
    in: { label: "inch", dim: "length", num: 254, den: 10000,
      chain: ["1 in = 2.54 cm", "1 m = 100 cm"] },
    ft: { label: "foot", dim: "length", num: 3048, den: 10000,
      chain: ["1 ft = 12 in", "1 in = 2.54 cm", "1 m = 100 cm"] },
    mi: { label: "mile", dim: "length", num: 1609344, den: 1000,
      chain: ["1 mi = 5280 ft", "1 ft = 12 in", "1 in = 2.54 cm", "1 m = 100 cm"] }
  };
  Object.freeze(FACTOR_TABLE);
  Object.keys(FACTOR_TABLE).forEach(function (k) {
    Object.freeze(FACTOR_TABLE[k]);
    Object.freeze(FACTOR_TABLE[k].chain);
  });

  var UNIT_ALIASES = {
    kilometer: "km", kilometers: "km", kilometres: "km", kms: "km",
    metre: "m", metres: "m", meters: "m",
    centimeter: "cm", centimeters: "cm", centimetres: "cm",
    millimeter: "mm", millimeters: "mm", millimetres: "mm",
    inch: "in", inches: "in",
    foot: "ft", feet: "ft",
    mile: "mi", miles: "mi"
  };
  Object.freeze(UNIT_ALIASES);

  // ---- small validators ---------------------------------------------------

  function finiteNumber(x, label) {
    if (typeof x !== "number" || !isFinite(x)) {
      throw new RangeError(label + " must be a finite number, got " + x);
    }
  }

  function positiveNumber(x, label) {
    finiteNumber(x, label);
    if (x <= 0) {
      throw new RangeError(label + " must be positive, got " + x);
    }
  }

  function nonNegativeNumber(x, label) {
    finiteNumber(x, label);
    if (x < 0) {
      throw new RangeError(label + " must not be negative, got " + x);
    }
  }

  function integerIn(x, lo, hi, label) {
    if (typeof x !== "number" || !isFinite(x) || Math.floor(x) !== x) {
      throw new RangeError(label + " must be a whole number, got " + x);
    }
    if (x < lo || x > hi) {
      throw new RangeError(label + " must be between " + lo + " and " + hi + ", got " + x);
    }
  }

  // Accepts canonical ids (km, m, cm, mm, in, ft, mi) and plain-English
  // spellings; returns the id or null. Case-insensitive, ignores a trailing
  // plural s on ids that take one.
  function resolveUnit(name, table) {
    if (typeof name !== "string") return null;
    var t = table || FACTOR_TABLE;
    var raw = name.trim();
    if (Object.prototype.hasOwnProperty.call(t, raw)) return raw;
    var low = raw.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(t, low)) return low;
    if (Object.prototype.hasOwnProperty.call(UNIT_ALIASES, low)) return UNIT_ALIASES[low];
    var bare = low.replace(/s$/, "");
    if (Object.prototype.hasOwnProperty.call(t, bare)) return bare;
    if (Object.prototype.hasOwnProperty.call(UNIT_ALIASES, bare)) return UNIT_ALIASES[bare];
    return null;
  }

  function tableRow(table, id) {
    var row = table[id];
    if (!row || typeof row.num !== "number" || typeof row.den !== "number" ||
        row.den === 0 || !isFinite(row.num / row.den)) {
      throw new RangeError("factor table has no usable row for unit '" + id + "'");
    }
    return row;
  }

  // ---- 1. conversions ----------------------------------------------------

  // convert(3, "km", "mi") -> { value, factor, ... }. The factor is the exact
  // ratio of the two rows' metre sizes, carried as a rational before the
  // division so whole-number factors (mi -> ft = 5280) land clean.
  function convert(value, from, to, table) {
    finiteNumber(value, "value to convert");
    var t = table || FACTOR_TABLE;
    if (!t || typeof t !== "object") throw new RangeError("convert needs a factor table");
    var fromId = resolveUnit(from, t);
    var toId = resolveUnit(to, t);
    if (!fromId) throw new RangeError("unknown unit to convert from: " + from);
    if (!toId) throw new RangeError("unknown unit to convert to: " + to);
    var a = tableRow(t, fromId);
    var b = tableRow(t, toId);
    if (a.dim !== b.dim) {
      throw new RangeError("cannot convert " + from + " (" + a.dim + ") to " +
        to + " (" + b.dim + ")");
    }
    var factor = (a.num * b.den) / (a.den * b.num);
    // The cited equalities that define both units, in table order, so a
    // checker can show the same short ladder a student is expected to write.
    var steps = [];
    [a.chain || [], b.chain || []].forEach(function (chain) {
      chain.forEach(function (s) {
        if (steps.indexOf(s) < 0) steps.push(s);
      });
    });
    return {
      value: value * factor,
      factor: factor,
      from: fromId,
      to: toId,
      dim: a.dim,
      steps: steps,
      tolerance: TOL_PERCENT
    };
  }

  // Relative-error check in percent-style units, for worksheet checkers.
  function withinTolerance(measured, target, tolPercent) {
    var tol = tolPercent === undefined ? TOL_PERCENT : tolPercent;
    finiteNumber(measured, "measured value");
    finiteNumber(target, "target value");
    finiteNumber(tol, "tolerance percent");
    if (target === 0) return measured === 0;
    return Math.abs(measured - target) / Math.abs(target) * 100 <= tol;
  }

  // ---- 2. scientific notation --------------------------------------------

  // Normalised { mantissa, exponent } with 1 <= |mantissa| < 10, taken from
  // the shortest round-trip digits of the number so 0.00023 gives exactly
  // { mantissa: 2.3, exponent: -4 } and not 2.3000000000000003.
  function toSci(n) {
    finiteNumber(n, "value for scientific notation");
    if (n === 0) return { mantissa: 0, exponent: 0 };
    var s = n.toExponential();
    var m = /^(-?)(\d)(?:\.(\d+))?e([+-]\d+)$/.exec(s);
    if (!m) return { mantissa: n, exponent: 0 };
    var digits = m[2] + (m[3] || "");
    var mantissa = parseFloat(m[1] + digits.slice(0, 1) +
      (digits.length > 1 ? "." + digits.slice(1) : ""));
    return { mantissa: mantissa, exponent: parseInt(m[4], 10) };
  }

  var SCI_E_RE = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))[eE]([+-]?\d+)$/;
  var SCI_X_RE = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?:\s*([xX\u00d7*\u00b7])\s*10\s*(?:\*\*|\^)?\s*([+-]?\d+)?)?$/;
  var SCI_POW_RE = /^10\s*(?:\*\*|\^)\s*([+-]?\d+)$/;

  // Normalise any mantissa/exp pair so the mantissa sits in [1, 10) (or is
  // exactly 0). Digits come from the mantissa's own toExponential, so no
  // lossy multiply by a power of ten is ever needed.
  function normaliseSci(mantissa, exponent) {
    if (mantissa === 0) return { mantissa: 0, exponent: 0 };
    var s = Math.abs(mantissa).toExponential();
    var m = /^(\d)(?:\.(\d+))?e([+-]\d+)$/.exec(s);
    if (!m) return { mantissa: mantissa, exponent: exponent };
    var digits = m[1] + (m[2] || "");
    var lead = parseFloat((mantissa < 0 ? "-" : "") + digits.slice(0, 1) +
      (digits.length > 1 ? "." + digits.slice(1) : ""));
    return { mantissa: lead, exponent: parseInt(m[3], 10) + exponent };
  }

  // Parse student scientific-notation text into normalised
  // { mantissa, exponent }. Accepts 1.265e3, 1.265E+3, "1.265 x 10^3",
  // "1.265 \u00d7 10**3", bare 1265, bare 10^3, and 0. Junk (empty, double
  // dots, dangling "x 10", words, commas, units) returns null and never
  // throws, because students type everything.
  function parseSci(text) {
    if (typeof text !== "string") return null;
    var s = text.trim().replace(/\s+/g, " ");
    if (!s) return null;
    var num = null, exp = 0;
    var e = SCI_E_RE.exec(s);
    var x = e ? null : SCI_X_RE.exec(s);
    var p = e || x ? null : SCI_POW_RE.exec(s);
    if (e) {
      num = e[1];
      exp = parseInt(e[2], 10);
    } else if (x) {
      num = x[1];
      if (x[2] !== undefined) {
        if (x[3] === undefined) return null;   // "1.265 x 10" with no exponent
        exp = parseInt(x[3], 10);
      }
    } else if (p) {
      num = "1";
      exp = parseInt(p[1], 10);
    } else {
      return null;
    }
    var mantissa = parseFloat(num);
    if (!isFinite(mantissa)) return null;
    if (exp > 1e6 || exp < -1e6) return null;
    return normaliseSci(mantissa, exp);
  }

  // Plain-decimal text for a normalised pair: 2.3e-4 -> "0.00023".
  function plainDecimal(n) {
    finiteNumber(n, "value to print");
    if (n === 0) return "0";
    var sci = toSci(n);
    var sign = sci.mantissa < 0 ? "-" : "";
    var mStr = String(Math.abs(sci.mantissa));
    var digits = mStr.replace(".", "");
    var point = 1 + sci.exponent;
    if (point <= 0) return sign + "0." + zeros(-point) + digits;
    if (point >= digits.length) return sign + digits + zeros(point - digits.length);
    return sign + digits.slice(0, point) + "." + digits.slice(point);
  }

  function zeros(k) {
    var out = "";
    for (var i = 0; i < k; i++) out += "0";
    return out;
  }

  // "2.3 x 10^-4" in the ASCII form worksheets print.
  function sciText(sci) {
    if (!sci || typeof sci.mantissa !== "number" || typeof sci.exponent !== "number") {
      throw new RangeError("sciText needs a { mantissa, exponent } pair");
    }
    if (sci.mantissa === 0) return "0";
    return sci.mantissa + " x 10^" + sci.exponent;
  }

  // Round as the course does: k significant figures.
  function sigFigs(x, k) {
    finiteNumber(x, "value to round");
    integerIn(k === undefined ? 3 : k, 1, 15, "significant figures");
    if (x === 0) return 0;
    return parseFloat(x.toExponential((k || 3) - 1));
  }

  // Same rounding, but keeps the trailing zeros that show the student how
  // many figures the course wanted: sigFigsText(299792.458, 3) ->
  // "3.00 x 10^5". Plain decimal inside the window where a worksheet would
  // write it plain (10^-4 up to 10^4), scientific outside.
  function sigFigsText(x, k) {
    var figs = k === undefined ? 3 : k;
    finiteNumber(x, "value to print");
    integerIn(figs, 1, 15, "significant figures");
    if (x === 0) return "0";
    var s = x.toExponential(figs - 1);
    var m = /^(-?\d(?:\.\d+)?)e([+-]\d+)$/.exec(s);
    if (!m) return String(x);
    var exp = parseInt(m[2], 10);
    if (exp >= -4 && exp <= 4) {
      return plainDecimal(parseFloat(s));
    }
    return m[1] + " x 10^" + exp;
  }

  // Compact display for worksheet answers: plain where a student would write
  // plain, scientific outside that window.
  function formatNumber(x) {
    finiteNumber(x, "value to print");
    if (x === 0) return "0";
    var a = Math.abs(x);
    if (a < 1e-3 || a >= 1e6) return sciText(toSci(sigFigs(x, 4)));
    var r = sigFigs(x, 4);
    return String(Number(plainDecimalSig(r)));
  }

  // Trim float noise like 0.30000000000000004 out of a rounded number's text.
  function plainDecimalSig(x) {
    return x.toPrecision(12).replace(/\.?0+$/, "") || "0";
  }

  // ---- SI prefixes -------------------------------------------------------

  // The prefixes this course's worksheets use, with their factors on the base
  // unit. "u" and both mu characters stand for micro so a student typing
  // "500um" gets what they meant. Sub-multiple prefixes carry an exact integer
  // `down` and multi-multiple ones an exact integer `up`, so parsing
  // "400 nanoseconds" divides by 1e9 (a clean double) instead of multiplying
  // by an inexact 1e-9.
  var PREFIXES = Object.freeze({
    "": { symbol: "", name: "", factor: 1, up: 1, down: 1 },
    n: { symbol: "n", name: "nano", factor: 1e-9, up: 1, down: 1e9 },
    "\u00b5": { symbol: "\u00b5", name: "micro", factor: 1e-6, up: 1, down: 1e6 },
    m: { symbol: "m", name: "milli", factor: 1e-3, up: 1, down: 1e3 },
    c: { symbol: "c", name: "centi", factor: 1e-2, up: 1, down: 100 },
    k: { symbol: "k", name: "kilo", factor: 1e3, up: 1e3, down: 1 },
    M: { symbol: "M", name: "mega", factor: 1e6, up: 1e6, down: 1 }
  });

  // Every unit string a student might hand in, mapped to its prefix and base
  // unit. Symbolic keys are SI case ("MHz" is megahertz, "mm" is millimetre);
  // lowercase variants are accepted too because worksheets are typed.
  var SI_UNITS = {
    m: { prefix: "", unit: "m" }, metre: { prefix: "", unit: "m" },
    meters: { prefix: "", unit: "m" }, metres: { prefix: "", unit: "m" },
    mm: { prefix: "m", unit: "m" }, millimeter: { prefix: "m", unit: "m" },
    millimeters: { prefix: "m", unit: "m" }, millimetre: { prefix: "m", unit: "m" },
    millimetres: { prefix: "m", unit: "m" },
    cm: { prefix: "c", unit: "m" }, centimeter: { prefix: "c", unit: "m" },
    centimeters: { prefix: "c", unit: "m" }, centimetre: { prefix: "c", unit: "m" },
    centimetres: { prefix: "c", unit: "m" },
    km: { prefix: "k", unit: "m" }, kilometer: { prefix: "k", unit: "m" },
    kilometers: { prefix: "k", unit: "m" }, kilometre: { prefix: "k", unit: "m" },
    kilometres: { prefix: "k", unit: "m" },
    "\u00b5m": { prefix: "\u00b5", unit: "m" }, "\u03bcm": { prefix: "\u00b5", unit: "m" },
    um: { prefix: "\u00b5", unit: "m" },
    micrometer: { prefix: "\u00b5", unit: "m" }, micrometers: { prefix: "\u00b5", unit: "m" },
    micrometre: { prefix: "\u00b5", unit: "m" }, micrometres: { prefix: "\u00b5", unit: "m" },
    nm: { prefix: "n", unit: "m" }, nanometer: { prefix: "n", unit: "m" },
    nanometers: { prefix: "n", unit: "m" }, nanometre: { prefix: "n", unit: "m" },
    nanometres: { prefix: "n", unit: "m" },
    s: { prefix: "", unit: "s" }, sec: { prefix: "", unit: "s" },
    secs: { prefix: "", unit: "s" }, second: { prefix: "", unit: "s" },
    seconds: { prefix: "", unit: "s" },
    ms: { prefix: "m", unit: "s" }, millisecond: { prefix: "m", unit: "s" },
    milliseconds: { prefix: "m", unit: "s" },
    "\u00b5s": { prefix: "\u00b5", unit: "s" }, "\u03bcs": { prefix: "\u00b5", unit: "s" },
    us: { prefix: "\u00b5", unit: "s" },
    microsecond: { prefix: "\u00b5", unit: "s" }, microseconds: { prefix: "\u00b5", unit: "s" },
    ns: { prefix: "n", unit: "s" }, nanosecond: { prefix: "n", unit: "s" },
    nanoseconds: { prefix: "n", unit: "s" },
    hz: { prefix: "", unit: "Hz" }, hertz: { prefix: "", unit: "Hz" },
    khz: { prefix: "k", unit: "Hz" }, kilohertz: { prefix: "k", unit: "Hz" },
    mhz: { prefix: "M", unit: "Hz" }, megahertz: { prefix: "M", unit: "Hz" }
  };
  Object.freeze(SI_UNITS);

  var SI_RE = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?:\s*(e[Ee])|[eE]([+-]?\d+))?\s*([A-Za-z\u00b5\u03bc]+(?:\s+[A-Za-z]+)?)$/;

  function lookupSIUnit(token) {
    if (Object.prototype.hasOwnProperty.call(SI_UNITS, token)) return SI_UNITS[token];
    var flat = token.toLowerCase().replace(/\s+/g, "");
    if (Object.prototype.hasOwnProperty.call(SI_UNITS, flat)) return SI_UNITS[flat];
    // SI symbols are case-sensitive, so try the original case with spaces
    // stripped as well: "MHz" only lives in the table under its true case.
    var cased = token.replace(/\s+/g, "");
    if (Object.prototype.hasOwnProperty.call(SI_UNITS, cased)) return SI_UNITS[cased];
    return null;
  }

  // Parse a typed measurement like "400 nanoseconds", "300MHz" or "500\u00b5m"
  // into the base-unit value plus the prefix it was written with, so a
  // checker can compare mantissa AND exponent after normalisation. Junk
  // returns null.
  function parseSI(text) {
    if (typeof text !== "string") return null;
    var s = text.trim().replace(/\s+/g, " ").replace(/\.$/, "");
    if (!s) return null;
    var m = SI_RE.exec(s);
    if (!m) return null;
    var count = parseFloat(m[1]);
    if (!isFinite(count)) return null;
    var exp = 0;
    if (m[3] !== undefined) exp = parseInt(m[3], 10);
    var found = lookupSIUnit(m[4]);
    if (!found) return null;
    var pre = PREFIXES[found.prefix];
    if (!pre) return null;
    var value = (count * pre.up) / pre.down * Math.pow(10, exp);
    if (!isFinite(value)) return null;
    var sci = toSci(value);
    return {
      value: value,
      count: count,
      prefix: pre.symbol,
      prefixName: pre.name,
      prefixFactor: pre.factor,
      unit: found.unit,
      mantissa: sci.mantissa,
      exponent: sci.exponent,
      text: sciText(sci)
    };
  }

  // ---- 3. light travel ---------------------------------------------------

  function lightKm(seconds, c) {
    nonNegativeNumber(seconds, "travel time in seconds");
    var speed = c === undefined ? C_COURSE : c;
    positiveNumber(speed, "speed of light in km/s");
    return seconds * speed;
  }

  // Seconds in count time-units, using the course multipliers.
  function timeSeconds(count, unit) {
    finiteNumber(count, "count of time units");
    if (typeof unit !== "string") throw new RangeError("time unit must be a string, got " + unit);
    var key = unit.trim().toLowerCase().replace(/s$/, "");
    if (key === "sec") key = "second";
    if (!Object.prototype.hasOwnProperty.call(TIME_MULT, key)) {
      throw new RangeError("unknown time unit: " + unit);
    }
    return count * TIME_MULT[key];
  }

  // Distance light covers in count time-units: lightDistance(2, "hours").
  function lightDistance(count, unit, c) {
    return lightKm(timeSeconds(count, unit), c);
  }

  // ---- 4 and 5. ratio solvers, both directions ---------------------------

  // Newton's inverse-square law: doubling the distance quarters the force.
  // gravityRatio(d1, d2) is F1/F2 = (d2/d1)^2.
  function gravityRatio(d1, d2) {
    positiveNumber(d1, "distance d1");
    positiveNumber(d2, "distance d2");
    var r = d2 / d1;
    return r * r;
  }

  // The same law read backwards: gravityDistFromRatio(F1/F2) is d1/d2.
  // F1/F2 = (d2/d1)^2, so d1/d2 = 1/sqrt(F1/F2).
  function gravityDistFromRatio(ratio) {
    positiveNumber(ratio, "force ratio F1/F2");
    return 1 / Math.sqrt(ratio);
  }

  // Second law at constant force: a = F/m, so accelRatio(m1, m2) is
  // a1/a2 = m2/m1 - four times the mass, a quarter of the acceleration.
  function accelRatio(m1, m2) {
    positiveNumber(m1, "mass m1");
    positiveNumber(m2, "mass m2");
    return m2 / m1;
  }

  // accelMassFromRatio(a1/a2) is m1/m2 = 1/(a1/a2).
  function accelMassFromRatio(ratio) {
    positiveNumber(ratio, "acceleration ratio a1/a2");
    return 1 / ratio;
  }

  // ---- seeded generation --------------------------------------------------

  // mulberry32-shaped PRNG, reimplemented here so this module keeps zero
  // dependencies; same form as LS.units.mulberry32, so seeds behave the way
  // students' pages already expect.
  function prng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function seedNumber(seed) {
    if (typeof seed === "number" && isFinite(seed)) return Math.trunc(seed) >>> 0;
    if (typeof seed === "string" && seed.length) return hashString(seed);
    throw new RangeError("seed must be a finite number or a non-empty string, got " + seed);
  }

  function pick(rng, list) {
    var i = Math.floor(rng() * list.length);
    if (i >= list.length) i = list.length - 1;
    return list[i];
  }

  function gcd(a, b) {
    while (b) {
      var t = a % b;
      a = b;
      b = t;
    }
    return a;
  }

  // Reduced fraction with the text a student would write. Improper fractions
  // stay improper (5/3, not 1 2/3) because that is what the ratios are.
  function fraction(num, den) {
    if (!den) throw new RangeError("fraction denominator must be non-zero");
    if (den < 0) { num = -num; den = -den; }
    var g = gcd(Math.abs(num), den) || 1;
    var n = num / g, d = den / g;
    return { num: n, den: d, value: n / d, text: d === 1 ? String(n) : n + "/" + d };
  }

  // Coprime pairs (p, q) with both entries in 1..5, in both orders: forward
  // rows write "d1 = p/q d2" and the answer is (q/p)^2, so this pool is what
  // keeps every answer a small fraction like 1/4, 4/25 or 16/9 instead of a
  // random float.
  var RATIO_PAIRS = Object.freeze([
    [2, 1], [3, 1], [4, 1], [5, 1], [3, 2], [5, 2], [4, 3], [5, 3], [5, 4],
    [1, 2], [1, 3], [1, 4], [2, 3], [2, 5], [3, 4], [3, 5], [4, 5]
  ]);
  // Pairs for the reverse rows, where both coefficients must be visible
  // (no lonely 1 on the left of the equals sign).
  var REVERSE_PAIRS = Object.freeze([
    [2, 3], [3, 2], [2, 5], [5, 2], [3, 4], [4, 3], [3, 5], [5, 3], [4, 5], [5, 4]
  ]);
  Object.freeze(RATIO_PAIRS);
  Object.freeze(REVERSE_PAIRS);
  Object.keys(RATIO_PAIRS).forEach(function (k) { Object.freeze(RATIO_PAIRS[k]); });
  Object.keys(REVERSE_PAIRS).forEach(function (k) { Object.freeze(REVERSE_PAIRS[k]); });

  // genRatioTable(seed, "gravity") rows look like the handout's two columns:
  //   forward  given "d1 = 2 d2", blank is the force ratio F1/F2
  //   reverse  given "9F1 = 25F2", blank is the distance relation d1 = ? d2
  // kind "accel" swaps the law for a = F/m at constant force:
  //   forward  given "m1 = 4 m2", blank is a1/a2
  //   reverse  given "3a1 = 5a2", blank is the mass relation m1 = ? m2
  // Answers come from the same solvers the checkers use, so a row can never
  // disagree with the physics.
  function genRatioTable(seed, kind, rows) {
    var which = kind === undefined ? "gravity" : kind;
    if (which !== "gravity" && which !== "accel") {
      throw new RangeError("genRatioTable kind must be 'gravity' or 'accel', got " + kind);
    }
    var count = rows === undefined ? 8 : rows;
    integerIn(count, 1, 40, "row count");
    var rng = prng(seedNumber(seed) ^ (which === "gravity" ? 0x92a517 : 0x4c2e11));
    var out = [];
    var seen = {};
    for (var i = 0; i < count; i++) {
      // Force one of each shape up front so a short table still practises
      // both directions, then let the seed mix the rest.
      var forward = i === 0 ? true : (i === 1 ? false : rng() < 0.5);
      var row = forward ? forwardRow(rng, which) : reverseRow(rng, which);
      var guard = 0;
      while (seen[row.given] && guard++ < 12) {
        row = forward ? forwardRow(rng, which) : reverseRow(rng, which);
      }
      seen[row.given] = true;
      row.kind = which;
      row.index = i;
      row.tolerance = TOL_PERCENT;
      out.push(Object.freeze(row));
    }
    return Object.freeze({ kind: which, seed: seed, rows: Object.freeze(out) });
  }

  function forwardRow(rng, which) {
    var pair = pick(rng, RATIO_PAIRS);
    var p = pair[0], q = pair[1];
    if (which === "gravity") {
      var f = fraction(q * q, p * p);
      return {
        direction: "forward",
        given: "d1 = " + (q === 1 ? String(p) : p + "/" + q) + " d2",
        ask: "F1/F2",
        prompt: "F1/F2 = ____",
        answer: f,
        answerText: f.text,
        check: gravityRatio(p / q, 1)
      };
    }
    var a = fraction(q, p);
    return {
      direction: "forward",
      given: "m1 = " + (q === 1 ? String(p) : p + "/" + q) + " m2",
      ask: "a1/a2",
      prompt: "a1/a2 = ____",
      answer: a,
      answerText: a.text,
      check: accelRatio(p / q, 1)
    };
  }

  function reverseRow(rng, which) {
    var pair = pick(rng, REVERSE_PAIRS);
    var a = pair[0], b = pair[1];
    if (which === "gravity") {
      // a^2 F1 = b^2 F2 means F1/F2 = b^2/a^2, so d1/d2 = a/b.
      var d = fraction(a, b);
      return {
        direction: "reverse",
        given: (a * a) + "F1 = " + (b * b) + "F2",
        ask: "d1/d2",
        prompt: "d1 = ____ d2",
        answer: d,
        answerText: d.text,
        check: gravityDistFromRatio((b * b) / (a * a))
      };
    }
    // a1/a2 = b/a means m1/m2 = a/b.
    var m = fraction(a, b);
    return {
      direction: "reverse",
      given: a + "a1 = " + b + "a2",
      ask: "m1/m2",
      prompt: "m1 = ____ m2",
      answer: m,
      answerText: m.text,
      check: accelMassFromRatio(b / a)
    };
  }

  // ---- 7. worksheet problem generators -----------------------------------

  var CONVERT_VALUES = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 25, 40, 75,
    150, 300, 1250, 3600, 0.5, 2.5, 7.5]);
  Object.freeze(CONVERT_VALUES);
  var CONVERT_PAIRS = Object.freeze([
    ["km", "m"], ["m", "km"], ["m", "cm"], ["cm", "m"], ["cm", "mm"],
    ["mm", "cm"], ["km", "mi"], ["mi", "km"], ["m", "ft"], ["ft", "m"],
    ["mi", "ft"], ["ft", "mi"], ["in", "cm"], ["cm", "in"], ["ft", "in"],
    ["in", "ft"], ["mi", "in"], ["mm", "m"]
  ]);
  Object.freeze(CONVERT_PAIRS);
  Object.keys(CONVERT_PAIRS).forEach(function (k) { Object.freeze(CONVERT_PAIRS[k]); });

  // genConversionSet(seed, n): fresh "X unit = ____ other" prompts drawn from
  // the cited table, each carrying the answer, the exact factor, and the
  // equality chain to show as worked solution.
  function genConversionSet(seed, n) {
    var count = n === undefined ? 6 : n;
    integerIn(count, 1, 30, "problem count");
    var rng = prng(seedNumber(seed) ^ 0x51ce);
    var rows = [];
    var seen = {};
    for (var i = 0; i < count; i++) {
      var value = pick(rng, CONVERT_VALUES);
      var pair = pick(rng, CONVERT_PAIRS);
      var key = value + "|" + pair[0] + "|" + pair[1];
      var guard = 0;
      while (seen[key] && guard++ < 20) {
        value = pick(rng, CONVERT_VALUES);
        pair = pick(rng, CONVERT_PAIRS);
        key = value + "|" + pair[0] + "|" + pair[1];
      }
      seen[key] = true;
      var c = convert(value, pair[0], pair[1]);
      rows.push(Object.freeze({
        index: i,
        type: "convert",
        given: value + " " + pair[0] + " = ____ " + pair[1],
        value: value,
        from: pair[0],
        to: pair[1],
        factor: c.factor,
        steps: Object.freeze(c.steps.slice()),
        answer: c.value,
        answerText: formatNumber(c.value) + " " + pair[1],
        tolerance: TOL_PERCENT
      }));
    }
    return Object.freeze({ kind: "conversion", seed: seed, rows: Object.freeze(rows) });
  }

  var SCI_MANTISSAS = Object.freeze([1.05, 1.2, 1.265, 2.3, 2.5, 3.75, 4.6,
    6.4, 7.2, 8.75, 9.6]);
  Object.freeze(SCI_MANTISSAS);
  // Prefix/unit combinations the worksheets actually use, with the base-unit
  // exponent their prefix implies.
  var SCI_PREFIX_KINDS = Object.freeze([
    { text: "nm", exponent: -9 }, { text: "\u00b5m", exponent: -6 },
    { text: "mm", exponent: -3 }, { text: "cm", exponent: -2 },
    { text: "km", exponent: 3 }, { text: "ns", exponent: -9 },
    { text: "\u00b5s", exponent: -6 }, { text: "ms", exponent: -3 },
    { text: "MHz", exponent: 6 }, { text: "kHz", exponent: 3 }
  ]);
  Object.freeze(SCI_PREFIX_KINDS);
  Object.keys(SCI_PREFIX_KINDS).forEach(function (k) { Object.freeze(SCI_PREFIX_KINDS[k]); });

  // genSciSet(seed, n): mixed "write it in scientific notation" prompts,
  // half from plain decimals and half from prefixed measurements so students
  // have to normalise the prefix before they can read off the exponent.
  function genSciSet(seed, n) {
    var count = n === undefined ? 6 : n;
    integerIn(count, 1, 30, "problem count");
    var rng = prng(seedNumber(seed) ^ 0x5c1);
    var rows = [];
    var seen = {};
    for (var i = 0; i < count; i++) {
      var row;
      var guard = 0;
      do {
        row = rng() < 0.5 ? plainSciRow(rng) : prefixSciRow(rng);
      } while (seen[row.given] && guard++ < 20);
      seen[row.given] = true;
      row.index = i;
      rows.push(Object.freeze(row));
    }
    return Object.freeze({ kind: "sci", seed: seed, rows: Object.freeze(rows) });
  }

  function plainSciRow(rng) {
    var m = pick(rng, SCI_MANTISSAS);
    var e = Math.floor(rng() * 18) - 9;          // -9 .. 9, skipping 0:
    if (e >= 0) e += 1;                          // "write 3.75 in sci notation" is no exercise
    // Build the value from its digits so the mantissa survives exactly.
    var value = parseFloat(m + "e" + e);
    var sci = toSci(value);
    return {
      type: "toSci",
      given: "Write " + plainDecimal(value) + " in scientific notation.",
      value: value,
      givenText: plainDecimal(value),
      answer: sci,
      answerText: sciText(sci),
      mantissa: sci.mantissa,
      exponent: sci.exponent
    };
  }

  function prefixSciRow(rng) {
    var kind = pick(rng, SCI_PREFIX_KINDS);
    var m = pick(rng, SCI_MANTISSAS);
    var value = parseFloat(m + "e" + kind.exponent);
    var sci = toSci(value);
    return {
      type: "prefix",
      given: "Write " + m + " " + kind.text + " in scientific notation, in base units.",
      givenText: m + " " + kind.text,
      value: value,
      answer: sci,
      answerText: sciText(sci),
      mantissa: sci.mantissa,
      exponent: sci.exponent
    };
  }

  var LIGHT_UNITS = Object.freeze(["minute", "hour", "day", "week", "month", "year"]);
  Object.freeze(LIGHT_UNITS);
  var LIGHT_COUNTS = Object.freeze([1, 2, 3, 4, 5, 8, 10, 12, 24]);
  Object.freeze(LIGHT_COUNTS);
  // Clean travel times in seconds, so the given distance is exact at C_COURSE
  // and the requested time comes out whole or half.
  var LIGHT_SECONDS = Object.freeze([10, 30, 60, 150, 600, 1800, 3600, 7200,
    21600, 43200, 86400, 604800]);
  Object.freeze(LIGHT_SECONDS);

  // genLightSet(seed, n): light-travel distance both ways at C_COURSE -
  // "how far is N light-weeks" and "how long does light take to cover D km".
  function genLightSet(seed, n) {
    var count = n === undefined ? 6 : n;
    integerIn(count, 1, 30, "problem count");
    var rng = prng(seedNumber(seed) ^ 0x12ce);
    var rows = [];
    var seen = {};
    for (var i = 0; i < count; i++) {
      var row = rng() < 0.5 ? lightDistanceRow(rng) : lightTimeRow(rng);
      var guard = 0;
      while (seen[row.given] && guard++ < 20) {
        row = row.type === "lightDistance" ? lightDistanceRow(rng) : lightTimeRow(rng);
      }
      seen[row.given] = true;
      row.index = i;
      row.c = C_COURSE;
      rows.push(Object.freeze(row));
    }
    return Object.freeze({ kind: "light", seed: seed, rows: Object.freeze(rows) });
  }

  function lightDistanceRow(rng) {
    var unit = pick(rng, LIGHT_UNITS);
    var count = pick(rng, LIGHT_COUNTS);
    var seconds = timeSeconds(count, unit);
    var km = lightKm(seconds, C_COURSE);
    return {
      type: "lightDistance",
      given: "How many km is " + count + " light-" +
        (count === 1 ? unit : unit + "s") + " at c = " + C_COURSE + " km/s?",
      unit: unit,
      count: count,
      seconds: seconds,
      answer: km,
      answerText: formatNumber(km) + " km",
      tolerance: TOL_PERCENT
    };
  }

  function lightTimeRow(rng) {
    var seconds = pick(rng, LIGHT_SECONDS);
    var km = lightKm(seconds, C_COURSE);
    // Ask in a unit the answer actually fills: 10 seconds of travel is a
    // question about seconds, not about weeks.
    var options = LIGHT_UNITS.filter(function (u) {
      return seconds / TIME_MULT[u] >= 1;
    });
    var unit = options.length ? pick(rng, options) : "second";
    var answer = seconds / TIME_MULT[unit];
    return {
      type: "lightTime",
      given: "Light travels " + formatNumber(km) +
        " km. How many " + unit + "s is that at c = " + C_COURSE + " km/s?",
      km: km,
      unit: unit,
      answer: answer,
      answerText: formatNumber(answer) + " " + unit + "s",
      tolerance: TOL_PERCENT
    };
  }

  H.C_COURSE = C_COURSE;
  H.C_TRUE = C_TRUE;
  H.TOL_PERCENT = TOL_PERCENT;
  H.TIME_MULT = TIME_MULT;
  H.SECONDS_PER_JULIAN_YEAR = SECONDS_PER_JULIAN_YEAR;
  H.FACTOR_TABLE = FACTOR_TABLE;
  H.UNIT_ALIASES = UNIT_ALIASES;
  H.PREFIXES = PREFIXES;
  H.resolveUnit = resolveUnit;
  H.convert = convert;
  H.withinTolerance = withinTolerance;
  H.toSci = toSci;
  H.parseSci = parseSci;
  H.sciText = sciText;
  H.plainDecimal = plainDecimal;
  H.sigFigs = sigFigs;
  H.sigFigsText = sigFigsText;
  H.formatNumber = formatNumber;
  H.parseSI = parseSI;
  H.lightKm = lightKm;
  H.timeSeconds = timeSeconds;
  H.lightDistance = lightDistance;
  H.gravityRatio = gravityRatio;
  H.gravityDistFromRatio = gravityDistFromRatio;
  H.accelRatio = accelRatio;
  H.accelMassFromRatio = accelMassFromRatio;
  H.genRatioTable = genRatioTable;
  H.genConversionSet = genConversionSet;
  H.genSciSet = genSciSet;
  H.genLightSet = genLightSet;

  root.LS.hwCore = H;
})(typeof window !== "undefined" ? window : globalThis);
