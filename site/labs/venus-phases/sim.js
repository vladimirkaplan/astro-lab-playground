// Phases of Venus sim. Top-down Sun-centred view (north up, Earth fixed at the
// right on the 1 AU circle, Venus on the 0.723 circle, th measured
// counterclockwise from the Earth direction = east), plus an Earth's-eye inset
// whose disk carries a real terminator and a radius that tracks the true
// apparent diameter. The Ptolemaic toggle draws the rival prediction next to it:
// never past half lit, never any bigger.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units, V = LS.venus;
  var LAB = "venus-phases";
  var $ = function (id) { return document.getElementById(id); };

  var mode = LS.ui.getMode(LAB);
  var th = 43.7;
  var ptoOn = false;
  var running = false, rafId = null;

  var stage = $("stage"), sctx = stage.getContext("2d");
  var dpr = window.devicePixelRatio || 1;
  var STAGE_H = 400;
  var RAD = Math.PI / 180;
  var INSET_SCALE = 0.62;          // px of inset radius per arcsec of apparent diameter
  var INSET_R_MAX = 37, INSET_R_MIN = 4;
  var TAG = "  (eye/instrument estimate)";

  function norm(a) {
    var e = ((a % 360) + 360) % 360;
    return e > 180 ? e - 360 : e;
  }

  // Deterministic instrument wiggle for Fun Mode: same position, same reading.
  function meas() {
    if (mode !== "fun") {
      return {
        elong: V.elongation(th), illum: V.illum(th),
        diam: V.apparentDiamArcsec(th), dist: V.distEV(th), tag: ""
      };
    }
    var r = U.mulberry32(Math.round(th * 2) + 0x5EED);
    return {
      elong: V.elongation(th) + (r() - 0.5) * 1.0,
      illum: U.clamp(V.illum(th) + (r() - 0.5) * 4, 0, 100),
      diam: Math.max(0.5, V.apparentDiamArcsec(th) + (r() - 0.5) * 2),
      dist: Math.max(0.05, V.distEV(th) + (r() - 0.5) * 0.02),
      tag: TAG
    };
  }

  // ---------- stage ----------
  function draw() {
    var w = stage.width / dpr, h = STAGE_H;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, w, h);
    sctx.fillStyle = "#0d1526";
    sctx.fillRect(0, 0, w, h);

    var cx = w * 0.40, cy = h * 0.52, R = Math.min(w, h) * 0.30;
    var rv = R * V.A;
    var t = th * RAD;
    var ex = cx + R, ey = cy;                              // Earth at (1, 0) AU
    var vx = cx + rv * Math.cos(t), vy = cy - rv * Math.sin(t);   // screen y is flipped
    var m = meas();

    // orbits
    sctx.strokeStyle = "#3c4f73"; sctx.lineWidth = 1.2;
    sctx.setLineDash([4, 5]);
    sctx.beginPath(); sctx.arc(cx, cy, R, 0, 6.29); sctx.stroke();
    sctx.strokeStyle = "#4a6392";
    sctx.beginPath(); sctx.arc(cx, cy, rv, 0, 6.29); sctx.stroke();
    sctx.setLineDash([]);

    // Sun with radial rays (sunlight comes from the centre in this view)
    var grad = sctx.createRadialGradient(cx, cy, 5, cx, cy, 58);
    grad.addColorStop(0, "#ffe9a3"); grad.addColorStop(1, "rgba(255,180,40,0)");
    sctx.fillStyle = grad;
    sctx.beginPath(); sctx.arc(cx, cy, 58, 0, 6.29); sctx.fill();
    sctx.strokeStyle = "rgba(255,215,110,.5)"; sctx.lineWidth = 1.2;
    for (var k = 0; k < 12; k++) {
      var a = k * Math.PI / 6;
      sctx.beginPath();
      sctx.moveTo(cx + 22 * Math.cos(a), cy + 22 * Math.sin(a));
      sctx.lineTo(cx + 38 * Math.cos(a), cy + 38 * Math.sin(a));
      sctx.stroke();
    }
    sctx.fillStyle = "#ffd76e";
    sctx.beginPath(); sctx.arc(cx, cy, 15, 0, 6.29); sctx.fill();
    sctx.fillStyle = "#93a7cd"; sctx.font = "11px system-ui, sans-serif";
    sctx.textAlign = "center";
    sctx.fillText("Sun", cx, cy + 30);

    // Earth-Sun reference line (one arm of the elongation angle)
    sctx.strokeStyle = "rgba(255,215,110,.35)"; sctx.lineWidth = 1.2;
    sctx.beginPath(); sctx.moveTo(cx, cy); sctx.lineTo(ex, ey); sctx.stroke();

    // Earth's line of sight to Venus, and the elongation wedge at Earth
    sctx.strokeStyle = "#8fa4c9"; sctx.setLineDash([3, 4]); sctx.lineWidth = 1.2;
    sctx.beginPath(); sctx.moveTo(ex, ey); sctx.lineTo(vx, vy); sctx.stroke();
    sctx.setLineDash([]);
    var eRad = V.elongation(th) * RAD;
    if (Math.abs(eRad) > 0.01) {
      sctx.strokeStyle = "#9fd0ff"; sctx.lineWidth = 2;
      sctx.beginPath();
      sctx.arc(ex, ey, 30, Math.PI, Math.PI + eRad, eRad < 0);
      sctx.stroke();
      var mid = Math.PI + eRad / 2;
      sctx.fillStyle = "#9fd0ff"; sctx.font = "11px system-ui, sans-serif";
      sctx.fillText(Math.abs(m.elong).toFixed(1) + " deg",
        ex + 52 * Math.cos(mid), ey + 52 * Math.sin(mid));
    }

    // Venus from above: the lit half always faces the Sun
    var vr = 9;
    var toSun = Math.atan2(cy - vy, cx - vx);
    sctx.save();
    sctx.beginPath(); sctx.arc(vx, vy, vr, 0, 6.29); sctx.clip();
    sctx.fillStyle = "#232c3d"; sctx.fillRect(vx - vr, vy - vr, vr * 2, vr * 2);
    sctx.translate(vx, vy); sctx.rotate(toSun);
    sctx.fillStyle = "#f2e3b3"; sctx.fillRect(0, -vr, vr, vr * 2);
    sctx.restore();
    sctx.strokeStyle = "#66799e"; sctx.lineWidth = 1.5;
    sctx.beginPath(); sctx.arc(vx, vy, vr, 0, 6.29); sctx.stroke();
    sctx.fillStyle = "#a8bad9"; sctx.font = "10.5px system-ui, sans-serif";
    sctx.textAlign = "center";
    sctx.fillText("Venus (top view)", vx, vy - vr - 7);

    // Earth
    sctx.fillStyle = "#2e6db4";
    sctx.beginPath(); sctx.arc(ex, ey, 11, 0, 6.29); sctx.fill();
    sctx.fillStyle = "#9fd0ff"; sctx.font = "11px system-ui, sans-serif";
    sctx.fillText("Earth", ex, ey + 25);
    sctx.fillStyle = "#6d7fa3"; sctx.font = "10px system-ui, sans-serif";
    sctx.textAlign = "left";
    sctx.fillText("north up", 10, 16);
    sctx.fillText("orbits not to scale with the disks", 10, STAGE_H - 12);

    // ---- insets: what the telescope shows, and what Ptolemy says it should show ----
    var boxW = 124, boxH = 122;
    var xA = w - boxW / 2 - 10, yA = boxH / 2 + 8;
    var stacked = w < boxW * 2 + 26;
    var xB = stacked ? xA : xA - boxW - 6;
    var yB = stacked ? yA + boxH + 8 : yA;

    var rTrue = U.clamp(m.diam * INSET_SCALE, INSET_R_MIN, INSET_R_MAX);
    inset(xA, yA, boxW, boxH, "Seen from Earth", rTrue, m.illum / 100,
      m.diam.toFixed(1) + " arcsec, " + m.illum.toFixed(1) + "% lit");
    if (ptoOn) {
      var rPto = U.clamp(V.ptoApparentDiamArcsec(th) * INSET_SCALE, INSET_R_MIN, INSET_R_MAX);
      inset(xB, yB, boxW, boxH, "Ptolemy predicts", rPto, V.ptoLeansIllum(th) / 100,
        U.round(V.ptoApparentDiamArcsec(th), 1) + " arcsec, " +
        U.round(V.ptoLeansIllum(th), 1) + "% lit (never past half)");
    }

    readouts(m);
  }

  // Lit fraction k as a half-disk plus a half-ellipse of width |1 - 2k|; the
  // bright limb points at the Sun dot on the right of the box.
  function inset(x, y, boxW, boxH, title, ir, k, sub) {
    sctx.fillStyle = "rgba(13,21,38,.93)";
    sctx.strokeStyle = "#3c4f73"; sctx.lineWidth = 1;
    roundRect(sctx, x - boxW / 2, y - boxH / 2, boxW, boxH, 10);
    sctx.fill(); sctx.stroke();
    sctx.fillStyle = "#93a7cd"; sctx.font = "10.5px system-ui, sans-serif";
    sctx.textAlign = "center";
    sctx.fillText(title, x, y - boxH / 2 + 15);

    var iy = y + 4;
    sctx.fillStyle = "#1b2434";
    sctx.beginPath(); sctx.arc(x, iy, ir, 0, 6.29); sctx.fill();
    if (k > 0.004) {
      var rx = ir * Math.abs(2 * k - 1);
      sctx.save();
      sctx.beginPath(); sctx.arc(x, iy, ir, 0, 6.29); sctx.clip();
      sctx.fillStyle = "#f4e6b8";
      sctx.beginPath();
      sctx.moveTo(x, iy - ir);
      sctx.arc(x, iy, ir, -Math.PI / 2, Math.PI / 2, false);
      sctx.ellipse(x, iy, rx, ir, 0, Math.PI / 2, -Math.PI / 2, k < 0.5);
      sctx.closePath();
      sctx.fill();
      sctx.restore();
      sctx.fillStyle = "#ffd76e";
      sctx.beginPath(); sctx.arc(x + ir + 6, iy, 3.4, 0, 6.29); sctx.fill();
    }
    sctx.strokeStyle = "#66799e"; sctx.lineWidth = 1.5;
    sctx.beginPath(); sctx.arc(x, iy, ir, 0, 6.29); sctx.stroke();
    sctx.fillStyle = "#93a7cd"; sctx.font = "9.8px system-ui, sans-serif";
    sctx.fillText(sub, x, y + boxH / 2 - 10);
  }

  function readouts(m) {
    var lbl = V.elongLabel(th);
    $("phaseRead").textContent = V.name(th) + " phase, " + m.illum.toFixed(1) +
      "% lit  |  " + (lbl || (Math.abs(th) > 90 ?
        "behind the Sun, in its glare" : "between Earth and the Sun, in its glare")) + m.tag;
    var side = m.elong > 0.05 ? "east of the Sun (evening sky)" :
      m.elong < -0.05 ? "west of the Sun (morning sky)" :
        "on the Sun line, so it rises and sets with the Sun";
    var eV = Math.abs(m.elong) < 0.05 ? 0 : m.elong;
    $("elongRead").textContent = (eV >= 0 ? "+" : "") + eV.toFixed(1) +
      " deg " + side + m.tag;
    var ratio = m.diam / V.apparentDiamArcsec(180);
    $("sizeRead").textContent = m.diam.toFixed(1) + " arcsec across  |  " +
      ratio.toFixed(1) + "x wider than at superior conjunction" + m.tag;
    $("distRead").textContent = m.dist.toFixed(3) + " AU from Earth  |  " +
      "this geometry runs 0.277 AU nearest to 1.723 AU farthest" + m.tag;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---------- controls ----------
  function setTheta(v) {
    th = norm(v);
    $("thetaRange").value = String(th);
    $("thetaRead").textContent = String(U.round(th, 1));
    draw();
  }
  $("thetaRange").addEventListener("input", function (e) {
    th = parseFloat(e.target.value);
    $("thetaRead").textContent = String(U.round(th, 1));
    draw();
  });
  Array.prototype.forEach.call(document.querySelectorAll(".preset"), function (b) {
    b.addEventListener("click", function () {
      if (running) return;
      setTheta(parseFloat(b.getAttribute("data-th")));
    });
  });

  $("ptoBtn").addEventListener("click", function () {
    ptoOn = !ptoOn;
    $("ptoBtn").textContent = "Ptolemaic prediction: " + (ptoOn ? "ON" : "OFF");
    $("ptoBtn").className = "action" + (ptoOn ? "" : " ghost");
    draw();
  });

  // ---------- one full cycle ----------
  $("runBtn").addEventListener("click", function () {
    if (running) return;                       // never stack two runs
    running = true;
    $("runBtn").disabled = true;
    $("runBtn").textContent = "Running one cycle...";
    var start = th, t0 = null, DUR = 12000;
    function step(now) {
      if (t0 === null) t0 = now;
      var f = Math.min(1, (now - t0) / DUR);
      setTheta(start + 360 * f);
      if (f < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        rafId = null;
        running = false;
        $("runBtn").disabled = false;
        $("runBtn").textContent = "Run one cycle";
      }
    }
    rafId = requestAnimationFrame(step);
  });

  // ---------- observing log ----------
  var HEADER = ["theta_deg", "elongation_deg", "illum_percent",
    "apparent_diam_arcsec", "dist_Earth_Venus_AU", "phase"];
  var rows = [];
  try {
    var saved = LS.store.load(LAB, "log");
    if (saved && saved.rows) rows = saved.rows;
  } catch (e) {}

  function renderLog() {
    if (!rows.length) {
      $("logTable").innerHTML = "<p class='muted'>Nothing logged yet. Park Venus " +
        "somewhere interesting and press Log this position; the table survives a reload.</p>";
      return;
    }
    $("logTable").innerHTML = LS.store.tableHTML(
      ["theta (deg)", "elongation (deg)", "lit (%)", "apparent diam (arcsec)",
        "distance (AU)", "phase"], rows);
  }
  $("logAdd").addEventListener("click", function () {
    var m = meas();
    rows.push([U.round(th, 1), m.elong.toFixed(1), m.illum.toFixed(1),
      m.diam.toFixed(1), m.dist.toFixed(3), V.name(th)]);
    LS.store.save(LAB, "log", HEADER, rows);
    renderLog();
  });
  $("logCsv").addEventListener("click", function () {
    LS.store.exportCSV("venus-phases-log.csv", HEADER, rows, $("csvFallback"));
  });
  $("logClear").addEventListener("click", function () {
    rows = [];
    LS.store.save(LAB, "log", HEADER, rows);
    $("csvFallback").style.display = "none";
    renderLog();
  });

  // ---------- boot ----------
  function resizeStage() {
    stage.width = Math.round(Math.max(300, stage.clientWidth || 480) * dpr);
    stage.height = Math.round(STAGE_H * dpr);
    draw();
  }
  window.addEventListener("resize", resizeStage);
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (mm) { mode = mm; draw(); });
  LS.check.init(LAB);
  $("thetaRead").textContent = String(U.round(th, 1));
  $("thetaRange").value = String(th);
  renderLog();
  resizeStage();
})();
