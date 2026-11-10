// PHY110 Lab 14 sim: the grating spectroscope. A source rack (filament,
// fluorescent, H, He, Ne, Hg, Ar), a lab jack that raises the source into the
// slit's line of sight, a sweepable scope view (drag to rotate), and a
// 380-700 nm recording chart with one strip per source that the student
// click-plots. An unknown-gas part matches plotted marks against the
// reference set with the +-30 nm uncalibrated-scope tolerance.
//
// Course Mode shows the reference lines exactly. Fun Mode wobbles every line
// position by a stable +-30 nm (the uncalibrated scope) and never changes the
// reference set, the visible range, or any accepted value; the brightness
// order is never graded. The manual's argon-vs-mercury mismatch is shipped as
// both lamps, footnoted, never silently picked. The view is bright and clean;
// the real one is dim, so the page says it is idealised.
(function () {
  "use strict";
  var LS = window.LS, O = LS.spectra14;
  var LAB = "14-spectra";
  var $ = function (id) { return document.getElementById(id); };
  var mode = LS.ui.getMode(LAB);

  function fmt(x, d) {
    if (x === null || x === undefined || !isFinite(x)) return "-";
    return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function rgbStr(c) { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; }

  // ---------- canvases ----------
  var SH = 200, CH = 340;
  var sv = $("scopeCanvas"), sx = sv.getContext("2d");
  var cv = $("chartCanvas"), cx = cv.getContext("2d");
  var dpr = window.devicePixelRatio || 1;

  // chart geometry
  var SCALE_H = 30, STRIP_H = 36, GAP = 6, LABEL_W = 92, PAD_L = 10, PAD_R = 14;
  function chartTop() { return SCALE_H + 6; }
  function stripY(i) { return chartTop() + i * (STRIP_H + GAP); }
  function nmX(nm) {
    return PAD_L + LABEL_W + ((nm - O.CHART_MIN) / (O.CHART_MAX - O.CHART_MIN)) *
      (cssW() - PAD_L - LABEL_W - PAD_R);
  }
  function nmAt(px) {
    var w = cssW() - PAD_L - LABEL_W - PAD_R;
    return O.CHART_MIN + ((px - PAD_L - LABEL_W) / w) * (O.CHART_MAX - O.CHART_MIN);
  }
  function cssW() { return cv.width / dpr; }
  function scopeW() { return sv.width / dpr; }

  // ---------- state ----------
  var source = "filament";   // current rack source
  var jack = false;
  var sweep = 470;           // centre of the sweep window, nm
  var unknownGas = null;     // the unnamed gas in the slit (part 2)
  var guess = null;          // the student's call on the unknown
  var refs = false;          // reference chart toggle
  var marks = [];            // [{strip, nm}]
  var idLog = [];            // [{strip, plotted, guess, verdict}]
  var jitter = null;         // Fun Mode: {"H:0": +12, ...} stable +-30 nm
  var flash = null, dragging = false;

  function freshJitter() {
    var j = {};
    O.GASES.forEach(function (g) {
      O.LINES[g].forEach(function (_, i) {
        j[g + ":" + i] = (Math.random() * 2 - 1) * O.FUN_JITTER_NM;
      });
    });
    return j;
  }
  function jitLine(g, i) {
    if (mode !== "fun" || !jitter) return 0;
    return jitter[g + ":" + i] || 0;
  }
  // the lines of whatever is in the slit, with Fun Mode wobble
  function slitLines() {
    var g = unknownGas || (O.LINES[source] ? source : null);
    var prof = O.sourceProfile(unknownGas ? unknownGas : source);
    if (!prof) return { lines: [], continuum: 0, gas: null };
    var lines = prof.lines.map(function (l, i) {
      return l + (g ? jitLine(g, i) : 0);
    });
    return { lines: lines, continuum: prof.continuum, gas: g };
  }
  function marksOn(strip) {
    return marks.filter(function (m) { return m.strip === strip; })
      .map(function (m) { return m.nm; }).sort(function (a, b) { return a - b; });
  }

  // ---------- persistence ----------
  function saveState() {
    LS.store.save(LAB, "state", ["state"], [[JSON.stringify({
      source: source, jack: jack, sweep: sweep, unknownGas: unknownGas,
      guess: guess, refs: refs, marks: marks, idLog: idLog, mode: mode,
      jitter: jitter
    })]]);
    LS.store.save(LAB, "log", CSV_HEADER, csvRows());
  }
  function loadState() {
    try {
      var got = LS.store.load(LAB, "state");
      if (!got || !got.rows || !got.rows.length) return;
      var st = JSON.parse(got.rows[0][0]);
      source = st.source || "filament"; jack = !!st.jack; sweep = st.sweep || 470;
      unknownGas = st.unknownGas || null; guess = st.guess || null;
      refs = !!st.refs; marks = st.marks || []; idLog = st.idLog || [];
      if (st.mode === "fun") mode = "fun";
      jitter = st.jitter || null;
    } catch (e) {}
  }

  // ---------- readouts ----------
  function noteNow() {
    if (flash && Date.now() < flash.until) return flash.text;
    if (!jack) return "the jack is down - the slit sees nothing";
    if (unknownGas) {
      if (!guess) return "sweep and plot the unknown's lines, then make your call";
      return "record the ID, or plot more lines on the strip you chose";
    }
    return "sweep the spectrum, then click the line positions onto " + source + "'s strip";
  }
  function refreshReadouts() {
    var w = O.SWEEP_WINDOW_NM;
    $("sweepRead").textContent = jack
      ? fmt(sweep - w / 2, 0) + " - " + fmt(sweep + w / 2, 0) + " nm"
      : "-";
    $("srcRead").textContent = !jack ? "jack is down"
      : unknownGas ? "unknown (unnamed)" : source;
    $("unkRead").textContent = unknownGas ? "an unnamed gas is in the slit" : "none loaded";
    $("jackBtn").textContent = jack ? "Jack: up" : "Jack: down";
    $("jackBtn").className = jack ? "action" : "action ghost";
    $("refChk").checked = refs;
    O.SOURCES.forEach(function (s) {
      var b = $("src-" + s);
      if (!b) return;
      b.className = (source === s && !unknownGas) ? "action" : "action ghost";
    });
    document.querySelectorAll("#guessRow button").forEach(function (b) {
      b.className = guess === b.getAttribute("data-guess") ? "action" : "action ghost";
    });
    $("noteRead").textContent = noteNow();
  }

  // ---------- tables and CSV ----------
  var CSV_HEADER = ["part", "item", "value 1", "value 2", "note"];
  function csvRows() {
    var rows = [];
    marks.forEach(function (m) {
      rows.push(["plot", m.strip, fmt(m.nm, 1), O.lineColour(m.nm) || "off-scale", ""]);
    });
    idLog.forEach(function (r, i) {
      rows.push(["id", "unknown " + (i + 1), r.guess, r.plotted, r.verdict]);
    });
    return rows;
  }
  function renderTables() {
    var mRows = marks.map(function (m) {
      return [m.strip, fmt(m.nm, 1), O.lineColour(m.nm) || "off-scale"];
    });
    if (!mRows.length) mRows = [["(nothing plotted yet)", "", ""]];
    $("tableMarks").innerHTML = LS.store.tableHTML(
      ["Source strip", "nm", "colour"], mRows);
    var iRows = idLog.map(function (r, i) {
      return ["unknown " + (i + 1), r.guess, String(r.plotted), r.verdict];
    });
    if (!iRows.length) iRows = [["(no identification recorded yet)", "", "", ""]];
    $("tableIds").innerHTML = LS.store.tableHTML(
      ["", "my call", "lines plotted", "bench says"], iRows);
    renderWorkBox();
  }
  function renderWorkBox() {
    var lines = [
      "E = h*f,  c = f*lambda (one level drop, one wavelength - added framing)",
      "visible band ~380 to ~760 nm (printed);  chart 380-700 nm, band edges the sim's own",
      "reference set (sim's own answer key, standard NIST tabulated values):"
    ];
    O.GASES.forEach(function (g) {
      lines.push("  " + g + ": " + O.LINES[g].join(", ") + " nm");
    });
    lines.push("manual mismatch, footnoted: the equipment list names an argon lamp, the procedure says mercury - both ship here");
    if (unknownGas) {
      var strip = guess || "?";
      var plotted = marksOn(guess || "");
      lines.push("unknown in the slit: plotted " + plotted.length +
        " line(s) on the " + strip + " strip");
      if (guess) {
        var cov = O.coverage(plotted, unknownGas);
        var id = O.identifyGas(plotted);
        lines.push("check: " + (id ? "the marks match " + id : "no gas matches the marks yet") +
          "; coverage of the true gas " + cov.hit + "/" + cov.of +
          " (revealed only after you record the ID)");
      }
    }
    if (mode === "fun") {
      lines.push("Fun Mode: every line position wobbles a stable +-30 nm (uncalibrated scope); the reference set does not move; brightness order is never graded");
    }
    $("workBox").textContent = lines.join("\n");
  }
  function refreshAll() {
    refreshReadouts();
    renderTables();
    drawScope();
    drawChart();
  }

  // ---------- drawing: the scope view ----------
  function drawScope() {
    var w = scopeW();
    sx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sx.clearRect(0, 0, w, SH);
    sx.fillStyle = "#0d1526"; sx.fillRect(0, 0, w, SH);
    var top = 14, bot = SH - 34, h = bot - top;
    if (!jack) {
      sx.fillStyle = "#6d84ad"; sx.font = "11px system-ui, sans-serif";
      sx.textAlign = "center"; sx.textBaseline = "middle";
      sx.fillText("the jack is down - the slit sees nothing", w / 2, (top + bot) / 2);
      return;
    }
    var win = O.SWEEP_WINDOW_NM;
    var lam0 = sweep - win / 2;
    var slit = slitLines();
    // the window as a rainbow band at the continuum strength
    if (slit.continuum > 0) {
      for (var x = 0; x < w; x++) {
        var lam = lam0 + (x / w) * win;
        var c = O.wavelengthRGB(lam);
        sx.fillStyle = rgbStr(c);
        sx.globalAlpha = slit.continuum;
        sx.fillRect(x, top, 1, h);
      }
      sx.globalAlpha = 1;
    } else {
      sx.fillStyle = "#101827";
      sx.fillRect(0, top, w, h);
    }
    // the lines
    slit.lines.forEach(function (l) {
      if (l < lam0 || l > lam0 + win) return;
      var x = ((l - lam0) / win) * w;
      var c = O.wavelengthRGB(l);
      sx.save();
      sx.shadowColor = rgbStr(c); sx.shadowBlur = 8;
      sx.fillStyle = rgbStr(c);
      sx.fillRect(x - 1.5, top, 3, h);
      sx.restore();
    });
    // frame + scale
    sx.strokeStyle = "#3a4a6a"; sx.lineWidth = 1.5;
    sx.strokeRect(0, top, w, h);
    sx.fillStyle = "#9fb4d8"; sx.font = "9px ui-monospace, monospace";
    sx.textAlign = "center"; sx.textBaseline = "top";
    var first = Math.ceil(lam0 / 10) * 10;
    for (var t = first; t <= lam0 + win; t += 10) {
      var xt = ((t - lam0) / win) * w;
      sx.strokeStyle = "#44557a";
      sx.beginPath(); sx.moveTo(xt, bot); sx.lineTo(xt, bot + 5); sx.stroke();
      if (t % 50 === 0) sx.fillText(String(t), xt, bot + 8);
    }
    sx.fillStyle = "#6d84ad";
    sx.fillText("nm", w - 12, bot + 8);
    sx.fillStyle = "#9fb4d8"; sx.font = "10px system-ui, sans-serif";
    sx.textAlign = "left"; sx.textBaseline = "bottom";
    sx.fillText((unknownGas ? "unknown gas" : source) +
      (slit.continuum > 0 ? " - mixed view (idealised, the real one is dim)" : " - line view (idealised)"),
      4, top - 3);
  }

  // ---------- drawing: the recording chart ----------
  function drawChart() {
    var w = cssW();
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, w, CH);
    cx.fillStyle = "#0d1526"; cx.fillRect(0, 0, w, CH);
    // top scale with the sim's own V B G Y O R bands
    var bands = [
      [380, 450, "V", "#7b5cff"], [450, 485, "B", "#3d7bff"], [485, 500, "G", "#2ecc71"],
      [500, 565, "Y", "#f1c40f"], [565, 590, "O", "#ff8c1a"], [590, 700, "R", "#e74c3c"]
    ];
    bands.forEach(function (b) {
      cx.fillStyle = b[3]; cx.globalAlpha = 0.16;
      cx.fillRect(nmX(b[0]), 4, nmX(b[1]) - nmX(b[0]), SCALE_H - 12);
      cx.globalAlpha = 1;
      cx.fillStyle = "#9fb4d8"; cx.font = "10px ui-monospace, monospace";
      cx.textAlign = "center"; cx.textBaseline = "middle";
      cx.fillText(b[2], (nmX(b[0]) + nmX(b[1])) / 2, 12);
    });
    cx.font = "9px ui-monospace, monospace"; cx.fillStyle = "#9fb4d8";
    cx.textAlign = "center"; cx.textBaseline = "top";
    for (var t = 380; t <= 700; t += 20) {
      cx.strokeStyle = "#44557a";
      cx.beginPath(); cx.moveTo(nmX(t), SCALE_H - 4); cx.lineTo(nmX(t), SCALE_H); cx.stroke();
      cx.fillText(String(t), nmX(t), SCALE_H);
    }
    // strips
    O.SOURCES.forEach(function (s, i) {
      var y = stripY(i);
      var isCurrent = !unknownGas && source === s;
      var isGuess = unknownGas && guess === s;
      cx.fillStyle = "#101827";
      cx.fillRect(PAD_L + LABEL_W, y, nmX(700) - nmX(380), STRIP_H);
      cx.strokeStyle = isCurrent || isGuess ? "#ffd166" : "#3a4a6a";
      cx.lineWidth = isCurrent || isGuess ? 2 : 1;
      cx.strokeRect(PAD_L + LABEL_W, y, nmX(700) - nmX(380), STRIP_H);
      cx.fillStyle = isCurrent || isGuess ? "#ffd166" : "#9fb4d8";
      cx.font = "10px system-ui, sans-serif"; cx.textAlign = "right";
      cx.textBaseline = "middle";
      cx.fillText(s, PAD_L + LABEL_W - 6, y + STRIP_H / 2);
      // the filament strip shows the continuous band
      if (s === "filament") {
        for (var x = 0; x < (nmX(700) - nmX(380)); x += 2) {
          var lam = 380 + (x / (nmX(700) - nmX(380))) * 320;
          cx.fillStyle = rgbStr(O.wavelengthRGB(lam));
          cx.globalAlpha = 0.8;
          cx.fillRect(nmX(380) + x, y + STRIP_H / 2 - 5, 2, 10);
        }
        cx.globalAlpha = 1;
      }
      // reference ticks (the toggle)
      if (refs && O.LINES[s]) {
        O.LINES[s].forEach(function (l) {
          if (l < O.CHART_MIN || l > O.CHART_MAX) return;
          cx.strokeStyle = "rgba(220,230,245,0.55)"; cx.lineWidth = 1;
          cx.beginPath();
          cx.moveTo(nmX(l), y + 3); cx.lineTo(nmX(l), y + STRIP_H - 3);
          cx.stroke();
        });
      }
      if (refs && s === "fluorescent") {
        O.LINES.Hg.forEach(function (l) {
          if (l < O.CHART_MIN || l > O.CHART_MAX) return;
          cx.strokeStyle = "rgba(220,230,245,0.55)"; cx.lineWidth = 1;
          cx.beginPath();
          cx.moveTo(nmX(l), y + 3); cx.lineTo(nmX(l), y + STRIP_H - 3);
          cx.stroke();
        });
      }
      // the student's marks
      marks.filter(function (m) { return m.strip === s; }).forEach(function (m) {
        var c = O.wavelengthRGB(m.nm);
        cx.fillStyle = rgbStr(c);
        cx.fillRect(nmX(m.nm) - 2, y + 2, 4, STRIP_H - 4);
      });
    });
  }

  // ---------- controls ----------
  O.SOURCES.forEach(function (s) {
    var b = $("src-" + s);
    if (!b) return;
    b.addEventListener("click", function () {
      if (unknownGas) {
        flash = { text: "an unknown is in the slit - press Return to rack first",
          until: Date.now() + 2800 };
        refreshAll();
        return;
      }
      source = s;
      flash = {
        text: s === "fluorescent"
          ? "fluorescent tube in the slit: expect lines on a faint band"
          : s === "filament" ? "filament in the slit: expect the whole band"
            : s + " lamp in the slit: expect only its own lines",
        until: Date.now() + 3000
      };
      refreshAll();
      saveState();
    });
  });
  $("jackBtn").addEventListener("click", function () {
    jack = !jack;
    flash = { text: jack ? "jack up - the source is in the slit line of sight"
      : "jack down - the slit sees nothing", until: Date.now() + 2200 };
    refreshAll();
    saveState();
  });
  $("refChk").addEventListener("change", function () {
    refs = this.checked;
    flash = { text: refs ? "reference chart on: known lines are laid over the strips"
      : "reference chart off", until: Date.now() + 2200 };
    refreshAll();
    saveState();
  });
  $("rackBack").addEventListener("click", function () {
    if (!unknownGas) {
      flash = { text: "you are already at the named rack", until: Date.now() + 2200 };
      refreshAll();
      return;
    }
    unknownGas = null;
    guess = null;
    flash = { text: "back to the named rack - the unknown stays in your log",
      until: Date.now() + 2500 };
    refreshAll();
    saveState();
  });
  $("loadUnknown").addEventListener("click", function () {
    var pool = O.GASES;
    unknownGas = pool[Math.floor(Math.random() * pool.length)];
    guess = null;
    flash = {
      text: "an unknown gas is in the slit - sweep it, plot its lines, make your call",
      until: Date.now() + 3200
    };
    refreshAll();
    saveState();
  });
  document.querySelectorAll("#guessRow button").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!unknownGas) {
        flash = { text: "load an unknown first", until: Date.now() + 2200 };
        refreshAll();
        return;
      }
      guess = b.getAttribute("data-guess");
      refreshAll();
      saveState();
    });
  });
  $("recordId").addEventListener("click", function () {
    if (!unknownGas) {
      flash = { text: "load an unknown first", until: Date.now() + 2200 };
      refreshAll();
      return;
    }
    if (!guess) {
      flash = { text: "pick I think it is... before recording", until: Date.now() + 2600 };
      refreshAll();
      return;
    }
    var plotted = marksOn(guess);
    if (!plotted.length) {
      flash = { text: "plot the unknown's lines on the " + guess + " strip first",
        until: Date.now() + 3000 };
      refreshAll();
      return;
    }
    var verdict;
    if (guess === unknownGas) {
      var cov = O.coverage(plotted, unknownGas);
      verdict = cov.hit === cov.of
        ? "correct: all " + cov.of + " lines of " + unknownGas + " match within +-30 nm"
        : "right gas, but only " + cov.hit + " of " + cov.of + " lines plotted - sweep again and plot the rest";
    } else {
      var id = O.identifyGas(plotted);
      verdict = id === guess
        ? "wrong gas: your marks carry " + guess + "'s fingerprint, but the lamp in the slit is " + unknownGas
        : "no match: your marks fit neither " + guess + " nor the lamp in the slit (" + unknownGas + ") - check where you plotted";
    }
    idLog.push({ strip: guess, plotted: plotted.length, guess: guess, verdict: verdict });
    flash = { text: "identification " + idLog.length + " recorded", until: Date.now() + 2500 };
    refreshAll();
    saveState();
  });
  $("clearStrip").addEventListener("click", function () {
    var strip = unknownGas ? guess : source;
    if (!strip) {
      flash = { text: "there is no current strip to clear", until: Date.now() + 2400 };
      refreshAll();
      return;
    }
    marks = marks.filter(function (m) { return m.strip !== strip; });
    flash = { text: "cleared the marks on the " + strip + " strip", until: Date.now() + 2400 };
    refreshAll();
    saveState();
  });
  $("clearAllBtn").addEventListener("click", function () {
    source = "filament"; jack = false; sweep = 470; unknownGas = null;
    guess = null; refs = false; marks = []; idLog = [];
    LS.store.clear(LAB, "log");
    $("csvCopy").style.display = "none";
    flash = { text: "cleared - the rack is back, the chart is blank", until: Date.now() + 2500 };
    refreshAll();
    saveState();
  });
  $("exportLog").addEventListener("click", function () {
    LS.store.exportCSV("phy110-lab14-spectra.csv", CSV_HEADER, csvRows(), $("csvCopy"));
  });

  // ---------- dragging / plotting ----------
  function evPos(el, ev) {
    var r = el.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }
  sv.addEventListener("pointerdown", function (ev) {
    dragging = true;
    sv.setPointerCapture(ev.pointerId);
    moveSweep(ev);
  });
  function moveSweep(ev) {
    var p = evPos(sv, ev);
    var win = O.SWEEP_WINDOW_NM;
    var frac = clamp(p.x / scopeW(), 0, 1);
    // the pointer sits on the line it is looking at
    var lam = (O.VISIBLE_MIN + frac * (O.VISIBLE_MAX - O.VISIBLE_MIN));
    sweep = clamp(lam, O.VISIBLE_MIN + win / 2, O.VISIBLE_MAX - win / 2);
    drawScope();
    $("sweepRead").textContent = fmt(sweep - win / 2, 0) + " - " + fmt(sweep + win / 2, 0) + " nm";
  }
  sv.addEventListener("pointermove", function (ev) {
    if (dragging) moveSweep(ev);
  });
  sv.addEventListener("pointerup", function () {
    if (!dragging) return;
    dragging = false;
    flash = { text: "sweep window " + fmt(sweep - O.SWEEP_WINDOW_NM / 2, 0) + " - " +
      fmt(sweep + O.SWEEP_WINDOW_NM / 2, 0) + " nm", until: Date.now() + 1800 };
    refreshAll();
    saveState();
  });
  sv.addEventListener("pointercancel", function () { dragging = false; });

  cv.addEventListener("pointerdown", function (ev) {
    var p = evPos(cv, ev);
    var i = Math.floor((p.y - chartTop()) / (STRIP_H + GAP));
    if (i < 0 || i >= O.SOURCES.length) return;
    if (p.y - chartTop() - i * (STRIP_H + GAP) > STRIP_H) return;
    if (p.x < nmX(O.CHART_MIN) || p.x > nmX(O.CHART_MAX)) return;
    var nm = clamp(nmAt(p.x), O.CHART_MIN, O.CHART_MAX);
    var strip = O.SOURCES[i];
    marks.push({ strip: strip, nm: nm });
    var col = O.lineColour(nm) || "off-scale";
    flash = {
      text: "plotted " + fmt(nm, 0) + " nm (" + col + ") on the " + strip + " strip" +
        (unknownGas ? " - that is your call on where the unknown's line belongs" : ""),
      until: Date.now() + 2800
    };
    refreshAll();
    saveState();
  });

  // ---------- boot ----------
  function resizeStages() {
    sv.width = Math.round(Math.max(700, (sv.clientWidth || 760)) * dpr);
    sv.height = Math.round(SH * dpr);
    cv.width = Math.round(Math.max(700, (cv.clientWidth || 760)) * dpr);
    cv.height = Math.round(CH * dpr);
    drawScope();
    drawChart();
  }
  window.addEventListener("resize", resizeStages);

  setInterval(function () {
    if (flash && Date.now() >= flash.until) { flash = null; refreshReadouts(); }
  }, 60);

  loadState();
  if (mode === "fun" && !jitter) jitter = freshJitter();
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (m) {
    mode = m;
    jitter = m === "fun" ? freshJitter() : null;
    refreshAll();
    saveState();
  });
  LS.check.init(LAB);
  refreshAll();
  resizeStages();
})();
