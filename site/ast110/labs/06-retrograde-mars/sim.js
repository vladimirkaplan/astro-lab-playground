// Retrograde Mars lab sim. Everything about the apparent motion comes from
// LS.mars (the J2000 frozen-element model built in BMC-12); this file only draws
// and grades - no physics is reimplemented here.
//
// Bench 1 is a two-lane overtake. A Sun-centred top view puts Earth on the fast
// inner lane and Mars on the slow outer one; a sightline runs from Earth through
// Mars to a fixed star-ring, and the ring mark is tonight's plotted Mars. Scrubbing
// or playing the date makes the mark glide forward, stall at the first station, carve
// the loop backward, and recover, with both stations and the opposition marked and the
// opposition highlighted. The sky-view toggle redraws the SAME dates as the observer
// sees them: apparent longitude against a fixed-star grid, the retrograde hook opening
// backward, stations and opposition pinned.
//
// Bench 2 is the data page: 28 nights across the same apparition. The student records
// E / W / "station" per night (and may read the longitude off Bench 1). Check grades
// each row against LS.mars, scores the log, and only THEN reveals the worked window
// (station dates, opposition, westward arc). The student's own table logs and exports
// to CSV.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units, M = LS.mars;
  var LAB = "06-retrograde-mars";
  var $ = function (id) { return document.getElementById(id); };

  var mode = LS.ui.getMode(LAB);
  var dpr = window.devicePixelRatio || 1;
  var STAGE_H = 430;
  var RAD = Math.PI / 180;

  // Bench 2 table geometry: 28 nights, 4 days apart, centred so opposition lands on
  // Day 54 (row 15) and both stations fall comfortably inside the page.
  var STEP = 4, NROWS = 28, OPP_DAY = 54, DAY_MAX = 108;

  var J2000 = M.J2000_MS, DAY = M.DAY_MS;
  function isoOf(t) { return new Date(J2000 + t * DAY).toISOString().slice(0, 10); }
  function tOfISO(iso) {
    var p = iso.split("-");
    return (Date.UTC(+p[0], +p[1] - 1, +p[2], 12, 0, 0) - J2000) / DAY;
  }
  function signed(d) { return ((d + 540) % 360) - 180; }
  function dms(v, n) { return U.round(v, n === undefined ? 1 : n).toFixed(n === undefined ? 1 : n); }

  // ---------- apparatus windows ----------
  // Each is anchored on a reference date; the window (stations + opposition) is
  // computed from the model, so the page is never hardcoded to one year.
  function makeWindow(refISO) {
    var w = M.retrogradeWindow(tOfISO(refISO));
    return {
      refISO: refISO,
      startT: w.startT, endT: w.endT, oppositionT: w.oppositionT,
      arcDeg: w.arcDeg, days: w.days,
      tableStart: w.oppositionT - OPP_DAY,   // night 1, so opposition sits at Day 54
      t: function (d) { return this.tableStart + d; },
      label: isoOf(w.startT).slice(0, 7) + " to " + isoOf(w.endT).slice(0, 7)
    };
  }
  var win = makeWindow("2024-11-01");

  // Sampled apparent longitude, locally unwrapped from the first night so the trace
  // is continuous without the huge-cost global integration (dates are ~9000 d out).
  function longitudeTrace(startT, nDays, step) {
    var lons = [], lon = M.geocentricLongitudeDeg(startT);
    lons.push(lon);
    for (var d = step; d <= nDays + 1e-9; d += step) {
      lon += signed(M.geocentricLongitudeDeg(startT + d) - M.geocentricLongitudeDeg(startT + d - step));
      lons.push(lon);
    }
    return lons;
  }
  function motionAt(t) {
    var sp = M.apparentSpeedDegPerDay(t);
    return { sp: sp, name: Math.abs(sp) < M.STATION_EPS ? "station" : (sp < 0 ? "W" : "E") };
  }

  // ---------- bench 1 state ----------
  var view = "helio";
  var day = OPP_DAY;
  var running = false, rafId = null;
  var stage = $("stage"), sctx = stage.getContext("2d");

  // Fun Mode: a seeded, position-stable reading error on the reported longitude and
  // elongation, mirroring a noisier instrument. Geometry itself is never touched.
  function jitteredLon(t) {
    var lon = M.geocentricLongitudeDeg(t);
    if (mode !== "fun") return lon;
    return lon + (U.mulberry32(Math.round(t * 10) ^ 0x5EED)() - 0.5) * 0.3;
  }

  function drawStage() {
    var w = stage.width / dpr, h = STAGE_H;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, w, h);
    sctx.fillStyle = "#0d1526";
    sctx.fillRect(0, 0, w, h);
    if (view === "helio") drawHelio(w, h); else drawSky(w, h);
    drawModeTag(w);
  }

  function drawModeTag(w) {
    sctx.textAlign = "left"; sctx.textBaseline = "top";
    sctx.fillStyle = mode === "fun" ? "#ff9c9c" : "#6d7fa3";
    sctx.font = "10.5px system-ui, sans-serif";
    sctx.fillText(mode === "fun"
      ? "Fun Mode: +/- 0.3 deg instrument scatter on the longitude/elongation readouts"
      : "Ideal Mode: exact model values  |  apparatus " + win.label, 12, STAGE_H - 16);
  }

  // ===== heliocentric top view: the two-lane overtake =====
  function drawHelio(w, h) {
    var cx = w * 0.5, cy = h * 0.5;
    var ringR = Math.min(w, h) / 2 - 30;
    var scale = ringR / 1.78;               // AU -> px, Mars apoapsis (~1.67 AU) inside the ring

    // fixed star ring with degree ticks (does not rotate: the reference frame)
    sctx.strokeStyle = "#33456b"; sctx.lineWidth = 1.4;
    sctx.beginPath(); sctx.arc(cx, cy, ringR, 0, 6.29); sctx.stroke();
    sctx.font = "9px system-ui, sans-serif"; sctx.fillStyle = "#4f6288";
    for (var a = 0; a < 360; a += 30) {
      var ra = a * RAD;
      var r0 = ringR - (a % 90 === 0 ? 10 : 6);
      sctx.strokeStyle = a % 90 === 0 ? "#5a7099" : "#33456b";
      sctx.beginPath();
      sctx.moveTo(cx + r0 * Math.cos(ra), cy - r0 * Math.sin(ra));
      sctx.lineTo(cx + ringR * Math.cos(ra), cy - ringR * Math.sin(ra));
      sctx.stroke();
      if (a % 90 === 0) {
        sctx.textAlign = "center"; sctx.textBaseline = "middle";
        sctx.fillStyle = "#6d7fa3";
        sctx.fillText(a + "\u00b0", cx + (ringR + 11) * Math.cos(ra), cy - (ringR + 11) * Math.sin(ra));
      }
    }

    // reference orbits, idealised as circles for the viewpoint argument
    sctx.setLineDash([4, 5]); sctx.lineWidth = 1.1;
    sctx.strokeStyle = "#3a557f"; sctx.beginPath(); sctx.arc(cx, cy, scale, 0, 6.29); sctx.stroke();
    sctx.strokeStyle = "#7a4a3a"; sctx.beginPath(); sctx.arc(cx, cy, scale * 1.5237, 0, 6.29); sctx.stroke();
    sctx.setLineDash([]);

    // Sun
    var g = sctx.createRadialGradient(cx, cy, 4, cx, cy, 34);
    g.addColorStop(0, "#ffe9a3"); g.addColorStop(1, "rgba(255,180,40,0)");
    sctx.fillStyle = g; sctx.beginPath(); sctx.arc(cx, cy, 34, 0, 6.29); sctx.fill();
    sctx.fillStyle = "#ffd76e"; sctx.beginPath(); sctx.arc(cx, cy, 10, 0, 6.29); sctx.fill();

    var t = win.t(day);
    var e = M.heliocentricAU("earth", t), m = M.heliocentricAU("mars", t);
    var ex = cx + e.x * scale, ey = cy - e.y * scale;
    var mx = cx + m.x * scale, my = cy - m.y * scale;
    var lon = M.geocentricLongitudeDeg(t);
    var rlon = lon * RAD;
    var rx = cx + ringR * Math.cos(rlon), ry = cy - ringR * Math.sin(rlon);

    // opposition highlight: Earth-Sun-Mars collinear with Sun between
    var elong = M.solarElongationDeg(t);
    var oppNear = Math.abs(elong - 180) < 12;
    if (oppNear) {
      sctx.strokeStyle = "rgba(255,215,110,.35)"; sctx.lineWidth = ringR * 2;
      sctx.strokeStyle = "rgba(255,215,110,.10)";
      sctx.beginPath(); sctx.arc(cx, cy, ringR, 0, 6.29); sctx.stroke();
      sctx.lineWidth = 1.6; sctx.strokeStyle = "rgba(255,215,110,.6)";
      sctx.beginPath(); sctx.moveTo(ex, ey); sctx.lineTo(cx, cy); sctx.lineTo(rx, ry); sctx.stroke();
    }

    // the ring mark's recent trail, unwound inward by age so the loop opens visibly
    var loopT = longitudeTrace(win.tableStart, DAY_MAX, 1);
    sctx.lineWidth = 2;
    for (var d = Math.max(0, day - 120); d < day; d += 1) {
      var i0 = Math.round(d), i1 = Math.round(d + 1);
      if (i1 >= loopT.length) break;
      var age = day - d;
      var rr = ringR - U.clamp(age, 0, 120) * 0.42;
      var l0 = loopT[i0], l1 = loopT[i1];
      sctx.strokeStyle = "rgba(159,208,255," + (0.85 - age / 150) + ")";
      sctx.beginPath();
      sctx.moveTo(cx + rr * Math.cos(l0 * RAD), cy - rr * Math.sin(l0 * RAD));
      sctx.lineTo(cx + rr * Math.cos(l1 * RAD), cy - rr * Math.sin(l1 * RAD));
      sctx.stroke();
    }

    // sightline: Earth -> Mars -> out to the ring mark
    sctx.strokeStyle = "#9fd0ff"; sctx.lineWidth = 1.2; sctx.setLineDash([4, 4]);
    sctx.beginPath(); sctx.moveTo(ex, ey); sctx.lineTo(rx, ry); sctx.stroke();
    sctx.setLineDash([]);
    sctx.strokeStyle = "#ffd76e"; sctx.beginPath(); sctx.moveTo(ex, ey); sctx.lineTo(mx, my); sctx.stroke();

    // station + opposition marks on the ring
    markRing(win.startT, "#7fd0ff", "first station");
    markRing(win.endT, "#7fd0ff", "second station");
    markRing(win.oppositionT, "#ff9c6b", "opposition");

    // Earth, Mars, ring mark (now)
    sctx.fillStyle = "#2e6db4"; sctx.beginPath(); sctx.arc(ex, ey, 9, 0, 6.29); sctx.fill();
    sctx.fillStyle = "#cfe0ff"; sctx.font = "11px system-ui, sans-serif";
    sctx.textAlign = "center"; sctx.fillText("Earth", ex, ey + 21);
    sctx.fillStyle = "#d9603b"; sctx.beginPath(); sctx.arc(mx, my, 7, 0, 6.29); sctx.fill();
    sctx.fillText("Mars", mx, my - 13);

    sctx.beginPath(); sctx.arc(rx, ry, 6, 0, 6.29);
    sctx.fillStyle = "#fff2c4"; sctx.fill();
    sctx.strokeStyle = "#ffd76e"; sctx.lineWidth = 2; sctx.stroke();

    sctx.fillStyle = "#8fa4c9"; sctx.font = "10px system-ui, sans-serif";
    sctx.textAlign = "left"; sctx.textBaseline = "top";
    sctx.fillText("heliocentric top view (north up) - ring = fixed stars; the mark is Mars as plotted from Earth", 12, 10);
    sctx.fillText("orbits drawn circular; dots at model positions; ring trail unwound by date so the loop is visible", 12, 23);
  }
  function markRing(t, color, label) {
    var cx = (stage.width / dpr) * 0.5, cy = STAGE_H * 0.5;
    var ringR = Math.min(stage.width / dpr, STAGE_H) / 2 - 30;
    var ra = M.geocentricLongitudeDeg(t) * RAD;
    var x = cx + ringR * Math.cos(ra), y = cy - ringR * Math.sin(ra);
    sctx.fillStyle = color;
    sctx.beginPath(); sctx.arc(x, y, 3.4, 0, 6.29); sctx.fill();
    sctx.font = "9px system-ui, sans-serif"; sctx.textAlign = "center"; sctx.textBaseline = "bottom";
    sctx.fillText(label, x, y - 5);
  }

  // ===== geocentric sky view: apparent longitude vs date =====
  function drawSky(w, h) {
    var padL = 54, padR = 20, padT = 40, padB = 44;
    var gx0 = padL, gx1 = w - padR, gy0 = padT, gy1 = h - padB;

    // longitude extent of this apparatus (unwrapped, over the whole day range)
    var trace = longitudeTrace(win.tableStart, DAY_MAX, 1);
    var lo = Infinity, hi = -Infinity;
    for (var i = 0; i < trace.length; i++) { if (trace[i] < lo) lo = trace[i]; if (trace[i] > hi) hi = trace[i]; }
    var pad = Math.max(4, (hi - lo) * 0.06);
    lo -= pad; hi += pad;
    var X = function (lon) { return gx0 + (lon - lo) / (hi - lo) * (gx1 - gx0); };
    var Y = function (d) { return gy0 + (d / DAY_MAX) * (gy1 - gy0); };

    // fixed-star gridlines every 5 deg of longitude (this is the reference frame)
    sctx.font = "9px system-ui, sans-serif";
    var gl = Math.ceil(lo / 5) * 5;
    for (; gl <= hi; gl += 5) {
      var isMajor = ((gl % 30) + 360) % 360 === 0;
      sctx.strokeStyle = isMajor ? "#33456b" : "#1e2b45"; sctx.lineWidth = 1;
      sctx.beginPath(); sctx.moveTo(X(gl), gy0); sctx.lineTo(X(gl), gy1); sctx.stroke();
      if (isMajor) {
        sctx.fillStyle = "#6d7fa3"; sctx.textAlign = "center"; sctx.textBaseline = "top";
        sctx.fillText(gl + "\u00b0", X(gl), gy1 + 6);
        // a little star glyph on the grid
        sctx.fillStyle = "#3f5480";
        sctx.beginPath(); sctx.arc(X(gl), gy0 - 6, 1.8, 0, 6.29); sctx.fill();
      }
    }
    // frame + y axis ticks
    sctx.strokeStyle = "#3c4f73"; sctx.lineWidth = 1.2;
    sctx.strokeRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
    sctx.fillStyle = "#6d7fa3"; sctx.textAlign = "right"; sctx.textBaseline = "middle";
    for (var d = 0; d <= DAY_MAX; d += 18) {
      sctx.fillText("D" + d, gx0 - 6, Y(d));
      sctx.strokeStyle = "#22314f";
      sctx.beginPath(); sctx.moveTo(gx0, Y(d)); sctx.lineTo(gx0 + 4, Y(d)); sctx.stroke();
    }

    // shade the retrograde stretch between the stations
    sctx.fillStyle = "rgba(255,140,110,.10)";
    var dS = win.startT - win.tableStart, dE = win.endT - win.tableStart;
    sctx.fillRect(gx0, Y(dS), gx1 - gx0, Y(dE) - Y(dS));

    // the apparent path: longitude (x) against date (y) - the backward bend is the loop
    sctx.strokeStyle = "#9fd0ff"; sctx.lineWidth = 2;
    sctx.beginPath();
    for (var dd = 0; dd < trace.length; dd++) {
      var x = X(trace[dd]), y = Y(dd);
      if (dd === 0) sctx.moveTo(x, y); else sctx.lineTo(x, y);
    }
    sctx.stroke();

    // events: horizontal date lines with the station/opposition label
    function eventTick(d, color, label) {
      if (d < -0.5 || d > DAY_MAX + 0.5) return;
      var yy = Y(U.clamp(d, 0, DAY_MAX));
      sctx.strokeStyle = color; sctx.lineWidth = 1.4; sctx.setLineDash([5, 4]);
      sctx.beginPath(); sctx.moveTo(gx0, yy); sctx.lineTo(gx1, yy); sctx.stroke();
      sctx.setLineDash([]);
      sctx.fillStyle = color; sctx.font = "9.5px system-ui, sans-serif";
      sctx.textAlign = "left"; sctx.textBaseline = "bottom";
      sctx.fillText(label, gx0 + 6, yy - 2);
    }
    eventTick(dS, "#7fd0ff", "first station " + isoOf(win.startT));
    eventTick(win.oppositionT - win.tableStart, "#ff9c6b", "opposition " + isoOf(win.oppositionT));
    eventTick(dE, "#7fd0ff", "second station " + isoOf(win.endT));

    // current night: the trace is sampled one day per index, so index = day
    var curIdx = U.clamp(Math.round(day), 0, trace.length - 1);
    var cxp = X(trace[curIdx]), cyp = Y(day);
    sctx.strokeStyle = "rgba(255,233,168,.5)"; sctx.lineWidth = 1;
    sctx.beginPath(); sctx.moveTo(gx0, cyp); sctx.lineTo(gx1, cyp); sctx.stroke();
    sctx.beginPath(); sctx.arc(cxp, cyp, 6, 0, 6.29);
    sctx.fillStyle = "#fff2c4"; sctx.fill();
    sctx.strokeStyle = "#ffd76e"; sctx.lineWidth = 2; sctx.stroke();

    sctx.fillStyle = "#8fa4c9"; sctx.font = "10px system-ui, sans-serif";
    sctx.textAlign = "left"; sctx.textBaseline = "top";
    sctx.fillText("geocentric sky view - Mars against fixed-star longitudes; time runs downward", gx0, 12);
    sctx.textAlign = "center";
    sctx.fillStyle = "#8fa4c9";
    sctx.fillText("apparent ecliptic longitude (east \u2192)", (gx0 + gx1) / 2, gy1 + 24);
  }

  // ---------- bench 1 readouts ----------
  function readouts() {
    var t = win.t(day);
    var m = motionAt(t);
    var lon = jitteredLon(t);
    var elong = M.solarElongationDeg(t) + (mode === "fun" ? (U.mulberry32(Math.round(t * 10) ^ 0x1234)() - 0.5) * 1.2 : 0);
    var tag = mode === "fun" ? "  (instrument estimate)" : "";
    $("rDate").textContent = isoOf(t);
    var motion = m.name === "station" ? "at a station (apparent speed \u2248 0)"
      : m.name === "W" ? "retrograde - drifting WEST" : "prograde - drifting EAST";
    $("rMotion").textContent = motion + ", " + dms(m.sp, 3) + " deg/day" + tag;
    $("rLon").textContent = dms(lon, 2) + " deg along the ecliptic" + tag;
    $("rElong").textContent = dms(elong, 1) + " deg" + (Math.abs(elong - 180) < 6 ? "  \u25cf near opposition - Mars up all night, closest" : "") + tag;
    var st;
    if (t < win.startT) st = "prograde, before the first station";
    else if (t < win.oppositionT) st = "retrograde, opening toward opposition";
    else if (t < win.endT) st = "retrograde, past opposition, closing on the second station";
    else st = "prograde again, past the second station";
    $("rStatus").textContent = st + "  |  apparition " + win.label;
  }

  // ---------- controls ----------
  function setDay(v) {
    day = U.clamp(v, 0, DAY_MAX);
    $("dayRange").value = String(day);
    $("dayRead").textContent = String(U.round(day, 0));
    drawStage(); readouts();
  }
  $("dayRange").addEventListener("input", function (e) { stopPlay(); setDay(parseFloat(e.target.value)); });
  $("viewBtn").addEventListener("click", function () {
    view = view === "helio" ? "sky" : "helio";
    $("viewBtn").textContent = "View: " + (view === "helio" ? "heliocentric track" : "geocentric sky");
    $("viewBtn").className = "action" + (view === "helio" ? " ghost" : "");
    drawStage();
  });
  Array.prototype.forEach.call(document.querySelectorAll(".winPreset"), function (b) {
    b.addEventListener("click", function () {
      Array.prototype.forEach.call(document.querySelectorAll(".winPreset"), function (x) {
        x.classList.toggle("active", x === b);
      });
      win = makeWindow(b.getAttribute("data-ref"));
      buildTable();
      setDay(OPP_DAY);
    });
  });

  function stopPlay() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    running = false;
    $("playBtn").disabled = false;
    $("playBtn").innerHTML = "&#9654; Play the apparition";
  }
  $("playBtn").addEventListener("click", function () {
    if (running) { stopPlay(); return; }
    running = true;
    $("playBtn").disabled = false;
    $("playBtn").innerHTML = "&#9632; Stop";
    var t0 = performance.now(), DUR = 14000, from = day >= DAY_MAX ? 0 : day;
    function step(now) {
      if (!running) return;
      var f = (now - t0) / DUR;
      setDay(from + f * (DAY_MAX - from));
      if (f < 1) rafId = requestAnimationFrame(step);
      else stopPlay();
    }
    rafId = requestAnimationFrame(step);
  });

  // ---------- bench 2: be the observer ----------
  var TABLE_HEADER = ["apparition", "day", "date", "your_motion", "your_lon_deg", "model_motion", "correct"];
  var studentRows = [];   // {motion:'', lon:''} per night
  var checked = false;

  function buildTable() {
    studentRows = []; checked = false;
    $("obsReveal").innerHTML = "";
    $("rObsScore").textContent = "Log rows and press Check.";
    var rows = M.dateTable(win.tableStart, NROWS, STEP);
    var html = "<table class='data-table'><thead><tr>" +
      "<th>Night</th><th>Day</th><th>Date</th><th>Mars motion (E / W / station)</th>" +
      "<th>Longitude you read (&deg;)</th></tr></thead><tbody>";
    for (var i = 0; i < NROWS; i++) {
      studentRows.push({ motion: "", lon: "" });
      html += "<tr><td>" + (i + 1) + "</td><td>" + (i * STEP) + "</td><td>" + rows[i].iso + "</td>" +
        "<td><select class='obs-motion' data-i='" + i + "'>" +
        "<option value='' selected>&mdash; choose &mdash;</option>" +
        "<option value='E'>E (eastward)</option>" +
        "<option value='W'>W (westward)</option>" +
        "<option value='station'>station</option></select></td>" +
        "<td><input type='text' inputmode='decimal' class='obs-lon' data-i='" + i +
        "' style='width:9ch' placeholder='optional'></td></tr>";
    }
    html += "</tbody></table>";
    $("obsTable").innerHTML = html;
    Array.prototype.forEach.call(document.querySelectorAll(".obs-motion"), function (s) {
      s.addEventListener("change", function () { studentRows[+s.getAttribute("data-i")].motion = s.value; });
    });
    Array.prototype.forEach.call(document.querySelectorAll(".obs-lon"), function (inp) {
      inp.addEventListener("input", function () { studentRows[+inp.getAttribute("data-i")].lon = inp.value; });
    });
  }

  $("obsReset").addEventListener("click", function () { buildTable(); });

  $("obsCheck").addEventListener("click", function () {
    var truth = M.dateTable(win.tableStart, NROWS, STEP);
    var correct = 0, lonTried = 0, lonOK = 0, answered = 0;
    var body = "";
    for (var i = 0; i < NROWS; i++) {
      var mine = (studentRows[i].motion || "").trim();
      if (mine) answered++;
      var ok = mine !== "" && mine === truth[i].motion;
      if (ok) correct++;
      var lonNum = LS.check.parseNumber(studentRows[i].lon);
      var lonMark = "—";
      if (isFinite(lonNum)) {
        lonTried++;
        if (Math.abs(signed(lonNum - truth[i].lonDeg)) <= 3) { lonOK++; lonMark = "\u2713"; }
        else lonMark = "\u2717 (" + dms(truth[i].lonDeg, 1) + ")";
      }
      body += "<tr><td>" + (i + 1) + "</td><td>" + (i * STEP) + "</td><td>" + truth[i].iso + "</td>" +
        "<td>" + (mine ? mine : "<span class='muted'>blank</span>") + "</td>" +
        "<td><strong>" + truth[i].motion + "</strong></td>" +
        "<td>" + dms(truth[i].lonDeg, 1) + "</td>" +
        "<td>" + lonMark + "</td><td>" + (ok ? "\u2713" : "\u2717") + "</td></tr>";
    }
    checked = true;

    var pct = Math.round(correct / NROWS * 100);
    var verdict = answered === 0 ? "You left every row blank, so nothing could be marked right: "
      : "You read " + pct + "% of the nights correctly (" + correct + "/" + NROWS + "). " +
        (lonTried ? "Of " + lonTried + " longitudes you read, " + lonOK + " were within 3 deg. " : "") +
        (correct === NROWS ? "A clean log - every turn called exactly." :
          correct >= 24 ? "Solid. The misses are almost always near the stations, where the turn is subtle." :
          correct >= 12 ? "Half-way there. Work outward from the long W stretch: it is bracketed by the two stations, with opposition in the middle." :
          "Look again at Bench 1's sky view: the long backward stretch is W, the steady parts are E, the two flips are the stations.");
    $("rObsScore").textContent = "Score " + correct + " / " + NROWS +
      (answered === 0 ? "  (blank log grades 0/28)" : "") + "  |  " + verdict;

    // reveal only fires here, after the check
    var firstSt = win.startT, oppT = win.oppositionT, secondSt = win.endT;
    $("obsReveal").innerHTML =
      "<h4>The worked window (revealed)</h4>" +
      "<p>For this apparition the model puts the <strong>first station on " + isoOf(firstSt) +
      "</strong>, <strong>opposition on " + isoOf(oppT) + "</strong>, and the " +
      "<strong>second station on " + isoOf(secondSt) + "</strong>. Mars is retrograde for " +
      "<strong>" + dms(win.days, 0) + " days</strong> and slides about <strong>" +
      dms(win.arcDeg, 1) + "&deg; westward</strong> between the stations.</p>" +
      "<div>" + LS.store.tableHTML(
        ["Night", "Day", "Date", "You", "Model", "Longitude (&deg;)", "Lon check", "Row OK"],
        truth.map(function (r, i) {
          var mine = (studentRows[i].motion || "").trim() || "blank";
          var ok = mine !== "blank" && mine === r.motion;
          var lonNum = LS.check.parseNumber(studentRows[i].lon);
          var lonMark = isFinite(lonNum) ? (Math.abs(signed(lonNum - r.lonDeg)) <= 3 ? "ok" : "off") : "-";
          return [i + 1, i * STEP, r.iso, mine, r.motion, dms(r.lonDeg, 1), lonMark, ok ? "yes" : "no"];
        })) + "</div>";

    // log the student's own table
    var logRows = [];
    for (var j = 0; j < NROWS; j++) {
      var mm = (studentRows[j].motion || "").trim();
      logRows.push([win.label, j * STEP, truth[j].iso, mm || "", studentRows[j].lon || "",
        truth[j].motion, (mm && mm === truth[j].motion) ? "yes" : "no"]);
    }
    rows = logRows;
    LS.store.save(LAB, "log", TABLE_HEADER, rows);
    renderLog();
  });

  // ---------- log ----------
  var rows = [];
  try {
    var saved = LS.store.load(LAB, "log");
    if (saved && saved.rows) rows = saved.rows;
  } catch (e) {}

  function renderLog() {
    if (!rows.length) {
      $("logTable").innerHTML = "<p class='muted'>Nothing logged yet. Press Check on your " +
        "observing table and your whole 28-night log - your motion calls, your longitude " +
        "readings, and how each row graded - lands here. The table survives a reload, and CSV " +
        "export gives you the observation sheet you would hand in on paper.</p>";
      return;
    }
    $("logTable").innerHTML = LS.store.tableHTML(
      ["apparition", "day", "date", "your motion", "your lon (deg)", "model motion", "row OK"], rows);
  }
  $("logCsv").addEventListener("click", function () {
    LS.store.exportCSV("retrograde-mars-log.csv", TABLE_HEADER, rows, $("csvFallback"));
  });
  $("logClear").addEventListener("click", function () {
    rows = [];
    LS.store.save(LAB, "log", TABLE_HEADER, rows);
    $("csvFallback").style.display = "none";
    renderLog();
  });

  // ---------- boot ----------
  function resize() {
    stage.width = Math.round(Math.max(320, stage.clientWidth || 520) * dpr);
    stage.height = Math.round(STAGE_H * dpr);
    drawStage();
  }
  window.addEventListener("resize", resize);
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (mm) { mode = mm; drawStage(); readouts(); });
  LS.check.init(LAB);
  buildTable();
  setDay(OPP_DAY);
  renderLog();
  resize();
})();
