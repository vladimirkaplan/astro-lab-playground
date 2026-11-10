// PHY110 Lab 11 sim: the resonance-tube bench. A vertical tube with a cm
// scale (zero at the mouth), a draggable water cup that sets the air column
// length L, a fork rack with the 512 Hz and 440 Hz forks, a broad loudness
// maximum at the tube mouth, a room thermometer at the printed 25 C, and the
// per-fork record (L1, L2, lambda, v) with the average against the printed
// temperature law.
//
// Course Mode is exact: the loudness peaks sit at lambda/4 + 1.2 cm and
// 3*lambda/4 + 1.2 cm from the nominal speed at 25 C. Fun Mode adds a stable
// +-0.2 cm ruler parallax to each logged level; the maximum stays broad
// (±1-2 cm find-uncertainty applies in both modes). Fun Mode never changes
// the temperature law, the room temperature, or the fork stamps.
(function () {
  "use strict";
  var LS = window.LS, O = LS.aircolumn;
  var LAB = "11-air-column-sound";
  var $ = function (id) { return document.getElementById(id); };
  var mode = LS.ui.getMode(LAB);

  function fmt(x, d) {
    if (!isFinite(x)) return "-";
    return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  // ---------- bench geometry (css px) ----------
  var CH = 520, GH = 240;
  var cv = $("tubeCanvas"), cx = cv.getContext("2d");
  var gv = $("vfCanvas"), gx = gv.getContext("2d");
  var dpr = window.devicePixelRatio || 1;

  var TUBE = { x0: 220, x1: 280, yMouth: 40, yBottom: 480, cmMax: 70 };
  var PX_PER_CM = (TUBE.yBottom - TUBE.yMouth) / TUBE.cmMax;
  var CUP = { w: 30, h: 28 };
  var LOUDBAR = { x: 340, y0: 40, y1: 160 };
  var THERMO = { x: 470, y0: 50, y1: 190 };

  // ---------- state ----------
  var levelCm = 30.0;
  var sounding = null;                // "512" | "440" | null
  var logs = {
    "512": { L1: null, L2: null },
    "440": { L1: null, L2: null }
  };
  var flash = null, drag = null;

  function hzOf(id) { return id === "512" ? 512 : 440; }
  function vAccepted() { return O.vTemp(O.T_ROOM); }
  function loudnessNow() {
    if (!sounding) return 0;
    return O.loudness(levelCm, hzOf(sounding), vAccepted(), O.LOUD_WIDTH_CM);
  }
  function forkDerived(id) {
    var l = logs[id];
    if (l.L1 === null || l.L2 === null) return null;
    var lam = O.lambdaFromSpacing(l.L1 / 100, l.L2 / 100);
    return { L1: l.L1, L2: l.L2, lam: lam, v: O.speedFromFork(hzOf(id), l.L1 / 100, l.L2 / 100) };
  }
  function completedForks() {
    var out = [];
    ["512", "440"].forEach(function (id) {
      var d = forkDerived(id);
      if (d) out.push({ id: id, hz: hzOf(id), d: d });
    });
    return out;
  }
  function vAverage() {
    var d = completedForks().map(function (e) { return e.d.v; });
    if (!d.length) return NaN;
    if (d.length === 1) return d[0];
    return O.average(d[0], d[1]);
  }

  // ---------- persistence ----------
  function saveState() {
    LS.store.save(LAB, "state", ["state"], [[JSON.stringify({
      levelCm: levelCm, sounding: sounding, logs: logs, mode: mode
    })]]);
    LS.store.save(LAB, "log", CSV_HEADER, csvRows());
  }
  function loadState() {
    try {
      var got = LS.store.load(LAB, "state");
      if (!got || !got.rows || !got.rows.length) return;
      var st = JSON.parse(got.rows[0][0]);
      levelCm = st.levelCm || 30; sounding = st.sounding || null;
      logs = st.logs || { "512": { L1: null, L2: null }, "440": { L1: null, L2: null } };
    } catch (e) {}
  }

  // ---------- readouts ----------
  function noteNow() {
    if (flash && Date.now() < flash.until) return flash.text;
    if (!sounding) return "sound a fork, then drag the cup down the tube";
    var loud = loudnessNow();
    if (loud > 0.85) return "near a resonance - this is a loud spot for the " + sounding + " Hz fork";
    if (loud > 0.5) return "getting louder - keep moving slowly";
    return "quiet here - drag the cup toward a resonance";
  }
  function refreshReadouts() {
    $("levelRead").textContent = fmt(levelCm, 1);
    $("loudRead").textContent = Math.round(loudnessNow() * 100) + " %";
    $("tempRead").innerHTML = fmt(O.T_ROOM, 1) + " &deg;C";
    var va = vAverage();
    $("vavgRead").textContent = isFinite(va) ? fmt(va, 1) + " m/s" : "-";
    $("vtRead").textContent = fmt(vAccepted(), 1) + " m/s";
    var pe = isFinite(va) ? O.pctError(va, vAccepted()) : NaN;
    $("pctRead").textContent = isFinite(pe) ? fmt(pe, 1) + " %" : "-";
    $("fork512").className = sounding === "512" ? "action" : "action ghost";
    $("fork440").className = sounding === "440" ? "action" : "action ghost";
    $("noteRead").textContent = noteNow();
    $("summeta").textContent = summaryText();
  }
  function summaryText() {
    var n = completedForks().length;
    if (!n) return "log both forks to average";
    var va = vAverage(), pe = O.pctError(va, vAccepted());
    return n + " fork" + (n === 1 ? "" : "s") + " logged / v average " + fmt(va, 1) +
      " m/s / v_T " + fmt(vAccepted(), 1) + " m/s / % error " + fmt(pe, 1) + " %";
  }

  // ---------- data tables ----------
  var CSV_HEADER = ["f (Hz)", "L1 (cm)", "L1 (m)", "L2 (cm)", "L2 (m)", "lambda (m)", "v (m/s)"];
  function forkRow(id) {
    var l = logs[id], d = forkDerived(id);
    return [
      String(hzOf(id)),
      l.L1 === null ? "-" : fmt(l.L1, 1),
      l.L1 === null ? "-" : fmt(l.L1 / 100, 3),
      l.L2 === null ? "-" : fmt(l.L2, 1),
      l.L2 === null ? "-" : fmt(l.L2 / 100, 3),
      d ? fmt(d.lam, 3) : "-",
      d ? fmt(d.v, 1) : "-"
    ];
  }
  function csvRows() {
    return ["512", "440"].map(forkRow);
  }
  function renderTables() {
    $("tableForks").innerHTML = LS.store.tableHTML(CSV_HEADER, csvRows());
    renderWorkBox();
  }
  function renderWorkBox() {
    var lines = ["v = f*lambda;  closed-open tube: L near lambda/4, 3*lambda/4 (+ end correction)",
      "lambda = 2*(L2 - L1): the spacing is lambda/2, the end correction cancels",
      "accepted: v_T = 331.5 + 0.6*T = " + fmt(vAccepted(), 1) + " m/s at the room " +
      fmt(O.T_ROOM, 1) + " C;  end correction assumed 1.2 cm (4 cm tube, sim's own)"];
    ["512", "440"].forEach(function (id) {
      var d = forkDerived(id);
      if (d) {
        lines.push(id + " Hz: spacing " + fmt(d.L2 - d.L1, 1) +
          " cm -> lambda " + fmt(d.lam, 3) + " m -> v " + fmt(d.v, 1) + " m/s");
      } else {
        lines.push(id + " Hz: " + (logs[id].L1 === null ? "no resonances logged yet"
          : "L1 logged, L2 still open"));
      }
    });
    var va = vAverage();
    if (isFinite(va)) {
      lines.push("v average " + fmt(va, 1) + " m/s against " + fmt(vAccepted(), 1) +
        " m/s, % error " + fmt(O.pctError(va, vAccepted()), 1) + " %");
    }
    if (mode === "fun") {
      lines.push("Fun Mode: each logged level carries +-0.2 cm ruler parallax; the broad maximum still means a +-1-2 cm find");
    }
    lines.push("the loudness maximum is broad by design; a real lab's noise would mask it, this view is idealized");
    $("workBox").textContent = lines.join("\n");
  }
  function refreshAll() {
    refreshReadouts();
    renderTables();
    drawTube();
    drawGraph();
  }

  // ---------- drawing: the tube ----------
  function drawFork(x, y, active) {
    cx.strokeStyle = active ? "#ffd166" : "#6d84ad";
    cx.lineWidth = active ? 3 : 2;
    cx.beginPath();
    cx.moveTo(x - 14, y - 18); cx.lineTo(x - 14, y + 2);
    cx.moveTo(x + 14, y - 18); cx.lineTo(x + 14, y + 2);
    cx.moveTo(x - 14, y + 2); cx.quadraticCurveTo(x, y + 12, x + 14, y + 2);
    cx.moveTo(x, y + 8); cx.lineTo(x, y + 26);
    cx.stroke();
    if (active) {
      cx.strokeStyle = "rgba(255,209,102,0.5)"; cx.lineWidth = 1.5;
      for (var i = 1; i <= 2; i++) {
        cx.beginPath();
        cx.arc(x, y - 6, 20 + i * 8, -2.2, -0.9);
        cx.stroke();
      }
    }
  }
  function drawTube() {
    var w = cv.width / dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, w, CH);
    cx.fillStyle = "#0d1526"; cx.fillRect(0, 0, w, CH);
    var waterY = TUBE.yMouth + levelCm * PX_PER_CM;
    // reservoir glass
    cx.fillStyle = "#141f33";
    cx.fillRect(TUBE.x0, TUBE.yMouth, TUBE.x1 - TUBE.x0, TUBE.yBottom - TUBE.yMouth);
    // water
    cx.fillStyle = "rgba(63,138,204,0.45)";
    cx.fillRect(TUBE.x0, waterY, TUBE.x1 - TUBE.x0, TUBE.yBottom - waterY);
    cx.strokeStyle = "#8fd3ff"; cx.lineWidth = 1.5;
    cx.beginPath(); cx.moveTo(TUBE.x0, waterY); cx.lineTo(TUBE.x1, waterY); cx.stroke();
    // glass walls + mouth
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 2;
    cx.beginPath();
    cx.moveTo(TUBE.x0, TUBE.yMouth); cx.lineTo(TUBE.x0, TUBE.yBottom);
    cx.moveTo(TUBE.x1, TUBE.yMouth); cx.lineTo(TUBE.x1, TUBE.yBottom);
    cx.moveTo(TUBE.x0 - 6, TUBE.yMouth); cx.lineTo(TUBE.x0, TUBE.yMouth);
    cx.moveTo(TUBE.x1, TUBE.yMouth); cx.lineTo(TUBE.x1 + 6, TUBE.yMouth);
    cx.stroke();
    // cm scale
    cx.strokeStyle = "#4a5f8a"; cx.lineWidth = 1;
    cx.fillStyle = "#9fb4d8"; cx.font = "9px ui-monospace, monospace";
    cx.textAlign = "right"; cx.textBaseline = "middle";
    for (var cm = 0; cm <= TUBE.cmMax; cm++) {
      var y = TUBE.yMouth + cm * PX_PER_CM;
      var long = cm % 10 === 0;
      cx.beginPath();
      cx.moveTo(TUBE.x0 - (long ? 14 : 8), y);
      cx.lineTo(TUBE.x0, y);
      cx.stroke();
      if (long) cx.fillText(String(cm), TUBE.x0 - 18, y);
    }
    cx.save();
    cx.translate(TUBE.x0 - 44, (TUBE.yMouth + TUBE.yBottom) / 2);
    cx.rotate(-Math.PI / 2);
    cx.textAlign = "center";
    cx.fillText("L (cm) from the mouth", 0, 0);
    cx.restore();
    // cup handle (drag)
    cx.fillStyle = drag ? "#ffd166" : "#3a5a8a";
    cx.fillRect(TUBE.x1 + 8, waterY - CUP.h / 2, CUP.w, CUP.h);
    cx.strokeStyle = "#dce6f5"; cx.lineWidth = 1;
    cx.strokeRect(TUBE.x1 + 8, waterY - CUP.h / 2, CUP.w, CUP.h);
    cx.fillStyle = "#dce6f5"; cx.font = "9px system-ui, sans-serif";
    cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillText("cup", TUBE.x1 + 8 + CUP.w / 2, waterY);
    // level readout on the water line
    cx.fillStyle = "#8fd3ff"; cx.font = "11px ui-monospace, monospace";
    cx.textAlign = "left";
    cx.fillText(fmt(levelCm, 1) + " cm", TUBE.x1 + 46, waterY + 14);
    // loudness: ring at the mouth + bar
    var loud = loudnessNow();
    if (sounding) {
      cx.strokeStyle = "rgba(255,209,102," + (0.25 + 0.75 * loud).toFixed(2) + ")";
      cx.lineWidth = 2;
      cx.beginPath();
      cx.arc((TUBE.x0 + TUBE.x1) / 2, TUBE.yMouth, 10 + 26 * loud, Math.PI, 2 * Math.PI);
      cx.stroke();
    }
    cx.fillStyle = "#141f33";
    cx.fillRect(LOUDBAR.x, LOUDBAR.y0, 16, LOUDBAR.y1 - LOUDBAR.y0);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1;
    cx.strokeRect(LOUDBAR.x, LOUDBAR.y0, 16, LOUDBAR.y1 - LOUDBAR.y0);
    var hgt = (LOUDBAR.y1 - LOUDBAR.y0) * loud;
    cx.fillStyle = loud > 0.85 ? "#8affc1" : "#ffd166";
    cx.fillRect(LOUDBAR.x + 2, LOUDBAR.y1 - 2 - hgt, 12, hgt);
    cx.fillStyle = "#9fb4d8"; cx.font = "9px system-ui, sans-serif";
    cx.textAlign = "center"; cx.textBaseline = "bottom";
    cx.fillText("loudness", LOUDBAR.x + 8, LOUDBAR.y0 - 4);
    // forks on the rack
    cx.fillStyle = "#141f33";
    cx.fillRect(420, 40, 110, 120);
    cx.strokeStyle = "#6d84ad"; cx.strokeRect(420, 40, 110, 120);
    cx.fillStyle = "#9fb4d8"; cx.font = "10px system-ui, sans-serif";
    cx.textAlign = "center"; cx.textBaseline = "top";
    cx.fillText("fork rack (stamped, not printed)", 475, 46);
    drawFork(450, 85, sounding === "512");
    cx.fillStyle = sounding === "512" ? "#ffd166" : "#9fb4d8";
    cx.font = "10px ui-monospace, monospace"; cx.textBaseline = "top";
    cx.fillText("512 Hz", 450, 118);
    drawFork(500, 85, sounding === "440");
    cx.fillStyle = sounding === "440" ? "#ffd166" : "#9fb4d8";
    cx.fillText("440 Hz", 500, 118);
    // room thermometer
    cx.fillStyle = "#141f33";
    cx.fillRect(THERMO.x, THERMO.y0, 16, THERMO.y1 - THERMO.y0);
    cx.strokeStyle = "#6d84ad"; cx.strokeRect(THERMO.x, THERMO.y0, 16, THERMO.y1 - THERMO.y0);
    cx.fillStyle = "#e05555";
    cx.fillRect(THERMO.x + 5, THERMO.y0 + 20, 6, THERMO.y1 - THERMO.y0 - 20);
    cx.beginPath(); cx.arc(THERMO.x + 8, THERMO.y1 + 8, 10, 0, 6.29); cx.fill();
    cx.strokeStyle = "#6d84ad"; cx.stroke();
    cx.fillStyle = "#9fb4d8"; cx.font = "9px system-ui, sans-serif";
    cx.textAlign = "left"; cx.textBaseline = "middle";
    cx.fillText("room", THERMO.x + 22, THERMO.y0 + 10);
    cx.fillStyle = "#ffd166"; cx.font = "11px ui-monospace, monospace";
    cx.fillText(fmt(O.T_ROOM, 1) + " C", THERMO.x + 22, THERMO.y0 + 26);
    // dragged cup follows the pointer
    if (drag) {
      var dy = TUBE.yMouth + drag.cm * PX_PER_CM;
      cx.fillStyle = "#ffd166";
      cx.fillRect(TUBE.x1 + 8, dy - CUP.h / 2, CUP.w, CUP.h);
    }
  }

  // ---------- drawing: the add-on v-against-f graph ----------
  function drawGraph() {
    var g = { x0: 56, y0: 24, x1: gv.width / dpr - 24, y1: GH - 44 };
    gx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gx.clearRect(0, 0, g.x1 + 24, GH);
    gx.fillStyle = "#0d1526"; gx.fillRect(0, 0, g.x1 + 24, GH);
    function fToX(f) { return g.x0 + ((f - 400) / 160) * (g.x1 - g.x0); }
    function vToY(v) { return g.y1 - ((v - 330) / 26) * (g.y1 - g.y0); }
    gx.strokeStyle = "#23324e"; gx.lineWidth = 1;
    gx.fillStyle = "#6d84ad"; gx.font = "9px ui-monospace, monospace";
    gx.textAlign = "center"; gx.textBaseline = "top";
    [400, 440, 480, 520, 560].forEach(function (f) {
      var x = fToX(f);
      gx.beginPath(); gx.moveTo(x, g.y0); gx.lineTo(x, g.y1); gx.stroke();
      gx.fillText(String(f), x, g.y1 + 6);
    });
    gx.textAlign = "right"; gx.textBaseline = "middle";
    [330, 340, 350].forEach(function (v) {
      var y = vToY(v);
      gx.beginPath(); gx.moveTo(g.x0, y); gx.lineTo(g.x1, y); gx.stroke();
      gx.fillText(String(v), g.x0 - 6, y);
    });
    gx.textAlign = "left"; gx.textBaseline = "bottom";
    gx.fillText("f (Hz) horizontal  /  v (m/s) vertical  -  add-on, not course work", g.x0, g.y0 - 6);
    // the accepted line
    gx.setLineDash([5, 4]);
    gx.strokeStyle = "#8affc1"; gx.lineWidth = 1.5;
    gx.beginPath(); gx.moveTo(fToX(400), vToY(vAccepted())); gx.lineTo(fToX(560), vToY(vAccepted())); gx.stroke();
    gx.setLineDash([]);
    gx.fillStyle = "#8affc1"; gx.font = "9px system-ui, sans-serif";
    gx.fillText("v_T at 25 C", fToX(522), vToY(vAccepted()) - 4);
    // the fork points
    ["512", "440"].forEach(function (id) {
      var d = forkDerived(id);
      if (!d) return;
      gx.fillStyle = "#ffd166";
      gx.beginPath(); gx.arc(fToX(hzOf(id)), vToY(d.v), 4, 0, 6.29); gx.fill();
      gx.strokeStyle = "#0d1526"; gx.lineWidth = 1; gx.stroke();
    });
  }

  // ---------- controls ----------
  function soundFork(id) {
    sounding = id;
    flash = { text: id + " Hz sounding above the mouth - drag the cup and watch the loudness bar",
      until: Date.now() + 3500 };
    refreshAll();
    saveState();
  }
  $("fork512").addEventListener("click", function () { soundFork("512"); });
  $("fork440").addEventListener("click", function () { soundFork("440"); });
  function logLevel(which) {
    if (!sounding) {
      flash = { text: "sound a fork first", until: Date.now() + 2500 };
      refreshAll();
      return;
    }
    var id = sounding, l = logs[id];
    var val = mode === "fun"
      ? levelCm + (Math.random() * 2 - 1) * O.RULER_JITTER_CM
      : levelCm;
    if (which === "L1") {
      l.L1 = val;
      if (l.L2 !== null && l.L2 <= l.L1) {
        l.L2 = null;
        flash = { text: "L1 moved past the old L2 - log L2 again", until: Date.now() + 3500 };
      } else {
        flash = { text: "L1 = " + fmt(val, 1) + " cm logged for the " + id + " Hz fork",
          until: Date.now() + 3000 };
      }
    } else {
      if (l.L1 === null) {
        flash = { text: "log L1 first: this bench works the spacing L2 - L1", until: Date.now() + 3000 };
        refreshAll();
        return;
      }
      if (val <= l.L1) {
        flash = { text: "the cup must sit below L1 (" + fmt(l.L1, 1) + " cm) for the second resonance",
          until: Date.now() + 3500 };
        refreshAll();
        return;
      }
      l.L2 = val;
      flash = { text: "L2 = " + fmt(val, 1) + " cm logged - spacing " + fmt(val - l.L1, 1) +
        " cm, the row completes", until: Date.now() + 3500 };
    }
    refreshAll();
    saveState();
  }
  $("logL1").addEventListener("click", function () { logLevel("L1"); });
  $("logL2").addEventListener("click", function () { logLevel("L2"); });
  $("clearAllBtn").addEventListener("click", function () {
    levelCm = 30; sounding = null;
    logs = { "512": { L1: null, L2: null }, "440": { L1: null, L2: null } };
    LS.store.clear(LAB, "log");
    $("csvCopy").style.display = "none";
    flash = { text: "cleared - the cup is back at 30 cm", until: Date.now() + 2500 };
    refreshAll();
    saveState();
  });
  $("exportLog").addEventListener("click", function () {
    LS.store.exportCSV("phy110-lab11-air-column-sound.csv", CSV_HEADER, csvRows(), $("csvCopy"));
  });

  // ---------- dragging: the cup ----------
  function evPos(ev) {
    var r = cv.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }
  function cmAt(y) { return clamp((y - TUBE.yMouth) / PX_PER_CM, 2, TUBE.cmMax - 2); }
  cv.addEventListener("pointerdown", function (ev) {
    var p = evPos(ev);
    var waterY = TUBE.yMouth + levelCm * PX_PER_CM;
    var onCup = p.x >= TUBE.x1 + 2 && p.x <= TUBE.x1 + CUP.w + 14 &&
      Math.abs(p.y - waterY) <= 22;
    var inTube = p.x >= TUBE.x0 - 20 && p.x <= TUBE.x1 + 20 &&
      p.y >= TUBE.yMouth && p.y <= TUBE.yBottom;
    if (onCup || inTube) {
      drag = { cm: cmAt(p.y) };
      levelCm = drag.cm;
      cv.setPointerCapture(ev.pointerId);
      refreshAll();
    }
  });
  cv.addEventListener("pointermove", function (ev) {
    if (!drag) return;
    var p = evPos(ev);
    drag.cm = cmAt(p.y);
    levelCm = drag.cm;
    drawTube();
    $("levelRead").textContent = fmt(levelCm, 1);
    $("loudRead").textContent = Math.round(loudnessNow() * 100) + " %";
  });
  cv.addEventListener("pointerup", function () {
    if (!drag) return;
    drag = null;
    refreshAll();
    saveState();
  });
  cv.addEventListener("pointercancel", function () {
    if (drag) { drag = null; drawTube(); }
  });

  // ---------- boot ----------
  function resizeStages() {
    var w1 = Math.round(Math.max(620, (cv.clientWidth || 700)) * dpr);
    cv.width = w1;
    cv.height = Math.round(CH * dpr);
    var w2 = Math.round(Math.max(420, (gv.clientWidth || 480)) * dpr);
    gv.width = w2;
    gv.height = Math.round(GH * dpr);
    drawTube();
    drawGraph();
  }
  window.addEventListener("resize", resizeStages);

  setInterval(function () {
    if (flash && Date.now() >= flash.until) { flash = null; refreshReadouts(); }
  }, 60);

  loadState();
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (m) {
    mode = m;
    refreshAll();
    saveState();
  });
  LS.check.init(LAB);
  refreshAll();
  resizeStages();
})();
