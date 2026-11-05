// Sun, Moon, rise/set, and time helpers on top of the vendored
// astronomy-engine (MIT). Load vendor/astronomy-engine/astronomy.browser.min.js
// BEFORE this file on any page that calls it.
//
// Convention: every function that takes a "date" takes a JS Date object, which
// is a universal instant (UTC underneath). Countdown/calendar pages using local
// NY time go through LS.ephem.nyLocalToUTC first.
//
// Accuracy note for pages that print it: this is astronomy-engine v2.1.19
// (public VSOP87/ELP-based formulas). Sun and Moon RA/Dec are good to ~0.1 deg,
// moon illumination/age to ~0.1 day, rise/set times typically within 1-2
// minutes; not survey grade, and eclipses need a dedicated tool.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var A = root.Astronomy || null;
  var SYNODIC = 29.530588861;

  var E = {};
  E.ready = function () { return !!A; };
  if (!A) {
    // Keep pages loadable without the vendor script (they show a notice).
    E.sun = E.moon = function () { throw new Error("astronomy-engine not loaded"); };
    root.LS.ephem = E;
    return;
  }

  // ---------- cities (fixed observers) ----------
  E.cities = {
    newyork:  { label: "New York",     lat: 40.7128,  lon: -74.0060, note: "lab course default" },
    london:   { label: "London",       lat: 51.5074,  lon: -0.1276 },
    greenwich:{ label: "Greenwich",    lat: 51.4779,  lon: 0.0 },
    moscow:   { label: "Moscow",       lat: 55.7558,  lon: 37.6173 },
    losangeles:{ label: "Los Angeles", lat: 34.0522,  lon: -118.2437 },
    rio:      { label: "Rio de Janeiro", lat: -22.9062, lon: -43.1723 },
    tokyo:    { label: "Tokyo",        lat: 35.6762,  lon: 139.6503 },
    sydney:   { label: "Sydney",       lat: -33.8688, lon: 151.2093 },
    nairobi:  { label: "Nairobi",      lat: -1.2921,  lon: 36.8219 },
    reykjavik:{ label: "Reykjavik",    lat: 64.1466,  lon: -21.9426 },
    singapore:{ label: "Singapore",    lat: 1.3521,   lon: 103.8198 }
  };
  function obs(latDeg, lonDeg) { return new A.Observer(latDeg, lonDeg, 10); }

  // ---------- sun ----------
  E.sun = function (date, cityKey) {
    var c = E.cities[cityKey || "newyork"];
    var ge = A.Equator(A.Body.Sun, date, obs(c.lat, c.lon), true, false);
    var ec = A.SunPosition(date);   // light-time corrected geocentric ecliptic
    return {
      raH: ge.ra, decDeg: ge.dec, distAU: ge.dist,
      lonDeg: ((ec.elon % 360) + 360) % 360
    };
  };

  // ---------- moon ----------
  E.moon = function (date, cityKey) {
    var c = E.cities[cityKey || "newyork"];
    var ge = A.Equator(A.Body.Moon, date, obs(c.lat, c.lon), true, false);
    var il = A.Illumination(A.Body.Moon, date);
    var ang = ((A.MoonPhase(date) % 360) + 360) % 360;   // 0 = new moon
    return {
      raH: ge.ra, decDeg: ge.dec, distKm: ge.dist * 149597870.7,
      illumPct: il.phase_fraction * 100,
      phaseAngle: ang,
      ageDays: ang / 360 * SYNODIC,
      phaseName: E.phaseName(ang)
    };
  };

  E.SYNODIC = SYNODIC;
  E.phaseName = function (ang) {
    if (ang < 11.25 || ang >= 348.75) return "new moon";
    if (ang < 78.75) return "waxing crescent";
    if (ang < 101.25) return "first quarter";
    if (ang < 168.75) return "waxing gibbous";
    if (ang < 191.25) return "full moon";
    if (ang < 258.75) return "waning gibbous";
    if (ang < 281.25) return "last quarter";
    return "waning crescent";
  };
  // How close to the exact phase (0 = new, .5 = full), 0..0.5
  E.phaseProximity = function (ang) {
    var d = Math.min(Math.abs(ang), Math.abs(ang - 360)) / 360;
    return d;
  };

  // ---------- rise / set ----------
  // Returns UTC Date, or null if no event within limitDays. Uses the library's
  // automatic horizon (sun/moon: standard refraction and semidiameter).
  E.riseSet = function (body, cityKey, startDate, dir, limitDays) {
    var c = E.cities[cityKey || "newyork"];
    var b = typeof body === "string" ? A.Body[body] : body;
    var r = A.SearchRiseSet(b, obs(c.lat, c.lon), dir, startDate, limitDays || 1.5);
    return r ? r.date : null;
  };
  E.moonrise = function (cityKey, startDate, dir) { return E.riseSet("Moon", cityKey, startDate, dir || +1, 2.5); };
  E.moonset = function (cityKey, startDate) { return E.riseSet("Moon", cityKey, startDate, -1, 2.5); };
  E.sunrise = function (cityKey, startDate) { return E.riseSet("Sun", cityKey, startDate, +1, 2.5); };
  E.sunset = function (cityKey, startDate) { return E.riseSet("Sun", cityKey, startDate, -1, 2.5); };

  // ---------- time ----------
  E.siderealTime = function (date) { return A.SiderealTime(date); }; // hours, Greenwich
  E.lstHours = function (date, cityKey) {
    var lon = E.cities[cityKey || "newyork"].lon;
    return ((A.SiderealTime(date) + lon / 15) % 24 + 24) % 24;
  };
  E.julianDay = function (date) { return A.AstroTime(date).ut + 2451545.0; };

  // New York civil time (course lab dates are New York local). Handles US DST:
  // second Sunday of March 02:00 -> first Sunday of November 02:00.
  function nthSundayMonth(y, m, n) {
    var first = new Date(Date.UTC(y, m - 1, 1));
    var day = 1 + ((7 - first.getUTCDay()) % 7);   // first Sunday (date-of-month)
    return day + (n - 1) * 7;
  }
  function isDstNY(utcMs) {
    var y = new Date(utcMs).getUTCFullYear();
    var start = Date.UTC(y, 2, nthSundayMonth(y, 3, 2), 7, 0, 0);   // 02:00 EST = 07Z
    var end = Date.UTC(y, 10, nthSundayMonth(y, 11, 1), 6, 0, 0);   // 02:00 EDT = 06Z
    return utcMs >= start && utcMs < end;
  }
  E.nyOffsetHours = function (utcDate) { return isDstNY(utcDate.getTime()) ? -4 : -5; };
  // local wall-clock parts -> UTC Date (fallback: ambiguous times take the earlier)
  E.nyLocalToUTC = function (yyyy, mo, dd, hh, mi) {
    var guess = new Date(Date.UTC(yyyy, mo - 1, dd, hh, mi || 0));
    var off = isDstNY(guess.getTime() + 5 * 3600e3) ? -4 : -5;       // local approx probe
    var utc = new Date(guess.getTime() - off * 3600e3);
    var off2 = isDstNY(utc.getTime()) ? -4 : -5;                     // confirm with real UTC
    if (off2 !== off) utc = new Date(guess.getTime() - off2 * 3600e3);
    utc._nyOffset = off2;
    return utc;
  };
  // UTC Date -> { y,mo,d,hh,mi, offsetH } as NY wall clock
  E.utcToNYParts = function (utcDate) {
    var off = E.nyOffsetHours(utcDate);
    var local = new Date(utcDate.getTime() + off * 3600e3);
    return {
      y: local.getUTCFullYear(), mo: local.getUTCMonth() + 1, d: local.getUTCDate(),
      hh: local.getUTCHours(), mi: local.getUTCMinutes(), offsetH: off
    };
  };
  E.fmtNY = function (utcDate) {
    if (!utcDate) return "--:--";
    var p = E.utcToNYParts(utcDate);
    var ap = p.hh >= 12 ? "PM" : "AM";
    var h12 = p.hh % 12 || 12;
    return h12 + ":" + (p.mi < 10 ? "0" : "") + p.mi + " " + ap +
      (p.offsetH === -4 ? " EDT" : " EST");
  };

  // ephemeris-with-date in "Mar 7" style like the course tables print
  E.MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  E.nyDateLabel = function (utcDate) {
    var p = E.utcToNYParts(utcDate);
    return E.MONTHS[p.mo - 1] + " " + p.d + " " +
      (p.hh % 12 || 12) + ":" + (p.mi < 10 ? "0" : "") + p.mi + " " +
      (p.hh >= 12 ? "PM" : "AM");
  };

  root.LS.ephem = E;
})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : window));
