// Physics core for the H-R diagram lab. Pure data and functions, no DOM, so
// Node can test it and the browser can load it over file://.
//
// Everything the sim shows is derived from two numbers per star: effective
// temperature and luminosity in solar units. The radius the sim draws is never
// typed in by hand: it comes out of the Stefan-Boltzmann law, which is the
// whole point of reading a H-R diagram.
//
// Star values are rounded public catalog averages (temperature, luminosity),
// compiled from published summaries of the Yale Bright Star Catalog and
// standard star fact sheets; where sources disagree the more-cited value was
// used. The three white dwarfs ship a luminosity computed from their published
// temperature and radius, because printed white-dwarf luminosities for the same
// star vary by a factor of two between sources. Radii quoted anywhere on the
// page are derived from these two numbers and can sit 10-30% away from a direct
// interferometric radius: that gap is rounding plus real variability, not a bug.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var H = {};

  H.T_SUN = 5772;                  // K, IAU nominal solar effective temperature
  H.R_SUN_KM = 695700;
  H.AU_PER_RSUN = 0.00465047;

  // name, con, teff (K), lum (solar units), cls (published luminosity class),
  // region = where this star actually sits on the diagram (the classify() rules
  // must agree with it; tests enforce that).
  H.STARS = [
    // hot main sequence
    { name: "Mimosa", con: "Cru", teff: 27000, lum: 29000, cls: "B0.5 IV", region: "main sequence" },
    { name: "Spica", con: "Vir", teff: 25300, lum: 21000, cls: "B1 III-IV", region: "main sequence" },
    { name: "Regulus", con: "Leo", teff: 12460, lum: 324, cls: "B8 IV", region: "main sequence" },
    // A and F main sequence
    { name: "Sirius", con: "CMa", teff: 9940, lum: 25.4, cls: "A1 V", region: "main sequence" },
    { name: "Vega", con: "Lyr", teff: 9600, lum: 40.1, cls: "A0 V", region: "main sequence" },
    { name: "Fomalhaut", con: "PsA", teff: 8590, lum: 16.6, cls: "A3 V", region: "main sequence" },
    { name: "Altair", con: "Aql", teff: 7550, lum: 10.6, cls: "A7 V", region: "main sequence" },
    { name: "Procyon", con: "CMi", teff: 6530, lum: 6.9, cls: "F5 IV-V", region: "main sequence" },
    // solar-type and cooler main sequence
    { name: "Sun", con: "-", teff: 5772, lum: 1.0, cls: "G2 V", region: "main sequence" },
    { name: "Rigil Kentaurus A", con: "Cen", teff: 5790, lum: 1.52, cls: "G2 V", region: "main sequence" },
    { name: "Epsilon Eridani", con: "Eri", teff: 5080, lum: 0.34, cls: "K2 V", region: "main sequence" },
    { name: "Lalande 21185", con: "UMa", teff: 3510, lum: 0.0243, cls: "M2 V", region: "main sequence" },
    { name: "Barnard's Star", con: "Oph", teff: 3134, lum: 0.0035, cls: "M4 V", region: "main sequence" },
    { name: "Proxima Centauri", con: "Cen", teff: 3042, lum: 0.0017, cls: "M5.5 V", region: "main sequence" },
    { name: "Wolf 359", con: "Sex", teff: 2800, lum: 0.0014, cls: "M6 V", region: "main sequence" },
    // giants
    { name: "Pollux", con: "Gem", teff: 4590, lum: 43, cls: "K0 III", region: "giant" },
    { name: "Arcturus", con: "Boo", teff: 4290, lum: 108, cls: "K1.5 III", region: "giant" },
    { name: "Aldebaran", con: "Tau", teff: 3910, lum: 440, cls: "K5 III", region: "giant" },
    { name: "Gacrux", con: "Cru", teff: 3620, lum: 810, cls: "M3 III", region: "giant" },
    { name: "Polaris", con: "UMi", teff: 6015, lum: 1260, cls: "F7 Ib", region: "giant" },
    // supergiants
    { name: "Canopus", con: "Car", teff: 7400, lum: 11000, cls: "A9 II", region: "supergiant" },
    { name: "Wezen", con: "CMa", teff: 6000, lum: 50000, cls: "F8 Ia", region: "supergiant" },
    { name: "Deneb", con: "Cyg", teff: 8500, lum: 200000, cls: "A2 Ia", region: "supergiant" },
    { name: "Rigel", con: "Ori", teff: 12100, lum: 120000, cls: "B8 Ia", region: "supergiant" },
    { name: "Antares", con: "Sco", teff: 3660, lum: 76000, cls: "M1 Iab", region: "supergiant" },
    { name: "Betelgeuse", con: "Ori", teff: 3600, lum: 130000, cls: "M2 Iab", region: "supergiant" },
    // white dwarfs: luminosity derived from published temperature and radius
    { name: "Sirius B", con: "CMa", teff: 25200, lum: 0.026, cls: "DA2", region: "white dwarf" },
    { name: "40 Eridani B", con: "Eri", teff: 16500, lum: 0.0124, cls: "DA4", region: "white dwarf" },
    { name: "Procyon B", con: "CMi", teff: 7740, lum: 0.00049, cls: "DQ6", region: "white dwarf" }
  ];

  // Main-sequence ridge: log10(luminosity) against temperature, from standard
  // dwarf values for each spectral type. The sim draws it as the "hydrogen
  // burning" guide line; classify() measures how far a star sits above it.
  H.RIDGE = [
    [3000, -2.6], [3400, -1.7], [3900, -1.22], [4400, -0.82], [5250, -0.4],
    [5770, 0], [7200, 0.85], [8200, 1.18], [9700, 1.6], [12300, 2.48],
    [15400, 2.9], [20000, 3.6], [25300, 4.32], [33000, 4.48]
  ];

  function log10(x) { return Math.log(x) / Math.LN10; }
  H.log10 = log10;

  // Stefan-Boltzmann, in solar units: L = R^2 (T/Tsun)^4
  H.lumFromTR = function (rsun, teff) {
    var t = teff / H.T_SUN;
    return rsun * rsun * t * t * t * t;
  };

  // The same law read backwards, which is how a H-R diagram is actually used:
  // temperature and luminosity are measured, radius is the unknown.
  H.radiusFromTL = function (lum, teff) {
    if (!(lum > 0) || !(teff > 0)) return NaN;
    var t = teff / H.T_SUN;
    return Math.sqrt(lum) / (t * t);
  };

  H.radiusAU = function (rsun) { return rsun * H.AU_PER_RSUN; };

  // log L of the main-sequence ridge at a given temperature, clamped at the
  // ends so a 2,500 K star still gets a sensible reference.
  H.ridgeLogL = function (teff) {
    var R = H.RIDGE;
    if (teff <= R[0][0]) return R[0][1];
    if (teff >= R[R.length - 1][0]) return R[R.length - 1][1];
    for (var i = 1; i < R.length; i++) {
      if (teff <= R[i][0]) {
        var f = (teff - R[i - 1][0]) / (R[i][0] - R[i - 1][0]);
        return R[i - 1][1] + f * (R[i][1] - R[i - 1][1]);
      }
    }
    return R[R.length - 1][1];
  };

  // How far above the main sequence, in decades of luminosity. The number a
  // student should be able to say out loud: "a giant sits about two decades
  // above the dwarf of the same colour".
  H.aboveMS = function (lum, teff) { return log10(lum) - H.ridgeLogL(teff); };

  H.classify = function (teff, lum) {
    if (!(lum > 0) || !(teff > 0)) return "unknown";
    if (H.radiusFromTL(lum, teff) < 0.05) return "white dwarf";
    var d = H.aboveMS(lum, teff);
    if (d >= 1.2) return log10(lum) >= 4 ? "supergiant" : "giant";
    if (d > -1.2) return "main sequence";
    return "below the main sequence";
  };

  // Standard temperature boundaries, rounded to the values the course prints.
  H.spectralClass = function (teff) {
    if (teff >= 30000) return "O";
    if (teff >= 10000) return "B";
    if (teff >= 7500) return "A";
    if (teff >= 6000) return "F";
    if (teff >= 5200) return "G";
    if (teff >= 3700) return "K";
    return "M";
  };

  H.classHint = {
    O: "blue-white, rare, enormously luminous",
    B: "blue-white, hot, several to many solar luminosities",
    A: "white, a few solar luminosities up to a few tens",
    F: "pale yellow-white",
    G: "yellow, Sun-like",
    K: "orange",
    M: "red, the coolest and dimmest dwarfs"
  };

  // Approximate visual colour of a star at a given temperature, interpolated in
  // log T. These are the usual blackbody-swatch values; good enough to paint a
  // dot, not good enough to calibrate a photometer.
  var SWATCH = [
    [30000, [157, 180, 255]], [20000, [163, 184, 255]], [12000, [186, 205, 255]],
    [9000, [202, 215, 255]], [7500, [224, 232, 255]], [6500, [255, 250, 240]],
    [5772, [255, 241, 214]], [5000, [255, 214, 170]], [4300, [255, 184, 128]],
    [3600, [255, 147, 94]], [3000, [255, 98, 62]], [2500, [255, 70, 45]]
  ];

  H.colorFromT = function (teff) {
    var t = Math.max(2500, Math.min(30000, teff));
    for (var i = 1; i < SWATCH.length; i++) {
      if (t >= SWATCH[i][0]) {
        var f = (log10(t) - log10(SWATCH[i][0])) / (log10(SWATCH[i - 1][0]) - log10(SWATCH[i][0]));
        var a = SWATCH[i][1], b = SWATCH[i - 1][1];
        return [
          Math.round(a[0] + f * (b[0] - a[0])),
          Math.round(a[1] + f * (b[1] - a[1])),
          Math.round(a[2] + f * (b[2] - a[2]))
        ];
      }
    }
    return SWATCH[SWATCH.length - 1][1].slice();
  };

  H.rgb = function (c) { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; };

  H.findByName = function (name) {
    if (typeof name !== "string") return null;
    var want = name.trim().toLowerCase();
    for (var i = 0; i < H.STARS.length; i++) {
      if (H.STARS[i].name.toLowerCase() === want) return H.STARS[i];
    }
    return null;
  };

  // Compact readout for the sim and the log table.
  H.summary = function (teff, lum) {
    var r = H.radiusFromTL(lum, teff);
    return {
      teff: Math.round(teff / 10) * 10,
      lum: lum >= 100 ? Math.round(lum) : Math.round(lum * 1000) / 1000,
      lumText: lum >= 1000 ? lum.toExponential(1).replace("e+", "e") : String(lum),
      radius: r >= 100 ? Math.round(r) : Math.round(r * 100) / 100,
      radiusAU: Math.round(H.radiusAU(r) * 100) / 100,
      spectral: H.spectralClass(teff),
      region: H.classify(teff, lum),
      aboveMS: Math.round(H.aboveMS(lum, teff) * 10) / 10 + 0
    };
  };

  // Load-time data guards: cheap, and they keep a typo out of the diagram.
  (function check() {
    var seen = {};
    for (var i = 0; i < H.STARS.length; i++) {
      var s = H.STARS[i];
      var k = s.name.toLowerCase();
      if (seen[k]) throw new Error("duplicate star in hr.js: " + s.name);
      seen[k] = true;
      if (!(s.teff >= 2500 && s.teff <= 35000)) throw new Error("teff out of range: " + s.name);
      if (!(s.lum > 0 && s.lum < 1e6)) throw new Error("luminosity out of range: " + s.name);
    }
    for (var j = 1; j < H.RIDGE.length; j++) {
      if (H.RIDGE[j][0] <= H.RIDGE[j - 1][0]) throw new Error("RIDGE temperatures must rise");
      if (H.RIDGE[j][1] < H.RIDGE[j - 1][1]) throw new Error("RIDGE must not fall with temperature");
    }
  })();

  root.LS.hr = H;
})(typeof globalThis !== "undefined" ? globalThis : window);
