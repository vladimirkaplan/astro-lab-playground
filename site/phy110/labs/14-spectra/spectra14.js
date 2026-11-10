// PHY110 Lab 14 maths: line and continuous spectra with a spectroscope.
// Visible band ~380 to ~760 nm (printed). E = h*f with c = f*lambda: one drop
// between atomic levels emits one wavelength, so hot dilute gases give
// discrete lines while hot solids give a continuous band (the level framing
// is standard, not printed - flag as added). A grating spreads light by
// diffraction, a prism by refraction; qualitative, per the manual.
//
// NOT printed (drawer): the colour-band edges 380/450/485/500/565/590/700 nm
// (the manual figure carries only the letters V B G Y O R), and the line
// reference set - standard tabulated values (NIST), shipped as the sim's own
// answer key. Honesty: the manual's equipment list names an argon lamp while
// its procedure says view mercury - both are shipped and the mismatch is
// footnoted, never silently picked. An uncalibrated handheld scope gives line
// positions, not certified wavelengths, so grading is colour plus band with a
// +-30 nm tolerance, never exact. Line brightness order is not graded: it
// changes with lamp age.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var O = {};

  // ---------- course constants ----------
  O.VISIBLE_MIN = 380;           // nm, printed "~380 to ~760 nm"
  O.VISIBLE_MAX = 760;           // nm, printed
  O.CHART_MIN = 380;             // nm, the recording chart scale (sim's own)
  O.CHART_MAX = 700;             // nm
  // band edges: sim's own build of the manual's V B G Y O R figure letters
  O.BAND_EDGES = Object.freeze([380, 450, 485, 500, 565, 590, 700]);
  O.BAND_NAMES = Object.freeze(["violet", "blue", "green", "yellow", "orange", "red"]);
  O.SWEEP_WINDOW_NM = 80;        // the spectroscope view window, sim's own
  O.GAS_TOL_NM = 30;             // uncalibrated-scope grading tolerance
  O.FUN_JITTER_NM = 30;          // Fun Mode stable line-position wobble

  // the line reference set: standard tabulated values (NIST Atomic Spectra
  // Database, SRD 78, version 5 - the same release as site/data/lines.js;
  // argon included, nothing sourced from a lab-manual chart), the sim's own
  // answer key. Order per source: strongest/first-seen lines first.
  O.LINES = Object.freeze({
    H:  Object.freeze([656.3, 486.1, 434.0]),
    He: Object.freeze([667.8, 587.6, 501.6, 471.3, 447.1]),
    Hg: Object.freeze([579.0, 577.0, 546.1, 435.8]),
    Ar: Object.freeze([750.4, 706.7, 696.5, 496.5, 430.1, 420.1]),
    Ne: Object.freeze([650.7, 640.8, 614.3, 603.0, 585.2])
  });
  O.GASES = Object.freeze(["H", "He", "Ne", "Hg", "Ar"]);
  // chart strip order, per the manual's recording chart
  O.SOURCES = Object.freeze(["filament", "He", "H", "Hg", "Ar", "Ne", "fluorescent"]);

  // ---------- the visible range ----------
  O.isVisible = function (lam) {
    return lam >= O.VISIBLE_MIN && lam <= O.VISIBLE_MAX;
  };
  O.region = function (lam) {
    if (lam < O.VISIBLE_MIN) return "ultraviolet";
    if (lam > O.VISIBLE_MAX) return "infrared";
    return "visible";
  };

  // ---------- colour bands ----------
  // band on the 380-700 chart; null off the chart scale
  O.band = function (lam) {
    if (lam < O.CHART_MIN || lam > O.CHART_MAX) return null;
    for (var i = O.BAND_NAMES.length - 1; i >= 0; i--) {
      if (lam >= O.BAND_EDGES[i]) return O.BAND_NAMES[i];
    }
    return O.BAND_NAMES[0];
  };
  // colour across the whole visible range (red runs to 760)
  O.lineColour = function (lam) {
    if (lam < O.VISIBLE_MIN || lam > O.VISIBLE_MAX) return null;
    var edges = O.BAND_EDGES.slice(0, 6);   // drop the 700 chart stop
    edges.push(O.VISIBLE_MAX);
    for (var i = O.BAND_NAMES.length - 1; i >= 0; i--) {
      if (lam >= edges[i]) return O.BAND_NAMES[i];
    }
    return O.BAND_NAMES[0];
  };

  // ---------- wavelength to screen colour (idealised view) ----------
  // standard 380-780 nm approximation, with the edge dimming a real eye sees
  O.wavelengthRGB = function (lam) {
    if (lam < 380 || lam > 780) return [0, 0, 0];
    var r = 0, g = 0, b = 0;
    if (lam < 440) { r = -(lam - 440) / 60; b = 1; }
    else if (lam < 490) { g = (lam - 440) / 50; b = 1; }
    else if (lam < 510) { g = 1; b = -(lam - 510) / 20; }
    else if (lam < 580) { r = (lam - 510) / 70; g = 1; }
    else if (lam < 645) { r = 1; g = -(lam - 645) / 65; }
    else { r = 1; }
    var k = 1;
    if (lam < 420) k = 0.3 + 0.7 * (lam - 380) / 40;
    else if (lam > 700) k = 0.3 + 0.7 * (780 - lam) / 80;
    var c = function (v) { return Math.round(255 * Math.max(0, Math.min(1, v * k))); };
    return [c(r), c(g), c(b)];
  };

  // ---------- the sources ----------
  // continuum strength 0..1 plus the line set; the fluorescent tube is the
  // mixed case: bright mercury lines on a faint continuous background
  O.sourceProfile = function (name) {
    if (name === "filament") return { continuum: 1, lines: [] };
    if (name === "fluorescent") return { continuum: 0.25, lines: O.LINES.Hg };
    if (O.LINES[name]) return { continuum: 0, lines: O.LINES[name] };
    return null;
  };

  // ---------- fingerprint matching ----------
  // every plotted line within tol of a reference line, and every reference
  // line within tol of a plotted line; colour plus band, never exact
  function minDist(x, arr) {
    var best = Infinity;
    for (var i = 0; i < arr.length; i++) {
      var d = Math.abs(x - arr[i]);
      if (d < best) best = d;
    }
    return best;
  }
  O.identifyGas = function (observed, tol) {
    tol = typeof tol === "number" ? tol : O.GAS_TOL_NM;
    var obs = (observed || []).slice().sort(function (a, b) { return a - b; });
    if (!obs.length) return null;
    var best = null, bestScore = Infinity;
    for (var g = 0; g < O.GASES.length; g++) {
      var gas = O.GASES[g];
      var ref = O.LINES[gas].slice().sort(function (a, b) { return a - b; });
      var score = 0;
      for (var i = 0; i < obs.length; i++) {
        var d1 = minDist(obs[i], ref);
        if (d1 > tol) { score = Infinity; break; }
        score += d1;
      }
      if (score === Infinity) continue;
      for (var j = 0; j < ref.length; j++) {
        if (minDist(ref[j], obs) > tol) { score = Infinity; break; }
      }
      if (score < bestScore) { bestScore = score; best = gas; }
    }
    return best;
  };
  // how many of a gas's reference lines a plotted set covers
  O.coverage = function (observed, gas, tol) {
    tol = typeof tol === "number" ? tol : O.GAS_TOL_NM;
    var ref = O.LINES[gas];
    if (!ref) return { hit: 0, of: 0 };
    var hit = 0;
    for (var i = 0; i < ref.length; i++) {
      if (minDist(ref[i], observed) <= tol) hit++;
    }
    return { hit: hit, of: ref.length };
  };

  O.pctError = function (measured, accepted) {
    if (!accepted || !isFinite(measured)) return NaN;
    return Math.abs(measured - accepted) / Math.abs(accepted) * 100;
  };

  O.accepted = Object.freeze({
    visibleMin: O.VISIBLE_MIN,
    visibleMax: O.VISIBLE_MAX,
    hydrogen: O.LINES.H,
    neonRange: Object.freeze([585, 651]),   // the spec's red-orange block
    uvCut: 102                              // the printed-style UV example
  });

  root.LS.spectra14 = O;
})(typeof globalThis !== "undefined" ? globalThis : window);
