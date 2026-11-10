// PHY110 Lab 7 sim: the Archimedes bench. A 50 mL graduated cylinder with
// coarse 1 mL graduations, three hooked metal cylinders stamped Cu/T/Z, a
// triple-beam balance with a grams-to-kg cell, and the unusual apparent-mass
// rig: a quarter-full 250 mL beaker on the pan, tared, with the cylinder
// hanging fully submerged from a wire off the balance frame.
//
// Two routes are graded against each other: the volume route (the level
// rise) and the weight route (true weight minus apparent weight). The
// cylinder reads to about 1 mL, so a 2.5 mL object carries a ~20 % slip and
// double-digit percent differences between the routes are the honest result.
// Fun Mode adds +-0.05 g balance jitter, the wire's 0.10 mL, and bubbles
// that must be tapped out. Fun Mode never changes g, the densities, or any
// course value.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units, A = LS.archimedes;
  var LAB = "07-archimedes";
  var $ = function (id) { return document.getElementById(id); };
  var mode = LS.ui.getMode(LAB);
  var EST = "  (instrument estimate)";

  function fmt(x, d) {
    if (!isFinite(x)) return "-";
    return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  }
  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
  function round2(x) { return Math.round(x * 100) / 100; }

  // ---------- bench geometry (css px) ----------
  var FLOOR = 470, CANVAS_H = 520;
  var CYL = { x0: 60, x1: 140, top: 120, base: 462, mlPx: 6.4 }; // 50 mL span
  var ZOOM = { x: 215, y: 140, r: 58 };
  var SHELF_Y = 430;
  var BAL = { x0: 500, x1: 745, beamY: 170, panY: 300 };
  var cv = $("benchCanvas"), cx = cv.getContext("2d");
  var dpr = window.devicePixelRatio || 1;

  // ---------- apparatus state ----------
  var mat = "Cu";
  var vWater = 25;            // mL, the pour slider (1 mL steps, like real pouring)
  var inCyl = false;          // the cylinder is lowered into the graduated cylinder
  var balMode = "air";        // "air" | "beaker"
  var beakerOn = false;
  var tared = false;
  var inBeaker = false;
  var BEAKER_WATER_G = 60;    // about a quarter of the 250 mL beaker
  var BEAKER_GLASS_G = 50;    // the sim's own beaker mass
  var logged = { Cu: null, Sn: null, Zn: null };
  var flash = null;
  // Fun Mode instruments, generated once per session (stable while reading)
  var fun = { mAir: {}, mApp: {}, bubblesMl: 0 };
  function trueMassG(sym) { return A.massG(sym, A.OBJECTS[sym]); }
  function trueAppG(sym) { return A.apparentMassG(trueMassG(sym), A.OBJECTS[sym]); }
  function genFun() {
    fun = { mAir: {}, mApp: {}, bubblesMl: round2(rand(0.05, A.BUBBLE_MAX_ML)) };
    for (var i = 0; i < A.MATERIALS.length; i++) {
      var s = A.MATERIALS[i];
      fun.mAir[s] = round2(trueMassG(s) + rand(-A.WEIGH_JITTER_G, A.WEIGH_JITTER_G));
      fun.mApp[s] = round2(trueAppG(s) + rand(-A.WEIGH_JITTER_G, A.WEIGH_JITTER_G));
    }
  }

  // ---------- the honest readings ----------
  function mAirRead() {
    if (mode === "fun") return fun.mAir[mat];
    return round2(trueMassG(mat));
  }
  function mAppRead() {
    if (mode === "fun") return fun.mApp[mat];
    return round2(trueAppG(mat));
  }
  function levelTrue() {
    var lv = vWater + (inCyl ? A.OBJECTS[mat] : 0);
    if (inCyl && mode === "fun") lv += A.WIRE_ML + fun.bubblesMl;
    return lv;
  }
  // the graduated cylinder reads to about 1 mL, in both modes
  function levelRead() { return A.readMl(levelTrue()); }
  function vOReadMl() { return inCyl ? levelRead() - vWater : NaN; }
  function balanceG() {
    if (balMode === "air") return mAirRead();
    if (!beakerOn) return 0;
    if (!tared) return round2(BEAKER_GLASS_G + BEAKER_WATER_G);
    if (!inBeaker) return 0;
    return mAppRead();
  }
  function fbVolN() {
    var v = vOReadMl();
    return isFinite(v) ? A.buoyantFromMl(v) : NaN;
  }
  function fbWtN() {
    if (balMode !== "beaker" || !tared || !inBeaker) return NaN;
    return A.buoyantFromWeightN(mAirRead(), mAppRead());
  }
  function pctNow() {
    var a = fbVolN(), b = fbWtN();
    return A.pctDiffMean(a, b);
  }

  // ---------- persistence ----------
  function saveState() {
    LS.store.save(LAB, "state", ["state"], [[JSON.stringify({
      mat: mat, vWater: vWater, inCyl: inCyl, balMode: balMode,
      beakerOn: beakerOn, tared: tared, inBeaker: inBeaker,
      logged: logged, mode: mode
    })]]);
    LS.store.save(LAB, "log", CSV_HEADER, csvRows());
  }
  function loadState() {
    try {
      var got = LS.store.load(LAB, "state");
      if (!got || !got.rows || !got.rows.length) return;
      var st = JSON.parse(got.rows[0][0]);
      mat = st.mat || "Cu"; vWater = st.vWater || 25; inCyl = !!st.inCyl;
      balMode = st.balMode || "air"; beakerOn = !!st.beakerOn;
      tared = !!st.tared; inBeaker = !!st.inBeaker;
      logged = st.logged || { Cu: null, Sn: null, Zn: null };
    } catch (e) {}
  }

  // ---------- readouts ----------
  function noteNow() {
    if (flash && Date.now() < flash.until) return flash.text;
    if (balMode === "beaker") {
      if (!beakerOn) return "put the beaker on the pan";
      if (!tared) return "tare the pan, then lower the cylinder into the beaker";
      if (!inBeaker) return "lower the cylinder into the beaker for the apparent mass";
      return "apparent mass on the scale - log this metal when Part I is done too";
    }
    if (!inCyl) return "lower the cylinder into the graduated cylinder to read the level";
    return "level read to 1 mL - work Part II, then log this metal";
  }
  function refreshReadouts() {
    var lv = levelRead();
    $("levelRead").textContent = "V_water " + vWater + " / V_water+cyl " +
      (inCyl ? lv : "-") + " / V_o " + (isFinite(vOReadMl()) ? fmt(vOReadMl(), 1) : "-") + " mL";
    var bg = balanceG();
    $("massRead").textContent = (balMode === "air" ? "in air " : "beaker ") + fmt(bg, 2) +
      " g  /  " + fmt(bg / 1000, 5) + " kg" + (mode === "fun" ? EST : "");
    $("fbRead").textContent = fmt(fbVolN(), 4) + " / " + fmt(fbWtN(), 4);
    var p = pctNow();
    $("pctRead").textContent = isFinite(p) ? fmt(p, 1) + " %" : "-";
    $("accRead").textContent = fmt(A.accepted.fbN, 4) + " N (V_o = " + fmt(A.accepted.vMl, 2) + " mL)";
    $("pourSlider").value = vWater;
    $("matCu").className = mat === "Cu" ? "action" : "action ghost";
    $("matT").className = mat === "Sn" ? "action" : "action ghost";
    $("matZ").className = mat === "Zn" ? "action" : "action ghost";
    $("lowerCylBtn").textContent = inCyl ? "Raise from cylinder" : "Lower into cylinder";
    $("balAirBtn").className = balMode === "air" ? "action" : "action ghost";
    $("balBeakerBtn").className = balMode === "beaker" ? "action" : "action ghost";
    $("lowerBeakerBtn").textContent = inBeaker ? "Raise from beaker" : "Lower into beaker";
    $("noteRead").textContent = noteNow();
  }

  // ---------- drawing ----------
  function drawCylinder() {
    var x0 = CYL.x0, x1 = CYL.x1;
    // glass body
    cx.fillStyle = "rgba(159,180,216,0.10)";
    cx.fillRect(x0, CYL.top, x1 - x0, CYL.base - CYL.top + 8);
    cx.strokeStyle = "#9fb4d8"; cx.lineWidth = 1.5;
    cx.strokeRect(x0, CYL.top, x1 - x0, CYL.base - CYL.top + 8);
    // water
    var lv = levelTrue();
    var yTop = CYL.base - lv * CYL.mlPx;
    cx.fillStyle = "rgba(101,160,220,0.55)";
    cx.fillRect(x0 + 2, yTop, x1 - x0 - 4, CYL.base + 6 - yTop);
    // meniscus: read at the bottom edge
    cx.strokeStyle = "#bfe0ff"; cx.lineWidth = 1.5;
    cx.beginPath();
    cx.ellipse((x0 + x1) / 2, yTop, (x1 - x0) / 2 - 3, 3, 0, 0, Math.PI);
    cx.stroke();
    // coarse graduations: 1 mL ticks, 5 mL labels
    cx.textAlign = "left"; cx.textBaseline = "middle";
    for (var m = 0; m <= 50; m += 1) {
      var y = CYL.base - m * CYL.mlPx;
      var long = m % 5 === 0;
      cx.strokeStyle = long ? "#dce6f5" : "#7d8ea6";
      cx.lineWidth = long ? 1.2 : 0.7;
      cx.beginPath(); cx.moveTo(x1 - (long ? 14 : 7), y); cx.lineTo(x1, y); cx.stroke();
      if (long) {
        cx.fillStyle = "#9fb4d8"; cx.font = "8.5px ui-monospace, monospace";
        cx.fillText(String(m), x1 + 4, y);
      }
    }
    cx.fillStyle = "#9fb4d8"; cx.font = "9px system-ui, sans-serif";
    cx.textAlign = "center";
    cx.fillText("50 mL cylinder", (x0 + x1) / 2, CYL.top - 8);
    // the hooked cylinder, submerged
    if (inCyl) drawHookedCyl((x0 + x1) / 2, CYL.base - 26, true);
  }
  function drawHookedCyl(x, yTop, submerged) {
    // thin wire up over the rim
    cx.strokeStyle = "#c8d2e0"; cx.lineWidth = 1;
    cx.beginPath(); cx.moveTo(x, yTop); cx.lineTo(x, 96);
    cx.lineTo(x + 26, 96); cx.stroke();
    // the metal cylinder
    var h = 30, w = 24;
    var col = mat === "Cu" ? "#c47a4a" : (mat === "Sn" ? "#b9c4d4" : "#a8b0ba");
    cx.fillStyle = col;
    cx.fillRect(x - w / 2, yTop, w, h);
    cx.strokeStyle = "#dce6f5"; cx.lineWidth = 1;
    cx.strokeRect(x - w / 2, yTop, w, h);
    cx.fillStyle = "#1c2434"; cx.font = "9px ui-monospace, monospace";
    cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillText(A.STAMPS[mat], x, yTop + h / 2);
    // hook
    cx.strokeStyle = "#c8d2e0"; cx.lineWidth = 1.5;
    cx.beginPath(); cx.arc(x, yTop - 4, 4, 0, Math.PI, true); cx.stroke();
    // bubbles in Fun Mode until tapped out
    if (submerged && mode === "fun" && fun.bubblesMl > 0) {
      cx.fillStyle = "rgba(220,235,255,0.9)";
      for (var i = 0; i < 3; i++) {
        cx.beginPath();
        cx.arc(x + (i - 1) * 7, yTop + 6 + (i % 2) * 8, 2 + i * 0.5, 0, 6.29);
        cx.fill();
      }
      cx.fillStyle = "#ffd166"; cx.font = "8px system-ui, sans-serif";
      cx.fillText("bubbles!", x, yTop + h + 10);
    }
  }
  function drawZoom() {
    // magnified meniscus at the current level
    var zx = ZOOM.x, zy = ZOOM.y, zr = ZOOM.r;
    cx.save();
    cx.beginPath(); cx.arc(zx, zy, zr, 0, 6.29); cx.clip();
    cx.fillStyle = "#0d1526"; cx.fillRect(zx - zr, zy - zr, zr * 2, zr * 2);
    var mag = 4;
    var lv = levelTrue();
    var yTop = CYL.base - lv * CYL.mlPx;
    // water fill in the zoom, level line at the circle centre
    cx.fillStyle = "rgba(101,160,220,0.55)";
    cx.fillRect(zx - zr, zy, zr * 2, zr);
    // 1 mL graduations magnified
    for (var m = Math.floor(lv) - 2; m <= Math.floor(lv) + 2; m++) {
      var y = zy + (lv - m) * CYL.mlPx * mag;
      var long = m % 5 === 0;
      cx.strokeStyle = long ? "#dce6f5" : "#7d8ea6";
      cx.lineWidth = long ? 2 : 1;
      cx.beginPath(); cx.moveTo(zx + 10, y); cx.lineTo(zx + zr, y); cx.stroke();
      cx.fillStyle = "#9fb4d8"; cx.font = "10px ui-monospace, monospace";
      cx.textAlign = "left"; cx.textBaseline = "middle";
      cx.fillText(String(m) + " mL", zx + 14, y);
    }
    // magnified meniscus curve, read at the bottom
    cx.strokeStyle = "#bfe0ff"; cx.lineWidth = 2.5;
    cx.beginPath();
    cx.ellipse(zx, zy, zr * 1.1, 6 * mag / 2, 0, 0, Math.PI);
    cx.stroke();
    if (inCyl && mode === "fun" && fun.bubblesMl > 0) {
      cx.fillStyle = "rgba(220,235,255,0.9)";
      cx.beginPath(); cx.arc(zx - 22, zy + 26, 5, 0, 6.29); cx.fill();
      cx.beginPath(); cx.arc(zx - 8, zy + 34, 4, 0, 6.29); cx.fill();
    }
    cx.restore();
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1.5;
    cx.beginPath(); cx.arc(zx, zy, zr, 0, 6.29); cx.stroke();
    cx.fillStyle = "#9fb4d8"; cx.font = "9px system-ui, sans-serif";
    cx.textAlign = "center"; cx.textBaseline = "top";
    cx.fillText("meniscus zoom (read the bottom edge)", zx, zy + zr + 4);
  }
  function drawShelf() {
    cx.strokeStyle = "#3a4d74"; cx.lineWidth = 3;
    cx.beginPath(); cx.moveTo(260, SHELF_Y); cx.lineTo(470, SHELF_Y); cx.stroke();
    var xs = [285, 355, 425];
    for (var i = 0; i < A.MATERIALS.length; i++) {
      var s = A.MATERIALS[i];
      var x = xs[i];
      var y = s === mat ? SHELF_Y - 52 : SHELF_Y - 44;
      var col = s === "Cu" ? "#c47a4a" : (s === "Sn" ? "#b9c4d4" : "#a8b0ba");
      cx.fillStyle = col;
      cx.fillRect(x - 16, y, 32, 44);
      cx.strokeStyle = s === mat ? "#ffd166" : "#dce6f5";
      cx.lineWidth = s === mat ? 2 : 1;
      cx.strokeRect(x - 16, y, 32, 44);
      cx.fillStyle = "#1c2434"; cx.font = "11px ui-monospace, monospace";
      cx.textAlign = "center"; cx.textBaseline = "middle";
      cx.fillText(A.STAMPS[s], x, y + 22);
    }
    cx.fillStyle = "#9fb4d8"; cx.font = "9px system-ui, sans-serif";
    cx.textAlign = "center"; cx.textBaseline = "top";
    cx.fillText("hooked cylinders (lifted = on the bench)", 365, SHELF_Y + 8);
  }
  function drawBalance() {
    var x0 = BAL.x0, x1 = BAL.x1;
    // base + post + beam
    cx.fillStyle = "#23324e";
    cx.fillRect(x0, 492, x1 - x0, 14);
    cx.fillStyle = "#3a4d74";
    cx.fillRect(616, BAL.beamY, 10, 492 - BAL.beamY);
    cx.fillRect(x0 + 20, BAL.beamY, x1 - x0 - 40, 8);
    // pan hanger (left)
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 2;
    cx.beginPath(); cx.moveTo(547, BAL.beamY + 8); cx.lineTo(547, BAL.panY); cx.stroke();
    cx.fillStyle = "#3a4d74";
    cx.fillRect(505, BAL.panY, 84, 10);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1;
    cx.strokeRect(505, BAL.panY, 84, 10);
    // readout + kg cell
    cx.fillStyle = "#101a2e";
    cx.fillRect(615, 205, 122, 46);
    cx.strokeStyle = "#6d84ad"; cx.strokeRect(615, 205, 122, 46);
    cx.fillStyle = "#ffd166"; cx.font = "16px ui-monospace, monospace";
    cx.textAlign = "right"; cx.textBaseline = "middle";
    cx.fillText(fmt(balanceG(), 2) + " g", 730, 223);
    cx.fillStyle = "#0d1526";
    cx.fillRect(615, 256, 122, 24);
    cx.strokeStyle = "#4a5f8a"; cx.strokeRect(615, 256, 122, 24);
    cx.fillStyle = "#8fd3ff"; cx.font = "11px ui-monospace, monospace";
    cx.fillText(fmt(balanceG() / 1000, 5) + " kg", 730, 268);
    cx.fillStyle = "#9fb4d8"; cx.font = "9px system-ui, sans-serif";
    cx.textAlign = "left";
    cx.fillText("triple-beam balance", 615, 195);
    if (balMode === "air") {
      // the dry cylinder on the pan
      var col = mat === "Cu" ? "#c47a4a" : (mat === "Sn" ? "#b9c4d4" : "#a8b0ba");
      cx.fillStyle = col;
      cx.fillRect(530, BAL.panY - 40, 34, 40);
      cx.strokeStyle = "#dce6f5"; cx.lineWidth = 1;
      cx.strokeRect(530, BAL.panY - 40, 34, 40);
      cx.fillStyle = "#1c2434"; cx.font = "10px ui-monospace, monospace";
      cx.textAlign = "center"; cx.textBaseline = "middle";
      cx.fillText(A.STAMPS[mat], 547, BAL.panY - 20);
      cx.fillStyle = "#9fb4d8"; cx.font = "9px system-ui, sans-serif";
      cx.textAlign = "left";
      cx.fillText("pan: dry cylinder in air", 505, BAL.panY + 20);
    } else {
      // the beaker on the pan
      cx.fillStyle = "rgba(159,180,216,0.10)";
      cx.fillRect(507, 212, 80, 88);
      cx.strokeStyle = "#9fb4d8"; cx.lineWidth = 1.5;
      cx.strokeRect(507, 212, 80, 88);
      // about a quarter full
      cx.fillStyle = "rgba(101,160,220,0.55)";
      cx.fillRect(509, 212 + 88 - 36, 76, 34);
      if (tared) {
        cx.fillStyle = "#ffd166"; cx.font = "8px ui-monospace, monospace";
        cx.textAlign = "center"; cx.textBaseline = "middle";
        cx.fillText("TARED", 547, 206);
      }
      // the wire off the balance frame, cylinder submerged in the beaker
      if (inBeaker) {
        cx.strokeStyle = "#c8d2e0"; cx.lineWidth = 1.2;
        cx.beginPath(); cx.moveTo(547, BAL.beamY + 8); cx.lineTo(547, 238); cx.stroke();
        var col2 = mat === "Cu" ? "#c47a4a" : (mat === "Sn" ? "#b9c4d4" : "#a8b0ba");
        cx.fillStyle = col2;
        cx.fillRect(533, 238, 28, 34);
        cx.strokeStyle = "#dce6f5"; cx.lineWidth = 1;
        cx.strokeRect(533, 238, 28, 34);
        cx.fillStyle = "#1c2434"; cx.font = "9px ui-monospace, monospace";
        cx.textAlign = "center"; cx.textBaseline = "middle";
        cx.fillText(A.STAMPS[mat], 547, 255);
        cx.fillStyle = "#9fb4d8"; cx.font = "9px system-ui, sans-serif";
        cx.textAlign = "left";
        cx.fillText("cylinder submerged from the frame", 505, 320);
      } else {
        cx.fillStyle = "#9fb4d8"; cx.font = "9px system-ui, sans-serif";
        cx.textAlign = "left";
        cx.fillText("pan: beaker, about a quarter full", 505, BAL.panY + 20);
      }
    }
  }
  function drawBench() {
    var w = cv.width / dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, w, CANVAS_H);
    cx.fillStyle = "#0d1526"; cx.fillRect(0, 0, w, CANVAS_H);
    cx.fillStyle = "#1b2740"; cx.fillRect(0, FLOOR, w, CANVAS_H - FLOOR);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1.5;
    cx.beginPath(); cx.moveTo(0, FLOOR); cx.lineTo(w, FLOOR); cx.stroke();
    drawCylinder();
    drawZoom();
    drawShelf();
    drawBalance();
  }

  // ---------- data tables ----------
  var CSV_HEADER = ["row", "quantity", "value", "value 2"];
  function t1Row(sym) {
    var l = logged[sym];
    if (!l) return [A.STAMPS[sym], A.NAMES[sym], "-", "-", "-", "-", "-"];
    return [A.STAMPS[sym], A.NAMES[sym], String(l.vWater), String(l.vCyl),
      fmt(l.vO, 1), fmt(l.vOM3, 6), fmt(l.fbVol, 4)];
  }
  function t2Row(sym) {
    var l = logged[sym];
    if (!l) return [A.NAMES[sym], "-", "-", "-", "-", "-", "-"];
    return [A.NAMES[sym], fmt(l.mAir / 1000, 4), fmt(l.fg, 4), fmt(l.mApp / 1000, 4),
      fmt(l.fgApp, 4), fmt(l.fbWt, 4), isFinite(l.pct) ? fmt(l.pct, 1) + " %" : "-"];
  }
  function csvRows() {
    var rows = [];
    A.MATERIALS.forEach(function (s) {
      var l = logged[s];
      if (!l) return;
      rows.push(["T1 " + A.NAMES[s], "V_water (mL)", String(l.vWater), ""]);
      rows.push(["T1 " + A.NAMES[s], "V_water+cyl (mL)", String(l.vCyl), ""]);
      rows.push(["T1 " + A.NAMES[s], "V_o (mL)", fmt(l.vO, 1), ""]);
      rows.push(["T1 " + A.NAMES[s], "V_o (m^3)", fmt(l.vOM3, 6), ""]);
      rows.push(["T1 " + A.NAMES[s], "F_b (N)", fmt(l.fbVol, 4), ""]);
      rows.push(["T2 " + A.NAMES[s], "mass in air (kg)", fmt(l.mAir / 1000, 4), ""]);
      rows.push(["T2 " + A.NAMES[s], "F_g (N)", fmt(l.fg, 4), ""]);
      rows.push(["T2 " + A.NAMES[s], "apparent mass (kg)", fmt(l.mApp / 1000, 4), ""]);
      rows.push(["T2 " + A.NAMES[s], "F_g apparent (N)", fmt(l.fgApp, 4), ""]);
      rows.push(["T2 " + A.NAMES[s], "F_b (N)", fmt(l.fbWt, 4), ""]);
      rows.push(["T2 " + A.NAMES[s], "% diff vs Table 1", isFinite(l.pct) ? fmt(l.pct, 1) + " %" : "-", ""]);
    });
    return rows;
  }
  function renderTables() {
    $("table1").innerHTML = LS.store.tableHTML(
      ["symbol", "material", "V_water (mL)", "V_water+cyl (mL)", "V_o (mL)", "V_o (m^3)", "F_b (N)"],
      A.MATERIALS.map(t1Row));
    $("table2").innerHTML = LS.store.tableHTML(
      ["material", "mass in air (kg)", "F_g (N)", "apparent mass (kg)", "F_g apparent (N)", "F_b (N)", "% diff vs Table 1"],
      A.MATERIALS.map(t2Row));
    renderWorkBox();
  }
  function renderWorkBox() {
    var lines = ["rho_water = 1000 kg/m^3, g = 9.80 m/s^2 (course values); 1 mL = 1e-6 m^3"];
    lines.push("cylinder reads to 1 mL: V_water " + vWater + " mL, level " +
      (inCyl ? levelRead() + " mL" : "-") +
      (inCyl && mode === "fun" ? " (true " + fmt(levelTrue(), 2) + " mL: wire 0.10" +
        (fun.bubblesMl > 0 ? ", bubbles " + fmt(fun.bubblesMl, 2) : "") + ")" : ""));
    if (isFinite(vOReadMl())) {
      lines.push("V_o = " + fmt(vOReadMl(), 1) + " mL = " + fmt(A.mLtoM3(vOReadMl()), 6) +
        " m^3  ->  F_b = 1000 x " + fmt(A.mLtoM3(vOReadMl()), 6) + " x 9.80 = " +
        fmt(fbVolN(), 4) + " N");
    }
    lines.push("balance: " + (balMode === "air" ? "in air" : "beaker") +
      " " + fmt(balanceG(), 2) + " g = " + fmt(balanceG() / 1000, 5) + " kg");
    if (isFinite(fbWtN())) {
      lines.push("F_g = " + fmt(A.weightN(mAirRead()), 4) + " N; F_g apparent = " +
        fmt(A.weightN(mAppRead()), 4) + " N; F_b = difference = " + fmt(fbWtN(), 4) + " N");
    }
    var p = pctNow();
    lines.push(isFinite(p) ? "percent difference of the routes = " + fmt(p, 1) +
      " % (on the mean)" : "both routes logged to compare them");
    lines.push("accepted: V_o = 2.50 mL, F_b = " + fmt(A.accepted.fbN, 4) + " N");
    $("workBox").textContent = lines.join("\n");
  }
  function refreshAll() {
    refreshReadouts();
    renderTables();
    drawBench();
  }

  // ---------- controls ----------
  function setMat(sym) {
    if (mat === sym) return;
    if (inCyl || inBeaker) {
      flash = { text: "raise the cylinder out first, then switch metals", until: Date.now() + 3000 };
      refreshReadouts();
      return;
    }
    mat = sym;
    flash = { text: "working on " + A.NAMES[sym] + " now", until: Date.now() + 2500 };
    refreshAll();
    saveState();
  }
  $("matCu").addEventListener("click", function () { setMat("Cu"); });
  $("matT").addEventListener("click", function () { setMat("Sn"); });
  $("matZ").addEventListener("click", function () { setMat("Zn"); });
  $("pourSlider").addEventListener("input", function () {
    vWater = Math.round(parseFloat(this.value) || 25);
    refreshAll();
  });
  $("pourSlider").addEventListener("change", function () { saveState(); });
  $("lowerCylBtn").addEventListener("click", function () {
    inCyl = !inCyl;
    if (inCyl) {
      flash = {
        text: mode === "fun" && fun.bubblesMl > 0
          ? "cylinder down - bubbles are on it, tap them out before you trust the level"
          : "cylinder down - read the new level",
        until: Date.now() + 3500
      };
    }
    refreshAll();
    saveState();
  });
  $("tapBtn").addEventListener("click", function () {
    if (mode === "fun" && fun.bubblesMl > 0) {
      fun.bubblesMl = 0;
      flash = { text: "bubbles tapped out - the level drops back", until: Date.now() + 3000 };
    } else {
      flash = {
        text: mode === "fun" ? "no bubbles on the metal right now" :
          "Ideal Mode: the water is clean, nothing to tap out",
        until: Date.now() + 2500
      };
    }
    refreshAll();
    saveState();
  });
  $("balAirBtn").addEventListener("click", function () {
    balMode = "air";
    inBeaker = false;
    flash = { text: "dry cylinder on the pan - the readout is the mass in air", until: Date.now() + 3000 };
    refreshAll();
    saveState();
  });
  $("balBeakerBtn").addEventListener("click", function () {
    balMode = "beaker";
    beakerOn = true;
    tared = false;
    inBeaker = false;
    flash = {
      text: "beaker and water on the pan, " + (BEAKER_GLASS_G + BEAKER_WATER_G) +
        " g - tare before the submerged reading",
      until: Date.now() + 3500
    };
    refreshAll();
    saveState();
  });
  $("tareBtn").addEventListener("click", function () {
    if (balMode !== "beaker" || !beakerOn) {
      flash = { text: "the beaker must be on the pan first", until: Date.now() + 2500 };
      refreshReadouts();
      return;
    }
    tared = true;
    flash = { text: "tared - beaker and water weigh zero now", until: Date.now() + 3000 };
    refreshAll();
    saveState();
  });
  $("lowerBeakerBtn").addEventListener("click", function () {
    if (balMode !== "beaker" || !beakerOn) {
      flash = { text: "put the beaker on the pan first", until: Date.now() + 2500 };
      refreshReadouts();
      return;
    }
    if (!tared) {
      flash = { text: "tare the pan first, or the beaker rides in the reading", until: Date.now() + 3000 };
      refreshReadouts();
      return;
    }
    inBeaker = !inBeaker;
    if (inBeaker) {
      flash = {
        text: "cylinder submerged from the frame - the readout is the apparent mass",
        until: Date.now() + 3500
      };
    }
    refreshAll();
    saveState();
  });
  $("logBtn").addEventListener("click", function () {
    if (!inCyl) {
      flash = { text: "Part I first: lower the cylinder into the graduated cylinder", until: Date.now() + 3000 };
      refreshReadouts();
      return;
    }
    if (!(balMode === "beaker" && tared && inBeaker)) {
      flash = { text: "Part II first: beaker on the pan, tared, cylinder submerged", until: Date.now() + 3000 };
      refreshReadouts();
      return;
    }
    var vO = vOReadMl();
    var mAir = mAirRead(), mApp = mAppRead();
    var fbVol = A.buoyantFromMl(vO);
    var fg = A.weightN(mAir), fgApp = A.weightN(mApp);
    var fbWt = A.buoyantFromWeightN(mAir, mApp);
    logged[mat] = {
      vWater: vWater, vCyl: levelRead(), vO: vO, vOM3: A.mLtoM3(vO),
      fbVol: fbVol, mAir: mAir, mApp: mApp, fg: fg, fgApp: fgApp, fbWt: fbWt,
      pct: A.pctDiffMean(fbVol, fbWt)
    };
    var p = logged[mat].pct;
    flash = {
      text: A.NAMES[mat] + " logged - the routes differ by " + fmt(p, 1) +
        " %, which is honest for a 1 mL cylinder",
      until: Date.now() + 4500
    };
    refreshAll();
    saveState();
  });
  $("clearTable").addEventListener("click", function () {
    logged = { Cu: null, Sn: null, Zn: null };
    LS.store.clear(LAB, "log");
    $("csvCopy").style.display = "none";
    flash = { text: "logs cleared", until: Date.now() + 2000 };
    refreshAll();
    saveState();
  });
  $("exportLog").addEventListener("click", function () {
    LS.store.exportCSV("phy110-lab7-archimedes.csv", CSV_HEADER, csvRows(), $("csvCopy"));
  });

  // ---------- boot ----------
  function resizeStages() {
    var w = Math.round(Math.max(520, (cv.clientWidth || 700)) * dpr);
    cv.width = w;
    cv.height = Math.round(CANVAS_H * dpr);
    drawBench();
  }
  window.addEventListener("resize", resizeStages);

  setInterval(function () {
    if (flash && Date.now() >= flash.until) { flash = null; refreshReadouts(); }
  }, 60);

  loadState();
  if (mode === "fun") genFun();
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (m) {
    mode = m;
    if (mode === "fun") genFun();
    else fun = { mAir: {}, mApp: {}, bubblesMl: 0 };
    refreshAll();
    saveState();
  });
  LS.check.init(LAB);
  refreshAll();
  resizeStages();
})();
