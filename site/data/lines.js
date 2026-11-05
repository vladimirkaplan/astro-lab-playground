// Spectrum data for the Spectra lab sim: real line wavelengths in nanometers,
// continuous-source models, and a wavelength-to-screen-color helper.
// Pure data + functions (no DOM), so Node can test it.
//
// Sources of the numbers:
// - Line wavelengths: NIST Atomic Spectra Database (v5), strongest visible
//   emission lines per gas, rounded to 0.1 nm; neon and krypton lists are
//   curated subsets (their real spectra have far more faint lines).
// - Incandescent lamp modeled as a ~2850 K blackbody; fluorescent tube as
//   mercury lines on top of broad phosphor bands. Model shapes are our own.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var D = {};

  // Brightness values are relative eye feel, not lab photometry.
  D.sources = [
    {
      id: "bulb", name: "Incandescent bulb", kind: "continuous", tempK: 2850,
      blurb: "Hot tungsten filament: a solid, dense, glowing. Every visible wavelength comes out.",
      citation: "Model: blackbody curve at 2850 K"
    },
    {
      id: "h", name: "Hydrogen (H)", kind: "lines",
      lines: [
        { nm: 410.2, i: 0.45 }, { nm: 434.0, i: 0.65 },
        { nm: 486.1, i: 0.85 }, { nm: 656.3, i: 1.0 }
      ],
      blurb: "Four visible lines (the Balmer series): red, teal-blue, two violet shades.",
      citation: "NIST Atomic Spectra Database"
    },
    {
      id: "he", name: "Helium (He)", kind: "lines",
      lines: [
        { nm: 388.9, i: 0.3 }, { nm: 447.1, i: 0.6 }, { nm: 471.3, i: 0.4 },
        { nm: 492.2, i: 0.35 }, { nm: 501.6, i: 0.5 }, { nm: 587.6, i: 0.75 },
        { nm: 667.8, i: 0.6 }, { nm: 706.5, i: 0.45 }
      ],
      blurb: "Yellow, green, cyan, blue and red: more lines than hydrogen, and a different spacing.",
      citation: "NIST Atomic Spectra Database"
    },
    {
      id: "ne", name: "Neon (Ne)", kind: "lines",
      lines: [
        { nm: 540.1, i: 0.5 }, { nm: 541.9, i: 0.45 }, { nm: 576.4, i: 0.5 },
        { nm: 585.2, i: 0.8 }, { nm: 588.2, i: 0.5 }, { nm: 594.5, i: 0.45 },
        { nm: 603.0, i: 0.45 }, { nm: 607.4, i: 0.45 }, { nm: 614.3, i: 0.5 },
        { nm: 621.7, i: 0.45 }, { nm: 630.5, i: 0.5 }, { nm: 633.4, i: 0.45 },
        { nm: 638.3, i: 0.55 }, { nm: 640.2, i: 0.7 }, { nm: 650.7, i: 0.65 },
        { nm: 653.3, i: 0.55 }, { nm: 659.9, i: 0.65 }, { nm: 692.9, i: 0.45 },
        { nm: 703.2, i: 0.5 }
      ],
      blurb: "A dense carpet of orange-red lines. That is the color of a neon sign.",
      citation: "NIST Atomic Spectra Database (strongest visible subset)"
    },
    {
      id: "hg", name: "Mercury (Hg)", kind: "lines",
      lines: [
        { nm: 404.7, i: 0.7 }, { nm: 435.8, i: 0.85 }, { nm: 491.6, i: 0.3 },
        { nm: 546.1, i: 1.0 }, { nm: 577.0, i: 0.8 }, { nm: 579.1, i: 0.7 }
      ],
      blurb: "The blue and the searing green you remember from a school hallway.",
      citation: "NIST Atomic Spectra Database"
    },
    {
      id: "kr", name: "Krypton (Kr)", kind: "lines",
      lines: [
        { nm: 427.4, i: 1.0 }, { nm: 431.9, i: 0.8 }, { nm: 556.2, i: 0.4 },
        { nm: 557.0, i: 0.6 }, { nm: 568.2, i: 0.9 }, { nm: 587.1, i: 0.5 },
        { nm: 647.1, i: 0.45 }
      ],
      blurb: "A tight blue pair plus an orange band. Still more lines lie just past deep red.",
      citation: "NIST Atomic Spectra Database, screened against university lab charts"
    },
    {
      id: "fluoro", name: "Fluorescent lamp", kind: "mixed",
      lines: [
        { nm: 404.7, i: 0.5 }, { nm: 435.8, i: 0.6 }, { nm: 491.6, i: 0.2 },
        { nm: 546.1, i: 0.65 }, { nm: 577.0, i: 0.45 }, { nm: 579.1, i: 0.45 }
      ],
      bands: [
        { c: 450, s: 22, a: 0.45 },  // blue phosphor
        { c: 545, s: 38, a: 0.7 },   // green phosphor
        { c: 611, s: 30, a: 0.65 }   // red phosphor
      ],
      blurb: "Mercury vapor flashes ultraviolet; the white coating turns it into broad bands, and a few mercury lines sneak through.",
      citation: "Hg lines: NIST ASD; phosphor bands: generic triphosphor model"
    }
  ];

  D.colorWords = [
    { word: "violet", lo: 380, hi: 450 },
    { word: "blue", lo: 450, hi: 495 },
    { word: "green", lo: 495, hi: 570 },
    { word: "yellow", lo: 570, hi: 590 },
    { word: "orange", lo: 590, hi: 620 },
    { word: "red", lo: 620, hi: 750 }
  ];
  D.wordForNm = function (nm) {
    for (var i = 0; i < D.colorWords.length; i++) {
      var w = D.colorWords[i];
      if (nm >= w.lo && nm < w.hi) return w.word;
    }
    return "deep red";
  };

  // Planck spectral radiance shape at temperature K, up to an arbitrary scale.
  D.planck = function (nm, K) {
    var lam = nm * 1e-9, h = 6.626e-34, c = 3e8, kB = 1.381e-23;
    var num = 2 * h * c * c / Math.pow(lam, 5);
    var x = h * c / (lam * kB * K);
    return num / (Math.exp(x) - 1);
  };

  // Relative brightness (0..1) of a source at a wavelength. Kind-aware.
  D.brightness = function (src, nm) {
    var v = 0, i, ln, band;
    if (src.kind === "continuous" || src.kind === "mixed") {
      if (src.tempK) {
        v = src.kind === "mixed" ? 0.03 : 1;
        v *= D.planck(nm, src.tempK) / D.planck(560, src.tempK);
      }
    }
    if (src.bands) {
      for (i = 0; i < (src.bands || []).length; i++) {
        band = src.bands[i];
        v += band.a * Math.exp(-0.5 * Math.pow((nm - band.c) / band.s, 2));
      }
    }
    if (src.lines) {
      for (i = 0; i < src.lines.length; i++) {
        ln = src.lines[i];
        // Narrow gaussian core (~1.2 nm) plus a barely visible halo so lines
        // read like a real grating view instead of hairlines.
        v += ln.i * (Math.exp(-0.5 * Math.pow((nm - ln.nm) / 1.2, 2)) +
                     0.18 * Math.exp(-0.5 * Math.pow((nm - ln.nm) / 4.5, 2)));
      }
    }
    return v;
  };

  // Wavelength in nm -> [r,g,b] 0..255, a standard piecewise eye-response fit.
  D.wavelengthToRGB = function (wl) {
    var r = 0, g = 0, b = 0;
    if (wl >= 380 && wl < 440) { r = -(wl - 440) / 60; b = 1; }
    else if (wl < 490) { g = (wl - 440) / 50; b = 1; }
    else if (wl < 510) { g = 1; b = -(wl - 510) / 20; }
    else if (wl < 580) { r = (wl - 510) / 70; g = 1; }
    else if (wl < 645) { r = 1; g = -(wl - 645) / 65; }
    else if (wl <= 780) { r = 1; }
    var f = 1;
    if (wl < 420) f = 0.3 + 0.7 * (wl - 380) / 40;
    else if (wl > 700) f = 0.3 + 0.7 * (780 - wl) / 80;
    var g08 = function (v) { return Math.pow(Math.max(0, v) * f, 0.8); };
    return [Math.round(255 * g08(r)), Math.round(255 * g08(g)), Math.round(255 * g08(b))];
  };

  D.sourceById = function (id) {
    for (var i = 0; i < D.sources.length; i++) if (D.sources[i].id === id) return D.sources[i];
    return null;
  };

  root.LS.spectra = D;
})(typeof globalThis !== "undefined" ? globalThis : window);
