// PHY110 Lab 9 sim: the Ohm's law bench. A DC supply with a 0-12 V knob, a
// resistor bay with slide-in 200 ohm and 100 ohm modules, an ammeter on the
// 100 mA scale in series, a voltmeter on the 15 V range across the resistor,
// a tap key, a drag-wire circuit builder with an auto-check, and a V-I graph
// with best-fit lines forced through (0, 0).
//
// Course Mode is exact: I = V / R at the nominal, the needles land on the
// point, the slope is the nominal. Fun Mode warms each module up by up to
// 2 %, gives the ammeter +-1 mA parallax per logged point, and wobbles the
// dial by +-0.05 V. The ammeter pegs past its 100 mA stop, and the bench
// refuses the point: the 5.5 V cap on the 100 ohm run is a meter-range
// artefact, not physics. Fun Mode never changes the nominal values, the
// set-points, or the meter ranges.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units, O = LS.ohmslaw;
  var LAB = "09-ohms-law";
  var $ = function (id) { return document.getElementById(id); };
  var mode = LS.ui.getMode(LAB);

  function fmt(x, d) {
    if (!isFinite(x)) return "-";
    return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  }
  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }

  // ---------- bench geometry (css px) ----------
  var CH = 480, GH = 360;
  var cv = $("circuitCanvas"), cx = cv.getContext("2d");
  var gv = $("viCanvas"), gx = gv.getContext("2d");
  var dpr = window.devicePixelRatio || 1;

  var TERM = {
    SUPp: { x: 150, y: 190, label: "supply +" },
    SUPm: { x: 150, y: 250, label: "supply -" },
    AMMp: { x: 275, y: 110, label: "ammeter in" },
    AMMm: { x: 385, y: 110, label: "ammeter out" },
    RES1: { x: 290, y: 295, label: "resistor left" },
    RES2: { x: 390, y: 295, label: "resistor right" },
    Vp: { x: 277, y: 425, label: "voltmeter +" },
    Vm: { x: 383, y: 425, label: "voltmeter -" }
  };
  var REQUIRED = [["SUPp", "AMMp"], ["AMMm", "RES1"], ["RES2", "SUPm"],
    ["Vp", "RES1"], ["Vm", "RES2"]];
  var TRAY = {
    red: [{ x: 560, y: 70 }, { x: 620, y: 70 }, { x: 680, y: 70 }],
    black: [{ x: 560, y: 130 }, { x: 620, y: 130 }, { x: 680, y: 130 }]
  };

  // ---------- circuit state ----------
  var wires = [];            // [{a, b, color}]
  var dangling = null;       // {color, t}
  var freeLeads = { red: 3, black: 3 };
  var wiringOK = false;
  var v = 0;                 // the dial
  var keyClosed = false;
  var bay = null;            // "200" | "100"
  var drift = { "200": 0, "100": 0 };
  var runs = { "200": [], "100": [] };   // logged points {v, iMa}
  var flash = null;
  var drag = null;           // {kind: "tray"|"dangle", color, x, y, idx}

  function trueR() {
    if (!bay) return NaN;
    var nom = O.SETS[bay === "200" ? "R200" : "R100"].nominal;
    return mode === "fun" ? O.driftedR(nom, drift[bay]) : nom;
  }
  function iMaNow() {
    if (!wiringOK || !bay || !keyClosed) return 0;
    return O.currentMa(trueR(), v);
  }
  function pegged() { return iMaNow() > O.AMMETER_MA; }
  function dialShown() {
    if (mode !== "fun") return v;
    var w = ((v * 7919) % 100) / 100 - 0.5;   // stable +-0.05 V wobble
    return v + w * 0.1;
  }
  function pairKey(a, b) { return a < b ? a + "|" + b : b + "|" + a; }
  function terminalBusy(t) {
    if (dangling && dangling.t === t) return true;
    for (var i = 0; i < wires.length; i++) {
      if (wires[i].a === t || wires[i].b === t) return true;
    }
    return false;
  }
  function recomputeWiring() {
    var have = {};
    wires.forEach(function (w) { have[pairKey(w.a, w.b)] = true; });
    var missing = 0, extra = 0;
    REQUIRED.forEach(function (p) { if (!have[pairKey(p[0], p[1])]) missing++; });
    Object.keys(have).forEach(function (k) {
      var ok = REQUIRED.some(function (p) { return pairKey(p[0], p[1]) === k; });
      if (!ok) extra++;
    });
    wiringOK = missing === 0 && extra === 0;
    if (!wiringOK) keyClosed = false;
  }
  function slopeOf(runKey) {
    var pts = runs[runKey].map(function (p) { return { v: p.v, i: p.iMa / 1000 }; });
    return O.slopeThroughOrigin(pts);
  }

  // ---------- persistence ----------
  function saveState() {
    LS.store.save(LAB, "state", ["state"], [[JSON.stringify({
      wires: wires, v: v, bay: bay, runs: runs, drift: drift, mode: mode
    })]]);
    LS.store.save(LAB, "log", CSV_HEADER, csvRows());
  }
  function loadState() {
    try {
      var got = LS.store.load(LAB, "state");
      if (!got || !got.rows || !got.rows.length) return;
      var st = JSON.parse(got.rows[0][0]);
      wires = st.wires || []; v = st.v || 0; bay = st.bay || null;
      runs = st.runs || { "200": [], "100": [] };
      drift = st.drift || { "200": 0, "100": 0 };
      recomputeWiring();
    } catch (e) {}
  }

  // ---------- readouts ----------
  function noteNow() {
    if (flash && Date.now() < flash.until) return flash.text;
    if (!wiringOK) return "wire the circuit and press Check wiring (Part I)";
    if (!bay) return "the wiring passes - insert a resistor module";
    if (pegged()) return "the needle is past the 100 mA stop - bring the dial down";
    if (keyClosed) return "read the meters, then Log point";
    return "close the tap key at the set-point you dialed";
  }
  function refreshReadouts() {
    $("voltRead").textContent = fmt(dialShown(), 1) + " V";
    var im = iMaNow();
    $("ammRead").textContent = pegged() ? "PAST THE STOP (>100 mA)" :
      fmt(im, 1) + " mA" + (mode === "fun" && im > 0 ? "  (face)" : "");
    $("voltmRead").textContent = (wiringOK && bay && keyClosed) ?
      fmt(O.voltageV(trueR(), im / 1000), 2) + " V" : "0.0 V";
    $("wireRead").textContent = wiringOK ? "wiring OK - meters live" :
      (wires.length ? "wiring incomplete" : "unwired");
    $("keyBtn").textContent = keyClosed ? "Tap key: closed" : "Tap key: open";
    $("keyBtn").className = keyClosed ? "action" : "action ghost";
    $("voltSlider").value = v;
    $("ins200").className = bay === "200" ? "action" : "action ghost";
    $("ins100").className = bay === "100" ? "action" : "action ghost";
    $("noteRead").textContent = noteNow();
    $("t1meta").textContent = metaText("200");
    $("t2meta").textContent = metaText("100");
    $("slopeRead").textContent = slopeSummary();
  }
  function metaText(runKey) {
    var set = runKey === "200" ? O.SETS.R200 : O.SETS.R100;
    var s = slopeOf(runKey);
    if (!isFinite(s)) return "nominal " + set.nominal + " ohm / slope - / % error -";
    return "nominal " + set.nominal + " ohm / slope " + fmt(s, 1) +
      " ohm / % error " + fmt(O.pctError(s, set.nominal), 1) + " %";
  }
  function slopeSummary() {
    var a = slopeOf("200"), b = slopeOf("100");
    var parts = [];
    if (isFinite(a)) parts.push("200 ohm line: slope " + fmt(a, 1) + " ohm");
    if (isFinite(b)) parts.push("100 ohm line: slope " + fmt(b, 1) + " ohm");
    return parts.length ? parts.join("  |  ") : "log points to draw the lines";
  }

  // ---------- data tables ----------
  var CSV_HEADER = ["run", "V (V)", "I (mA)", "I (A)"];
  function runRows(runKey) {
    var rows = [["0", "0", "0"]];
    runs[runKey].slice().sort(function (a, b) { return a.v - b.v; })
      .forEach(function (p) {
        rows.push([fmt(p.v, 1), fmt(p.iMa, 1), fmt(p.iMa / 1000, 3)]);
      });
    return rows;
  }
  function csvRows() {
    var rows = [];
    rows.push(["200 ohm", "0", "0", "0"]);
    rows.push(["100 ohm", "0", "0", "0"]);
    runs["200"].forEach(function (p) {
      rows.push(["200 ohm", fmt(p.v, 1), fmt(p.iMa, 1), fmt(p.iMa / 1000, 3)]);
    });
    runs["100"].forEach(function (p) {
      rows.push(["100 ohm", fmt(p.v, 1), fmt(p.iMa, 1), fmt(p.iMa / 1000, 3)]);
    });
    return rows;
  }
  function renderTables() {
    $("table1").innerHTML = LS.store.tableHTML(["V (V)", "I (mA)", "I (A)"], runRows("200"));
    $("table2").innerHTML = LS.store.tableHTML(["V (V)", "I (mA)", "I (A)"], runRows("100"));
    renderWorkBox();
  }
  function renderWorkBox() {
    var lines = ["V = R I with V vertical, I horizontal: the slope through (0,0) is R in ohm"];
    lines.push("ammeter 100 mA scale in series; voltmeter 15 V range across the resistor; 1 A = 1000 mA");
    ["200", "100"].forEach(function (rk) {
      var s = slopeOf(rk);
      lines.push(rk + " ohm run: " + runs[rk].length + " points" +
        (isFinite(s) ? ", slope = sum(V I)/sum(I^2) = " + fmt(s, 1) + " ohm, % error " +
          fmt(O.pctError(s, O.SETS[rk === "200" ? "R200" : "R100"].nominal), 1) + " %" : ""));
    });
    if (mode === "fun" && bay) {
      lines.push("Fun Mode: this module is warmed up by " +
        fmt(drift[bay] * 100, 1) + " %, the face carries +-1 mA parallax");
    }
    lines.push("the 100 ohm run stops at 5.5 V: 11 V would give " +
      fmt(O.currentMa(100, 11), 0) + " mA, past the stop (meter range, not physics)");
    $("workBox").textContent = lines.join("\n");
  }
  function refreshAll() {
    refreshReadouts();
    renderTables();
    drawCircuit();
    drawGraph();
  }

  // ---------- drawing: circuit ----------
  function drawMeter(mx, my, r, frac, label, scaleMax, unit, peg) {
    cx.fillStyle = "#101a2e";
    cx.beginPath(); cx.arc(mx, my, r, 0, 6.29); cx.fill();
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(mx, my, r, 0, 6.29); cx.stroke();
    var a0 = -Math.PI * 2 / 3, a1 = Math.PI * 2 / 3;
    cx.strokeStyle = "#4a5f8a"; cx.lineWidth = 1;
    cx.beginPath(); cx.arc(mx, my, r - 8, a0, a1); cx.stroke();
    for (var t = 0; t <= 10; t++) {
      var a = a0 + (a1 - a0) * t / 10;
      var long = t % 5 === 0;
      cx.strokeStyle = long ? "#9fb4d8" : "#4a5f8a";
      cx.beginPath();
      cx.moveTo(mx + (r - 8) * Math.cos(a), my + (r - 8) * Math.sin(a));
      cx.lineTo(mx + (r - (long ? 16 : 12)) * Math.cos(a), my + (r - (long ? 16 : 12)) * Math.sin(a));
      cx.stroke();
    }
    var f = Math.max(0, Math.min(1, frac));
    var na = a0 + (a1 - a0) * (peg ? 1 : f);
    cx.strokeStyle = peg ? "#ff6b6b" : "#ffd166"; cx.lineWidth = 2.5;
    cx.beginPath();
    cx.moveTo(mx, my);
    cx.lineTo(mx + (r - 18) * Math.cos(na), my + (r - 18) * Math.sin(na));
    cx.stroke();
    cx.fillStyle = peg ? "#ff6b6b" : "#8fd3ff";
    cx.font = "10px ui-monospace, monospace";
    cx.textAlign = "center"; cx.textBaseline = "top";
    cx.fillText(label + " (0-" + scaleMax + " " + unit + ")", mx, my + r + 4);
    if (peg) {
      cx.fillStyle = "#ff6b6b"; cx.font = "9px system-ui, sans-serif";
      cx.fillText("PAST THE STOP", mx, my + r + 18);
    }
  }
  function drawCircuit() {
    var w = cv.width / dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, w, CH);
    cx.fillStyle = "#0d1526"; cx.fillRect(0, 0, w, CH);
    // supply
    cx.fillStyle = "#23324e";
    cx.fillRect(40, 170, 110, 100);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1.5;
    cx.strokeRect(40, 170, 110, 100);
    cx.fillStyle = "#9fb4d8"; cx.font = "11px system-ui, sans-serif";
    cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillText("DC supply", 95, 195);
    cx.fillStyle = "#ffd166"; cx.font = "14px ui-monospace, monospace";
    cx.fillText(fmt(dialShown(), 1) + " V", 95, 220);
    cx.fillStyle = "#9fb4d8"; cx.font = "9px system-ui, sans-serif";
    cx.fillText("knob 0-12 V", 95, 245);
    // tap key on the return
    cx.fillStyle = keyClosed ? "#2e4a3c" : "#23324e";
    cx.fillRect(180, 300, 60, 34);
    cx.strokeStyle = keyClosed ? "#8affc1" : "#6d84ad";
    cx.strokeRect(180, 300, 60, 34);
    cx.fillStyle = keyClosed ? "#8affc1" : "#9fb4d8"; cx.font = "9px system-ui, sans-serif";
    cx.fillText("tap key", 210, 312);
    cx.fillText(keyClosed ? "closed" : "open", 210, 325);
    // meters
    var im = iMaNow();
    drawMeter(330, 110, 55, im / 100, "AMMETER", 100, "mA", pegged());
    drawMeter(330, 425, 50, (wiringOK && bay && keyClosed ? O.voltageV(trueR(), im / 1000) : 0) / 15,
      "VOLT METER", 15, "V", false);
    // resistor bay
    cx.fillStyle = "#1b2740";
    cx.fillRect(270, 260, 140, 70);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1.5;
    cx.strokeRect(270, 260, 140, 70);
    cx.fillStyle = "#9fb4d8"; cx.font = "9px system-ui, sans-serif";
    cx.textAlign = "center"; cx.textBaseline = "top";
    cx.fillText("resistor bay", 340, 264);
    if (bay) {
      cx.fillStyle = bay === "200" ? "#8a5a3a" : "#3a5a8a";
      cx.fillRect(300, 282, 80, 34);
      cx.strokeStyle = "#dce6f5"; cx.lineWidth = 1;
      cx.strokeRect(300, 282, 80, 34);
      // the resistor zigzag
      cx.strokeStyle = "#ffd166"; cx.lineWidth = 1.5;
      cx.beginPath();
      var zx = 308;
      cx.moveTo(zx, 299);
      for (var i = 0; i < 5; i++) {
        zx += 6;
        cx.lineTo(zx, i % 2 ? 292 : 306);
      }
      cx.lineTo(372, 299);
      cx.stroke();
      cx.fillStyle = "#1c2434"; cx.font = "10px ui-monospace, monospace";
      cx.textAlign = "center"; cx.textBaseline = "middle";
      cx.fillText(bay + " ohm", 340, 292);
    } else {
      cx.fillStyle = "#6d84ad"; cx.font = "9px system-ui, sans-serif";
      cx.fillText("(empty)", 340, 296);
    }
    // wires
    cx.lineWidth = 3;
    wires.forEach(function (wr) {
      var a = TERM[wr.a], b = TERM[wr.b];
      cx.strokeStyle = wr.color === "red" ? "#e05555" : "#4a6a9a";
      cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke();
    });
    if (dangling) {
      var a2 = TERM[dangling.t];
      cx.strokeStyle = dangling.color === "red" ? "#e05555" : "#4a6a9a";
      cx.setLineDash([5, 4]);
      cx.beginPath(); cx.moveTo(a2.x, a2.y);
      cx.lineTo(drag && drag.kind === "dangle" ? drag.x : a2.x + 30,
        drag && drag.kind === "dangle" ? drag.y : a2.y);
      cx.stroke();
      cx.setLineDash([]);
    }
    // terminals
    Object.keys(TERM).forEach(function (k) {
      var t = TERM[k];
      cx.fillStyle = "#0d1526";
      cx.beginPath(); cx.arc(t.x, t.y, 8, 0, 6.29); cx.fill();
      cx.strokeStyle = terminalBusy(k) ? "#ffd166" : "#9fb4d8";
      cx.lineWidth = 2;
      cx.beginPath(); cx.arc(t.x, t.y, 8, 0, 6.29); cx.stroke();
      cx.fillStyle = "#9fb4d8"; cx.font = "8.5px system-ui, sans-serif";
      cx.textAlign = "center"; cx.textBaseline = "bottom";
      cx.fillText(t.label, t.x, t.y - 10);
    });
    // lead tray
    cx.fillStyle = "#1b2740";
    cx.fillRect(520, 40, 230, 120);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1;
    cx.strokeRect(520, 40, 230, 120);
    cx.fillStyle = "#9fb4d8"; cx.font = "10px system-ui, sans-serif";
    cx.textAlign = "center"; cx.textBaseline = "top";
    cx.fillText("lead tray (drag a lead to a terminal)", 635, 46);
    Object.keys(TRAY).forEach(function (col) {
      TRAY[col].forEach(function (p, i) {
        var used = freeLeads[col] <= i;
        cx.fillStyle = col === "red" ? (used ? "#5a3a3a" : "#e05555") : (used ? "#2e3a4e" : "#7d9cc4");
        cx.beginPath(); cx.arc(p.x, p.y, 9, 0, 6.29); cx.fill();
        cx.strokeStyle = "#0d1526"; cx.lineWidth = 1.5;
        cx.beginPath(); cx.arc(p.x, p.y, 9, 0, 6.29); cx.stroke();
        cx.fillStyle = "#0d1526"; cx.font = "8px ui-monospace, monospace";
        cx.textBaseline = "middle";
        cx.fillText(col === "red" ? "R" : "B", p.x, p.y + 0.5);
      });
    });
    // the dragged lead
    if (drag && drag.kind === "tray") {
      cx.fillStyle = drag.color === "red" ? "#e05555" : "#7d9cc4";
      cx.beginPath(); cx.arc(drag.x, drag.y, 10, 0, 6.29); cx.fill();
    }
  }

  // ---------- drawing: V-I graph ----------
  var GX0 = 52, GY0 = 24, GX1 = null, GY1 = null;
  function geom() {
    var w = gv.width / dpr;
    return { w: w, x0: GX0, y0: GY0, x1: w - 24, y1: GH - 40 };
  }
  function iToX(g, iA) { return g.x0 + (iA / 0.115) * (g.x1 - g.x0); }
  function vToY(g, vv) { return g.y1 - (vv / 12) * (g.y1 - g.y0); }
  function drawGraph() {
    var g = geom();
    gx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gx.clearRect(0, 0, g.w, GH);
    gx.fillStyle = "#0d1526"; gx.fillRect(0, 0, g.w, GH);
    // grid
    gx.strokeStyle = "#23324e"; gx.lineWidth = 1;
    gx.fillStyle = "#6d84ad"; gx.font = "9px ui-monospace, monospace";
    gx.textAlign = "center"; gx.textBaseline = "top";
    for (var ia = 0; ia <= 0.115 + 1e-9; ia += 0.025) {
      var x = iToX(g, ia);
      gx.beginPath(); gx.moveTo(x, g.y0); gx.lineTo(x, g.y1); gx.stroke();
      gx.fillText(String(Math.round(ia * 1000)) + " mA", x, g.y1 + 6);
    }
    gx.textAlign = "right"; gx.textBaseline = "middle";
    for (var vv = 0; vv <= 12; vv += 2) {
      var y = vToY(g, vv);
      gx.beginPath(); gx.moveTo(g.x0, y); gx.lineTo(g.x1, y); gx.stroke();
      gx.fillText(String(vv), g.x0 - 6, y);
    }
    gx.textAlign = "left"; gx.textBaseline = "bottom";
    gx.fillText("I (mA) horizontal  /  V (V) vertical", g.x0, g.y0 - 6);
    // the two best-fit lines through (0,0)
    var lineSpec = [["200", "#ffd166"], ["100", "#8fd3ff"]];
    lineSpec.forEach(function (ls) {
      var s = slopeOf(ls[0]);
      if (!isFinite(s)) return;
      var iMax = Math.min(0.115, 12 / s);
      gx.strokeStyle = ls[1]; gx.lineWidth = 1.8;
      gx.beginPath();
      gx.moveTo(iToX(g, 0), vToY(g, 0));
      gx.lineTo(iToX(g, iMax), vToY(g, s * iMax));
      gx.stroke();
    });
    // the points
    var ptSpec = [["200", "#ffd166"], ["100", "#8fd3ff"]];
    ptSpec.forEach(function (ps) {
      runs[ps[0]].forEach(function (p) {
        gx.fillStyle = ps[1];
        gx.beginPath();
        gx.arc(iToX(g, p.iMa / 1000), vToY(g, p.v), 3.5, 0, 6.29);
        gx.fill();
        gx.strokeStyle = "#0d1526"; gx.lineWidth = 1; gx.stroke();
      });
    });
    // legend
    gx.font = "10px system-ui, sans-serif"; gx.textBaseline = "middle";
    gx.fillStyle = "#ffd166";
    gx.fillRect(g.x1 - 118, g.y0 + 8, 10, 3);
    gx.fillText("200 ohm run", g.x1 - 102, g.y0 + 10);
    gx.fillStyle = "#8fd3ff";
    gx.fillRect(g.x1 - 118, g.y0 + 26, 10, 3);
    gx.fillText("100 ohm run", g.x1 - 102, g.y0 + 28);
  }

  // ---------- controls ----------
  $("voltSlider").addEventListener("input", function () {
    v = Math.round(parseFloat(this.value) * 2) / 2;
    keyClosed = false;
    refreshAll();
  });
  $("voltSlider").addEventListener("change", function () { saveState(); });
  function insertBay(key) {
    if (v !== 0) {
      flash = { text: "bring the supply to 0 V before swapping resistors", until: Date.now() + 3000 };
      refreshReadouts();
      return;
    }
    bay = key;
    keyClosed = false;
    if (mode === "fun") drift[key] = Math.random() * O.WARM_DRIFT_MAX;
    flash = {
      text: mode === "fun"
        ? key + " ohm module in - it warms up by " + fmt(drift[key] * 100, 1) + " % as it takes current"
        : key + " ohm module in - the nominal is printed on it",
      until: Date.now() + 3500
    };
    refreshAll();
    saveState();
  }
  $("ins200").addEventListener("click", function () { insertBay("200"); });
  $("ins100").addEventListener("click", function () { insertBay("100"); });
  $("keyBtn").addEventListener("click", function () {
    if (!wiringOK) {
      flash = { text: "the wiring must pass the check before the key does anything", until: Date.now() + 3000 };
      refreshReadouts();
      return;
    }
    if (!bay) {
      flash = { text: "insert a resistor module first", until: Date.now() + 2500 };
      refreshReadouts();
      return;
    }
    keyClosed = !keyClosed;
    if (keyClosed && pegged()) {
      flash = {
        text: "the needle pegs past the 100 mA stop - " + fmt(O.currentMa(O.SETS[bay === "200" ? "R200" : "R100"].nominal, v), 0) +
          " mA at " + fmt(v, 1) + " V. That is why the run stops where it stops.",
        until: Date.now() + 5000
      };
    }
    refreshAll();
    saveState();
  });
  $("checkWireBtn").addEventListener("click", function () {
    var have = {};
    wires.forEach(function (w) { have[pairKey(w.a, w.b)] = w; });
    var msgs = [];
    REQUIRED.forEach(function (p) {
      if (!have[pairKey(p[0], p[1])]) {
        msgs.push("missing: " + TERM[p[0]].label + " to " + TERM[p[1]].label);
      }
    });
    Object.keys(have).forEach(function (k) {
      var ok = REQUIRED.some(function (p) { return pairKey(p[0], p[1]) === k; });
      if (!ok) {
        var ab = k.split("|");
        msgs.push("wrong: " + TERM[ab[0]].label + " to " + TERM[ab[1]].label + " is not part of this circuit");
      }
    });
    recomputeWiring();
    if (wiringOK) {
      flash = { text: "wiring good - ammeter in series, voltmeter across. The meters are live.",
        until: Date.now() + 4000 };
    } else if (msgs.length) {
      flash = { text: msgs.join("; "), until: Date.now() + 5500 };
    } else {
      flash = { text: "nothing is wired yet - drag leads from the tray", until: Date.now() + 3000 };
    }
    refreshAll();
    saveState();
  });
  $("logPtBtn").addEventListener("click", function () {
    if (!wiringOK || !bay) {
      flash = { text: "wire the circuit and insert a module first", until: Date.now() + 2500 };
      refreshReadouts();
      return;
    }
    if (!keyClosed) {
      flash = { text: "close the tap key at the set-point, then log", until: Date.now() + 2500 };
      refreshReadouts();
      return;
    }
    if (v === 0) {
      flash = { text: "the (0, 0) row is already on the table - dial a set-point", until: Date.now() + 2500 };
      refreshReadouts();
      return;
    }
    if (pegged()) {
      flash = {
        text: "the ammeter cannot read past its 100 mA stop - bring the dial down",
        until: Date.now() + 3500
      };
      refreshReadouts();
      return;
    }
    var im = iMaNow();
    if (mode === "fun") im += rand(-O.NOISE_MA, O.NOISE_MA);
    im = Math.max(0, im);
    var pts = runs[bay];
    for (var i = 0; i < pts.length; i++) {
      if (pts[i].v === v) { pts[i].iMa = im; break; }
      pts.push({ v: v, iMa: im });
    }
    flash = {
      text: "point logged: " + fmt(v, 1) + " V, " + fmt(im, 1) + " mA on the " + bay + " ohm run",
      until: Date.now() + 3000
    };
    refreshAll();
    saveState();
  });
  $("clearAllBtn").addEventListener("click", function () {
    wires = []; dangling = null; freeLeads = { red: 3, black: 3 };
    wiringOK = false; keyClosed = false; runs = { "200": [], "100": [] };
    LS.store.clear(LAB, "log");
    $("csvCopy").style.display = "none";
    flash = { text: "cleared - the leads are back in the tray", until: Date.now() + 2500 };
    refreshAll();
    saveState();
  });
  $("exportLog").addEventListener("click", function () {
    LS.store.exportCSV("phy110-lab9-ohms-law.csv", CSV_HEADER, csvRows(), $("csvCopy"));
  });

  // ---------- dragging: leads ----------
  function evPos(ev) {
    var r = cv.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }
  function hitTerm(p) {
    var best = null, bd = 16;
    Object.keys(TERM).forEach(function (k) {
      var t = TERM[k];
      var d = Math.hypot(p.x - t.x, p.y - t.y);
      if (d < bd) { bd = d; best = k; }
    });
    return best;
  }
  function hitTray(p) {
    var best = null;
    Object.keys(TRAY).forEach(function (col) {
      TRAY[col].forEach(function (tp, i) {
        if (freeLeads[col] <= i) return;   // that lead is out
        if (Math.hypot(p.x - tp.x, p.y - tp.y) < 14) best = { color: col, idx: i };
      });
    });
    return best;
  }
  function hitWire(p) {
    for (var i = 0; i < wires.length; i++) {
      var a = TERM[wires[i].a], b = TERM[wires[i].b];
      var dx = b.x - a.x, dy = b.y - a.y;
      var len2 = dx * dx + dy * dy;
      var t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
      var px = a.x + t * dx, py = a.y + t * dy;
      if (Math.hypot(p.x - px, p.y - py) < 8) return i;
    }
    return -1;
  }
  cv.addEventListener("pointerdown", function (ev) {
    var p = evPos(ev);
    var tw = hitWire(p);
    if (tw >= 0) {
      var wr = wires[tw];
      freeLeads[wr.color]++;
      wires.splice(tw, 1);
      recomputeWiring();
      flash = { text: "a lead back in the tray - the meters re-check on demand", until: Date.now() + 2500 };
      refreshAll();
      saveState();
      return;
    }
    var tt = hitTerm(p);
    if (tt && dangling && dangling.t === tt) {
      drag = { kind: "dangle", color: dangling.color, x: p.x, y: p.y };
      cv.setPointerCapture(ev.pointerId);
      return;
    }
    var tr = hitTray(p);
    if (tr) {
      freeLeads[tr.color]--;
      drag = { kind: "tray", color: tr.color, x: p.x, y: p.y };
      cv.setPointerCapture(ev.pointerId);
    }
  });
  cv.addEventListener("pointermove", function (ev) {
    if (!drag) return;
    var p = evPos(ev);
    drag.x = p.x; drag.y = p.y;
    drawCircuit();
  });
  cv.addEventListener("pointerup", function (ev) {
    if (!drag) return;
    var p = evPos(ev);
    var tt = hitTerm(p);
    if (drag.kind === "tray") {
      if (tt && !terminalBusy(tt)) {
        dangling = { color: drag.color, t: tt };
        flash = { text: "lead on " + TERM[tt].label + " - now drag it to the second terminal",
          until: Date.now() + 3000 };
      } else {
        freeLeads[drag.color]++;   // back to the tray
      }
    } else if (drag.kind === "dangle") {
      if (tt && tt !== dangling.t && !terminalBusy(tt)) {
        wires.push({ a: dangling.t, b: tt, color: dangling.color });
        dangling = null;
        recomputeWiring();
        flash = { text: "lead set: " + TERM[tt].label + " connected - press Check wiring when all five are in",
          until: Date.now() + 3000 };
      } else if (tt === dangling.t) {
        // dropped back on its own terminal: lead returns to the tray
        dangling = null;
        freeLeads[drag.color]++;
      }
      // otherwise: the lead stays dangling for the next drag
    }
    drag = null;
    refreshAll();
    saveState();
  });
  cv.addEventListener("pointercancel", function () { drag = null; drawCircuit(); });

  // ---------- boot ----------
  function resizeStages() {
    var w1 = Math.round(Math.max(560, (cv.clientWidth || 700)) * dpr);
    cv.width = w1;
    cv.height = Math.round(CH * dpr);
    var w2 = Math.round(Math.max(480, (gv.clientWidth || 600)) * dpr);
    gv.width = w2;
    gv.height = Math.round(GH * dpr);
    drawCircuit();
    drawGraph();
  }
  window.addEventListener("resize", resizeStages);

  setInterval(function () {
    if (flash && Date.now() >= flash.until) { flash = null; refreshReadouts(); }
    if (drag) drawCircuit();
  }, 60);

  loadState();
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (m) {
    mode = m;
    if (mode === "fun" && bay) drift[bay] = Math.random() * O.WARM_DRIFT_MAX;
    refreshAll();
    saveState();
  });
  LS.check.init(LAB);
  refreshAll();
  resizeStages();
})();
