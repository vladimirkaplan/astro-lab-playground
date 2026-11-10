// Variable stars and Cepheids lab sim. Bench 1 is the light-curve bench: a
// public catalog star's raw magnitude-vs-time points plus model curve, with a
// phase-fold strip driven by a log period slider and a live phase-dispersion
// (PDM) readout, so the student drags until the fold snaps knife-thin. Bench 2
// is "be Leavitt": a hidden synthetic cluster Cepheid (seeded series from
// LS.variables.magnitudeAt), no period given - the student folds, reads the
// mean magnitude, and the page grades the full two-step reduction
// (period -> PL line -> modulus -> distance) against the truth and logs it.
// All physics lives in LS.variables; this file only draws and grades. Fun Mode
// adds seeded +-0.05 mag photometric scatter, identical on every reload.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units, V = LS.variables;
  var LAB = "13-variables";
  var $ = function (id) { return document.getElementById(id); };

  var mode = LS.ui.getMode(LAB);
  var SCATTER = 0.05;                  // mag of seeded photometric noise
  var MEAN_SHIFT = 4.5;                // faintens bench-2 archetypes to cluster distance
  var H_LC = 300, H_FOLD = 170;
  var dpr = window.devicePixelRatio || 1;
  var KNIFE_RATIO = 1.6, SMEAR_RATIO = 3.2;   // verdicts vs best grid theta^2

  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function fmtP(p) {
    return String(U.round(p, p < 1 ? 3 : p < 10 ? 2 : p < 100 ? 1 : 0));
  }
  function fmtD(pc) {
    return pc < 10000
      ? U.round(pc, 0) + " pc"
      : U.round(pc / 1000, 2) + " kpc";
  }
  function niceStep(span, want) {
    var raw = span / want;
    var p = Math.pow(10, Math.floor(Math.log10(raw)));
    var m = raw / p;
    return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p;
  }
  // one star entry -> magnitude scale for both panels (inverted axis: the
  // brightest, numerically smallest magnitude sits at the top edge)
  function scaleFor(entry) {
    var mid = (entry.minMag + entry.maxMag) / 2;
    var half = (entry.minMag - entry.maxMag) / 2;
    var pad = Math.max(0.3, (entry.minMag - entry.maxMag) * 0.12);
    return { top: mid - half - pad, bot: mid + half + pad };
  }
  function starByName(n) {
    for (var i = 0; i < V.CATALOG.length; i++) if (V.CATALOG[i].name === n) return V.CATALOG[i];
    return null;
  }
  // times are seeded identically in both modes; only the scatter stream is
  // added in Fun Mode, so switching modes never reshuffles the "plates"
  function seededSeries(entry, seedTag, n, cycles, seedExtra) {
    var rt = U.mulberry32(hashStr(seedTag) ^ (seedExtra || 0));
    var rs = U.mulberry32((hashStr(seedTag) ^ 0xBEEF00) + 7);
    var span = cycles * entry.periodDays;
    var times = [], mags = [];
    for (var i = 0; i < n; i++) {
      var t = span * (i + 0.5 + (rt() - 0.5) * 0.9) / n;
      var m = V.magnitudeAt(entry, t / entry.periodDays);
      if (mode === "fun") m += (rs() - 0.5) * 2 * SCATTER;
      times.push(t);
      mags.push(m);
    }
    return { times: times, mags: mags, span: span };
  }

  // ---------- shared canvas renderer for both benches ----------
  // o: { title, scale, xspan, xtick, xfmt, model(t)->mag|null, times, mags,
  //      overlay: {tagLine, ratioLine}|null }
  function drawCurve(cv, ctx, H, o) {
    var w = cv.width / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, H);
    ctx.fillStyle = "#0d1526";
    ctx.fillRect(0, 0, w, H);
    var L = 52, R = 12, T = 34, B = 26;
    var pw = w - L - R, ph = H - T - B;
    var X = function (t) { return L + (t / o.xspan) * pw; };
    var Y = function (m) { return T + (m - o.scale.top) / (o.scale.bot - o.scale.top) * ph; };

    ctx.strokeStyle = "#33456b"; ctx.lineWidth = 1;
    ctx.strokeRect(L, T, pw, ph);
    ctx.font = "10px system-ui, sans-serif";
    var ms = niceStep(o.scale.bot - o.scale.top, 5);
    var i0 = Math.ceil(o.scale.top / ms), i1 = Math.floor(o.scale.bot / ms);
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (var gi = i0; gi <= i1; gi++) {
      var g = gi * ms, y = Y(g);
      ctx.strokeStyle = "#22304c";
      ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + pw, y); ctx.stroke();
      ctx.fillStyle = "#6d7fa3";
      ctx.fillText(String(U.round(g, 2)), L - 5, y);
    }
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    var xs = niceStep(o.xspan, o.xtick || 6);
    for (var xi = 0; xi <= o.xspan / xs + 1e-9; xi++) {
      var xv = xi * xs, x = X(xv);
      if (x > L + pw + 1) break;
      ctx.strokeStyle = "#22304c";
      ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, T + ph); ctx.stroke();
      ctx.fillStyle = "#6d7fa3";
      ctx.fillText(o.xfmt(xv), x, T + ph + 4);
    }

    if (o.model) {
      ctx.strokeStyle = "rgba(159,208,255,.55)"; ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (var s = 0; s <= 400; s++) {
        var mx = L + pw * s / 400;
        var my = Y(o.model(o.xspan * s / 400));
        if (s === 0) ctx.moveTo(mx, my); else ctx.lineTo(mx, my);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = "#cfe0ff";
    for (var i = 0; i < o.times.length; i++) {
      ctx.beginPath();
      ctx.arc(X(o.times[i]), Y(o.mags[i]), 2.8, 0, 6.29);
      ctx.fill();
    }

    ctx.fillStyle = "#cfe0ff"; ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(o.title, 12, 8);
    ctx.fillStyle = mode === "fun" ? "#ff9c9c" : "#6d7fa3";
    ctx.font = "10.5px system-ui, sans-serif";
    ctx.fillText(o.tag || (mode === "fun"
      ? "Fun Mode: +/- 0.05 mag seeded scatter on every point"
      : "Ideal Mode: points on the exact model"), 12, 21);
    if (o.ratioLine) {
      ctx.fillStyle = o.ratioColor || "#ffd76e";
      ctx.textAlign = "right";
      ctx.fillText(o.ratioLine, w - 12, 21);
    }
  }

  // ================= bench 1: fold it until it snaps =================
  var b1 = {
    entry: starByName("Delta Cephei"),
    series: null,
    gridBest: 1e-9
  };
  var SR1 = { lo: -0.602, hi: 2.778 };     // log10 period: 0.25 - 600 d
  function trialP1() { return Math.pow(10, parseFloat($("foldRange1").value)); }

  function b1Prepare() {
    b1.series = seededSeries(b1.entry, "b1-" + b1.entry.name, 64, 3.4);
    // reference sharpness: best theta^2 over a fixed log grid of trial periods
    var best = Infinity;
    for (var i = 0; i < 160; i++) {
      var p = 0.25 * Math.pow(600 / 0.25, i / 159);
      var t = V.pdm(V.fold(b1.series.times, p, 0, b1.series.mags));
      if (isFinite(t) && t < best) best = t;
    }
    b1.gridBest = best || 1e-9;
  }

  var FAMILY_CALL = {
    cepheid: "Classical Cepheid: sawtooth pulse - fast rise over about a third " +
      "of the cycle, slow decline. Its period sets its luminosity on the " +
      "period-luminosity line.",
    rrlyrae: "RR Lyrae star: a hatchet-shaped half-day sawtooth from an old, " +
      "low-mass pulsator. Its own fixed candle power near +0.65 - it is not on " +
      "the Cepheid line.",
    mira: "Mira variable: a dusty red giant rolling five magnitudes over nearly " +
      "a year. Beautiful, but its light curve depends on dust and convection - " +
      "never a yardstick.",
    eclipsing: "Eclipsing binary: flat outside two narrow dips. Something passes " +
      "in front - the period is an orbit, and dip depth is geometry, not " +
      "luminosity."
  };

  function drawB1() {
    var e = b1.entry, S = b1.series, sc = scaleFor(e);
    drawCurve($("lc1"), $("lc1").getContext("2d"), H_LC, {
      title: e.name + " - raw light curve (mag up = brighter)",
      scale: sc, xspan: S.span,
      xfmt: function (v) { return String(U.round(v, v < 10 ? 1 : 0)); },
      model: function (t) { return V.magnitudeAt(e, t / e.periodDays); },
      times: S.times, mags: S.mags
    });
    var P = trialP1();
    var folded = V.fold(S.times, P, 0, S.mags);
    var theta = V.pdm(folded);
    var ratio = theta / b1.gridBest;
    var ecl = e.family === "eclipsing";
    var verdict;
    if (ecl) {
      verdict = "theta^2 is a weak judge for eclipsing binaries: a flat light " +
        "curve has little scatter to disperse. Judge with your eyes - a thin " +
        "fold with one deep dip and one shallow dip is a clean orbit.";
    } else if (ratio <= KNIFE_RATIO) {
      verdict = "KNIFE-THIN fold: your trial period is the star's pulse period.";
    } else if (ratio <= SMEAR_RATIO) {
      verdict = "SMEARING: each phase carries two brightnesses. Nudge the " +
        "slider - the sawtooth snaps out of the blob at the true period.";
    } else {
      verdict = "BLOB: at this trial period every phase gets the star at an " +
        "unrelated brightness. Search.";
    }
    drawCurve($("fold1"), $("fold1").getContext("2d"), H_FOLD, {
      title: "folded at trial period " + fmtP(P) + " d - brightness vs phase",
      scale: sc, xspan: 1, xtick: 4,
      xfmt: function (v) { return String(U.round(v, 2)); },
      model: function (ph) { return V.magnitudeAt(e, ph); },
      times: folded.phase, mags: folded.mag,
      tag: "points = every observation wrapped onto one trial cycle",
      ratioLine: ecl ? "dips are the orbit"
        : (ratio <= KNIFE_RATIO ? "SNAPPED" : ratio <= SMEAR_RATIO ? "smeared" : "blob"),
      ratioColor: ratio <= KNIFE_RATIO && !ecl ? "#7fe08f"
        : ratio <= SMEAR_RATIO ? "#ffd76e" : "#ff9c9c"
    });
    $("p1Read").textContent = fmtP(P);
    $("r1P").textContent = "trial period " + fmtP(P) + " d  |  catalog star: " +
      e.name + ", period on record: " + e.periodDays + " d";
    $("r1Theta").textContent = "theta^2 = " + (isFinite(theta) ? U.round(theta, 3) : "off") +
      "  (" + (isFinite(theta) ? U.round(ratio, 2) : "-") + "x the sharpest fold on record here)" +
      (mode === "fun" ? "  |  Fun Mode floor: scatter keeps theta^2 > 0" : "") +
      "\n" + verdict;
    $("r1Family").textContent = FAMILY_CALL[e.family] + "  " + e.note;
  }

  function setB1(name) {
    b1.entry = starByName(name);
    b1Prepare();
    drawB1();
  }
  $("foldRange1").addEventListener("input", drawB1);
  Array.prototype.forEach.call(document.querySelectorAll(".preset"), function (b) {
    b.addEventListener("click", function () { setB1(b.getAttribute("data-star")); });
  });

  // ================= bench 2: be Leavitt =================
  // Three synthetic cluster Cepheids: real period and amplitude from the three
  // archetypes, mean magnitude pushed out to a few kpc. Mira-type targets are
  // excluded by construction; the PL line's own RangeError is the teaching
  // moment when a student wanders the slider onto a non-Cepheid period.
  var SR2 = { lo: -0.398, hi: 2.550 };     // 0.4 - 355 d
  var SR2_STEP_COUNT = 2000;               // searchPeriod coarse sweep steps
  var b2 = {
    order: (function () {
      var o = [0, 1, 2];
      var r = U.mulberry32(0x1EA917);
      for (var i = o.length - 1; i > 0; i--) {
        var jx = Math.floor(r() * (i + 1)), t = o[i]; o[i] = o[jx]; o[jx] = t;
      }
      return o;
    })(),
    idx: -1, label: "", entry: null, series: null,
    truth: null, best: null, done: false
  };
  function trialP2() { return Math.pow(10, parseFloat($("foldRange2").value)); }
  function trialP2OrNull() {
    var p = trialP2();
    return p >= V.PL_MIN_PERIOD && p <= V.PL_MAX_PERIOD ? p : null;
  }
  function meanInput() {
    var raw = $("meanB2").value;
    if (raw === null || String(raw).trim() === "") return null;
    var x = LS.check.parseNumber(raw);
    return isFinite(x) ? x : null;
  }

  function newTarget() {
    b2.idx = (b2.idx + 1) % b2.order.length;
    var src = V.CATALOG.filter(function (c) { return c.family === "cepheid"; })[b2.order[b2.idx]];
    b2.label = String.fromCharCode(65 + b2.idx);
    var m = src.meanMag + MEAN_SHIFT;      // 8.40 for all three: same LOOK, different stars
    b2.entry = {
      name: "Cluster Cepheid " + b2.label,
      family: "cepheid",
      periodDays: src.periodDays,
      minMag: m + src.ampMag / 2,
      maxMag: m - src.ampMag / 2
    };
    b2.series = seededSeries(b2.entry, "b2-" + b2.label, 112, 3.6, 7);
    var M = V.plAbsoluteMag(src.periodDays);
    var mu = V.distanceModulus(m, M);
    b2.truth = { P: src.periodDays, M: M, mu: mu, d: V.distanceFromModulus(mu), meanMag: m, kind: src.name };
    b2.best = null;
    b2.done = false;
    $("bestBtn").disabled = false;
    $("checkBtn2").disabled = false;
    $("r2Best").textContent = "Not run yet.";
    $("r2Verdict").textContent = "-";
    $("r2Target").textContent = "Target " + b2.label + ": " + b2.series.times.length +
      " magnitude measurements across " + U.round(b2.series.span, 1) +
      " nights. Period, identity and cluster distance hidden until you check. " +
      "All three targets sit near the same mean magnitude - Leavitt's twist: same LOOK, different stars.";
    drawB2();
  }

  function drawB2() {
    if (!b2.entry) {
      [[ "lc2", H_LC ], [ "fold2", H_FOLD ]].forEach(function (pair) {
        var cv = $(pair[0]), ctx = cv.getContext("2d");
        var w = cv.width / dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, pair[1]);
        ctx.fillStyle = "#0d1526"; ctx.fillRect(0, 0, w, pair[1]);
        ctx.fillStyle = "#8fa4c9"; ctx.font = "13px system-ui, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("Press \"Draw a hidden cluster Cepheid\" to begin.", w / 2, pair[1] / 2);
      });
      $("p2Read").textContent = fmtP(trialP2());
      $("r2P").textContent = $("r2M").textContent = $("r2MuD").textContent = "-";
      return;
    }
    var e = b2.entry, S = b2.series, sc = scaleFor(e);
    drawCurve($("lc2"), $("lc2").getContext("2d"), H_LC, {
      title: "Target " + b2.label + " - " + S.times.length + " measurements (no model given)",
      scale: sc, xspan: S.span,
      xfmt: function (v) { return String(U.round(v, 0)); },
      model: null, times: S.times, mags: S.mags
    });
    var P = trialP2();
    var folded = V.fold(S.times, P, 0, S.mags);
    var theta = V.pdm(folded);
    var pStr = trialP2OrNull();
    drawCurve($("fold2"), $("fold2").getContext("2d"), H_FOLD, {
      title: "folded at trial period " + fmtP(P) + " d - you decide if it snapped",
      scale: sc, xspan: 1, xtick: 4,
      xfmt: function (v) { return String(U.round(v, 2)); },
      model: null, times: folded.phase, mags: folded.mag,
      tag: "a sawtooth trace means your period is the pulse period",
      ratioLine: "theta^2 " + (isFinite(theta) ? U.round(theta, 3) : "off")
    });

    var mRead = meanInput();
    $("p2Read").textContent = fmtP(P);
    $("r2P").textContent = "folding at " + fmtP(P) + " d" +
      (pStr === null ? "  |  that trial period is OFF the Cepheid line - press Check anyway" : "");
    var Mm = null;
    if (pStr !== null) {
      Mm = V.plAbsoluteMag(pStr);
      $("r2M").textContent = "my M_V = " + U.round(Mm, 3) +
        " from M = " + V.PL_SLOPE + " log(P) + (" + V.PL_INTERCEPT + ")";
    } else {
      var probe;
      try { V.plAbsoluteMag(P); probe = null; }
      catch (err) { probe = err.message; }
      $("r2M").textContent = probe || "-";
    }
    if (Mm !== null && mRead !== null) {
      var mu = V.distanceModulus(mRead, Mm);
      var d = V.distanceFromModulus(mu);
      $("r2MuD").textContent = "mu = m - M = " + U.round(mRead, 2) + " - (" +
        U.round(Mm, 3) + ") = " + U.round(mu, 2) + " mag  ->  d = 10^((mu+5)/5) = " + fmtD(d);
    } else {
      $("r2MuD").textContent = mRead === null
        ? "type the mean magnitude you read off the top plot" : "-";
    }
  }

  $("foldRange2").addEventListener("input", drawB2);
  $("meanB2").addEventListener("input", drawB2);
  $("newTargetBtn").addEventListener("click", newTarget);

  $("bestBtn").addEventListener("click", function () {
    if (!b2.series) return;
    if (!b2.best) {
      b2.best = V.searchPeriod(b2.series.times, b2.series.mags,
        Math.pow(10, SR2.lo), Math.pow(10, SR2.hi), SR2_STEP_COUNT);
    }
    $("r2Best").textContent = "search: best period " + fmtP(b2.best.period) +
      " d at theta^2 = " + U.round(b2.best.pdm, 3) +
      ". If your slider disagrees by more than ~1%, re-fold: trust the sharp fold you can see.";
  });

  $("checkBtn2").addEventListener("click", function () {
    if (!b2.entry || b2.done) return;
    var P = trialP2();
    var mRead = meanInput();
    if (mRead === null) {
      $("r2Verdict").textContent = "Read the star's MEAN magnitude off the time plot " +
        "(middle of the curve's band, not its top or bottom) and type it in first.";
      return;
    }
    var Mm;
    try {
      Mm = V.plAbsoluteMag(P);
    } catch (err) {
      $("r2Verdict").textContent = "The period-luminosity line refuses your period: \"" +
        err.message + "\". This bench holds classical Cepheids - and that refusal is the " +
        "point: never run the line on a non-Cepheid period (RR Lyrae's 0.45 d or Mira's " +
        "332 d land you here). Fix the fold, then check again.";
      return;
    }
    var mu = V.distanceModulus(mRead, Mm);
    var d = V.distanceFromModulus(mu);
    var T = b2.truth;
    var errP = U.percentError(P, T.P);
    var errD = U.percentError(d, T.d);
    var revealed = "Target " + b2.label + " was a Cepheid of the " + T.kind +
      " class: period " + T.P + " d, mean mag " + U.round(T.meanMag, 2) +
      ". Line: M = " + U.round(T.M, 3) + ", modulus " + U.round(T.mu, 2) +
      ", cluster distance " + fmtD(T.d) + ".";
    var verdict;
    if (errD <= 5) {
      verdict = "Distance off by only " + U.round(errD, 1) + "% (period off " +
        U.round(errP, 1) + "%). You folded, calibrated, and sized a star cluster - " +
        "Leavitt's whole move, done by hand.";
    } else if (errD <= 15) {
      verdict = "Distance off by " + U.round(errD, 1) + "% (period off " +
        U.round(errP, 1) + "%). A solid reduction. The modulus is a power of ten " +
        "machine: every 0.1 mag of mean-magnitude misread or period slip is ~5% of distance.";
    } else {
      verdict = "Off by " + U.round(errD, 1) + "%. Walk the steps: is the fold actually " +
        "thin at your period (run the search)? Did you type the MEAN magnitude? M is " +
        "negative, so mu = m - M ADDS. And d = 10^((mu+5)/5) - the +5 is easy to lose.";
    }
    $("r2Target").textContent = revealed;
    $("r2Verdict").textContent = verdict;
    b2.done = true;
    $("checkBtn2").disabled = true;
    rows.push([b2.label, U.round(P, 3), U.round(mRead, 2), U.round(Mm, 3),
      U.round(d, 0), T.P, U.round(T.d, 0), U.round(errD, 1)]);
    LS.store.save(LAB, "log", HEADER, rows);
    renderLog();
  });

  // ================= log =================
  var HEADER = ["target", "period_measured_d", "mean_mag", "M_V",
    "distance_measured_pc", "true_period_d", "true_distance_pc", "error_pct"];
  var rows = [];
  try {
    var saved = LS.store.load(LAB, "log");
    if (saved && saved.rows) rows = saved.rows;
  } catch (e) {}

  function renderLog() {
    if (!rows.length) {
      $("logTable").innerHTML = "<p class='muted'>Nothing logged yet. Every checked " +
        "target lands here: your period, your mean magnitude, your M, your cluster " +
        "distance, the truth, and the graded error. The table survives a reload, and " +
        "CSV export gives you the reduction sheet you would hand in on paper.</p>";
      return;
    }
    $("logTable").innerHTML = LS.store.tableHTML(
      ["target", "my period (d)", "my mean mag", "my M_V", "my distance (pc)",
        "true period (d)", "true distance (pc)", "error %"], rows);
  }
  $("logCsv").addEventListener("click", function () {
    LS.store.exportCSV("variables-log.csv", HEADER, rows, $("csvFallback"));
  });
  $("logClear").addEventListener("click", function () {
    rows = [];
    LS.store.save(LAB, "log", HEADER, rows);
    $("csvFallback").style.display = "none";
    renderLog();
  });

  // ================= boot =================
  function drawAll() {
    drawB1();
    drawB2();
  }
  function resize() {
    [[ "lc1", H_LC ], [ "fold1", H_FOLD ], [ "lc2", H_LC ], [ "fold2", H_FOLD ]]
      .forEach(function (pair) {
        var cv = $(pair[0]);
        cv.width = Math.round(Math.max(320, cv.clientWidth || 520) * dpr);
        cv.height = Math.round(pair[1] * dpr);
      });
    drawAll();
  }
  window.addEventListener("resize", resize);

  // Both benches share one Ideal/Fun mode, so the two toolbar toggles mirror
  // each other: clicking either repaints the buttons in both toolbars.
  function setMode(mm) {
    mode = mm;
    b1Prepare();
    if (b2.label) b2.series = seededSeries(b2.entry, "b2-" + b2.label, 112, 3.6, 7);
    b2.best = null;
    $("r2Best").textContent = b2.entry ? "Not run yet." : "Not run yet.";
    syncToggles();
    drawAll();
  }
  function syncToggles() {
    Array.prototype.forEach.call(
      document.querySelectorAll(".mode-toggle .mode-btn"), function (b) {
        var on = (b.textContent.indexOf("Ideal") === 0) === (mode === "ideal");
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
  }

  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), setMode);
  LS.ui.modeToggle(LAB, $("toolbar2"), setMode);
  LS.check.init(LAB);
  b1Prepare();
  renderLog();
  resize();
  syncToggles();
})();
