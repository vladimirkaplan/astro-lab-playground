// Sun position and coordinate math for the Celestial Sphere lab sim.
// Pure logic (no DOM), so Node can test it.
//
// The Sun uses a mean-anomaly approximation of the apparent ecliptic
// longitude (mean longitude + equation of center, truncated). Accuracy is
// about 1 deg, which is a practice sim target, not an almanac: the Lab 3
// star-map readings are whole degrees and 2-minute RA bins anyway.
// Day of year is the ordinary calendar count (Jan 1 = 1); the formula's
// 2000-epoch constants repeat through the leap-year cycle, so any
// modern year lands within ~1 deg for a given day number.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var S = {};

  var DEG = Math.PI / 180;

  function norm360(x) {
    var m = x % 360;
    return m < 0 ? m + 360 : m;
  }

  // Apparent ecliptic longitude of the Sun, degrees, for a day of year.
  S.sunEclipticLon = function (dayOfYear) {
    var n = dayOfYear;
    var L = norm360(280.46 + 0.9856474 * n);   // mean longitude
    var g = norm360(357.528 + 0.9856003 * n);  // mean anomaly
    var C = 1.915 * Math.sin(g * DEG) + 0.02 * Math.sin(2 * g * DEG);
    return norm360(L + C);
  };

  // Ecliptic (lambda, eps) -> equatorial. raHours in [0, 24), decDeg in +/-90.
  S.eclipticToEquatorial = function (lambdaDeg, eps) {
    if (eps === undefined) eps = 23.44;
    var lam = lambdaDeg * DEG, e = eps * DEG;
    var sinDec = Math.sin(e) * Math.sin(lam);
    var decDeg = Math.asin(sinDec) / DEG;
    var y = Math.cos(e) * Math.sin(lam);
    var x = Math.cos(lam);
    var raDeg = Math.atan2(y, x) / DEG;
    return { raHours: norm360(raDeg) / 15, decDeg: decDeg };
  };

  // Great-circle separation, degrees. RA in hours, Dec in degrees.
  S.angularSeparation = function (ra1Hours, dec1Deg, ra2Hours, dec2Deg) {
    var a = dec1Deg * DEG, b = dec2Deg * DEG;
    var dLon = (ra2Hours - ra1Hours) * 15 * DEG;
    var c = Math.sin(a) * Math.sin(b) +
            Math.cos(a) * Math.cos(b) * Math.cos(dLon);
    c = Math.max(-1, Math.min(1, c));
    return Math.acos(c) / DEG;
  };

  // Sun's equatorial position for a day of year.
  S.sunEquatorial = function (dayOfYear) {
    var lon = S.sunEclipticLon(dayOfYear);
    var eq = S.eclipticToEquatorial(lon);
    return {
      dayOfYear: dayOfYear,
      lonDeg: lon,
      raHours: eq.raHours,
      decDeg: eq.decDeg
    };
  };

  var MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  function isLeap(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  // Calendar date (leap-aware) -> the same {lon/ra/dec} record.
  S.sunPositionForDate = function (year, month, day) {
    var doy = day;
    for (var m = 1; m < month; m++) {
      doy += MONTH_DAYS[m - 1];
      if (m === 2 && isLeap(year)) doy += 1;
    }
    var r = S.sunEquatorial(doy);
    r.year = year;
    r.month = month;
    r.day = day;
    return r;
  };

  root.LS.sphere = S;
})(typeof globalThis !== "undefined" ? globalThis : window);
