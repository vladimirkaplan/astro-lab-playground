// PHY110 Lab 1 sim: five benches on one page - a dual-scale ruler on a shoebox, a
// graduated cylinder with a balance and spring scale, a pacing hallway, a pendulum
// bench with a stopwatch, and a conversion strip you build yourself.
//
// Ideal Mode reads instruments exactly. Fun Mode adds the noise a real bench
// gives you (coarse cylinder scale, tired thumb, uneven pace). Neither mode ever
// moves an accepted value: g stays 9.80 m/s^2 and the course factors stay printed,
// because those are what your worksheet is graded against.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units, P = LS.unitslab;
  var LAB = "01-units-and-measurement";
  var $ = function (id) { return document.getElementById(id); };
  var mode = LS.ui.getMode(LAB);
  var EST = "  (instrument estimate)";

  function fmt(x, d) {
    if (!isFinite(x)) return "-";
    return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  }
  function jitter(spread) {
    return mode === "fun" ? (Math.random() - 0.5) * 2 * spread : 0;
  }

  // ---------- data table (the student's own log) ----------
  var HEADER = ["quantity", "reading", "unit", "converted", "converted unit",
    "accepted", "percent error"];
  var rows = [];
  try {
    var saved = LS.store.load(LAB, "log");
    if (saved && saved.rows) rows = saved.rows;
  } catch (e) {}
  function logRow(q, reading, unit, conv, convUnit, accepted, errPct) {
    rows.push([q, reading, unit, conv === undefined ? "" : conv,
      convUnit || "", accepted === undefined ? "" : accepted,
      errPct === undefined || errPct === null ? "" : errPct + "%"]);
    LS.store.save(LAB, "log", HEADER, rows);
    renderTable();
  }
  function renderTable() {
    $("dataTable").innerHTML = rows.length
      ? LS.store.tableHTML(["quantity", "reading", "unit", "converted", "unit",
        "accepted", "% error"], rows)
      : "<p class='muted'>Nothing logged yet. Every bench has a Log button, and your " +
        "report is built from these rows.</p>";
  }
  function pctErr(measured, accepted) {
    return U.round(P.percentError(measured, accepted), 2);
  }

  // ---------- Bench A: dual-scale ruler on a shoebox ----------
  var DIMS = [
    { name: "Length", cm: 34.6 },
    { name: "Width", cm: 22.2 },
    { name: "Height", cm: 12.7 }
  ];
  var dimIdx = 0;
  var unitA = "cm";               // which scale is currently printed on the ruler
  var zeroWorld = 0;              // ruler zero mark sits at this world position (cm)
  var RULER_Y = 190, WORLD_CM = 44;
  var cvA = $("rulerCanvas"), cxA = cvA.getContext("2d");

  function dimNow() { return DIMS[dimIdx]; }
  function slipCm() { return -zeroWorld; }
  function rulerRead() {
    var d = dimNow().cm;
    var near = -zeroWorld;
    var far = d - zeroWorld;
    var noise = jitter(0.1);
    return { near: near, far: far, reading: d + noise, dim: d };
  }
  function drawRulerBench() {
    var w = cvA.width / dpr, h = cvA.height / dpr;
    cxA.setTransform(dpr, 0, 0, dpr, 0, 0);
    cxA.clearRect(0, 0, w, h);
    cxA.fillStyle = "#0d1526"; cxA.fillRect(0, 0, w, h);
    var px = function (cm) { return 20 + cm * ((w - 40) / WORLD_CM); };

    // the box, from world 0 to its own length
    var d = dimNow().cm;
    var bx0 = px(0), bx1 = px(d), by = 70, bh = 84;
    cxA.fillStyle = "#a97a4a"; cxA.fillRect(bx0, by, bx1 - bx0, bh);
    cxA.strokeStyle = "#6d4a25"; cxA.lineWidth = 2; cxA.strokeRect(bx0, by, bx1 - bx0, bh);
    cxA.strokeStyle = "#e6c99a"; cxA.lineWidth = 1;
    cxA.beginPath(); cxA.moveTo(bx0, by + 18); cxA.lineTo(bx1, by + 18); cxA.stroke();
    cxA.fillStyle = "#f4e6d0"; cxA.font = "13px system-ui, sans-serif";
    cxA.textAlign = "center";
    cxA.fillText(dimNow().name + " of the shoebox", (bx0 + bx1) / 2, by + bh / 2);

    // ruler band, slid by zeroWorld
    cxA.fillStyle = "#efe0bb"; cxA.fillRect(6, RULER_Y, w - 12, 74);
    cxA.strokeStyle = "#b99e6b"; cxA.strokeRect(6, RULER_Y, w - 12, 74);
    var labelEvery = unitA === "cm" ? 5 : 1;
    var minor = unitA === "cm" ? 1 : 0.25;
    cxA.textAlign = "center"; cxA.textBaseline = "top";
    for (var v = 0; v <= WORLD_CM; v += minor) {
      var world = zeroWorld + (unitA === "cm" ? v : v * 2.54);
      if (world < -0.2) continue;
      var x = px(world);
      if (x < 8 || x > w - 8) continue;
      var isLabel = Math.abs(v / labelEvery - Math.round(v / labelEvery)) < 1e-6;
      cxA.strokeStyle = "#3a3a3a"; cxA.lineWidth = isLabel ? 1 : 0.5;
      cxA.beginPath(); cxA.moveTo(x, RULER_Y);
      cxA.lineTo(x, RULER_Y + (isLabel ? 18 : 9)); cxA.stroke();
      if (isLabel) {
        cxA.fillStyle = "#222"; cxA.font = "10.5px ui-monospace, monospace";
        cxA.fillText(unitA === "cm" ? String(Math.round(v)) : fmt(v, 2), x, RULER_Y + 21);
      }
    }
    // box edges projected onto the ruler
    cxA.strokeStyle = "#ffd166"; cxA.setLineDash([4, 4]); cxA.lineWidth = 1.4;
    [0, d].forEach(function (world) {
      cxA.beginPath(); cxA.moveTo(px(world), by + bh); cxA.lineTo(px(world), RULER_Y + 40);
      cxA.stroke();
    });
    cxA.setLineDash([]);
    // drag handle on the ruler
    cxA.fillStyle = "#2b5bd7";
    cxA.beginPath(); cxA.arc(w - 30, RULER_Y + 37, 9, 0, 6.29); cxA.fill();
    cxA.strokeStyle = "#fff"; cxA.lineWidth = 2; cxA.stroke();
    cxA.fillStyle = "#9fb4d8"; cxA.font = "11px system-ui, sans-serif"; cxA.textAlign = "left";
    cxA.fillText(unitA === "cm" ? "cm scale, mm ticks" : "inch scale, quarter ticks",
      12, RULER_Y + 46);
  }
  function refreshRulerReadouts() {
    var r = rulerRead();
    var noiseTag = mode === "fun" ? EST : "";
    $("cmRead").textContent = fmt(r.reading, 1) + " cm  (far " + fmt(r.far, 1) +
      " - near " + fmt(r.near, 1) + ")" + noiseTag;
    $("inRead").textContent = fmt(r.reading / 2.54, 3) + " in" + noiseTag;
    $("fracRead").textContent = P.toFraction(r.reading / 2.54, 8) + " in";
    var s = slipCm();
    $("alignRead").textContent = Math.abs(s) < 0.05
      ? "zero line sits on the box edge"
      : "off zero by " + fmt(Math.abs(s), 1) + " cm: subtract the near reading";
  }
  var dragA = null, grabA = 0;
  function worldA(ev) {
    var w = cvA.clientWidth || 480;
    return ((ev.clientX - cvA.getBoundingClientRect().left) - 20) / ((w - 40) / WORLD_CM);
  }
  cvA.addEventListener("pointerdown", function (ev) {
    var y = ev.clientY - cvA.getBoundingClientRect().top;
    if (y < RULER_Y - 14) return;
    dragA = true; grabA = worldA(ev) - zeroWorld;
    cvA.setPointerCapture(ev.pointerId);
  });
  cvA.addEventListener("pointermove", function (ev) {
    if (!dragA) return;
    zeroWorld = U.clamp(worldA(ev) - grabA, -6, 4);
    refreshRulerReadouts(); drawRulerBench();
  });
  cvA.addEventListener("pointerup", function () { dragA = null; });
  $("dimSel").addEventListener("change", function (ev) {
    dimIdx = parseInt(ev.target.value, 10) || 0;
    refreshRulerReadouts(); drawRulerBench();
  });
  $("flipScale").addEventListener("click", function (ev) {
    unitA = unitA === "cm" ? "in" : "cm";
    ev.target.textContent = unitA === "cm" ? "Switch to inches ruler" : "Switch to cm ruler";
    refreshRulerReadouts(); drawRulerBench();
  });
  $("logSide").addEventListener("click", function () {
    var r = rulerRead();
    var inDecimal = r.reading / 2.54;
    logRow(dimNow().name + " of box", fmt(r.reading, 1), "cm",
      fmt(inDecimal, 3) + " = " + P.toFraction(inDecimal, 8), "in", "", "");
  });
  $("volumeBoth").addEventListener("click", function () {
    var cm3 = P.boxVolume(DIMS[0].cm + jitter(0.1), DIMS[1].cm + jitter(0.1),
      DIMS[2].cm + jitter(0.1));
    var in3 = P.convertCubic(cm3, "cm", "in");
    logRow("box volume", fmt(in3, 1), "in^3", fmt(cm3, 1), "cm^3", "", "");
  });

  // ---------- Bench B: cylinder, balance, spring scale, thermometer ----------
  var WATER_ML = 45.0, OBJ_VOL_ML = 27.5, OBJ_G = 158, BOOK_KG = 1.25, WATER_C = 21.5;
  var objIn = false, weighTarget = null;
  var cvB = $("cylCanvas"), cxB = cvB.getContext("2d");

  function levelMl() { return WATER_ML + (objIn ? OBJ_VOL_ML : 0); }
  function levelRead() {
    var trueLevel = levelMl();
    if (mode !== "fun") return trueLevel;
    return Math.round((trueLevel + jitter(0.5)) * 2) / 2;   // 1 mL marks, half by eye
  }
  function massKgOf(target) { return target === "book" ? BOOK_KG : OBJ_G / 1000; }
  function drawCylBench() {
    var w = cvB.width / dpr, h = cvB.height / dpr;
    cxB.setTransform(dpr, 0, 0, dpr, 0, 0);
    cxB.clearRect(0, 0, w, h);
    cxB.fillStyle = "#0d1526"; cxB.fillRect(0, 0, w, h);

    // cylinder: 0-100 mL over the drawn height
    var cx = 74, top = 26, bot = h - 24, mLtop = 100;
    var yOf = function (ml) { return bot - (ml / mLtop) * (bot - top); };
    var lvl = levelRead();
    cxB.fillStyle = "#16233d"; cxB.fillRect(cx - 26, top, 52, bot - top);
    cxB.fillStyle = "#2f6fb5"; cxB.fillRect(cx - 24, yOf(lvl), 48, bot - yOf(lvl) - 2);
    // meniscus curve (read the bottom of it)
    cxB.strokeStyle = "#8fc4f0"; cxB.lineWidth = 2;
    cxB.beginPath();
    cxB.moveTo(cx - 24, yOf(lvl) + 3);
    cxB.quadraticCurveTo(cx, yOf(lvl) - 4, cx + 24, yOf(lvl) + 3);
    cxB.stroke();
    if (objIn) {
      cxB.fillStyle = "#b9c3d0";
      cxB.beginPath(); cxB.ellipse(cx + 2, bot - 16, 12, 9, 0.4, 0, 6.29); cxB.fill();
    }
    cxB.strokeStyle = "#4d648c"; cxB.lineWidth = 2; cxB.strokeRect(cx - 26, top, 52, bot - top);
    cxB.font = "10px ui-monospace, monospace"; cxB.textAlign = "right"; cxB.fillStyle = "#9fb4d8";
    for (var m = 10; m <= 100; m += 10) {
      cxB.beginPath(); cxB.moveTo(cx - 26, yOf(m)); cxB.lineTo(cx - 18, yOf(m)); cxB.stroke();
      cxB.fillText(String(m), cx - 29, yOf(m) + 3);
    }
    cxB.textAlign = "left"; cxB.fillStyle = "#cfd6e4"; cxB.font = "12px system-ui, sans-serif";
    cxB.fillText("graduated cylinder (mL)", cx - 26, h - 8);

    // balance and spring scale, right of the cylinder
    var bx = w * 0.46, sx = w * 0.74;
    var showMass = weighTarget ? (massKgOf(weighTarget) * 1000 + jitter(0.5)) : null;
    var showForce = weighTarget ? (P.weightN(massKgOf(weighTarget)) + jitter(0.05)) : null;
    cxB.strokeStyle = "#7fa7e8"; cxB.lineWidth = 2;
    cxB.strokeRect(bx, top + 30, 96, 54);
    cxB.fillStyle = "#0b1220"; cxB.fillRect(bx + 6, top + 36, 84, 24);
    cxB.fillStyle = "#7fe0a0"; cxB.font = "15px ui-monospace, monospace"; cxB.textAlign = "center";
    cxB.fillText(showMass === null ? "---- g" : fmt(showMass, 1) + " g", bx + 48, top + 54);
    cxB.fillStyle = "#9fb4d8"; cxB.font = "11px system-ui, sans-serif";
    cxB.fillText("balance (grams)", bx + 48, top + 76);

    cxB.strokeStyle = "#7fa7e8";
    cxB.beginPath(); cxB.moveTo(sx + 24, top + 6); cxB.lineTo(sx + 24, top + 26); cxB.stroke();
    cxB.strokeRect(sx, top + 26, 48, 62);
    var stretch = showForce === null ? 0 : U.clamp(showForce / 13, 0, 1) * 40;
    cxB.strokeStyle = "#ffd166";
    cxB.beginPath(); cxB.moveTo(sx + 24, top + 32);
    cxB.lineTo(sx + 24, top + 32 + 12 + stretch); cxB.stroke();
    cxB.fillStyle = "#0b1220"; cxB.fillRect(sx + 4, top + 74, 40, 12);
    cxB.fillStyle = "#ffd166"; cxB.font = "11px ui-monospace, monospace";
    cxB.fillText(showForce === null ? "--.- N" : fmt(showForce, 2) + " N", sx + 24, top + 84);
    cxB.fillStyle = "#9fb4d8"; cxB.font = "11px system-ui, sans-serif";
    cxB.fillText("spring scale (N)", sx + 24, top + 102);

    // thermometer in the water
    var tx = w - 46;
    cxB.strokeStyle = "#cfd6e4"; cxB.lineWidth = 2;
    cxB.strokeRect(tx, 20, 14, h - 46);
    var cRead = WATER_C + jitter(0.4);
    var frac = U.clamp((cRead + 10) / 120, 0, 1);
    cxB.fillStyle = "#e2574c";
    cxB.fillRect(tx + 3, 20 + (1 - frac) * (h - 52), 8, frac * (h - 52) + 4);
    cxB.fillStyle = "#cfd6e4"; cxB.font = "11px system-ui, sans-serif"; cxB.textAlign = "center";
    cxB.fillText($("tempF").checked ? "F" : "C", tx + 7, 14);
  }
  function refreshBenchB() {
    var lvl = levelRead();
    var tag = mode === "fun" ? EST : "";
    $("lvlRead").textContent = fmt(lvl, 1) + " mL" + tag;
    $("dispRead").textContent = objIn
      ? fmt(lvl - levelRead.before, 1) + " mL" + tag : "drop the object in first";
    if (weighTarget) {
      var massG = massKgOf(weighTarget) * 1000 + jitter(0.5);
      var forceN = P.weightN(massKgOf(weighTarget)) + jitter(0.05);
      $("balRead").textContent = fmt(massG, 1) + " g" + tag;
      $("sprRead").textContent = fmt(forceN, 2) + " N  (W = m x 9.80)" + tag;
    }
    var cRead = WATER_C + jitter(0.4);
    $("thermRead").textContent = $("tempF").checked
      ? fmt(P.cToF(cRead), 1) + " F" + tag
      : fmt(cRead, 1) + " C" + tag;
  }
  // displacement needs both readings, so keep the "before" level on drop
  $("dropObj").addEventListener("click", function () {
    levelRead.before = mode === "fun" ? Math.round((WATER_ML + jitter(0.5)) * 2) / 2 : WATER_ML;
    objIn = true;
    refreshBenchB(); drawCylBench();
  });
  $("takeObj").addEventListener("click", function () {
    objIn = false; levelRead.before = null;
    refreshBenchB(); drawCylBench();
  });
  $("tempF").addEventListener("change", function () { refreshBenchB(); drawCylBench(); });
  $("weighObj").addEventListener("click", function () {
    weighTarget = "obj"; refreshBenchB(); drawCylBench();
  });
  $("weighBook").addEventListener("click", function () {
    weighTarget = "book"; refreshBenchB(); drawCylBench();
  });
  $("logBenchB").addEventListener("click", function () {
    var lvl = levelRead();
    logRow("cylinder water", fmt(levelRead.before === null ? lvl : levelRead.before, 1),
      "mL", "", "", "", "");
    logRow("cylinder water + object", fmt(lvl, 1), "mL", "", "", "", "");
    if (levelRead.before !== null) {
      logRow("object volume", fmt(lvl - levelRead.before, 1), "mL",
        fmt(P.convert(lvl - levelRead.before, "mL", "fl oz"), 3), "fl oz", "", "");
    }
    if (weighTarget) {
      var kg = massKgOf(weighTarget);
      var name = weighTarget === "book" ? "manual" : "object";
      logRow(name + " mass", fmt(kg * 1000, 1), "g", fmt(P.convert(kg, "kg", "lb"), 2), "lb",
        "", "");
      var wRead = P.weightN(kg) + jitter(0.05);
      var wTrue = P.weightN(kg);
      logRow(name + " weight", fmt(wRead, 2), "N",
        fmt(P.convert(wRead, "N", "lbf"), 2), "lbf", fmt(wTrue, 2), pctErr(wRead, wTrue));
    }
    var cRead = WATER_C + jitter(0.4);
    logRow("water temperature", fmt(cRead, 1), "C", fmt(P.cToF(cRead), 1), "F", "", "");
  });

  // ---------- Bench C: pacing ----------
  var COURSE_FT = 50, BOARD_FT = 24, PACE_TRUE = 2.2;
  var pace = { which: "course", steps: 0, walked: 0, courseSteps: 0 };
  var cvC = $("paceCanvas"), cxC = cvC.getContext("2d");
  function paceTarget() { return pace.which === "course" ? COURSE_FT : BOARD_FT; }
  function arrived() { return pace.walked >= paceTarget(); }
  function stepSizeFt() { return pace.courseSteps ? COURSE_FT / pace.courseSteps : NaN; }
  function drawPaceBench() {
    var w = cvC.width / dpr, h = cvC.height / dpr;
    cxC.setTransform(dpr, 0, 0, dpr, 0, 0);
    cxC.clearRect(0, 0, w, h);
    cxC.fillStyle = "#0d1526"; cxC.fillRect(0, 0, w, h);
    var y = h * 0.6, x0 = 26, x1 = w - 26;
    var target = paceTarget();
    var px = function (ft) { return x0 + (ft / target) * (x1 - x0); };
    cxC.strokeStyle = "#4d648c"; cxC.lineWidth = 2;
    cxC.beginPath(); cxC.moveTo(x0, y); cxC.lineTo(x1, y); cxC.stroke();
    cxC.fillStyle = "#ffd166";
    [0, target].forEach(function (ft) {
      cxC.fillRect(px(ft) - 2, y - 14, 4, 28);
    });
    cxC.fillStyle = "#9fb4d8"; cxC.font = "11px system-ui, sans-serif";
    cxC.textAlign = "left"; cxC.fillText("start", x0, y + 34);
    cxC.textAlign = "right";
    cxC.fillText(pace.which === "course" ? "chalk mark at 50 ft" : "far end of the board",
      x1, y + 34);
    var done = arrived();
    cxC.fillStyle = done ? "#7fe0a0" : "#e8eefb";
    cxC.beginPath();
    cxC.arc(px(U.clamp(pace.walked, 0, target)), y - 26, 8, 0, 6.29);
    cxC.fill();
    cxC.fillStyle = "#cfd6e4"; cxC.textAlign = "center"; cxC.font = "12px system-ui, sans-serif";
    cxC.fillText(done ? "arrived after " + pace.steps + " paces"
      : fmt(pace.walked, 1) + " ft of " + target + " ft walked", (x0 + x1) / 2, 26);
  }
  function refreshPaceReadouts() {
    $("paceWhich").textContent = pace.which === "course"
      ? "50 ft course" : "chalkboard span";
    $("paceCount").textContent = String(pace.steps);
    var size = stepSizeFt();
    $("paceSize").textContent = pace.courseSteps
      ? fmt(size, 3) + " ft/step  (from " + pace.courseSteps + " paces over 50 ft)"
      : "pace the 50 ft course first";
    var boardSteps = pace.which === "board" ? pace.steps : pace.boardSteps || 0;
    $("paceBoardLen").textContent = (pace.courseSteps && boardSteps)
      ? fmt(P.pacedLength(boardSteps, size), 1) + " ft  (from " + boardSteps + " paces)"
      : "-";
  }
  $("paceStep").addEventListener("click", function () {
    var len = U.clamp(PACE_TRUE + (mode === "fun" ? (Math.random() - 0.5) * 0.5
      : (Math.random() - 0.5) * 0.24), 1.6, 2.9);
    pace.walked += len;
    pace.steps++;
    if (pace.which === "course" && arrived()) pace.courseSteps = pace.steps;
    if (pace.which === "board") pace.boardSteps = pace.steps;
    refreshPaceReadouts(); drawPaceBench();
  });
  $("paceReset").addEventListener("click", function () {
    pace.steps = 0; pace.walked = 0;
    if (pace.which === "board") pace.boardSteps = 0; else pace.courseSteps = 0;
    refreshPaceReadouts(); drawPaceBench();
  });
  $("paceBoard").addEventListener("click", function (ev) {
    if (pace.which === "course") {
      pace.which = "board";
      ev.target.textContent = "Back to the 50 ft course";
    } else {
      pace.which = "course";
      ev.target.textContent = "Walk the board span instead";
    }
    pace.steps = 0; pace.walked = 0;
    refreshPaceReadouts(); drawPaceBench();
  });
  $("paceLog").addEventListener("click", function () {
    if (!arrived()) return;
    if (pace.which === "course") {
      logRow("paces for 50 ft", pace.courseSteps, "steps",
        fmt(stepSizeFt(), 3), "ft/step", COURSE_FT / pace.courseSteps, "");
    } else {
      var len = P.pacedLength(pace.boardSteps, stepSizeFt());
      logRow("paces for the board", pace.boardSteps, "steps",
        fmt(len, 1), "ft", BOARD_FT, pctErr(len, BOARD_FT));
    }
  });

  // ---------- Bench D: pendulum ----------
  var LEN = 0.90, amp = 0.20, swingStart = 0, swinging = false;
  var running = false, pressAt = 0, gates = 0, pressGateBase = 0, runs = [];
  try {
    var savedRuns = LS.store.load(LAB, "runs");
    if (savedRuns && savedRuns.rows) runs = savedRuns.rows.map(function (r) {
      return parseFloat(r[1]);
    }).filter(isFinite);
  } catch (e) {}
  var cvD = $("pendCanvas"), cxD = cvD.getContext("2d");
  function periodS() { return P.pendulumPeriod(LEN); }
  function thetaNow(nowMs) {
    if (!swinging) return amp;
    var ph = 2 * Math.PI * (nowMs - swingStart) / 1000 / periodS();
    return amp * Math.cos(ph);
  }
  function gatesPassed(nowMs) {
    if (!swinging) return 0;
    return Math.floor((nowMs - swingStart) / 1000 / (periodS() / 2)) + 1;
  }
  function drawPendulum() {
    var w = cvD.width / dpr, h = cvD.height / dpr;
    cxD.setTransform(dpr, 0, 0, dpr, 0, 0);
    cxD.clearRect(0, 0, w, h);
    cxD.fillStyle = "#0d1526"; cxD.fillRect(0, 0, w, h);
    var px = w * 0.5, py = 26;
    var rod = Math.min(h - 90, 220 * (LEN / 0.9));
    var th = thetaNow(Date.now());
    var bx = px + Math.sin(th) * rod, by = py + Math.cos(th) * rod;
    cxD.strokeStyle = "#6d84ad"; cxD.lineWidth = 2;
    cxD.beginPath(); cxD.moveTo(px - 40, py); cxD.lineTo(px + 40, py); cxD.stroke();
    cxD.strokeStyle = "#cfd6e4";
    cxD.beginPath(); cxD.moveTo(px, py); cxD.lineTo(bx, by); cxD.stroke();
    // middle-crossing gate
    var gateOn = swinging && Math.abs(Math.cos(2 * Math.PI *
      (Date.now() - swingStart) / 1000 / periodS())) > 0.985;
    cxD.strokeStyle = gateOn ? "#ffd166" : "#3c4f73"; cxD.lineWidth = gateOn ? 3 : 1.5;
    cxD.strokeRect(px - 26, py + rod - 12, 52, 24);
    cxD.fillStyle = gateOn ? "#ffd166" : "#9fb4d8";
    cxD.font = "11px system-ui, sans-serif"; cxD.textAlign = "center";
    cxD.fillText("gate", px, py + rod + 30);
    cxD.fillStyle = "#7fa7e8";
    cxD.beginPath(); cxD.arc(bx, by, 13, 0, 6.29); cxD.fill();
    cxD.strokeStyle = "#e8eefb"; cxD.lineWidth = 2; cxD.stroke();
    cxD.fillStyle = "#9fb4d8"; cxD.font = "12px system-ui, sans-serif";
    cxD.fillText("L = " + LEN.toFixed(2) + " m", px, h - 12);
    if (running) {
      cxD.fillStyle = "#7fe0a0"; cxD.textAlign = "left";
      cxD.fillText("gates " + gates + " / 10", 14, 22);
    }
  }
  function pendRefresh() {
    $("lenRead").textContent = LEN.toFixed(2);
    $("gateRead").textContent = String(gates);
    $("clockRead").textContent = fmt(currentClock(), 3) + " s";
    if (!runs.length) {
      $("tavRead").textContent = "-"; $("gRead").textContent = "-"; $("errRead").textContent = "-";
      return;
    }
    var t10 = P.mean(runs), tav = t10 / 10;
    var g = P.pendulumG(LEN, tav);
    $("tavRead").textContent = fmt(tav, 3) + " s   (from " + runs.length +
      (runs.length === 1 ? " run)" : " runs)");
    $("gRead").textContent = fmt(g, 2) + " m/s^2";
    $("errRead").textContent = fmt(P.percentError(g, 9.80), 2) + " %  (accepted 9.80)";
  }
  function currentClock() {
    if (!running) return lastClock;
    return (Date.now() - pressAt) / 1000;
  }
  var lastClock = 0;
  function stopRun(auto) {
    if (!running) return;
    running = false;
    var t = (Date.now() - pressAt) / 1000 + (mode === "fun" ? (Math.random() - 0.5) * 0.3 : 0);
    lastClock = t;
    runs.push(U.round(t, 3));
    if (runs.length > 5) runs.shift();
    LS.store.save(LAB, "runs", ["t10_s"], runs.map(function (r) { return [r]; }));
    logRow("pendulum t10 (L = " + LEN.toFixed(2) + " m)", fmt(t, 3), "s",
      fmt(t / 10, 3), "s per swing", "", "");
    pendRefresh();
    if (auto) {
      $("clockRead").textContent += "  (gate 10 stopped the clock)";
    }
  }
  $("startClock").addEventListener("click", function () {
    if (!swinging) { swinging = true; swingStart = Date.now(); }
    running = true; pressAt = Date.now();
    pressGateBase = gatesPassed(Date.now());
    gates = 0;
  });
  $("stopClock").addEventListener("click", function () { stopRun(false); });
  $("clearRuns").addEventListener("click", function () {
    runs = []; lastClock = 0; gates = 0; pressGateBase = 0; running = false;
    LS.store.clear(LAB, "runs");
    pendRefresh();
  });
  $("lenRange").addEventListener("input", function (ev) {
    LEN = parseFloat(ev.target.value);
    swinging = false; running = false; gates = 0; pressGateBase = 0;
    pendRefresh();
  });
  var dragD = false;
  cvD.addEventListener("pointerdown", function (ev) {
    var r = cvD.getBoundingClientRect();
    var rod = Math.min(cvD.height / dpr - 90, 220 * (LEN / 0.9));
    var th = thetaNow(Date.now());
    var bx = cvD.width / dpr * 0.5 + Math.sin(th) * rod;
    var by = 26 + Math.cos(th) * rod;
    if (Math.abs(ev.clientX - r.left - bx) < 24 && Math.abs(ev.clientY - r.top - by) < 24) {
      dragD = true; swinging = false;
      cvD.setPointerCapture(ev.pointerId);
    }
  });
  cvD.addEventListener("pointermove", function (ev) {
    if (!dragD) return;
    var r = cvD.getBoundingClientRect();
    var rod = Math.min(cvD.height / dpr - 90, 220 * (LEN / 0.9));
    var dx = (ev.clientX - r.left) - (cvD.width / dpr * 0.5);
    amp = U.clamp(Math.asin(U.clamp(dx / rod, -1, 1)), -0.45, 0.45);
  });
  cvD.addEventListener("pointerup", function () {
    if (!dragD) return;
    dragD = false;
    if (Math.abs(amp) < 0.05) amp = 0.2;
    swinging = true; swingStart = Date.now(); gates = 0;
  });
  $("exportCsv").addEventListener("click", function () {
    LS.store.exportCSV("phy110-lab1-pendulum.csv", ["t10_s"], runs.map(function (r) {
      return [r];
    }), $("csvCopy"));
  });

  // ---------- Bench E: build the conversion ----------
  var UNIT_GROUPS = [
    { dim: "length", units: ["mm", "cm", "m", "km", "in", "ft", "yd", "mi"] },
    { dim: "volume", units: ["mL", "L", "gal", "qt", "pt", "cup", "fl oz", "tbsp", "tsp", "ft3", "yd3"] },
    { dim: "mass", units: ["g", "kg", "oz", "lb", "ton"] },
    { dim: "force", units: ["N", "kgf", "lbf"] }
  ];
  var cvPath = null, dropped = [];
  function fillUnits(sel, dflt) {
    UNIT_GROUPS.forEach(function (grp) {
      var og = LS.ui.el("optgroup", { label: grp.dim });
      grp.units.forEach(function (u) { og.appendChild(LS.ui.el("option", { value: u, text: u })); });
      sel.appendChild(og);
    });
    sel.value = dflt;
  }
  fillUnits($("cvFrom"), "in");
  fillUnits($("cvTo"), "cm");
  function chipText(step, flip) {
    var k = flip ? 1 / step.k : step.k;
    var a = flip ? step.to : step.from, b = flip ? step.from : step.to;
    return k >= 1 || Math.abs((1 / k) * 100 - Math.round((1 / k) * 100)) > 1e-6
      ? "(" + (Math.round(k * 1e4) / 1e4) + " " + b + " / 1 " + a + ")"
      : "(1 " + b + " / " + (Math.round((1 / k) * 1e4) / 1e4) + " " + a + ")";
  }
  $("cvShow").addEventListener("click", function () {
    cvPath = P.convertPath($("cvFrom").value, $("cvTo").value);
    dropped = [];
    var strip = $("cvStrip");
    strip.innerHTML = "";
    if (!cvPath) {
      strip.appendChild(LS.ui.el("span", {
        class: "muted",
        text: "The course table has no route between those two units, so there is no " +
          "honest way to convert them here."
      }));
      renderWorkLine();
      return;
    }
    cvPath.steps.forEach(function (step, i) {
      [false, true].forEach(function (flip) {
        var b = LS.ui.el("button", {
          type: "button", "class": "factor-chip", text: chipText(step, flip),
          title: flip ? "the factor upside down" : "as the manual prints it"
        });
        b.addEventListener("click", function () {
          dropped = dropped.filter(function (d) { return d.i !== i; });
          dropped.push({ i: i, flip: flip, step: step });
          dropped.sort(function (a, b2) { return a.i - b2.i; });
          renderWorkLine();
        });
        strip.appendChild(b);
      });
    });
    renderWorkLine();
  });
  $("cvClearLine").addEventListener("click", function () { dropped = []; renderWorkLine(); });
  function renderWorkLine() {
    var value = parseFloat($("cvValue").value);
    var from = $("cvFrom").value, to = $("cvTo").value;
    if (!dropped.length || !isFinite(value)) {
      $("cvWork").textContent = isFinite(value) ? "nothing dropped yet" : "type a value first";
      $("cvAnswer").textContent = "-";
      return;
    }
    if (!cvPath) {
      $("cvWork").textContent = "no printed route between " + from + " and " + to;
      $("cvAnswer").textContent = "-";
      return;
    }
    var run = value, unitChain = from, text = trim(value) + " " + from;
    dropped.forEach(function (d) {
      var k = d.flip ? 1 / d.step.k : d.step.k;
      var a = d.flip ? d.step.to : d.step.from, b = d.flip ? d.step.from : d.step.to;
      text += " x " + chipText(d.step, d.flip);
      run = run * k;
      if (unitChain === a) unitChain = b;
      else if (unitChain === b) unitChain = a;
      else unitChain = "?";
    });
    $("cvWork").textContent = text;
    if (unitChain === "?") {
      $("cvAnswer").textContent = "the factors do not chain - drop them so each unit " +
        "cancels the one above it";
    } else if (unitChain === to) {
      $("cvAnswer").textContent = fmt(run, 4) + " " + to;
    } else {
      $("cvAnswer").textContent = "units left over are " + unitChain +
        ", not " + to + " - a factor is upside down";
    }
  }
  function trim(x) { return String(Math.round(x * 1e4) / 1e4); }
  $("cvLog").addEventListener("click", function () {
    var value = parseFloat($("cvValue").value);
    var from = $("cvFrom").value, to = $("cvTo").value;
    if (!isFinite(value) || !cvPath) return;
    var out = value * cvPath.factor;
    logRow("conversion", trim(value), from, fmt(out, 4), to, "", "");
  });

  // ---------- table controls ----------
  $("clearTable").addEventListener("click", function () {
    rows = [];
    LS.store.clear(LAB, "log");
    $("csvCopy").style.display = "none";
    renderTable();
  });
  $("exportLog").addEventListener("click", function () {
    LS.store.exportCSV("phy110-lab1-log.csv", HEADER, rows, $("csvCopy"));
  });

  // ---------- boot ----------
  var dpr = window.devicePixelRatio || 1;
  function resizeStages() {
    var w = Math.round(Math.max(300, (cvA.clientWidth || 480)) * dpr);
    [[cvA, 300], [cvB, 260], [cvC, 180], [cvD, 320]].forEach(function (pair) {
      pair[0].width = w; pair[0].height = Math.round(pair[1] * dpr);
    });
    drawAll();
  }
  function drawAll() { drawRulerBench(); drawCylBench(); drawPaceBench(); drawPendulum(); }
  function refreshAll() { refreshRulerReadouts(); refreshBenchB(); refreshPaceReadouts(); pendRefresh(); }
  window.addEventListener("resize", resizeStages);

  // keep the live stopwatch and the swinging bob moving
  setInterval(function () {
    if (running) $("clockRead").textContent = fmt((Date.now() - pressAt) / 1000, 3) + " s";
    var g = gatesPassed(Date.now()) - pressGateBase;
    if (running && swinging && g !== gates) {
      gates = Math.min(Math.max(g, 0), 10);
      $("gateRead").textContent = String(gates);
      if (gates >= 10) stopRun(true);
    }
    if (swinging || running) drawPendulum();
  }, 60);

  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (m) {
    mode = m; refreshAll(); drawAll();
  });
  LS.check.init(LAB);
  refreshAll();
  resizeStages();
})();
