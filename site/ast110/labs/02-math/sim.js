// Lab 2 mathematics sim: two benches on one page.
// Bench A, the circle bench: a circle you pick, a tape you wrap, pi as a ratio.
// Fun Mode makes the tape and the ruler honest-to-life sloppy (a tape stretches
// and the end wobbles) so percent error stops being an abstraction.
// Bench B, the angle bench: an eye, an object at a slider-controlled distance,
// the sight-line wedge, and a telescope inset that shows the apparent size a
// small scope would really deliver at that distance.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units, M = LS.mathlab;
  var LAB = "02-math";
  var $ = function (id) { return document.getElementById(id); };

  var mode = LS.ui.getMode(LAB);
  var RAD = Math.PI / 180;
  var TAG = "  (eye/instrument estimate)";

  // ---------- bench A: circle ----------
  var diaCm = 20;
  var lastTape = null;            // last measured circumference (cm) or null

  function circleMeas() {
    var trueC = Math.PI * diaCm;
    if (mode !== "fun") {
      return { dia: diaCm, circ: trueC, pi: M.piMeasured(trueC, diaCm), tag: "" };
    }
    // same slider value, same wobble: seeded on the diameter setting
    var r = U.mulberry32(Math.round(diaCm * 4) + 0xC1BC);
    var diaRead = Math.max(0.5, diaCm + (r() - 0.5) * 0.2);
    var circRead = trueC * (1 + (r() - 0.5) * 0.02) + (r() - 0.5) * 0.4;
    return { dia: diaRead, circ: circRead, pi: M.piMeasured(circRead, diaRead), tag: TAG };
  }

  function fmtNum(x, d) { return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }

  // values the readouts show: the wrapped tape once measured (the ideal tape
  // reads the true circumference), the instrument's reading in Fun mode
  function circleReads() {
    if (mode !== "fun") {
      return { dia: diaCm, circ: lastTape, pi: lastTape === null
        ? Math.PI : M.piMeasured(lastTape, diaCm) };
    }
    var m = circleMeas();
    return { dia: m.dia, circ: m.circ, pi: m.pi };
  }

  function drawCircle(ctx, x, y, rPx, fill, stroke) {
    ctx.beginPath(); ctx.arc(x, y, rPx, 0, 6.29);
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
  }

  function drawCircleBench() {
    var w = stage.width / dpr, h = CIRCLE_H;
    cx1.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx1.clearRect(0, 0, w, h);
    cx1.fillStyle = "#0d1526"; cx1.fillRect(0, 0, w, h);

    var rr = Math.min(120, h * 0.28);
    var ccx = w * 0.30, ccy = h * 0.38;
    drawCircle(cx1, ccx, ccy, rr, "#16233d", "#7fa7e8");
    // diameter line with end caps and label
    cx1.strokeStyle = "#ffd166"; cx1.lineWidth = 1.6;
    cx1.beginPath(); cx1.moveTo(ccx - rr, ccy); cx1.lineTo(ccx + rr, ccy); cx1.stroke();
    [[-1], [1]].forEach(function (s) {
      cx1.beginPath();
      cx1.moveTo(ccx + s[0] * rr, ccy - 6); cx1.lineTo(ccx + s[0] * rr, ccy + 6);
      cx1.stroke();
    });
    var reads = circleReads();
    cx1.fillStyle = "#ffd166"; cx1.font = "13px system-ui, sans-serif";
    cx1.textAlign = "center";
    cx1.fillText("diameter = " + fmtNum(reads.dia, 1) + " cm", ccx, ccy + rr + 18);

    // tape strip along the bottom
    var tapeY = h - 46, tapeX0 = 30;
    var scale = (w - 80) / 200;          // px per cm, capped at 200 cm shown
    var wrap = lastTape === null ? Math.PI * diaCm : lastTape;
    var tapeW = Math.min(2, wrap * scale);
    cx1.fillStyle = "#caa04f";
    cx1.fillRect(tapeX0, tapeY, Math.min(w - 60, wrap * scale), 12);
    cx1.strokeStyle = "#8a6a2f"; cx1.lineWidth = 1;
    for (var t = 0; t <= wrap && tapeX0 + t * scale < w - 40; t += 10) {
      cx1.beginPath();
      cx1.moveTo(tapeX0 + t * scale, tapeY);
      cx1.lineTo(tapeX0 + t * scale, tapeY + (t % 50 === 0 ? 12 : 6));
      cx1.stroke();
    }
    cx1.fillStyle = "#9fb4d8"; cx1.font = "12px system-ui, sans-serif";
    cx1.textAlign = "left";
    cx1.fillText(lastTape === null
      ? "circumference: not measured yet - press Wrap and measure the circle"
      : "tape read: " + fmtNum(lastTape, 1) + " cm of string around the rim",
      tapeX0, tapeY - 8);
  }

  // ---------- bench B: angle ----------
  var objKey = "quarter";
  var distByObj = {};                  // remembered slider position per object
  // dCalc and the slider distance always share one unit: coins in mm, the
  // Moon in thousand km, the rest in million km. The small-angle ratio only
  // works when the units match, so the sim never converts behind the formula.
  var ANGLE_UNITS = {
    moon: "thousand km", sun: "million km", jupiter: "million km", venus: "million km"
  };
  function objDef() {
    if (M.COINS[objKey]) {
      return {
        label: M.COINS[objKey].label,
        d: M.COINS[objKey].mm, calcUnit: "mm", unit: "m",
        dLabel: fmtNum(M.COINS[objKey].mm, 2) + " mm",
        lo: 0.15, hi: 2, dflt: M.ARM_LENGTH_M, color: "#d8b25e", dec: 2
      };
    }
    var o = M.OBJECTS[objKey];
    if (objKey === "moon") {
      return { label: o.label, d: o.dKm / 1e3, calcUnit: "thousand km", unit: "thousand km",
        dLabel: o.dKm.toLocaleString("en-US") + " km", lo: 250, hi: 600, dflt: o.Dkm / 1e3,
        color: "#cfd6e4", dec: 1 };
    }
    if (objKey === "sun") {
      return { label: o.label, d: o.dKm / 1e6, calcUnit: "million km", unit: "million km",
        dLabel: M.sciFormat(o.dKm, 3) + " km", lo: 50, hi: 1200, dflt: o.Dkm / 1e6,
        color: "#ffd166", dec: 1 };
    }
    return { label: o.label, d: o.dKm / 1e6, calcUnit: "million km", unit: "million km",
      dLabel: M.sciFormat(o.dKm, 4) + " km", lo: objKey === "jupiter" ? 550 : 40,
      hi: objKey === "jupiter" ? 1000 : 260, dflt: o.Dkm / 1e6,
      color: objKey === "jupiter" ? "#e0a06a" : "#e8d9a0", dec: 1 };
  }
  function distNow() {
    var def = objDef();
    if (distByObj[objKey] === undefined) distByObj[objKey] = def.dflt;
    return U.clamp(distByObj[objKey], def.lo, def.hi);
  }

  function toCalcDist(def, dist) {           // slider m -> mm for coins, else as-is
    return def.calcUnit === "mm" ? dist * 1000 : dist;
  }

  function angleMeas() {
    var def = objDef();
    var dist = distNow();
    var angDeg = M.angDeg(def.d, toCalcDist(def, dist));
    if (mode !== "fun") {
      return { dist: dist, angDeg: angDeg, tag: "", def: def };
    }
    var r = U.mulberry32(Math.round(dist * 100) + objKey.length * 7919);
    var shake = def.unit === "m" ? 0.03 : dist * 0.015;
    var distRead = dist + (r() - 0.5) * shake;
    var angRead = M.angDeg(def.d, toCalcDist(def, distRead));
    return { dist: distRead, angDeg: angRead, tag: TAG, def: def };
  }

  function fmtAng(deg) {
    if (deg * 60 < 1) return fmtNum(deg * 3600, 1) + " arcsec";
    if (deg * 60 < 600) return fmtNum(deg * 60, 1) + " arcmin";
    return fmtNum(deg, 2) + " deg";
  }

  function drawAngleBench() {
    var w = stage2.width / dpr, h = ANGLE_H;
    cx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx2.clearRect(0, 0, w, h);
    cx2.fillStyle = "#0d1526"; cx2.fillRect(0, 0, w, h);

    var m = angleMeas(), def = m.def;
    var eyeX = 46, eyeY = h * 0.42;
    var objX = w - 92, objR = 26;

    // sight lines from the eye to the object's near and far edge
    var topY = eyeY - objR, botY = eyeY + objR;
    cx2.strokeStyle = "rgba(127,167,232,.55)"; cx2.lineWidth = 1.2;
    cx2.beginPath(); cx2.moveTo(eyeX, eyeY); cx2.lineTo(objX, topY); cx2.stroke();
    cx2.beginPath(); cx2.moveTo(eyeX, eyeY); cx2.lineTo(objX, botY); cx2.stroke();

    // the eye
    cx2.strokeStyle = "#9fb4d8"; cx2.lineWidth = 1.6;
    cx2.beginPath(); cx2.arc(eyeX, eyeY, 9, 0, 6.29); cx2.stroke();
    cx2.fillStyle = "#9fb4d8";
    cx2.beginPath(); cx2.arc(eyeX, eyeY, 3, 0, 6.29); cx2.fill();

    // the object as a coin or a small planet disk
    cx2.beginPath(); cx2.arc(objX, eyeY, objR, 0, 6.29);
    cx2.fillStyle = def.color; cx2.fill();
    cx2.strokeStyle = "rgba(255,255,255,.35)"; cx2.lineWidth = 1.4; cx2.stroke();
    cx2.fillStyle = "#cfd6e4"; cx2.font = "12px system-ui, sans-serif";
    cx2.textAlign = "center";
    cx2.fillText(def.dLabel + " wide", objX, eyeY + objR + 16);
    cx2.textAlign = "right";
    cx2.fillStyle = "#9fb4d8";
    cx2.fillText("distance " + fmtNum(m.dist, def.unit === "m" ? 2 : 1) + " " + def.unit + m.tag,
      w - 16, 22);

    // telescope inset: apparent size, shared scale across every object
    var ix = 26, iy = h - 78, iw = 168, ih = 62;
    cx2.fillStyle = "#111a2e"; cx2.fillRect(ix, iy, iw, ih);
    cx2.strokeStyle = "#3c4f73"; cx2.strokeRect(ix, iy, iw, ih);
    var rPx = U.clamp(m.angDeg * INSET_PX_PER_DEG, 0.6, ih / 2 - 3);
    var icx = ix + 34, icy = iy + ih / 2;
    cx2.beginPath(); cx2.arc(icx, icy, rPx, 0, 6.29);
    cx2.fillStyle = def.color; cx2.fill();
    // 1-degree reference bar for scale
    var barPx = INSET_PX_PER_DEG;
    cx2.strokeStyle = "#6d84ad"; cx2.lineWidth = 1;
    cx2.beginPath(); cx2.moveTo(ix + 78, iy + ih - 14);
    cx2.lineTo(ix + 78 + barPx, iy + ih - 14); cx2.stroke();
    cx2.beginPath();
    cx2.moveTo(ix + 78, iy + ih - 17); cx2.lineTo(ix + 78, iy + ih - 11);
    cx2.moveTo(ix + 78 + barPx, iy + ih - 17); cx2.lineTo(ix + 78 + barPx, iy + ih - 11);
    cx2.stroke();
    cx2.fillStyle = "#9fb4d8"; cx2.font = "11px system-ui, sans-serif";
    cx2.textAlign = "left";
    cx2.fillText("1 deg at telescope scale", ix + 78, iy + 14);
    cx2.textAlign = "center";
    cx2.fillText("apparent size " + fmtAng(m.angDeg) + m.tag, ix + iw / 2, iy - 7);
  }

  // ---------- stage plumbing ----------
  var stage = $("circleStage"), stage2 = $("angleStage");
  var cx1 = stage.getContext("2d"), cx2 = stage2.getContext("2d");
  var dpr = window.devicePixelRatio || 1;
  var CIRCLE_H = 260, ANGLE_H = 260;
  var INSET_PX_PER_DEG = 90;

  function refreshCircleReadouts() {
    var r = circleReads();
    $("diaRead").textContent = fmtNum(r.dia, 1) + " cm" + (mode === "fun" ? TAG : "");
    $("circRead").textContent = r.circ === null
      ? "press Wrap and measure"
      : fmtNum(r.circ, 1) + " cm" + (mode === "fun" ? TAG : "");
    $("piRead").textContent = fmtNum(r.pi, 4);
  }
  function refreshAngleReadouts() {
    var m = angleMeas();
    $("angRead").textContent = fmtAng(m.angDeg) + m.tag;
    $("distRead").textContent = fmtNum(m.dist, m.def.unit === "m" ? 2 : 1) +
      " " + m.def.unit + m.tag;
    var moon = M.OBJECTS.moon;
    var ratio = m.angDeg / M.angDeg(moon.dKm, moon.Dkm);
    $("ratioRead").textContent = ratio >= 1
      ? fmtNum(ratio, ratio < 10 ? 1 : 0) + " Moons wide"
      : "1/" + fmtNum(1 / ratio, 0) + " of the Moon";
  }

  function draw() { drawCircleBench(); drawAngleBench(); }
  function refresh() { refreshCircleReadouts(); refreshAngleReadouts(); }

  // ---------- controls ----------
  $("diaRange").addEventListener("input", function (e) {
    diaCm = parseFloat(e.target.value);
    lastTape = null;
    $("diaRangeRead").textContent = String(diaCm);
    refreshCircleReadouts(); draw();
  });
  $("wrapBtn").addEventListener("click", function () {
    lastTape = circleMeas().circ;
    refreshCircleReadouts(); draw();
  });

  var objSel = $("objSel");
  Object.keys(M.COINS).concat(Object.keys(M.OBJECTS)).forEach(function (k) {
    var label = M.COINS[k] ? M.COINS[k].label + " (coin)" : M.OBJECTS[k].label;
    objSel.appendChild(LS.ui.el("option", { value: k, text: label }));
  });
  objSel.value = objKey;
  objSel.addEventListener("change", function () {
    objKey = objSel.value;
    setDistSlider(distNow());
    refresh(); draw();
  });

  var distRange = $("distRange");
  function isLogScale(key) { return !M.COINS[key]; }
  function sliderPos(d) {
    var def = objDef();
    var f = isLogScale(objKey)
      ? Math.log(d / def.lo) / Math.log(def.hi / def.lo)
      : (d - def.lo) / (def.hi - def.lo);
    return String(Math.round(U.clamp(f, 0, 1) * 1000));
  }
  function setDistSlider(d) {
    distByObj[objKey] = U.clamp(d, objDef().lo, objDef().hi);
    distRange.value = sliderPos(distByObj[objKey]);
    $("distRangeRead").textContent = fmtNum(distByObj[objKey], objDef().unit === "m" ? 2 : 1) +
      " " + objDef().unit;
  }
  // planets ride a log slider (their range spans factors of ten), coins linear
  distRange.addEventListener("input", function (e) {
    var def = objDef();
    var f = parseFloat(e.target.value) / 1000;
    var d = isLogScale(objKey) ? def.lo * Math.pow(def.hi / def.lo, f)
      : def.lo + (def.hi - def.lo) * f;
    distByObj[objKey] = d;
    $("distRangeRead").textContent = fmtNum(d, def.unit === "m" ? 2 : 1) + " " + def.unit;
    refresh(); draw();
  });

  Array.prototype.forEach.call(document.querySelectorAll(".preset"), function (b) {
    b.addEventListener("click", function () {
      objKey = b.getAttribute("data-obj");
      objSel.value = objKey;
      var d = distNow();
      if (b.getAttribute("data-arm") !== null) d = M.ARM_LENGTH_M;
      else if (b.getAttribute("data-dist") !== null) d = parseFloat(b.getAttribute("data-dist"));
      setDistSlider(d);
      refresh(); draw();
    });
  });

  // ---------- logs ----------
  var CIRCLE_HEADER = ["diameter_cm", "circumference_cm", "pi_measured"];
  var ANGLE_HEADER = ["object", "true_diam", "distance", "dist_unit", "angular_diam_deg"];
  function loadRows(name) {
    try {
      var s = LS.store.load(LAB, name);
      return (s && s.rows) ? s.rows : [];
    } catch (e) { return []; }
  }
  var circRows = loadRows("circle"), angRows = loadRows("angle");

  function renderLogs() {
    $("circTable").innerHTML = circRows.length
      ? LS.store.tableHTML(["diameter (cm)", "circumference (cm)", "pi measured"], circRows)
      : "<p class='muted'>Nothing logged yet. Measure a few circles of different " +
        "size: pi should refuse to change.</p>";
    $("angTable").innerHTML = angRows.length
      ? LS.store.tableHTML(["object", "true diameter", "distance", "unit",
        "angular diam (deg)"], angRows)
      : "<p class='muted'>Nothing logged yet. Park a few objects and log them; the " +
        "far end of the list is where the small-angle formula earns its keep.</p>";
  }
  $("circAdd").addEventListener("click", function () {
    var m = circleMeas();
    circRows.push([U.round(m.dia, 1), U.round(m.circ, 1), U.round(m.pi, 4)]);
    LS.store.save(LAB, "circle", CIRCLE_HEADER, circRows);
    renderLogs();
  });
  $("angAdd").addEventListener("click", function () {
    var m = angleMeas(), def = m.def;
    angRows.push([def.label, def.d, U.round(toCalcDist(def, m.dist), 3),
      def.calcUnit, U.round(m.angDeg, 6)]);
    LS.store.save(LAB, "angle", ANGLE_HEADER, angRows);
    renderLogs();
  });
  $("circCsv").addEventListener("click", function () {
    LS.store.exportCSV("lab2-circle-pi.csv", CIRCLE_HEADER, circRows, $("csvFallback"));
  });
  $("angCsv").addEventListener("click", function () {
    LS.store.exportCSV("lab2-small-angle.csv", ANGLE_HEADER, angRows, $("csvFallback"));
  });
  $("logClear").addEventListener("click", function () {
    circRows = []; angRows = [];
    LS.store.save(LAB, "circle", CIRCLE_HEADER, circRows);
    LS.store.save(LAB, "angle", ANGLE_HEADER, angRows);
    $("csvFallback").style.display = "none";
    renderLogs();
  });

  // ---------- boot ----------
  function resizeStages() {
    var w = Math.round(Math.max(300, (stage.clientWidth || 480)) * dpr);
    stage.width = w; stage.height = Math.round(CIRCLE_H * dpr);
    stage2.width = w; stage2.height = Math.round(ANGLE_H * dpr);
    draw();
  }
  window.addEventListener("resize", resizeStages);
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (mm) {
    mode = mm; refresh(); draw();
  });
  LS.check.init(LAB);
  $("diaRangeRead").textContent = String(diaCm);
  setDistSlider(distNow());
  renderLogs();
  refresh();
  resizeStages();
})();
