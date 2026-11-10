// PHY110 Lab 13 sim: the converging-lens bench. A 100 cm rail with a 1 mm
// scale, a 5 cm lit arrow, two distinguishable double-convex lenses (A blue
// f = 0.20 m, B amber f = 0.10 m), a draggable white screen with a +-4 mm
// sharpness band, a four-distance classification part, and a two-lens
// refractor with an eyepiece viewport on a far window scene.
//
// Course Mode is exact thin-lens math at the kit focal lengths. Fun Mode
// carries a stable +-2 mm scale-reading offset on the o and i readings, the
// way a real eye finds a mark. Fun Mode never changes the focal lengths, the
// printed distances, or any accepted value. The bench refuses to focus when
// the object-screen distance is under 4f, and shows nothing at 0.5f - both
// are the lesson, not bugs.
(function () {
  "use strict";
  var LS = window.LS, O = LS.lens13;
  var LAB = "13-converging-lens";
  var $ = function (id) { return document.getElementById(id); };
  var mode = LS.ui.getMode(LAB);

  function fmt(x, d) {
    if (x === null || x === undefined || !isFinite(x)) return "-";
    return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  // ---------- canvases and bench geometry ----------
  var CH = 300, VH = 170;
  var cv = $("benchCanvas"), cx = cv.getContext("2d");
  var vv = $("viewportCanvas"), vx = vv.getContext("2d");
  var dpr = window.devicePixelRatio || 1;
  var MARGIN = 44;

  function cssW() { return cv.width / dpr; }
  function xPx(cm) { return MARGIN + (cm / 100) * (cssW() - 2 * MARGIN); }
  function cmAt(px) { return clamp(((px - MARGIN) / (cssW() - 2 * MARGIN)) * 100, 0, 100); }
  function railY() { return 232; }
  function arrowHpx() { return O.ARROW_CM / 100 * (cssW() - 2 * MARGIN); }

  // ---------- state ----------
  var part = "1";
  var lens = "A";          // lens in the holder (parts 1-2)
  var light = false;
  var objX = 0;            // cm, arrow post
  var lensX = 40;          // cm
  var screenX = 100;       // cm
  var presetK = 2.5;       // part 2 printed distance, multiples of f
  var objLens = "A";       // part 3 objective; the other lens is the eyepiece
  var eyeX = 55;           // cm, part 3 eyepiece
  var teleSent = null;
  var focalLog = { A: { p1: null, p2: null }, B: { p1: null, p2: null } };
  var classLog = {
    A: { "2.5": null, "2.0": null, "1.5": null, "0.5": null },
    B: { "2.5": null, "2.0": null, "1.5": null, "0.5": null }
  };
  var pick = { size: null, orient: null, type: null };
  var offs = { o: 0, i: 0 };   // Fun Mode stable +-2 mm reading offsets (m)
  var flash = null, dragging = null;

  // ---------- persistence ----------
  function saveState() {
    LS.store.save(LAB, "state", ["state"], [[JSON.stringify({
      part: part, lens: lens, light: light, objX: objX, lensX: lensX,
      screenX: screenX, presetK: presetK, objLens: objLens, eyeX: eyeX,
      teleSent: teleSent, focalLog: focalLog, classLog: classLog, mode: mode
    })]]);
    LS.store.save(LAB, "log", CSV_HEADER, csvRows());
  }
  function loadState() {
    try {
      var got = LS.store.load(LAB, "state");
      if (!got || !got.rows || !got.rows.length) return;
      var st = JSON.parse(got.rows[0][0]);
      part = st.part || "1"; lens = st.lens || "A"; light = !!st.light;
      objX = st.objX || 0; lensX = st.lensX || 40; screenX = st.screenX || 100;
      presetK = st.presetK || 2.5; objLens = st.objLens || "A"; eyeX = st.eyeX || 55;
      teleSent = st.teleSent || null;
      if (st.focalLog) focalLog = st.focalLog;
      if (st.classLog) classLog = st.classLog;
      if (st.mode === "fun") mode = "fun";
    } catch (e) {}
  }

  // ---------- physics of the current layout ----------
  function fNow() { return O.lensF(lens); }
  function oM() { return (lensX - objX) / 100; }
  function iM() { return (screenX - lensX) / 100; }
  function Dm() { return (screenX - objX) / 100; }
  function trueImageX() {
    var f = fNow(), o = oM();
    if (!(o > f) || !light) return NaN;
    var i = O.imageDistance(o, f);
    if (!isFinite(i)) return NaN;
    return lensX + i * 100;
  }
  function sharpness() {
    var xi = trueImageX();
    if (!isFinite(xi)) return 0;
    return O.sharpness(screenX / 100, xi / 100, O.FOCUS_BAND_MM / 100);
  }
  function twoPosNow() { return O.twoPositions(Dm(), fNow()); }
  function telSpacingM() { return (eyeX - 20) / 100; }
  function telBandM() { return O.TELES_BAND_MM / 100; }
  function telInFocus() {
    var fO = O.lensF(objLens), fE = O.lensF(objLens === "A" ? "B" : "A");
    return Math.abs(telSpacingM() - O.telescopeSpacing(fO, fE)) <= telBandM();
  }

  // ---------- readouts ----------
  function noteNow() {
    if (flash && Date.now() < flash.until) return flash.text;
    if (part === "1") {
      if (!light) return "turn the light on, then slide the lens";
      var tp = twoPosNow();
      if (!tp.ok) return "the arrow and screen are under 4f apart (D = " +
        fmt(Dm(), 2) + " m < 4f = " + fmt(4 * fNow(), 2) + " m) - no lens position focuses; move the screen out";
      if (sharpness() > 0.5) return "sharp on the screen - press Log position 1 or 2";
      return "soft - keep sliding the lens; expect two sharp spots";
    }
    if (part === "2") {
      if (!light) return "turn the light on, then place the arrow";
      if (presetK <= 0.5 + 1e-9) return "0.5f: no image can land on the screen - it is virtual; log it as such";
      if (sharpness() > 0.5) return "sharp - pick what you see, then press Log row";
      return "soft - slide the screen until the arrow is sharp";
    }
    if (!telInFocus()) return "out of focus - slide the eyepiece toward f_o + f_e";
    return "in focus: the window is sharp and inverted in the viewport";
  }
  function refreshReadouts() {
    var oR = null, iR = null, fR = null;
    if (part !== "3") {
      oR = oM() + offs.o;
      iR = iM() + offs.i;
      fR = O.focalFrom(Math.max(oR, 0.001), Math.max(iR, 0.001));
    }
    $("oRead").textContent = part === "3" ? "-" : fmt(oR, 3) + " m";
    $("iRead").textContent = part === "3" ? "-" : fmt(iR, 3) + " m";
    $("fRead").textContent = part === "3" ? "-" :
      (isFinite(fR) ? fmt(fR, 3) + " m" : "-");
    var fO = O.lensF(objLens), fE = O.lensF(objLens === "A" ? "B" : "A");
    $("telRead").textContent = part === "3"
      ? fmt(telSpacingM(), 3) + " m / M = " + fmt(O.telescopeMagnification(fO, fE), 1) + "x"
      : "-";
    $("lensA").className = lens === "A" ? "action" : "action ghost";
    $("lensB").className = lens === "B" ? "action" : "action ghost";
    $("lightBtn").textContent = light ? "Light: ON" : "Light: off";
    $("lightBtn").className = light ? "action" : "action ghost";
    $("part1").className = part === "1" ? "action" : "action ghost";
    $("part2").className = part === "2" ? "action" : "action ghost";
    $("part3").className = part === "3" ? "action" : "action ghost";
    $("objA").className = objLens === "A" ? "action" : "action ghost";
    $("objB").className = objLens === "B" ? "action" : "action ghost";
    document.querySelectorAll("#sizeRow button").forEach(function (b) {
      b.className = pick.size === b.getAttribute("data-size") ? "action" : "action ghost";
    });
    document.querySelectorAll("#orientRow button").forEach(function (b) {
      b.className = pick.orient === b.getAttribute("data-orient") ? "action" : "action ghost";
    });
    document.querySelectorAll("#typeRow button").forEach(function (b) {
      b.className = pick.type === b.getAttribute("data-type") ? "action" : "action ghost";
    });
    ["d25", "d20", "d15", "d05"].forEach(function (id, k) {
      var val = [2.5, 2.0, 1.5, 0.5][k];
      $(id).className = part === "2" && presetK === val ? "action" : "action ghost";
    });
    $("noteRead").textContent = noteNow();
    $("telesBox").textContent = teleSent || "nothing recorded yet";
    $("clsLensTag").textContent = "for " +
      (lens === "A" ? "Lens A (blue, f = 0.20 m)" : "Lens B (amber, f = 0.10 m)");
  }

  // ---------- data tables and CSV ----------
  var CSV_HEADER = ["part", "item", "value 1", "value 2", "value 3", "note"];
  function csvRows() {
    var rows = [];
    ["A", "B"].forEach(function (L) {
      var log = focalLog[L];
      if (log.p1) rows.push(["focal", L + " position 1",
        fmt(log.p1.o, 3), fmt(log.p1.i, 3), fmt(log.p1.f, 3), O.lensColour(L)]);
      if (log.p2) rows.push(["focal", L + " position 2",
        fmt(log.p2.o, 3), fmt(log.p2.i, 3), fmt(log.p2.f, 3), O.lensColour(L)]);
      if (log.p1 && log.p2) rows.push(["focal", L + " average f",
        fmt(O.average(log.p1.f, log.p2.f), 3), "", "", O.lensColour(L)]);
    });
    ["A", "B"].forEach(function (L) {
      O.CLASS_SET.forEach(function (k) {
        var r = classLog[L][String(k)];
        if (r) rows.push(["classify", L + " " + k + "f", fmt(r.oM, 3),
          r.size, r.orient, r.type]);
      });
    });
    if (teleSent) rows.push(["telescope", "result",
      fmt(telSpacingM(), 3), "", "", teleSent]);
    return rows;
  }
  function renderTables() {
    function logCells(L) {
      var log = focalLog[L];
      var p1 = log.p1 || {}, p2 = log.p2 || {};
      var avg = (log.p1 && log.p2) ? fmt(O.average(log.p1.f, log.p2.f), 3) : "";
      return [
        "Lens " + L, O.lensColour(L),
        p1.o !== undefined ? fmt(p1.o, 3) : "", p1.i !== undefined ? fmt(p1.i, 3) : "",
        p1.f !== undefined ? fmt(p1.f, 3) : "",
        p2.o !== undefined ? fmt(p2.o, 3) : "", p2.i !== undefined ? fmt(p2.i, 3) : "",
        p2.f !== undefined ? fmt(p2.f, 3) : "", avg
      ];
    }
    $("tableFocal").innerHTML = LS.store.tableHTML(
      ["Lens", "Colour", "o1 (m)", "i1 (m)", "f1 (m)", "o2 (m)", "i2 (m)", "f2 (m)", "Average f (m)"],
      [logCells("A"), logCells("B")]);
    var clsRows = O.CLASS_SET.map(function (k) {
      var r = classLog[lens][String(k)];
      return [
        k + "f", fmt(k * fNow(), 3),
        r ? r.size : "", r ? r.orient : "", r ? r.type : ""
      ];
    });
    $("tableClass").innerHTML = LS.store.tableHTML(
      ["o/f", "o (m)", "Size", "Up / down", "Type"], clsRows);
    renderWorkBox();
  }
  function renderWorkBox() {
    var lines = [
      "1/o + 1/i = 1/f (thin lens);  m = -i/o (added);  spacing = f_o + f_e;  M = f_o/f_e (added)",
      "kit lenses: A blue f = 0.20 m, B amber f = 0.10 m (rim values, not printed in the manual)"
    ];
    var tp = O.twoPositions(1.00, fNow());
    if (tp.ok) {
      lines.push("expected sharp spots on a 1.00 m bench with lens " + lens +
        ": o = " + fmt(tp.oFar, 3) + " m and o = " + fmt(tp.oNear, 3) +
        " m (split " + fmt(tp.split, 3) + " m)");
    }
    O.CLASS_SET.forEach(function (k) {
      var c = O.classify(k * fNow(), fNow());
      lines.push(lens + " at " + k + "f (o = " + fmt(k * fNow(), 3) + " m): " +
        c.size + ", " + c.orientation + ", " + c.type +
        (c.type === "virtual" ? " - never on the screen" : ""));
    });
    if (part === "1") {
      var now = twoPosNow();
      lines.push(now.ok
        ? "your bench: D = " + fmt(Dm(), 3) + " m, expected spots o = " + fmt(now.oFar, 3) +
          " m and o = " + fmt(now.oNear, 3) + " m"
        : "your bench: D = " + fmt(Dm(), 3) + " m < 4f = " + fmt(4 * fNow(), 3) +
          " m - no focus is possible until the screen moves out");
    }
    if (part === "3") {
      var fO = O.lensF(objLens), fE = O.lensF(objLens === "A" ? "B" : "A");
      lines.push("refractor: objective " + objLens + " (f = " + fmt(fO, 3) +
        " m), eyepiece " + (objLens === "A" ? "B" : "A") + " (f = " + fmt(fE, 3) +
        " m); sharp near " + fmt(O.telescopeSpacing(fO, fE), 3) +
        " m; M = " + fmt(O.telescopeMagnification(fO, fE), 2) + "x");
    }
    if (mode === "fun") {
      lines.push("Fun Mode: each o and i reading carries a stable +-2 mm scale-reading offset; the accepted values do not move");
    }
    $("workBox").textContent = lines.join("\n");
  }
  function refreshAll() {
    refreshReadouts();
    renderTables();
    drawBench();
    drawViewport();
  }

  // ---------- drawing: the bench ----------
  function drawRail() {
    var y = railY();
    cx.strokeStyle = "#3a4a6a"; cx.lineWidth = 2;
    cx.beginPath(); cx.moveTo(xPx(0), y); cx.lineTo(xPx(100), y + 6); cx.stroke();
    cx.font = "9px ui-monospace, monospace"; cx.textAlign = "center";
    for (var cm = 0; cm <= 100; cm += 1) {
      var x = xPx(cm);
      var major = cm % 10 === 0, mid = cm % 5 === 0;
      cx.strokeStyle = major ? "#9fb4d8" : (mid ? "#6d84ad" : "#44557a");
      cx.beginPath();
      cx.moveTo(x, y + 6);
      cx.lineTo(x, y + 6 + (major ? 12 : (mid ? 8 : 4)));
      cx.stroke();
      if (major) {
        cx.fillStyle = "#9fb4d8"; cx.textBaseline = "top";
        cx.fillText(String(cm), x, y + 22);
      }
    }
    cx.fillStyle = "#6d84ad";
    cx.fillText("cm (1 mm divisions)", xPx(50), y + 36);
  }
  function drawArrow(xCm, hPx, color, alpha, dashed) {
    var baseY = railY() - 14;
    cx.save();
    cx.globalAlpha = alpha === undefined ? 1 : alpha;
    if (dashed) cx.setLineDash([4, 3]);
    cx.strokeStyle = color; cx.lineWidth = 3;
    cx.beginPath();
    cx.moveTo(xPx(xCm), baseY);
    cx.lineTo(xPx(xCm), baseY - hPx);
    cx.stroke();
    cx.fillStyle = color;
    cx.beginPath();
    cx.moveTo(xPx(xCm), baseY - hPx - 8);
    cx.lineTo(xPx(xCm) - 6, baseY - hPx + 2);
    cx.lineTo(xPx(xCm) + 6, baseY - hPx + 2);
    cx.closePath(); cx.fill();
    cx.setLineDash([]);
    cx.restore();
  }
  function drawLens(xCm, which, label) {
    var h = 64, w2 = 9;
    var x = xPx(xCm), midY = railY() - 40;
    var col = which === "B" ? "#f59e0b" : "#4d9fdc";
    cx.strokeStyle = col; cx.lineWidth = 3;
    cx.beginPath();
    cx.moveTo(x - w2, midY - h / 2);
    cx.quadraticCurveTo(x + w2 + 6, midY, x - w2, midY + h / 2);
    cx.quadraticCurveTo(x + w2 + 6, midY, x - w2, midY - h / 2);
    cx.closePath();
    cx.globalAlpha = 0.35; cx.fillStyle = col; cx.fill();
    cx.globalAlpha = 1; cx.stroke();
    // holder post
    cx.strokeStyle = "#3a4a6a"; cx.lineWidth = 4;
    cx.beginPath(); cx.moveTo(x, midY + h / 2); cx.lineTo(x, railY() + 4); cx.stroke();
    cx.fillStyle = which === "B" ? "#ffd9a0" : "#bfe0ff";
    cx.font = "9px ui-monospace, monospace"; cx.textAlign = "center"; cx.textBaseline = "top";
    cx.fillText(label, x, railY() + 50);
  }
  function drawScreen(xCm) {
    var x = xPx(xCm), top = railY() - 108, h = 128;
    cx.fillStyle = "#e8edf6";
    cx.fillRect(x - 5, top, 10, h);
    cx.strokeStyle = "#9fb4d8"; cx.lineWidth = 1.5;
    cx.strokeRect(x - 5, top, 10, h);
    cx.strokeStyle = "#3a4a6a"; cx.lineWidth = 4;
    cx.beginPath(); cx.moveTo(x, top + h); cx.lineTo(x, railY() + 4); cx.stroke();
  }
  function drawImageOnScreen() {
    var xi = trueImageX();
    if (!light || !isFinite(xi)) return;
    var o = oM(), f = fNow();
    var m = O.imageDistance(o, f) / o;         // negative: inverted
    var s = sharpness();
    var hImg = Math.min(110, Math.abs(m) * arrowHpx());
    var x = xPx(screenX), top = railY() - 108, hScreen = 128;
    var mid = top + hScreen / 2;
    // blur halo when soft, crisp arrow when sharp
    if (s > 0.05) {
      cx.save();
      cx.globalAlpha = 0.18 * s;
      cx.fillStyle = "#ffe9a8";
      cx.beginPath();
      cx.ellipse(x, mid, 7 + 10 * (1 - s), hImg / 2 + 14 * (1 - s), 0, 0, 6.29);
      cx.fill();
      cx.restore();
      drawArrow(screenX, hImg, "#ffd166", 0.4 + 0.6 * s, false);
    }
  }
  function drawGhostVirtual() {
    // o < f: the image is virtual, erect, larger, on the object side of the lens
    if (!light) return;
    var o = oM(), f = fNow();
    if (o >= f) return;
    var i = O.imageDistance(o, f);             // negative
    var xv = lensX + i * 100;
    if (xv < objX - 2) return;                 // beyond the bench object post
    var m = Math.abs(i / o);
    var hImg = Math.min(120, m * arrowHpx());
    drawArrow(xv, hImg, "#8affc1", 0.75, true);
    cx.fillStyle = "#8affc1";
    cx.font = "9px ui-monospace, monospace"; cx.textAlign = "center"; cx.textBaseline = "top";
    cx.fillText("virtual (erect, larger)", xPx(xv), railY() + 50);
  }
  function drawRays() {
    if (!light) return;
    var o = oM(), f = fNow();
    if (!(o > f)) return;
    var xi = trueImageX();
    if (!isFinite(xi)) return;
    var tipY = railY() - 14 - arrowHpx() - 8;
    var axisY = railY() - 40;
    var tipH = axisY - tipY;
    // inverted image tip: below the axis by (i/o) times the tip height
    var imgTipY = axisY + (O.imageDistance(o, f) / o) * tipH;
    cx.save();
    cx.globalAlpha = 0.55;
    cx.strokeStyle = "#ffd166"; cx.lineWidth = 1.2;
    // parallel ray, then to the image tip
    cx.beginPath();
    cx.moveTo(xPx(objX), tipY);
    cx.lineTo(xPx(lensX), tipY);
    cx.lineTo(xPx(xi), imgTipY);
    cx.stroke();
    // central ray through the lens centre
    cx.beginPath();
    cx.moveTo(xPx(objX), tipY);
    cx.lineTo(xPx(lensX), axisY);
    cx.lineTo(xPx(xi), imgTipY);
    cx.stroke();
    cx.restore();
  }
  function drawWindowScene(x0, x1, yTop, yBot, inverted, crisp) {
    var w = x1 - x0, h = yBot - yTop;
    cx.save();
    cx.globalAlpha = crisp ? 0.95 : 0.45;
    cx.fillStyle = "#182338";
    cx.fillRect(x0, yTop, w, h);
    cx.strokeStyle = "#9fb4d8"; cx.lineWidth = 2;
    cx.strokeRect(x0, yTop, w, h);
    var panes = 2, pw = w / panes, ph = h / 2;
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1.5;
    for (var r = 0; r <= 2; r++) {
      cx.beginPath(); cx.moveTo(x0, yTop + r * ph); cx.lineTo(x1, yTop + r * ph); cx.stroke();
    }
    cx.beginPath(); cx.moveTo(x0 + pw, yTop); cx.lineTo(x0 + pw, yBot); cx.stroke();
    // a lit pane and a moon, flipped when the image is inverted
    var ly = inverted ? yTop + ph * 0.15 : yTop + ph * 0.85;
    cx.fillStyle = inverted ? "#ffe9a8" : "#22314e";
    cx.fillRect(x0 + 4, ly + 4, pw - 8, ph - 8);
    cx.fillStyle = "#dce6f5";
    cx.beginPath();
    cx.arc(x1 - pw / 2, inverted ? yBot - ph * 0.3 : yTop + ph * 0.3, 5, 0, 6.29);
    cx.fill();
    cx.restore();
  }
  function drawBench() {
    var w = cssW();
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, w, CH);
    cx.fillStyle = "#0d1526"; cx.fillRect(0, 0, w, CH);
    drawRail();
    if (part === "3") {
      drawWindowScene(xPx(88), xPx(99), railY() - 118, railY() - 40, false, true);
      cx.fillStyle = "#9fb4d8";
      cx.font = "9px system-ui, sans-serif"; cx.textAlign = "center"; cx.textBaseline = "top";
      cx.fillText("far window (the far target)", xPx(93.5), railY() - 134);
      drawLens(20, objLens, "objective " + objLens);
      drawLens(eyeX, objLens === "A" ? "B" : "A", "eyepiece " + (objLens === "A" ? "B" : "A"));
      cx.fillStyle = "#ffd166"; cx.font = "10px ui-monospace, monospace";
      cx.textAlign = "center"; cx.textBaseline = "top";
      cx.fillText("spacing " + fmt(telSpacingM(), 2) + " m", xPx((20 + eyeX) / 2), railY() - 40);
      return;
    }
    // parts 1-2
    drawArrow(objX, arrowHpx(), light ? "#ffd166" : "#44557a", 1, false);
    cx.fillStyle = light ? "#ffd166" : "#44557a";
    cx.font = "9px ui-monospace, monospace"; cx.textAlign = "center"; cx.textBaseline = "top";
    cx.fillText("arrow " + (light ? "(lit)" : "(dark)"), xPx(objX), railY() + 50);
    drawLens(lensX, lens, lens === "A" ? "A (f = 0.20 m)" : "B (f = 0.10 m)");
    drawScreen(screenX);
    if (part === "2" && presetK <= 0.5 + 1e-9) drawGhostVirtual();
    drawRays();
    drawImageOnScreen();
    // drag affordances
    var dragX = dragging === "screen" ? xPx(screenX) : (dragging === "lens" ? xPx(lensX) : -1);
    if (dragX > 0) {
      cx.fillStyle = "#ffd166";
      cx.beginPath(); cx.arc(dragX, railY() - 20, 5, 0, 6.29); cx.fill();
    }
  }
  function drawViewport() {
    var w = vv.width / dpr;
    vx.setTransform(dpr, 0, 0, dpr, 0, 0);
    vx.clearRect(0, 0, w, VH);
    vx.fillStyle = "#0d1526"; vx.fillRect(0, 0, w, VH);
    if (part !== "3") {
      vx.fillStyle = "#6d84ad"; vx.font = "11px system-ui, sans-serif";
      vx.textAlign = "center"; vx.textBaseline = "middle";
      vx.fillText("the eyepiece viewport comes on in Part 3 (the refractor)", w / 2, VH / 2);
      return;
    }
    var fO = O.lensF(objLens), fE = O.lensF(objLens === "A" ? "B" : "A");
    var inF = telInFocus();
    var pad = 18;
    if (inF) {
      drawWindowScene(pad, w - pad, 22, VH - 34, true, true);
      vx.fillStyle = "#8affc1"; vx.font = "10px ui-monospace, monospace";
      vx.textAlign = "center"; vx.textBaseline = "bottom";
      vx.fillText("in focus: the far window, inverted", w / 2, VH - 6);
    } else {
      for (var k = 0; k < 3; k++) {
        vx.save();
        vx.globalAlpha = 0.16;
        drawWindowScene(pad - 4 + k * 8, w - pad + 4 - k * 8, 26 + k * 3, VH - 38, true, false);
        vx.restore();
      }
      vx.fillStyle = "#ff8f8f"; vx.font = "10px ui-monospace, monospace";
      vx.textAlign = "center"; vx.textBaseline = "bottom";
      vx.fillText("out of focus: slide the eyepiece", w / 2, VH - 6);
    }
    vx.fillStyle = "#ffd166"; vx.font = "10px ui-monospace, monospace";
    vx.textAlign = "left"; vx.textBaseline = "top";
    vx.fillText("M = f_o/f_e = " + fmt(O.telescopeMagnification(fO, fE), 1) +
      "x   sharp near " + fmt(O.telescopeSpacing(fO, fE), 2) + " m", pad, 8);
  }

  // ---------- controls ----------
  function setPart(p) {
    part = p;
    if (p === "1") { objX = 0; if (screenX < 40) screenX = 100; }
    if (p === "2") { objX = clamp(50 - presetK * fNow() * 100, 1, 48); }
    flash = {
      text: p === "1" ? "Part 1: find the two sharp spots and log both"
        : p === "2" ? "Part 2: work the four printed distances"
        : "Part 3: space the two lenses into a refractor",
      until: Date.now() + 3000
    };
    refreshAll();
    saveState();
  }
  $("part1").addEventListener("click", function () { setPart("1"); });
  $("part2").addEventListener("click", function () { setPart("2"); });
  $("part3").addEventListener("click", function () { setPart("3"); });

  function setLens(L) {
    lens = L;
    if (part === "2") objX = clamp(50 - presetK * O.lensF(L) * 100, 1, 48);
    flash = {
      text: "Lens " + L + " (" + O.lensColour(L) + ", f = " +
        fmt(O.lensF(L), 2) + " m) is in the holder",
      until: Date.now() + 2500
    };
    refreshAll();
    saveState();
  }
  $("lensA").addEventListener("click", function () { setLens("A"); });
  $("lensB").addEventListener("click", function () { setLens("B"); });

  $("lightBtn").addEventListener("click", function () {
    light = !light;
    flash = { text: light ? "light on - the arrow is lit" : "light off",
      until: Date.now() + 1800 };
    refreshAll();
    saveState();
  });

  function setPreset(k) {
    presetK = k;
    objX = clamp(50 - k * fNow() * 100, 1, 48);
    flash = {
      text: "arrow at " + k + "f = " + fmt(k * fNow(), 3) + " m from the lens",
      until: Date.now() + 2200
    };
    refreshAll();
    saveState();
  }
  $("d25").addEventListener("click", function () { setPreset(2.5); });
  $("d20").addEventListener("click", function () { setPreset(2.0); });
  $("d15").addEventListener("click", function () { setPreset(1.5); });
  $("d05").addEventListener("click", function () { setPreset(0.5); });

  function setObjective(L) {
    objLens = L;
    flash = {
      text: "objective is Lens " + L + " (f = " + fmt(O.lensF(L), 2) +
        " m); the other lens is the eyepiece",
      until: Date.now() + 2500
    };
    refreshAll();
    saveState();
  }
  $("objA").addEventListener("click", function () { setObjective("A"); });
  $("objB").addEventListener("click", function () { setObjective("B"); });

  function logPosition(which) {
    if (part !== "1") {
      flash = { text: "the two-position logging belongs to Part 1", until: Date.now() + 2500 };
      refreshAll();
      return;
    }
    if (!light) {
      flash = { text: "turn the light on first", until: Date.now() + 2200 };
      refreshAll();
      return;
    }
    if (sharpness() <= 0.5) {
      flash = { text: "the image is not sharp at the screen - slide the lens until it is",
        until: Date.now() + 3200 };
      refreshAll();
      return;
    }
    var key = which === 1 ? "p1" : "p2";
    if (focalLog[lens][key]) {
      flash = { text: "position " + which + " for Lens " + lens + " is already logged",
        until: Date.now() + 2800 };
      refreshAll();
      return;
    }
    var oR = oM() + offs.o, iR = iM() + offs.i;
    focalLog[lens][key] = { o: oR, i: iR, f: O.focalFrom(oR, iR) };
    flash = {
      text: "Lens " + lens + " position " + which + " logged: o = " + fmt(oR, 3) +
        " m, i = " + fmt(iR, 3) + " m, f = " + fmt(focalLog[lens][key].f, 3) + " m",
      until: Date.now() + 3500
    };
    refreshAll();
    saveState();
  }
  $("logPos1").addEventListener("click", function () { logPosition(1); });
  $("logPos2").addEventListener("click", function () { logPosition(2); });

  $("logRow").addEventListener("click", function () {
    if (part !== "2") {
      flash = { text: "the classification rows belong to Part 2", until: Date.now() + 2500 };
      refreshAll();
      return;
    }
    if (!light) {
      flash = { text: "turn the light on first", until: Date.now() + 2200 };
      refreshAll();
      return;
    }
    if (!pick.size || !pick.orient || !pick.type) {
      flash = { text: "pick the size, the up-or-down sense, and the type first",
        until: Date.now() + 3000 };
      refreshAll();
      return;
    }
    classLog[lens][String(presetK)] = {
      oM: (lensX - objX) / 100, size: pick.size, orient: pick.orient, type: pick.type
    };
    flash = {
      text: "row logged for " + presetK + "f: " + pick.size + ", " + pick.orient + ", " + pick.type,
      until: Date.now() + 3000
    };
    refreshAll();
    saveState();
  });

  $("recordTeles").addEventListener("click", function () {
    if (part !== "3") {
      flash = { text: "the refractor record belongs to Part 3", until: Date.now() + 2500 };
      refreshAll();
      return;
    }
    var L2 = objLens === "A" ? "B" : "A";
    var fO = O.lensF(objLens), fE = O.lensF(L2);
    teleSent = "The objective is Lens " + objLens + " (" + O.lensColour(objLens) +
      ", f = " + fmt(fO, 2) + " m) and the eyepiece is Lens " + L2 + " (f = " +
      fmt(fE, 2) + " m). The eyepiece sits " + fmt(telSpacingM(), 2) +
      " m from the objective (f_o + f_e = " + fmt(O.telescopeSpacing(fO, fE), 2) +
      " m), and the far window looks " +
      (telInFocus() ? "sharp and inverted" : "out of focus") + " in the viewport.";
    flash = { text: "refractor result recorded in words", until: Date.now() + 2500 };
    refreshAll();
    saveState();
  });

  document.querySelectorAll("#sizeRow button").forEach(function (b) {
    b.addEventListener("click", function () {
      pick.size = b.getAttribute("data-size");
      refreshAll();
    });
  });
  document.querySelectorAll("#orientRow button").forEach(function (b) {
    b.addEventListener("click", function () {
      pick.orient = b.getAttribute("data-orient");
      refreshAll();
    });
  });
  document.querySelectorAll("#typeRow button").forEach(function (b) {
    b.addEventListener("click", function () {
      pick.type = b.getAttribute("data-type");
      refreshAll();
    });
  });

  $("clearAllBtn").addEventListener("click", function () {
    part = "1"; lens = "A"; light = false; objX = 0; lensX = 40; screenX = 100;
    presetK = 2.5; objLens = "A"; eyeX = 55; teleSent = null;
    focalLog = { A: { p1: null, p2: null }, B: { p1: null, p2: null } };
    classLog = {
      A: { "2.5": null, "2.0": null, "1.5": null, "0.5": null },
      B: { "2.5": null, "2.0": null, "1.5": null, "0.5": null }
    };
    pick = { size: null, orient: null, type: null };
    LS.store.clear(LAB, "log");
    $("csvCopy").style.display = "none";
    flash = { text: "cleared - the bench is back to its starting layout",
      until: Date.now() + 2500 };
    refreshAll();
    saveState();
  });
  $("exportLog").addEventListener("click", function () {
    LS.store.exportCSV("phy110-lab13-converging-lens.csv", CSV_HEADER, csvRows(), $("csvCopy"));
  });

  // ---------- dragging on the bench ----------
  function evPos(ev) {
    var r = cv.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }
  cv.addEventListener("pointerdown", function (ev) {
    var p = evPos(ev);
    if (part === "3") {
      if (Math.abs(p.x - xPx(eyeX)) < 22) {
        dragging = "eye";
        cv.setPointerCapture(ev.pointerId);
      }
      return;
    }
    if (Math.abs(p.x - xPx(lensX)) < 20 && part === "1") {
      dragging = "lens";
      cv.setPointerCapture(ev.pointerId);
      return;
    }
    if (Math.abs(p.x - xPx(screenX)) < 22) {
      dragging = "screen";
      cv.setPointerCapture(ev.pointerId);
    }
  });
  cv.addEventListener("pointermove", function (ev) {
    if (!dragging) return;
    var p = evPos(ev);
    if (dragging === "eye") {
      eyeX = clamp(cmAt(p.x), 26, 92);
    } else if (dragging === "screen") {
      screenX = clamp(cmAt(p.x), (part === "1" ? objX + 12 : lensX + 8), 99);
    } else {
      lensX = clamp(cmAt(p.x), objX + 4, part === "1" ? screenX - 4 : 50);
      if (part === "2") lensX = 50; // fixed post in Part 2
    }
    drawBench();
    var rd = noteNow();
    $("noteRead").textContent = rd;
    if (part !== "3") {
      $("oRead").textContent = fmt(oM() + offs.o, 3) + " m";
      $("iRead").textContent = fmt(iM() + offs.i, 3) + " m";
    } else {
      var fO = O.lensF(objLens), fE = O.lensF(objLens === "A" ? "B" : "A");
      $("telRead").textContent = fmt(telSpacingM(), 3) + " m / M = " +
        fmt(O.telescopeMagnification(fO, fE), 1) + "x";
    }
  });
  cv.addEventListener("pointerup", function () {
    if (!dragging) return;
    dragging = null;
    flash = {
      text: part === "3"
        ? "eyepiece at " + fmt(telSpacingM(), 2) + " m from the objective"
        : "lens at " + fmt(lensX, 1) + " cm, screen at " + fmt(screenX, 1) + " cm",
      until: Date.now() + 2000
    };
    refreshAll();
    saveState();
  });
  cv.addEventListener("pointercancel", function () {
    if (dragging) { dragging = null; drawBench(); }
  });

  // ---------- boot ----------
  function resizeStages() {
    cv.width = Math.round(Math.max(700, (cv.clientWidth || 760)) * dpr);
    cv.height = Math.round(CH * dpr);
    vv.width = Math.round(Math.max(460, (vv.clientWidth || 560)) * dpr);
    vv.height = Math.round(VH * dpr);
    drawBench();
    drawViewport();
  }
  window.addEventListener("resize", resizeStages);

  setInterval(function () {
    if (flash && Date.now() >= flash.until) { flash = null; refreshReadouts(); }
  }, 60);

  loadState();
  if (mode === "fun") {
    offs = { o: (Math.random() * 2 - 1) * O.READ_NOISE_MM / 1000,
      i: (Math.random() * 2 - 1) * O.READ_NOISE_MM / 1000 };
  }
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (m) {
    mode = m;
    if (mode === "fun") {
      offs = { o: (Math.random() * 2 - 1) * O.READ_NOISE_MM / 1000,
        i: (Math.random() * 2 - 1) * O.READ_NOISE_MM / 1000 };
    } else {
      offs = { o: 0, i: 0 };
    }
    refreshAll();
    saveState();
  });
  LS.check.init(LAB);
  refreshAll();
  resizeStages();
})();
