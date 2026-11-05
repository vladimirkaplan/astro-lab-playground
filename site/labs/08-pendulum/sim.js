// Lab 8 sim: pendulum stopwatch runs, data table, T^2-vs-L plot with a
// draggable slope handle, and the g readout.
//
// Timing model: the period used for gates and runs is the exact large-angle
// period from pendulum.js. The animation is the closed-form sine, so the
// stopwatch, the gate flashes, and the bob can never disagree. Fun Mode adds
// a human thumb: 0.05-0.35 s of extra reaction land on the recorded total.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units, P = LS.pendulum;
  var LAB = "08-pendulum";
  var mode = LS.ui.getMode(LAB);
  var G = P.G_SIM;
  var $ = function (id) { return document.getElementById(id); };

  var state = { Lcm: 55, ampDeg: 12, N: 15 };
  var u = 0;                       // seconds since current release (model time)
  var run = null;                  // {total, N, gates, flashAt, rs}
  var rows = [];                   // finished measurements
  var byLen = {};                  // Lcm -> latest measured T
  var rnd = U.mulberry32(Date.now() % 1e9);
  var lastCross = 0;

  function T() { return P.period(state.Lcm / 100, G, state.ampDeg); }

  // ---------- stage drawing ----------
  var stage = $("stage");
  var sctx = stage.getContext("2d");
  var dpr = window.devicePixelRatio || 1;
  var STAGE_H = 380;

  function drawStage(now) {
    var w = stage.width / dpr, h = STAGE_H;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, w, h);
    sctx.fillStyle = "#0d1526";
    sctx.fillRect(0, 0, w, h);

    var cx = Math.round(w / 2), top = 34;
    var scale = Math.min(h - 105, w * 0.42);        // px for 1.00 m
    var Lpx = state.Lcm / 100 * scale;
    var th = state.ampDeg * Math.PI / 180 * Math.cos(2 * Math.PI * u / T());

    // release zone arc
    sctx.strokeStyle = "rgba(255,255,255,.16)";
    sctx.lineWidth = 2;
    sctx.beginPath();
    sctx.arc(cx, top, Lpx, Math.PI / 2 - state.ampDeg * Math.PI / 180, Math.PI / 2 + state.ampDeg * Math.PI / 180);
    sctx.stroke();

    // dashed plumb line
    sctx.strokeStyle = "rgba(255,255,255,.25)";
    sctx.setLineDash([4, 5]);
    sctx.beginPath(); sctx.moveTo(cx, top); sctx.lineTo(cx, top + Lpx + 24); sctx.stroke();
    sctx.setLineDash([]);

    // length ruler on the left with the four course presets
    var rx = 30;
    sctx.strokeStyle = "#5b7099"; sctx.lineWidth = 1.5;
    sctx.beginPath(); sctx.moveTo(rx, top); sctx.lineTo(rx, top + scale); sctx.stroke();
    sctx.font = "10.5px system-ui, sans-serif";
    sctx.textAlign = "left"; sctx.textBaseline = "middle";
    [30, 55, 75, 100].forEach(function (Lc) {
      var y = top + Lc / 100 * scale;
      sctx.beginPath(); sctx.moveTo(rx - 5, y); sctx.lineTo(rx + 5, y); sctx.stroke();
      sctx.fillStyle = Lc === state.Lcm ? "#ffd76e" : "#8fa4c9";
      sctx.fillText(Lc + " cm", rx + 8, y);
    });

    // the string and bob
    var bx = cx + Lpx * Math.sin(th), by = top + Lpx * Math.cos(th);
    sctx.strokeStyle = "#cdd8ee"; sctx.lineWidth = 2;
    sctx.beginPath(); sctx.moveTo(cx, top); sctx.lineTo(bx, by); sctx.stroke();
    sctx.fillStyle = "#33507f";
    sctx.strokeStyle = "#a9c2ea"; sctx.lineWidth = 2;
    sctx.beginPath(); sctx.arc(bx, by, 13, 0, Math.PI * 2); sctx.fill(); sctx.stroke();

    // gate flash: the bob just completed a full swing
    if (run && run.flashAt && now - run.flashAt < 220) {
      var k = 1 - (now - run.flashAt) / 220;
      sctx.strokeStyle = "rgba(126,231,135," + (0.9 * k).toFixed(2) + ")";
      sctx.lineWidth = 3;
      sctx.beginPath(); sctx.arc(bx, by, 16 + 8 * (1 - k), 0, Math.PI * 2); sctx.stroke();
    }

    // ceiling mount
    sctx.fillStyle = "#41577f";
    sctx.fillRect(cx - 46, top - 12, 92, 10);

    // readouts on canvas
    sctx.fillStyle = "#93a7cd"; sctx.font = "11.5px system-ui, sans-serif";
    sctx.textAlign = "left"; sctx.textBaseline = "top";
    sctx.fillText("L = " + state.Lcm + " cm   release angle = " + state.ampDeg + " deg", 52, h - 22);
    if (run) {
      sctx.textAlign = "right";
      sctx.fillText("swing " + run.gates + " / " + run.N, w - 12, h - 22);
    } else {
      sctx.textAlign = "right";
      sctx.fillText("free swing - press Start to time", w - 12, h - 22);
    }
  }

  // ---------- measurement flow ----------
  function startRun() {
    if (run) return;
    u = 0; lastCross = 0;
    var rs = mode === "fun" ? 0.05 + rnd() * 0.30 : 0;
    run = { total: T() * state.N + rs, N: state.N, gates: 0, rs: rs, flashAt: 0 };
    $("startBtn").disabled = true;
    $("gateNote").textContent = mode === "fun"
      ? "Fun Mode: gates track the pendulum; your recorded total carries 0-0.35 s of thumb."
      : "Ideal Mode: the clock stops exactly on gate " + state.N + ".";
  }

  function finishRun() {
    var total = run.total, N = run.N, rs = run.rs;
    var Tm = total / N;
    rows.push([state.Lcm, state.ampDeg, N, total.toFixed(2), Tm.toFixed(3), (Tm * Tm).toFixed(3),
      rs ? "+" + rs.toFixed(2) + " s thumb" : "0"]);
    byLen[state.Lcm] = Tm;
    run = null;
    $("startBtn").disabled = false;
    $("measured").textContent = Tm.toFixed(3) + " s  (total " + total.toFixed(2) + " s / " + N + ")";
    persist();
    renderTable();
    refreshPlot();
  }

  // ---------- table + persistence ----------
  var HEADER = ["length_cm", "angle_deg", "swings_N", "total_s", "T_s", "T2_s2", "note"];

  function persist() { LS.store.save(LAB, "runs", HEADER, rows); }

  function renderTable() {
    if (!rows.length) { $("dataTable").innerHTML = "<p class='muted'>No runs yet.</p>"; return; }
    $("dataTable").innerHTML = LS.store.tableHTML(
      ["L (cm)", "angle (deg)", "N", "total (s)", "T (s)", "T^2 (s^2)", "reaction"],
      rows);
  }
  try {
    var saved = LS.store.load(LAB, "runs");
    if (saved && saved.rows) {
      rows = saved.rows;
      rows.forEach(function (r) { byLen[+r[0]] = parseFloat(r[4]); });
    }
  } catch (e) {}

  // ---------- plot + g ----------
  var plot = LS.plot.create($("plot"), {
    xLabel: "length L, m", yLabel: "measured T^2, s^2", xMin: 0, yMin: 0
  });
  plot.onSlope = function (s) {
    $("slopeIn").value = U.round(s, 3);
    readG();
  };
  $("slopeIn").addEventListener("change", function (e) {
    var v = LS.check.parseNumber(e.target.value);
    if (isFinite(v) && v > 0) { plot.setStudentSlope(v); readG(); }
  });
  $("compFit").addEventListener("click", function () {
    var pts = plot.points();
    if (pts.length < 2) return;
    var f = LS.fit.throughOrigin(pts.map(function (p) { return p[0]; }), pts.map(function (p) { return p[1]; }));
    if (f) {
      plot.setFitLine(f.slope, 0, "computer fit: slope " + U.round(f.slope, 3));
      plot.setStudentSlope(f.slope);
      $("slopeIn").value = U.round(f.slope, 3);
    }
    readG();
  });

  function refreshPlot() {
    var pts = Object.keys(byLen).map(function (k) {
      return [+k / 100, byLen[k] * byLen[k]];
    }).sort(function (a, b) { return a[0] - b[0]; });
    plot.setPoints(pts);
    var ymax = 4.6;
    pts.forEach(function (p) { if (p[1] * 1.12 > ymax) ymax = p[1] * 1.12; });
    plot.fitRange(1.15, ymax);
  }
  if (!plot.studentSlope()) { plot.setStudentSlope(3.9); $("slopeIn").value = "3.9"; }

  function readG() {
    var s = plot.studentSlope();
    if (s === null) return;
    var g = P.gFromSlope(s);
    var pe = (g - 9.8) / 9.8 * 100;
    $("gRead").textContent = "g = 4*pi^2/" + s.toFixed(3) + " = " + g.toFixed(2) +
      " m/s^2   vs 9.8: " + (pe >= 0 ? "+" : "") + pe.toFixed(1) + "%" +
      "   (sim bench: 9.806)";
  }
  readG();

  // ---------- controls ----------
  $("lenSel").addEventListener("change", function (e) {
    state.Lcm = parseInt(e.target.value, 10);
    u = 0;
    readoutPredict();
  });
  $("nSel").addEventListener("change", function (e) { state.N = parseInt(e.target.value, 10); });
  $("ampRange").addEventListener("input", function (e) {
    state.ampDeg = parseInt(e.target.value, 10);
    $("ampRead").textContent = String(state.ampDeg);
    u = 0;
    readoutPredict();
  });
  $("startBtn").addEventListener("click", startRun);
  $("clearTable").addEventListener("click", function () {
    rows = []; byLen = {};
    LS.store.clear(LAB, "runs");
    renderTable();
    refreshPlot();
    $("measured").textContent = "-";
  });
  $("exportCsv").addEventListener("click", function () {
    LS.store.exportCSV("lab08-pendulum-runs.csv", HEADER, rows, $("csvCopy"));
  });

  function readoutPredict() {
    $("predict").textContent = T().toFixed(3) + " s / swing" +
      (mode === "fun" ? "  (Fun runs land a few ms higher per swing)" : "");
  }

  // ---------- animation loop ----------
  var lastRAF = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - lastRAF) / 1000);
    lastRAF = now;
    u += dt;
    var per = T();
    if (run) {
      var crossed = Math.floor(u / per);
      if (crossed > lastCross) { lastCross = crossed; run.gates = Math.min(crossed, run.N); run.flashAt = now; }
      if (u >= run.total) {
        u = per * 0.999;
        finishRun();
        lastCross = 0;
      } else {
        $("clock").textContent = u.toFixed(1) + " s";
      }
    } else {
      $("clock").textContent = "0.0 s";
    }
    drawStage(now);
    requestAnimationFrame(frame);
  }

  // ---------- resize + boot ----------
  function resizeStage() {
    stage.width = Math.round((stage.clientWidth || 480) * dpr);
    stage.height = Math.round(STAGE_H * dpr);
  }
  window.addEventListener("resize", resizeStage);

  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (m) { mode = m; readoutPredict(); });
  LS.check.init(LAB);

  renderTable();
  refreshPlot();
  readoutPredict();
  resizeStage();
  requestAnimationFrame(frame);
})();
