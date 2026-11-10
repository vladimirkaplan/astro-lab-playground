// PHY110 Lab 4 sim: the Atwood's machine bench. A ceiling pulley with a typed
// mass label, two weight holders above a floor line, a tray of slotted weights
// (100/50/20/10 g) dragged onto either holder, a draggable release height read
// on a meter stick, and a stopwatch with start/stop and five repeats per trial.
//
// The fall animates at REAL speed so a 2.6 s drop takes 2.6 s; the stopwatch
// keeps true time. Ideal Mode stops the clock exactly at the floor hit.
// Fun Mode loses 2-8 % of the drive per trial (bearing friction and string)
// and slips the stop button up to 0.05 s per drop, so measured a lands a
// little below theory. Fun Mode never moves g = 9.80 or any course value.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units, A = LS.atwood;
  var LAB = "04-atwood-newton2";
  var $ = function (id) { return document.getElementById(id); };
  var mode = LS.ui.getMode(LAB);
  var EST = "  (instrument estimate)";

  function fmt(x, d) {
    if (!isFinite(x)) return "-";
    return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  }
  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
  function sum(list) { var s = 0; for (var i = 0; i < list.length; i++) s += list[i]; return s; }

  // ---------- bench geometry (css px) ----------
  var FLOOR = 432, PX = 300, PUL_Y = 44, PAN_H = 14, HOOK = 8;
  var CHIP_W = 48, CHIP_H = 11;
  var H_MIN = 0.30, H_MAX = 1.00;
  var cv = $("atwoodCanvas"), cx = cv.getContext("2d");
  var dpr = window.devicePixelRatio || 1;

  // ---------- apparatus state ----------
  var pulleyG = A.PULLEY_G, holder1G = A.HOLDER_G, holder2G = A.HOLDER_G;
  var tray = [100, 100, 50, 50, 50, 20, 20, 20, 20, 10, 10, 10, 10, 10, 10];
  var leftW = [], rightW = [];
  var h = 0.80;

  // ---------- trial state: one snapshot per trial column ----------
  var trial = 0;
  var snaps = [snapNow(), snapNow(), snapNow(), snapNow()];
  var flash = null;
  var falling = false, startWall = null, releaseWall = null;
  var fallDurMs = 0, fallT = 0, lastT = 0, fallSlip = 0;
  var gaps = [];                       // per-drop start gaps for the current trial

  function snapNow() {
    return {
      pulley: pulleyG, holder1: holder1G, holder2: holder2G,
      added1: leftW.slice(), added2: rightW.slice(), h: h,
      timings: [], averaged: false
    };
  }
  function syncSnap() {
    var s = snaps[trial];
    s.pulley = pulleyG; s.holder1 = holder1G; s.holder2 = holder2G;
    s.added1 = leftW.slice(); s.added2 = rightW.slice(); s.h = h;
  }
  function m1(i) { var s = snaps[i]; return s.holder1 + sum(s.added1); }
  function m2(i) { var s = snaps[i]; return s.holder2 + sum(s.added2); }

  function saveState() {
    LS.store.save(LAB, "state", ["state"], [[JSON.stringify({
      pulleyG: pulleyG, holder1G: holder1G, holder2G: holder2G,
      tray: tray, leftW: leftW, rightW: rightW, h: h, trial: trial,
      snaps: snaps
    })]]);
    LS.store.save(LAB, "trials", TABLE_HEADER, tableRows());
  }
  function loadState() {
    try {
      var got = LS.store.load(LAB, "state");
      if (!got || !got.rows || !got.rows.length) return;
      var st = JSON.parse(got.rows[0][0]);
      pulleyG = st.pulleyG; holder1G = st.holder1G; holder2G = st.holder2G;
      tray = st.tray; leftW = st.leftW; rightW = st.rightW;
      h = st.h; trial = st.trial;
      snaps = (st.snaps || []).slice(0, 4).map(function (s) {
        return {
          pulley: s.pulley, holder1: s.holder1, holder2: s.holder2,
          added1: (s.added1 || []).slice(), added2: (s.added2 || []).slice(),
          h: s.h,
          timings: (s.timings || []).slice(0, A.TIMINGS_PER_TRIAL),
          averaged: !!s.averaged
        };
      });
      while (snaps.length < 4) snaps.push(snapNow());
    } catch (e) {}
  }

  // ---------- geometry helpers ----------
  function geom() {
    var w = cv.width / dpr;
    var c = w / 2, off = Math.min(130, w * 0.27);
    return { w: w, cx: c, leftX: c - off, rightX: c + off,
      scale: Math.min(c + off + 64, w - 42) };
  }
  function heavyIsRight(i) {
    var d = m2(i) - m1(i);
    if (d === 0) return null;
    return d > 0;
  }
  // pan bottoms from the string constant: hookL + hookR = 488 (L + 2*PUL_Y).
  // p is the fall progress 0..1: at 0 the heavy pan sits h above the floor,
  // at 1 it sits on the floor; the light pan rises by the same amount.
  function panBottoms(i, p) {
    var s = snaps[i];
    var q = p === undefined ? 0 : p * p;
    var pBottom = FLOOR - s.h * PX * (1 - q);
    var hookR = pBottom - PAN_H - HOOK;
    var hookL = 488 - hookR;
    return { heavy: pBottom, light: hookL + PAN_H + HOOK, hookHeavy: hookR, hookLight: hookL };
  }

  // ---------- masses and physics ----------
  function aNow() { return A.aTheory(m1(trial), m2(trial), pulleyG); }
  function balanced() { return m1(trial) === m2(trial); }
  function breaksRule() { return A.breaksDiffRule(m1(trial), m2(trial)); }

  // ---------- readouts ----------
  function noteNow() {
    if (flash && Date.now() < flash.until) return flash.text;
    if (falling) return "falling - the stopwatch keeps true time";
    if (startWall) return "clock is running - press Release, or Stop to discard";
    if (balanced()) return "equal masses - the system is balanced, add weight to one side";
    var s = snaps[trial];
    if (s.timings.length >= A.TIMINGS_PER_TRIAL) {
      return s.averaged ? "trial complete - press Next trial"
        : "five logged - press Average 5";
    }
    if (breaksRule()) {
      return "mass difference " + A.diff(m1(trial), m2(trial)) +
        " g breaks the course rule (keep it <= 20 g) - the fall is fast to time";
    }
    return "ready - press Start, then Release";
  }
  function refreshReadouts() {
    var heavy = heavyIsRight(trial);
    var sideName = heavy === null ? "balanced" :
      (heavy ? "right (m2)" : "left (m1)");
    $("sideRead").textContent = sideName + "   h = " + fmt(h, 2) + " m";
    var s = snaps[trial];
    $("trialRead").textContent = "trial " + (trial + 1) + " of 4, " +
      s.timings.length + " of " + A.TIMINGS_PER_TRIAL + " timings";
    var at = aNow();
    $("aTheoryRead").textContent = isFinite(at) ? fmt(at, 3) + " m/s^2" : "-";
    var am = A.aForTrial(s.h, s.timings);
    $("aMeasRead").textContent = isFinite(am) ? fmt(am, 3) + " m/s^2" +
      (s.timings.length < A.TIMINGS_PER_TRIAL ? "  (from " + s.timings.length + " of 5)" : "") : "-";
    var pct = (isFinite(am) && isFinite(at)) ? A.pctDiffMean(am, at) : NaN;
    $("pctRead").textContent = isFinite(pct) ? fmt(pct, 1) + " %  (on the mean)" : "-";
    $("avgBtn").disabled = s.timings.length < A.TIMINGS_PER_TRIAL || s.averaged || falling;
    $("nextBtn").disabled = !s.averaged || trial >= 3 || falling;
    $("noteRead").textContent = noteNow();
  }

  // ---------- drawing ----------
  function drawWeights(x, bottom, list) {
    for (var i = 0; i < list.length; i++) {
      var y = bottom - PAN_H - CHIP_H * (i + 1);
      cx.fillStyle = i % 2 ? "#c8d2e0" : "#b4c0d2";
      cx.fillRect(x - CHIP_W / 2, y, CHIP_W, CHIP_H - 1);
      cx.strokeStyle = "#7d8ea6"; cx.lineWidth = 1;
      cx.strokeRect(x - CHIP_W / 2, y, CHIP_W, CHIP_H - 1);
      cx.fillStyle = "#1c2434"; cx.font = "9px ui-monospace, monospace";
      cx.textAlign = "center"; cx.textBaseline = "middle";
      cx.fillText(String(list[i]), x, y + CHIP_H / 2 - 0.5);
    }
  }
  function drawPan(x, bottom, label, total) {
    cx.fillStyle = "#8fa3c4";
    cx.fillRect(x - 28, bottom - PAN_H, 56, PAN_H);
    cx.strokeStyle = "#dce6f5"; cx.lineWidth = 1.5;
    cx.strokeRect(x - 28, bottom - PAN_H, 56, PAN_H);
    cx.fillStyle = "#9fb4d8"; cx.font = "10.5px system-ui, sans-serif";
    cx.textAlign = "center"; cx.textBaseline = "top";
    cx.fillText(label + "  " + total + " g", x, bottom + 4);
  }
  function drawBench() {
    var g = geom();
    var w = g.w;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, w, 470);
    cx.fillStyle = "#0d1526"; cx.fillRect(0, 0, w, 470);

    // ceiling + floor
    cx.fillStyle = "#23324e"; cx.fillRect(0, 8, w, 10);
    cx.fillStyle = "#1b2740"; cx.fillRect(0, FLOOR, w, 470 - FLOOR);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1.5;
    cx.beginPath(); cx.moveTo(0, FLOOR); cx.lineTo(w, FLOOR); cx.stroke();
    cx.fillStyle = "#9fb4d8"; cx.font = "10px system-ui, sans-serif";
    cx.textAlign = "left"; cx.textBaseline = "top";
    cx.fillText("floor", 8, FLOOR + 6);

    // pulley with its typed mass label
    cx.fillStyle = "#3a4d74";
    cx.beginPath(); cx.arc(g.cx, PUL_Y, 20, 0, 6.29); cx.fill();
    cx.strokeStyle = "#9fb4d8"; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(g.cx, PUL_Y, 20, 0, 6.29); cx.stroke();
    cx.fillStyle = "#dce6f5";
    cx.beginPath(); cx.arc(g.cx, PUL_Y, 4, 0, 6.29); cx.fill();
    cx.fillStyle = "#ffd166"; cx.font = "11px ui-monospace, monospace";
    cx.textAlign = "left"; cx.textBaseline = "middle";
    cx.fillText("M = " + pulleyG + " g", g.cx + 26, PUL_Y - 6);
    cx.fillStyle = "#9fb4d8"; cx.font = "10px system-ui, sans-serif";
    cx.fillText("pulley (solid disc, counts as M/2)", g.cx + 26, PUL_Y + 8);

    var p = falling ? U.clamp((Date.now() - releaseWall) / fallDurMs, 0, 1) : 0;
    var pb = panBottoms(trial, falling ? p : 0);
    var heavyRight = heavyIsRight(trial) === true;
    var hx = heavyRight ? g.rightX : g.leftX;
    var hBot = heavyRight ? pb.heavy : pb.light;
    var lBot = heavyRight ? pb.light : pb.heavy;

    // strings: over the pulley, one line to each holder's hook
    cx.strokeStyle = "#e8eefb"; cx.lineWidth = 1.6;
    var hx2 = heavyRight ? g.rightX : g.leftX;
    var lx2 = heavyRight ? g.leftX : g.rightX;
    cx.beginPath(); cx.moveTo(g.cx - 20, PUL_Y); cx.lineTo(lx2, lBot - PAN_H - HOOK); cx.stroke();
    cx.beginPath(); cx.moveTo(g.cx + 20, PUL_Y); cx.lineTo(hx2, hBot - PAN_H - HOOK); cx.stroke();

    // hooks
    cx.strokeStyle = "#e8eefb"; cx.lineWidth = 2;
    [g.leftX, g.rightX].forEach(function (x, i) {
      var b = (i === 0) ? (heavyRight ? lBot : hBot) : (heavyRight ? hBot : lBot);
      cx.beginPath(); cx.moveTo(x, b - PAN_H); cx.lineTo(x, b - PAN_H - HOOK); cx.stroke();
    });

    // weight stacks
    drawWeights(g.leftX, heavyRight ? lBot : hBot, leftW);
    drawWeights(g.rightX, heavyRight ? hBot : lBot, rightW);

    // pans with typed holder labels + totals
    drawPan(g.leftX, heavyRight ? lBot : hBot, "holder " + holder1G + " g +", m1(trial));
    drawPan(g.rightX, heavyRight ? hBot : lBot, "holder " + holder2G + " g +", m2(trial));

    // tray of slotted weights (two rows of 8)
    cx.fillStyle = "#23324e";
    cx.fillRect(8, 52, 8 * 34 + 10, 54);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1;
    cx.strokeRect(8, 52, 8 * 34 + 10, 54);
    cx.fillStyle = "#9fb4d8"; cx.font = "9.5px system-ui, sans-serif";
    cx.textAlign = "left"; cx.textBaseline = "top";
    cx.fillText("slotted weights - drag onto a holder", 12, 44);
    traySlots().forEach(function (sl, i) {
      if (i >= tray.length) return;
      cx.fillStyle = i % 2 ? "#c8d2e0" : "#b4c0d2";
      cx.fillRect(sl.x, sl.y, 28, 17);
      cx.strokeStyle = "#7d8ea6";
      cx.strokeRect(sl.x, sl.y, 28, 17);
      cx.fillStyle = "#1c2434"; cx.font = "9px ui-monospace, monospace";
      cx.textAlign = "center"; cx.textBaseline = "middle";
      cx.fillText(String(tray[i]), sl.x + 14, sl.y + 9);
    });

    // meter stick reading h, from the heavy pan bottom to the floor
    var sx = g.scale;
    cx.fillStyle = "#efe0bb"; cx.fillRect(sx, FLOOR - 1.15 * PX, 14, 1.15 * PX);
    cx.strokeStyle = "#b99e6b"; cx.lineWidth = 1;
    cx.strokeRect(sx, FLOOR - 1.15 * PX, 14, 1.15 * PX);
    cx.font = "9.5px ui-monospace, monospace"; cx.textAlign = "left"; cx.textBaseline = "middle";
    for (var cm = 0; cm <= 115; cm += 10) {
      var y = FLOOR - (cm / 100) * PX;
      cx.strokeStyle = "#3a3a3a"; cx.lineWidth = 1;
      cx.beginPath(); cx.moveTo(sx + 14, y); cx.lineTo(sx + 6, y); cx.stroke();
      cx.fillStyle = "#222";
      cx.fillText((cm / 100).toFixed(1), sx + 17, y);
    }
    cx.fillStyle = "#9fb4d8"; cx.font = "10px system-ui, sans-serif";
    cx.fillText("m", sx + 17, FLOOR - 1.15 * PX - 10);

    // h rule: from the heavy pan bottom to the scale
    if (!balanced()) {
      cx.strokeStyle = "#ffd166"; cx.setLineDash([4, 4]); cx.lineWidth = 1.2;
      cx.beginPath(); cx.moveTo(hx + 30, hBot); cx.lineTo(sx, hBot); cx.stroke();
      cx.setLineDash([]);
      cx.beginPath(); cx.moveTo(sx, hBot); cx.lineTo(sx, FLOOR); cx.stroke();
      cx.fillStyle = "#ffd166"; cx.font = "11px ui-monospace, monospace";
      cx.textAlign = "right";
      cx.fillText("h = " + fmt(h, 2) + " m", sx - 6, (hBot + FLOOR) / 2);
    }

    // status
    cx.fillStyle = "#cfd6e4"; cx.font = "12px system-ui, sans-serif"; cx.textAlign = "left";
    cx.textBaseline = "alphabetic";
    cx.fillText(noteNow(), 10, 466);
  }
  function traySlots() {
    var out = [];
    for (var i = 0; i < 16; i++) {
      out.push({ x: 14 + (i % 8) * 34, y: 60 + Math.floor(i / 8) * 27 });
    }
    return out;
  }

  // ---------- the drop ----------
  function startFall() {
    if (!startWall || falling || balanced()) return;
    var a = aNow();
    if (!isFinite(a) || a <= 0) return;
    var aEff = a;
    fallSlip = 0;
    if (mode === "fun") {
      var bias = rand(A.FUN_BIAS_MIN, A.FUN_BIAS_MAX);   // per-trial instrument loss
      aEff = A.biasA(a, bias);
      fallSlip = rand(0, A.STOP_SLIP_S);                 // stop-button slip, per drop
    }
    var s = snaps[trial];
    fallT = A.fallTime(s.h, aEff);
    releaseWall = Date.now();
    falling = true;
    fallDurMs = Math.max(300, Math.round(fallT * 1000));
    flash = null;
    refreshReadouts(); drawBench();
  }
  function land() {
    falling = false;
    var s = snaps[trial];
    // the clock ran from the Start click; whatever that was, it is the truth
    var stopWall = releaseWall + fallT * 1000 + fallSlip * 1000;
    var tRec = Math.max(0.05, (stopWall - startWall) / 1000);
    var gap = (releaseWall - startWall) / 1000;
    gaps.push(gap);
    if (s.timings.length < A.TIMINGS_PER_TRIAL) {
      s.timings.push(tRec);
      saveState();
      flash = { text: "floor hit: " + fmt(tRec, 3) + " s logged as drop " +
        s.timings.length + " of " + A.TIMINGS_PER_TRIAL +
        (Math.abs(gap) > 0.15 ? " (you started " + fmt(Math.abs(gap), 2) + " s " +
          (gap > 0 ? "early" : "late") + ")" : ""),
        until: Date.now() + 4000 };
    } else {
      flash = { text: "five are already logged - use Next trial", until: Date.now() + 3000 };
    }
    startWall = null;
    lastT = tRec;
    refreshReadouts(); renderTable(); drawBench();
  }
  function discard() {
    falling = false; startWall = null; releaseWall = null;
    lastT = 0;
    flash = { text: "run discarded - press Start to time again", until: Date.now() + 2500 };
    refreshReadouts(); drawBench();
  }

  // ---------- data table ----------
  var TABLE_HEADER = ["quantity", "trial 1", "trial 2", "trial 3", "trial 4"];
  function col(i) {
    var s = snaps[i];
    var v = [];
    v.push(String(s.pulley));
    v.push(String(s.holder1));
    v.push(String(sum(s.added1)));
    v.push(String(m1(i)));
    v.push(String(s.holder2));
    v.push(String(sum(s.added2)));
    v.push(String(m2(i)));
    v.push(fmt(s.h, 2));
    for (var t = 0; t < A.TIMINGS_PER_TRIAL; t++) {
      v.push(s.timings[t] !== undefined ? fmt(s.timings[t], 3) : "-");
    }
    var mean = A.mean(s.timings);
    v.push(isFinite(mean) ? fmt(mean, 3) : "-");
    var at = A.aTheory(m1(i), m2(i), s.pulley);
    v.push(isFinite(at) ? fmt(at, 3) : "-");
    var am = A.aForTrial(s.h, s.timings);
    v.push(isFinite(am) ? fmt(am, 3) : "-");
    var pct = (isFinite(am) && isFinite(at)) ? A.pctDiffMean(am, at) : NaN;
    v.push(isFinite(pct) ? fmt(pct, 1) + " %" : "-");
    return v;
  }
  function tableRows() {
    var c = [col(0), col(1), col(2), col(3)];
    var labels = ["pulley M (g)", "holder 1 (g)", "added 1 (g)", "total m1 (g)",
      "holder 2 (g)", "added 2 (g)", "total m2 (g)", "h (m)",
      "t1 (s)", "t2 (s)", "t3 (s)", "t4 (s)", "t5 (s)", "average t (s)",
      "a_theory (m/s^2)", "a_measured (m/s^2)", "% difference (on the mean)"];
    var rows = [];
    for (var r = 0; r < labels.length; r++) {
      rows.push([labels[r], c[0][r], c[1][r], c[2][r], c[3][r]]);
    }
    return rows;
  }
  function renderTable() {
    $("dataTable").innerHTML = LS.store.tableHTML(TABLE_HEADER, tableRows());
    renderWorkBox();
  }
  function renderWorkBox() {
    var lines = ["g = 9.80 m/s^2 (course value); the theory line is a = (m2 - m1) g / (m1 + m2 + M/2)",
      "the % difference uses the mean of measured and theory as its denominator - the check accepts the theory one too",
      ""];
    for (var i = 0; i < 4; i++) {
      var s = snaps[i];
      if (!s.timings.length && sum(s.added1) === 0 && sum(s.added2) === 0) {
        lines.push("trial " + (i + 1) + ": not set up");
        continue;
      }
      var at = A.aTheory(m1(i), m2(i), s.pulley);
      lines.push("trial " + (i + 1) + ": m1 = " + m1(i) + " g (" + s.holder1 + " + " +
        sum(s.added1) + "), m2 = " + m2(i) + " g (" + s.holder2 + " + " + sum(s.added2) +
        "), M = " + s.pulley + " g, h = " + fmt(s.h, 2) + " m");
      lines.push("  a_theory = (" + m2(i) + " - " + m1(i) + ") x 9.80 / (" + m1(i) +
        " + " + m2(i) + " + " + s.pulley + "/2) = " + fmt(at, 3) + " m/s^2");
      if (s.timings.length) {
        var mean = A.mean(s.timings);
        lines.push("  times (s): " + s.timings.map(function (t) { return fmt(t, 3); }).join(", "));
        if (i === trial && gaps.length) {
          lines.push("  start gaps (s): " + gaps.map(function (g2) { return fmt(g2, 2); }).join(", "));
        }
        lines.push("  average t = " + fmt(mean, 3) + " s");
        lines.push("  a_measured = 2 x " + fmt(s.h, 2) + " / " + fmt(mean, 3) +
          "^2 = " + fmt(A.aMeasured(s.h, mean), 3) + " m/s^2");
        if (isFinite(at)) {
          lines.push("  % difference (on the mean) = " +
            fmt(A.pctDiffMean(A.aMeasured(s.h, mean), at), 1) + " %");
        }
      }
    }
    $("workBox").textContent = lines.join("\n");
  }

  // ---------- course trial setups ----------
  var COURSE_LEFT = [[100], [100, 20], [100, 20, 20], [100, 50, 10]];
  var COURSE_RIGHT = [[100, 10], [100, 20, 10], [100, 50], [100, 50, 20]];
  function loadCourse(n) {
    if (falling) discard();
    startWall = null;
    // return everything to the tray, then take out the course weights
    tray = tray.concat(leftW, rightW);
    leftW = []; rightW = [];
    function take(list, gram) {
      var idx = list.indexOf(gram);
      if (idx < 0) return;
      list.splice(idx, 1);
    }
    COURSE_LEFT[n - 1].forEach(function (gram) { take(tray, gram); leftW.push(gram); });
    COURSE_RIGHT[n - 1].forEach(function (gram) { take(tray, gram); rightW.push(gram); });
    h = 1.00;
    gaps = [];
    flash = { text: "course trial " + n + " loaded - difference 10 g, h = 1.00 m",
      until: Date.now() + 3500 };
    syncSnap();
    refreshReadouts(); renderTable(); drawBench();
    saveState();
  }

  // ---------- controls ----------
  ["pulleyMass", "holder1Mass", "holder2Mass"].forEach(function (id, i) {
    $(id).addEventListener("change", function () {
      var v = Math.max(0, parseFloat(this.value) || 0);
      this.value = v;
      if (i === 0) pulleyG = v; else if (i === 1) holder1G = v; else holder2G = v;
      gaps = [];
      syncSnap();
      refreshReadouts(); renderTable(); drawBench();
      saveState();
    });
  });
  for (var t = 1; t <= 4; t++) {
    (function (n) {
      $("courseT" + n).addEventListener("click", function () { loadCourse(n); });
    })(t);
  }
  $("startBtn").addEventListener("click", function () {
    if (falling) return;
    if (balanced()) {
      flash = { text: "equal masses - add weight to one side first", until: Date.now() + 2500 };
      refreshReadouts();
      return;
    }
    startWall = Date.now();
    lastT = 0;
    refreshReadouts(); drawBench();
  });
  $("releaseBtn").addEventListener("click", function () {
    if (!startWall) {
      flash = { text: "press Start first - the clock must be running", until: Date.now() + 2500 };
      refreshReadouts(); drawBench();
      return;
    }
    if (balanced()) {
      flash = { text: "equal masses - nothing to release", until: Date.now() + 2500 };
      refreshReadouts();
      return;
    }
    startFall();
  });
  $("stopBtn").addEventListener("click", discard);
  $("avgBtn").addEventListener("click", function () {
    var s = snaps[trial];
    if (s.timings.length < A.TIMINGS_PER_TRIAL) return;
    s.averaged = true;
    saveState();
    flash = { text: "trial " + (trial + 1) + " averaged - " +
      (trial < 3 ? "press Next trial" : "table complete"),
      until: Date.now() + 3000 };
    refreshReadouts(); renderTable();
  });
  $("nextBtn").addEventListener("click", function () {
    if (trial >= 3) return;
    trial++;
    gaps = [];
    flash = { text: "trial " + (trial + 1) + " ready - the course pattern adds about 20 g to each side",
      until: Date.now() + 3500 };
    syncSnap();
    refreshReadouts(); renderTable(); drawBench();
    saveState();
  });
  $("clearTable").addEventListener("click", function () {
    for (var i = 0; i < 4; i++) { snaps[i].timings = []; snaps[i].averaged = false; }
    trial = 0; gaps = []; lastT = 0;
    falling = false; startWall = null;
    LS.store.clear(LAB, "trials");
    saveState();
    $("csvCopy").style.display = "none";
    flash = { text: "table cleared", until: Date.now() + 2000 };
    refreshReadouts(); renderTable(); drawBench();
  });
  $("exportLog").addEventListener("click", function () {
    LS.store.exportCSV("phy110-lab4-atwood.csv", TABLE_HEADER, tableRows(), $("csvCopy"));
  });

  // ---------- dragging: weights and the release height ----------
  var drag = null;   // {kind:"h"} | {kind:"w", from, idx, g, x, y}
  function weightAt(x, y) {
    var g = geom();
    var pb = panBottoms(trial, 0);
    var heavyRight = heavyIsRight(trial) === true;
    var leftBottom = heavyRight ? pb.light : pb.heavy;
    var rightBottom = heavyRight ? pb.heavy : pb.light;
    var holderLists = { left: { x: g.leftX, bottom: leftBottom, list: leftW },
      right: { x: g.rightX, bottom: rightBottom, list: rightW } };
    var locs = ["left", "right"];
    for (var li = 0; li < locs.length; li++) {
      var loc = locs[li], hd = holderLists[loc];
      for (var i = hd.list.length - 1; i >= 0; i--) {
        var wy = hd.bottom - PAN_H - CHIP_H * (i + 1);
        if (Math.abs(x - hd.x) < CHIP_W / 2 + 4 && y > wy - 3 && y < wy + CHIP_H) {
          return { kind: "w", from: loc, idx: i, g: hd.list[i] };
        }
      }
    }
    var slots = traySlots();
    for (var j = 0; j < tray.length; j++) {
      var sl = slots[j];
      if (x > sl.x - 4 && x < sl.x + 32 && y > sl.y - 4 && y < sl.y + 21) {
        return { kind: "w", from: "tray", idx: j, g: tray[j] };
      }
    }
    return null;
  }
  function holderAt(x, y) {
    var g = geom();
    var pb = panBottoms(trial, 0);
    var heavyRight = heavyIsRight(trial) === true;
    var leftBottom = heavyRight ? pb.light : pb.heavy;
    var rightBottom = heavyRight ? pb.heavy : pb.light;
    if (Math.abs(x - g.leftX) < 45 && y > leftBottom - PAN_H - CHIP_H * leftW.length - 10 &&
      y < leftBottom + 6) return "left";
    if (Math.abs(x - g.rightX) < 45 && y > rightBottom - PAN_H - CHIP_H * rightW.length - 10 &&
      y < rightBottom + 6) return "right";
    return null;
  }
  cv.addEventListener("pointerdown", function (ev) {
    if (falling) return;
    var r = cv.getBoundingClientRect();
    var x = ev.clientX - r.left, y = ev.clientY - r.top;
    var g = geom();
    if (!balanced()) {
      var pb = panBottoms(trial, 0);
      var heavyBottom = heavyIsRight(trial) === true ? pb.heavy : pb.light;
      var heavyX = heavyIsRight(trial) === true ? g.rightX : g.leftX;
      if (Math.abs(x - heavyX) < 45 && y > heavyBottom - PAN_H - CHIP_H * (heavyIsRight(trial) ? rightW.length : leftW.length) - 10 &&
        y < heavyBottom + 8) {
        drag = { kind: "h" };
        cv.setPointerCapture(ev.pointerId);
        return;
      }
    }
    var w = weightAt(x, y);
    if (w) {
      drag = w;
      cv.setPointerCapture(ev.pointerId);
    }
  });
  cv.addEventListener("pointermove", function (ev) {
    if (!drag) return;
    var r = cv.getBoundingClientRect();
    var x = ev.clientX - r.left, y = ev.clientY - r.top;
    if (drag.kind === "h") {
      h = U.clamp((FLOOR - y) / PX, H_MIN, H_MAX);
      gaps = [];
      syncSnap();
      refreshReadouts(); renderTable(); drawBench();
    } else {
      drag.x = x; drag.y = y;
      drawBench();
      cx.fillStyle = "rgba(255,209,102,0.9)";
      cx.fillRect(x - CHIP_W / 2, y - CHIP_H / 2, CHIP_W, CHIP_H);
    }
  });
  cv.addEventListener("pointerup", function (ev) {
    if (!drag) return;
    var r = cv.getBoundingClientRect();
    var x = ev.clientX - r.left, y = ev.clientY - r.top;
    if (drag.kind === "w") {
      var loc = holderAt(x, y);
      var toTray = y < 116 && x < 8 * 34 + 20;
      if (loc === "tray" && (drag.from === "left" || drag.from === "right")) {
        drag.from === "left" ? leftW.splice(drag.idx, 1) : rightW.splice(drag.idx, 1);
        tray.push(drag.g);
      } else if (loc === "left" && drag.from !== "left") {
        if (drag.from === "tray") tray.splice(drag.idx, 1); else rightW.splice(drag.idx, 1);
        leftW.push(drag.g);
      } else if (loc === "right" && drag.from !== "right") {
        if (drag.from === "tray") tray.splice(drag.idx, 1); else leftW.splice(drag.idx, 1);
        rightW.push(drag.g);
      } else if (toTray && drag.from !== "tray") {
        drag.from === "left" ? leftW.splice(drag.idx, 1) : rightW.splice(drag.idx, 1);
        tray.push(drag.g);
      }
      gaps = [];
      syncSnap();
      refreshReadouts(); renderTable(); drawBench();
      saveState();
    }
    drag = null;
    drawBench();
  });
  cv.addEventListener("pointercancel", function () { drag = null; drawBench(); });

  // ---------- boot ----------
  function resizeStages() {
    var w = Math.round(Math.max(360, (cv.clientWidth || 480)) * dpr);
    cv.width = w; cv.height = Math.round(470 * dpr);
    drawBench();
  }
  window.addEventListener("resize", resizeStages);

  setInterval(function () {
    if (falling) {
      var p = U.clamp((Date.now() - releaseWall) / fallDurMs, 0, 1);
      $("timerRead").textContent = fmt((Date.now() - startWall) / 1000, 3) + " s";
      if (p >= 1) { land(); return; }
      drawBench();
    } else if (startWall) {
      $("timerRead").textContent = fmt((Date.now() - startWall) / 1000, 3) + " s";
    } else if (flash && Date.now() >= flash.until) {
      flash = null; refreshReadouts(); drawBench();
    } else {
      $("timerRead").textContent = (lastT ? fmt(lastT, 3) + " s" : "0.000 s") +
        (mode === "fun" ? EST : "");
    }
  }, 40);

  loadState();
  $("pulleyMass").value = pulleyG;
  $("holder1Mass").value = holder1G;
  $("holder2Mass").value = holder2G;

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
