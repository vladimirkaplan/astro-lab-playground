// Lab 1 sim: on-screen ruler with parallax, coin balance with optional noise,
// percent-error trainer, and a persisted data table with CSV export.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units;
  var LAB = "01-measurement";

  // ---------- bench + ruler state ----------
  var TABLE_CM = 183.0;          // the course bench length (plank drawn to scale)
  var WORLD_CM = 205;            // visible world width in centimeters
  var unit = "cm";               // meter stick or yard stick on the bench
  var rulerOffsetCm = 0;         // scale mark sitting at the bench's left edge
  var markerCm = TABLE_CM + 9;   // draggable end marker (starts off the edge)
  var slipCm = 0;                // Fun Mode marker slip
  var eyePx = 0;                 // signed eye offset for parallax
  var mode = LS.ui.getMode(LAB);

  var cv = document.getElementById("rulerCanvas");
  var ctx = cv.getContext("2d");
  var dpr = window.devicePixelRatio || 1;
  var EYE_Y = 30, EDGE_Y = 118, SCALE_Y = 146, RULER_H = 86;

  function W() { return cv.clientWidth || 480; }
  function pxPerCm() { return (W() - 24) / WORLD_CM; }
  function X(cm) { return 12 + cm * pxPerCm(); }
  function cmAt(pxv) { return (pxv - 12) / pxPerCm(); }

  // The scale mark (as printed on the ruler) at world position w.
  function markAt(w) { return w + rulerOffsetCm; }

  // Sight geometry: the eye hovers above the scene; near objects (the marker)
  // project onto the scale plane below along a straight line through the eye.
  var F_ACTOR = (SCALE_Y + 18 - EYE_Y) / (EDGE_Y - EYE_Y);
  function sightHitCm(worldCm) {
    var eyeX = X(TABLE_CM / 2) + eyePx;
    return cmAt(eyeX + (X(worldCm) - eyeX) * F_ACTOR);
  }
  // Mark the eye actually reads against a world position.
  function readMarkOf(worldCm) {
    return markAt(Math.abs(eyePx) > 2 ? sightHitCm(worldCm) : worldCm);
  }
  // Bench length as current eye/ruler/mode would report it, in cm.
  function lengthReadingCm() {
    var len = readMarkOf(markerPhysicalCm()) - readMarkOf(0);
    if (mode === "fun") len += (Math.random() - 0.5) * (unit === "cm" ? 0.3 : 0.08);
    return len;
  }
  function markerPhysicalCm() { return Math.min(TABLE_CM + 20, markerCm + slipCm); }

  // ---------- drawing ----------
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawTicks(ry) {
    var dense = pxPerCm() >= 2.2;      // skip half-mm micro ticks on phones
    var labelEvery = unit === "cm" ? 10 : 5;
    var minorSize = unit === "cm" ? (dense ? 0.5 : 1) : 0.125;
    var mainSize = unit === "cm" ? 1 : 1;
    var lo = rulerZeroWorld(), hi = rulerZeroWorld() + WORLD_CM;
    var startU = Math.ceil(worldToUnit(lo) / minorSize) * minorSize;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (var v = startU; v <= worldToUnit(hi); v += minorSize) {
      var world = unitToWorld(v);
      if (world < -0.5 || world > WORLD_CM) continue;
      var pxv = X(world);
      var isMain = Math.abs(v / mainSize - Math.round(v / mainSize)) < 1e-6;
      var isLabel = Math.abs(v / labelEvery - Math.round(v / labelEvery)) < 1e-6;
      ctx.strokeStyle = "#3a3a3a";
      ctx.lineWidth = isMain ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(pxv, ry);
      ctx.lineTo(pxv, ry + (isLabel ? 26 : isMain ? 17 : 9));
      ctx.stroke();
      if (isLabel) {
        ctx.fillStyle = "#222"; ctx.font = "10.5px ui-monospace, Menlo, monospace";
        ctx.fillText(String(Math.round(v)), pxv, ry + 30);
      }
    }
  }
  function rulerZeroWorld() { return -rulerOffsetCm; } // world pos of the ruler's zero mark
  function worldToUnit(w) { return unit === "cm" ? w : w / 2.54; }
  function unitToWorld(u) { return unit === "cm" ? u : u * 2.54; }

  function drawRuler() {
    var w = W(), h = cv.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // bench plank (its drawn edge IS the truth to be found)
    var x0 = X(0), x1 = X(TABLE_CM);
    var grad = ctx.createLinearGradient(0, 40, 0, 122);
    grad.addColorStop(0, "#a9713d"); grad.addColorStop(1, "#7c4f26");
    ctx.fillStyle = grad;
    roundRect(ctx, x0, 40, x1 - x0, 82, 6); ctx.fill();
    ctx.strokeStyle = "#5e3a1a"; ctx.lineWidth = 1.5;
    roundRect(ctx, x0, 40, x1 - x0, 82, 6); ctx.stroke();
    ctx.fillStyle = "#f6e8d4"; ctx.font = "12.5px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("lab bench: measure its length", (x0 + x1) / 2, 81);

    // eye above the middle of the bench
    var eyeX = X(TABLE_CM / 2) + eyePx;
    ctx.fillStyle = "#223";
    ctx.beginPath(); ctx.arc(eyeX, EYE_Y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#c9d4ea"; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = "11px system-ui, sans-serif"; ctx.fillStyle = "#567";
    ctx.fillText("your eye", eyeX, EYE_Y - 18);

    // ruler band below the bench (the scale plane)
    var ry = SCALE_Y, rh = RULER_H;
    ctx.fillStyle = "#efe0bb";
    ctx.fillRect(6, ry, w - 12, rh);
    ctx.strokeStyle = "#b99e6b"; ctx.strokeRect(6, ry, w - 12, rh);
    drawTicks(ry);
    ctx.fillStyle = "#665"; ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(unit === "cm"
      ? "meter stick: millimeter ticks, read them plus one estimated digit"
      : "yard stick: eighth-of-an-inch ticks", 12, ry + 62);

    // marker line through bench and scale
    var mkX = X(markerPhysicalCm());
    ctx.strokeStyle = "#d33"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(mkX, 30); ctx.lineTo(mkX, ry + 40); ctx.stroke();
    ctx.fillStyle = "#d33";
    ctx.beginPath(); ctx.arc(mkX, 46, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(mkX, 46, 8, 0, Math.PI * 2); ctx.stroke();

    // sight line and the mark it lands on when the eye is off-axis
    if (Math.abs(eyePx) > 2) {
      var hit = sightHitCm(markerPhysicalCm());
      ctx.strokeStyle = "rgba(211,45,45,.55)"; ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(eyeX, EYE_Y);
      ctx.lineTo(X(markerPhysicalCm()), EDGE_Y);
      ctx.lineTo(X(hit), ry + 16);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = "#d33";
      ctx.beginPath();
      ctx.moveTo(X(hit) - 5, ry + 11); ctx.lineTo(X(hit) + 5, ry + 21);
      ctx.moveTo(X(hit) + 5, ry + 11); ctx.lineTo(X(hit) - 5, ry + 21);
      ctx.stroke();
    }
  }

  function refreshReadout() {
    var len = lengthReadingCm();
    var el = document.getElementById("rulerRead");
    if (unit === "cm") {
      var rmark = readMarkOf(markerPhysicalCm());
      var lmark = readMarkOf(0);
      el.textContent = U.round(len, 1) + " cm" +
        (rulerOffsetCm > 0 ? "  (right " + U.round(rmark, 1) + " - left " + U.round(lmark, 1) + ")" : "");
    } else {
      el.textContent = U.round(len / 2.54, 1) + " in" +
        (rulerOffsetCm > 0 ? "  (right " + U.round(readMarkOf(markerPhysicalCm()) / 2.54, 2) +
          " - left " + U.round(readMarkOf(0) / 2.54, 2) + ")" : "");
    }
    document.getElementById("zeroNote").textContent = rulerOffsetCm > 0
      ? "The ruler sits Off-ZERO: mark " + (unit === "cm" ? U.round(rulerOffsetCm, 1) + " cm" : U.round(rulerOffsetCm / 2.54, 2) + " in") +
        " lines up with the bench's left edge, so subtract the left reading."
      : "Ruler zero sits exactly at the bench's left edge. Press Slide ruler off zero to practice the subtraction habit.";
  }

  // ---------- ruler interactions ----------
  var dragging = false;
  function pointerCm(ev) { return cmAt(ev.clientX - cv.getBoundingClientRect().left); }
  cv.addEventListener("pointerdown", function (ev) {
    var v = pointerCm(ev);
    if (Math.abs(v - markerPhysicalCm()) < 4) {
      dragging = true;
      cv.setPointerCapture(ev.pointerId);
    } else {
      markerCm = U.clamp(v, 0, WORLD_CM - 4);
      applySlip();
      update();
    }
  });
  cv.addEventListener("pointermove", function (ev) {
    if (!dragging) return;
    markerCm = U.clamp(pointerCm(ev), 0, WORLD_CM - 4);
    update();
  });
  cv.addEventListener("pointerup", function () {
    if (!dragging) return;
    dragging = false;
    applySlip();
    update();
  });
  function applySlip() {
    slipCm = mode === "fun" ? (Math.random() - 0.5) * 0.45 : 0;
  }

  document.getElementById("eyePos").addEventListener("input", function (ev) {
    eyePx = parseFloat(ev.target.value);
    update();
  });
  document.getElementById("toggleUnit").addEventListener("click", function (ev) {
    unit = unit === "cm" ? "in" : "cm";
    ev.target.textContent = unit === "cm" ? "Switch to inches ruler" : "Switch to centimeters ruler";
    update();
  });
  document.getElementById("resitZero").addEventListener("click", function () {
    rulerOffsetCm = rulerOffsetCm > 0 ? 0 : Math.round((2 + Math.random() * 9) * 10) / 10;
    update();
  });

  // ---------- data table ----------
  var HEADER = ["when", "what", "value", "unit", "accepted", "percent error"];
  var rows = [];
  try {
    var saved = LS.store.load(LAB, "data");
    if (saved && saved.rows) rows = saved.rows;
  } catch (e) {}
  function saveRows() {
    LS.store.save(LAB, "data", HEADER, rows);
    renderTable();
  }
  function stamp() {
    var d = new Date();
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) +
      " " + z(d.getHours()) + ":" + z(d.getMinutes());
  }
  function z(n) { return (n < 10 ? "0" : "") + n; }
  function renderTable() {
    document.getElementById("dataTable").innerHTML = rows.length
      ? LS.store.tableHTML(HEADER, rows)
      : "<p class='muted'>No rows yet. Log a ruler reading or weigh a coin.</p>";
  }

  document.getElementById("logRead").addEventListener("click", function () {
    var lenCm = lengthReadingCm();
    var useIn = unit === "in";
    var val = useIn ? U.round(lenCm / 2.54, 1) : U.round(lenCm, 1);
    rows.push([stamp(), "bench length", val, useIn ? "in" : "cm", "", ""]);
    saveRows();
  });

  document.getElementById("exportCsv").addEventListener("click", function () {
    LS.store.exportCSV("lab1-measurement.csv", HEADER, rows,
      document.getElementById("csvCopy"));
  });
  document.getElementById("clearTable").addEventListener("click", function () {
    rows = [];
    LS.store.clear(LAB, "data");
    document.getElementById("csvCopy").style.display = "none";
    renderTable();
  });

  // ---------- coins ----------
  var coinSel = null;
  var tray = document.getElementById("coinTray");
  var SIZES_MM = { penny: 19.05, nickel: 21.21, dime: 17.91, quarter: 24.26 };
  var specVisible = false;
  Object.keys(U.COINS).forEach(function (id) {
    var d = SIZES_MM[id] * 2.6;
    var copper = id === "penny";
    var b = LS.ui.el("button", {
      type: "button", "class": "coin", id: "coin-" + id,
      title: U.COINS[id].label, "aria-label": U.COINS[id].label
    });
    b.style.cssText = "width:" + d + "px;height:" + d + "px;border-radius:50%;cursor:pointer;" +
      "background:radial-gradient(circle at 35% 30%, " +
      (copper ? "#e2a06a" : "#eceef0") + " 0%, " +
      (copper ? "#9d5c2d" : "#9a9da4") + " 70%);border:1px solid rgba(0,0,0,.35)";
    b.addEventListener("click", function () {
      coinSel = id;
      document.querySelectorAll(".coin").forEach(function (c) { c.style.outline = ""; });
      b.style.outline = "3px solid #2b5bd7";
      document.getElementById("scaleRead").textContent = "---";
      refreshSpecLine();
    });
    tray.appendChild(b);
  });
  function specText(id) {
    return U.COINS[id].label + " spec: " + U.COINS[id].g.toFixed(3) + " g (" + U.COINS[id].note + ").";
  }
  function refreshSpecLine() {
    document.getElementById("specLine").textContent =
      (specVisible && coinSel) ? specText(coinSel) : "";
  }
  document.getElementById("specBtn").addEventListener("click", function () {
    specVisible = !specVisible;
    refreshSpecLine();
  });
  document.getElementById("weighBtn").addEventListener("click", function () {
    if (!coinSel) {
      document.getElementById("scaleRead").textContent = "pick a coin first";
      return;
    }
    var spec = U.COINS[coinSel].g;
    // two dice minus one: triangular-ish jitter, worn-balance scale
    var reading = mode === "fun"
      ? spec + (Math.random() + Math.random() - 1) * 0.12
      : spec;
    reading = U.round(reading, 2);
    document.getElementById("scaleRead").textContent = reading.toFixed(2) + " g";
    rows.push([
      stamp(), U.COINS[coinSel].label, reading.toFixed(2), "g",
      specVisible ? spec.toFixed(3) : "",
      specVisible ? U.percentError(reading, spec).toFixed(2) + "%" : ""
    ]);
    saveRows();
  });

  // ---------- percent-error trainer ----------
  var pe = null;
  var peRng = U.mulberry32(20261105);
  document.getElementById("peNew").addEventListener("click", function () {
    var accepted = U.round(1 + peRng() * 150, peRng() < 0.5 ? 1 : 2);
    var errPct = 0.5 + peRng() * 11;
    var measured = U.round(accepted * (1 + (peRng() < 0.5 ? -1 : 1) * errPct / 100), 2);
    pe = { accepted: accepted, measured: measured, err: errPct };
    document.getElementById("peSetup").textContent = "your: " + measured + "   accepted: " + accepted;
    document.getElementById("peAnswer").value = "";
    document.getElementById("peFeedback").textContent = "";
  });
  document.getElementById("peCheck").addEventListener("click", function () {
    if (!pe) return;
    var fb = document.getElementById("peFeedback");
    var ans = LS.check.parseNumber(document.getElementById("peAnswer").value);
    if (U.near(ans, pe.err, 6) || (pe.err < 1 && Math.abs(ans - pe.err) < 0.12)) {
      fb.className = "feedback ok";
      fb.textContent = "Right (" + U.round(pe.err, 2) + "%). Another?";
    } else {
      fb.className = "feedback nope";
      fb.textContent = "Nope: |measured - accepted| / accepted * 100.";
    }
  });

  // ---------- boot ----------
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, document.getElementById("toolbar1"), function (m) {
    mode = m; slipCm = 0; update();
  });
  LS.check.init(LAB);

  function resize() {
    cv.width = Math.round((cv.clientWidth || 480) * dpr);
    cv.height = Math.round(300 * dpr);
    drawRuler();
  }
  window.addEventListener("resize", resize);

  function update() { drawRuler(); refreshReadout(); }
  resize();
  update();
  renderTable();
})();
