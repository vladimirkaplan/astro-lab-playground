// PHY110 Lab 5 sim: the vibrating spring bench. A vertical stand with a cm
// scale and a mirror strip behind it, a spring from the top bar whose bottom
// end is the read mark, a typed hanger mass, slotted weights in 100/50/20 g,
// an x0 capture for the no-hanger level, and a pull-down-and-release handle
// that starts the oscillation for ten-cycle timing.
//
// Bench A fills the F-x table and the graph (line forced through the origin,
// student trendline handle, K_average vs trendline K footer). Bench B times
// ten cycles at 200/220/240 g added and compares T_measured with T_theory
// from the student's own K_average.
//
// Ideal Mode reads the scale exactly and the clock stops itself on the tenth
// pass. Fun Mode slips each scale reading by +/-0.2 cm, lets the coil's own
// 75 g ride along (a third of it moves, periods run about 5 % long), and slips
// the stop button up to 0.10 s. Fun Mode never moves g, pi, or a course value.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units, S = LS.spring, FIT = LS.fit, PLOT = LS.plot;
  var LAB = "05-vibrating-spring";
  var $ = function (id) { return document.getElementById(id); };
  var mode = LS.ui.getMode(LAB);
  var EST = "  (instrument estimate)";

  function fmt(x, d) {
    if (!isFinite(x)) return "-";
    return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  }
  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
  function sum(list) { var s = 0; for (var i = 0; i < list.length; i++) s += list[i]; return s; }

  // ---------- bench geometry (css px) ----------
  var TOP_BAR = 22, PX_CM = 30, SCALE_TOP = 36;
  var cv = $("springCanvas"), cx = cv.getContext("2d");
  var dpr = window.devicePixelRatio || 1;

  // ---------- state ----------
  var hangerG = S.HANGER_G;
  var hangerOn = false;
  var x0 = null;                       // cm, captured with the hanger off
  var onHanger = [];                   // gram values, tray: the rest
  var tray = [100, 50, 50, 50, 50, 50, 20, 20, 20, 20];
  var rowsA = {};                      // added g -> {xf, x, k}
  var rowsB = {};                      // added g -> {t10}
  var studentSlope = null;
  var pull = 0;                        // cm, drag offset below equilibrium
  var osc = null;                      // {t0, T, A}
  var timing = null;                   // {startWall, cycles0, slip}
  var flash = null;
  var lastXf = null;

  var K_TRUE = S.K_ASSUMED;            // the sim's spring; the drawer says so
  var PULL_MAX_CM = 2.5;

  function addedG() { return sum(onHanger); }
  function totalG() { return hangerOn ? hangerG + addedG() : 0; }
  function markEqCm() { return (x0 === null ? S.X0_CM : x0) + S.elongationCm(totalG(), K_TRUE); }
  function T_eff() {
    return mode === "fun"
      ? S.periodWithSpringMass(totalG(), K_TRUE)
      : S.period(totalG(), K_TRUE);
  }
  function kUsed() {
    var k = S.kAverage([50, 100, 150, 200, 250].map(function (a) {
      return rowsA[a] && rowsA[a].k; }).filter(isFinite));
    return isFinite(k) ? k : K_TRUE;
  }

  // ---------- persistence ----------
  function saveState() {
    LS.store.save(LAB, "state", ["state"], [[JSON.stringify({
      hangerG: hangerG, hangerOn: hangerOn, x0: x0, onHanger: onHanger,
      tray: tray, rowsA: rowsA, rowsB: rowsB, studentSlope: studentSlope
    })]]);
    LS.store.save(LAB, "tables", CSV_HEADER_A, csvRows());
  }
  function loadState() {
    try {
      var got = LS.store.load(LAB, "state");
      if (!got || !got.rows || !got.rows.length) return;
      var st = JSON.parse(got.rows[0][0]);
      hangerG = st.hangerG; hangerOn = st.hangerOn; x0 = st.x0;
      onHanger = st.onHanger; tray = st.tray;
      rowsA = st.rowsA || {}; rowsB = st.rowsB || {};
      studentSlope = st.studentSlope;
    } catch (e) {}
  }

  // ---------- readouts ----------
  function noteNow() {
    if (flash && Date.now() < flash.until) return flash.text;
    if (timing) return "timing - " + cyclesNow() + " of 10 passes marked" +
      (mode === "ideal" ? " (the clock stops itself)" : " - press Stop at the tenth");
    if (osc) return "oscillating - press Start 10-cycle timing when ready";
    if (x0 === null) return "capture x0 first (hanger off)";
    if (!hangerOn) return "hang the hanger, then press Read x_f for the baseline";
    if (addedG() === 0) return "hanger on, no weights - press Read x_f for the baseline row";
    if (!isKRow(addedG())) return "that load is not a Table 1 row - use 50 g steps up to 250 g";
    return "settled - press Read x_f";
  }
  function cyclesNow() {
    if (!timing || !osc) return 0;
    return Math.max(0, Math.floor((Date.now() - timing.startWall) / (osc.T * 1000)));
  }
  function isKRow(a) { return [0, 50, 100, 150, 200, 250].indexOf(a) >= 0; }
  function isTRow(a) { return [200, 220, 240].indexOf(a) >= 0; }
  function refreshReadouts() {
    var xfNow = markEqCm() + (osc ? 0 : pull);
    $("xfRead").textContent = fmt(xfNow, 2) + " cm" +
      (osc ? "  (mid-oscillation)" : "");
    $("x0Read").textContent = (x0 === null ? "not captured" : fmt(x0, 2) + " cm") +
      "   x = " + (x0 !== null ? fmt(xfNow - x0, 2) + " cm" : "-");
    $("loadRead").textContent = hangerOn
      ? "hanger " + hangerG + " g + " + addedG() + " g = " + totalG() + " g total"
      : "hanger off";
    var kAvg = S.kAverage(Object.keys(rowsA).map(function (a) {
      return rowsA[a] && rowsA[a].k; }).filter(isFinite));
    $("kRead").textContent = (isFinite(kAvg) ? fmt(kAvg, 1) : "-") + "  /  " +
      (studentSlope !== null ? fmt(studentSlope, 1) : "- (drag the red handle)");
    $("cycleRead").textContent = timing ? cyclesNow() + " of 10" :
      (osc ? "0 of 10 (not started)" : "-");
    $("markX0").disabled = hangerOn || !!osc;
    $("readXf").disabled = !hangerOn || x0 === null || !!osc || !isKRow(addedG()) ||
      totalG() > S.MAX_LOAD_G;
    $("startTiming").disabled = !hangerOn || !!timing || !isTRow(addedG());
    $("stopTiming").disabled = !timing || mode === "ideal";
    $("retimeBtn").disabled = !timing && !rowsB[addedG()];
    $("noteRead").textContent = noteNow();
  }

  // ---------- drawing ----------
  function geom() {
    var w = cv.width / dpr;
    return { w: w, cx: Math.max(120, w * 0.30), scale: Math.max(w * 0.52, 240) };
  }
  function yForCm(cm) { return SCALE_TOP + cm * PX_CM; }
  function drawSpring(cx2, topY, botY) {
    var coils = 12, lead = 10;
    cx2.strokeStyle = "#c8d2e0"; cx2.lineWidth = 2;
    cx2.beginPath(); cx2.moveTo(cx2, topY); cx2.lineTo(cx2, topY + lead);
    var span = botY - topY - lead * 2;
    for (var i = 0; i < coils; i++) {
      var y0 = topY + lead + span * (i / coils);
      var y1 = topY + lead + span * ((i + 0.5) / coils);
      var y2 = topY + lead + span * ((i + 1) / coils);
      cx2.lineTo(cx2 + 12, y1);
      cx2.lineTo(cx2 - 12, y2);
    }
    cx2.lineTo(cx2, botY);
    cx2.stroke();
  }
  function drawChip(x, y, g, wdt, hgt, dim) {
    cx.fillStyle = dim ? "#8d9cb5" : "#b4c0d2";
    cx.fillRect(x - wdt / 2, y, wdt, hgt);
    cx.strokeStyle = dim ? "#6d7d99" : "#7d8ea6"; cx.lineWidth = 1;
    cx.strokeRect(x - wdt / 2, y, wdt, hgt);
    cx.fillStyle = "#1c2434"; cx.font = "9px ui-monospace, monospace";
    cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillText(String(g), x, y + hgt / 2 + 0.5);
  }
  function traySlots(g2) {
    var out = [];
    for (var i = 0; i < 10; i++) {
      out.push({ x: g2.w * 0.68 + 10 + (i % 5) * 38, y: 60 + Math.floor(i / 5) * 30 });
    }
    return out;
  }
  function drawBench() {
    var g = geom(), w = g.w;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, w, 460);
    cx.fillStyle = "#0d1526"; cx.fillRect(0, 0, w, 460);

    // stand: top bar, upright, base
    cx.fillStyle = "#23324e";
    cx.fillRect(40, TOP_BAR - 8, w - 80, 10);
    cx.fillRect(50, 438, w - 100, 10);
    cx.strokeStyle = "#3a4d74"; cx.lineWidth = 6;
    cx.beginPath(); cx.moveTo(g.scale + 60, TOP_BAR); cx.lineTo(g.scale + 60, 438); cx.stroke();

    // scale + mirror strip
    var sx = g.scale;
    cx.fillStyle = "#efe0bb"; cx.fillRect(sx, SCALE_TOP, 16, 13 * PX_CM);
    cx.strokeStyle = "#b99e6b"; cx.lineWidth = 1;
    cx.strokeRect(sx, SCALE_TOP, 16, 13 * PX_CM);
    cx.font = "9.5px ui-monospace, monospace"; cx.textAlign = "left"; cx.textBaseline = "middle";
    for (var cm = 0; cm <= 13; cm++) {
      var y = yForCm(cm);
      cx.strokeStyle = "#3a3a3a"; cx.lineWidth = cm % 5 === 0 ? 1 : 0.5;
      cx.beginPath(); cx.moveTo(sx + 16, y); cx.lineTo(sx + 16 - (cm % 5 === 0 ? 10 : 5), y); cx.stroke();
      if (cm % 2 === 0) {
        cx.fillStyle = "#222";
        cx.fillText(String(cm), sx + 18, y);
      }
    }
    cx.fillStyle = "#9fb4d8"; cx.font = "10px system-ui, sans-serif";
    cx.fillText("cm", sx + 18, SCALE_TOP - 10);
    // mirror
    cx.fillStyle = "#39415a";
    cx.fillRect(sx + 34, SCALE_TOP, 14, 13 * PX_CM);
    cx.strokeStyle = "#5d6b8f"; cx.strokeRect(sx + 34, SCALE_TOP, 14, 13 * PX_CM);

    // mark position
    var markCm = markEqCm() + pull;
    if (osc) {
      var ph = (Date.now() - osc.t0) / (osc.T * 1000);
      markCm = markEqCm() + osc.A * Math.cos(2 * Math.PI * ph);
    }
    var my = yForCm(markCm);

    // x0 line
    if (x0 !== null) {
      cx.strokeStyle = "#ffd166"; cx.setLineDash([5, 4]); cx.lineWidth = 1.4;
      cx.beginPath(); cx.moveTo(g.cx - 20, yForCm(x0)); cx.lineTo(sx + 48, yForCm(x0)); cx.stroke();
      cx.setLineDash([]);
      cx.fillStyle = "#ffd166"; cx.font = "10px ui-monospace, monospace"; cx.textAlign = "right";
      cx.fillText("x0 = " + fmt(x0, 2) + " cm (captured)", g.cx - 26, yForCm(x0) - 6);
    }

    // spring, hook, mark
    drawSpring(g.cx, TOP_BAR, my - 6);
    cx.strokeStyle = "#e8eefb"; cx.lineWidth = 2;
    cx.beginPath(); cx.moveTo(g.cx, my - 6); cx.lineTo(g.cx, my); cx.stroke();
    // the read mark: an orange chevron on the spring's bottom end
    cx.fillStyle = "#ff8c42";
    cx.beginPath();
    cx.moveTo(g.cx - 9, my - 7); cx.lineTo(g.cx, my); cx.lineTo(g.cx + 9, my - 7);
    cx.lineTo(g.cx + 9, my - 3); cx.lineTo(g.cx, my + 4); cx.lineTo(g.cx - 9, my - 3);
    cx.closePath(); cx.fill();
    // level line to the mirror, and the mirror image
    cx.strokeStyle = "rgba(255,140,66,0.85)"; cx.setLineDash([3, 3]); cx.lineWidth = 1.2;
    cx.beginPath(); cx.moveTo(g.cx + 12, my); cx.lineTo(sx + 48, my); cx.stroke();
    cx.setLineDash([]);
    cx.fillStyle = "rgba(255,140,66,0.55)";
    cx.beginPath();
    cx.moveTo(sx + 48, my - 5); cx.lineTo(sx + 41, my); cx.lineTo(sx + 48, my + 5);
    cx.closePath(); cx.fill();
    // the eye, level with the mark
    var ex = sx + 62;
    cx.fillStyle = "#dce6f5";
    cx.beginPath(); cx.ellipse(ex, my, 9, 5, 0, 0, 6.29); cx.fill();
    cx.fillStyle = "#1c2434";
    cx.beginPath(); cx.arc(ex, my, 2.4, 0, 6.29); cx.fill();
    cx.fillStyle = "#9fb4d8"; cx.font = "9.5px system-ui, sans-serif"; cx.textAlign = "left";
    cx.fillText("line the mark with its mirror image", ex - 40, my + 16);
    // the mark reading
    cx.fillStyle = "#ff8c42"; cx.font = "11px ui-monospace, monospace"; cx.textAlign = "right";
    cx.fillText("x_f = " + fmt(markCm, 2) + " cm", g.cx - 16, my + 14);

    // hanger + weights
    if (hangerOn) {
      cx.fillStyle = "#8fa3c4";
      cx.fillRect(g.cx - 26, my + 6, 52, 9);
      cx.strokeStyle = "#dce6f5"; cx.lineWidth = 1.2;
      cx.strokeRect(g.cx - 26, my + 6, 52, 9);
      for (var i = 0; i < onHanger.length; i++) {
        drawChip(g.cx, my + 15 + i * 12, onHanger[i], 44, 10);
      }
      cx.fillStyle = "#9fb4d8"; cx.font = "10px system-ui, sans-serif"; cx.textAlign = "center";
      cx.fillText("hanger " + hangerG + " g + " + addedG() + " g", g.cx, my + 15 + onHanger.length * 12 + 14);
    }

    // tray
    var slots = traySlots(g);
    cx.fillStyle = "#23324e";
    cx.fillRect(g.w * 0.68, 44, 5 * 38 + 14, 74);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1;
    cx.strokeRect(g.w * 0.68, 44, 5 * 38 + 14, 74);
    cx.fillStyle = "#9fb4d8"; cx.font = "9.5px system-ui, sans-serif";
    cx.textAlign = "left"; cx.textBaseline = "top";
    cx.fillText("weights - drag onto the hanger", g.w * 0.68 + 4, 34);
    slots.forEach(function (sl, i) {
      if (i < tray.length) drawChip(sl.x + 15, sl.y, tray[i], 30, 18);
    });

    // status
    cx.fillStyle = "#cfd6e4"; cx.font = "12px system-ui, sans-serif";
    cx.textAlign = "left"; cx.textBaseline = "alphabetic";
    cx.fillText(noteNow(), 10, 456);
  }

  // ---------- tables ----------
  var CSV_HEADER_A = ["added mass (g)", "total mass (g)", "total mass (kg)", "F (N)",
    "x_f (cm)", "x (cm)", "x (m)", "K (N/m)"];
  var HEADER_B = ["added mass (g)", "total (g)", "total (kg)", "t10 (s)",
    "T measured (s)", "T theory (s)", "% difference in T"];
  function rowA(a) {
    var t = hangerG + a;
    var r = rowsA[a] || null;
    var row = [String(a), String(t), fmt(t / 1000, 3), fmt(S.force(t), 3)];
    if (r) {
      row.push(fmt(r.xf, 2), fmt(r.x, 2), fmt(r.x / 100, 4), fmt(r.k, 1));
    } else {
      row.push("-", "-", "-", "-");
    }
    return row;
  }
  function tableARows() {
    var rows = rowA(0); rows[0] = "0 (hanger only)";
    [50, 100, 150, 200, 250].forEach(function (a) { rows.push(rowA(a)); });
    var kAvg = S.kAverage([50, 100, 150, 200, 250].map(function (a) {
      return rowsA[a] && rowsA[a].k; }).filter(isFinite));
    rows.push(["K_average (N/m)", isFinite(kAvg) ? fmt(kAvg, 1) : "-", "-", "",
      "", "", "", isFinite(kAvg) ? fmt(kAvg, 1) : "-"]);
    rows.push(["K from trendline slope (N/m)", studentSlope !== null ? fmt(studentSlope, 1) : "-",
      "-", "", "", "", "", studentSlope !== null ? fmt(studentSlope, 1) : "-"]);
    var rd = S.kRelDiff(isFinite(kAvg) ? kAvg : NaN, studentSlope);
    rows.push(["% relative difference (on the slope)",
      isFinite(rd) ? fmt(rd, 1) + " %" : "-", "", "", "", "", "",
      isFinite(rd) ? fmt(rd, 1) + " %" : "-"]);
    return rows;
  }
  function rowB(a) {
    var t = hangerG + a;
    var r = rowsB[a] || null;
    var row = [String(a), String(t), fmt(t / 1000, 3)];
    if (r) {
      var Tm = r.t10 / 10;
      var Tt = S.period(t, kUsed());
      row.push(fmt(r.t10, 2), fmt(Tm, 3), fmt(Tt, 3),
        fmt(S.tPctDiff(Tm, Tt), 1) + " %");
    } else {
      row.push("-", "-", "-", "-");
    }
    return row;
  }
  function tableBRows() {
    var rows = [rowB(200), rowB(220), rowB(240)];
    var fCell = "-";
    if (rowsB[200]) fCell = fmt(1 / (rowsB[200].t10 / 10), 2) + " Hz";
    rows.push(["f at 200 g added (Hz)", fCell, "", "", "", "", ""]);
    return rows;
  }
  function renderTables() {
    $("tableA").innerHTML =
      "<p class='muted' style='margin:2px 0'>Table 1 header: hanger mass " + hangerG +
      " g &nbsp; g = 9.80 m/s&sup2; &nbsp; x&#8320; = " +
      (x0 === null ? "not captured" : fmt(x0, 2) + " cm") + "</p>" +
      LS.store.tableHTML(CSV_HEADER_A, tableARows());
    $("tableB").innerHTML =
      "<p class='muted' style='margin:2px 0'>Table 2 header: hanger mass " + hangerG +
      " g &nbsp; (T theory uses your K_average" +
      (isFinite(S.kAverage([50, 100, 150, 200, 250].map(function (a) {
        return rowsA[a] && rowsA[a].k; }).filter(isFinite))) ? "" :
        "; run Bench A first, it uses the drawer K = 50 N/m") + ")</p>" +
      LS.store.tableHTML(HEADER_B, tableBRows());
    renderWorkBox();
  }
  function renderWorkBox() {
    var lines = ["g = 9.80 m/s^2, pi = 3.14 (course values, both printed); K of this sim's spring = " +
      K_TRUE + " N/m (drawer value)",
      "Table 1: K row = F / x with x = x_f - x0; K_average = the mean of the 50-250 g rows; the % difference uses the trendline slope as its denominator",
      ""];
    [0, 50, 100, 150, 200, 250].forEach(function (a) {
      var r = rowsA[a];
      if (!r) return;
      lines.push("added " + a + " g: total " + (hangerG + a) + " g, F = " +
        fmt(S.force(hangerG + a), 3) + " N, x_f = " + fmt(r.xf, 2) +
        " cm, x = " + fmt(r.x, 2) + " cm, K = " + fmt(r.k, 1) + " N/m");
    });
    var kAvg = S.kAverage([50, 100, 150, 200, 250].map(function (a) {
      return rowsA[a] && rowsA[a].k; }).filter(isFinite));
    if (isFinite(kAvg)) {
      lines.push("K_average = " + fmt(kAvg, 1) + " N/m" +
        (studentSlope !== null ? ", trendline K = " + fmt(studentSlope, 1) +
          " N/m, % relative difference = " + fmt(S.kRelDiff(kAvg, studentSlope), 1) + " %" : ""));
    }
    lines.push("");
    [200, 220, 240].forEach(function (a) {
      if (!rowsB[a]) return;
      var Tm = rowsB[a].t10 / 10, Tt = S.period(hangerG + a, kUsed());
      lines.push("added " + a + " g: t10 = " + fmt(rowsB[a].t10, 2) + " s, T measured = " +
        fmt(Tm, 3) + " s, T theory = " + fmt(Tt, 3) + " s (K used = " + fmt(kUsed(), 1) +
        " N/m), % difference = " + fmt(S.tPctDiff(Tm, Tt), 1) + " %");
    });
    if (mode === "fun") {
      lines.push("");
      lines.push("Fun Mode: the coil's 75 g rides along (about " +
        fmt(S.springMassStretchPct(250, K_TRUE), 1) + " % longer T at 250 g total) - a few percent long is correct behaviour");
    }
    $("workBox").textContent = lines.join("\n");
  }

  // ---------- the graph ----------
  var plot = PLOT.create($("fxPlot"), {
    xLabel: "x (m)", yLabel: "F (N)", xMax: 0.065, yMax: 2.8
  });
  function plotPoints() {
    var pts = [[0, 0]];
    [0, 50, 100, 150, 200, 250].forEach(function (a) {
      var r = rowsA[a];
      if (r) pts.push([r.x / 100, S.force(hangerG + a)]);
    });
    plot.setPoints(pts);
    var rec = pts.slice(1);
    if (rec.length >= 2) {
      var fit = FIT.throughOrigin(rec.map(function (p) { return p[0]; }),
        rec.map(function (p) { return p[1]; }));
      if (fit) plot.setFitLine(fit.slope, 0, "computer fit (through origin)");
    }
    if (studentSlope !== null) plot.setStudentSlope(studentSlope, 0);
  }
  plot.onSlope = function (s) {
    studentSlope = s;
    refreshReadouts(); renderTables();
  };

  // ---------- Bench A actions ----------
  $("hangerBtn").addEventListener("click", function () {
    if (osc || timing) return;
    hangerOn = true;
    flash = { text: "hanger on - the mark settles, then press Read x_f", until: Date.now() + 3000 };
    refreshReadouts(); renderTables(); drawBench();
    saveState();
  });
  $("takeOffBtn").addEventListener("click", function () {
    if (osc || timing) return;
    hangerOn = false;
    tray = tray.concat(onHanger); onHanger = [];
    pull = 0;
    flash = { text: "hanger off - press Mark x0 for the no-load level", until: Date.now() + 3000 };
    refreshReadouts(); renderTables(); drawBench();
    saveState();
  });
  $("markX0").addEventListener("click", function () {
    if (hangerOn || osc) return;
    x0 = S.X0_CM;
    flash = { text: "x0 captured: " + fmt(x0, 2) + " cm - now hang the hanger",
      until: Date.now() + 3500 };
    refreshReadouts(); renderTables(); drawBench();
    saveState();
  });
  $("readXf").addEventListener("click", function () {
    if (!hangerOn || x0 === null || osc || !isKRow(addedG())) return;
    var a = addedG(), t = totalG();
    var xf = markEqCm() + (mode === "fun" ? rand(-S.READ_JITTER_CM, S.READ_JITTER_CM) : 0);
    xf = Math.round(xf * 100) / 100;
    var x = xf - x0;
    rowsA[a] = { xf: xf, x: x, k: S.hookK(t, x) };
    lastXf = xf;
    flash = { text: "row " + a + " g read: x_f = " + fmt(xf, 2) + " cm, x = " +
      fmt(x, 2) + " cm, K = " + fmt(rowsA[a].k, 1) + " N/m", until: Date.now() + 3500 };
    refreshReadouts(); renderTables(); plotPoints(); drawBench();
    saveState();
  });

  // ---------- Bench B actions ----------
  function startOsc(A) {
    osc = { t0: Date.now(), T: T_eff(), A: A };
    refreshReadouts();
  }
  $("startTiming").addEventListener("click", function () {
    if (!hangerOn || timing || !isTRow(addedG())) return;
    if (!osc) {
      flash = { text: "pull the hanger down and let go first", until: Date.now() + 2500 };
      refreshReadouts();
      return;
    }
    timing = { startWall: Date.now(), slip: 0 };
    if (mode === "fun") timing.slip = rand(0, S.STOP_SLIP_S);
    flash = null;
    refreshReadouts();
  });
  function stopTiming(manual) {
    if (!timing) return;
    var a = addedG();
    var t10 = (Date.now() - timing.startWall) / 1000 + timing.slip;
    var cycles = cyclesNow();
    if (a && rowsB) rowsB[a] = { t10: Math.max(0.1, t10) };
    var Tm = t10 / 10, Tt = S.period(hangerG + a, kUsed());
    flash = { text: "ten-cycle time " + fmt(t10, 2) + " s at " + a + " g added" +
      (cycles < 10 ? " - you stopped at pass " + cycles + ", re-time if that surprised you"
        : "") + ", % difference " + fmt(S.tPctDiff(Tm, Tt), 1) + " %",
      until: Date.now() + 5000 };
    timing = null;
    refreshReadouts(); renderTables(); drawBench();
    saveState();
  }
  $("stopTiming").addEventListener("click", function () { stopTiming(true); });
  $("retimeBtn").addEventListener("click", function () {
    if (timing) {
      timing = null;
      flash = { text: "timing cancelled - start again", until: Date.now() + 2500 };
    } else {
      var a = addedG();
      if (rowsB[a]) {
        delete rowsB[a];
        flash = { text: "the " + a + " g timing is cleared - re-time it", until: Date.now() + 2500 };
      }
    }
    refreshReadouts(); renderTables(); drawBench();
    saveState();
  });

  // ---------- controls: clear / export / hanger mass ----------
  $("hangerMass").addEventListener("change", function () {
    var v = Math.max(0, parseFloat(this.value) || 0);
    this.value = v;
    hangerG = v;
    refreshReadouts(); renderTables(); plotPoints(); drawBench();
    saveState();
  });
  $("clearTable").addEventListener("click", function () {
    rowsA = {}; rowsB = {}; x0 = null; studentSlope = null;
    hangerOn = false; tray = tray.concat(onHanger); onHanger = [];
    osc = null; timing = null; pull = 0;
    LS.store.clear(LAB, "tables");
    saveState();
    plotPoints();
    $("csvCopy").style.display = "none";
    flash = { text: "tables cleared", until: Date.now() + 2000 };
    refreshReadouts(); renderTables(); drawBench();
  });
  $("exportLog").addEventListener("click", function () {
    LS.store.exportCSV("phy110-lab5-spring.csv", CSV_HEADER_A, csvRows(), $("csvCopy"));
  });
  function csvRows() {
    var rows = [];
    rows.push(["Table 1 - K (hanger " + hangerG + " g, x0 " +
      (x0 === null ? "not captured" : fmt(x0, 2)) + " cm)"]);
    rows = rows.concat(tableARows());
    rows.push([]);
    rows.push(["Table 2 - periods (hanger " + hangerG + " g)"]);
    rows.push(HEADER_B);
    rows = rows.concat(tableBRows());
    return rows;
  }

  // ---------- dragging ----------
  var drag = null;
  function weightAt(x, y) {
    var g2 = geom();
    for (var i = onHanger.length - 1; i >= 0; i--) {
      var wy = yForCm(markEqCm()) + 15 + i * 12;
      if (Math.abs(x - g2.cx) < 26 && y > wy - 3 && y < wy + 13) {
        return { kind: "w", from: "hanger", idx: i, g: onHanger[i] };
      }
    }
    var slots = traySlots(g2);
    for (var j = 0; j < tray.length; j++) {
      var sl = slots[j];
      if (x > sl.x && x < sl.x + 32 && y > sl.y - 4 && y < sl.y + 24) {
        return { kind: "w", from: "tray", idx: j, g: tray[j] };
      }
    }
    return null;
  }
  function hangerAt(x, y) {
    var g2 = geom();
    if (!hangerOn || osc || timing) return false;
    var my = yForCm(markEqCm() + pull);
    return Math.abs(x - g2.cx) < 34 && y > my - 10 && y < my + 20 + onHanger.length * 12;
  }
  cv.addEventListener("pointerdown", function (ev) {
    var r = cv.getBoundingClientRect();
    var x = ev.clientX - r.left, y = ev.clientY - r.top;
    if (hangerAt(x, y)) {
      drag = { kind: "hanger" };
      cv.setPointerCapture(ev.pointerId);
      return;
    }
    var w = weightAt(x, y);
    if (w && !osc && !timing) {
      drag = w;
      cv.setPointerCapture(ev.pointerId);
    }
  });
  cv.addEventListener("pointermove", function (ev) {
    if (!drag) return;
    var r = cv.getBoundingClientRect();
    var x = ev.clientX - r.left, y = ev.clientY - r.top;
    if (drag.kind === "hanger") {
      pull = U.clamp((y - yForCm(markEqCm())) / PX_CM, 0, PULL_MAX_CM);
      drawBench();
    } else {
      drag.x = x; drag.y = y;
      drawBench();
      cx.fillStyle = "rgba(255,140,66,0.9)";
      cx.fillRect(x - 15, y - 9, 30, 18);
    }
  });
  cv.addEventListener("pointerup", function (ev) {
    if (!drag) return;
    var r = cv.getBoundingClientRect();
    var x = ev.clientX - r.left, y = ev.clientY - r.top;
    if (drag.kind === "hanger") {
      if (pull > 0.3) {
        startOsc(pull);
        flash = { text: "released - it turns over, press Start 10-cycle timing",
          until: Date.now() + 3000 };
      }
      pull = 0;
      refreshReadouts(); drawBench();
    } else {
      var overHanger = hangerOn && Math.abs(x - geom().cx) < 40 &&
        y > yForCm(markEqCm()) - 6;
      var overTray = y < 124 && x > geom().w * 0.68 - 6;
      if (drag.from === "hanger" && (overTray || !overHanger)) {
        onHanger.splice(drag.idx, 1); tray.push(drag.g);
      } else if (drag.from === "tray" && overHanger) {
        if (hangerOn && totalG() + drag.g > S.MAX_LOAD_G) {
          flash = { text: "past the " + S.MAX_LOAD_G + " g safe load - take a weight off first",
            until: Date.now() + 3000 };
        } else {
          tray.splice(drag.idx, 1); onHanger.push(drag.g);
        }
      }
      refreshReadouts(); renderTables(); plotPoints(); drawBench();
      saveState();
    }
    drag = null;
    drawBench();
  });
  cv.addEventListener("pointercancel", function () { drag = null; pull = 0; drawBench(); });

  // ---------- boot ----------
  function resizeStages() {
    var w = Math.round(Math.max(380, (cv.clientWidth || 480)) * dpr);
    cv.width = w; cv.height = Math.round(460 * dpr);
    drawBench();
  }
  window.addEventListener("resize", resizeStages);

  setInterval(function () {
    if (osc) {
      if (timing && mode === "ideal") {
        var done = (Date.now() - timing.startWall) / (osc.T * 1000);
        if (done >= S.CYCLE_COUNT) { stopTiming(false); return; }
      }
      if (flash && Date.now() >= flash.until) {
        flash = null; refreshReadouts();
      }
      drawBench();
      if (timing) $("oscRead").textContent = fmt((Date.now() - timing.startWall) / 1000, 2) + " s";
    } else if (flash && Date.now() >= flash.until) {
      flash = null; refreshReadouts(); drawBench();
    } else if (!$("oscRead").textContent || $("oscRead").textContent === "-") {
      $("oscRead").textContent = "-";
    }
    if (timing) $("cycleRead").textContent = cyclesNow() + " of 10";
  }, 40);

  loadState();
  $("hangerMass").value = hangerG;
  $("oscRead").textContent = "-";

  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (m) {
    mode = m;
    if (osc) osc.T = T_eff();
    refreshReadouts();
  });
  LS.check.init(LAB);
  refreshReadouts();
  renderTables();
  plotPoints();
  resizeStages();
})();
