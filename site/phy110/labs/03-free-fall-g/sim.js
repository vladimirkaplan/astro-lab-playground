// PHY110 Lab 3 sim: the free-fall bench. A vertical rod with a draggable sliding
// release, a steel ball, a landing pad with its switch, a meter stick beside the
// drop column, and a digital timer that reads four decimals with Reset and
// Recall of the last five times.
//
// Ideal Mode: the timer reads the true fall time exactly. Fun Mode adds a
// millisecond-scale release and geometry slip (+/-4 ms) to every drop - the size
// of the error a real bench makes - and never moves the accepted 9.80 m/s^2.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units, F = LS.freefall;
  var LAB = "03-free-fall-g";
  var $ = function (id) { return document.getElementById(id); };
  var mode = LS.ui.getMode(LAB);
  var EST = "  (instrument estimate)";

  function fmt(x, d) {
    if (!isFinite(x)) return "-";
    return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  }
  function jitter(spread) {
    return mode === "fun" ? (Math.random() - 0.5) * 2 * spread : 0;
  }
  function round4(x) { return Math.round(x * 1e4) / 1e4; }

  // ---------- bench geometry (css px) ----------
  var ROD_X = 96, PAD_TOP = 400, PX_PER_M = 411, BALL_R = 9;
  var H_MIN = 0.05, H_MAX = 0.85;
  var cv = $("dropCanvas"), cx = cv.getContext("2d");
  var dpr = window.devicePixelRatio || 1;

  // ---------- state ----------
  var heights = F.HEIGHTS_M.slice();              // 0.200, 0.400, 0.800
  var clipH = heights[1];                         // ball bottom -> pad top, in m
  var locked = false;
  var ballLoaded = false;
  var ballOnPad = false;
  var falling = false;
  var fallStart = 0, fallDurMs = 1200, fallH = 0, fallT = 0;
  var lastT = 0;                                  // what the timer display shows
  var recallIdx = -1;
  var centreRead = false;                         // the wrong height rule
  var sight = true;
  var landedAt = 0;
  var flash = null;                               // { text, until }

  var trials = [[], [], []];
  try {
    var saved = LS.store.load(LAB, "trials");
    if (saved && saved.rows) {
      for (var i = 0; i < heights.length; i++) {
        trials[i] = (saved.rows[i] || []).map(function (t) { return parseFloat(t); })
          .filter(isFinite).slice(0, F.TRIALS_PER_HEIGHT);
      }
    }
  } catch (e) {}

  function colFor(h) {
    for (var i = 0; i < heights.length; i++) {
      if (Math.abs(h - heights[i]) < 0.005) return i;
    }
    return -1;
  }
  function hRecorded() { return clipH + (centreRead ? F.centreReadOffsetM() : 0); }
  function colH(i) { return heights[i] + (centreRead ? F.centreReadOffsetM() : 0); }
  function colG(i) { return F.gForHeight(colH(i), trials[i]); }
  function trialsFull(i) { return i >= 0 && trials[i].length >= F.TRIALS_PER_HEIGHT; }

  function saveTrials() {
    LS.store.save(LAB, "trials", ["h = 0.200 m", "h = 0.400 m", "h = 0.800 m"],
      [trials[0], trials[1], trials[2]]);
  }

  // ---------- readouts ----------
  function noteNow() {
    if (flash && Date.now() < flash.until) return flash.text;
    if (falling) return "falling - the timer keeps true time";
    if (!locked) return "pick a height, then lock the release";
    if (!ballLoaded) return "lock is set - press Load ball";
    if (ballOnPad) return "ball on the pad - press Load ball to drop again";
    if (trialsFull(colFor(clipH))) return "five logged at this height - pick the next one";
    return "ready - press Release";
  }
  function refreshReadouts() {
    $("clipRead").textContent = fmt(clipH, 3) + " m" +
      (locked ? " (locked)" : " (drag the clip or pick a set height)");
    $("hRead").textContent = fmt(hRecorded(), 3) + " m" +
      (centreRead ? "  (to the ball centre - wrong rule)" : "  (ball bottom to pad top)");
    $("timerRead").textContent = fmt(lastT, 4) + " s" + (mode === "fun" ? EST : "");
    var c = colFor(clipH);
    $("trialRead").textContent = c >= 0
      ? trials[c].length + " of " + F.TRIALS_PER_HEIGHT + " at " + fmt(heights[c], 3) + " m"
      : "not a set height - drops here do not log";
    $("noteRead").textContent = noteNow();
  }

  // ---------- drawing ----------
  function ballBottomY() {
    if (falling) {
      var p = U.clamp((Date.now() - fallStart) / fallDurMs, 0, 1);
      return PAD_TOP - fallH * PX_PER_M + fallH * PX_PER_M * p * p;
    }
    if (ballLoaded) return PAD_TOP - clipH * PX_PER_M;
    if (ballOnPad) return PAD_TOP;
    return null;
  }
  function drawBench() {
    var w = cv.width / dpr, h = cv.height / dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, w, h);
    cx.fillStyle = "#0d1526"; cx.fillRect(0, 0, w, h);

    // base and rod
    cx.fillStyle = "#23324e"; cx.fillRect(20, PAD_TOP + 12, 190, 14);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 5;
    cx.beginPath(); cx.moveTo(ROD_X, 24); cx.lineTo(ROD_X, PAD_TOP + 12); cx.stroke();

    // meter stick beside the drop column: 0 at the pad top, up to 0.9 m
    var stickX = 152;
    cx.fillStyle = "#efe0bb"; cx.fillRect(stickX, PAD_TOP - 0.9 * PX_PER_M, 16, 0.9 * PX_PER_M);
    cx.strokeStyle = "#b99e6b"; cx.lineWidth = 1;
    cx.strokeRect(stickX, PAD_TOP - 0.9 * PX_PER_M, 16, 0.9 * PX_PER_M);
    cx.font = "10px ui-monospace, monospace"; cx.textAlign = "left"; cx.textBaseline = "middle";
    for (var cm = 0; cm <= 90; cm += 5) {
      var y = PAD_TOP - (cm / 100) * PX_PER_M;
      var major = cm % 10 === 0;
      cx.strokeStyle = "#3a3a3a"; cx.lineWidth = major ? 1 : 0.5;
      cx.beginPath(); cx.moveTo(stickX + 16, y); cx.lineTo(stickX + 16 - (major ? 10 : 5), y); cx.stroke();
      if (major) {
        cx.fillStyle = "#222";
        cx.fillText((cm / 100).toFixed(1), stickX + 20, y);
      }
    }
    cx.fillStyle = "#9fb4d8"; cx.font = "11px system-ui, sans-serif";
    cx.fillText("m", stickX + 20, PAD_TOP - 0.9 * PX_PER_M - 12);

    // landing pad, snapped directly under the ball's line, with its switch
    var ledOn = ballOnPad || (Date.now() - landedAt < 500);
    cx.fillStyle = "#23324e"; cx.fillRect(ROD_X - 45, PAD_TOP, 90, 12);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1.5;
    cx.strokeRect(ROD_X - 45, PAD_TOP, 90, 12);
    cx.fillStyle = ledOn ? "#7fe0a0" : "#4d648c";
    cx.beginPath(); cx.arc(ROD_X, PAD_TOP + 6, 4, 0, 6.29); cx.fill();
    cx.fillStyle = "#9fb4d8"; cx.font = "11px system-ui, sans-serif"; cx.textAlign = "center";
    cx.fillText("pad (switch under the ball)", ROD_X, PAD_TOP + 26);

    // height rule line: from the reading point down to the pad top
    var by = ballBottomY();
    var ruleY = by === null ? null : (centreRead ? by - BALL_R : by);
    if (ruleY !== null) {
      cx.strokeStyle = "#ffd166"; cx.setLineDash([4, 4]); cx.lineWidth = 1.2;
      cx.beginPath(); cx.moveTo(ROD_X, ruleY); cx.lineTo(ROD_X, PAD_TOP); cx.stroke();
      cx.setLineDash([]);
      cx.fillStyle = "#ffd166"; cx.font = "11px ui-monospace, monospace"; cx.textAlign = "right";
      cx.fillText("h = " + fmt(hRecorded(), 3) + " m", ROD_X - 12, (ruleY + PAD_TOP) / 2);
    }

    // the release clip: under the ball while loaded, else parked at the drag height
    if (!falling) {
      var cupY = ballLoaded && by !== null ? by - 2 : PAD_TOP - clipH * PX_PER_M;
      var holding = ballLoaded && by !== null;
      cx.strokeStyle = holding ? "#e8eefb" : "#7fa7e8"; cx.lineWidth = 3;
      cx.beginPath();
      cx.moveTo(ROD_X - 14, cupY - 6);
      cx.lineTo(ROD_X - 14, cupY + 1);
      cx.lineTo(ROD_X + 14, cupY + 1);
      cx.lineTo(ROD_X + 14, cupY - 6);
      cx.stroke();
      if (locked) {
        cx.fillStyle = "#ffd166";
        cx.fillRect(ROD_X + 18, cupY - 14, 10, 8);
        cx.strokeStyle = "#ffd166"; cx.lineWidth = 1.5;
        cx.beginPath(); cx.arc(ROD_X + 23, cupY - 14, 3.5, Math.PI, 0); cx.stroke();
      }
    }

    // the steel ball
    if (by !== null) {
      var bcy = by - BALL_R;
      cx.fillStyle = "#b9c3d0";
      cx.beginPath(); cx.arc(ROD_X, bcy, BALL_R, 0, 6.29); cx.fill();
      cx.strokeStyle = "#e8eefb"; cx.lineWidth = 1.5; cx.stroke();
      cx.strokeStyle = "rgba(255,255,255,0.6)"; cx.lineWidth = 1.5;
      cx.beginPath(); cx.arc(ROD_X - 3, bcy - 3, 4, Math.PI, Math.PI * 1.5); cx.stroke();
    }

    // sight from above: the pad, the switch, and the ball sitting on it
    if (sight) {
      var sx = w - 74, sy = 84, sr = 46;
      cx.fillStyle = "#101a30";
      cx.beginPath(); cx.arc(sx, sy, sr, 0, 6.29); cx.fill();
      cx.strokeStyle = "#4d648c"; cx.lineWidth = 1.5; cx.stroke();
      cx.fillStyle = "#23324e"; cx.fillRect(sx - 30, sy - 12, 60, 24);
      cx.strokeStyle = "#6d84ad"; cx.strokeRect(sx - 30, sy - 12, 60, 24);
      cx.fillStyle = ledOn ? "#7fe0a0" : "#4d648c";
      cx.beginPath(); cx.arc(sx, sy, 3, 0, 6.29); cx.fill();
      cx.fillStyle = "#b9c3d0";
      cx.beginPath(); cx.arc(sx, sy, 8, 0, 6.29); cx.fill();
      cx.strokeStyle = "#e8eefb"; cx.lineWidth = 1; cx.stroke();
      cx.fillStyle = "#9fb4d8"; cx.font = "10.5px system-ui, sans-serif"; cx.textAlign = "center";
      cx.fillText("sight from above:", sx, sy + sr + 14);
      cx.fillText("the pad snaps under the ball, on the switch", sx, sy + sr + 27);
    }

    // status line
    cx.fillStyle = "#cfd6e4"; cx.font = "12px system-ui, sans-serif"; cx.textAlign = "left";
    cx.fillText(noteNow(), 14, 20);
    if (falling) {
      cx.fillStyle = "#7fe0a0";
      cx.fillText("(fall slowed for your eyes; the timer keeps true time)", 14, 36);
    }
  }

  // ---------- the drop ----------
  function startFall() {
    if (!locked || !ballLoaded || falling) return;
    fallH = clipH;
    fallT = round4(F.fallTime(fallH) + jitter(0.004));
    if (fallT < 0.0001) fallT = 0.0001;
    falling = true;
    ballLoaded = false;
    ballOnPad = false;
    fallStart = Date.now();
    fallDurMs = Math.round(900 + fallT * 1800);
    flash = null;
    refreshReadouts(); drawBench();
  }
  function land() {
    falling = false;
    ballOnPad = true;
    landedAt = Date.now();
    lastT = fallT;
    recallIdx = -1;
    var c = colFor(fallH);
    if (c >= 0 && !trialsFull(c)) {
      trials[c].push(fallT);
      saveTrials();
      flash = { text: "landed: " + fmt(fallT, 4) + " s logged as trial " +
        trials[c].length + " of " + F.TRIALS_PER_HEIGHT + " at " + fmt(heights[c], 3) + " m",
        until: Date.now() + 4000 };
    } else if (c >= 0) {
      flash = { text: "five are already logged at " + fmt(heights[c], 3) + " m",
        until: Date.now() + 4000 };
    } else {
      flash = { text: "that height is not a table column - use a set-height button to log",
        until: Date.now() + 4000 };
    }
    refreshReadouts(); renderTable(); drawBench();
  }

  // ---------- data table ----------
  var HEADER = ["trial", "t (s) at h = 0.200 m", "t (s) at h = 0.400 m", "t (s) at h = 0.800 m"];
  function tableRows() {
    var rows = [];
    for (var t = 0; t < F.TRIALS_PER_HEIGHT; t++) {
      var row = [String(t + 1)];
      for (var i = 0; i < heights.length; i++) {
        row.push(trials[i][t] !== undefined ? fmt(trials[i][t], 4) : "-");
      }
      rows.push(row);
    }
    var means = heights.map(function (_, i) { return F.mean(trials[i]); });
    rows.push(["average t (s)", means.map(function (m) { return fmt(m, 4); })]);
    var gs = heights.map(function (_, i) { return colG(i); });
    rows.push(["g (m/s^2)", gs.map(function (g) { return fmt(g, 2); })]);
    var avg = F.averageG(gs);
    rows.push(["average g (m/s^2)", [fmt(avg, 2), "", ""]]);
    rows.push(["percent error vs 9.80", [isFinite(avg) ? fmt(F.percentError(avg), 2) + "%" : "-", "", ""]]);
    return rows;
  }
  function renderTable() {
    $("dataTable").innerHTML = LS.store.tableHTML(HEADER, tableRows());
    renderWorkBox();
  }
  function renderWorkBox() {
    var lines = ["accepted g = 9.80 m/s^2 (course value)",
      "the data page rule: average the times per height, then g per height, then average the three g",
      ""];
    heights.forEach(function (hv, i) {
      if (!trials[i].length) {
        lines.push("h = " + fmt(hv, 3) + " m: no trials yet");
        return;
      }
      var h = colH(i), m = F.mean(trials[i]);
      lines.push("h = " + fmt(hv, 3) + " m   (" + trials[i].length + "/" + F.TRIALS_PER_HEIGHT +
        " trials" + (centreRead ? ", read to the ball centre" : "") + ")");
      lines.push("  times (s): " + trials[i].map(function (t) { return fmt(t, 4); }).join(", "));
      lines.push("  average t = " + fmt(m, 4) + " s");
      lines.push("  g = 2 x " + fmt(h, 3) + " / " + fmt(m, 4) + "^2 = " +
        fmt(F.gFrom(h, m), 2) + " m/s^2");
    });
    var gs = heights.map(function (_, i) { return colG(i); });
    var avg = F.averageG(gs);
    if (gs.every(isFinite)) {
      lines.push("");
      lines.push("average g = (" + gs.map(function (g) { return fmt(g, 2); }).join(" + ") +
        ") / 3 = " + fmt(avg, 2) + " m/s^2");
      lines.push("percent error = |" + fmt(avg, 2) + " - 9.80| / 9.80 x 100 = " +
        fmt(F.percentError(avg), 2) + " %");
    } else {
      lines.push("");
      lines.push("log trials at all three heights to finish the answer rows");
    }
    $("workBox").textContent = lines.join("\n");
  }

  // ---------- controls ----------
  for (var b = 0; b < heights.length; b++) {
    (function (idx) {
      $("setH" + idx).addEventListener("click", function () {
        clipH = heights[idx]; locked = true;
        ballLoaded = false; ballOnPad = false; flash = null;
        if (falling) { falling = false; }
        lastT = 0; recallIdx = -1;
        refreshReadouts(); renderTable(); drawBench();
      });
    })(b);
  }
  $("lockBtn").addEventListener("click", function () {
    var c = colFor(clipH);
    if (c >= 0) clipH = heights[c];       // snap to the set height it is on
    locked = true; ballLoaded = false; ballOnPad = false; flash = null;
    if (falling) { falling = false; }
    lastT = 0; recallIdx = -1;
    refreshReadouts(); renderTable(); drawBench();
  });
  $("loadBtn").addEventListener("click", function () {
    if (!locked || falling) return;
    ballLoaded = true; ballOnPad = false; flash = null;
    refreshReadouts(); drawBench();
  });
  $("releaseBtn").addEventListener("click", startFall);
  $("resetTimer").addEventListener("click", function () {
    if (falling) return;
    lastT = 0; recallIdx = -1;
    refreshReadouts();
  });
  $("recallBtn").addEventListener("click", function () {
    if (falling) return;
    var c = colFor(clipH);
    if (c < 0 || !trials[c].length) {
      flash = { text: "no trials logged at this height yet", until: Date.now() + 2500 };
      refreshReadouts();
      return;
    }
    recallIdx = (recallIdx + 1) % trials[c].length;
    lastT = trials[c][recallIdx];
    flash = { text: "recall " + (recallIdx + 1) + " of " + trials[c].length +
      " at " + fmt(heights[c], 3) + " m", until: Date.now() + 2500 };
    refreshReadouts();
  });
  $("sightChk").addEventListener("change", function (ev) {
    sight = ev.target.checked; drawBench();
  });
  $("centreChk").addEventListener("change", function (ev) {
    centreRead = ev.target.checked;
    refreshReadouts(); renderTable(); drawBench();
  });
  $("clearTable").addEventListener("click", function () {
    trials = [[], [], []];
    LS.store.clear(LAB, "trials");
    lastT = 0; recallIdx = -1; flash = null;
    $("csvCopy").style.display = "none";
    refreshReadouts(); renderTable();
  });
  $("exportLog").addEventListener("click", function () {
    LS.store.exportCSV("phy110-lab3-freefall.csv", HEADER, tableRows(), $("csvCopy"));
  });

  // ---------- drag the release ----------
  var dragClip = false, grabOff = 0;
  function hAt(y) { return (PAD_TOP - y) / PX_PER_M; }
  cv.addEventListener("pointerdown", function (ev) {
    if (falling) return;
    var r = cv.getBoundingClientRect();
    var x = ev.clientX - r.left, y = ev.clientY - r.top;
    var grabY;
    if (ballLoaded) grabY = ballBottomY() - BALL_R;
    else if (!ballOnPad) grabY = PAD_TOP - clipH * PX_PER_M - BALL_R;
    else grabY = -999;                       // ball on the pad: load it first
    if (Math.abs(x - ROD_X) < 30 && Math.abs(y - grabY) < 26) {
      dragClip = true;
      grabOff = clipH - hAt(y);
      cv.setPointerCapture(ev.pointerId);
    }
  });
  cv.addEventListener("pointermove", function (ev) {
    if (!dragClip) return;
    var r = cv.getBoundingClientRect();
    clipH = U.clamp(hAt(ev.clientY - r.top) + grabOff, H_MIN, H_MAX);
    locked = false; ballLoaded = false; flash = null;
    lastT = 0; recallIdx = -1;
    refreshReadouts(); renderTable(); drawBench();
  });
  cv.addEventListener("pointerup", function () { dragClip = false; });
  cv.addEventListener("pointercancel", function () { dragClip = false; });

  // ---------- boot ----------
  function resizeStages() {
    var w = Math.round(Math.max(300, (cv.clientWidth || 480)) * dpr);
    cv.width = w; cv.height = Math.round(460 * dpr);
    drawBench();
  }
  window.addEventListener("resize", resizeStages);

  // the live timer counts true time while the (slowed) ball falls
  setInterval(function () {
    if (falling) {
      var p = U.clamp((Date.now() - fallStart) / fallDurMs, 0, 1);
      $("timerRead").textContent = fmt(fallT * p, 4) + " s";
      if (p >= 1) { land(); return; }
      drawBench();
    } else if (flash && Date.now() >= flash.until) {
      flash = null; refreshReadouts(); drawBench();
    }
  }, 40);

  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (m) {
    mode = m; refreshReadouts();
  });
  LS.check.init(LAB);
  refreshReadouts();
  renderTable();
  resizeStages();
})();
