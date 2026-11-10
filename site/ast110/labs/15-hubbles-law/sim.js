// Lab 15 sim: balloon (and flat) expansion runs, string measurements, Hubble
// diagram with a draggable slope handle, plus a synthetic cosmic sample.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units, B = LS.balloon;
  var LAB = "15-hubbles-law";

  var mode = LS.ui.getMode(LAB);
  var view = "balloon";

  // ---------- balloon state ----------
  var ANGLES = B.makeLayout(42);
  var CIRC1 = 2 * Math.PI * 6;          // start circumference in cm (radius 6)
  var phase = 0;                        // 0 setup, 1 measured d1, 2 inflated, 3 measured d2, 4 v done
  var inflating = false;
  var aFactor = 2, tSec = 10;
  var progressT = 1;                    // 0..1 inflation progress (1 = not started, fully shown? use factor)
  var d1 = null, d2 = null, vel = null;
  var measRnd = U.mulberry32(90210);

  var stage = document.getElementById("stage");
  var sctx = stage.getContext("2d");
  var dpr = window.devicePixelRatio || 1;
  function SW() { return stage.clientWidth || 480; }

  function factor() { return 1 + (aFactor - 1) * progressT; }

  function drawStage() {
    var w = SW(), h = stage.height / dpr;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, w, h);
    sctx.fillStyle = "#0d1526";
    sctx.fillRect(0, 0, w, h);

    var cx = w / 2, cy = h / 2;
    var baseR = Math.min(w, h) * 0.22;
    var R = baseR * factor();

    // balloon body
    var g = sctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.2, cx, cy, R);
    g.addColorStop(0, "#5f7fb8"); g.addColorStop(1, "#2c4670");
    sctx.fillStyle = g;
    sctx.beginPath(); sctx.arc(cx, cy, R, 0, Math.PI * 2); sctx.fill();
    sctx.strokeStyle = "#8fa8d0"; sctx.lineWidth = 2; sctx.stroke();

    if (view === "flat") {
      // flat 2-D mode: the same dots, mapped inside a disk (same string math)
      sctx.strokeStyle = "rgba(255,255,255,.15)";
      for (var rr = 1; rr <= 3; rr++) {
        sctx.beginPath(); sctx.arc(cx, cy, R * rr / 3, 0, Math.PI * 2); sctx.stroke();
      }
    }

    function dot(angleDeg) {
      var th = (angleDeg - 90) * Math.PI / 180;
      var rx = Math.cos(th), ry = Math.sin(th);
      if (view === "flat") {
        // flat mode: dots ride spokes; spoke offset carries the same string value
        var rpx = R * (0.06 + 0.86 * (angleDeg / 170));
        return { x: cx + rx * rpx, y: cy + ry * rpx };
      }
      return { x: cx + rx * R, y: cy + ry * R };
    }

    // home galaxy
    var home = dot(0);
    drawGalaxy(home.x, home.y, "#ffd76e", "MW");

    ANGLES.forEach(function (ang, i) {
      var p = dot(ang);
      drawGalaxy(p.x, p.y, "#e8eefc", String(i + 1));
    });
    // show which strings were just measured
    if (measureGhost) {
      ANGLES.forEach(function (ang) {
        stringLine(home, dot(ang), phase >= 3 ? "d2" : "d1");
      });
    }

    sctx.fillStyle = "#93a7cd"; sctx.font = "11.5px system-ui, sans-serif";
    sctx.textAlign = "left"; sctx.textBaseline = "top";
    sctx.fillText(view === "balloon"
      ? "balloon top view: string runs along the skin"
      : "flat view: same dots, distances read straight off the disk", 10, h - 20);
  }
  var measureGhost = null;

  function stringLine(a, b, which) {
    sctx.strokeStyle = which === "d1" ? "rgba(126,231,135,.7)" : "rgba(255,140,90,.7)";
    sctx.setLineDash([3, 4]);
    sctx.beginPath(); sctx.moveTo(a.x, a.y); sctx.lineTo(b.x, b.y); sctx.stroke();
    sctx.setLineDash([]);
  }

  function drawGalaxy(x, y, col, label) {
    sctx.fillStyle = col;
    sctx.beginPath(); sctx.arc(x, y, view === "flat" ? 7 : 7, 0, Math.PI * 2); sctx.fill();
    sctx.strokeStyle = "#111c30"; sctx.lineWidth = 2; sctx.stroke();
    sctx.fillStyle = "#111c30";
    sctx.font = "bold 9px system-ui, sans-serif";
    sctx.textAlign = "center"; sctx.textBaseline = "middle";
    sctx.fillText(label, x, y);
  }

  // ---------- run flow ----------
  var $ = function (id) { return document.getElementById(id); };

  function setPhaseNotes() {
    var notes = [
      "Step 1: press 'Measure before inflation' to lay the string from the Milky Way to each galaxy.",
      "Step 2: strings are noted. Press 'Blow up!' - it takes " + tSec + " s, exactly the time the manual makes you time.",
      "Step 3: balloon is inflated. Measure all strings again.",
      "Step 4: press 'Compute velocities': (d2 - d1) / " + tSec + " s, then drag your fit line.",
      "Done: drag the red handle on the Hubble diagram until it hugs your points, or type the slope."
    ];
    $("phaseNote").textContent = notes[Math.min(phase, 4)];
    $("measure1").disabled = phase !== 0 || inflating;
    $("inflate").disabled = phase !== 1 || inflating;
    $("measure2").disabled = phase !== 2 || inflating;
    $("velocities").disabled = phase !== 3 || inflating;
    $("speedNote").textContent = inflating ? "inflating... (real seconds, not fast-forward)" : "";
  }

  $("aPick").addEventListener("change", function (e) { aFactor = parseFloat(e.target.value); drawStage(); readouts(); });
  $("tPick").addEventListener("change", function (e) { tSec = parseFloat(e.target.value); setPhaseNotes(); readouts(); });

  $("measure1").addEventListener("click", function () {
    var noise = mode === "fun" ? 0.18 : 0;
    d1 = B.measureAll(B.arcDistances(CIRC1, ANGLES), noise, measRnd);
    phase = 1;
    measureGhost = "d1";
    renderRunTable();
    setPhaseNotes(); drawStage();
  });

  $("inflate").addEventListener("click", function () {
    if (phase !== 1) return;
    inflating = true;
    progressT = 0;
    setPhaseNotes();
    var t0 = performance.now();
    function step(now) {
      progressT = Math.min(1, (now - t0) / (tSec * 1000));
      drawStage();
      if (progressT < 1) {
        requestAnimationFrame(step);
      } else {
        inflating = false;
        phase = 2;
        measureGhost = null;
        setPhaseNotes(); drawStage();
      }
    }
    requestAnimationFrame(step);
  });

  $("measure2").addEventListener("click", function () {
    if (phase !== 2) return;
    var noise = mode === "fun" ? 0.18 : 0;
    d2 = B.measureAll(B.arcDistances(CIRC1 * aFactor, ANGLES), noise, measRnd);
    phase = 3;
    measureGhost = "d2";
    renderRunTable();
    setPhaseNotes(); drawStage();
  });

  $("velocities").addEventListener("click", function () {
    if (phase !== 3) return;
    vel = B.velocities(d1, d2, tSec);
    phase = 4;
    measureGhost = null;
    var pts = d2.map(function (d, i) { return [d, Math.max(0, vel[i])]; });
    plot.setPoints(pts);
    plot.autoscale();
    var guess = B.hubbleFromInflation(aFactor, tSec);
    plot.setStudentSlope(guess);
    $("slopeIn").value = U.round(guess, 4);
    renderRunTable();
    readouts();
    setPhaseNotes(); drawStage();
  });

  $("redo").addEventListener("click", function () {
    phase = 0; d1 = d2 = vel = null; measureGhost = null; progressT = 1;
    measRnd = U.mulberry32(Math.floor(Math.random() * 1e9));
    plot.clearPoints();
    plot.setFitLine(null);
    $("runTable").innerHTML = "";
    $("slopeRead").textContent = "-";
    $("ageRead").textContent = "-";
    setPhaseNotes(); drawStage();
  });

  function renderRunTable() {
    if (!d1) { $("runTable").innerHTML = ""; return; }
    var rows = [];
    for (var i = 0; i < d1.length; i++) {
      rows.push([
        "G" + (i + 1),
        d1[i].toFixed ? d1[i].toFixed(2) : d1[i],
        d2 ? d2[i].toFixed(2) : "",
        d2 ? (d2[i] - d1[i]).toFixed(2) : "",
        vel ? vel[i].toFixed(3) : ""
      ]);
    }
    $("runTable").innerHTML = LS.store.tableHTML(
      ["galaxy", "before d1 (cm)", "after d2 (cm)", "difference (cm)", "velocity = diff/" + tSec + "s (cm/s)"],
      rows);
  }

  $("exportBalloon").addEventListener("click", function () {
    if (!d1) return;
    var rows = d1.map(function (v, i) {
      return ["G" + (i + 1), v, d2 ? d2[i] : "", d2 ? U.round(d2[i] - v, 2) : "",
        vel ? vel[i] : ""];
    });
    LS.store.exportCSV("lab15-balloon-run.csv",
      ["galaxy", "d1_cm", "d2_cm", "diff_cm", "vel_cm_s"], rows,
      $("csvBalloon"));
  });

  // ---------- Hubble plot (balloon) ----------
  var plot = LS.plot.create($("plot"), {
    xLabel: "distance after inflation, cm",
    yLabel: "recession velocity, cm/s",
    xMin: 0, yMin: 0
  });
  plot.onSlope = function (s) {
    $("slopeIn").value = U.round(s, 4);
    readouts();
  };
  $("slopeIn").addEventListener("change", function (e) {
    var v = LS.check.parseNumber(e.target.value);
    if (isFinite(v) && v >= 0) { plot.setStudentSlope(v); readouts(); }
  });
  $("compFit").addEventListener("click", function () {
    var pts = plot.points();
    if (pts.length < 2) return;
    var xs = pts.map(function (p) { return p[0]; });
    var ys = pts.map(function (p) { return p[1]; });
    var f = LS.fit.throughOrigin(xs, ys);
    if (f) plot.setFitLine(f.slope, 0, "computer fit: " + U.round(f.slope, 4) + " /s");
    readouts();
  });

  function readouts() {
    var s = plot.studentSlope();
    var model = B.hubbleFromInflation(aFactor, tSec);
    if (s === null) return;
    var dev = (s - model) / model * 100;
    $("slopeRead").textContent = "model (a-1)/(a*t) = " + model.toFixed(4) +
      " /s  |  yours " + s.toFixed(4) + " (" + (dev >= 0 ? "+" : "") + dev.toFixed(1) + "%)";
    $("ageRead").textContent = (1 / s).toFixed(1) + " s of unwind time (you inflated for " + tSec + " s)";
  }

  // ---------- cosmic view ----------
  var plot2 = null;
  var cosmic = null;       // {rows, seed, peculiar}
  var cosmicSeed = 777;

  function initCosmic() {
    if (!plot2) {
      plot2 = LS.plot.create($("plot2"), {
        xLabel: "distance, Mpc", yLabel: "recessional velocity, km/s", xMin: 0, yMin: 0
      });
      plot2.onSlope = function (s) {
        $("slopeIn2").value = U.round(s, 1);
        readouts2();
      };
      $("slopeIn2").addEventListener("change", function (e) {
        var v = LS.check.parseNumber(e.target.value);
        if (isFinite(v) && v > 0) { plot2.setStudentSlope(v); readouts2(); }
      });
      $("compFit2").addEventListener("click", function () {
        var pts = plot2.points();
        var xs = pts.map(function (p) { return p[0]; });
        var ys = pts.map(function (p) { return p[1]; });
        var f = LS.fit.throughOrigin(xs, ys);
        if (f) plot2.setFitLine(f.slope, 0, "computer fit: " + U.round(f.slope, 1) + " km/s/Mpc");
        readouts2();
      });
      $("dealCosmic").addEventListener("click", dealCosmic);
      $("h0Pick").addEventListener("change", readouts2);
      $("exportCosmic").addEventListener("click", function () {
        if (!cosmic) return;
        LS.store.exportCSV("lab15-cosmic-sample.csv",
          ["galaxy", "distance_Mpc", "velocity_km_s"],
          cosmic.map(function (g) { return [g.name, g.distanceMpc, g.velocityKmS]; }),
          $("csvCosmic"));
      });
    }
    if (!cosmic) dealCosmic();
  }

  function dealCosmic() {
    var peculiar = mode === "fun" ? 150 : 0;
    cosmicSeed = Math.floor(Math.random() * 1e6);
    cosmic = B.cosmicSample(70, peculiar, cosmicSeed);
    plot2.setPoints(cosmic.map(function (g) { return [g.distanceMpc, g.velocityKmS]; }));
    plot2.autoscale();
    plot2.setFitLine(null);
    $("cosmicNote").textContent =
      "Synthetic sample (not real catalog data): velocities come from a model sky at " +
      "H0 = 70 km/s/Mpc" + (peculiar ? ", plus up to about 150 km/s of peculiar velocity per galaxy, " +
      "which is the wiggle real surveys carry" : " with no peculiar velocities: the clean classroom version") +
      ". Compare your fit slope with whatever model H0 the selector holds.";
    $("cosmicTable").innerHTML = LS.store.tableHTML(
      ["galaxy", "distance (Mpc)", "velocity (km/s)", "v/d"],
      cosmic.map(function (g) {
        return [g.name, g.distanceMpc, g.velocityKmS, (g.velocityKmS / g.distanceMpc).toFixed(1)];
      }));
    var guessH = 55;
    plot2.setStudentSlope(guessH);
    $("slopeIn2").value = guessH;
    readouts2();
  }

  function readouts2() {
    if (!plot2) return;
    var s = plot2.studentSlope();
    if (s === null) return;
    $("h0Read").textContent = "H0 estimate: " + s.toFixed(1) + " km/s/Mpc";
    $("age2Read").textContent = "1/H = " + LS.fit.hubbleAgeGyr(s).toFixed(2) + " Gyr";
    var sel = parseFloat($("h0Pick").value);
    var dev = (s - sel) / sel * 100;
    $("cmpRead").textContent = "vs selected " + sel + ": " + (dev >= 0 ? "+" : "") + dev.toFixed(1) +
      "% (age gap " + (LS.fit.hubbleAgeGyr(s) - LS.fit.hubbleAgeGyr(sel)).toFixed(2) + " Gyr)";
  }

  // ---------- view switching ----------
  var viewWrap = $("viewBtns");
  [["balloon", "Balloon"], ["flat", "Flat 2-D"], ["cosmic", "Cosmic sample"]].forEach(function (v) {
    var b = LS.ui.el("button", { type: "button", class: "action ghost", text: v[1], "data-v": v[0] });
    b.addEventListener("click", function () {
      view = v[0];
      document.getElementById("balloonView").hidden = view === "cosmic";
      document.getElementById("cosmicView").hidden = view !== "cosmic";
      if (view === "cosmic") initCosmic();
      else { hide("csvBalloon"); }
      viewBtnStyles();
      resizeAll();
    });
    viewWrap.appendChild(b);
  });
  function hide(id) { try { document.getElementById(id).style.display = "none"; } catch (e) {} }
  function viewBtnStyles() {
    viewWrap.querySelectorAll("button").forEach(function (b) {
      var on = b.getAttribute("data-v") === view;
      b.style.background = on ? "#101b30" : "";
      b.style.color = on ? "#fff" : "";
    });
  }

  // ---------- boot ----------
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (m) {
    mode = m;
    if (view === "cosmic") dealCosmic();
  });
  LS.check.init(LAB);

  function resizeAll() {
    stage.width = Math.round((stage.clientWidth || 480) * dpr);
    stage.height = Math.round(340 * dpr);
    drawStage();
    if (!plot) return;
    plot.draw();
    if (plot2) plot2.draw();
  }
  window.addEventListener("resize", resizeAll);
  viewBtnStyles();
  resizeAll();
  setPhaseNotes();
})();
