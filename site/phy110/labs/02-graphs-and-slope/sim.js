// PHY110 Lab 2 sim: three benches on one sheet of graph paper.
// Bench A reads values off a plotted graph with a crosshair and a zoomed axis
// strip. Bench B designs the axis scale (the 1-2-5 choice, the start value, the
// 40% coverage rule). Bench C plots five dots, balances a trendline, and takes the
// slope with two probes that can only ride on the line.
//
// Ideal Mode reports your dot positions exactly. Fun Mode adds about a tenth of a
// division of reading wobble and hides the true values, which is what a printed
// sheet does to you. Neither mode touches the reference line or an accepted value.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units, G = LS.graphlab;
  var LAB = "02-graphs-and-slope";
  var $ = function (id) { return document.getElementById(id); };
  var mode = LS.ui.getMode(LAB);
  var PAD = { l: 58, r: 18, t: 16, b: 48 };
  var TRAY_H = 42;

  var setKey = "earth";
  var divisions = G.N_PIN;
  function set() { return G.SETS[setKey]; }
  function fmt(x, d) {
    if (!isFinite(x)) return "-";
    var p = Math.pow(10, d);
    return (Math.round(x * p) / p).toFixed(d);
  }
  function unitOf(label) {
    var m = /\(([^)]+)\)/.exec(label);
    return m ? m[1] : "";
  }
  function decFor(step) {
    return step >= 5 ? 0 : step >= 1 ? 1 : step >= 0.2 ? 1 : 2;
  }
  function jitterDiv() {
    return mode === "fun" ? (Math.random() - 0.5) * 0.1 : 0;
  }

  // ---------- the student's own log ----------
  var HEADER = ["quantity", "reading", "unit", "notes", "accepted", "percent error"];
  var rows = [];
  try {
    var saved = LS.store.load(LAB, "log");
    if (saved && saved.rows) rows = saved.rows;
  } catch (e) {}
  function logRow(q, reading, unit, notes, accepted, errPct) {
    rows.push([q, reading, unit, notes || "", accepted === undefined ? "" : accepted,
      errPct === undefined || errPct === null ? "" : errPct + "%"]);
    LS.store.save(LAB, "log", HEADER, rows);
    renderTable();
  }
  function renderTable() {
    $("dataTable").innerHTML = rows.length
      ? LS.store.tableHTML(["quantity", "reading", "unit", "notes", "accepted",
        "% error"], rows)
      : "<p class='muted'>Nothing logged yet. Log an axis plan, a reading, and a slope - " +
        "that is the evidence your write-up needs.</p>";
  }

  // ---------- axis plan for the selected set ----------
  function plan() {
    var s = set();
    var xLo = Math.min.apply(null, s.xs), xHi = Math.max.apply(null, s.xs);
    var yLo = Math.min.apply(null, s.ys), yHi = Math.max.apply(null, s.ys);
    var x = G.designScale(xLo, xHi, divisions);
    var y = G.designScale(yLo, yHi, divisions);
    x.origin = G.simpleOrigin(xLo, xHi, divisions, x.scale);
    y.origin = G.simpleOrigin(yLo, yHi, divisions, y.scale);
    x.lo = xLo; x.hi = xHi; y.lo = yLo; y.hi = yHi;
    x.xLabel = s.xLabel; y.yLabel = s.yLabel;
    x.unit = unitOf(s.xLabel); y.unit = unitOf(s.yLabel);
    return { x: x, y: y };
  }

  // ---------- Bench A: read mode ----------
  var cross = null;         // {x, y} in data units, from the pointer
  var cvA = $("readCanvas"), cxA = cvA.getContext("2d");

  function geomA() {
    var w = cvA.width / dpr, h = cvA.height / dpr;
    var p = plan();
    return {
      w: w, h: h, p: p,
      x0: PAD.l, x1: w - PAD.r, y0: PAD.t, y1: h - PAD.b
    };
  }
  function pxOf(g, x) {
    var p = g.p.x, span = p.divisions * p.scale;
    return g.x0 + (x - p.origin) / span * (g.x1 - g.x0);
  }
  function pyOf(g, y) {
    var p = g.p.y, span = p.divisions * p.scale;
    return g.y1 - (y - p.origin) / span * (g.y1 - g.y0);
  }
  function dataOf(g, pxv, pyv) {
    var p = g.p.x, q = g.p.y;
    return {
      x: p.origin + (pxv - g.x0) / (g.x1 - g.x0) * p.divisions * p.scale,
      y: q.origin + (g.y1 - pyv) / (g.y1 - g.y0) * q.divisions * q.scale
    };
  }
  function drawPaper(c, g, title) {
    var p = g.p;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, g.w, g.h);
    c.fillStyle = "#fbfcff"; c.fillRect(0, 0, g.w, g.h);
    // grid at every division, heavier every fifth
    var i, X, Y;
    for (i = 0; i <= p.x.divisions; i++) {
      X = pxOf(g, p.x.origin + i * p.x.scale);
      c.strokeStyle = i % 5 === 0 ? "#c3cfe4" : "#e4eaf5"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(X, g.y0); c.lineTo(X, g.y1); c.stroke();
    }
    for (i = 0; i <= p.y.divisions; i++) {
      Y = pyOf(g, p.y.origin + i * p.y.scale);
      c.strokeStyle = i % 5 === 0 ? "#c3cfe4" : "#e4eaf5";
      c.beginPath(); c.moveTo(g.x0, Y); c.lineTo(g.x1, Y); c.stroke();
    }
    c.strokeStyle = "#33435e"; c.lineWidth = 1.6;
    c.strokeRect(g.x0, g.y0, g.x1 - g.x0, g.y1 - g.y0);
    // axis values
    c.fillStyle = "#33435e"; c.font = "10.5px ui-monospace, monospace";
    c.textAlign = "center"; c.textBaseline = "top";
    for (i = 0; i <= p.x.divisions; i += 5) {
      X = pxOf(g, p.x.origin + i * p.x.scale);
      c.fillText(fmt(p.x.origin + i * p.x.scale, decFor(p.x.scale)), X, g.y1 + 6);
    }
    c.textAlign = "right"; c.textBaseline = "middle";
    for (i = 0; i <= p.y.divisions; i += 5) {
      Y = pyOf(g, p.y.origin + i * p.y.scale);
      c.fillText(fmt(p.y.origin + i * p.y.scale, decFor(p.y.scale)), g.x0 - 6, Y);
    }
    c.fillStyle = "#1d2733"; c.font = "12px system-ui, sans-serif";
    c.textAlign = "center"; c.textBaseline = "bottom";
    c.fillText(title, (g.x0 + g.x1) / 2, g.y0 - 2);
    c.textBaseline = "bottom"; c.textAlign = "center";
    c.fillText(p.x.xLabel || "", (g.x0 + g.x1) / 2, g.y1 + 34);
    c.save();
    c.translate(12, (g.y0 + g.y1) / 2); c.rotate(-Math.PI / 2);
    c.fillText(p.y.yLabel || "", 0, 0);
    c.restore();
  }
  function drawBenchA() {
    var g = geomA();
    var s = set();
    drawPaper(cxA, g, s.label + "   (N = " + divisions + " divisions each way)");
    var line = G.setLine(setKey);
    if (line) {
      cxA.strokeStyle = "#8aa0c6"; cxA.lineWidth = 1.6; cxA.setLineDash([6, 4]);
      cxA.beginPath();
      cxA.moveTo(pxOf(g, line.from), pyOf(g, G.lineAt(line.slope, line.intercept, line.from)));
      cxA.lineTo(pxOf(g, line.to), pyOf(g, G.lineAt(line.slope, line.intercept, line.to)));
      cxA.stroke(); cxA.setLineDash([]);
    }
    s.xs.forEach(function (x, i) {
      cxA.fillStyle = "#2b5bd7";
      cxA.beginPath(); cxA.arc(pxOf(g, x), pyOf(g, s.ys[i]), 4.5, 0, 6.29); cxA.fill();
    });
    if (cross) {
      var pxv = U.clamp(pxOf(g, cross.x), g.x0, g.x1);
      var pyv = U.clamp(pyOf(g, cross.y), g.y0, g.y1);
      cxA.strokeStyle = "#b3261e"; cxA.lineWidth = 1.2; cxA.setLineDash([4, 3]);
      cxA.beginPath(); cxA.moveTo(pxv, g.y1); cxA.lineTo(pxv, pyv); cxA.lineTo(g.x0, pyv);
      cxA.stroke(); cxA.setLineDash([]);
      cxA.fillStyle = "#b3261e";
      cxA.fillRect(pxv - 2, g.y1 - 1, 4, 6);
      cxA.fillRect(g.x0 - 5, pyv - 2, 6, 4);
    }
  }
  function refreshBenchA() {
    var s = set();
    if (!cross) {
      $("crossRead").textContent = "move the pointer over the graph";
    } else {
      var j = jitterDiv(), pl = plan();
      $("crossRead").textContent = s.xLabel.split(" (")[0] + " = " +
        fmt(cross.x + j * pl.x.scale, decFor(pl.x.scale) + 1) + ",  " +
        s.yLabel.split(" (")[0] + " = " +
        fmt(cross.y + j * pl.y.scale, decFor(pl.y.scale) + 1) +
        (mode === "fun" ? "  (your own reading)" : "");
    }
    var pl2 = plan();
    $("zoomRead").textContent = "each division prints " +
      fmt(pl2.x.scale, decFor(pl2.x.scale)) + " " + unitOf(set().xLabel) +
      "; " + divisions + " divisions span " +
      fmt(pl2.x.divisions * pl2.x.scale, decFor(pl2.x.scale)) + " " + unitOf(set().xLabel);
  }
  function drawZoom() {
    var cv = $("zoomCanvas"), c = cv.getContext("2d");
    var w = cv.width / dpr, h = cv.height / dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    c.fillStyle = "#efe0bb"; c.fillRect(6, 14, w - 12, 44);
    c.strokeStyle = "#b99e6b"; c.strokeRect(6, 14, w - 12, 44);
    var pl = plan(), shown = Math.min(10, divisions);
    var span = shown * pl.x.scale;
    var stepPx = (w - 24) / shown;
    c.textAlign = "center"; c.textBaseline = "top";
    for (var i = 0; i <= shown; i++) {
      var x = 12 + i * stepPx;
      var big = i % 2 === 0;
      c.strokeStyle = "#3a3a3a"; c.lineWidth = big ? 1.2 : 0.7;
      c.beginPath(); c.moveTo(x, 14); c.lineTo(x, 14 + (big ? 16 : 9)); c.stroke();
      if (big) {
        c.fillStyle = "#222"; c.font = "10.5px ui-monospace, monospace";
        c.fillText(fmt(pl.x.origin + i * pl.x.scale, decFor(pl.x.scale)), x, 34);
      }
    }
    c.fillStyle = "#33435e"; c.font = "11px system-ui, sans-serif"; c.textAlign = "left";
    c.fillText("x-axis zoom: " + shown + " divisions cover " +
      fmt(span, decFor(pl.x.scale)) + ", so one division = " +
      fmt(span / shown, decFor(pl.x.scale)), 10, 64);
  }
  cvA.addEventListener("pointermove", function (ev) {
    var r = cvA.getBoundingClientRect();
    var g = geomA();
    var pxv = ev.clientX - r.left, pyv = ev.clientY - r.top;
    if (pxv < g.x0 || pxv > g.x1 || pyv < g.y0 || pyv > g.y1) { cross = null; }
    else cross = dataOf(g, pxv, pyv);
    drawBenchA(); refreshBenchA();
  });
  cvA.addEventListener("pointerleave", function () {
    cross = null; drawBenchA(); refreshBenchA();
  });
  $("logReading").addEventListener("click", function () {
    if (!cross) return;
    var s = set(), pl = plan();
    var j = jitterDiv();
    var xv = cross.x + j * pl.x.scale, yv = cross.y + j * pl.y.scale;
    logRow("crosshair on " + s.label, fmt(yv, decFor(pl.y.scale) + 1),
      unitOf(s.yLabel),
      s.xLabel.split(" (")[0] + " = " + fmt(xv, decFor(pl.x.scale) + 1), "", "");
  });

  // ---------- Bench B: scale designer ----------
  var chosenScale = null;      // student's S; null means "use the course choice"
  function benchBInputs() {
    return {
      xs: parseFloat($("xsIn").value),
      xl: parseFloat($("xlIn").value),
      n: Math.round(parseFloat($("nInB").value))
    };
  }
  function benchBPlan() {
    var v = benchBInputs();
    var ps = G.preScale(v.xs, v.xl, v.n);
    var course = G.chooseScale(ps);
    var scale = chosenScale || course;
    return { v: v, ps: ps, course: course, scale: scale,
      xc: G.startValue(v.xs, v.xl, v.n, scale) };
  }
  function drawSfStrip() {
    var strip = $("sfStrip");
    strip.innerHTML = "";
    var b = benchBPlan();
    if (!isFinite(b.course)) return;
    var power = Math.floor(Math.log(Math.max(b.ps, 1e-9)) / Math.LN10);
    [1, 2, 5, 10].forEach(function (sf) {
      var cand = sf * Math.pow(10, power);
      var ok = cand * b.v.n >= (b.v.xl - b.v.xs) - 1e-9;
      var btn = LS.ui.el("button", {
        type: "button", "class": "factor-chip",
        text: (Math.round(cand * 1e6) / 1e6) + (ok ? "" : " (too small)"),
        title: ok ? "spans the data" : "leaves points off the paper"
      });
      btn.addEventListener("click", function () {
        chosenScale = cand;
        $("xoIn").value = String(G.simpleOrigin(b.v.xs, b.v.xl, b.v.n, cand));
        refreshBenchB();
      });
      strip.appendChild(btn);
    });
    var reset = LS.ui.el("button", {
      type: "button", "class": "factor-chip", text: "Use the course choice"
    });
    reset.addEventListener("click", function () {
      chosenScale = null;
      refreshBenchB();
      var b2 = benchBPlan();
      $("xoIn").value = String(G.simpleOrigin(b2.v.xs, b2.v.xl, b2.v.n, b2.scale));
    });
    strip.appendChild(reset);
  }
  function refreshBenchB() {
    var b = benchBPlan();
    $("psRead").textContent = isFinite(b.ps)
      ? "(" + b.v.xl + " - " + b.v.xs + ") / " + b.v.n + " = " + fmt(b.ps, 3) +
        "  ->  course scale " + fmt(b.course, 3)
      : "type a range and a division count";
    $("sRead").textContent = isFinite(b.scale)
      ? fmt(b.scale, 3) + " per division" +
        (chosenScale ? "  (your pick)" : "  (the 1-2-5 choice)") +
        "  ->  " + b.v.n + " divisions reach " + fmt(b.v.n * b.scale, 3)
      : "-";
    $("xcRead").textContent = isFinite(b.xc) ? fmt(b.xc, 3) : "-";
    var xo = parseFloat($("xoIn").value);
    var fits = G.fitsOnGrid(xo, b.v.n, b.scale, b.v.xs, b.v.xl);
    $("fitRead").textContent = !isFinite(xo) ? "type an origin"
      : fits ? "yes: " + fmt(xo, 3) + " to " +
        fmt(xo + b.v.n * b.scale, 3) + " holds both ends"
      : "point off the grid - move the origin back or take a bigger scale";
    var cov = G.coverage(b.v.xs, b.v.xl, b.v.n, b.scale);
    var pct = isFinite(cov) ? cov * 100 : 0;
    $("coverFill").style.width = Math.min(100, pct) + "%";
    $("coverBar").classList.toggle("low", pct < 40);
    $("coverRead").textContent = isFinite(cov)
      ? fmt(pct, 1) + " % of the axis used" + (pct >= 40 ? " - clears the rule"
        : " - under the 40% rule")
      : "-";
    drawSfStrip();
  }
  $("xsIn").addEventListener("input", refreshBenchB);
  $("xlIn").addEventListener("input", refreshBenchB);
  $("nInB").addEventListener("input", function () {
    var v = Math.round(parseFloat($("nInB").value));
    if (isFinite(v) && v > 0) {
      divisions = U.clamp(v, 5, 60);
      $("nInA").value = String(divisions);
      chosenScale = null;
      refreshBenchB(); drawBenchA(); refreshBenchA(); drawZoom(); drawBenchC();
    }
  });
  $("nInA").addEventListener("input", function () {
    var v = Math.round(parseFloat($("nInA").value));
    if (isFinite(v) && v > 0) {
      divisions = U.clamp(v, 5, 60);
      $("nInB").value = String(divisions);
      chosenScale = null;
      resetLineAndProbes();
      refreshBenchB(); drawBenchA(); refreshBenchA(); drawZoom(); drawBenchC();
    }
  });
  $("xoIn").addEventListener("input", refreshBenchB);
  $("nudgeOrigin").addEventListener("click", function () {
    var b = benchBPlan();
    $("xoIn").value = String(G.simpleOrigin(b.v.xs, b.v.xl, b.v.n, b.scale));
    refreshBenchB();
  });
  $("copySet").addEventListener("click", function () {
    var p = plan();
    $("xsIn").value = String(p.x.lo);
    $("xlIn").value = String(p.x.hi);
    chosenScale = null;
    $("xoIn").value = String(p.x.origin);
    refreshBenchB();
  });
  $("logPlan").addEventListener("click", function () {
    var b = benchBPlan();
    if (!isFinite(b.scale)) return;
    logRow("x-axis scale", fmt(b.scale, 3), "per division",
      "N = " + b.v.n + ", XS = " + b.v.xs + ", XL = " + b.v.xl +
      ", pre-scale " + fmt(b.ps, 3) + ", origin " + $("xoIn").value, "", "");
    logRow("axis coverage", fmt(G.coverage(b.v.xs, b.v.xl, b.v.n, b.scale) * 100, 1),
      "%", "course rule is 40% or more", 40,
      G.coverage(b.v.xs, b.v.xl, b.v.n, b.scale) >= 0.4 ? "" : "short");
  });

  // ---------- Bench C: plot, trendline, slope probes ----------
  var cvC = $("plotCanvas"), cxC = cvC.getContext("2d");
  var dots = [], line = null, probes = null;

  function geomC() {
    var w = cvC.width / dpr, h = cvC.height / dpr;
    return { w: w, h: h - TRAY_H, p: plan(), x0: PAD.l, x1: w - PAD.r,
      y0: PAD.t + 12, y1: h - TRAY_H - PAD.b, tray: h - TRAY_H + 10 };
  }
  function resetDots() {
    dots = set().xs.map(function () { return null; });
  }
  function resetLineAndProbes() {
    var g = geomC(), p = g.p;
    var xA = p.x.origin + 0.15 * p.x.divisions * p.x.scale;
    var xB = p.x.origin + 0.85 * p.x.divisions * p.x.scale;
    var yA = p.y.origin + 0.2 * p.y.divisions * p.y.scale;
    var yB = p.y.origin + 0.6 * p.y.divisions * p.y.scale;
    line = { p1: [xA, yA], p2: [xB, yB] };
    probes = { x1: xA, x2: xB };
    resetDots();
  }
  function lineSlope() {
    return G.slope(line.p1[0], line.p1[1], line.p2[0], line.p2[1]);
  }
  function lineIntercept() {
    return line.p1[1] - lineSlope() * line.p1[0];
  }
  function placedDots() {
    var s = set();
    return dots.map(function (d, i) {
      return d ? [d[0], d[1]] : [s.xs[i], s.ys[i]];
    }).filter(function (p) { return isFinite(p[0]) && isFinite(p[1]); });
  }
  function drawBenchC() {
    var g = geomC(), s = set();
    drawPaper(cxC, g, "Your paper: " + s.label + "   (N = " + divisions + ")");
    cxC.fillStyle = "#e8edf6";
    cxC.fillRect(g.x0, g.tray - 8, g.x1 - g.x0, TRAY_H);
    cxC.fillStyle = "#5a6779"; cxC.font = "11px system-ui, sans-serif";
    cxC.textAlign = "left"; cxC.textBaseline = "top";
    cxC.fillText("dot tray - drag each dot up onto its own pair of values", g.x0 + 4, g.tray + 22);

    // the student's line
    if (line) {
      var m = lineSlope(), b = lineIntercept();
      var xa = g.p.x.origin, xb = g.p.x.origin + g.p.x.divisions * g.p.x.scale;
      cxC.strokeStyle = "#b3261e"; cxC.lineWidth = 2.2;
      cxC.beginPath();
      cxC.moveTo(pxOf(g, xa), pyOf(g, G.lineAt(m, b, xa)));
      cxC.lineTo(pxOf(g, xb), pyOf(g, G.lineAt(m, b, xb)));
      cxC.stroke();
      [line.p1, line.p2].forEach(function (pt) {
        cxC.fillStyle = "#b3261e";
        cxC.fillRect(pxOf(g, pt[0]) - 6, pyOf(g, pt[1]) - 6, 12, 12);
        cxC.strokeStyle = "#fff"; cxC.lineWidth = 1.6;
        cxC.strokeRect(pxOf(g, pt[0]) - 6, pyOf(g, pt[1]) - 6, 12, 12);
      });
      // probes ride on the line
      [probes.x1, probes.x2].forEach(function (xp) {
        cxC.fillStyle = "#1c7d43";
        cxC.beginPath();
        cxC.arc(pxOf(g, xp), pyOf(g, G.lineAt(m, b, xp)), 8, 0, 6.29);
        cxC.fill();
        cxC.strokeStyle = "#fff"; cxC.stroke();
      });
      cxC.strokeStyle = "#1c7d43"; cxC.lineWidth = 1.2; cxC.setLineDash([4, 3]);
      var y1 = G.lineAt(m, b, probes.x1), y2 = G.lineAt(m, b, probes.x2);
      cxC.beginPath();
      cxC.moveTo(pxOf(g, probes.x1), pyOf(g, y1));
      cxC.lineTo(pxOf(g, probes.x2), pyOf(g, y1));
      cxC.lineTo(pxOf(g, probes.x2), pyOf(g, y2));
      cxC.stroke(); cxC.setLineDash([]);
    }
    // dots: placed where the student dropped them, others waiting in the tray
    var placed = 0;
    s.xs.forEach(function (x, i) {
      var pxv, pyv;
      if (dots[i]) { placed++; pxv = pxOf(g, dots[i][0]); pyv = pyOf(g, dots[i][1]); }
      else { pxv = g.x0 + 26 + i * 34; pyv = g.tray + 12; }
      cxC.fillStyle = dots[i] ? "#2b5bd7" : "#9fb4d8";
      cxC.beginPath(); cxC.arc(pxv, pyv, 7, 0, 6.29); cxC.fill();
      cxC.strokeStyle = "#fff"; cxC.lineWidth = 1.4; cxC.stroke();
      if (dots[i] && mode !== "fun") {
        cxC.fillStyle = "#1c7d43"; cxC.beginPath();
        cxC.arc(pxOf(g, x), pyOf(g, s.ys[i]), 3, 0, 6.29); cxC.fill();
      }
    });
    $("dotsRead").textContent = placed + " of 5" +
      (mode === "fun" ? "  (Fun Mode hides the true values)" : "  (small green: the true spot)");
  }
  function refreshBenchC() {
    var s = set();
    if (!line) return;
    var sides = G.pointsPerSide(placedDots(), lineSlope(), lineIntercept());
    $("sideRead").textContent = sides.above + " above, " + sides.below + " below" +
      (sides.on ? ", " + sides.on + " on the line" : "") +
      (sides.balanced ? " - balanced" : " - not balanced yet");
    var m = lineSlope(), b = lineIntercept();
    var y1 = G.lineAt(m, b, probes.x1), y2 = G.lineAt(m, b, probes.x2);
    var rd = Math.max(decFor(plan().x.scale), 1);
    $("slopeRead").textContent = "(" + fmt(y2, rd) + " - " + fmt(y1, rd) + ") / (" +
      fmt(probes.x2, rd) + " - " + fmt(probes.x1, rd) + ") = " + fmt(m, 3) +
      "   <- probes are on the line, not on dots";
    var ref = G.setFit(setKey);
    $("refRead").textContent = ref
      ? fmt(ref.slope, 3) + "  (least squares on this set)"
      : "-";
    $("meanRead").textContent = s.slopeMeaning +
      (s.accepted ? "; accepted " + s.accepted : "");
  }
  function hitC(ev) {
    var g = geomC(), r = cvC.getBoundingClientRect();
    var pxv = ev.clientX - r.left, pyv = ev.clientY - r.top;
    var m = lineSlope(), b = lineIntercept();
    var out = null, best = 15;
    [["p1", probes.x1], ["p2", probes.x2]].forEach(function (pr) {
      var d = Math.hypot(pxOf(g, pr[1]) - pxv, pyOf(g, G.lineAt(m, b, pr[1])) - pyv);
      if (d < best) { best = d; out = { kind: "probe", which: pr[0] }; }
    });
    ["p1", "p2"].forEach(function (which) {
      var pt = line[which];
      var d = Math.hypot(pxOf(g, pt[0]) - pxv, pyOf(g, pt[1]) - pyv);
      if (d < best) { best = d; out = { kind: "handle", which: which }; }
    });
    dots.forEach(function (dot, i) {
      var px2 = dot ? pxOf(g, dot[0]) : g.x0 + 26 + i * 34;
      var py2 = dot ? pyOf(g, dot[1]) : g.tray + 12;
      var d = Math.hypot(px2 - pxv, py2 - pyv);
      if (d < best) { best = d; out = { kind: "dot", which: i }; }
    });
    return { at: { x: pxv, y: pyv }, target: out, g: g };
  }
  var dragC = null;
  cvC.addEventListener("pointerdown", function (ev) {
    var h = hitC(ev);
    if (!h.target) return;
    dragC = h.target;
    cvC.setPointerCapture(ev.pointerId);
  });
  cvC.addEventListener("pointermove", function (ev) {
    if (!dragC) return;
    var h = hitC(ev), g = h.g;
    var d = dataOf(g, h.at.x, h.at.y);
    var pl = g.p;
    if (dragC.kind === "dot") {
      if (h.at.y > g.tray - 8) dots[dragC.which] = null;
      else {
        dots[dragC.which] = [
          U.clamp(d.x, pl.x.origin, pl.x.origin + pl.x.divisions * pl.x.scale),
          U.clamp(d.y, pl.y.origin, pl.y.origin + pl.y.divisions * pl.y.scale)
        ];
      }
    } else if (dragC.kind === "handle") {
      line[dragC.which] = [
        U.clamp(d.x, pl.x.origin, pl.x.origin + pl.x.divisions * pl.x.scale),
        U.clamp(d.y, pl.y.origin, pl.y.origin + pl.y.divisions * pl.y.scale)
      ];
    } else {
      probes[dragC.which] = U.clamp(d.x, pl.x.origin,
        pl.x.origin + pl.x.divisions * pl.x.scale);
    }
    drawBenchC(); refreshBenchC();
  });
  cvC.addEventListener("pointerup", function () { dragC = null; });
  $("snapLine").addEventListener("click", function () {
    var fit = G.setFit(setKey);
    var g = geomC();
    var xa = g.p.x.origin + 0.05 * g.p.x.divisions * g.p.x.scale;
    var xb = g.p.x.origin + 0.95 * g.p.x.divisions * g.p.x.scale;
    line = { p1: [xa, G.lineAt(fit.slope, fit.intercept, xa)],
      p2: [xb, G.lineAt(fit.slope, fit.intercept, xb)] };
    probes = { x1: xa, x2: xb };
    drawBenchC(); refreshBenchC();
  });
  $("resetDots").addEventListener("click", function () {
    resetLineAndProbes(); drawBenchC(); refreshBenchC();
  });
  $("logPlot").addEventListener("click", function () {
    var s = set(), pl = plan(), j = jitterDiv();
    s.xs.forEach(function (x, i) {
      var got = dots[i] || [x, s.ys[i]];
      var gx = got[0] + j * pl.x.scale, gy = got[1] + j * pl.y.scale;
      logRow("dot " + (i + 1) + " of " + s.label,
        fmt(gy, decFor(pl.y.scale) + 1), unitOf(s.yLabel),
        s.xLabel.split(" (")[0] + " = " + fmt(gx, decFor(pl.x.scale) + 1) +
        (mode === "fun" ? "" : "; true " + x + ", " + s.ys[i]), "", "");
    });
  });
  $("logSlope").addEventListener("click", function () {
    var s = set(), m = lineSlope();
    var b = lineIntercept();
    var y1 = G.lineAt(m, b, probes.x1), y2 = G.lineAt(m, b, probes.x2);
    var ref = G.setFit(setKey);
    logRow("slope of " + s.label, fmt(m, 3),
      setKey === "car" ? "m/s" : "m/s^2",
      "probes (" + fmt(probes.x1, 2) + ", " + fmt(y1, 2) + ") and (" +
      fmt(probes.x2, 2) + ", " + fmt(y2, 2) + ")" +
      (ref ? "; reference " + fmt(ref.slope, 3) : ""),
      s.accepted === null ? "" : s.accepted,
      s.accepted ? U.round(G.percentError(m, s.accepted), 2) : null);
  });

  // ---------- controls shared by all benches ----------
  var sel = $("setSel");
  Object.keys(G.SETS).forEach(function (key) {
    sel.appendChild(LS.ui.el("option", { value: key, text: G.SETS[key].label }));
  });
  sel.value = setKey;
  sel.addEventListener("change", function () {
    setKey = sel.value;
    cross = null;
    resetLineAndProbes();
    $("copySet").click();
    drawBenchA(); refreshBenchA(); drawZoom(); drawBenchC(); refreshBenchC();
  });

  $("clearTable").addEventListener("click", function () {
    rows = [];
    LS.store.clear(LAB, "log");
    $("csvCopy").style.display = "none";
    renderTable();
  });
  $("exportLog").addEventListener("click", function () {
    LS.store.exportCSV("phy110-lab2-graph-log.csv", HEADER, rows, $("csvCopy"));
  });

  // ---------- boot ----------
  var dpr = window.devicePixelRatio || 1;
  function resizeStages() {
    var w = Math.round(Math.max(300, (cvC.clientWidth || 480)) * dpr);
    cvA.width = w; cvA.height = Math.round(330 * dpr);
    cvC.width = w; cvC.height = Math.round(420 * dpr);
    var zc = $("zoomCanvas");
    zc.width = w; zc.height = Math.round(90 * dpr);
    drawBenchA(); drawZoom(); drawBenchC();
  }
  window.addEventListener("resize", resizeStages);

  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (m) {
    mode = m;
    drawBenchA(); refreshBenchA(); drawZoom(); drawBenchC(); refreshBenchC();
  });
  LS.check.init(LAB);
  renderTable();
  resizeStages();
  resetLineAndProbes();
  $("copySet").click();
  refreshBenchB();
  drawZoom();
  refreshBenchA();
  refreshBenchC();
  drawBenchC();
})();
