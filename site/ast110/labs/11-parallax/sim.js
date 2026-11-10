// Heliocentric parallax lab sim. Bench 1 animates a star's yearly parallactic
// ellipse on a protractor-style sky grid: sliders set the parallax and the
// ecliptic latitude so the student can watch sin(beta) squash the ellipse into
// a line, with a Sun-Earth inset showing the moving viewpoint that causes it.
// Bench 2 is "Be Bessel": a hidden target star, click-to-measure reticle on the
// January and July nights, p = shift/2, distance = 1000/p, graded against the
// catalog. All physics comes from LS.parallax; Fun Mode adds seeded 1.5 mas
// instrument jitter to drawn positions and readings.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units, P = LS.parallax;
  var LAB = "11-parallax";
  var $ = function (id) { return document.getElementById(id); };

  var mode = LS.ui.getMode(LAB);
  var JITTER = 1.5;                       // mas of seeded instrument noise
  var dpr = window.devicePixelRatio || 1;
  var SH = 440, FH = 340;

  var stage = $("stage"), sctx = stage.getContext("2d");
  var field = $("field"), fctx = field.getContext("2d");

  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function jitter(seed, scale) {
    return (U.mulberry32(seed)() - 0.5) * 2 * scale;
  }
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MSTART = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  function dateLabel(day) {
    var d = Math.round(day);
    var m = 11;
    for (var i = 0; i < 12; i++) if (d > MSTART[i]) m = i;
    return MONTHS[m] + " " + (d - MSTART[m]);
  }
  function mas(v, n) { return U.round(v, n === undefined ? 1 : n) + " mas"; }

  // ================= bench 1: watch the wobble =================
  function starByName(n) {
    for (var i = 0; i < P.CATALOG.length; i++) if (P.CATALOG[i].name === n) return P.CATALOG[i];
    return null;
  }
  var st = { star: starByName("Sirius A"), p: 374.49, beta: -40, day: 80 };
  var rafId = null;

  function benchLabel() {
    return st.star ? st.star.name + "  (p = " + st.star.mas + " mas, beta = " +
      st.star.betaDeg + " deg)" : "custom: p = " + st.p + " mas, beta = " + st.beta + " deg";
  }
  function benchJitter(scale) {
    if (mode !== "fun") return { e: 0, n: 0 };
    return {
      e: jitter(hashStr(benchLabel()) ^ Math.round(st.day) * 2654435761, scale),
      n: jitter(hashStr(benchLabel() + "/n") ^ Math.round(st.day) * 40503, scale)
    };
  }

  function drawSky() {
    var w = stage.width / dpr, h = SH;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, w, h);
    sctx.fillStyle = "#0d1526";
    sctx.fillRect(0, 0, w, h);

    var cx = w / 2, cy = h / 2;
    var R = Math.min(w, h) / 2 - 44;
    var span = st.p * 1.18;
    var ppm = R / span;                     // pixels per mas
    var step = span > 2600 ? 1000 : span > 1300 ? 400 : span > 650 ? 200 : span > 320 ? 100 : 50;

    // protractor grid: spokes every 30 deg, rings every step mas
    sctx.textAlign = "left"; sctx.textBaseline = "middle";
    sctx.font = "10px system-ui, sans-serif";
    for (var a = 0; a < 180; a += 30) {
      var rad = a * Math.PI / 180;
      sctx.strokeStyle = a === 0 ? "#33456b" : "#22304c";
      sctx.lineWidth = 1;
      sctx.beginPath();
      sctx.moveTo(cx - R * Math.cos(rad), cy + R * Math.sin(rad));
      sctx.lineTo(cx + R * Math.cos(rad), cy - R * Math.sin(rad));
      sctx.stroke();
    }
    for (var g = step; g <= span * 1.06; g += step) {
      sctx.strokeStyle = "#22304c"; sctx.lineWidth = 1;
      sctx.beginPath(); sctx.arc(cx, cy, g * ppm, 0, 6.29); sctx.stroke();
      sctx.fillStyle = "#6d7fa3";
      sctx.fillText(g >= 1000 ? g / 1000 + " arcsec" : String(g), cx + g * ppm + 3, cy - 5);
    }
    // axis labels
    sctx.fillStyle = "#8fa4c9"; sctx.font = "11px system-ui, sans-serif";
    sctx.textAlign = "center"; sctx.textBaseline = "bottom";
    sctx.fillText("east  + ecliptic longitude  ->", cx, h - 8);
    sctx.save();
    sctx.translate(12, cy); sctx.rotate(-Math.PI / 2);
    sctx.fillText("toward ecliptic north", 0, 0);
    sctx.restore();

    // the full yearly ellipse, faint guide
    sctx.strokeStyle = "rgba(159,208,255,.4)"; sctx.lineWidth = 1.4;
    sctx.setLineDash([5, 5]);
    sctx.beginPath();
    for (var d = 0; d <= 365.25; d += 4) {
      var wp = P.wobble(st.p, st.beta, d);
      var x = cx + wp.eastMas * ppm, y = cy - wp.northMas * ppm;
      if (d === 0) sctx.moveTo(x, y); else sctx.lineTo(x, y);
    }
    sctx.stroke();
    sctx.setLineDash([]);

    // bright trace walked so far this year
    sctx.strokeStyle = "#ffd76e"; sctx.lineWidth = 2;
    sctx.beginPath();
    for (var d2 = 1; d2 <= st.day; d2 += 3) {
      var wt = P.wobble(st.p, st.beta, d2);
      var xt = cx + wt.eastMas * ppm, yt = cy - wt.northMas * ppm;
      if (d2 === 1) sctx.moveTo(xt, yt); else sctx.lineTo(xt, yt);
    }
    sctx.stroke();

    // the star at the current day (drawn position carries Fun Mode jitter)
    var wNow = P.wobble(st.p, st.beta, st.day);
    var j = benchJitter(JITTER);
    var sx = cx + (wNow.eastMas + j.e) * ppm, sy = cy - (wNow.northMas + j.n) * ppm;
    if (mode === "fun") {
      sctx.strokeStyle = "rgba(255,120,120,.6)"; sctx.lineWidth = 1;
      sctx.beginPath();
      sctx.moveTo(cx + wNow.eastMas * ppm, cy - wNow.northMas * ppm);
      sctx.lineTo(sx, sy); sctx.stroke();
    }
    sctx.beginPath(); sctx.arc(sx, sy, 6, 0, 6.29);
    sctx.fillStyle = "#cfe0ff"; sctx.fill();
    sctx.strokeStyle = "#0d1526"; sctx.lineWidth = 1.6; sctx.stroke();

    inset(w);

    sctx.fillStyle = "#cfe0ff"; sctx.font = "12px system-ui, sans-serif";
    sctx.textAlign = "left"; sctx.textBaseline = "top";
    sctx.fillText(benchLabel(), 12, 12);
    sctx.fillStyle = mode === "fun" ? "#ff9c9c" : "#6d7fa3";
    sctx.font = "10.5px system-ui, sans-serif";
    sctx.fillText(mode === "fun" ? "Fun Mode: +/- 1.5 mas instrument jitter on the drawn position" :
      "Ideal Mode: exact model position", 12, 28);
  }

  // Sun-Earth inset: the moving viewpoint that causes the wobble
  function inset(w) {
    var bw = 128, bh = 128, bx = w - bw - 10, by = 10;
    sctx.fillStyle = "rgba(9,14,26,.88)";
    sctx.fillRect(bx, by, bw, bh);
    sctx.strokeStyle = "#33456b"; sctx.lineWidth = 1;
    sctx.strokeRect(bx, by, bw, bh);
    var cxI = bx + 50, cyI = by + bh / 2, orbit = 30;
    sctx.strokeStyle = "#3a4d78";
    sctx.beginPath(); sctx.arc(cxI, cyI, orbit, 0, 6.29); sctx.stroke();
    sctx.fillStyle = "#ffd76e";
    sctx.beginPath(); sctx.arc(cxI, cyI, 5, 0, 6.29); sctx.fill();
    var thetaE = Math.PI + 2 * Math.PI * (st.day - P.EQUINOX_DAY) / P.YEAR_DAYS;
    var ex = cxI + orbit * Math.cos(thetaE), ey = cyI - orbit * Math.sin(thetaE);
    // sight lines to the (fixed) star pinned at the box edge
    var sxp = bx + bw - 12, syp = cyI;
    sctx.strokeStyle = "rgba(207,224,255,.45)"; sctx.setLineDash([3, 3]);
    sctx.beginPath(); sctx.moveTo(cxI, cyI); sctx.lineTo(sxp, syp); sctx.stroke();
    sctx.setLineDash([]);
    sctx.strokeStyle = "#ffd76e";
    sctx.beginPath(); sctx.moveTo(ex, ey); sctx.lineTo(sxp, syp); sctx.stroke();
    sctx.fillStyle = "#cfe0ff";
    sctx.beginPath(); sctx.arc(sxp, syp, 3, 0, 6.29); sctx.fill();
    sctx.fillStyle = "#7fd0ff";
    sctx.beginPath(); sctx.arc(ex, ey, 4, 0, 6.29); sctx.fill();
    sctx.fillStyle = "#8fa4c9"; sctx.font = "9.5px system-ui, sans-serif";
    sctx.textAlign = "left"; sctx.textBaseline = "top";
    sctx.fillText("Sun", cxI - 7, cyI + 7);
    sctx.fillText("Earth day " + Math.round(st.day), bx + 8, by + 6);
    sctx.fillText("star", sxp - 8, syp + 7);
    sctx.fillStyle = "#6d7fa3";
    sctx.fillText("orbit not to scale", bx + 8, by + bh - 14);
  }

  function benchReadouts() {
    var w0 = P.wobble(st.p, st.beta, st.day);
    var j = benchJitter(JITTER);
    var tag = mode === "fun" ? "   (includes instrument jitter)" : "";
    var orbitDeg = U.round(((st.day - P.EQUINOX_DAY) / P.YEAR_DAYS * 360) % 360, 0);
    $("rDay").textContent = "Day " + Math.round(st.day) + " (" + dateLabel(st.day) + ")  |  " +
      ((orbitDeg + 360) % 360) + " deg past the March equinox";
    $("rEast").textContent = mas(w0.eastMas + j.e) + " east of mean" + tag;
    $("rNorth").textContent = mas(w0.northMas + j.n) + " north of mean" + tag;
    var sb = Math.abs(Math.sin(st.beta * Math.PI / 180));
    var minor = st.p * sb;
    var shape;
    if (Math.abs(st.beta) === 90) {
      shape = "perfect circle of radius p: beta = " + st.beta + " deg is the ecliptic pole";
    } else if (st.beta === 0) {
      shape = "collapsed to a straight line: beta = 0 puts the star ON the ecliptic, " +
        "semi-minor = p sin(0) = 0, so it only rocks east-west";
    } else {
      shape = "ellipse: semi-major " + mas(st.p) + " x semi-minor " + mas(minor) +
        "  |  ratio " + U.round(sb, 3) + " = |sin(" + st.beta + " deg)|";
    }
    $("rShape").textContent = shape + "  |  1000/p = " +
      U.round(P.distancePc(st.p), 2) + " pc = " + U.round(P.distanceLy(st.p), 2) + " ly";
  }

  function setBench(p, beta, star) {
    st.p = U.clamp(p, 50, 800);
    st.beta = Math.round(U.clamp(beta, -90, 90));
    st.star = star || null;
    $("betaRange").value = String(st.beta);
    $("pRange").value = String(st.p);
    $("betaRead").textContent = String(st.beta);
    $("pRead").textContent = String(U.round(st.p, 2));
    drawAll();
  }
  $("betaRange").addEventListener("input", function (e) {
    setBench(st.p, parseFloat(e.target.value),
      st.star && parseFloat(e.target.value) === st.star.betaDeg ? st.star : null);
  });
  $("pRange").addEventListener("input", function (e) {
    setBench(parseFloat(e.target.value), st.beta,
      st.star && parseFloat(e.target.value) === st.star.mas ? st.star : null);
  });
  $("dayRange").addEventListener("input", function (e) {
    stopRun();
    st.day = parseInt(e.target.value, 10);
    $("dayRead").textContent = String(st.day);
    drawAll();
  });
  Array.prototype.forEach.call(document.querySelectorAll(".preset"), function (b) {
    b.addEventListener("click", function () {
      var s = starByName(b.getAttribute("data-star"));
      if (!s) return;
      stopRun();
      st.day = parseInt($("dayRange").value, 10);
      setBench(s.mas, s.betaDeg, s);
    });
  });

  function stopRun() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    $("runBtn").disabled = false;
    $("runBtn").textContent = "Run one year";
  }
  $("runBtn").addEventListener("click", function () {
    stopRun();
    $("runBtn").disabled = true;
    $("runBtn").textContent = "Running one year...";
    var t0 = performance.now(), dur = 6000;
    function step(now) {
      var f = Math.min(1, (now - t0) / dur);
      st.day = 1 + f * 364.25;
      $("dayRange").value = String(Math.round(st.day));
      $("dayRead").textContent = String(Math.round(st.day));
      drawAll();
      if (f < 1) rafId = requestAnimationFrame(step);
      else stopRun();
    }
    rafId = requestAnimationFrame(step);
  });

  // ================= bench 2: be Bessel =================
  var b2 = {
    order: (function () {
      var o = P.CATALOG.map(function (_, i) { return i; });
      var r = U.mulberry32(0x5EEDB2);
      for (var i = o.length - 1; i > 0; i--) {
        var jx = Math.floor(r() * (i + 1)), t = o[i]; o[i] = o[jx]; o[jx] = t;
      }
      return o;
    })(),
    idx: -1, star: null, label: "",
    jan: null, jul: null, night: 1, done: false, msg: ""
  };
  var refsCache = {};

  function targetRefs() {
    if (!refsCache[b2.label]) {
      var r = U.mulberry32(hashStr("refs" + b2.label));
      var list = [];
      for (var i = 0; i < 8; i++) {
        var fy = (0.32 + 0.5 * r()) * (r() < 0.5 ? -1 : 1);
        list.push({ fx: (r() * 2 - 1) * 0.88, fy: fy });
      }
      refsCache[b2.label] = list;
    }
    return refsCache[b2.label];
  }
  function shownX(star, night) {
    var base = night === 1 ? star.mas : -star.mas;
    if (mode !== "fun") return base;
    return base + jitter(hashStr(star.name) + night * 7919, JITTER);
  }

  function drawField() {
    var w = field.width / dpr, h = FH;
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fctx.clearRect(0, 0, w, h);
    fctx.fillStyle = "#0d1526";
    fctx.fillRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2;

    if (!b2.star) {
      fctx.fillStyle = "#8fa4c9"; fctx.font = "13px system-ui, sans-serif";
      fctx.textAlign = "center"; fctx.textBaseline = "middle";
      fctx.fillText("Press \"Draw a hidden target\" to begin.", cx, cy);
      return;
    }
    var viewHalf = b2.star.mas * 1.5 + 150;
    var ppm = (w / 2 - 36) / viewHalf;
    var step = viewHalf > 1200 ? 500 : viewHalf > 650 ? 200 : viewHalf > 350 ? 100 : 50;

    // mas grid with labels, and the zero line
    fctx.font = "10px system-ui, sans-serif";
    fctx.textAlign = "center"; fctx.textBaseline = "top";
    for (var g = -Math.floor(viewHalf / step) * step; g <= viewHalf; g += step) {
      var x = cx + g * ppm;
      fctx.strokeStyle = g === 0 ? "#33456b" : "#22304c";
      fctx.lineWidth = 1;
      fctx.beginPath(); fctx.moveTo(x, 16); fctx.lineTo(x, h - 18); fctx.stroke();
      fctx.fillStyle = g === 0 ? "#8fa4c9" : "#6d7fa3";
      fctx.fillText(String(g), x, h - 15);
    }
    fctx.fillStyle = "#8fa4c9"; fctx.textAlign = "left"; fctx.textBaseline = "top";
    fctx.fillText("east offset (mas)   night: " +
      (b2.night === 1 ? "January (target far east)" : "July (target far west)"), 10, 5);
    if (mode === "fun") {
      fctx.fillStyle = "#ff9c9c";
      fctx.fillText("instrument noise active: positions wobble by ~1.5 mas", 10, 18);
    }

    // distant reference stars: they do not parallax
    targetRefs().forEach(function (rf, i) {
      var jx = mode === "fun" ? jitter(hashStr(b2.label + i), 1) : 0;
      var jy = mode === "fun" ? jitter(hashStr(b2.label + i + "y"), 1) : 0;
      var rx = cx + (rf.fx * viewHalf + jx) * ppm;
      var ry = cy + rf.fy * (h / 2 - 30) + jy;
      fctx.beginPath(); fctx.arc(rx, ry, 2.4, 0, 6.29);
      fctx.fillStyle = "#5f739c"; fctx.fill();
      fctx.strokeStyle = "rgba(143,164,201,.35)";
      fctx.beginPath(); fctx.arc(rx, ry, 4.6, 0, 6.29); fctx.stroke();
    });

    // the target: bright dot with the reticle ring
    var tx = cx + shownX(b2.star, b2.night) * ppm, ty = cy;
    fctx.beginPath(); fctx.arc(tx, ty, 5, 0, 6.29);
    fctx.fillStyle = "#ffe9a8"; fctx.fill();
    fctx.strokeStyle = "rgba(255,233,168,.8)"; fctx.lineWidth = 1.4;
    fctx.beginPath(); fctx.arc(tx, ty, 11, 0, 6.29); fctx.stroke();
    fctx.beginPath();
    fctx.moveTo(tx - 16, ty); fctx.lineTo(tx - 11, ty);
    fctx.moveTo(tx + 11, ty); fctx.lineTo(tx + 16, ty);
    fctx.moveTo(tx, ty - 16); fctx.lineTo(tx, ty - 11);
    fctx.moveTo(tx, ty + 11); fctx.lineTo(tx, ty + 16);
    fctx.stroke();

    if (b2.msg) {
      fctx.fillStyle = "#ffd76e"; fctx.font = "12px system-ui, sans-serif";
      fctx.textAlign = "right"; fctx.textBaseline = "top";
      fctx.fillText(b2.msg, w - 12, 5);
    }
  }

  function b2Readouts() {
    var tag = mode === "fun" ? "   (noisy reading)" : "";
    $("rJan").textContent = b2.jan === null ? "-" : mas(b2.jan) + tag;
    $("rJul").textContent = b2.jul === null ? "-" : mas(b2.jul) + tag;
    if (b2.jan !== null && b2.jul !== null) {
      var shift = Math.abs(b2.jan - b2.jul), pMeas = shift / 2;
      $("rShift").textContent = mas(shift) + "  (the January-to-July sweep across 2 AU)";
      $("rP").textContent = mas(pMeas) + "  = shift / 2";
      $("rDist").textContent = U.round(1000 / pMeas, 2) + " pc  = 1000 / p  = " +
        U.round(P.distanceLy(pMeas), 2) + " ly";
      $("checkBtn").disabled = b2.done;
    } else {
      $("rShift").textContent = $("rP").textContent = $("rDist").textContent = "-";
      $("checkBtn").disabled = true;
    }
  }

  $("newTargetBtn").addEventListener("click", function () {
    b2.idx = (b2.idx + 1) % b2.order.length;
    b2.star = P.CATALOG[b2.order[b2.idx]];
    b2.label = String.fromCharCode(65 + b2.idx);
    b2.jan = b2.jul = null;
    b2.night = 1; b2.done = false; b2.msg = "";
    $("night1Btn").disabled = false;
    $("night2Btn").disabled = false;
    $("rTarget").textContent = "Target " + b2.label + ": hidden until you check. " +
      "Click the bright target on each night to measure its east offset.";
    $("rVerdict").textContent = "-";
    night(1);
  });
  function night(n) {
    if (!b2.star) return;
    b2.night = n;
    $("night1Btn").className = "action secondary" + (n === 1 ? "" : " ghost");
    $("night2Btn").className = "action secondary" + (n === 2 ? "" : " ghost");
    b2.msg = "";
    drawAll();
  }
  $("night1Btn").addEventListener("click", function () { night(1); });
  $("night2Btn").addEventListener("click", function () { night(2); });

  field.addEventListener("click", function (ev) {
    if (!b2.star || b2.done) return;
    var rect = field.getBoundingClientRect();
    var w = field.width / dpr, cx = w / 2, ppm = (w / 2 - 36) / (b2.star.mas * 1.5 + 150);
    var px = ev.clientX - rect.left, py = ev.clientY - rect.top;
    var tx = cx + shownX(b2.star, b2.night) * ppm, ty = FH / 2;
    if (Math.abs(px - tx) > 15 || Math.abs(py - ty) > 15) {
      b2.msg = "That was not the target - click the bright starred dot.";
      drawAll();
      return;
    }
    var reading = U.round((px - cx) / ppm, 1);
    if (b2.night === 1) { b2.jan = reading; night(2); b2.msg = "January reading logged: " + reading + " mas. Take the July night."; }
    else { b2.jul = reading; drawAll(); b2.msg = "July reading logged: " + reading + " mas. Check your distance."; }
    b2Readouts();
    drawAll();
  });

  $("checkBtn").addEventListener("click", function () {
    if (!b2.star || b2.jan === null || b2.jul === null) return;
    var shift = Math.abs(b2.jan - b2.jul), pMeas = shift / 2;
    var dMeas = 1000 / pMeas, dTrue = P.distancePc(b2.star.mas);
    var err = U.percentError(dMeas, dTrue);
    $("rTarget").textContent = "Target " + b2.label + " is " + b2.star.name +
      ": catalog p = " + b2.star.mas + " mas, distance = " + U.round(dTrue, 3) +
      " pc (" + U.round(P.distanceLy(b2.star.mas), 2) + " ly).";
    $("rVerdict").textContent = err <= 5 ?
      "Within " + U.round(err, 1) + "% of the catalog value. Bessel would nod at that reduction." :
      err <= 12 ?
        "Within " + U.round(err, 1) + "%. A solid reduction for one pair of nights - try another target." :
        "Off by " + U.round(err, 1) + "%: p = shift/2 and d = 1000/p, check the halves and the units, then redraw.";
    b2.done = true;
    rows.push([b2.label, b2.star.name, b2.jan, b2.jul,
      U.round(shift, 1), U.round(pMeas, 1), U.round(dMeas, 3), U.round(dTrue, 3), U.round(err, 1)]);
    LS.store.save(LAB, "log", HEADER, rows);
    renderLog();
    b2Readouts();
    drawAll();
  });

  // ================= log =================
  var HEADER = ["target", "star", "jan_mas", "jul_mas", "shift_mas",
    "p_mas", "distance_pc", "catalog_pc", "error_pct"];
  var rows = [];
  try {
    var saved = LS.store.load(LAB, "log");
    if (saved && saved.rows) rows = saved.rows;
  } catch (e) {}

  function renderLog() {
    if (!rows.length) {
      $("logTable").innerHTML = "<p class='muted'>Nothing logged yet. Every checked " +
        "target lands here: your readings, your p, your distance, and the catalog truth. " +
        "The table survives a reload, and CSV export gives you the reduction sheet you " +
        "would hand in on paper.</p>";
      return;
    }
    $("logTable").innerHTML = LS.store.tableHTML(
      ["target", "star", "Jan reading (mas)", "Jul reading (mas)", "shift = 2p (mas)",
        "p measured (mas)", "distance (pc)", "catalog (pc)", "error %"], rows);
  }
  $("logCsv").addEventListener("click", function () {
    LS.store.exportCSV("parallax-log.csv", HEADER, rows, $("csvFallback"));
  });
  $("logClear").addEventListener("click", function () {
    rows = [];
    LS.store.save(LAB, "log", HEADER, rows);
    $("csvFallback").style.display = "none";
    renderLog();
  });

  // ================= boot =================
  function drawAll() {
    drawSky();
    benchReadouts();
    drawField();
    b2Readouts();
  }
  function resize() {
    stage.width = Math.round(Math.max(320, stage.clientWidth || 520) * dpr);
    stage.height = Math.round(SH * dpr);
    field.width = Math.round(Math.max(320, field.clientWidth || 520) * dpr);
    field.height = Math.round(FH * dpr);
    drawAll();
  }
  window.addEventListener("resize", resize);
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (mm) { mode = mm; drawAll(); });
  LS.check.init(LAB);
  night(1);
  renderLog();
  resize();
})();
