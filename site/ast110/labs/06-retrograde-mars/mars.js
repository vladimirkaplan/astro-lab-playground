// Retrograde Mars: apparent-motion geometry on an idealized coplanar model.
// Pure logic - no DOM, no Date.now(), every value a deterministic function of
// time t (days since the J2000.0 epoch, 2000-01-01 12:00 TT ~ UTC). So Node can
// test it.
//
// What the model is, honestly:
//   Two point-mass planets on fixed, coplanar Keplerian ellipses whose orbital
//   elements are frozen at J2000 (no precession, no perturbations, no
//   inclination). This is a teaching idealization, NOT an ephemeris. Stations
//   land within about a week and a half of almanac dates and the opposition of
//   a good apparition within a day or two; that is the accuracy bar, not
//   sub-arcsecond precision. A strictly CIRCULAR mean-longitude orbit was tried
//   first and rejected: ignoring Mars's eccentricity (e = 0.093) drifts the
//   apparition by ~2 weeks, which blows the +/-12-day almanac cross-check in
//   tests/mars.test.js. Retaining each planet's NASA eccentricity (still
//   coplanar, still fixed elements) is the smallest change that holds the bar.
//
// Data sources (rendered values, cited - no lab-manual text or figures):
//   - Semi-major axes, eccentricities, sidereal periods, J2000 mean longitudes
//     and longitudes of perihelion: NASA planetary fact sheets (Earth, Mars),
//     standard osculating J2000.0 elements.
//   - Earth mean longitude here is the HELIOCENTRIC value 100.46457 deg. The
//     widely quoted 280.46 deg is the GEOCENTRIC mean longitude of the SUN
//     (= Earth's heliocentric longitude + 180); used as a heliocentric value it
//     misplaces every opposition by roughly half a synodic period.
//   - Unit conversions and the speed-of-light style rounding elsewhere follow
//     NIST. Course framing follows OpenStax Astronomy 2e (CC BY 4.0); this file
//     reproduces none of its text.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var DAY_MS = 86400000;
  var J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);   // epoch, so t=0 is J2000 noon
  var RAD = Math.PI / 180;
  var DEG = 180 / Math.PI;

  // J2000 osculating elements (NASA planetary fact sheets). Angles in degrees,
  // a in AU, P in days. L0 = mean longitude, pbar = longitude of perihelion;
  // mean anomaly M = L0 + 360*t/P - pbar.
  var ELEMENTS = {
    earth: { a: 1.0, P: 365.25, e: 0.016711, L0: 100.46457166, pbar: 102.93768193 },
    mars: { a: 1.5237, P: 686.98, e: 0.093394, L0: -4.55343205, pbar: -23.94362959 }
  };

  // Sidereal periods are needed directly (the almanac round-off the course
  // quotes); the synodic period follows from them.
  var SYNODIC = 1 / (1 / 365.25 - 1 / 686.98);   // = 779.9069 d
  var STATION_EPS = 0.005;                        // deg/day dead-band for "station"
  var SPEED_STEP = 0.05;                          // days, for the numeric derivative
  var DEFAULT_SCAN = 2.5;                          // synodic periods to search a window

  function norm360(d) { return ((d % 360) + 360) % 360; }
  // Signed fold onto (-180, 180]; used for small angular differences so that a
  // longitude that wraps past 360 is read as a small step, not a huge one.
  function signedDeg(d) { return norm360(d + 180) - 180; }

  function requireFiniteNumber(x, label) {
    if (typeof x !== "number" || !isFinite(x)) {
      throw new RangeError(label + " must be a finite number, got " + x);
    }
  }

  function lookupElements(body) {
    if (typeof body !== "string") {
      throw new RangeError("body must be a planet name, got " + body);
    }
    var key = body.toLowerCase();
    if (key !== "earth" && key !== "mars") {
      throw new RangeError("body must be 'earth' or 'mars', got '" + body + "'");
    }
    return ELEMENTS[key];
  }

  // Heliocentric position in AU at time t, on the body's frozen-element
  // ellipse. Mean anomaly -> eccentric anomaly (Newton) -> perifocal position
  // -> rotated into the ecliptic frame by the longitude of perihelion.
  function heliocentricAU(body, t) {
    var o = lookupElements(body);
    requireFiniteNumber(t, "t");
    var M = ((o.L0 + 360 * t / o.P - o.pbar) % 360) * RAD;
    if (M < 0) M += 2 * Math.PI;
    var E = M;
    for (var i = 0; i < 60; i++) {
      var dE = (E - o.e * Math.sin(E) - M) / (1 - o.e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-13) break;
    }
    var xp = o.a * (Math.cos(E) - o.e);
    var yp = o.a * Math.sqrt(1 - o.e * o.e) * Math.sin(E);
    var w = o.pbar * RAD, cw = Math.cos(w), sw = Math.sin(w);
    return { x: xp * cw - yp * sw, y: xp * sw + yp * cw };
  }

  // Geocentric Mars vector and the Sun direction, both in AU-ish units.
  function geoMarsVector(t) {
    var e = heliocentricAU("earth", t);
    var m = heliocentricAU("mars", t);
    return { gx: m.x - e.x, gy: m.y - e.y, sx: -e.x, sy: -e.y };
  }

  // Apparent (geocentric) ecliptic longitude of Mars, folded to [0, 360).
  function geocentricLongitudeDeg(t) {
    requireFiniteNumber(t, "t");
    var v = geoMarsVector(t);
    return norm360(Math.atan2(v.gy, v.gx) * DEG);
  }

  // The Sun's apparent geocentric ecliptic longitude, for solar elongation.
  function solarLongitudeDeg(t) {
    requireFiniteNumber(t, "t");
    var v = geoMarsVector(t);
    return norm360(Math.atan2(v.sy, v.sx) * DEG);
  }

  // Solar elongation of Mars: apparent Mars longitude minus apparent Sun
  // longitude, in [0, 360). 180 deg is opposition (a full, closest Mars).
  function solarElongationDeg(t) {
    return norm360(geocentricLongitudeDeg(t) - solarLongitudeDeg(t));
  }

  // Continuous apparent longitude, unwrapped by summing small signed steps from
  // t = 0 (where it equals the wrapped value). Lets a caller integrate an arc or
  // count turns without the [0, 360) seam. The per-step motion is a fraction of
  // a degree, so local unwrapping is exact.
  function geocentricLongitudeUnwrappedDeg(t) {
    requireFiniteNumber(t, "t");
    if (Math.abs(t) > 1e6) {
      throw new RangeError("t too large for unwrapped longitude, got " + t);
    }
    var step = 0.5;
    var s = t < 0 ? -1 : 1;
    var lon = geocentricLongitudeDeg(0);
    var n = Math.floor(Math.abs(t) / step);
    for (var i = 0; i < n; i++) {
      var ta = i * step * s;
      lon += signedDeg(geocentricLongitudeDeg(ta + step * s) - geocentricLongitudeDeg(ta));
    }
    lon += signedDeg(geocentricLongitudeDeg(t) - geocentricLongitudeDeg(n * step * s));
    return lon;
  }

  // d(lambda)/dt in deg/day by central difference. Positive = prograde (east,
  // toward increasing longitude); negative = retrograde (west, "walking back").
  function apparentSpeedDegPerDay(t) {
    requireFiniteNumber(t, "t");
    var h = SPEED_STEP;
    var dLon = signedDeg(geocentricLongitudeDeg(t + h) - geocentricLongitudeDeg(t - h));
    return dLon / (2 * h);
  }

  function isRetrograde(t) {
    return apparentSpeedDegPerDay(t) < 0;
  }

  function synodicPeriodDays() {
    return SYNODIC;
  }

  // Signed deviation of the elongation from 180 deg (opposition), folded onto
  // (-180, 180]. It crosses zero once per synodic period, at opposition; the
  // 180/near-180 values it would otherwise take at conjunction are excluded by
  // the magnitude gate at the call site.
  function elongDevFromOpposition(t) {
    return signedDeg(solarElongationDeg(t) - 180);
  }

  // First opposition strictly after refT, no later than limitT. Scans for a
  // small-magnitude zero crossing of the elongation deviation, then bisects.
  // Throws RangeError when none lies in [refT, limitT].
  function oppositionWithin(refT, limitT) {
    requireFiniteNumber(refT, "refT");
    var step = 0.5;
    var prev = elongDevFromOpposition(refT);
    for (var t = refT + step; t <= limitT; t += step) {
      var cur = elongDevFromOpposition(t);
      if (prev * cur < 0 && Math.abs(prev) < 90 && Math.abs(cur) < 90) {
        var a = t - step, b = t;
        for (var k = 0; k < 80; k++) {
          var m = (a + b) / 2;
          if (elongDevFromOpposition(a) * elongDevFromOpposition(m) <= 0) b = m;
          else a = m;
        }
        return (a + b) / 2;
      }
      prev = cur;
    }
    throw new RangeError("no opposition in the scan window [" + refT + ", " + limitT + "]");
  }

  // Next opposition strictly after refT, guarded to 2.5 synodic periods.
  function nextOppositionT(refT) {
    return oppositionWithin(refT, refT + DEFAULT_SCAN * SYNODIC);
  }

  // Station time: the apparent-speed sign change bounding an interior time,
  // searched in direction dir (-1 backward to the start station, +1 forward to
  // the end station) and clamped to [loBound, hiBound]. Throws RangeError when
  // the station lies outside the bound.
  function stationWithin(oppositionT, dir, loBound, hiBound) {
    var inner = apparentSpeedDegPerDay(oppositionT + dir * 0.3) < 0 ? -1 : 1;
    var lo = Math.max(loBound, oppositionT + dir * 0.3);
    var limit = dir < 0 ? loBound : hiBound;
    var probe = oppositionT + dir * 0.3;
    while (dir < 0 ? probe > limit : probe < limit) {
      probe += dir * 0.5;
      var now = apparentSpeedDegPerDay(Math.min(hiBound, Math.max(loBound, probe)));
      if ((now < 0 ? -1 : 1) !== inner) {
        var a = probe - dir * 0.5, b = probe;
        for (var k = 0; k < 60; k++) {
          var m = (a + b) / 2;
          var sm = apparentSpeedDegPerDay(m);
          if ((sm < 0 ? -1 : 1) === inner) a = m; else b = m;
        }
        return (a + b) / 2;
      }
    }
    throw new RangeError("no station found " + (dir < 0 ? "before" : "after") + " opposition " + oppositionT);
  }

  // The retrograde window around the next opposition after refT. The two
  // stations are the apparent-speed sign changes on either side of it; arcDeg is
  // the westward longitude the planet loses between them. scanPeriods widens or
  // narrows the search (default 2.5 synodic periods) and is exposed so the
  // no-window guard can be exercised in tests.
  function retrogradeWindow(refT, scanPeriods) {
    requireFiniteNumber(refT, "refT");
    var scan = scanPeriods === undefined ? DEFAULT_SCAN : scanPeriods;
    if (typeof scan !== "number" || !isFinite(scan) || scan <= 0) {
      throw new RangeError("scanPeriods must be a positive finite number, got " + scan);
    }
    var limit = refT + scan * SYNODIC;
    var oppositionT = oppositionWithin(refT, limit);
    var startT = stationWithin(oppositionT, -1, refT, oppositionT);
    var endT = stationWithin(oppositionT, 1, oppositionT, limit);
    var arcDeg = Math.abs(signedDeg(geocentricLongitudeDeg(startT) - geocentricLongitudeDeg(endT)));
    return {
      startT: startT,
      endT: endT,
      oppositionT: oppositionT,
      arcDeg: arcDeg,
      days: endT - startT
    };
  }

  function isoOf(t) {
    return new Date(J2000_MS + t * DAY_MS).toISOString().slice(0, 10);
  }

  // The data-page fixture generator: nDays rows stepping stepDays apart from
  // startT, each a calendar date, the apparent longitude, and the motion label
  // the student reads off it. motion follows the apparent speed exactly:
  // "W" retrograde, "E" prograde, "station" inside the STATION_EPS dead-band.
  function dateTable(startT, nDays, stepDays) {
    requireFiniteNumber(startT, "startT");
    requireFiniteNumber(stepDays, "stepDays");
    if (typeof nDays !== "number" || !isFinite(nDays) || !Number.isInteger(nDays) || nDays < 1) {
      throw new RangeError("nDays must be a positive integer, got " + nDays);
    }
    var rows = [];
    for (var i = 0; i < nDays; i++) {
      var t = startT + i * stepDays;
      var sp = apparentSpeedDegPerDay(t);
      var motion = Math.abs(sp) < STATION_EPS ? "station" : (sp < 0 ? "W" : "E");
      rows.push({ iso: isoOf(t), lonDeg: geocentricLongitudeDeg(t), motion: motion });
    }
    return rows;
  }

  root.LS.mars = Object.freeze({
    J2000_MS: J2000_MS,
    DAY_MS: DAY_MS,
    SYNODIC: SYNODIC,
    STATION_EPS: STATION_EPS,
    ELEMENTS: Object.freeze({
      earth: Object.freeze(Object.assign({}, ELEMENTS.earth)),
      mars: Object.freeze(Object.assign({}, ELEMENTS.mars))
    }),
    heliocentricAU: heliocentricAU,
    geocentricLongitudeDeg: geocentricLongitudeDeg,
    geocentricLongitudeUnwrappedDeg: geocentricLongitudeUnwrappedDeg,
    solarLongitudeDeg: solarLongitudeDeg,
    solarElongationDeg: solarElongationDeg,
    apparentSpeedDegPerDay: apparentSpeedDegPerDay,
    isRetrograde: isRetrograde,
    synodicPeriodDays: synodicPeriodDays,
    nextOppositionT: nextOppositionT,
    retrogradeWindow: retrogradeWindow,
    dateTable: dateTable
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
