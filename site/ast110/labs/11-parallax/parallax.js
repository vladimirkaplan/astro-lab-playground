// Pure data + physics for the heliocentric-parallax lab: a small catalog of
// nearby stars and the annual-parallax geometry (distance from parallax,
// the Jan-to-July shift, and the yearly parallactic ellipse). Pure logic -
// no DOM, no imports - so Node can test it.
//
// Data sources:
// - Parallaxes in milliarcseconds: rounded public Gaia EDR3 values where
//   that is the commonly quoted figure, HIPPARCOS values where the older
//   mission is the standard citation (Tau Ceti). Rounded to 0.01 mas.
// - V magnitudes and spectral types: the same public catalog rounds.
// - betaDeg (ecliptic latitude): approximate values rounded to whole
//   degrees, good enough to draw a believable ellipse, not a position.
// - Unit conversion 1 pc = 3.26156 ly follows NIST (SP 811) rounded.
// Course framing follows OpenStax Astronomy 2e (CC BY 4.0); this file
// contains no lab-manual text.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  // Eight of the nearest star systems, nearest-first by parallax.
  var CATALOG = [
    { name: "Proxima Centauri", mas: 768.07, vmag: 11.13, sptype: "M5.5V", betaDeg: -32 },
    { name: "Barnard's Star",   mas: 546.98, vmag: 9.51,  sptype: "M4V",   betaDeg: 47 },
    { name: "Wolf 359",         mas: 415.18, vmag: 13.54, sptype: "M6V",   betaDeg: -8 },
    { name: "Lalande 21185",    mas: 392.75, vmag: 7.52,  sptype: "M2V",   betaDeg: -36 },
    { name: "Sirius A",         mas: 374.49, vmag: -1.46, sptype: "A1V",   betaDeg: -40 },
    { name: "Epsilon Eridani",  mas: 310.60, vmag: 3.73,  sptype: "K2V",   betaDeg: -70 },
    { name: "Ross 128",         mas: 296.34, vmag: 11.13, sptype: "M4V",   betaDeg: -22 },
    { name: "Tau Ceti",         mas: 273.83, vmag: 3.50,  sptype: "G8V",   betaDeg: -63 }
  ];

  var PC_TO_LY = 3.26156;    // NIST rounded: 1 parsec in light years

  // Phase reference for the wobble model: day 80 (~Mar 20/21 on a common
  // calendar) puts the Sun at ecliptic longitude 0, the vernal equinox.
  var EQUINOX_DAY = 80;
  var YEAR_DAYS = 365.25;

  function positiveNumber(x, label) {
    if (typeof x !== "number" || !isFinite(x) || x <= 0) {
      throw new RangeError(label + " must be a positive finite number, got " + x);
    }
  }

  // Distance in parsecs from a parallax in milliarcseconds: d = 1000 / p.
  function distancePc(mas) {
    positiveNumber(mas, "parallax mas");
    return 1000 / mas;
  }

  function distanceLy(mas) {
    return distancePc(mas) * PC_TO_LY;
  }

  // Small-angle total shift across a baseline of baselineAU AU: a 2 AU
  // baseline (January vs July observations, the two ends of Earth's orbit)
  // sweeps 2 * p on the sky.
  function shiftMas(pMas, baselineAU) {
    positiveNumber(pMas, "parallax mas");
    if (typeof baselineAU !== "number" || !isFinite(baselineAU) || baselineAU < 0) {
      throw new RangeError("baseline AU must be a non-negative finite number, got " + baselineAU);
    }
    return pMas * baselineAU;
  }

  // Apparent yearly parallactic track of a star at ecliptic latitude
  // betaDeg, as geocentric offsets in mas, at a day of the year. The model
  // (small angle, circular orbit) is an ellipse: semi-major axis p along
  // ecliptic longitude, semi-minor p * sin(beta), phase driven by Earth's
  // orbital longitude theta which advances 2*pi per year from the equinox.
  // Ecliptic longitude here is measured RELATIVE to the star, so the star's
  // own longitude only shifts the phase, never the shape.
  //
  // Sign convention: eastMas is positive toward increasing ecliptic
  // longitude; northMas positive toward the ecliptic north pole. The
  // parallactic shift is opposite Earth's position on the sky, so on day
  // EQUINOX_DAY the star sits at its maximum north offset (beta > 0) and
  // then moves west (eastMas < 0) first.
  function wobble(pMas, betaDeg, dayOfYear) {
    positiveNumber(pMas, "parallax mas");
    if (typeof betaDeg !== "number" || !isFinite(betaDeg)) {
      throw new RangeError("betaDeg must be a finite number, got " + betaDeg);
    }
    if (typeof dayOfYear !== "number" || !isFinite(dayOfYear)) {
      throw new RangeError("dayOfYear must be a finite number, got " + dayOfYear);
    }
    var b = betaDeg * Math.PI / 180;
    var theta = 2 * Math.PI * (dayOfYear - EQUINOX_DAY) / YEAR_DAYS;
    return {
      eastMas: -pMas * Math.sin(theta),
      northMas: pMas * Math.sin(b) * Math.cos(theta)
    };
  }

  // The cosmic distance ladder: stellar parallax is its first rung - a
  // purely geometric distance with no calibration against anything else.
  // Every higher rung (Cepheid period-luminosity, tip of the red giant
  // branch, Type Ia supernovae) is anchored on parallaxes like these.
  // Returns the catalog nearest-first with computed distances; reading it
  // top to bottom is the "first rung" lesson in one list.
  function ladderOrder() {
    return CATALOG.slice().sort(function (a, b) { return b.mas - a.mas; })
      .map(function (s) {
        return {
          name: s.name,
          mas: s.mas,
          vmag: s.vmag,
          sptype: s.sptype,
          pc: distancePc(s.mas),
          ly: distanceLy(s.mas)
        };
      });
  }

  root.LS.parallax = {
    CATALOG: CATALOG,
    PC_TO_LY: PC_TO_LY,
    EQUINOX_DAY: EQUINOX_DAY,
    YEAR_DAYS: YEAR_DAYS,
    distancePc: distancePc,
    distanceLy: distanceLy,
    shiftMas: shiftMas,
    wobble: wobble,
    ladderOrder: ladderOrder
  };
})(typeof window !== "undefined" ? window : globalThis);
