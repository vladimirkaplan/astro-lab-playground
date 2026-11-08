// Pure data + physics for the variable-stars lab: a six-star catalog of
// pulsating variables and eclipsing binaries, magnitude/distance arithmetic,
// the classical-Cepheid period-luminosity line, family light-curve shapes,
// and the phase-fold + phase-dispersion machinery behind the Leavitt move
// (recovering a period from scattered brightness measurements). Pure logic -
// no DOM, no imports, no browser APIs, no clock - so Node can test it.
//
// Data sources:
// - Periods, V magnitude ranges, and mean magnitudes: rounded public
//   catalog figures (AAVSO-database-style roundings of the standard
//   published values for each star). Periods are the commonly quoted
//   ephemeris values.
// - Absolute magnitudes: rounded from public values derived from
//   catalog distances; the three Cepheid entries are consistent with the
//   period-luminosity calibration below to better than 0.1 mag.
// - PL_SLOPE / PL_INTERCEPT: a standard textbook calibration of the
//   classical-Cepheid line in V, M_V = -2.76*log10(P/d) - 1.40, valid
//   1-100 d. Modern calibrations differ in the zero point at the few-
//   tenths level; this is the classroom-grade form.
// - RR_ABS_MAG = +0.65: the RR Lyrae absolute-magnitude yardstick, the
//   rounded commonly quoted mean for the type.
// - 1 pc = 3.26156 ly follows NIST (SP 811) rounded.
// Course framing follows OpenStax Astronomy 2e (CC BY 4.0); this file
// contains no lab-manual text, figures, or quotes.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  // Six teaching cases: the three classical Cepheids that carry the
  // yardstick, RR Lyrae as the older-population candle, Algol as the
  // flat-with-two-dips eclipsing binary, and Mira as the huge-amplitude
  // red giant that is emphatically NOT a standard candle.
  var CATALOG = [
    {
      name: "Delta Cephei", family: "cepheid", periodDays: 5.366,
      meanMag: 3.9, ampMag: 0.8, minMag: 4.3, maxMag: 3.5,
      absMag: -3.5, isStandardCandle: true,
      note: "The archetype: Henrietta Leavitt's class of star. Sawtooth pulse, tight period-luminosity line."
    },
    {
      name: "Eta Aquilae", family: "cepheid", periodDays: 7.177,
      meanMag: 3.9, ampMag: 0.8, minMag: 4.3, maxMag: 3.5,
      absMag: -3.8, isStandardCandle: true,
      note: "First Cepheid found (1784). Longer period, brighter absolute magnitude, same line."
    },
    {
      name: "Beta Doradus", family: "cepheid", periodDays: 9.843,
      meanMag: 3.9, ampMag: 0.6, minMag: 4.2, maxMag: 3.6,
      absMag: -4.1, isStandardCandle: true,
      note: "Long-period southern Cepheid; sits further up and brighter on the period-luminosity line."
    },
    {
      name: "RR Lyrae", family: "rrlyrae", periodDays: 0.4501,
      meanMag: 7.6, ampMag: 1.2, minMag: 8.2, maxMag: 7.0,
      absMag: 0.65, isStandardCandle: true,
      note: "Old, low-mass pulsator: faster than half a day, steeper sawtooth, and its own fixed candle power near +0.65 - not on the Cepheid line."
    },
    {
      name: "Algol", family: "eclipsing", periodDays: 2.867,
      meanMag: 2.35, ampMag: 1.2, minMag: 3.5, maxMag: 2.3,
      absMag: 0.25, isStandardCandle: false,
      note: "The Demon Star: an eclipsing binary, not a pulsator. Flat outside two dips; its 'period' is an orbit, and the dips depend on the viewing geometry, not on luminosity."
    },
    {
      name: "Mira", family: "mira", periodDays: 332.0,
      meanMag: 6.0, ampMag: 8.0, minMag: 10.0, maxMag: 2.0,
      absMag: 1.2, isStandardCandle: false,
      note: "A dusty red giant swinging five magnitudes or more between apparitions: its light curve depends on dust and convection, not a clean clockwork period, so it is not a yardstick."
    }
  ];

  function deepFreeze(v) {
    Object.keys(v).forEach(function (k) {
      var child = v[k];
      if (child && typeof child === "object") deepFreeze(child);
    });
    return Object.freeze(v);
  }
  deepFreeze(CATALOG);

  var PL_SLOPE = -2.76;        // classical-Cepheid V line, standard textbook form
  var PL_INTERCEPT = -1.40;
  var PL_MIN_PERIOD = 1;       // days; the line is only calibrated over ...
  var PL_MAX_PERIOD = 100;     // ... this window - Mira's 332 d must stay off it
  var RR_ABS_MAG = 0.65;       // RR Lyrae-type absolute V magnitude
  var PC_TO_LY = 3.26156;      // NIST rounded: 1 parsec in light years

  var PDM_BINS = 8;            // phase bins for the dispersion statistic
  var ECLIPSE_HALF_WIDTH = 0.03;   // each Algol dip spans this in phase ...
  var ECLIPSE_SECONDARY_BOTTOM = 1 / 6; // normalized dip floor of the ...
  //                                        shallower (secondary) dip; with the
  //                                        flat at +0.5 this puts the secondary
  //                                        eclipse ~0.4 mag below out-of-eclipse

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

  // ---- magnitude and distance arithmetic --------------------------------

  // Brightness ratio for a magnitude difference dm: fainter by dm means
  // 10^(-0.4*dm) times the flux, so 5 mag is exactly a factor 100.
  function fluxRatio(dm) {
    finiteNumber(dm, "magnitude difference");
    return Math.pow(10, -0.4 * dm);
  }

  // Inverse of fluxRatio: magnitude difference from a brightness ratio.
  function magFromRatio(r) {
    positiveNumber(r, "brightness ratio");
    return -2.5 * Math.log10(r);
  }

  // Distance modulus mu = m - M: how much fainter a star of true
  // luminosity looks from distance d.
  function distanceModulus(apparentMag, absMag) {
    finiteNumber(apparentMag, "apparent magnitude");
    finiteNumber(absMag, "absolute magnitude");
    return apparentMag - absMag;
  }

  // Invert the modulus: d(pc) = 10^((mu + 5)/5), so mu = 0 is 10 pc by
  // definition - the yardstick's anchor point.
  function distanceFromModulus(mu) {
    finiteNumber(mu, "distance modulus");
    return Math.pow(10, (mu + 5) / 5);
  }

  function distancePcFromMag(apparentMag, absMag) {
    return distanceFromModulus(distanceModulus(apparentMag, absMag));
  }

  // The Cepheid yardstick: M_V from the period alone. Throws outside
  // 1-100 d so a student cannot run the line on an RR Lyrae (0.45 d) or
  // on Mira (332 d): they belong to different families of physics.
  function plAbsoluteMag(periodDays) {
    finiteNumber(periodDays, "period days");
    if (periodDays < PL_MIN_PERIOD || periodDays > PL_MAX_PERIOD) {
      throw new RangeError("Cepheid period-luminosity line is only valid for 1-100 d periods, got " + periodDays);
    }
    return PL_SLOPE * Math.log10(periodDays) + PL_INTERCEPT;
  }

  // The Leavitt move in one call: period -> absolute magnitude ->
  // distance modulus against the observed mean -> parsecs.
  function plDistancePc(meanMag, periodDays) {
    return distanceFromModulus(distanceModulus(meanMag, plAbsoluteMag(periodDays)));
  }

  // ---- light-curve shapes ------------------------------------------------

  // Wrap any real number into [0, 1).
  function wrapPhase(p) {
    finiteNumber(p, "phase");
    var w = p % 1;
    if (w < 0) w += 1;
    if (w >= 1) w = 0;         // guards float edges like -1e-17 + 1
    return w;
  }

  // Triangle-wave sawtooth: brightness (NOT magnitude) runs linearly from
  // -0.5 at phase 0 (faintest) to +0.5 at phase riseFrac (brightest), then
  // linearly back. Mean over a cycle is exactly 0 and the extremes hit
  // both bounds, so min/max/mean magnitudes land exactly on the catalog
  // values for every star drawn with this shape family.
  function sawtooth(phase, riseFrac) {
    var p = wrapPhase(phase);
    if (p < riseFrac) return -0.5 + p / riseFrac;
    return 0.5 - (p - riseFrac) / (1 - riseFrac);
  }

  // Algol-like eclipsing shape, phase 0 at mid-primary-eclipse: flat at
  // the +0.5 (brightest) level, a triangular dip to -0.5 at phase 0, and
  // a shallower triangular dip to ECLIPSE_SECONDARY_BOTTOM half a cycle
  // later. The dip geometry and mean bias match Algol's published curve.
  function eclipseShape(phase) {
    var p = wrapPhase(phase);
    function tri(center, halfWidth, bottom) {
      var d = Math.abs(p - center);
      if (d > 0.5) d = 1 - d;
      if (d >= halfWidth) return 0.5;
      return 0.5 - (0.5 - bottom) * (1 - d / halfWidth);
    }
    // The dips sit at phase 0 and 0.5 with half-width 0.03, so they never
    // overlap and the deeper local dip is simply the smaller candidate.
    return Math.min(tri(0, ECLIPSE_HALF_WIDTH, -0.5),
      tri(0.5, ECLIPSE_HALF_WIDTH, ECLIPSE_SECONDARY_BOTTOM));
  }

  var RISE_FRAC = { cepheid: 0.33, rrlyrae: 0.10, mira: 0.70 };

  // Normalised brightness-variation shape in [-0.5, +0.5] (large = bright)
  // for a light-curve family at a given phase. Cepheids and RR Lyrae
  // stars rise from minimum in well under 40% of the period (RR Lyrae
  // stars much faster), Mira rises slowly and falls fast, Algol is flat
  // outside its two dips.
  function shapeAt(family, phase) {
    if (family === "eclipsing") return eclipseShape(phase);
    if (Object.prototype.hasOwnProperty.call(RISE_FRAC, family)) {
      return sawtooth(phase, RISE_FRAC[family]);
    }
    throw new RangeError("unknown light-curve family: " + family);
  }

  // Magnitude of a catalog entry at a phase: mid - (span * shape), which
  // places the extremes exactly on minMag/maxMag and, since each family's
  // shape is normalised to the catalog geometry, the cycle mean on
  // meanMag. For the sawtooth families whose meanMag is the min/max
  // midpoint this reduces to meanMag - ampMag * shape.
  function magnitudeAt(entry, phase) {
    if (!entry || typeof entry !== "object") {
      throw new RangeError("magnitudeAt needs a catalog entry");
    }
    finiteNumber(entry.minMag, "entry.minMag");
    finiteNumber(entry.maxMag, "entry.maxMag");
    if (entry.minMag <= entry.maxMag) {
      throw new RangeError("entry.minMag must be numerically fainter than entry.maxMag");
    }
    var s = shapeAt(entry.family, phase);
    var mid = (entry.minMag + entry.maxMag) / 2;
    return mid - (entry.minMag - entry.maxMag) * s;
  }

  // Numeric mean magnitude over one full cycle (midpoint sampling, so
  // piecewise-linear shapes integrate exactly).
  function meanOfCycle(entry, samples) {
    var n = samples === undefined ? 240 : samples;
    if (typeof n !== "number" || !isFinite(n) || n < 8) {
      throw new RangeError("meanOfCycle samples must be a number >= 8, got " + samples);
    }
    n = Math.floor(n);
    var sum = 0;
    for (var i = 0; i < n; i++) sum += magnitudeAt(entry, (i + 0.5) / n);
    return sum / n;
  }

  // ---- folding and the period search --------------------------------------

  // fold: wrap observation times onto [0, 1) phase at trial period, carry
  // the optional magnitudes along, and sort by phase.
  function fold(times, period, epoch, mags) {
    positiveNumber(period, "period days");
    if (!Array.isArray(times)) throw new RangeError("fold needs a times array");
    var hasMag = mags !== undefined && mags !== null;
    if (hasMag && (!Array.isArray(mags) || mags.length !== times.length)) {
      throw new RangeError("fold mags must be an array as long as times");
    }
    var ep = (epoch === undefined || epoch === null) ? 0 : epoch;
    finiteNumber(ep, "epoch");
    var n = times.length;
    var rows = new Array(n);
    for (var i = 0; i < n; i++) {
      finiteNumber(times[i], "times[" + i + "]");
      var row = { phase: wrapPhase((times[i] - ep) / period), time: times[i] };
      if (hasMag) {
        finiteNumber(mags[i], "mags[" + i + "]");
        row.mag = mags[i];
      }
      rows[i] = row;
    }
    rows.sort(function (a, b) { return a.phase - b.phase; });
    var out = { phase: new Array(n), time: new Array(n) };
    if (hasMag) out.mag = new Array(n);
    for (var j = 0; j < n; j++) {
      out.phase[j] = rows[j].phase;
      out.time[j] = rows[j].time;
      if (hasMag) out.mag[j] = rows[j].mag;
    }
    return out;
  }

  // Stellingwerf phase-dispersion statistic theta^2: the within-bin
  // scatter of magnitudes at a trial fold, normalised by the total
  // scatter. Lower is a better period; a fold at the true period leaves
  // only measurement noise inside the phase bins.
  function pdmFrom(phase, mags, n, B, counts, sums, sq) {
    counts.fill(0); sums.fill(0); sq.fill(0);
    var total = 0, totalSq = 0;
    for (var i = 0; i < n; i++) {
      var w = phase[i] * B;
      var b = w | 0;
      if (b >= B) b = B - 1;
      counts[b] += 1;
      sums[b] += mags[i];
      sq[b] += mags[i] * mags[i];
      total += mags[i];
      totalSq += mags[i] * mags[i];
    }
    var ssTot = totalSq - (total * total) / n;
    if (ssTot <= 0) return 0;          // no scatter at all: degenerate data
    var ssWithin = 0, nEff = 0, binsUsed = 0;
    for (var k = 0; k < B; k++) {
      if (counts[k] < 2) continue;
      binsUsed++;
      nEff += counts[k];
      ssWithin += sq[k] - (sums[k] * sums[k]) / counts[k];
    }
    if (binsUsed < 2) return Infinity; // a fold that empties most bins is no fit
    return (ssWithin / (nEff - binsUsed)) / (ssTot / (n - 1));
  }

  // Public form: takes the output of fold() (with magnitudes).
  function pdm(folded) {
    if (!folded || !Array.isArray(folded.phase) || !Array.isArray(folded.mag)) {
      throw new RangeError("pdm needs a folded series with phase and mag arrays (pass mags to fold)");
    }
    var n = folded.phase.length;
    if (n < 4) throw new RangeError("pdm needs at least 4 points, got " + n);
    for (var i = 0; i < n; i++) {
      finiteNumber(folded.phase[i], "folded.phase[" + i + "]");
      finiteNumber(folded.mag[i], "folded.mag[" + i + "]");
    }
    return pdmFrom(folded.phase, folded.mag, n, PDM_BINS,
      new Float64Array(PDM_BINS), new Float64Array(PDM_BINS), new Float64Array(PDM_BINS));
  }

  // The Leavitt move made mechanical: coarse-to-fine sweep of trial
  // periods scored by phase dispersion. One linear scan of the data per
  // trial, bin accumulators reused between trials, and the best period
  // refined over four shrinking windows - a few thousand operations for
  // ~90 points, so it runs instantly in the browser.
  function searchPeriod(times, mags, minPeriod, maxPeriod, steps) {
    positiveNumber(minPeriod, "minimum period");
    positiveNumber(maxPeriod, "maximum period");
    if (maxPeriod <= minPeriod) {
      throw new RangeError("maxPeriod must exceed minPeriod, got " + minPeriod + " and " + maxPeriod);
    }
    if (!Array.isArray(times) || !Array.isArray(mags) || times.length !== mags.length) {
      throw new RangeError("searchPeriod needs times and mags arrays of equal length");
    }
    var n = times.length;
    if (n < 20) throw new RangeError("searchPeriod needs at least 20 points, got " + n);
    for (var v = 0; v < n; v++) {
      finiteNumber(times[v], "times[" + v + "]");
      finiteNumber(mags[v], "mags[" + v + "]");
    }
    var trials = steps === undefined || steps === null ? 32 : Math.floor(steps);
    if (trials < 8 || trials > 5000) {
      throw new RangeError("searchPeriod steps must be between 8 and 5000, got " + steps);
    }
    var counts = new Float64Array(PDM_BINS);
    var sums = new Float64Array(PDM_BINS);
    var sq = new Float64Array(PDM_BINS);
    var phase = new Float64Array(n);

    function theta(period) {
      var inv = 1 / period;
      for (var i = 0; i < n; i++) {
        var w = times[i] * inv;
        w = w - Math.floor(w);       // times are finite, so this wraps to [0,1)
        phase[i] = w;
      }
      return pdmFrom(phase, mags, n, PDM_BINS, counts, sums, sq);
    }

    var bestPeriod = minPeriod, best = Infinity;
    for (var i = 0; i < trials; i++) {
      var p = minPeriod + (maxPeriod - minPeriod) * i / (trials - 1);
      var t = theta(p);
      if (t < best) { best = t; bestPeriod = p; }
    }
    var delta = (maxPeriod - minPeriod) / (trials - 1);
    for (var round = 0; round < 4; round++) {
      delta /= 6;
      var lo = Math.max(minPeriod, bestPeriod - delta);
      var hi = Math.min(maxPeriod, bestPeriod + delta);
      for (var j = 0; j <= 12; j++) {
        var q = lo + (hi - lo) * j / 12;
        var s = theta(q);
        if (s < best) { best = s; bestPeriod = q; }
      }
    }
    return { period: bestPeriod, pdm: best };
  }

  root.LS.variables = {
    CATALOG: CATALOG,
    PL_SLOPE: PL_SLOPE,
    PL_INTERCEPT: PL_INTERCEPT,
    PL_MIN_PERIOD: PL_MIN_PERIOD,
    PL_MAX_PERIOD: PL_MAX_PERIOD,
    RR_ABS_MAG: RR_ABS_MAG,
    PC_TO_LY: PC_TO_LY,
    fluxRatio: fluxRatio,
    magFromRatio: magFromRatio,
    distanceModulus: distanceModulus,
    distanceFromModulus: distanceFromModulus,
    distancePcFromMag: distancePcFromMag,
    plAbsoluteMag: plAbsoluteMag,
    plDistancePc: plDistancePc,
    wrapPhase: wrapPhase,
    shapeAt: shapeAt,
    magnitudeAt: magnitudeAt,
    meanOfCycle: meanOfCycle,
    fold: fold,
    pdm: pdm,
    searchPeriod: searchPeriod
  };
})(typeof window !== "undefined" ? window : globalThis);
