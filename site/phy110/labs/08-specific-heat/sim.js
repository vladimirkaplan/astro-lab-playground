// PHY110 Lab 8 sim: the mixtures bench. A water boiler, a calorimeter cup in
// an insulating jacket with lid and stirrer, a drag-around thermometer probe,
// a triple-beam balance with a shelf (dry cylinder, empty cup, cup plus
// water), and a transfer timer.
//
// The discovery rule: the cylinder's stamp reads X until the run is logged.
// Course Mode is the ideal mix: exact masses, T_i = 22.0, T_s = 100, and T_f
// exactly where the energy balance puts it (copper lands at 26.0 on the
// 0.1 C thermometer). Fun Mode adds +-0.05 g balance jitter, +-0.1 C
// thermometer jitter, up to ~30 cal of heat lost in the transfer, and up to
// 0.4 g of boiling water riding along - a few percent on c_s, never a
// different accepted value.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units, SH = LS.specificheat;
  var LAB = "08-specific-heat";
  var $ = function (id) { return document.getElementById(id); };
  var mode = LS.ui.getMode(LAB);
  var EST = "  (instrument estimate)";
  var TRANSFER_MS = 10000;
  var BOIL_MS = 3000, WARM_MS = 2000, STIR_NEED_MS = 2000;

  function fmt(x, d) {
    if (!isFinite(x)) return "-";
    return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  }
  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
  function round2(x) { return Math.round(x * 100) / 100; }
  function round1(x) { return Math.round(x * 10) / 10; }

  // ---------- bench geometry (css px) ----------
  var CANVAS_H = 560;
  var BOIL = { x0: 45, x1: 185, y0: 200, y1: 340 };
  var CAL = { x0: 265, x1: 425, y0: 180, y1: 340, inset: 14, lidY: 172 };
  var BAL = { x0: 480, x1: 760, beamY: 130, panX0: 500, panX1: 580, panY: 260 };
  var PAN_ZONE = { x0: 470, x1: 615, y0: 160, y1: 285 };
  var SHELF_Y = 480;
  var SLOTS = {
    metal: { x: 85, y: 425, w: 40, h: 55 },
    cup: { x: 190, y: 435, w: 60, h: 45 },
    cupwater: { x: 300, y: 435, w: 60, h: 45 }
  };
  var ONPAN = {
    metal: { x: 518, y: 215, w: 44, h: 45 },
    cup: { x: 502, y: 222, w: 72, h: 38 },
    cupwater: { x: 502, y: 222, w: 72, h: 38 }
  };
  var INBOIL = { x: 95, y: 250, w: 50, h: 75 };
  var INCUP = { x: 322, y: 282, w: 44, h: 36 };
  var DOCKS = { rest: { x: 230, y: 100 }, boiler: { x: 115, y: 140 }, calor: { x: 345, y: 130 } };
  var cv = $("calCanvas"), cx = cv.getContext("2d");
  var dpr = window.devicePixelRatio || 1;

  // ---------- run state ----------
  var metal = "Cu";
  var revealed = false;
  var boilerOn = false, boilerStart = 0, warmStart = 0;
  var cylInBoiler = false, cylInCup = false;
  var onPan = null;               // "metal" | "cup" | "cupwater" | null
  var probeAt = "rest";           // "rest" | "boiler" | "calor"
  var ti = null;                  // locked when the probe first reads the cup
  var wMs = false, wMc = false, wMcap = false;  // the three masses have been weighed
  var transfer = "idle";          // "idle" | "running" | "done"
  var transferStart = 0;
  var stirOn = false, stirAccum = 0, lastStirTick = 0;
  var fun = { ms: 95.0, mc: 60.0, mcap: 210.0, ti: 22.0, lossCal: 0, mHot: 0 };
  var logged = null;
  var flash = null;
  var funLoaded = false;

  function genFun() {
    fun.ms = round2(SH.RUN.ms + rand(-0.05, 0.05));
    fun.mc = round2(SH.RUN.mc + rand(-0.05, 0.05));
    fun.mcap = round2(SH.RUN.mcw + rand(-0.05, 0.05));
    fun.ti = round1(SH.RUN.ti + rand(-0.2, 0.2));
    fun.lossCal = 0; fun.mHot = 0;
  }
  function genFunTransfer() {
    if (mode !== "fun") { fun.lossCal = 0; fun.mHot = 0; return; }
    fun.lossCal = rand(10, SH.FUN_LOSS_CAL);
    fun.mHot = rand(0, SH.FUN_RIDE_ALONG_G);
  }
  function boiling() {
    return boilerOn && Date.now() - boilerStart >= BOIL_MS;
  }
  function cylAtTs() {
    return cylInBoiler && boiling() &&
      (transfer === "idle") && (Date.now() - warmStart >= WARM_MS);
  }
  function weighed(key) {
    if (key === "ms") return fun.ms;
    if (key === "mc") return fun.mc;
    return fun.mcap;
  }
  function panLabel() {
    return onPan === "metal" ? "pan: metal cylinder" :
      onPan === "cup" ? "pan: empty cup" :
        onPan === "cupwater" ? "pan: cup + water" : "pan: empty";
  }
  function panG() {
    if (!onPan) return 0;
    return mode === "fun" ? weighed(onPan === "metal" ? "ms" : onPan === "cup" ? "mc" : "mcap")
      : (onPan === "metal" ? SH.RUN.ms : onPan === "cup" ? SH.RUN.mc : SH.RUN.mcw);
  }
  function transferLeft() {
    if (transfer !== "running") return NaN;
    return Math.max(0, TRANSFER_MS - (Date.now() - transferStart));
  }
  function tfTrue() {
    if (mode === "fun") {
      return SH.finalTWithErrors(metal, SH.RUN.mc, SH.RUN.mcw - SH.RUN.mc,
        SH.RUN.ms, ti, SH.T_BOIL, fun.lossCal, fun.mHot);
    }
    return SH.finalT(metal, SH.RUN.mc, SH.RUN.mcw - SH.RUN.mc, SH.RUN.ms, ti, SH.T_BOIL);
  }
  function tfValid() { return transfer === "done" && stirAccum >= STIR_NEED_MS; }
  function tfRead() {
    if (!tfValid()) return NaN;
    return SH.readC(tfTrue());
  }
  function probeText() {
    if (probeAt === "boiler") {
      if (!boilerOn) return "boiler off - no reading";
      if (!boiling()) return "heating...";
      return "boiler " + fmt(SH.readC(SH.T_BOIL), 1) + " C" + (mode === "fun" ? EST : "");
    }
    if (probeAt === "calor") {
      if (transfer !== "done") {
        return "cup " + fmt(ti === null ? SH.readC(mode === "fun" ? fun.ti : SH.RUN.ti) : ti, 1) + " C (this is T_i)";
      }
      if (!tfValid()) return "stir before T_f is readable";
      return "cup T_f = " + fmt(tfRead(), 1) + " C" + (mode === "fun" ? EST : "");
    }
    return "probe at rest";
  }
  function noteNow() {
    if (flash && Date.now() < flash.until) return flash.text;
    if (logged) return "run logged - the stamp is revealed, compare c_s with the table";
    if (transfer === "done") {
      if (stirAccum < STIR_NEED_MS) return "stir for a couple of seconds so the cup settles";
      return "T_f is readable - press Log the run";
    }
    if (transfer === "running") return "transfer in progress - the timer counts it";
    if (cylAtTs()) {
      if (ti === null) return "drag the probe into the cup to lock in T_i";
      return "ready - press Transfer now";
    }
    if (cylInBoiler) return "wait for the cylinder to reach the boiling-water temperature";
    if (boilerOn) return "wait for the boil, then drag the cylinder into the pot";
    return "weigh the three masses (Part I), then turn the boiler on";
  }

  // ---------- persistence ----------
  function saveState() {
    LS.store.save(LAB, "state", ["state"], [[JSON.stringify({
      metal: metal, revealed: revealed, boilerOn: boilerOn,
      boilerStart: boilerStart, warmStart: warmStart,
      cylInBoiler: cylInBoiler, cylInCup: cylInCup, onPan: onPan,
      probeAt: probeAt, ti: ti, transfer: transfer, transferStart: transferStart,
      stirAccum: stirAccum, logged: logged, mode: mode,
      wMs: wMs, wMc: wMc, wMcap: wMcap,
      fun: { ms: fun.ms, mc: fun.mc, mcap: fun.mcap, ti: fun.ti }
    })]]);
    LS.store.save(LAB, "log", CSV_HEADER, csvRows());
  }
  function loadState() {
    try {
      var got = LS.store.load(LAB, "state");
      if (!got || !got.rows || !got.rows.length) return;
      var st = JSON.parse(got.rows[0][0]);
      metal = st.metal || "Cu"; revealed = !!st.revealed;
      boilerOn = !!st.boilerOn; boilerStart = st.boilerStart || 0;
      warmStart = st.warmStart || 0;
      cylInBoiler = !!st.cylInBoiler; cylInCup = !!st.cylInCup;
      onPan = st.onPan || null; probeAt = st.probeAt || "rest";
      ti = st.ti; transfer = st.transfer || "idle";
      transferStart = st.transferStart || 0; stirAccum = st.stirAccum || 0;
      logged = st.logged || null;
      wMs = !!st.wMs; wMc = !!st.wMc; wMcap = !!st.wMcap;
      if (st.fun) { fun.ms = st.fun.ms; fun.mc = st.fun.mc; fun.mcap = st.fun.mcap; fun.ti = st.fun.ti; funLoaded = true; }
      // a transfer that finished while the page was closed is done
      if (transfer === "running" && Date.now() - transferStart >= TRANSFER_MS) {
        transfer = "done"; cylInCup = true;
      }
    } catch (e) {}
  }

  // ---------- readouts ----------
  function refreshReadouts() {
    $("panRead").textContent = panLabel() +
      (onPan ? "  " + fmt(panG(), 2) + " g" + (mode === "fun" ? EST : "") : "");
    $("boilerRead").textContent = !boilerOn ? "off" :
      (boiling() ? "BOILING (water at 100 C)" : "heating...") +
      (cylInBoiler ? (cylAtTs() ? " / cylinder at 100 C" : " / cylinder warming") : "");
    $("probeRead").textContent = probeText();
    var tl = transferLeft();
    $("timerRead").textContent = transfer === "running" ? fmt(tl / 1000, 1) + " s" :
      (transfer === "done" ? "done" : "-");
    var rows = sheetRows();
    var filled = rows.filter(function (r) { return r[1] !== "-"; }).length;
    $("sheetRead").textContent = filled + " of 11 rows in" +
      (ti !== null ? " (T_i locked at " + fmt(ti, 1) + " C)" : "");
    $("csRead").textContent = logged
      ? fmt(logged.cs, 4) + " / " + fmt(logged.accepted, 3) +
        "  (" + fmt(logged.pct, 1) + " %)"
      : "- / " + fmt(SH.TABLE2[metal], 3) + " (accepted, Table II)";
    $("boilerBtn").textContent = boilerOn ? "Boiler off" : "Boiler on";
    $("stirBtn").textContent = stirOn ? "Stir off" : "Stir on";
    $("stirBtn").className = stirOn ? "action" : "action ghost";
    $("snBtn").className = metal === "Sn" ? "action" : "action ghost";
    $("znBtn").className = metal === "Zn" ? "action" : "action ghost";
    $("cuBtn").className = metal === "Cu" ? "action" : "action ghost";
    $("pbBtn").className = metal === "Pb" ? "action" : "action ghost";
    $("noteRead").textContent = noteNow();
  }

  // ---------- the eleven-row sheet ----------
  var CSV_HEADER = ["quantity", "value"];
  function sheetRows() {
    var mw = mode === "fun" ? (fun.mcap - fun.mc) : (SH.RUN.mcw - SH.RUN.mc);
    var rows = [
      ["element symbol", logged ? metal : "X"],
      ["m_s (g)", wMs ? fmt(mode === "fun" ? fun.ms : SH.RUN.ms, 2) : "-"],
      ["m_c (g)", wMc ? fmt(mode === "fun" ? fun.mc : SH.RUN.mc, 2) : "-"],
      ["m_c + m_w (g)", wMcap ? fmt(mode === "fun" ? fun.mcap : SH.RUN.mcw, 2) : "-"],
      ["m_w (g)", wMcap ? fmt(mw, 2) : "-"],
      ["T_i (C)", ti !== null ? fmt(ti, 1) : "-"],
      ["T_s (C)", "100.0 (assumed 1 atm)"],
      ["T_f (C)", tfValid() ? fmt(tfRead(), 1) : "-"],
      ["measured c_s", logged ? fmt(logged.cs, 4) : "-"],
      ["accepted c_s", fmt(SH.TABLE2[metal], 3)],
      ["% error", logged ? fmt(logged.pct, 1) + " %" : "-"]
    ];
    return rows;
  }
  function csvRows() {
    return sheetRows().filter(function (r) { return r[1] !== "-"; });
  }
  function renderSheet() {
    $("tableRun").innerHTML = LS.store.tableHTML(CSV_HEADER, sheetRows());
    renderWorkBox();
  }
  function renderWorkBox() {
    var lines = ["c_cup = 0.22, c_water = 1.000 cal/g C, T_s = 100 C assumed at 1 atm"];
    if (ti !== null) {
      lines.push("m_c c_c + m_w c_w = " + fmt(SH.capacityCW(
        mode === "fun" ? fun.mc : SH.RUN.mc,
        (mode === "fun" ? fun.mcap : SH.RUN.mcw) - (mode === "fun" ? fun.mc : SH.RUN.mc)), 1) + " cal/C");
      lines.push("T_f - T_i = " + (tfValid() ? fmt(tfRead() - ti, 1) : "?") +
        " C;  T_s - T_f = " + (tfValid() ? fmt(SH.T_BOIL - tfRead(), 1) : "?") + " C");
    }
    if (tfValid()) {
      lines.push("c_s = " + fmt(SH.cFrom(
        mode === "fun" ? fun.mc : SH.RUN.mc,
        (mode === "fun" ? fun.mcap : SH.RUN.mcw) - (mode === "fun" ? fun.mc : SH.RUN.mc),
        mode === "fun" ? fun.ms : SH.RUN.ms, ti, SH.T_BOIL, tfRead()), 4) + " cal/g C");
    }
    if (mode === "fun" && transfer === "done") {
      lines.push("honest losses this transfer: ~" + fmt(fun.lossCal, 0) +
        " cal to the room, " + fmt(fun.mHot, 2) + " g of hot water riding along");
    }
    if (logged) {
      lines.push("the stamp says " + metal + " (" + SH.NAMES[metal] +
        "); accepted " + fmt(logged.accepted, 3) + "; percent error " +
        fmt(logged.pct, 1) + " %");
    }
    $("workBox").textContent = lines.join("\n");
  }
  function refreshAll() {
    refreshReadouts();
    renderSheet();
    drawBench();
  }

  // ---------- drawing ----------
  function drawMetal(x, y, w, h, stamp, hot) {
    var col = metal === "Cu" ? "#c47a4a" : metal === "Sn" ? "#b9c4d4" :
      metal === "Zn" ? "#a8b0ba" : "#8d95a3";
    if (hot) col = "#d98a5a";
    cx.fillStyle = col;
    cx.fillRect(x, y, w, h);
    cx.strokeStyle = "#dce6f5"; cx.lineWidth = 1;
    cx.strokeRect(x, y, w, h);
    cx.fillStyle = "#1c2434"; cx.font = "11px ui-monospace, monospace";
    cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillText(stamp, x + w / 2, y + h / 2);
  }
  function drawCup(x, y, w, h, water) {
    cx.fillStyle = "rgba(159,180,216,0.12)";
    cx.fillRect(x, y, w, h);
    cx.strokeStyle = "#9fb4d8"; cx.lineWidth = 1.5;
    cx.strokeRect(x, y, w, h);
    if (water) {
      cx.fillStyle = "rgba(101,160,220,0.55)";
      cx.fillRect(x + 2, y + h * 0.4, w - 4, h * 0.6 - 2);
    }
  }
  function drawBoiler() {
    var x0 = BOIL.x0, x1 = BOIL.x1, y0 = BOIL.y0, y1 = BOIL.y1;
    // pot
    cx.fillStyle = "#33415e";
    cx.fillRect(x0, y0, x1 - x0, y1 - y0);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1.5;
    cx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    // water
    cx.fillStyle = "rgba(101,160,220,0.5)";
    cx.fillRect(x0 + 3, y0 + 22, x1 - x0 - 6, y1 - y0 - 25);
    if (boiling()) {
      var t = Date.now() / 180;
      cx.fillStyle = "rgba(220,235,255,0.8)";
      for (var i = 0; i < 7; i++) {
        var bx = x0 + 12 + ((i * 37 + t * 30) % (x1 - x0 - 24));
        var by = y1 - 12 - ((t * 40 + i * 23) % (y1 - y0 - 40));
        cx.beginPath(); cx.arc(bx, by, 2 + (i % 3), 0, 6.29); cx.fill();
      }
    }
    // flame
    if (boilerOn) {
      var f = 1 + 0.15 * Math.sin(Date.now() / 90);
      cx.fillStyle = "#ff9f43";
      cx.beginPath();
      cx.moveTo(x0 + 25, y1 + 2);
      cx.quadraticCurveTo(x0 + 45, y1 + 34 * f, x0 + 60, y1 + 2);
      cx.closePath(); cx.fill();
      cx.fillStyle = "#ffd166";
      cx.beginPath();
      cx.moveTo(x0 + 38, y1 + 2);
      cx.quadraticCurveTo(x0 + 52, y1 + 22 * f, x0 + 72, y1 + 2);
      cx.closePath(); cx.fill();
    }
    cx.fillStyle = "#9fb4d8"; cx.font = "10px system-ui, sans-serif";
    cx.textAlign = "center"; cx.textBaseline = "top";
    cx.fillText("water boiler", (x0 + x1) / 2, y0 - 22);
    cx.fillStyle = boilerOn ? (boiling() ? "#8affc1" : "#ffd166") : "#6d84ad";
    cx.fillText(boilerOn ? (boiling() ? "BOILING" : "HEATING") : "off",
      (x0 + x1) / 2, y1 + 44);
    if (cylInBoiler) {
      drawMetal(INBOIL.x, INBOIL.y, INBOIL.w, INBOIL.h,
        revealed ? metal : "X", cylAtTs());
      if (cylAtTs()) {
        cx.fillStyle = "#8affc1"; cx.font = "9px system-ui, sans-serif";
        cx.fillText("cylinder at 100 C", (x0 + x1) / 2, y1 + 58);
      }
    }
  }
  function drawCalor() {
    var x0 = CAL.x0, x1 = CAL.x1, y0 = CAL.y0, y1 = CAL.y1;
    // insulating jacket
    cx.fillStyle = "#2a3a5c";
    cx.fillRect(x0, y0, x1 - x0, y1 - y0);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1.5;
    cx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    // inner cup
    var ix0 = x0 + CAL.inset, ix1 = x1 - CAL.inset, iy0 = y0 + CAL.inset, iy1 = y1 - 4;
    cx.fillStyle = "#33415e";
    cx.fillRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
    cx.strokeStyle = "#9fb4d8"; cx.lineWidth = 1;
    cx.strokeRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
    // water
    cx.fillStyle = "rgba(101,160,220,0.55)";
    cx.fillRect(ix0 + 2, 230, ix1 - ix0 - 4, iy1 - 232);
    // metal in the cup after transfer
    if (cylInCup) drawMetal(INCUP.x, INCUP.y, INCUP.w, INCUP.h,
      revealed ? metal : "X", false);
    // lid + stirrer
    cx.fillStyle = "#4a5f8a";
    cx.fillRect(x0 - 6, CAL.lidY, x1 - x0 + 12, 10);
    var sx = 345;
    var sw = stirOn ? 10 * Math.sin(Date.now() / 120) : 0;
    cx.strokeStyle = "#c8d2e0"; cx.lineWidth = 3;
    cx.beginPath(); cx.moveTo(sx, CAL.lidY + 10); cx.lineTo(sx + sw, 315); cx.stroke();
    cx.fillStyle = "#c8d2e0";
    cx.fillRect(sx + sw - 9, 315, 18, 5);
    cx.fillStyle = "#9fb4d8"; cx.font = "10px system-ui, sans-serif";
    cx.textAlign = "center"; cx.textBaseline = "top";
    cx.fillText("calorimeter (jacket + lid + stirrer)", (x0 + x1) / 2, y0 - 22);
    if (stirOn) {
      cx.fillStyle = "#8affc1"; cx.font = "9px system-ui, sans-serif";
      cx.fillText("stirring" + (stirAccum >= STIR_NEED_MS ? " - settled" : "..."),
        (x0 + x1) / 2, y1 + 8);
    }
  }
  function drawBalance() {
    var x0 = BAL.x0, x1 = BAL.x1;
    cx.fillStyle = "#23324e";
    cx.fillRect(x0, 350, x1 - x0, 22);
    cx.fillStyle = "#3a4d74";
    cx.fillRect(616, BAL.beamY, 10, 350 - BAL.beamY);
    cx.fillRect(x0 + 15, BAL.beamY, x1 - x0 - 30, 8);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 2;
    cx.beginPath(); cx.moveTo(540, BAL.beamY + 8); cx.lineTo(540, BAL.panY); cx.stroke();
    cx.fillStyle = "#3a4d74";
    cx.fillRect(BAL.panX0, BAL.panY, BAL.panX1 - BAL.panX0, 10);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1;
    cx.strokeRect(BAL.panX0, BAL.panY, BAL.panX1 - BAL.panX0, 10);
    // readout
    cx.fillStyle = "#101a2e";
    cx.fillRect(630, 160, 125, 52);
    cx.strokeStyle = "#6d84ad"; cx.strokeRect(630, 160, 125, 52);
    cx.fillStyle = "#ffd166"; cx.font = "16px ui-monospace, monospace";
    cx.textAlign = "right"; cx.textBaseline = "middle";
    cx.fillText(onPan ? fmt(panG(), 2) + " g" : "0.00 g", 748, 180);
    cx.fillStyle = "#9fb4d8"; cx.font = "9px system-ui, sans-serif";
    cx.textAlign = "left";
    cx.fillText(panLabel(), 632, 200);
    // the item on the pan
    if (onPan === "metal") drawMetal(ONPAN.metal.x, ONPAN.metal.y, ONPAN.metal.w, ONPAN.metal.h,
      revealed ? metal : "X", false);
    if (onPan === "cup") drawCup(ONPAN.cup.x, ONPAN.cup.y, ONPAN.cup.w, ONPAN.cup.h, false);
    if (onPan === "cupwater") drawCup(ONPAN.cupwater.x, ONPAN.cupwater.y, ONPAN.cupwater.w, ONPAN.cupwater.h, true);
  }
  function drawShelf() {
    cx.strokeStyle = "#3a4d74"; cx.lineWidth = 3;
    cx.beginPath(); cx.moveTo(20, SHELF_Y); cx.lineTo(760, SHELF_Y); cx.stroke();
    var showMetal = !cylInBoiler && !cylInCup && onPan !== "metal";
    var showCup = onPan !== "cup";
    var showCW = onPan !== "cupwater";
    if (showMetal) drawMetal(SLOTS.metal.x, SLOTS.metal.y, SLOTS.metal.w, SLOTS.metal.h,
      revealed ? metal : "X", false);
    if (showCup) drawCup(SLOTS.cup.x, SLOTS.cup.y, SLOTS.cup.w, SLOTS.cup.h, false);
    if (showCW) drawCup(SLOTS.cupwater.x, SLOTS.cupwater.y, SLOTS.cupwater.w, SLOTS.cupwater.h, true);
    cx.fillStyle = "#9fb4d8"; cx.font = "9px system-ui, sans-serif";
    cx.textAlign = "center"; cx.textBaseline = "top";
    cx.fillText("metal cylinder", SLOTS.metal.x + 20, SHELF_Y + 8);
    cx.fillText("empty cup", SLOTS.cup.x + 30, SHELF_Y + 8);
    cx.fillText("cup + water", SLOTS.cupwater.x + 30, SHELF_Y + 8);
  }
  function drawProbe() {
    // docks
    Object.keys(DOCKS).forEach(function (k) {
      var d = DOCKS[k];
      cx.strokeStyle = probeAt === k ? "#ffd166" : "#4a5f8a";
      cx.lineWidth = probeAt === k ? 2 : 1;
      cx.setLineDash([3, 3]);
      cx.beginPath(); cx.arc(d.x, d.y, 13, 0, 6.29); cx.stroke();
      cx.setLineDash([]);
    });
    var d = DOCKS[probeAt];
    var px = d.x, py = d.y;
    if (drag && drag.what === "probe") { px = drag.x; py = drag.y; }
    // thermometer: tube + red bulb
    var tipY = probeAt === "calor" ? 268 : py + 16;
    cx.strokeStyle = "#c8d2e0"; cx.lineWidth = 4;
    cx.beginPath(); cx.moveTo(px, py - 18); cx.lineTo(px, tipY); cx.stroke();
    cx.fillStyle = "#e05555";
    cx.beginPath(); cx.arc(px, tipY + 6, 6, 0, 6.29); cx.fill();
    cx.fillStyle = "#9fb4d8"; cx.font = "8.5px system-ui, sans-serif";
    cx.textAlign = "center"; cx.textBaseline = "top";
    cx.fillText("probe", px, py - 34);
    // the reading bubble
    var txt = probeText();
    cx.fillStyle = "rgba(13,21,38,0.9)";
    var tw = cx.measureText(txt).width + 12;
    cx.fillRect(px - tw / 2, py + 20, tw, 18);
    cx.fillStyle = "#8fd3ff"; cx.font = "9px ui-monospace, monospace";
    cx.textBaseline = "middle";
    cx.fillText(txt, px, py + 29);
  }
  var drag = null;   // {what: "probe"|"metal"|"cup"|"cupwater", x, y}
  function drawDragItem() {
    if (!drag || drag.what === "probe") return;
    var w = 44, h = 45;
    if (drag.what === "cup" || drag.what === "cupwater") { w = 72; h = 38; }
    if (drag.what === "metal") drawMetal(drag.x - w / 2, drag.y - h / 2, w, h,
      revealed ? metal : "X", false);
    else drawCup(drag.x - w / 2, drag.y - h / 2, w, h, drag.what === "cupwater");
  }
  function drawBench() {
    var w = cv.width / dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, w, CANVAS_H);
    cx.fillStyle = "#0d1526"; cx.fillRect(0, 0, w, CANVAS_H);
    cx.fillStyle = "#1b2740"; cx.fillRect(0, SHELF_Y + 18, w, CANVAS_H - SHELF_Y - 18);
    // transfer timer at top
    var tl = transferLeft();
    cx.fillStyle = transfer === "running" ? "#ffd166" : "#6d84ad";
    cx.font = "13px ui-monospace, monospace";
    cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillText(transfer === "running" ? "transfer: " + fmt(tl / 1000, 1) + " s" :
      (transfer === "done" ? "transfer done" : "transfer: ready"), 620, 95);
    drawBoiler();
    drawCalor();
    drawBalance();
    drawShelf();
    drawProbe();
    drawDragItem();
  }

  // ---------- controls ----------
  function setMetal(sym) {
    if (logged || cylInBoiler || cylInCup || onPan === "metal") {
      flash = { text: "finish or clear the run before swapping the cylinder", until: Date.now() + 3000 };
      refreshReadouts();
      return;
    }
    metal = sym;
    flash = { text: "working on the " + SH.NAMES[sym] + " cylinder now (stamp stays X until you log it)",
      until: Date.now() + 3500 };
    refreshAll();
    saveState();
  }
  $("snBtn").addEventListener("click", function () { setMetal("Sn"); });
  $("znBtn").addEventListener("click", function () { setMetal("Zn"); });
  $("cuBtn").addEventListener("click", function () { setMetal("Cu"); });
  $("pbBtn").addEventListener("click", function () { setMetal("Pb"); });
  $("boilerBtn").addEventListener("click", function () {
    boilerOn = !boilerOn;
    if (boilerOn) {
      boilerStart = Date.now();
      flash = { text: "the water is heating - wait for the BOILING note", until: Date.now() + 3000 };
    } else {
      flash = { text: "boiler off", until: Date.now() + 2000 };
    }
    refreshAll();
    saveState();
  });
  $("transferBtn").addEventListener("click", function () {
    if (transfer === "running") return;
    if (transfer === "done") {
      flash = { text: "the cylinder is already in the cup", until: Date.now() + 2500 };
      refreshReadouts();
      return;
    }
    if (!cylAtTs()) {
      flash = { text: "the cylinder must be in the boiling water at 100 C first", until: Date.now() + 3000 };
      refreshReadouts();
      return;
    }
    if (ti === null) {
      flash = { text: "read T_i first: drag the probe into the cup", until: Date.now() + 3000 };
      refreshReadouts();
      return;
    }
    genFunTransfer();
    transfer = "running";
    transferStart = Date.now();
    cylInBoiler = false;
    onPan = null;
    flash = { text: "transfer running - in Fun Mode the slow trip leaks heat to the room",
      until: Date.now() + 3500 };
    refreshAll();
    saveState();
  });
  $("stirBtn").addEventListener("click", function () {
    if (transfer !== "done") {
      flash = { text: "there is nothing to stir yet - transfer the cylinder first", until: Date.now() + 3000 };
      refreshReadouts();
      return;
    }
    stirOn = !stirOn;
    if (stirOn) lastStirTick = Date.now();
    refreshAll();
  });
  $("logRunBtn").addEventListener("click", function () {
    if (logged) return;
    if (!cylInCup) {
      flash = { text: "the cylinder must be in the cup (Part II + Part III)", until: Date.now() + 3000 };
      refreshReadouts();
      return;
    }
    if (ti === null) {
      flash = { text: "lock in T_i first with the probe in the cup", until: Date.now() + 3000 };
      refreshReadouts();
      return;
    }
    if (!tfValid()) {
      flash = { text: "stir for a couple of seconds so T_f settles", until: Date.now() + 3000 };
      refreshReadouts();
      return;
    }
    var ms = mode === "fun" ? fun.ms : SH.RUN.ms;
    var mc = mode === "fun" ? fun.mc : SH.RUN.mc;
    var mcap = mode === "fun" ? fun.mcap : SH.RUN.mcw;
    var tf = tfRead();
    var cs = SH.cFrom(mc, mcap - mc, ms, ti, SH.T_BOIL, tf);
    var acc = SH.TABLE2[metal];
    logged = {
      metal: metal, ms: ms, mc: mc, mcap: mcap, mw: mcap - mc,
      ti: ti, ts: SH.T_BOIL, tf: tf, cs: cs, accepted: acc,
      pct: SH.pctError(cs, acc)
    };
    revealed = true;
    flash = {
      text: "the stamp is " + metal + " (" + SH.NAMES[metal] + ") - your c_s sits " +
        fmt(logged.pct, 1) + " % from the accepted line",
      until: Date.now() + 5500
    };
    refreshAll();
    saveState();
  });
  $("newRunBtn").addEventListener("click", function () {
    revealed = false; logged = null;
    boilerOn = false; cylInBoiler = false; cylInCup = false;
    onPan = null; probeAt = "rest"; ti = null;
    transfer = "idle"; transferStart = 0;
    stirOn = false; stirAccum = 0;
    wMs = false; wMc = false; wMcap = false;
    LS.store.clear(LAB, "log");
    $("csvCopy").style.display = "none";
    if (mode === "fun") { genFun(); }
    flash = { text: "new run - pick a cylinder and weigh the three masses", until: Date.now() + 3500 };
    refreshAll();
    saveState();
  });
  $("exportLog").addEventListener("click", function () {
    LS.store.exportCSV("phy110-lab8-specific-heat.csv", CSV_HEADER, csvRows(), $("csvCopy"));
  });

  // ---------- dragging ----------
  function evPos(ev) {
    var r = cv.getBoundingClientRect();
    return { x: (ev.clientX - r.left), y: (ev.clientY - r.top) };
  }
  function inRect(p, rc) {
    return p.x >= rc.x0 - 6 && p.x <= rc.x1 + 6 && p.y >= rc.y0 - 6 && p.y <= rc.y1 + 6;
  }
  function itemRect(key) {
    if (key === "metal") {
      if (cylInBoiler) return INBOIL;
      if (cylInCup) return INCUP;
      if (onPan === "metal") return ONPAN.metal;
      return SLOTS.metal;
    }
    if (key === "cup") return onPan === "cup" ? ONPAN.cup : SLOTS.cup;
    return onPan === "cupwater" ? ONPAN.cupwater : SLOTS.cupwater;
  }
  function hitItem(p) {
    var order = ["metal", "cup", "cupwater"];
    for (var i = 0; i < order.length; i++) {
      var k = order[i];
      var rc = itemRect(k);
      if (p.x >= rc.x - 8 && p.x <= rc.x + rc.w + 8 && p.y >= rc.y - 8 && p.y <= rc.y + rc.h + 8) {
        return k;
      }
    }
    return null;
  }
  function hitProbe(p) {
    var d = DOCKS[probeAt];
    return Math.hypot(p.x - d.x, p.y - (d.y - 10)) < 26;
  }
  cv.addEventListener("pointerdown", function (ev) {
    var p = evPos(ev);
    if (hitProbe(p)) {
      drag = { what: "probe", x: p.x, y: p.y };
      cv.setPointerCapture(ev.pointerId);
      return;
    }
    if (logged) return;
    var it = hitItem(p);
    if (it === "metal" && cylInCup) return; // it is in the cup, the run is under way
    if (it) {
      drag = { what: it, x: p.x, y: p.y, from: it };
      cv.setPointerCapture(ev.pointerId);
    }
  });
  cv.addEventListener("pointermove", function (ev) {
    if (!drag) return;
    var p = evPos(ev);
    drag.x = p.x; drag.y = p.y;
    drawBench();
  });
  function drop(ev) {
    if (!drag) return;
    var p = evPos(ev);
    if (drag.what === "probe") {
      var best = null, bestD = 34;
      Object.keys(DOCKS).forEach(function (k) {
        var d = DOCKS[k];
        var dd = Math.hypot(p.x - d.x, p.y - d.y);
        if (dd < bestD) { bestD = dd; best = k; }
      });
      if (best) {
        probeAt = best;
        if (best === "calor" && transfer === "idle" && ti === null) {
          ti = SH.readC(mode === "fun" ? fun.ti : SH.RUN.ti);
          flash = { text: "T_i locked at " + fmt(ti, 1) + " C", until: Date.now() + 3000 };
        }
      }
    } else {
      var it = drag.what;
      if (it === "metal" && cylInCup) { drag = null; return; }
      if (inRect(p, { x0: BOIL.x0, x1: BOIL.x1, y0: BOIL.y0 - 30, y1: BOIL.y1 })) {
        if (it === "metal") {
          onPan = null;
          cylInBoiler = true;
          warmStart = Date.now();
          flash = { text: boilerOn
            ? (boiling() ? "cylinder in the boiling water - wait for it to reach 100 C"
              : "the water is not boiling yet - the cylinder waits")
            : "the boiler is off - turn it on to bring the cylinder to T_s",
            until: Date.now() + 3500 };
        } else {
          flash = { text: "only the metal cylinder goes in the boiler", until: Date.now() + 2500 };
        }
      } else if (inRect(p, PAN_ZONE)) {
        cylInBoiler = false;
        onPan = it;
        if (it === "metal") wMs = true;
        if (it === "cup") wMc = true;
        if (it === "cupwater") wMcap = true;
        flash = { text: "weighing " + (it === "metal" ? "m_s" : it === "cup" ? "m_c" : "m_c + m_w") +
          " - " + fmt(panG(), 2) + " g", until: Date.now() + 3000 };
      } else {
        // back on the shelf
        if (it === "metal") cylInBoiler = false;
        onPan = null;
      }
    }
    drag = null;
    refreshAll();
    saveState();
  }
  cv.addEventListener("pointerup", drop);
  cv.addEventListener("pointercancel", function () { drag = null; drawBench(); });

  // ---------- boot ----------
  function resizeStages() {
    var w = Math.round(Math.max(560, (cv.clientWidth || 700)) * dpr);
    cv.width = w;
    cv.height = Math.round(CANVAS_H * dpr);
    drawBench();
  }
  window.addEventListener("resize", resizeStages);

  setInterval(function () {
    var now = Date.now();
    if (stirOn && transfer === "done") {
      stirAccum += now - lastStirTick;
      lastStirTick = now;
    }
    if (flash && now >= flash.until) flash = null;
    if (transfer === "running" && now - transferStart >= TRANSFER_MS) {
      transfer = "done";
      cylInCup = true;
      stirAccum = 0;
      flash = {
        text: mode === "fun"
          ? "cylinder in the cup - this transfer leaked ~" + fmt(fun.lossCal, 0) +
            " cal and " + fmt(fun.mHot, 1) + " g of hot water; stir to settle T_f"
          : "cylinder in the cup (the ideal mix loses nothing) - stir to settle T_f",
        until: now + 5000
      };
      saveState();
    }
    // redraw while anything is alive (boil, stir, drag, flash)
    if (boilerOn || stirOn || drag || (flash && now < flash.until) ||
        transfer === "running") {
      drawBench();
      refreshReadouts();
    }
  }, 60);

  loadState();
  if (mode === "fun" && !funLoaded) genFun();
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (m) {
    mode = m;
    if (mode === "fun") genFun();
    refreshAll();
    saveState();
  });
  LS.check.init(LAB);
  refreshAll();
  resizeStages();
})();
