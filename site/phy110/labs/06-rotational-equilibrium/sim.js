// PHY110 Lab 6 sim: the torque-balance bench. A meter stick on a pivot clamp,
// three clamp-and-hanger assemblies, 100 g and 50 g hook weights, an unknown
// object, a fine-adjust slider for X2, a triple-beam balance, and three parts:
// balance 100 g against 50 g, weigh the unknown against the known, and close
// the condition with a third clamp.
//
// The bench keeps the clamp mass in every torque it checks, shows the stick's
// own balance point in the drawer, and treats a 1-3 % torque gap as level -
// the eye judges level within a millimetre or two. Fun Mode moves the
// stick's own balance point off 50 cm, jitters the triple-beam by +-1 g, and
// lets the stick wobble while it settles. Fun Mode never changes g or any
// course value.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units, T = LS.torque;
  var LAB = "06-rotational-equilibrium";
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
  var STICK_Y = 205, STICK_H = 12, FLOOR = 372;
  var TILT_FULL = 0.15;   // N m of net torque for full tilt
  var TILT_MAX = 0.05;    // rad
  var STICK_G = 150;      // the stick's own mass, uniform
  var cv = $("stickCanvas"), cx = cv.getContext("2d");
  var dpr = window.devicePixelRatio || 1;

  // ---------- apparatus state ----------
  var X1 = T.X1;
  var part = 1;
  var x0 = T.X0;
  var clampG = T.CLAMP_G;
  var x2 = 0.80;
  var d3 = T.PART3.d3;
  var thirdW = [];
  var clampShown = T.CLAMP_G;   // what the triple-beam shows for the clamp
  var unknownShown = 135;       // what the triple-beam shows for the unknown
  var weighVal = null;          // last triple-beam reading, g
  var part2Weighed = null;      // measured M_u for table 2, g
  var logged = { part1: null, part2: null, part3: null };
  var flash = null;

  function leftHookG() { return part === 2 ? unknownShown : T.PART1_LEFT_G; }
  function rightHookG() { return part === 2 ? T.PART2_KNOWN_G : T.PART1_RIGHT_G; }
  function thirdOn() { return part === 3; }
  function thirdMassG() { return clampG + sum(thirdW); }

  // ---------- torques ----------
  function d1Now() { return x0 - X1; }
  function d2Now() { return x2 - x0; }
  function tauCcw() { return T.forceN(clampG + leftHookG()) * d1Now(); }
  function tauCw() {
    var t = T.forceN(clampG + rightHookG()) * d2Now();
    if (thirdOn()) t += T.forceN(thirdMassG()) * d3;
    return t;
  }
  // the stick's own weight: positive tilts the left side down (ccw)
  function stickSelf() {
    var com = mode === "fun" ? T.FUN_X0 : T.X0;
    return T.forceN(STICK_G) * (com - x0);
  }
  function netNow() { return tauCcw() + stickSelf() - tauCw(); }
  function tiltAngle() {
    var a = -U.clamp(netNow(), -TILT_FULL, TILT_FULL) / TILT_FULL * TILT_MAX;
    if (mode === "fun") a += 0.004 * Math.sin(Date.now() / 400);
    return a;
  }
  function pctNow() { return T.pctDiff(tauCcw(), tauCw()); }

  // ---------- persistence ----------
  function saveState() {
    LS.store.save(LAB, "state", ["state"], [[JSON.stringify({
      part: part, x0: x0, clampG: clampG, x2: x2, d3: d3, thirdW: thirdW,
      clampShown: clampShown, unknownShown: unknownShown,
      weighVal: weighVal, part2Weighed: part2Weighed, logged: logged
    })]]);
    LS.store.save(LAB, "log", CSV_HEADER, csvRows());
  }
  function loadState() {
    try {
      var got = LS.store.load(LAB, "state");
      if (!got || !got.rows || !got.rows.length) return;
      var st = JSON.parse(got.rows[0][0]);
      part = st.part || 1; x0 = st.x0; clampG = st.clampG;
      x2 = st.x2; d3 = st.d3; thirdW = st.thirdW || [];
      clampShown = st.clampShown; unknownShown = st.unknownShown;
      weighVal = st.weighVal; part2Weighed = st.part2Weighed;
      logged = st.logged || { part1: null, part2: null, part3: null };
    } catch (e) {}
  }

  // ---------- geometry helpers ----------
  function geom() {
    var w = cv.width / dpr;
    var scale = Math.min((w - 120) / 1.0, 640);
    return { w: w, scale: scale, left0: (w - scale) / 2 };
  }
  function markPx(g, m) { return g.left0 + m * g.scale; }

  // ---------- readouts ----------
  function noteNow() {
    if (flash && Date.now() < flash.until) return flash.text;
    if (part === 1) return "slide X2 until the stick reads level, then Log Part I";
    if (part === 2) return "weigh the unknown, then Log Part II and compare the two M_u numbers";
    return "slide d3 and add weights until level with all three clamps, then Log Part III";
  }
  function refreshReadouts() {
    $("marksRead").textContent = "X0 " + fmt(x0, 3) + " / X2 " + fmt(x2, 3) +
      (thirdOn() ? " / d3 " + fmt(d3, 3) : "");
    $("torqueRead").textContent = fmt(tauCcw(), 3) + " / " + fmt(tauCw(), 3);
    var p = pctNow();
    $("pctRead").textContent = isFinite(p) ? fmt(p, 1) + " %" : "-";
    var lvl = T.isLevel(tauCcw(), tauCw());
    $("levelRead").textContent = lvl ? "LEVEL (within " + T.LEVEL_OK_PCT + " %)" :
      (netNow() > 0 ? "tilts left" : "tilts right");
    $("weighRead").textContent = weighVal === null ? "not weighed yet" :
      fmt(weighVal, 0) + " g" + (mode === "fun" ? EST : "");
    $("x2Slide").value = x2;
    $("d3Slide").value = d3;
    $("pivotX0").value = x0;
    $("clampMass").value = clampG;
    $("partBtn1").className = part === 1 ? "action" : "action ghost";
    $("partBtn2").className = part === 2 ? "action" : "action ghost";
    $("partBtn3").className = part === 3 ? "action" : "action ghost";
    $("noteRead").textContent = noteNow();
  }

  // ---------- drawing ----------
  function drawWeight(x, y, label, big) {
    cx.fillStyle = big ? "#c8d2e0" : "#b4c0d2";
    cx.beginPath(); cx.ellipse(x, y, big ? 15 : 11, big ? 9 : 7, 0, 0, 6.29); cx.fill();
    cx.strokeStyle = "#7d8ea6"; cx.lineWidth = 1; cx.stroke();
    cx.fillStyle = "#1c2434"; cx.font = (big ? "10px" : "8.5px") + " ui-monospace, monospace";
    cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillText(label, x, y + 0.5);
  }
  function drawClampAt(lx, hookG, label, unknown, color) {
    // clamp block on top of the stick (in rotated stick coords)
    cx.fillStyle = color;
    cx.fillRect(lx - 9, -STICK_H / 2 - 9, 18, 9);
    cx.strokeStyle = "#dce6f5"; cx.lineWidth = 1;
    cx.strokeRect(lx - 9, -STICK_H / 2 - 9, 18, 9);
    // hanger line
    cx.strokeStyle = "#e8eefb"; cx.lineWidth = 1.6;
    cx.beginPath(); cx.moveTo(lx, STICK_H / 2); cx.lineTo(lx, STICK_H / 2 + 16); cx.stroke();
    if (unknown) {
      cx.fillStyle = "#9aa7bb";
      cx.fillRect(lx - 13, STICK_H / 2 + 16, 26, 20);
      cx.strokeStyle = "#dce6f5"; cx.strokeRect(lx - 13, STICK_H / 2 + 16, 26, 20);
      cx.fillStyle = "#1c2434"; cx.font = "9px ui-monospace, monospace";
      cx.textAlign = "center"; cx.textBaseline = "middle";
      cx.fillText(label, lx, STICK_H / 2 + 26);
    } else {
      drawWeight(lx, STICK_H / 2 + 25, label, hookG >= 100);
    }
  }
  function drawBench() {
    var g = geom();
    var w = g.w;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, w, 460);
    cx.fillStyle = "#0d1526"; cx.fillRect(0, 0, w, 460);

    var a = tiltAngle();
    var pivX = markPx(g, x0);

    // floor + stand
    cx.fillStyle = "#1b2740"; cx.fillRect(0, FLOOR, w, 460 - FLOOR);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1.5;
    cx.beginPath(); cx.moveTo(0, FLOOR); cx.lineTo(w, FLOOR); cx.stroke();
    cx.fillStyle = "#3a4d74";
    cx.fillRect(pivX - 7, STICK_Y + 36, 14, FLOOR - STICK_Y - 36);
    cx.fillRect(pivX - 46, FLOOR - 8, 92, 8);
    // pivot post + knob (draggable in Fun Mode)
    cx.fillStyle = mode === "fun" ? "#ffd166" : "#8fa3c4";
    cx.fillRect(pivX - 4, STICK_Y + 12, 8, 26);
    cx.beginPath(); cx.arc(pivX, STICK_Y + 12, 6, 0, 6.29); cx.fill();

    // stick, rotated about the pivot; local x of a mark m is (m - x0) * scale
    cx.save();
    cx.translate(pivX, STICK_Y);
    cx.rotate(a);
    var lx0 = g.left0 - pivX;
    cx.fillStyle = "#d9b98a";
    cx.fillRect(lx0, -STICK_H / 2, g.scale, STICK_H);
    cx.strokeStyle = "#8a6f45"; cx.lineWidth = 1;
    cx.strokeRect(lx0, -STICK_H / 2, g.scale, STICK_H);
    for (var cm = 0; cm <= 100; cm += 1) {
      var tx = lx0 + (cm / 100) * g.scale;
      var long = cm % 10 === 0;
      cx.strokeStyle = long ? "#3a2f1c" : "#8a6f45";
      cx.beginPath(); cx.moveTo(tx, -STICK_H / 2); cx.lineTo(tx, long ? 2 : -1); cx.stroke();
    }
    cx.fillStyle = "#3a2f1c"; cx.font = "8.5px ui-monospace, monospace";
    cx.textAlign = "center"; cx.textBaseline = "top";
    for (var dcm = 0; dcm <= 100; dcm += 10) {
      cx.fillText(String(dcm), lx0 + (dcm / 100) * g.scale, STICK_H / 2 + 1.5);
    }
    // bubble level at the 50 cm mark
    var blx = lx0 + 0.5 * g.scale;
    cx.fillStyle = "#0d1526";
    cx.fillRect(blx - 13, -5, 26, 7);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1;
    cx.strokeRect(blx - 13, -5, 26, 7);
    var bub = U.clamp(-a * 500, -9, 9);
    cx.fillStyle = "#8fd3ff";
    cx.beginPath(); cx.arc(blx + bub, -1.5, 2.6, 0, 6.29); cx.fill();

    // clamps: left at the printed X1, right at x2, third at x0 + d3
    drawClampAt((X1 - x0) * g.scale, T.PART1_LEFT_G,
      part === 2 ? "unknown" : String(T.PART1_LEFT_G), part === 2, "#8fa3c4");
    drawClampAt((x2 - x0) * g.scale, rightHookG(), String(rightHookG()), false, "#8fa3c4");
    if (thirdOn()) {
      drawClampAt(d3 * g.scale, sum(thirdW),
        sum(thirdW) ? String(sum(thirdW)) : "clamp", false, "#b48ad2");
    }
    cx.restore();

    // labels under the bench
    cx.fillStyle = "#9fb4d8"; cx.font = "10px system-ui, sans-serif";
    cx.textAlign = "left"; cx.textBaseline = "top";
    cx.fillText("pivot X0 = " + fmt(x0, 3) + " m" +
      (mode === "fun" ? "  (drag the knob to find it)" : ""), 10, STICK_Y + 46);
    cx.fillText("left clamp X1 = " + fmt(X1, 2) + " m" +
      (part === 2 ? "  unknown object" : "  " + T.PART1_LEFT_G + " g"), 10, STICK_Y + 60);
    drawBalance();
  }
  function drawBalance() {
    // triple-beam balance, lower left of the canvas
    var bx = 12, by = FLOOR + 6, bw = 230, bh = 78;
    cx.fillStyle = "#23324e";
    cx.fillRect(bx, by, bw, bh);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1;
    cx.strokeRect(bx, by, bw, bh);
    cx.fillStyle = "#9fb4d8"; cx.font = "10px system-ui, sans-serif";
    cx.textAlign = "left"; cx.textBaseline = "top";
    var target = part === 2 ? "unknown object" : "clamp + hanger";
    cx.fillText("triple-beam balance  -  pan: " + target, bx + 8, by + 5);
    var v = weighVal;
    for (var b = 0; b < 3; b++) {
      var yy = by + 26 + b * 16;
      cx.strokeStyle = "#4a5f8a"; cx.lineWidth = 3;
      cx.beginPath(); cx.moveTo(bx + 14, yy); cx.lineTo(bx + 150, yy); cx.stroke();
      // rider ticks along the beam
      cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1;
      for (var t = 0; t <= 10; t++) {
        var tx = bx + 14 + t * 13.6;
        cx.beginPath(); cx.moveTo(tx, yy - 3); cx.lineTo(tx, yy + 3); cx.stroke();
      }
      // the rider sits at the reading's digit place: hundreds, tens, ones
      var digit = 0;
      if (v !== null) {
        digit = b === 0 ? Math.min(9, Math.floor(v / 100))
          : b === 1 ? Math.floor((v % 100) / 10)
            : Math.floor(v % 10);
      }
      var rx = bx + 14 + digit * 13.6;
      cx.fillStyle = "#ffd166";
      cx.fillRect(rx - 4, yy - 5, 8, 10);
    }
    cx.fillStyle = v === null ? "#6d84ad" : "#ffd166";
    cx.font = "12px ui-monospace, monospace"; cx.textAlign = "right";
    cx.fillText(v === null ? "reading: -" : "reading: " + v + " g", bx + bw - 8, by + bh - 16);
  }

  // ---------- parts ----------
  function setPart(n) {
    part = n;
    thirdW = [];
    weighVal = null;
    if (n === 1) { x2 = 0.80; d3 = T.PART3.d3; }
    if (n === 2) { x2 = T.X0 + T.PART3.rightD; }
    if (n === 3) { x2 = T.X0 + T.PART3.rightD; d3 = T.PART3.d3; }
    part2Weighed = null;
    flash = {
      text: n === 1 ? "Part I: 100 g at 0.30 m, find X2 for the 50 g side" :
        n === 2 ? "Part II: the unknown takes the left hook; the known 100 g sits at d2 = 0.25 m" :
          "Part III: the third clamp is on - slide d3 and add weights",
      until: Date.now() + 4000
    };
    refreshAll();
    saveState();
  }
  function resetPart() {
    weighVal = null; part2Weighed = null; thirdW = [];
    if (part === 1) x2 = 0.80;
    if (part === 2) { x2 = T.X0 + T.PART3.rightD; }
    if (part === 3) { x2 = T.X0 + T.PART3.rightD; d3 = T.PART3.d3; }
    flash = { text: "part reset", until: Date.now() + 2000 };
    refreshAll();
    saveState();
  }

  // ---------- weighing ----------
  function weigh() {
    if (mode === "fun" && weighVal === null) {
      clampShown = Math.round(T.CLAMP_G + rand(-T.WEIGH_JITTER_G, T.WEIGH_JITTER_G));
      unknownShown = 135 + Math.round(rand(-2, 2));
    }
    if (part === 2) {
      weighVal = unknownShown;
      part2Weighed = unknownShown;
      flash = { text: "the unknown weighs " + weighVal + " g - compare it with the M_u the bench computes",
        until: Date.now() + 5000 };
    } else {
      weighVal = clampShown;
      flash = { text: "the clamp + hanger weighs " + weighVal + " g - keep that mass in every torque",
        until: Date.now() + 4000 };
    }
    refreshAll();
    saveState();
  }

  // ---------- logging ----------
  function logPart1() {
    logged.part1 = {
      clamp: clampG, x0: x0, x2: x2,
      m1t: clampG + T.PART1_LEFT_G, m2t: clampG + T.PART1_RIGHT_G,
      d1: d1Now(), d2: d2Now(),
      tau1: tauCcw(), tau2: T.forceN(clampG + T.PART1_RIGHT_G) * d2Now()
    };
    flash = { text: "Part I logged - the footer shows the percent difference", until: Date.now() + 3500 };
    refreshAll(); saveState();
  }
  function logPart2() {
    if (part2Weighed === null) {
      flash = { text: "weigh the unknown on the triple-beam first", until: Date.now() + 3500 };
      refreshReadouts();
      return;
    }
    logged.part2 = {
      measuredG: part2Weighed, x1: X1, d1: d1Now(), mkG: T.PART2_KNOWN_G,
      x2: x2, d2: d2Now()
    };
    flash = { text: "Part II logged - compare measured M_u with the computed one", until: Date.now() + 4000 };
    refreshAll(); saveState();
  }
  function logPart3() {
    logged.part3 = {
      m3g: thirdMassG(), d3: d3, d2: d2Now(),
      leftG: clampG + T.PART1_LEFT_G, rightG: clampG + T.PART1_RIGHT_G
    };
    flash = { text: "Part III logged - the condition is written out under the sheet", until: Date.now() + 4000 };
    refreshAll(); saveState();
  }
  function computedMu() { return T.unknownMassG(T.PART2_KNOWN_G, clampG, d1Now(), d2Now()); }

  // ---------- data tables ----------
  var CSV_HEADER = ["table", "row", "value", "value 2"];
  function table1Rows() {
    var l = logged.part1;
    if (!l) return [["quantity", "left side", "right side"], ["not logged yet", "-", "-"]];
    var rows = [["quantity", "left side", "right side"]];
    rows.push(["clamp + hanger (g)", String(l.clamp), String(l.clamp)]);
    rows.push(["hook weight (g)", String(T.PART1_LEFT_G), String(T.PART1_RIGHT_G)]);
    rows.push(["M_T (g)", String(l.m1t), String(l.m2t)]);
    rows.push(["M_T (kg)", fmt(l.m1t / 1000, 3), fmt(l.m2t / 1000, 3)]);
    rows.push(["X (m)", fmt(l.x0 - l.d1, 3), fmt(l.x0 + l.d2, 3)]);
    rows.push(["F (N)", fmt(T.forceN(l.m1t), 3), fmt(T.forceN(l.m2t), 3)]);
    rows.push(["d (m)", fmt(l.d1, 3), fmt(l.d2, 3)]);
    rows.push(["tau (N m)", fmt(l.tau1, 3), fmt(l.tau2, 3)]);
    var p = T.pctDiff(l.tau1, l.tau2);
    rows.push(["% difference of the two torques", isFinite(p) ? fmt(p, 1) + " %" : "-",
      "on the bigger torque"]);
    return rows;
  }
  function table2Rows() {
    var l = logged.part2;
    if (!l) return [["quantity", "value"], ["not logged yet", "-"]];
    var mu = computedMuAt(l);
    var p = T.pctDiff(l.measuredG, mu);
    return [["quantity", "value"],
      ["M_u measured (kg)", fmt(l.measuredG / 1000, 3)],
      ["X1 (m)", fmt(l.x1, 3)],
      ["d1 (m)", fmt(l.d1, 3)],
      ["M_k (kg)", fmt(l.mkG / 1000, 3)],
      ["X2 (m)", fmt(l.x2, 3)],
      ["d2 (m)", fmt(l.d2, 3)],
      ["M_u computed (g)", fmt(mu, 1)],
      ["% difference (measured vs computed)", isFinite(p) ? fmt(p, 1) + " %" : "-"]];
  }
  function computedMuAt(l) {
    return T.unknownMassG(l.mkG, clampG, l.d1, l.d2);
  }
  function table3Rows() {
    var l = logged.part3;
    if (!l) return [["quantity", "value"], ["not logged yet", "-"]];
    var tccw = T.forceN(l.leftG) * l.d1;
    var tcw = T.forceN(l.rightG) * l.d2;
    var t3 = T.forceN(l.m3g) * l.d3;
    var cond = fmt(l.leftG, 0) + " g x " + fmt(l.d1, 2) + " m = " + fmt(l.rightG, 0) +
      " g x " + fmt(l.d2, 2) + " m + " + fmt(l.m3g, 0) + " g x " + fmt(l.d3, 2) + " m (in gram-metres)";
    var p = T.pctDiff(tccw, tcw + t3);
    return [["quantity", "value"],
      ["m3 total (kg)", fmt(l.m3g / 1000, 3)],
      ["d3 (m)", fmt(l.d3, 3)],
      ["condition", cond],
      ["tau ccw (N m)", fmt(tccw, 3)],
      ["tau cw, two clamps (N m)", fmt(tcw, 3)],
      ["tau from the third clamp (N m)", fmt(t3, 3)],
      ["% difference (ccw vs cw total)", isFinite(p) ? fmt(p, 1) + " %" : "-"]];
  }
  function csvRows() {
    var rows = [];
    table1Rows().slice(1).forEach(function (r) { rows.push(["part 1", r[0], r[1], r[2] || ""]); });
    table2Rows().slice(1).forEach(function (r) { rows.push(["part 2", r[0], r[1], ""]); });
    table3Rows().slice(1).forEach(function (r) { rows.push(["part 3", r[0], r[1], ""]); });
    return rows;
  }
  function renderTables() {
    $("table1").innerHTML = LS.store.tableHTML(["quantity", "left side", "right side"], table1Rows());
    $("table2").innerHTML = LS.store.tableHTML(["quantity", "value"], table2Rows());
    $("table3").innerHTML = LS.store.tableHTML(["quantity", "value"], table3Rows());
    renderWorkBox();
  }
  function renderWorkBox() {
    var lines = ["g = 9.80 m/s^2 (course value); the clamps ride in every torque"];
    lines.push("d1 = X0 - X1 = " + fmt(x0, 3) + " - " + fmt(X1, 2) + " = " + fmt(d1Now(), 3) +
      " m;  d2 = X2 - X0 = " + fmt(d2Now(), 3) + " m");
    if (part === 2) {
      lines.push("M_u = (M_k + M_c) x d2/d1 - M_c = (" + T.PART2_KNOWN_G + " + " + clampG +
        ") x " + fmt(d2Now() / d1Now(), 3) + " - " + clampG + " = " + fmt(computedMu(), 1) + " g");
    }
    if (part === 3) {
      lines.push("condition: " + (clampG + T.PART1_LEFT_G) + " g x " + fmt(d1Now(), 2) +
        " m = " + (clampG + T.PART1_RIGHT_G) + " g x " + fmt(d2Now(), 2) + " m + " +
        thirdMassG() + " g x " + fmt(d3, 2) + " m");
    }
    lines.push("tau ccw = " + fmt(tauCcw(), 3) + " N m;  tau cw = " + fmt(tauCw(), 3) +
      " N m;  percent difference = " + fmt(pctNow(), 1) + " %");
    lines.push("stick's own torque = " + fmt(stickSelf(), 4) +
      " N m (" + (mode === "fun" ? "the stick's balance point sits at 0.497 m" :
        "the stick is uniform about 0.50 m") + ")");
    $("workBox").textContent = lines.join("\n");
  }
  function refreshAll() {
    refreshReadouts();
    renderTables();
    drawBench();
  }

  // ---------- controls ----------
  $("partBtn1").addEventListener("click", function () { setPart(1); });
  $("partBtn2").addEventListener("click", function () { setPart(2); });
  $("partBtn3").addEventListener("click", function () { setPart(3); });
  $("resetPart").addEventListener("click", resetPart);
  $("pivotX0").addEventListener("change", function () {
    x0 = U.clamp(parseFloat(this.value) || T.X0, 0.10, 0.90);
    this.value = x0;
    refreshAll(); saveState();
  });
  $("clampMass").addEventListener("change", function () {
    clampG = Math.max(0, parseFloat(this.value) || 0);
    this.value = clampG;
    refreshAll(); saveState();
  });
  $("x2Slide").addEventListener("input", function () {
    x2 = U.clamp(parseFloat(this.value) || 0.80, x0 + 0.02, 0.99);
    refreshAll();
  });
  $("x2Slide").addEventListener("change", function () { saveState(); });
  $("d3Slide").addEventListener("input", function () {
    d3 = U.clamp(parseFloat(this.value) || 0.10, 0.05, 0.98 - Math.max(x0, x2));
    refreshAll();
  });
  $("d3Slide").addEventListener("change", function () { saveState(); });
  function addW(g) {
    if (!thirdOn()) {
      flash = { text: "the third clamp only exists in Part III", until: Date.now() + 3000 };
      refreshReadouts();
      return;
    }
    if (thirdW.length >= 5) {
      flash = { text: "five weights is enough for this hanger", until: Date.now() + 3000 };
      refreshReadouts();
      return;
    }
    thirdW.push(g);
    flash = { text: "+" + g + " g on the third hanger - total " + thirdMassG() + " g",
      until: Date.now() + 2500 };
    refreshAll(); saveState();
  }
  $("w10").addEventListener("click", function () { addW(10); });
  $("w20").addEventListener("click", function () { addW(20); });
  $("w50").addEventListener("click", function () { addW(50); });
  $("wTake").addEventListener("click", function () {
    if (!thirdW.length) return;
    thirdW.pop();
    flash = { text: "a weight off the third hanger - total " + thirdMassG() + " g",
      until: Date.now() + 2500 };
    refreshAll(); saveState();
  });
  $("weighBtn").addEventListener("click", weigh);
  $("logBtn1").addEventListener("click", logPart1);
  $("logBtn2").addEventListener("click", logPart2);
  $("logBtn3").addEventListener("click", logPart3);
  $("clearTable").addEventListener("click", function () {
    logged = { part1: null, part2: null, part3: null };
    part2Weighed = null; weighVal = null;
    LS.store.clear(LAB, "log");
    $("csvCopy").style.display = "none";
    flash = { text: "logs cleared", until: Date.now() + 2000 };
    refreshAll(); saveState();
  });
  $("exportLog").addEventListener("click", function () {
    LS.store.exportCSV("phy110-lab6-torque.csv", CSV_HEADER, csvRows(), $("csvCopy"));
  });

  // ---------- dragging: clamps and the pivot ----------
  var drag = null;   // "x2" | "d3" | "pivot"
  function stickMarkAt(px, py) {
    var g = geom();
    var a = tiltAngle();
    var pivX = markPx(g, x0);
    var dx = px - pivX, dy = py - STICK_Y;
    var lx = dx * Math.cos(-a) - dy * Math.sin(-a);
    var ly = dx * Math.sin(-a) + dy * Math.cos(-a);
    if (Math.abs(ly) > 40) return null;
    return x0 + lx / g.scale;
  }
  cv.addEventListener("pointerdown", function (ev) {
    var r = cv.getBoundingClientRect();
    var px = ev.clientX - r.left, py = ev.clientY - r.top;
    var m = stickMarkAt(px, py);
    if (m === null) return;
    if (mode === "fun" && Math.abs(m - x0) < 0.02) {
      drag = "pivot";
    } else if (Math.abs(m - x2) < 0.02) {
      drag = "x2";
    } else if (thirdOn() && Math.abs(m - (x0 + d3)) < 0.02) {
      drag = "d3";
    } else if (Math.abs(m - X1) < 0.02) {
      flash = { text: "the left clamp stays at the printed X1 = 0.30 m", until: Date.now() + 3000 };
      refreshReadouts();
      return;
    } else {
      return;
    }
    cv.setPointerCapture(ev.pointerId);
  });
  cv.addEventListener("pointermove", function (ev) {
    if (!drag) return;
    var r = cv.getBoundingClientRect();
    var px = ev.clientX - r.left, py = ev.clientY - r.top;
    var m = stickMarkAt(px, py);
    if (m === null) return;
    if (drag === "pivot") {
      x0 = U.clamp(m, 0.10, 0.90);
    } else if (drag === "x2") {
      x2 = U.clamp(m, x0 + 0.02, 0.99);
    } else {
      d3 = U.clamp(m - x0, 0.05, 0.98 - Math.max(x0, x2));
    }
    refreshAll();
  });
  cv.addEventListener("pointerup", function () {
    if (drag) saveState();
    drag = null;
  });
  cv.addEventListener("pointercancel", function () { drag = null; });

  // ---------- boot ----------
  function resizeStages() {
    var w = Math.round(Math.max(360, (cv.clientWidth || 480)) * dpr);
    cv.width = w; cv.height = Math.round(460 * dpr);
    drawBench();
  }
  window.addEventListener("resize", resizeStages);

  setInterval(function () {
    if (flash && Date.now() >= flash.until) { flash = null; refreshReadouts(); }
    if (mode === "fun") drawBench();
  }, 60);

  loadState();
  if (mode === "fun" && weighVal === null) {
    clampShown = Math.round(T.CLAMP_G + rand(-T.WEIGH_JITTER_G, T.WEIGH_JITTER_G));
    unknownShown = 135 + Math.round(rand(-2, 2));
  }
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (m) {
    mode = m;
    if (mode === "fun" && weighVal === null) {
      clampShown = Math.round(T.CLAMP_G + rand(-T.WEIGH_JITTER_G, T.WEIGH_JITTER_G));
      unknownShown = 135 + Math.round(rand(-2, 2));
    }
    refreshAll();
  });
  LS.check.init(LAB);
  refreshAll();
  resizeStages();
})();
