// H-R diagram lab sim. Bench 1 is the diagram itself: 29 real stars plotted by
// temperature (reversed axis, hot on the left) against luminosity on a
// logarithmic axis, each dot painted the colour its temperature implies. Click a
// star to read it. Bench 2 is the machine behind the diagram: the
// Stefan-Boltzmann law read backwards, so temperature plus luminosity gives the
// radius, and the radius is what makes a giant huge and a white dwarf tiny.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units, H = LS.hr;
  var LAB = "12-hr-diagram";
  var $ = function (id) { return document.getElementById(id); };

  var mode = LS.ui.getMode(LAB);
  var zonesOn = true;
  var selected = null;
  var TAG = "  (eye/instrument estimate)";

  var LOGT_LO = 3.35, LOGT_HI = 4.65;      // log10 K; hot end on the left
  var LOGL_LO = -3.7, LOGL_HI = 6.2;
  var CH = 460, DH = 170;

  var stage = $("stage"), sctx = stage.getContext("2d");
  var disc = $("disc"), dctx = disc.getContext("2d");
  var dpr = window.devicePixelRatio || 1;
  var pad = { l: 62, r: 14, t: 16, b: 46 };

  function lg(x) { return Math.log(x) / Math.LN10; }
  function pxx(teff, w) {
    return pad.l + (LOGT_HI - lg(teff)) / (LOGT_HI - LOGT_LO) * (w - pad.l - pad.r);
  }
  function pyy(lum, h) {
    return (h - pad.b) - (lg(lum) - LOGL_LO) / (LOGL_HI - LOGL_LO) * (h - pad.t - pad.b);
  }

  // Fun Mode: every star gets its own reproducible photometric-style error, so
  // the band thickens the way a real diagram does when magnitudes and colours
  // carry noise. Ideal Mode plots the catalog values exactly.
  function meas(s) {
    if (mode !== "fun") return { teff: s.teff, lum: s.lum, tag: "" };
    var r = U.mulberry32(s.name.length * 7919 + Math.round(s.teff));
    return {
      teff: s.teff * (1 + (r() - 0.5) * 0.06),
      lum: s.lum * Math.pow(10, (r() - 0.5) * 0.26),
      tag: TAG
    };
  }

  var myStar = null;              // pushed from bench 2, or null

  // ---------- the diagram ----------
  function drawChart() {
    var w = stage.width / dpr, h = CH;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, w, h);
    sctx.fillStyle = "#0d1526";
    sctx.fillRect(0, 0, w, h);

    // grid: temperature ticks (reversed, log spacing) and luminosity decades
    var tTicks = [40000, 30000, 20000, 15000, 10000, 7000, 5000, 4000, 3000, 2500];
    sctx.font = "10.5px system-ui, sans-serif";
    sctx.textAlign = "center"; sctx.textBaseline = "top";
    tTicks.forEach(function (t) {
      var x = pxx(t, w);
      if (x < pad.l - 1 || x > w - pad.r + 1) return;
      sctx.strokeStyle = "#22304c"; sctx.lineWidth = 1;
      sctx.beginPath(); sctx.moveTo(x, pad.t); sctx.lineTo(x, h - pad.b); sctx.stroke();
      sctx.fillStyle = "#8fa4c9";
      sctx.fillText(String(t), x, h - pad.b + 6);
    });
    sctx.textAlign = "right"; sctx.textBaseline = "middle";
    for (var e = -3; e <= 6; e++) {
      var y = pyy(Math.pow(10, e), h);
      sctx.strokeStyle = "#22304c"; sctx.lineWidth = 1;
      sctx.beginPath(); sctx.moveTo(pad.l, y); sctx.lineTo(w - pad.r, y); sctx.stroke();
      sctx.fillStyle = "#8fa4c9";
      sctx.fillText(lumTick(e), pad.l - 7, y);
    }

    // axes
    sctx.strokeStyle = "#66799e"; sctx.lineWidth = 1.4;
    sctx.beginPath();
    sctx.moveTo(pad.l, pad.t); sctx.lineTo(pad.l, h - pad.b); sctx.lineTo(w - pad.r, h - pad.b);
    sctx.stroke();
    sctx.fillStyle = "#cfe0ff"; sctx.font = "12px system-ui, sans-serif";
    sctx.textAlign = "center"; sctx.textBaseline = "bottom";
    sctx.fillText("surface temperature (K)  -  hotter to the left", (pad.l + w - pad.r) / 2, h - 4);
    sctx.save();
    sctx.translate(14, (pad.t + h - pad.b) / 2); sctx.rotate(-Math.PI / 2);
    sctx.fillText("luminosity (Sun = 1, log scale)", 0, 0);
    sctx.restore();

    if (zonesOn) zones(w, h);

    // the stars
    H.STARS.forEach(function (s) {
      var m = meas(s);
      var x = pxx(m.teff, w), y = pyy(m.lum, h);
      var c = H.colorFromT(m.teff);
      sctx.beginPath();
      sctx.arc(x, y, s === selected ? 7.5 : 5.2, 0, 6.29);
      sctx.fillStyle = LS.hr.rgb(c); sctx.fill();
      sctx.strokeStyle = s === selected ? "#ffffff" : "rgba(13,21,38,.9)";
      sctx.lineWidth = s === selected ? 2.2 : 1.2;
      sctx.stroke();
    });

    if (myStar) {
      var mx = pxx(myStar.teff, w), my = pyy(myStar.lum, h);
      sctx.strokeStyle = "#ffd76e"; sctx.lineWidth = 2;
      sctx.beginPath();
      sctx.moveTo(mx, my - 9); sctx.lineTo(mx + 9, my);
      sctx.lineTo(mx, my + 9); sctx.lineTo(mx - 9, my);
      sctx.closePath(); sctx.stroke();
      sctx.fillStyle = "#ffd76e"; sctx.font = "10.5px system-ui, sans-serif";
      sctx.textAlign = "left"; sctx.textBaseline = "bottom";
      sctx.fillText("my star", mx + 12, my + 3);
    }

    // a few permanent name tags, so the diagram is not an anonymous dot cloud
    ["Sun", "Sirius", "Vega", "Rigel", "Betelgeuse", "Arcturus", "Aldebaran",
      "Barnard's Star", "Proxima Centauri", "Sirius B", "Deneb", "Polaris"].forEach(function (n) {
      var s = H.findByName(n);
      if (!s) return;
      var x = pxx(meas(s).teff, w), y = pyy(meas(s).lum, h);
      sctx.fillStyle = "#93a7cd"; sctx.font = "10px system-ui, sans-serif";
      sctx.textAlign = "left"; sctx.textBaseline = "middle";
      sctx.fillText(s.name, x + 8, y - 6);
    });

    if (selected) crosshair(w, h);

    sctx.fillStyle = "#6d7fa3"; sctx.font = "10px system-ui, sans-serif";
    sctx.textAlign = "left"; sctx.textBaseline = "top";
    sctx.fillText(mode === "fun" ? "Fun Mode: each dot carries an instrument error" :
      "Ideal Mode: catalog values, no instrument error", pad.l + 6, pad.t + 4);
  }

  function lumTick(e) {
    if (e >= 0 && e <= 3) return String(Math.pow(10, e));
    return "1e" + e;
  }

  function zones(w, h) {
    // the hydrogen-burning guide line, drawn from the ridge in hr.js
    sctx.strokeStyle = "rgba(159,208,255,.45)"; sctx.lineWidth = 1.6;
    sctx.setLineDash([6, 5]);
    sctx.beginPath();
    var first = true;
    for (var t = 2600; t <= 34000; t *= 1.06) {
      var x = pxx(t, w), y = pyy(Math.pow(10, H.ridgeLogL(t)), h);
      if (first) { sctx.moveTo(x, y); first = false; } else sctx.lineTo(x, y);
    }
    sctx.stroke();
    sctx.setLineDash([]);

    sctx.fillStyle = "rgba(207,224,255,.4)";
    sctx.font = "11px system-ui, sans-serif";
    sctx.textAlign = "center"; sctx.textBaseline = "middle";
    label("main sequence", pxx(4300, w) + 26, pyy(0.06, h) + 16, 0.62);
    label("giants", pxx(4200, w), pyy(120, h), 0);
    label("supergiants", pxx(6000, w) - 30, pyy(120000, h), 0);
    label("white dwarfs", pxx(14000, w) + 10, pyy(0.006, h), 0);
  }

  function label(text, x, y, slope) {
    var ctx = sctx;
    ctx.save();
    ctx.translate(x, y);
    if (slope) ctx.rotate(slope);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  function crosshair(w, h) {
    var m = meas(selected);
    var x = pxx(m.teff, w), y = pyy(m.lum, h);
    sctx.strokeStyle = "rgba(255,215,110,.55)"; sctx.lineWidth = 1.2;
    sctx.setLineDash([3, 4]);
    sctx.beginPath();
    sctx.moveTo(pad.l, y); sctx.lineTo(x, y);
    sctx.lineTo(x, h - pad.b);
    sctx.stroke();
    sctx.setLineDash([]);
    sctx.fillStyle = "#ffd76e"; sctx.font = "11px system-ui, sans-serif";
    sctx.textAlign = "left"; sctx.textBaseline = "bottom";
    sctx.fillText(selected.name + ": " + Math.round(m.teff) + " K, " +
      H.summary(m.teff, m.lum).lumText + " L(sun)", x + 10, y - 12);
  }

  // ---------- the radius machine ----------
  function drawDisc() {
    var w = disc.width / dpr, h = DH;
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dctx.clearRect(0, 0, w, h);
    dctx.fillStyle = "#0d1526";
    dctx.fillRect(0, 0, w, h);

    var cy = h / 2;
    // the Sun, always, so the comparison has a ruler in the box
    var sunR = 24;
    var sx = 46;
    dctx.fillStyle = "rgb(255,241,214)";
    dctx.beginPath(); dctx.arc(sx, cy, sunR, 0, 6.29); dctx.fill();
    dctx.fillStyle = "#93a7cd"; dctx.font = "10.5px system-ui, sans-serif";
    dctx.textAlign = "center"; dctx.textBaseline = "top";
    dctx.fillText("the Sun", sx, cy + sunR + 6);
    dctx.fillText("1 R(sun)", sx, cy + sunR + 19);

    var r = H.radiusFromTL(machine.lum, machine.teff);
    var c = H.colorFromT(machine.teff);
    // square-root scale: a white dwarf and a supergiant share one box
    var rr = U.clamp(sunR * Math.sqrt(r), 2.5, Math.min(72, w - sx - 130));
    var bx = sx + sunR + 30 + rr;
    dctx.fillStyle = H.rgb(c);
    dctx.beginPath(); dctx.arc(bx, cy, rr, 0, 6.29); dctx.fill();
    dctx.strokeStyle = "rgba(207,224,255,.6)"; dctx.lineWidth = 1.2;
    dctx.stroke();
    dctx.fillStyle = "#93a7cd";
    dctx.fillText("my star", bx, cy + rr + 6);
    dctx.fillText(r >= 1 ? U.round(r, r >= 100 ? 0 : 1) + " R(sun)" :
      Math.round(r * H.R_SUN_KM) + " km", bx, cy + rr + 19);

    dctx.fillStyle = "#6d7fa3"; dctx.textAlign = "left";
    dctx.fillText("radii drawn on a square-root scale: area on screen is not area on sky", 10, h - 16);
  }

  // ---------- bench 2 state ----------
  var machine = { teff: 5772, lum: 1 };

  function machineMeas() {
    if (mode !== "fun") return { teff: machine.teff, lum: machine.lum, tag: "" };
    var r = U.mulberry32(Math.round(machine.teff) + Math.round(lg(machine.lum) * 1000));
    return {
      teff: machine.teff * (1 + (r() - 0.5) * 0.04),
      lum: machine.lum * Math.pow(10, (r() - 0.5) * 0.12),
      tag: TAG
    };
  }

  function readouts() {
    var mm = machineMeas();
    var s = H.summary(mm.teff, mm.lum);
    var rSun = H.radiusFromTL(mm.lum, mm.teff);
    var rKm = rSun * H.R_SUN_KM;
    $("mRegion").textContent = s.region + "  |  spectral class " + s.spectral +
      " (" + H.classHint[s.spectral] + ")" + mm.tag;
    $("mRadius").textContent = U.round(H.radiusFromTL(mm.lum, mm.teff), rSun < 0.1 ? 5 : 3) +
      " solar radii  |  " + Math.round(rKm).toLocaleString("en-US") + " km" + mm.tag;
    var au = H.radiusAU(rSun);
    if (au < 0.01) {
      $("mFit").textContent = "planted at the Sun's centre it would not come close to any " +
        "planet: the Sun is about " + Math.round(1 / Math.max(rSun, 1e-4)) +
        " of these stars wide" + mm.tag;
    } else {
      var reach = [];
      if (au > 0.39) reach.push("past Mercury");
      if (au > 0.72) reach.push("past Venus");
      if (au > 1.0) reach.push("past Earth");
      if (au > 1.52) reach.push("past Mars");
      if (au > 5.2) reach.push("out to Jupiter");
      $("mFit").textContent = "planted at the Sun's centre its surface would reach " +
        U.round(au, 2) + " AU" +
        (reach.length ? ", " + reach.join(", ") : ", still inside Mercury's 0.39 AU orbit") +
        mm.tag;
    }

    if (selected) {
      var sm = H.summary(meas(selected).teff, meas(selected).lum);
      $("selRead").textContent = selected.name + " (" + selected.cls + ")  |  " +
        sm.teff + " K  |  " + sm.lumText + " times the Sun's luminosity" + meas(selected).tag;
      $("posRead").textContent = sm.region + ", sitting " +
        (sm.aboveMS >= 0 ? U.round(sm.aboveMS, 1) + " decades above" :
          U.round(-sm.aboveMS, 1) + " decades below") +
        " the main sequence at its colour" + meas(selected).tag;
    }
  }

  function redraw() {
    drawChart();
    drawDisc();
    readouts();
  }

  // ---------- chart interaction ----------
  function pick(ev) {
    var rect = stage.getBoundingClientRect();
    var t = ev.touches ? ev.touches[0] : ev;
    var px = t.clientX - rect.left, py = t.clientY - rect.top;
    var w = stage.width / dpr, h = CH, best = null, bd = 17 * 17;
    H.STARS.forEach(function (s) {
      var m = meas(s);
      var dx = px - pxx(m.teff, w), dy = py - pyy(m.lum, h);
      var d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = s; }
    });
    if (best) {
      selected = best;
      $("logStar").disabled = false;
      redraw();
    }
  }
  stage.addEventListener("click", pick);
  stage.addEventListener("touchstart", function (ev) { pick(ev); }, { passive: true });

  $("zonesBtn").addEventListener("click", function () {
    zonesOn = !zonesOn;
    $("zonesBtn").textContent = "Zones and main sequence guide: " + (zonesOn ? "ON" : "OFF");
    $("zonesBtn").className = "action" + (zonesOn ? "" : " ghost");
    drawChart();
  });

  // ---------- bench 2 controls ----------
  function setMachine(teff, lum) {
    machine.teff = U.clamp(teff, 2500, 34000);
    machine.lum = U.clamp(lum, 1e-4, 1e6);
    $("tRange").value = String(lg(machine.teff));
    $("lRange").value = String(lg(machine.lum));
    $("tRead").textContent = String(Math.round(machine.teff));
    $("lRead").textContent = H.summary(machine.teff, machine.lum).lumText;
    redraw();
  }
  $("tRange").addEventListener("input", function (e) {
    setMachine(Math.pow(10, parseFloat(e.target.value)), machine.lum);
  });
  $("lRange").addEventListener("input", function (e) {
    setMachine(machine.teff, Math.pow(10, parseFloat(e.target.value)));
  });
  Array.prototype.forEach.call(document.querySelectorAll(".preset"), function (b) {
    b.addEventListener("click", function () {
      var s = H.findByName(b.getAttribute("data-star"));
      if (!s) return;
      selected = s;
      $("logStar").disabled = false;
      setMachine(s.teff, s.lum);
    });
  });
  $("plotBtn").addEventListener("click", function () {
    myStar = { teff: machine.teff, lum: machine.lum };
    redraw();
  });

  // ---------- log ----------
  var HEADER = ["star", "teff_K", "luminosity_solar", "radius_solar", "region"];
  var rows = [];
  try {
    var saved = LS.store.load(LAB, "log");
    if (saved && saved.rows) rows = saved.rows;
  } catch (e) {}

  function renderLog() {
    if (!rows.length) {
      $("logTable").innerHTML = "<p class='muted'>Nothing logged yet. Click a star on the " +
        "diagram (or set the dials on the radius machine) and press Log. The table survives a " +
        "reload, and CSV export gives you the same table you would draw by hand.</p>";
      return;
    }
    $("logTable").innerHTML = LS.store.tableHTML(
      ["star", "temperature (K)", "luminosity (Sun=1)", "radius (Sun=1)", "region"], rows);
  }
  function logCurrent(kind) {
    var src = kind === "mine" ? { name: "my star", teff: machine.teff, lum: machine.lum } : selected;
    if (!src) return;
    var m = kind === "mine" ? { teff: machine.teff, lum: machine.lum } : meas(src);
    var s = H.summary(m.teff, m.lum);
    rows.push([src.name, Math.round(m.teff), s.lumText,
      U.round(H.radiusFromTL(m.lum, m.teff), H.radiusFromTL(m.lum, m.teff) < 1 ? 4 : 1),
      s.region]);
    LS.store.save(LAB, "log", HEADER, rows);
    renderLog();
  }
  $("logStar").addEventListener("click", function () { logCurrent("star"); });
  $("logMine").addEventListener("click", function () { logCurrent("mine"); });
  $("logCsv").addEventListener("click", function () {
    LS.store.exportCSV("hr-diagram-log.csv", HEADER, rows, $("csvFallback"));
  });
  $("logClear").addEventListener("click", function () {
    rows = [];
    LS.store.save(LAB, "log", HEADER, rows);
    $("csvFallback").style.display = "none";
    renderLog();
  });

  // ---------- boot ----------
  function resize() {
    stage.width = Math.round(Math.max(320, stage.clientWidth || 520) * dpr);
    stage.height = Math.round(CH * dpr);
    disc.width = Math.round(Math.max(320, disc.clientWidth || 520) * dpr);
    disc.height = Math.round(DH * dpr);
    redraw();
  }
  window.addEventListener("resize", resize);
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (mm) { mode = mm; redraw(); });
  LS.check.init(LAB);
  $("logStar").disabled = true;
  setMachine(5772, 1);
  renderLog();
  resize();
})();
