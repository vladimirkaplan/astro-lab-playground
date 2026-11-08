// Lab 5 moonrise drift bench: pure helpers, shared by the sim and the tests.
// The eclipse board on this page is untouched by this file; everything here is
// the OTHER half of manual Lab 5 - why the Moon is late to rise, how late, and
// how big it looks. Pure logic: no DOM, no Date.now(), every value a
// deterministic function of time t, measured in days since the J2000.0 epoch
// (2000-01-01 12:00 UT), the same mean-element time base this repo already uses
// for the Moon phases (moon.js) and Mars (mars.js). That keeps it Node-testable.
//
// What the model is, honestly:
//   Two mean cycles and one size cycle, no ephemeris:
//     * Phase / elongation rides a single mean SYNODIC month, anchored so the
//       Sun-Moon elongation is exactly 0 at a cited reference new moon. The
//       synodic rate already IS the beat between the Moon's mean motion and the
//       Sun's (1/P_syn = 1/P_sid - 1/yr), so we do not recombine sidereal and
//       tropical values that would not reproduce the cited 29.53059 d.
//     * The daily moonrise LAG is the mean 48.8 minutes, modulated by the
//       ANOMALISTIC month: near perigee the Moon sweeps the sky faster, so it
//       slips farther east each day and rises a little later than the mean;
//       near apogee, a little earlier. Amplitude 7 min about the mean.
//     * The apparent DIAMETER comes from the anomalistic distance
//       d = a(1 - e cos M_anom), same perigee anchor as the lag.
//
//   Two named effects this mean model DELIBERATELY does NOT model, and says so:
//     * The 40-70 minute OBSERVED band of real day-to-day moonrise delay (and
//       the famous "harvest moon" of autumn) comes from the tilt of the ecliptic
//       to the horizon at BMCC's latitude and the season - declination, not the
//       anomalous orbit. The mean model here only spans about 42-56 min and must
//       never be sold as reproducing the extremes.
//     * The Moon's real perigee grows a touch bigger than a fixed-e model allows
//       (solar perturbation swings e between about 0.026 and 0.077, so a live
//       perigee reaches ~33.5-34.1 arcmin). With the mean e = 0.0549 the model's
//       own perigee reads about 32.9 arcmin; apogee (~29.4 arcmin) is reproduced
//       well. We report what the cited elements give and name the gap.
//
// Data sources (rendered values, cited - no lab-manual text or figures):
//   NASA lunar fact sheet: semimajor axis a = 384400 km, eccentricity e = 0.0549,
//   synodic month 29.53059 d, anomalistic month 27.55455 d, Moon diameter
//   3474 km; mean apparent diameter 31.1 arcmin. Reference new moon 2000-01-06
//   18:14 UT; reference perigee 2000-01-03 13:39 UT. Angle/arcminute conversions
//   follow NIST. Course framing follows OpenStax Astronomy 2e (CC BY 4.0); this
//   file reproduces none of its text.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var M = {};

  var RAD = Math.PI / 180;
  var DAY_MS = 86400000;
  var J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);      // t = 0 is J2000 noon
  var ARCMIN_PER_RAD = 3437.75;                        // (180/pi)*60, NIST

  // Cited constants (NASA lunar fact sheet).
  var SYNODIC_D = 29.53059;
  var ANOMALISTIC_D = 27.55455;
  var SEMIMAJOR_KM = 384400;
  var ECCENTRICITY = 0.0549;
  var MOON_DIAM_KM = 3474;
  var MEAN_APPARENT_ARCMIN = 31.1;

  // Mean monthly delay of moonrise: the extra 360/29.53059 = 12.19 deg the
  // Earth must turn between successive moonrises, timed on the solar day.
  var MEAN_LAG_MIN = 48.8;
  // Honest observed day-to-day band at BMCC latitude (harvest-moon / declination
  // driven; this mean model does NOT reach the ends - see the docstring).
  var LAG_RANGE_MIN = [40, 70];
  // Amplitude of the anomalistic modulation on the mean lag.
  var LAG_AMP_MIN = 7;
  // A lunar day (moonrise to moonrise) in hours: 24.84, the 24h50m figure.
  var LUNAR_DAY_H = 24.84;

  // Reference epochs as days since J2000 (so the module never reads the clock).
  var NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);   // elongation = 0 here
  var PERIGEE_MS = Date.UTC(2000, 0, 3, 13, 39, 0);    // M_anom = 0 here
  var T_NEW_MOON = (NEW_MOON_MS - J2000_MS) / DAY_MS;
  var T_PERIGEE = (PERIGEE_MS - J2000_MS) / DAY_MS;

  function norm360(d) { return ((d % 360) + 360) % 360; }
  function requireFiniteNumber(x, label) {
    if (typeof x !== "number" || !isFinite(x)) {
      throw new RangeError(label + " must be a finite number, got " + x);
    }
  }

  // Sun-Moon mean elongation in degrees, [0, 360). 0 = new, 90 = first quarter,
  // 180 = full, 270 = last quarter - the same eastward convention as moon.js.
  // It advances at the synodic rate (360/SYNODIC_D deg/day), which is the beat
  // between the Moon's and the Sun's mean rates, and is 0 at the cited new moon.
  M.elongationDeg = function (t) {
    requireFiniteNumber(t, "t");
    return norm360((t - T_NEW_MOON) * 360 / SYNODIC_D);
  };

  // Illuminated fraction of the disk, 0..1, from elongation: (1 - cos E)/2.
  M.illumFraction = function (elongDeg) {
    requireFiniteNumber(elongDeg, "elongDeg");
    return (1 - Math.cos(elongDeg * RAD)) / 2;
  };

  // Eight named phases, the same boundary table the rest of the repo uses.
  M.phaseName = function (elongDeg) {
    var a = norm360(elongDeg);
    if (a < 11.25 || a >= 348.75) return "new moon";
    if (a < 78.75) return "waxing crescent";
    if (a < 101.25) return "first quarter";
    if (a < 168.75) return "waxing gibbous";
    if (a < 191.25) return "full moon";
    if (a < 258.75) return "waning gibbous";
    if (a < 281.25) return "last quarter";
    return "waning crescent";
  };

  // Hours AFTER sunrise that the Moon rises, [0, LUNAR_DAY_H).
  // A lunar day is 24.84 h, so the rise hour walks that whole span once per
  // 360 deg of elongation: new moon rises with the Sun (0 h), first quarter
  // about noon (6.2 h), full moon at sunset (12.4 h), last quarter about
  // midnight (18.6 h). Wrapped so it never goes negative.
  M.moonriseOffsetHours = function (elongDeg) {
    requireFiniteNumber(elongDeg, "elongDeg");
    var e = norm360(elongDeg);
    return (LUNAR_DAY_H * e / 360) % LUNAR_DAY_H;
  };

  // Moon's mean anomaly (deg, [0, 360)): 0 at the cited perigee, one full turn
  // per anomalistic month. Drives both the lag modulation and the distance.
  M.moonAnomalyDeg = function (t) {
    requireFiniteNumber(t, "t");
    return norm360((t - T_PERIGEE) * 360 / ANOMALISTIC_D);
  };

  // Day-to-day moonrise delay in minutes: the 48.8 mean, plus up to 7 min when
  // the Moon is near perigee (moving fast, rising later than the mean) and down
  // to 7 min under it near apogee. Extremes of THIS model are 41.8 and 55.8;
  // the wider 40-70 observed band (LAG_RANGE_MIN) is declination/season and is
  // intentionally not reproduced.
  M.dailyLagMin = function (t) {
    requireFiniteNumber(t, "t");
    var Manom = M.moonAnomalyDeg(t) * RAD;
    return MEAN_LAG_MIN + LAG_AMP_MIN * Math.cos(Manom);
  };

  // Geocentric distance from the anomalistic distance formula, km.
  M.moonDistanceKm = function (t) {
    requireFiniteNumber(t, "t");
    var Manom = M.moonAnomalyDeg(t) * RAD;
    return SEMIMAJOR_KM * (1 - ECCENTRICITY * Math.cos(Manom));
  };

  // Apparent diameter in arcminutes: physical diameter over distance, in radians,
  // times the arcmin-per-radian factor. Mean ~31.1, model perigee ~32.9, apogee
  // ~29.4. (The real near-side extreme grows past 33.5 because e itself swings;
  // a fixed-e model stops at 32.9 - the gap is named, not hidden.)
  M.moonDiameterArcmin = function (t) {
    return MOON_DIAM_KM * ARCMIN_PER_RAD / M.moonDistanceKm(t);
  };

  // Calendar date (ISO yyyy-mm-dd) for a model time t. Uses new Date(ms) only
  // with a computed ms - never the wall clock - so it stays deterministic.
  M.isoOf = function (t) {
    requireFiniteNumber(t, "t");
    return new Date(J2000_MS + t * DAY_MS).toISOString().slice(0, 10);
  };

  // The data-page fixture: nDays rows stepping stepDays apart from startT, each
  // carrying the six numbers the bench reads. Default covers one synodic month
  // at one-day steps. Every field is a direct call, so the table and the sim can
  // never disagree with the model.
  M.moonriseSeries = function (startT, nDays, stepDays) {
    requireFiniteNumber(startT, "startT");
    if (nDays === undefined) nDays = Math.ceil(SYNODIC_D);
    if (stepDays === undefined) stepDays = 1;
    if (typeof nDays !== "number" || !isFinite(nDays) || !Number.isInteger(nDays) || nDays < 1) {
      throw new RangeError("nDays must be a positive integer, got " + nDays);
    }
    requireFiniteNumber(stepDays, "stepDays");
    var rows = [];
    for (var i = 0; i < nDays; i++) {
      var t = startT + i * stepDays;
      var elong = M.elongationDeg(t);
      rows.push({
        iso: M.isoOf(t),
        elongDeg: elong,
        phase: M.phaseName(elong),
        illum: M.illumFraction(elong),
        riseOffsetH: M.moonriseOffsetHours(elong),
        lagMin: M.dailyLagMin(t),
        diamArcmin: M.moonDiameterArcmin(t)
      });
    }
    return rows;
  };

  root.LS.moonrise = Object.freeze({
    DAY_MS: DAY_MS,
    J2000_MS: J2000_MS,
    ARCMIN_PER_RAD: ARCMIN_PER_RAD,
    SYNODIC_D: SYNODIC_D,
    ANOMALISTIC_D: ANOMALISTIC_D,
    SEMIMAJOR_KM: SEMIMAJOR_KM,
    ECCENTRICITY: ECCENTRICITY,
    MOON_DIAM_KM: MOON_DIAM_KM,
    MEAN_APPARENT_ARCMIN: MEAN_APPARENT_ARCMIN,
    MEAN_LAG_MIN: MEAN_LAG_MIN,
    LAG_RANGE_MIN: Object.freeze(LAG_RANGE_MIN.slice()),
    LAG_AMP_MIN: LAG_AMP_MIN,
    LUNAR_DAY_H: LUNAR_DAY_H,
    NEW_MOON_MS: NEW_MOON_MS,
    PERIGEE_MS: PERIGEE_MS,
    T_NEW_MOON: T_NEW_MOON,
    T_PERIGEE: T_PERIGEE,
    elongationDeg: M.elongationDeg,
    illumFraction: M.illumFraction,
    phaseName: M.phaseName,
    moonAnomalyDeg: M.moonAnomalyDeg,
    dailyLagMin: M.dailyLagMin,
    moonDistanceKm: M.moonDistanceKm,
    moonDiameterArcmin: M.moonDiameterArcmin,
    moonriseOffsetHours: M.moonriseOffsetHours,
    isoOf: M.isoOf,
    moonriseSeries: M.moonriseSeries
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
