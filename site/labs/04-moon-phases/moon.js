// Lab 4 pure moon math + baked ephemeris highlights.
// Geometry convention (matches the sim): elongation = angle Sun->Earth->Moon,
// 0 = new, increasing eastward (counterclockwise in the top-view sim):
// 90 = first quarter, 180 = full, 270 = last quarter.
//
// lit fraction = (1 - cos(elong)) / 2. Rise/transit/set hour rules use the
// textbook approximation: transit hour = 12 + elong * 24/360 (solar hours),
// rise 6 h before transit, set 6 h after. Real ephemeris times (per date, New
// York) come from shared/ephem.js at runtime; EVENTS below are the frozen,
// precomputed phase-event highlights, NY-local, used for the schedule table.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var M = {};

  M.illum = function (elongDeg) {
    return (1 - Math.cos(elongDeg * Math.PI / 180)) / 2 * 100;
  };

  M.waxing = function (elongDeg) {   // true while 0 < elong < 180
    var e = ((elongDeg % 360) + 360) % 360;
    return e > 0.5 && e < 179.5;
  };

  M.name = function (elongDeg) {
    var e = ((elongDeg % 360) + 360) % 360;
    if (e < 11.25 || e >= 348.75) return "new moon";
    if (e < 78.75) return "waxing crescent";
    if (e < 101.25) return "first quarter";
    if (e < 168.75) return "waxing gibbous";
    if (e < 191.25) return "full moon";
    if (e < 258.75) return "waning gibbous";
    if (e < 281.25) return "last quarter";
    return "waning crescent";
  };

  // Textbook schedule: returns {riseH, transitH, setH} in hours (0..24 float).
  // Transit lags the Sun by elong/360 of a day.
  M.schedule = function (elongDeg) {
    var e = ((elongDeg % 360) + 360) % 360;
    var transit = (12 + e * 24 / 360) % 24;
    return {
      transitH: transit,
      riseH: (transit + 18) % 24,    // 6 h before transit
      setH: (transit + 6) % 24
    };
  };

  M.hourLabel = function (h) {
    var hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    if (mm === 60) { hh = (hh + 1) % 24; mm = 0; }
    var ap = hh >= 12 ? "PM" : "AM";
    var h12 = hh % 12 || 12;
    return h12 + ":" + (mm < 10 ? "0" : "") + mm + " " + ap;
  };

  M.MOONRISE_DELAY_MIN = 48;  // average, moon moves ~12 deg/day eastward

  // Frozen ephemeris highlights (astronomy-engine, New York local times),
  // computed 2026-11-05 and pinned by tests/moon.test.js. Do not hand-edit;
  // regenerate with scripts/moon-events.js and rerun the tests.
  M.EVENTS = [
    { iso: "2026-11-17T11:48Z", ny: "Nov 17 6:48 AM",  name: "first quarter", rise: "Nov 17 12:52 PM", set: "Nov 16 10:52 PM" },
    { iso: "2026-11-24T14:54Z", ny: "Nov 24 9:54 AM",  name: "full moon",     rise: "Nov 24 4:15 PM",   set: "Nov 24 7:05 AM" },
    { iso: "2026-12-01T06:09Z", ny: "Dec 1 1:09 AM",   name: "last quarter",  rise: "Nov 30 11:28 PM",  set: "Nov 30 12:06 PM" },
    { iso: "2026-12-09T00:53Z", ny: "Dec 8 7:53 PM",   name: "new moon",      rise: "Dec 8 7:03 AM",    set: "Dec 8 3:52 PM" },
    { iso: "2026-12-17T05:43Z", ny: "Dec 17 12:43 AM", name: "first quarter", rise: "Dec 16 11:37 AM",  set: "Dec 16 11:50 PM" },
    { iso: "2026-12-24T01:29Z", ny: "Dec 23 8:29 PM",  name: "full moon",     rise: "Dec 23 3:58 PM",   set: "Dec 23 7:05 AM" },
    { iso: "2026-12-30T19:00Z", ny: "Dec 30 2:00 PM",  name: "last quarter",  rise: "Dec 29 11:33 PM",  set: "Dec 30 11:18 AM" },
    { iso: "2027-01-07T20:25Z", ny: "Jan 7 3:25 PM",   name: "new moon",      rise: "Jan 7 7:27 AM",    set: "Jan 7 4:30 PM" }
  ];

  root.LS.moonPhase = M;
})(typeof globalThis !== "undefined" ? globalThis : window);
