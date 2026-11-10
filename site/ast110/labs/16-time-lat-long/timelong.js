// Labs 16-17 pure logic: graticule coordinates, ideal 15-degree time zones,
// clock conversion with date-line day shifts, and degree-to-km distances.
// Zero DOM at load: Node can require() this and read globalThis.LS.timeLong.
//
// Sign convention: longitude east is positive, west negative; latitude north
// positive, south negative. Ideal zones are exactly 15 deg wide, centered on
// the zone meridians (0 = Greenwich). A half zone (7.5 deg of the meridian)
// is credited to the EAST, via round-half-up on lon/15. Result range: -12..+12.
// Real zone edges are political and DST exists; this sim models the ideal
// 1884 standard zones only.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var T = {};

  // round half up: -7.5 -> -7, 7.5 -> 8, 9.4 -> 9
  T.roundHalf = function (x) {
    return Math.floor(x + 0.5);
  };

  // fold any longitude into [-180, 180)
  T.normLon = function (lon) {
    var w = ((lon + 180) % 360 + 360) % 360 - 180;
    return w === -180 ? 180 : w;
  };

  // ideal zone offset in hours, east positive; +7.4 deg is still zone 0,
  // +7.6 deg is zone +1, half zones credit the east side.
  T.zoneOffsetHours = function (lon) {
    var z = T.roundHalf(T.normLon(lon) / 15);
    return Math.max(-12, Math.min(12, z));
  };

  // hour hand of the sun: (lonA - lonB)/15 taken the short way around,
  // positive means A's sundial is ahead of B's. Range (-12, +12].
  T.solarTimeGapHours = function (lonA, lonB) {
    var d = T.normLon(lonA - lonB);
    if (d === -180) d = 180;
    return d / 15;
  };

  // Convert a wall clock on fromLon's ideal zone to toLon's, same instant.
  // Canonical road: run continuously fromLon -> toLon (east if the signed
  // difference fits in +-180, otherwise the wraparound way, which is the
  // date-line crossing). Two separate ledgers, as the lab warns: westward
  // crossing of 180 adds a day, eastward subtracts one, and passing midnight
  // rolls the calendar on its own. Returns {hour, minute, isPM, dayShift}.
  T.convertClock = function (hour, minute, isPM, fromLon, toLon) {
    var h24 = (hour % 12) + (isPM ? 12 : 0);
    var cont = toLon - fromLon;                 // east-positive road
    var crossing = 0;                            // date line ledger: west +1, east -1
    if (cont > 180) { cont -= 360; crossing = 1; }   // shortest way is westward
    else if (cont < -180) { cont += 360; crossing = -1; } // shortest way is eastward
    var off = T.roundHalf(cont / 15);
    var total = h24 * 60 + (minute || 0) + off * 60;
    var dayShift = Math.floor(total / 1440) + crossing;
    var m = ((total % 1440) + 1440) % 1440;
    var hh = Math.floor(m / 60), mm = m % 60;
    return {
      hour: hh % 12 || 12,
      minute: mm,
      isPM: hh >= 12,
      dayShift: dayShift
    };
  };

  // degrees to km along the surface (approximate, public figures)
  T.kmPerDegLat = 111;
  T.kmPerDegLon = function (latDeg) {
    return 111 * Math.cos(latDeg * Math.PI / 180);
  };

  // Approximate public coordinates of the course cities, degrees E/N positive.
  T.CITIES = {
    newyork: { name: "New York", lat: 40.7, lon: -74.0 },
    london:  { name: "London",   lat: 51.5, lon: -0.1 },
    tokyo:   { name: "Tokyo",    lat: 35.7, lon: 139.7 },
    sydney:  { name: "Sydney",   lat: -33.9, lon: 151.2 },
    rio:     { name: "Rio de Janeiro", lat: -22.9, lon: -43.2 },
    cairo:   { name: "Cairo",    lat: 30.0, lon: 31.2 }
  };

  // "40.7 N, 74.0 W" with the correct direction letters
  T.coordLabel = function (lat, lon) {
    var la = Math.abs(lat).toFixed(1) + " deg " + (lat >= 0 ? "N" : "S");
    var lo = Math.abs(lon).toFixed(1) + " deg " + (lon >= 0 ? "E" : "W");
    return la + ", " + lo;
  };

  T.zoneLabel = function (offsetHours) {
    return "UTC" + (offsetHours >= 0 ? "+" : "-") + Math.abs(offsetHours);
  };

  root.LS.timeLong = T;
})(typeof globalThis !== "undefined" ? globalThis : window);
