// Lab 5 eclipse board: pure helpers, shared by the sim and the tests.
// Everything the board shows about the real sky comes from two baked sources:
//   EVENTS      - five verified eclipses from the NASA five-millennium canon
//                 (types and moments are NASA facts; this sim never predicts
//                 eclipse types, it only shows when the geometry lines up)
//   BETA_CURVE  - Moon geocentric ecliptic latitude, one row per day at
//                 12:00 UT, generated with scripts/eclipse-events.js from the
//                 vendored ephemeris and pinned by tests/eclipse.test.js.
//   Season windows are the simplified teaching model: each node line sits at
//   the Sun's ecliptic longitude at the solar eclipse of that season, and the
//   season is active while the Sun is within +-16 deg of it (about +-16 days;
//   a course-style approximation, real window lengths vary).
//   Tests in tests/eclipse.test.js pin everything above.
(function (root) {
  "use strict";
  root.LS = root.LS || {};
  var E = {};
  var RAD = Math.PI / 180;
  var DAY = 86400000;

  // NASA canon facts (five-millennium eclipse catalogue), verbatim values.
  E.EVENTS = [
    { iso: "2027-02-06T16:00:00Z", type: "solar", label: "Annular solar eclipse",      fact: "gamma -0.295" },
    { iso: "2027-02-20T23:13:00Z", type: "lunar", label: "Penumbral lunar eclipse",    fact: "umbral mag -0.057, penumbral mag 0.927" },
    { iso: "2027-07-18T16:03:00Z", type: "lunar", label: "Penumbral lunar eclipse",    fact: "penumbral mag 0.0014 (a graze)" },
    { iso: "2027-08-02T10:07:00Z", type: "solar", label: "Total solar eclipse",        fact: "gamma 0.142" },
    { iso: "2027-08-17T07:14:00Z", type: "lunar", label: "Penumbral lunar eclipse",    fact: "penumbral mag 0.546" }
  ];
  E.EVENTS.forEach(function (ev) { ev.t = Date.parse(ev.iso); });

  // Simplified-model constants (kept round on purpose; see Learn tab).
  E.SEASON_HALF_DAYS = 16;                                   // +/- window around a season center
  E.SEASON_HALF_DEG = 16 * 360 / 365.25;                     // Sun drift in that time
  E.NEAREST_WINDOW_DAYS = 2;                                 // "you are at an eclipse" band
  E.SYNODIC = 29.530588861;

  // Baked by scripts/eclipse-events.js. Do not hand-edit.
// Moon ecliptic latitude (deg), samples at 12:00 UT every day,
// index 0 = 2026-11-01T12:00:00Z, step 1 day, 334 samples.
E.BETA_CURVE_START = "2026-11-01T12:00:00Z";
E.BETA_CURVE = [
  [0,1.93], [1,0.75], [2,-0.45], [3,-1.6], [4,-2.65], [5,-3.54], [6,-4.24], [7,-4.72], [8,-4.96], [9,-4.97],
  [10,-4.75], [11,-4.32], [12,-3.71], [13,-2.94], [14,-2.04], [15,-1.05], [16,0.01], [17,1.09], [18,2.15], [19,3.12],
  [20,3.96], [21,4.59], [22,4.94], [23,4.98], [24,4.67], [25,4.03], [26,3.12], [27,2.01], [28,0.8], [29,-0.43],
  [30,-1.61], [31,-2.66], [32,-3.56], [33,-4.26], [34,-4.74], [35,-4.99], [36,-5.01], [37,-4.8], [38,-4.38], [39,-3.77],
  [40,-2.99], [41,-2.09], [42,-1.1], [43,-0.05], [44,1.02], [45,2.07], [46,3.04], [47,3.89], [48,4.56], [49,4.98],
  [50,5.11], [51,4.9], [52,4.34], [53,3.47], [54,2.36], [55,1.09], [56,-0.22], [57,-1.49], [58,-2.63], [59,-3.58],
  [60,-4.33], [61,-4.84], [62,-5.12], [63,-5.15], [64,-4.96], [65,-4.55], [66,-3.95], [67,-3.18], [68,-2.27], [69,-1.25],
  [70,-0.18], [71,0.91], [72,1.98], [73,2.97], [74,3.85], [75,4.55], [76,5.03], [77,5.24], [78,5.15], [79,4.72],
  [80,3.97], [81,2.93], [82,1.67], [83,0.31], [84,-1.05], [85,-2.31], [86,-3.39], [87,-4.25], [88,-4.85], [89,-5.19],
  [90,-5.28], [91,-5.13], [92,-4.76], [93,-4.19], [94,-3.44], [95,-2.54], [96,-1.53], [97,-0.45], [98,0.66], [99,1.76],
  [100,2.79], [101,3.7], [102,4.45], [103,4.98], [104,5.26], [105,5.25], [106,4.94], [107,4.31], [108,3.4], [109,2.26],
  [110,0.95], [111,-0.42], [112,-1.74], [113,-2.93], [114,-3.91], [115,-4.64], [116,-5.09], [117,-5.27], [118,-5.19], [119,-4.87],
  [120,-4.35], [121,-3.65], [122,-2.8], [123,-1.82], [124,-0.76], [125,0.34], [126,1.44], [127,2.5], [128,3.44], [129,4.23],
  [130,4.81], [131,5.14], [132,5.19], [133,4.94], [134,4.41], [135,3.6], [136,2.56], [137,1.35], [138,0.06], [139,-1.24],
  [140,-2.44], [141,-3.48], [142,-4.29], [143,-4.84], [144,-5.11], [145,-5.11], [146,-4.86], [147,-4.4], [148,-3.74], [149,-2.94],
  [150,-2.01], [151,-0.99], [152,0.08], [153,1.16], [154,2.2], [155,3.16], [156,3.98], [157,4.59], [158,4.97], [159,5.06],
  [160,4.86], [161,4.36], [162,3.6], [163,2.61], [164,1.47], [165,0.24], [166,-1.01], [167,-2.18], [168,-3.21], [169,-4.04],
  [170,-4.63], [171,-4.95], [172,-5.01], [173,-4.81], [174,-4.39], [175,-3.77], [176,-2.99], [177,-2.09], [178,-1.1], [179,-0.06],
  [180,0.99], [181,2.02], [182,2.97], [183,3.79], [184,4.44], [185,4.86], [186,5.01], [187,4.84], [188,4.38], [189,3.62],
  [190,2.64], [191,1.49], [192,0.26], [193,-0.97], [194,-2.13], [195,-3.15], [196,-3.98], [197,-4.58], [198,-4.93], [199,-5.01],
  [200,-4.84], [201,-4.44], [202,-3.84], [203,-3.07], [204,-2.17], [205,-1.18], [206,-0.15], [207,0.9], [208,1.92], [209,2.87],
  [210,3.71], [211,4.39], [212,4.86], [213,5.07], [214,4.97], [215,4.56], [216,3.85], [217,2.86], [218,1.68], [219,0.4],
  [220,-0.89], [221,-2.1], [222,-3.16], [223,-4.02], [224,-4.65], [225,-5.02], [226,-5.12], [227,-4.98], [228,-4.59], [229,-4],
  [230,-3.24], [231,-2.34], [232,-1.34], [233,-0.29], [234,0.78], [235,1.82], [236,2.79], [237,3.66], [238,4.37], [239,4.89],
  [240,5.17], [241,5.17], [242,4.86], [243,4.23], [244,3.3], [245,2.14], [246,0.81], [247,-0.56], [248,-1.87], [249,-3.03],
  [250,-3.98], [251,-4.68], [252,-5.1], [253,-5.25], [254,-5.14], [255,-4.79], [256,-4.23], [257,-3.48], [258,-2.59], [259,-1.59],
  [260,-0.52], [261,0.56], [262,1.63], [263,2.64], [264,3.53], [265,4.29], [266,4.86], [267,5.2], [268,5.29], [269,5.09],
  [270,4.58], [271,3.78], [272,2.7], [273,1.42], [274,0.03], [275,-1.35], [276,-2.63], [277,-3.71], [278,-4.52], [279,-5.05],
  [280,-5.28], [281,-5.23], [282,-4.93], [283,-4.41], [284,-3.7], [285,-2.84], [286,-1.86], [287,-0.81], [288,0.28], [289,1.36],
  [290,2.39], [291,3.32], [292,4.11], [293,4.72], [294,5.11], [295,5.26], [296,5.14], [297,4.74], [298,4.06], [299,3.11],
  [300,1.94], [301,0.63], [302,-0.74], [303,-2.07], [304,-3.24], [305,-4.17], [306,-4.82], [307,-5.16], [308,-5.2], [309,-4.97],
  [310,-4.5], [311,-3.83], [312,-3.01], [313,-2.06], [314,-1.04], [315,0.03], [316,1.09], [317,2.12], [318,3.06], [319,3.87],
  [320,4.51], [321,4.94], [322,5.13], [323,5.05], [324,4.71], [325,4.1], [326,3.25], [327,2.18], [328,0.97], [329,-0.32],
  [330,-1.61], [331,-2.79], [332,-3.78], [333,-4.51]
];

  var B0 = Date.parse(E.BETA_CURVE_START);

  // Low-precision Sun ecliptic longitude (J2000 mean terms plus equation of
  // center). Good to about 0.02 deg across this board span; enough to place
  // the node lines and season arcs. Dates may be Date objects or ISO strings.
  E.sunLonApprox = function (date) {
    var t = typeof date === "number" ? date : Date.parse(date);
    var d = (t - Date.UTC(2000, 0, 1, 12)) / DAY;
    var L = 280.4601 + d * 0.9856474;
    var Ms = (357.5291 + d * 0.98560026) * RAD;
    return ((L + 1.915 * Math.sin(Ms) + 0.02 * Math.sin(2 * Ms)) % 360 + 360) % 360;
  };

  // Node gesture per event: a solar eclipse puts the Sun right at the node
  // the Moon is crossing; a full moon sits at the opposite node, so add 180.
  // Grouping by time gaps (<= 20 days) yields two seasons; each season's node
  // longitude is the Sun longitude at its solar eclipse.
  E.nodeLongitudes = function () {
    var groups = [], cur = [];
    E.EVENTS.forEach(function (ev) {
      if (cur.length && ev.t - cur[cur.length - 1].t > 20 * DAY) { groups.push(cur); cur = []; }
      cur.push(ev);
    });
    if (cur.length) groups.push(cur);
    return groups.map(function (g) {
      var solar = g.filter(function (e) { return e.type === "solar"; })[0] || g[0];
      return E.sunLonApprox(solar.iso);
    });
  };

  // Season membership for any date: how close is the Sun to either node?
  // Returns null, or { nodeDeg, sunDeg, signedDeg } for the nearer node.
  E.seasonAt = function (date) {
    var nodes = E.nodeLongitudes();
    var lon = E.sunLonApprox(date);
    var best = null;
    nodes.forEach(function (nd) {
      var sd = ((lon - nd) % 360 + 540) % 360 - 180;   // signed, -180..180
      if (Math.abs(sd) <= E.SEASON_HALF_DEG && (!best || Math.abs(sd) < Math.abs(best.signedDeg))) {
        best = { nodeDeg: nd, sunDeg: lon, signedDeg: sd };
      }
    });
    return best;
  };

  // Baked-curve beta: linear interpolation between the daily samples.
  // Out of range clamps to the ends.
  E.betaAt = function (date) {
    var t = typeof date === "number" ? date : Date.parse(date);
    var x = (t - B0) / DAY;
    var c = E.BETA_CURVE;
    if (x <= 0) return c[0][1];
    if (x >= c.length - 1) return c[c.length - 1][1];
    var i = Math.floor(x);
    var f = x - i;
    return c[i][1] + (c[i + 1][1] - c[i][1]) * f;
  };

  // Phase approximation, ephem-free: one baked NASA new-moon moment (the
  // annular eclipse of 2027-02-06 is a new moon by definition) plus a mean
  // synodic month. Accumulates a few days of error across the board span,
  // which is why every place it appears says "approx".
  E.NM0_ISO = "2027-02-06T16:00:00Z";
  E.elongApprox = function (date) {
    var t = typeof date === "number" ? date : Date.parse(date);
    return (((t - Date.parse(E.NM0_ISO)) / DAY / E.SYNODIC) * 360 % 360 + 360) % 360;
  };
  E.illumApprox = function (elongDeg) {
    return (1 - Math.cos(elongDeg * RAD)) / 2 * 100;
  };

  // Phase name: prefer the shared ephemeris table when the page has it,
  // otherwise the same boundaries baked here (fixed data, ephem-free).
  var NAMES = function (ang) {
    var a = ((ang % 360) + 360) % 360;
    if (a < 11.25 || a >= 348.75) return "new moon";
    if (a < 78.75) return "waxing crescent";
    if (a < 101.25) return "first quarter";
    if (a < 168.75) return "waxing gibbous";
    if (a < 191.25) return "full moon";
    if (a < 258.75) return "waning gibbous";
    if (a < 281.25) return "last quarter";
    return "waning crescent";
  };
  E.phaseName = function (elongDeg) {
    if (root.LS.ephem && typeof root.LS.ephem.phaseName === "function") {
      return root.LS.ephem.phaseName(elongDeg);
    }
    return NAMES(elongDeg);
  };

  // Nearest baked event to a date. Returns { event, days } with signed days
  // (positive = event in the future), plus within = the 2-day eclipse band.
  E.nearestEvent = function (date) {
    var t = typeof date === "number" ? date : Date.parse(date);
    var best = null;
    E.EVENTS.forEach(function (ev) {
      var d = (ev.t - t) / DAY;
      if (!best || Math.abs(d) < Math.abs(best.days)) best = { event: ev, days: d };
    });
    best.within = Math.abs(best.days) <= E.NEAREST_WINDOW_DAYS;
    return best;
  };

  E.clockUT = function (iso) { return iso.slice(11, 16) + " UT"; };
  E.dateUT = function (iso) { return iso.slice(0, 10); };

  // Verdict text for the readout strip. Types always come from the baked
  // NASA facts; the sim only judges alignment.
  E.verdict = function (date) {
    var near = E.nearestEvent(date);
    if (near.within) {
      return "eclipse: " + near.event.label + " on " + E.dateUT(near.event.iso) +
        " (" + E.clockUT(near.event.iso) + ")";
    }
    var se = E.seasonAt(date);
    if (se) return "eclipse season: shadows line up near the nodes";
    return "no eclipse";
  };

  root.LS.eclipse = E;
})(typeof globalThis !== "undefined" ? globalThis : window);
