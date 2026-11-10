// PHY110 Lab 10 sim: the series/parallel bench. A breadboard with two
// draggable resistor chips (100 ohm, 200 ohm) and six slots: S1/S2 in a
// series line, P1/P2/P3 on parallel branches. The supply is fixed at 6.0 V
// with an enable switch (no knob), the ammeter (100 mA) sits in the main
// branch with a teaching mode that moves it into branch 1 or 2, the voltmeter
// is a probe pair touched across labelled nodes (A-B-C series, A-B/C-D
// parallel), a tap key closes the circuit, and an instructor-check button
// stands in for the bench walk-around before power-on.
//
// Course Mode is exact at the nominals. Fun Mode draws each chip once from
// the +-5 % tolerance band when it is placed, and every meter value follows
// the drawn values. Fun Mode never changes the nominals, the 6.0 V set-point,
// or the meter ranges. Parallel I0 = 90 mA sits close to the 100 mA stop; a
// borrowed third parallel resistor pegs it, and the bench names that.
(function () {
  "use strict";
  var LS = window.LS, O = LS.seriesparallel;
  var LAB = "10-series-parallel";
  var $ = function (id) { return document.getElementById(id); };
  var mode = LS.ui.getMode(LAB);

  function fmt(x, d) {
    if (!isFinite(x)) return "-";
    return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  }

  // ---------- bench geometry (css px) ----------
  var CH = 470;
  var cv = $("breadCanvas"), cx = cv.getContext("2d");
  var dpr = window.devicePixelRatio || 1;

  var SUP = { x: 40, y: 60, w: 130, h: 90, tp: { x: 170, y: 90 }, tm: { x: 170, y: 120 } };
  var MAIN_METER = { x: 320, y: 90, r: 40 };
  var GEO = {
    series: {
      nodes: { A: { x: 390, y: 220 }, B: { x: 540, y: 220 }, C: { x: 690, y: 220 } },
      slots: { S1: { x: 465, y: 220 }, S2: { x: 615, y: 220 } }
    },
    parallel: {
      nodes: { A: { x: 390, y: 150 }, C: { x: 690, y: 150 }, B: { x: 390, y: 290 }, D: { x: 690, y: 290 } },
      slots: { P1: { x: 390, y: 220 }, P2: { x: 690, y: 220 }, P3: { x: 540, y: 220 } }
    }
  };
  var KEYBOX = { x: 560, y: 335, w: 60, h: 30 };
  var CHIP_TRAY = { x: 40, y: 380, w: 340, h: 80 };
  var PROBE_TRAY = { x: 620, y: 380, w: 120, h: 80 };
  var PROBE_HOME = { red: { x: 655, y: 405 }, black: { x: 700, y: 435 } };
  var VFACE = { x: 715, y: 262, r: 26 };
  var CHIP_POS = { "100": { x: 110, y: 420 }, "200": { x: 250, y: 420 } };
  var CHIP_COLOR = { "100": "#8a5a3a", "200": "#3a5a8a", "3rd": "#6a4a7a" };

  // ---------- state ----------
  var pos = { "100": null, "200": null };      // slot name or null (tray)
  var borrowed = false;                         // third 100 ohm in P3
  var ammPos = "main";                          // main | b1 | b2
  var probes = { red: null, black: null };      // node name or null (tray)
  var checkPassed = false;
  var power = false, keyClosed = false;
  var tables = { A: null, B: null };
  var draws = { "100": 0, "200": 0 };           // Fun Mode tolerance draws, [-1,1]
  var flash = null, drag = null;

  function layoutNow() {
    var inS = (pos["100"] === "S1" || pos["100"] === "S2") + (pos["200"] === "S1" || pos["200"] === "S2");
    var inP = (pos["100"] === "P1" || pos["100"] === "P2") + (pos["200"] === "P1" || pos["200"] === "P2");
    if (inS === 2) return "series";
    if (inP === 2) return "parallel";
    if (inS === 0 && inP === 0) return "tray";
    return "mixed";
  }
  function chipR(key) {
    var nom = key === "3rd" ? 100 : (key === "100" ? O.R1 : O.R2);
    return mode === "fun" ? O.toleranceR(nom, draws[key]) : nom;
  }
  function chipNom(key) { return key === "3rd" ? 100 : (key === "100" ? O.R1 : O.R2); }

  // the bench as the meters see it
  function bench() {
    var L = layoutNow();
    var out = { layout: L, live: power && keyClosed && (L === "series" || L === "parallel") };
    var zero = { I0ma: 0, I1ma: 0, I2ma: 0, V1: 0, V2: 0, Rmeas: NaN, Pw: 0, pegged: false };
    if (!out.live) {
      out.I0ma = zero.I0ma; out.I1ma = zero.I1ma; out.I2ma = zero.I2ma;
      out.V1 = zero.V1; out.V2 = zero.V2; out.Rmeas = NaN; out.Pw = 0;
      out.pegged = false;
      return out;
    }
    if (L === "series") {
      var k1 = pos["100"] === "S1" ? "100" : "200", k2 = k1 === "100" ? "200" : "100";
      var r1 = chipR(k1), r2 = chipR(k2), Rtot = r1 + r2;
      var I0 = O.currentA(Rtot, O.V0);
      out.I0ma = I0 * 1000; out.I1ma = out.I0ma; out.I2ma = out.I0ma;
      out.V1 = O.dropV(r1, I0); out.V2 = O.dropV(r2, I0);
      out.Rmeas = O.rFromVI(O.V0, I0); out.Pw = O.powerW(O.V0, I0);
      out.nominal = O.seriesRt(chipNom(k1), chipNom(k2));
      out.chipKeys = { V1: k1, V2: k2 };
    } else {
      var br = {};
      ["P1", "P2", "P3"].forEach(function (s, i) {
        var key = s === "P3" ? (borrowed ? "3rd" : null)
          : (pos["100"] === s ? "100" : (pos["200"] === s ? "200" : null));
        br["I" + (i + 1)] = key ? O.currentMa(chipR(key), O.V0) : 0;
      });
      out.I1ma = br.I1; out.I2ma = br.I2;
      out.I0ma = br.I1 + br.I2 + (borrowed ? br.I3 : 0);
      out.V1 = O.V0; out.V2 = O.V0;
      out.Rmeas = O.rFromVI(O.V0, out.I0ma / 1000);
      out.Pw = O.powerW(O.V0, out.I0ma / 1000);
      out.nominal = O.parallelRt(O.R1, O.R2);
    }
    out.pegged = O.overAmmeter(ammeterReading(out));
    return out;
  }
  function ammeterReading(b) {
    if (!b.live) return 0;
    if (b.layout === "series") return b.I0ma;
    if (ammPos === "b1") return b.I1ma;
    if (ammPos === "b2") return b.I2ma;
    return b.I0ma;
  }
  function potentials(b) {
    if (!b.live) return null;
    if (b.layout === "series") {
      var n = GEO.series.nodes;
      return { A: O.V0, B: O.V0 - b.V1, C: 0 };
    }
    return { A: O.V0, C: O.V0, B: 0, D: 0 };
  }
  function probeReading(b) {
    var V = potentials(b);
    if (!V || !probes.red || !probes.black) return null;
    if (!(probes.red in V) || !(probes.black in V)) return null;
    var d = V[probes.red] - V[probes.black];
    return Math.abs(d);
  }

  function rewire() {
    power = false; keyClosed = false; checkPassed = false;
  }
  function nodeLookup(letter) {
    var g = GEO.series.nodes;
    var p = GEO.parallel.nodes;
    if (g[letter]) return g[letter];
    return p[letter] || null;
  }

  // ---------- persistence ----------
  function saveState() {
    LS.store.save(LAB, "state", ["state"], [[JSON.stringify({
      pos: pos, borrowed: borrowed, ammPos: ammPos, probes: probes,
      tables: tables, draws: draws, mode: mode
    })]]);
    LS.store.save(LAB, "log", CSV_HEADER, csvRows());
  }
  function loadState() {
    try {
      var got = LS.store.load(LAB, "state");
      if (!got || !got.rows || !got.rows.length) return;
      var st = JSON.parse(got.rows[0][0]);
      pos = st.pos || { "100": null, "200": null };
      borrowed = !!st.borrowed; ammPos = st.ammPos || "main";
      probes = st.probes || { red: null, black: null };
      tables = st.tables || { A: null, B: null };
      draws = st.draws || { "100": 0, "200": 0 };
    } catch (e) {}
  }

  // ---------- readouts ----------
  function layoutLabel(L) {
    if (L === "series") return "series pair (R1 + R2)";
    if (L === "parallel") return "parallel pair (" + (borrowed ? "3 branches" : "2 branches") + ")";
    if (L === "mixed") return "MIXED - not a pair";
    return "chips in tray";
  }
  function noteNow(b) {
    if (flash && Date.now() < flash.until) return flash.text;
    var L = b.layout;
    if (L === "tray") return "place both chips on the bench, then instructor check";
    if (L === "mixed") return "chips are mixed between layouts - finish one pair";
    if (!checkPassed) return "layout is a " + L + " pair - press the instructor check";
    if (!power) return "checked - flip the enable switch";
    if (!keyClosed) return "powered - close the tap key and read the meters";
    if (b.pegged) return "the needle is past the 100 mA stop - see Learn, honest limits";
    if (ammPos !== "main" && L === "parallel") {
      return "the ammeter is in " + (ammPos === "b1" ? "branch 1 (reads I1)" : "branch 2 (reads I2)") +
        " - the Table A/B I0 row wants the main branch";
    }
    return "read the meters, then log the " + (L === "series" ? "A" : "B") + " table";
  }
  function refreshReadouts() {
    var b = bench();
    var am = ammeterReading(b);
    $("layoutRead").textContent = layoutLabel(b.layout);
    $("ammRead").textContent = b.live ?
      (b.pegged && ammPos === "main" ? "PAST THE STOP (>100 mA)" : fmt(am, 1) + " mA") :
      fmt(am, 1) + " mA";
    var pr = probeReading(b);
    $("voltRead").textContent = pr === null ? "0.0 V" : fmt(pr, 2) + " V";
    $("probeRead").textContent = (probes.red || probes.black)
      ? (probes.red || "-") + " / " + (probes.black || "-") : "tray";
    $("powerBtn").textContent = power ? "Enable switch: ON" : "Enable switch: off";
    $("powerBtn").className = power ? "action" : "action ghost";
    $("keyBtn").textContent = keyClosed ? "Tap key: closed" : "Tap key: open";
    $("keyBtn").className = keyClosed ? "action" : "action ghost";
    $("ammMain").className = ammPos === "main" ? "action" : "action ghost";
    $("ammB1").className = ammPos === "b1" ? "action" : "action ghost";
    $("ammB2").className = ammPos === "b2" ? "action" : "action ghost";
    $("borrowBtn").className = borrowed ? "action" : "action ghost";
    $("noteRead").textContent = noteNow(b);
    $("tAmeta").textContent = tableMeta("A", b);
    $("tBmeta").textContent = tableMeta("B", b);
  }
  function tableMeta(which, b) {
    var t = tables[which];
    if (!t) return which === "A" ? "nominal 300 ohm / R_measured - / % error -"
      : "nominal 66.7 ohm / R_measured - / % error -";
    var rmeas = t.find(function (r) { return r[0] === "R_measured"; })[1];
    var pe = t.find(function (r) { return r[0] === "% error"; })[1];
    var nom = which === "A" ? "300" : "66.7";
    return "nominal " + nom + " ohm / R_measured " + rmeas + " ohm / % error " + pe + " %";
  }

  // ---------- data tables ----------
  var CSV_HEADER = ["part", "quantity", "value", "unit"];
  function eqRow(label, ok) { return [label, ok ? "yes" : "no", "-"]; }
  function tableARows(b) {
    var chk = Math.abs(b.V1 + b.V2 - O.V0) < 1e-9;
    return [
      ["V0", fmt(O.V0, 1), "V"],
      ["I0", fmt(b.I0ma, 1), "mA"],
      ["I0", fmt(b.I0ma / 1000, 3), "A"],
      ["R_measured", fmt(b.Rmeas, 1), "ohm"],
      ["R_nominal (rule)", "300", "ohm"],
      ["% error", fmt(O.pctError(b.Rmeas, 300), 1), "%"],
      ["V1 (" + b.chipKeys.V1 + " ohm)", fmt(b.V1, 2), "V"],
      ["V2 (" + b.chipKeys.V2 + " ohm)", fmt(b.V2, 2), "V"],
      ["V1 + V2", fmt(b.V1 + b.V2, 2), "V"],
      eqRow("V1 + V2 = V0?", chk),
      eqRow("I1 = I2?", Math.abs(b.I1ma - b.I2ma) < 1e-9),
      ["P", fmt(b.Pw, 3), "W"]
    ];
  }
  function tableBRows(b) {
    var chkV = Math.abs(b.V1 - O.V0) < 1e-9 && Math.abs(b.V2 - O.V0) < 1e-9;
    var sum = b.I1ma + b.I2ma;
    return [
      ["V0", fmt(O.V0, 1), "V"],
      ["I0", fmt(b.I0ma, 1), "mA"],
      ["I0", fmt(b.I0ma / 1000, 3), "A"],
      ["R_measured", fmt(b.Rmeas, 1), "ohm"],
      ["R_nominal (rule)", "66.7", "ohm"],
      ["% error", fmt(O.pctError(b.Rmeas, O.parallelRt(O.R1, O.R2)), 1), "%"],
      ["V1", fmt(b.V1, 2), "V"],
      ["V2", fmt(b.V2, 2), "V"],
      eqRow("V1 = V2 = V0?", chkV),
      ["I1", fmt(b.I1ma, 1), "mA"],
      ["I2", fmt(b.I2ma, 1), "mA"],
      ["I1 + I2", fmt(sum, 1), "mA"],
      eqRow("I1 + I2 = I0?", Math.abs(sum - b.I0ma) < 1e-9),
      ["P", fmt(b.Pw, 3), "W"]
    ];
  }
  function csvRows() {
    var rows = [];
    if (tables.A) tables.A.forEach(function (r) { rows.push(["series"].concat(r)); });
    if (tables.B) tables.B.forEach(function (r) { rows.push(["parallel"].concat(r)); });
    return rows;
  }
  function renderTables() {
    $("tableA").innerHTML = LS.store.tableHTML(["quantity", "value", "unit"], tables.A || []);
    $("tableB").innerHTML = LS.store.tableHTML(["quantity", "value", "unit"], tables.B || []);
    renderWorkBox();
  }
  function renderWorkBox() {
    var lines = ["series: R_total = R1 + R2, V0 = V1 + V2, I is the same everywhere",
      "parallel: 1/R_total = 1/R1 + 1/R2, V is the same, I0 = I1 + I2",
      "R_measured = V0 / I0;  P = V0 * I0;  1 W = 1 V*A;  1 A = 1000 mA"];
    if (tables.A) {
      lines.push("Table A: R_measured = " + fmt(benchSeriesRecomputed().Rmeas, 1) +
        " ohm against nominal 300 ohm, % error " + fmt(O.pctError(benchSeriesRecomputed().Rmeas, 300), 1) +
        " %; drops " + tables.A[6][1] + " V + " + tables.A[7][1] + " V = " + tables.A[8][1] + " V");
    }
    if (tables.B) {
      lines.push("Table B: R_measured = " + tables.B[3][1] +
        " ohm against nominal 66.7 ohm, % error " + tables.B[5][1] +
        " %; branches " + tables.B[9][1] + " mA + " + tables.B[10][1] + " mA = " + tables.B[11][1] + " mA");
    }
    if (mode === "fun") {
      lines.push("Fun Mode: chips drawn from the +-5 % band - 100 ohm at " +
        fmt(chipR("100"), 1) + " ohm, 200 ohm at " + fmt(chipR("200"), 1) +
        " ohm; a near-zero % error is suspicious with real tolerance");
    }
    lines.push("parallel I0 = 90 mA sits close to the 100 mA stop; a third parallel branch pegs it (meter range, named by the bench)");
    $("workBox").textContent = lines.join("\n");
  }
  function benchSeriesRecomputed() {
    var k1 = pos["100"] === "S1" ? "100" : "200", k2 = k1 === "100" ? "200" : "100";
    var Rtot = chipR(k1) + chipR(k2), I0 = O.currentA(Rtot, O.V0);
    return { Rmeas: O.rFromVI(O.V0, I0) };
  }
  function refreshAll() {
    var b = bench();
    refreshReadouts();
    renderTables();
    drawBench(b);
  }

  // ---------- drawing ----------
  function drawMeterFace(x, y, r, frac, label, scaleMax, unit, peg, small) {
    cx.fillStyle = "#101a2e";
    cx.beginPath(); cx.arc(x, y, r, 0, 6.29); cx.fill();
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(x, y, r, 0, 6.29); cx.stroke();
    var a0 = -Math.PI * 2 / 3, a1 = Math.PI * 2 / 3;
    cx.strokeStyle = "#4a5f8a"; cx.lineWidth = 1;
    cx.beginPath(); cx.arc(x, y, r - 7, a0, a1); cx.stroke();
    for (var t = 0; t <= 10; t++) {
      var a = a0 + (a1 - a0) * t / 10;
      var long = t % 5 === 0;
      cx.strokeStyle = long ? "#9fb4d8" : "#4a5f8a";
      cx.beginPath();
      cx.moveTo(x + (r - 7) * Math.cos(a), y + (r - 7) * Math.sin(a));
      cx.lineTo(x + (r - (long ? 14 : 10)) * Math.cos(a), y + (r - (long ? 14 : 10)) * Math.sin(a));
      cx.stroke();
    }
    var f = Math.max(0, Math.min(1, frac));
    var na = a0 + (a1 - a0) * (peg ? 1 : f);
    cx.strokeStyle = peg ? "#ff6b6b" : "#ffd166"; cx.lineWidth = 2.5;
    cx.beginPath(); cx.moveTo(x, y);
    cx.lineTo(x + (r - 14) * Math.cos(na), y + (r - 14) * Math.sin(na));
    cx.stroke();
    cx.fillStyle = peg ? "#ff6b6b" : "#8fd3ff";
    cx.font = (small ? 8 : 10) + "px ui-monospace, monospace";
    cx.textAlign = "center"; cx.textBaseline = "top";
    cx.fillText(label, x, y + r + 3);
    cx.fillStyle = "#9fb4d8"; cx.font = "8px system-ui, sans-serif";
    cx.fillText("(0-" + scaleMax + " " + unit + ")", x, y + r + (small ? 12 : 15));
    if (peg) {
      cx.fillStyle = "#ff6b6b"; cx.font = "8px system-ui, sans-serif";
      cx.fillText("PAST THE STOP", x, y - r - 10);
    }
  }
  function drawChip(key, x, y, horizontal) {
    var nom = key === "3rd" ? "100* ohm" : key + " ohm";
    cx.fillStyle = CHIP_COLOR[key === "3rd" ? "3rd" : key];
    cx.fillRect(x - 35, y - 16, 70, 32);
    cx.strokeStyle = "#dce6f5"; cx.lineWidth = 1;
    cx.strokeRect(x - 35, y - 16, 70, 32);
    cx.strokeStyle = "#ffd166"; cx.lineWidth = 1.5;
    cx.beginPath();
    if (horizontal) {
      var zx = x - 26; cx.moveTo(zx, y);
      for (var i = 0; i < 5; i++) { zx += 8; cx.lineTo(zx, i % 2 ? y - 7 : y + 7); }
      cx.lineTo(x + 28, y);
    } else {
      var zy = y - 26; cx.moveTo(x, zy);
      for (var j = 0; j < 5; j++) { zy += 8; cx.lineTo(j % 2 ? x - 7 : x + 7, zy); }
      cx.lineTo(x, y + 28);
    }
    cx.stroke();
    cx.fillStyle = "#1c2434"; cx.font = "10px ui-monospace, monospace";
    cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillText(nom, x, y);
  }
  function drawSlot(s, label, ghost) {
    var g = s === "P3" ? GEO.parallel.slots.P3 :
      (s === "S1" || s === "S2") ? GEO.series.slots[s] : GEO.parallel.slots[s];
    var vertical = s[0] === "P";
    cx.setLineDash([4, 4]);
    cx.strokeStyle = ghost ? "#3a4a6a" : "#6d84ad"; cx.lineWidth = 1;
    cx.strokeRect(g.x - 40, g.y - 20, 80, 40);
    cx.setLineDash([]);
    cx.fillStyle = ghost ? "#3a4a6a" : "#9fb4d8";
    cx.font = "9px system-ui, sans-serif"; cx.textAlign = "center"; cx.textBaseline = "bottom";
    cx.fillText(s + (label ? " " + label : ""), g.x, g.y - (vertical ? 24 : 24));
  }
  function nodeDot(n, letter, V, active) {
    cx.fillStyle = "#0d1526";
    cx.beginPath(); cx.arc(n.x, n.y, 7, 0, 6.29); cx.fill();
    cx.strokeStyle = active ? "#ffd166" : "#8fd3ff"; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(n.x, n.y, 7, 0, 6.29); cx.stroke();
    cx.fillStyle = active ? "#ffd166" : "#9fb4d8";
    cx.font = "11px ui-monospace, monospace"; cx.textAlign = "center"; cx.textBaseline = "bottom";
    cx.fillText(letter, n.x + (n.x > 600 ? -12 : 12), n.y - 10);
    if (V !== null && V !== undefined) {
      cx.fillStyle = "#6d84ad"; cx.font = "8px ui-monospace, monospace";
      cx.fillText(fmt(V, 1) + " V", n.x + (n.x > 600 ? -14 : 14), n.y + 18);
    }
  }
  function drawBench(b) {
    var w = cv.width / dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, w, CH);
    cx.fillStyle = "#0d1526"; cx.fillRect(0, 0, w, CH);
    var L = b.layout;
    var geo = L === "parallel" ? GEO.parallel : GEO.series;
    var wireCol = b.live ? "#8affc1" : "#4a6a9a";
    function wire(pts) {
      cx.strokeStyle = wireCol; cx.lineWidth = 2.5;
      cx.beginPath(); cx.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) cx.lineTo(pts[i][0], pts[i][1]);
      cx.stroke();
    }
    // supply
    cx.fillStyle = "#23324e";
    cx.fillRect(SUP.x, SUP.y, SUP.w, SUP.h);
    cx.strokeStyle = power ? "#8affc1" : "#6d84ad"; cx.lineWidth = 1.5;
    cx.strokeRect(SUP.x, SUP.y, SUP.w, SUP.h);
    cx.fillStyle = "#9fb4d8"; cx.font = "11px system-ui, sans-serif";
    cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillText("DC supply", 105, 80);
    cx.fillStyle = "#ffd166"; cx.font = "14px ui-monospace, monospace";
    cx.fillText("6.0 V fixed", 105, 102);
    cx.fillStyle = power ? "#8affc1" : "#6d84ad"; cx.font = "9px system-ui, sans-serif";
    cx.fillText(power ? "enable: ON" : "enable: off", 105, 125);
    [SUP.tp, SUP.tm].forEach(function (t, i) {
      cx.fillStyle = "#0d1526"; cx.beginPath(); cx.arc(t.x, t.y, 5, 0, 6.29); cx.fill();
      cx.strokeStyle = "#9fb4d8"; cx.lineWidth = 1.5;
      cx.beginPath(); cx.arc(t.x, t.y, 5, 0, 6.29); cx.stroke();
      cx.fillStyle = "#9fb4d8"; cx.font = "9px ui-monospace, monospace";
      cx.textAlign = "left"; cx.fillText(i === 0 ? "+" : "-", t.x + 8, t.y + 3);
    });
    // main wire + ammeter (main branch)
    wire([[SUP.tp.x, SUP.tp.y], [MAIN_METER.x - MAIN_METER.r, MAIN_METER.y]]);
    wire([[MAIN_METER.x + MAIN_METER.r, MAIN_METER.y],
      [geo.nodes.A.x, MAIN_METER.y], [geo.nodes.A.x, geo.nodes.A.y]]);
    var am = ammeterReading(b);
    var mainPeg = b.live && ammPos === "main" && am > O.AMMETER_MA;
    drawMeterFace(MAIN_METER.x, MAIN_METER.y, MAIN_METER.r, am / O.AMMETER_MA,
      "AMMETER" + (ammPos === "main" ? "" : " (in " + (ammPos === "b1" ? "branch 1" : "branch 2") + ")"),
      100, "mA", mainPeg || (b.live && am > O.AMMETER_MA), false);
    if (ammPos !== "main" && b.layout === "parallel") {
      // the meter moved: a schematic A on the live branch, dashed trail home
      var bx = ammPos === "b1" ? GEO.parallel.nodes.A.x : GEO.parallel.nodes.C.x;
      cx.setLineDash([4, 4]);
      cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1;
      cx.beginPath(); cx.moveTo(MAIN_METER.x, MAIN_METER.y); cx.lineTo(bx, 182); cx.stroke();
      cx.setLineDash([]);
      cx.fillStyle = "#101a2e";
      cx.beginPath(); cx.arc(bx, 182, 16, 0, 6.29); cx.fill();
      cx.strokeStyle = "#ffd166"; cx.lineWidth = 1.5;
      cx.beginPath(); cx.arc(bx, 182, 16, 0, 6.29); cx.stroke();
      cx.fillStyle = "#ffd166"; cx.font = "11px ui-monospace, monospace";
      cx.textAlign = "center"; cx.textBaseline = "middle";
      cx.fillText("A", bx, 182.5);
    }
    // tap key on the return
    var keyFill = keyClosed ? "#2e4a3c" : "#23324e";
    cx.fillStyle = keyFill;
    cx.fillRect(KEYBOX.x, KEYBOX.y, KEYBOX.w, KEYBOX.h);
    cx.strokeStyle = keyClosed ? "#8affc1" : "#6d84ad"; cx.lineWidth = 1.5;
    cx.strokeRect(KEYBOX.x, KEYBOX.y, KEYBOX.w, KEYBOX.h);
    cx.fillStyle = keyClosed ? "#8affc1" : "#9fb4d8"; cx.font = "9px system-ui, sans-serif";
    cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillText("tap key", KEYBOX.x + KEYBOX.w / 2, KEYBOX.y + 9);
    cx.fillText(keyClosed ? "closed" : "open", KEYBOX.x + KEYBOX.w / 2, KEYBOX.y + 21);
    if (L === "series") {
      var n = GEO.series.nodes;
      wire([[n.C.x, n.C.y], [n.C.x, KEYBOX.y + KEYBOX.h / 2], [KEYBOX.x + KEYBOX.w, KEYBOX.y + KEYBOX.h / 2]]);
      wire([[KEYBOX.x, KEYBOX.y + KEYBOX.h / 2], [178, KEYBOX.y + KEYBOX.h / 2], [178, SUP.tm.y], [SUP.tm.x, SUP.tm.y]]);
      // slots + chips in-line
      drawSlot("S1", "R1"); drawSlot("S2", "R2");
      ["100", "200"].forEach(function (k) {
        if (pos[k] === "S1" || pos[k] === "S2") drawChip(k, GEO.series.slots[pos[k]].x, GEO.series.slots[pos[k]].y, true);
      });
      var V = potentials(b);
      ["A", "B", "C"].forEach(function (lt) {
        nodeDot(n[lt], lt, V ? V[lt] : null, probes.red === lt || probes.black === lt);
      });
    } else if (L === "parallel") {
      var p = GEO.parallel.nodes;
      wire([[p.A.x, p.A.y], [p.C.x, p.C.y]]);            // top rail
      wire([[p.B.x, p.B.y], [p.D.x, p.D.y]]);            // bottom rail
      wire([[p.A.x, p.A.y], [p.B.x, p.B.y]]);            // branch 1
      wire([[p.C.x, p.C.y], [p.D.x, p.D.y]]);            // branch 2
      if (borrowed) wire([[GEO.parallel.slots.P3.x, p.A.y], [GEO.parallel.slots.P3.x, p.B.y]]);
      else {
        cx.setLineDash([3, 5]);
        wire([[GEO.parallel.slots.P3.x, p.A.y], [GEO.parallel.slots.P3.x, p.B.y]]);
        cx.setLineDash([]);
      }
      wire([[p.B.x, p.B.y], [KEYBOX.x + KEYBOX.w / 2, p.B.y], [KEYBOX.x + KEYBOX.w / 2, KEYBOX.y]]);
      wire([[KEYBOX.x + KEYBOX.w / 2, KEYBOX.y + KEYBOX.h], [178, KEYBOX.y + KEYBOX.h], [178, SUP.tm.y], [SUP.tm.x, SUP.tm.y]]);
      drawSlot("P1"); drawSlot("P2"); drawSlot("P3", "ghost", !borrowed);
      ["100", "200"].forEach(function (k) {
        if (pos[k] === "P1" || pos[k] === "P2") drawChip(k, GEO.parallel.slots[pos[k]].x, GEO.parallel.slots[pos[k]].y, false);
      });
      if (borrowed) drawChip("3rd", GEO.parallel.slots.P3.x, GEO.parallel.slots.P3.y, false);
      var Vp = potentials(b);
      ["A", "C", "B", "D"].forEach(function (lt) {
        nodeDot(p[lt], lt, Vp ? Vp[lt] : null, probes.red === lt || probes.black === lt);
      });
    } else {
      // no layout: draw empty slot hints on both rails
      drawSlot("S1", "R1", true); drawSlot("S2", "R2", true);
      drawSlot("P1"); drawSlot("P2");
      var n0 = GEO.series.nodes, p0 = GEO.parallel.nodes;
      ["A", "B", "C"].forEach(function (lt) { nodeDot(n0[lt], lt, null, false); });
      ["A", "C", "B", "D"].forEach(function (lt) {
        if (lt !== "A") nodeDot(p0[lt], lt, null, false);
      });
      cx.fillStyle = "#6d84ad"; cx.font = "10px system-ui, sans-serif"; cx.textAlign = "center";
      cx.fillText("drag both chips to one layout, then press Instructor check", 540, 120);
    }
    // voltmeter face
    var pr = probeReading(b);
    drawMeterFace(VFACE.x, VFACE.y, VFACE.r, (pr || 0) / O.VOLTMETER_V, "VOLTMETER", 15, "V", false, true);
    // chip tray
    cx.fillStyle = "#1b2740";
    cx.fillRect(CHIP_TRAY.x, CHIP_TRAY.y, CHIP_TRAY.w, CHIP_TRAY.h);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1;
    cx.strokeRect(CHIP_TRAY.x, CHIP_TRAY.y, CHIP_TRAY.w, CHIP_TRAY.h);
    cx.fillStyle = "#9fb4d8"; cx.font = "10px system-ui, sans-serif";
    cx.textAlign = "center"; cx.textBaseline = "top";
    cx.fillText("resistor chips (drag to a slot)", CHIP_TRAY.x + CHIP_TRAY.w / 2, CHIP_TRAY.y + 6);
    ["100", "200"].forEach(function (k) {
      if (!pos[k]) drawChip(k, CHIP_POS[k].x, CHIP_POS[k].y, true);
    });
    // probe tray
    cx.fillStyle = "#1b2740";
    cx.fillRect(PROBE_TRAY.x, PROBE_TRAY.y, PROBE_TRAY.w, PROBE_TRAY.h);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1;
    cx.strokeRect(PROBE_TRAY.x, PROBE_TRAY.y, PROBE_TRAY.w, PROBE_TRAY.h);
    cx.fillStyle = "#9fb4d8"; cx.font = "10px system-ui, sans-serif";
    cx.textAlign = "center"; cx.textBaseline = "top";
    cx.fillText("voltmeter probes (drag to nodes)", PROBE_TRAY.x + PROBE_TRAY.w / 2, PROBE_TRAY.y + 6);
    Object.keys(PROBE_HOME).forEach(function (col) {
      var h = PROBE_HOME[col];
      var onTray = !probes[col];
      if (onTray) {
        cx.fillStyle = col === "red" ? "#e05555" : "#4a6a9a";
        cx.beginPath(); cx.arc(h.x, h.y, 9, 0, 6.29); cx.fill();
        cx.fillStyle = "#0d1526"; cx.font = "10px ui-monospace, monospace";
        cx.textAlign = "center"; cx.textBaseline = "middle";
        cx.fillText(col === "red" ? "+" : "-", h.x, h.y + 0.5);
      }
    });
    // probes on nodes
    Object.keys(probes).forEach(function (col) {
      var ln = probes[col];
      if (!ln) return;
      var nn = nodeLookup(ln);
      if (!nn) return;
      cx.fillStyle = col === "red" ? "#e05555" : "#4a6a9a";
      cx.beginPath(); cx.arc(nn.x, nn.y, 11, 0, 6.29); cx.fill();
      cx.strokeStyle = "#0d1526"; cx.lineWidth = 1.5;
      cx.beginPath(); cx.arc(nn.x, nn.y, 11, 0, 6.29); cx.stroke();
      cx.fillStyle = "#0d1526"; cx.font = "11px ui-monospace, monospace";
      cx.textAlign = "center"; cx.textBaseline = "middle";
      cx.fillText(col === "red" ? "+" : "-", nn.x, nn.y + 0.5);
    });
    // the dragged object
    if (drag) {
      if (drag.kind === "chip") drawChip(drag.key, drag.x, drag.y, true);
      else {
        cx.fillStyle = drag.col === "red" ? "#e05555" : "#4a6a9a";
        cx.beginPath(); cx.arc(drag.x, drag.y, 10, 0, 6.29); cx.fill();
      }
    }
  }

  // ---------- controls ----------
  $("powerBtn").addEventListener("click", function () {
    var b = bench();
    if (!checkPassed || (b.layout !== "series" && b.layout !== "parallel")) {
      flash = { text: "pass the instructor check on a complete pair first", until: Date.now() + 3000 };
      refreshAll();
      return;
    }
    power = !power;
    if (!power) keyClosed = false;
    flash = { text: power ? "power on - close the tap key" : "power off", until: Date.now() + 2500 };
    refreshAll();
    saveState();
  });
  $("keyBtn").addEventListener("click", function () {
    if (!power) {
      flash = { text: "flip the enable switch first", until: Date.now() + 2500 };
      refreshAll();
      return;
    }
    keyClosed = !keyClosed;
    if (keyClosed && bench().pegged) {
      flash = { text: "the needle pegs past the 100 mA stop - a third parallel branch draws 150 mA at the nominal. That is the meter range, named by the bench.",
        until: Date.now() + 5500 };
    }
    refreshAll();
    saveState();
  });
  function setAmm(p) { ammPos = p; refreshAll(); saveState(); }
  $("ammMain").addEventListener("click", function () { setAmm("main"); });
  $("ammB1").addEventListener("click", function () { setAmm("b1"); });
  $("ammB2").addEventListener("click", function () { setAmm("b2"); });
  $("borrowBtn").addEventListener("click", function () {
    if (layoutNow() !== "parallel") {
      flash = { text: "the borrowed resistor only joins a parallel pair", until: Date.now() + 2500 };
      refreshAll();
      return;
    }
    borrowed = !borrowed;
    flash = {
      text: borrowed
        ? "a third 100 ohm on the middle branch - bank total resistance is now 40 ohm, 150 mA at the nominal, past the stop"
        : "the borrowed resistor is back out of the bench",
      until: Date.now() + 4500
    };
    if (borrowed) rewire();
    refreshAll();
    saveState();
  });
  $("checkBtn").addEventListener("click", function () {
    var b = bench();
    if (b.layout === "tray") {
      flash = { text: "both chips are still in the tray - drag them onto the bench", until: Date.now() + 3000 };
    } else if (b.layout === "mixed") {
      flash = { text: "the chips are mixed between the two layouts - finish one pair before the check", until: Date.now() + 3500 };
    } else {
      checkPassed = true;
      flash = {
        text: b.layout === "series"
          ? "series pair: one current path from A to C, drops must add to V0. Ready for power."
          : "parallel pair: two branches between the same rails, currents must add to I0. Ready for power.",
        until: Date.now() + 4500
      };
    }
    refreshAll();
    saveState();
  });
  function logTable(which) {
    var b = bench();
    if ((which === "A" && b.layout !== "series") || (which === "B" && b.layout !== "parallel")) {
      flash = { text: "Table " + which + " wants the " + (which === "A" ? "series" : "parallel") + " pair on the bench", until: Date.now() + 3000 };
      refreshAll();
      return;
    }
    if (!power || !keyClosed) {
      flash = { text: "power on and tap key closed before a one-shot log", until: Date.now() + 3000 };
      refreshAll();
      return;
    }
    if (b.pegged) {
      flash = { text: "the ammeter cannot read past its 100 mA stop - bring the bench back inside the range", until: Date.now() + 3500 };
      refreshAll();
      return;
    }
    if (ammPos !== "main") {
      flash = { text: "the ammeter sits in " + (ammPos === "b1" ? "branch 1" : "branch 2") + " - that reading is " + (ammPos === "b1" ? "I1" : "I2") + ", not I0. Move it to the main branch for the I0 row.",
        until: Date.now() + 5000 };
      refreshAll();
      return;
    }
    tables[which] = which === "A" ? tableARows(b) : tableBRows(b);
    flash = { text: "Table " + which + " logged from the meter values", until: Date.now() + 2500 };
    refreshAll();
    saveState();
  }
  $("logA").addEventListener("click", function () { logTable("A"); });
  $("logB").addEventListener("click", function () { logTable("B"); });
  $("clearAllBtn").addEventListener("click", function () {
    pos = { "100": null, "200": null };
    borrowed = false; ammPos = "main";
    probes = { red: null, black: null };
    checkPassed = false; power = false; keyClosed = false;
    tables = { A: null, B: null };
    LS.store.clear(LAB, "log");
    $("csvCopy").style.display = "none";
    flash = { text: "cleared - chips and probes are back in the trays", until: Date.now() + 2500 };
    refreshAll();
    saveState();
  });
  $("exportLog").addEventListener("click", function () {
    LS.store.exportCSV("phy110-lab10-series-parallel.csv", CSV_HEADER, csvRows(), $("csvCopy"));
  });

  // ---------- dragging ----------
  function evPos(ev) {
    var r = cv.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }
  function inRect(p, rc, pad) {
    pad = pad || 0;
    return p.x >= rc.x - pad && p.x <= rc.x + rc.w + pad && p.y >= rc.y - pad && p.y <= rc.y + rc.h + pad;
  }
  function chipCenter(key) {
    var s = pos[key];
    if (!s) return CHIP_POS[key];
    if (s === "S1" || s === "S2") return GEO.series.slots[s];
    return GEO.parallel.slots[s];
  }
  function hitChip(p) {
    var best = null, bd = 34;
    ["100", "200"].forEach(function (k) {
      var c = chipCenter(k);
      var d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d < bd) { bd = d; best = k; }
    });
    return best;
  }
  function hitProbe(p) {
    var best = null, bd = 14;
    Object.keys(probes).forEach(function (col) {
      var ln = probes[col];
      var c = ln ? nodeLookup(ln) : PROBE_HOME[col];
      if (!c) return;
      var d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d < bd) { bd = d; best = col; }
    });
    return best;
  }
  function hitSlot(p) {
    var best = null, bd = 34;
    [["S1", GEO.series.slots.S1], ["S2", GEO.series.slots.S2],
      ["P1", GEO.parallel.slots.P1], ["P2", GEO.parallel.slots.P2]].forEach(function (e) {
      var d = Math.hypot(p.x - e[1].x, p.y - e[1].y);
      if (d < bd) { bd = d; best = e[0]; }
    });
    return best;
  }
  function hitNode(p) {
    var best = null, bd = 16;
    ["A", "B", "C", "D"].forEach(function (lt) {
      var n = nodeLookup(lt);
      if (!n) return;
      var d = Math.hypot(p.x - n.x, p.y - n.y);
      if (d < bd) { bd = d; best = lt; }
    });
    return best;
  }
  cv.addEventListener("pointerdown", function (ev) {
    var p = evPos(ev);
    var c = hitChip(p);
    if (c) {
      drag = { kind: "chip", key: c, x: p.x, y: p.y, from: pos[c] };
      cv.setPointerCapture(ev.pointerId);
      return;
    }
    var pr = hitProbe(p);
    if (pr) {
      drag = { kind: "probe", col: pr, x: p.x, y: p.y, from: probes[pr] };
      cv.setPointerCapture(ev.pointerId);
    }
  });
  cv.addEventListener("pointermove", function (ev) {
    if (!drag) return;
    var p = evPos(ev);
    drag.x = p.x; drag.y = p.y;
    drawBench(bench());
  });
  cv.addEventListener("pointerup", function (ev) {
    if (!drag) return;
    var p = evPos(ev);
    if (drag.kind === "chip") {
      var slot = hitSlot(p);
      var toTray = inRect(p, CHIP_TRAY, 10);
      if (slot) {
        var occupant = slotOccupant(slot);
        pos[drag.key] = slot;
        if (occupant) pos[occupant] = drag.from;   // swap back to origin
        rewire();
        if (mode === "fun") draws[drag.key] = Math.random() * 2 - 1;
        flash = { text: "chip on " + slot + " - the layout re-checks on demand", until: Date.now() + 2500 };
      } else if (toTray) {
        pos[drag.key] = null;
        rewire();
      }
      // dropped on nothing: it stays where it was (drag.from untouched)
    } else {
      var node = hitNode(p);
      var toTrayP = inRect(p, PROBE_TRAY, 10);
      if (node) {
        var other = drag.col === "red" ? "black" : "red";
        if (probes[other] === node) { probes[other] = null; }
        probes[drag.col] = node;
      } else if (toTrayP) {
        probes[drag.col] = null;
      }
    }
    drag = null;
    refreshAll();
    saveState();
  });
  cv.addEventListener("pointercancel", function () {
    if (drag) { drag = null; drawBench(bench()); }
  });
  function slotOccupant(slot) {
    if (slot === "P3") return borrowed ? "3rd" : null;
    for (var k in pos) if (pos[k] === slot) return k;
    return null;
  }

  // ---------- boot ----------
  function resizeStages() {
    var w1 = Math.round(Math.max(700, (cv.clientWidth || 760)) * dpr);
    cv.width = w1;
    cv.height = Math.round(CH * dpr);
    drawBench(bench());
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
    if (mode === "fun") {
      ["100", "200"].forEach(function (k) { draws[k] = Math.random() * 2 - 1; });
    } else {
      draws = { "100": 0, "200": 0 };
    }
    refreshAll();
    saveState();
  });
  LS.check.init(LAB);
  refreshAll();
  resizeStages();
})();
