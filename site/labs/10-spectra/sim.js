// Lab 10 sim: diffraction-grating bench viewer over real line data. Pick a
// source, aim the probe, mark lines, watch the data page fill, identify
// unknowns. Fun Mode jitters the marked wavelength like a real grating scale.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units, SP = LS.spectra;
  var LAB = "10-spectra";
  var WL_LO = 380, WL_HI = 720;

  var mode = LS.ui.getMode(LAB);
  var currentId = "bulb";
  var unknownId = null;        // hidden source while drilling
  var probeNm = null;
  var streak = 0, attempts = 0;

  // records[sourceKey] = array of marked readings {nm}
  var records = {};
  try {
    var saved = LS.store.load(LAB, "lines");
    if (saved && saved.rows) {
      saved.rows.forEach(function (r) {
        records[r[0]] = records[r[0]] || [];
        records[r[0]].push({ nm: parseFloat(r[1]), word: r[2] });
      });
    }
  } catch (e) {}

  // ---------- canvas ----------
  var cv = document.getElementById("scopeCanvas");
  var ctx = cv.getContext("2d");
  var dpr = window.devicePixelRatio || 1;
  function W() { return cv.clientWidth || 480; }
  function X(nm) { return 12 + (nm - WL_LO) / (WL_HI - WL_LO) * (W() - 24); }
  function nmAt(pxv) { return WL_LO + (pxv - 12) / (W() - 24) * (WL_HI - WL_LO); }

  var SPEC_TOP = 12, SPEC_BOT = 160, BAR_TOP = 170, AXIS_Y = 196;

  function activeSource() {
    return SP.sourceById(currentId === "unknown" && unknownId ? unknownId : currentId);
  }
  function recordKey() { return currentId === "unknown" ? "UNKNOWN" : currentId; }
  function displayName() {
    return currentId === "unknown"
      ? "Unknown specimen (identify it below)"
      : activeSource().name;
  }

  function normalizedMax(src) {
    // Brightness scaling so both faint lines and bright continua fill the view.
    var maxV = 0;
    for (var nm = WL_LO; nm <= WL_HI; nm += 1) {
      var v = SP.brightness(src, nm);
      if (v > maxV) maxV = v;
    }
    return maxV || 1;
  }

  function drawScope() {
    var w = W(), h = cv.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#07090f";
    ctx.fillRect(0, 0, w, h);

    var src = activeSource();
    var gmax = normalizedMax(src);

    // the spectrum strip
    for (var px = 12; px < w - 12; px += 2) {
      var nm = nmAt(px);
      var col = SP.wavelengthToRGB(U.clamp(nm, 380, 750));
      var v = U.clamp(SP.brightness(src, nm) / gmax, 0, 1);
      var y = U.clamp(v, 0, 1);
      // taller bar where brighter
      var top = SPEC_BOT - y * (SPEC_BOT - SPEC_TOP);
      ctx.fillStyle = "rgb(" +
        Math.round(col[0] * v + 12) + "," +
        Math.round(col[1] * v + 12) + "," +
        Math.round(col[2] * v + 14) + ")";
      ctx.fillRect(px, top, 2, SPEC_BOT - top);
      // the wavelength color also tints when faint: show a base color foot
      ctx.fillStyle = "rgba(" + col.join(",") + ",0.35)";
      ctx.fillRect(px, SPEC_BOT - 4, 2, 4);
    }

    // recorded chips for the active key
    (records[recordKey()] || []).forEach(function (m) {
      if (m.nm < WL_LO || m.nm > WL_HI) return;
      var mx = X(m.nm);
      ctx.strokeStyle = "rgba(255,255,255,.9)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mx, SPEC_TOP - 4); ctx.lineTo(mx, SPEC_TOP + 12);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "10px ui-monospace, Menlo, monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText(String(Math.round(m.nm)), mx, SPEC_TOP - 6);
    });

    // reference color bar (full rainbow, for color-word literacy)
    for (var bx = 12; bx < w - 12; bx += 2) {
      var cnm = nmAt(bx);
      ctx.fillStyle = "rgb(" + SP.wavelengthToRGB(U.clamp(cnm, 380, 750)).join(",") + ")";
      ctx.fillRect(bx, BAR_TOP, 2, 8);
    }

    // wavelength axis
    ctx.strokeStyle = "#8899b8"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(12, AXIS_Y); ctx.lineTo(w - 12, AXIS_Y); ctx.stroke();
    ctx.fillStyle = "#aab8d4"; ctx.font = "11px ui-monospace, Menlo, monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (var t = 400; t <= 700; t += 50) {
      ctx.beginPath();
      ctx.moveTo(X(t), AXIS_Y - 5); ctx.lineTo(X(t), AXIS_Y + 5);
      ctx.strokeStyle = "#8899b8"; ctx.stroke();
      ctx.fillText(t + " nm", X(t), AXIS_Y + 8);
    }
    ctx.textAlign = "left";
    ctx.fillStyle = "#8fa2c4"; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("grating viewport - " + displayName() +
      (mode === "fun" ? "  (Fun Mode: marked readings jitter)" : ""), 12, AXIS_Y + 26);

    // probe
    if (probeNm !== null) {
      var mx2 = X(probeNm);
      ctx.strokeStyle = "#fff"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(mx2, SPEC_TOP - 6); ctx.lineTo(mx2, SPEC_BOT + 6); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ---------- interactions ----------
  function pointerNm(ev) {
    var r = cv.getBoundingClientRect();
    return U.clamp(nmAt(ev.clientX - r.left), WL_LO, WL_HI);
  }
  var scrubbing = false;
  cv.addEventListener("pointerdown", function (ev) {
    scrubbing = true;
    cv.setPointerCapture(ev.pointerId);
    setProbe(pointerNm(ev));
  });
  cv.addEventListener("pointermove", function (ev) {
    if (scrubbing) setProbe(pointerNm(ev));
  });
  cv.addEventListener("pointerup", function () { scrubbing = false; });

  function setProbe(nm) {
    probeNm = nm;
    var shown = mode === "fun" ? nm + jitter(1.5) : nm;
    document.getElementById("probeRead").textContent = U.round(shown, 1) + " nm";
    drawScope();
  }
  function jitter(amp) { return (Math.random() - 0.5) * 2 * amp; }

  document.getElementById("markBtn").addEventListener("click", function () {
    if (probeNm === null) {
      document.getElementById("recorderNote").textContent =
        "Aim the probe at a bright line first (click the spectrum).";
      return;
    }
    var key = recordKey();
    var raw = mode === "fun" ? probeNm + jitter(4) : probeNm;
    raw = U.round(U.clamp(raw, WL_LO, WL_HI), 1);
    records[key] = records[key] || [];
    // merge with a nearby existing reading: one mark per visual line
    var near = null;
    records[key].forEach(function (m) {
      if (Math.abs(m.nm - raw) < 3 && !near) near = m;
    });
    if (near) {
      near.nm = U.round((near.nm + raw) / 2, 1);
    } else {
      records[key].push({ nm: raw, word: SP.wordForNm(raw) });
    }
    persist();
    document.getElementById("recorderNote").textContent =
      "Recorded " + raw + " nm as \"" + SP.wordForNm(raw) + "\" for " + displayName() +
      ". Marks within 3 nm merge; that is the resolution of the human eye plus this scale.";
  });
  document.getElementById("undoMark").addEventListener("click", function () {
    var key = recordKey();
    if (records[key]) records[key].pop();
    persist();
  });

  function persist() {
    var rows = [];
    Object.keys(records).forEach(function (k) {
      records[k].forEach(function (m) { rows.push([k, m.nm, m.word]); });
    });
    LS.store.save(LAB, "lines", ["source", "marked_nm", "color_word"], rows);
    renderChart();
    drawScope();
  }

  function renderChart() {
    var rows = [];
    SP.sources.forEach(function (src) {
      var ms = (records[src.id] || []).slice().sort(function (a, b) { return a.nm - b.nm; });
      if (!ms.length) return;
      rows.push([
        src.name,
        ms.map(function (m) { return Math.round(m.nm); }).join(" "),
        Math.round(ms[0].nm), Math.round(ms[ms.length - 1].nm),
        Math.round(ms[ms.length - 1].nm - ms[0].nm)
      ]);
    });
    if (records.UNKNOWN && records.UNKNOWN.length) {
      var um = records.UNKNOWN.slice().sort(function (a, b) { return a.nm - b.nm; });
      rows.push(["Unknown specimen",
        um.map(function (m) { return Math.round(m.nm); }).join(" "),
        Math.round(um[0].nm), Math.round(um[um.length - 1].nm),
        Math.round(um[um.length - 1].nm - um[0].nm)]);
    }
    document.getElementById("chartWrap").innerHTML = rows.length
      ? LS.store.tableHTML(["source", "your marked lines (nm)", "outer violet", "outer red", "you subtract"], rows)
      : "<p class='muted'>Nothing recorded yet. The chart fills as you mark lines.</p>";
  }

  document.getElementById("exportCsv").addEventListener("click", function () {
    var rows = [];
    Object.keys(records).forEach(function (k) {
      records[k].forEach(function (m) { rows.push([k, m.nm, m.word]); });
    });
    LS.store.exportCSV("lab10-spectral-lines.csv",
      ["source", "marked_nm", "color_word"], rows,
      document.getElementById("csvCopy"));
  });
  document.getElementById("clearAll").addEventListener("click", function () {
    records = {};
    LS.store.clear(LAB, "lines");
    document.getElementById("csvCopy").style.display = "none";
    persist();
  });

  // ---------- unknown drill ----------
  var GAS_IDS = ["h", "he", "ne", "hg", "kr"];
  document.getElementById("dealUnknown").addEventListener("click", function () {
    unknownId = GAS_IDS[Math.floor(Math.random() * GAS_IDS.length)];
    currentId = "unknown";
    records.UNKNOWN = [];
    persist();
    setActiveButton();
    updateChrome();
    document.getElementById("guessFeedback").textContent = "";
    document.getElementById("guessFeedback").className = "feedback";
    document.getElementById("matchDetail").textContent = "";
  });
  document.getElementById("guessBtn").addEventListener("click", function () {
    if (!unknownId) {
      document.getElementById("guessFeedback").textContent = "Deal an unknown first.";
      return;
    }
    var guess = document.getElementById("guessPick").value;
    attempts++;
    var fb = document.getElementById("guessFeedback");
    var marks = records.UNKNOWN || [];
    var truth = SP.sourceById(unknownId);
    // scoring detail: how well do the student's marks cover the truth lines
    var matched = 0;
    marks.forEach(function (m) {
      if (truth.lines.some(function (l) { return Math.abs(l.nm - m.nm) <= 6; })) matched++;
    });
    var detail = marks.length
      ? "Your " + U.plural(marks.length, "marked line") + " matched " + matched +
        " against " + truth.name + " reference lines (6 nm tolerance)."
      : "No lines recorded; identification graded on the guess alone.";
    document.getElementById("matchDetail").textContent = detail;
    if (guess === unknownId) {
      streak++;
      fb.className = "feedback ok";
      fb.textContent = "Correct: " + truth.name + ". " +
        (marks.length
          ? (matched === marks.length ? "Every one of your readings was on a real line." :
            (marks.length - matched) + " of your readings sat on nothing - misread the scale?")
          : "Solved by eye alone. Now prove it with marked lines next time.");
      unknownId = null;   // revealed
      currentId = currentId === "unknown" ? "bulb" : currentId;
      setActiveButton();
    } else {
      streak = 0;
      fb.className = "feedback nope";
      fb.textContent = "Not it. Mark the line positions, compare the outer difference and " +
        "the colors against your own records, then submit again.";
    }
    document.getElementById("streakLine").textContent =
      "Streak " + streak + " (best " + Math.max(streak, Number(localStorage.getItem(LAB + ".best") || 0)) + ")" +
      " | guesses: " + attempts;
    try {
      var best = Number(localStorage.getItem(LAB + ".best") || 0);
      if (streak > best) localStorage.setItem(LAB + ".best", String(streak));
    } catch (e) {}
    drawScope();
  });

  // ---------- source buttons ----------
  var btnWrap = document.getElementById("srcBtns");
  SP.sources.forEach(function (src) {
    var b = LS.ui.el("button", { type: "button", class: "action ghost src-btn", text: src.name, "data-id": src.id });
    b.addEventListener("click", function () {
      currentId = src.id;
      setActiveButton();
      updateChrome();
      drawScope();
    });
    btnWrap.appendChild(b);
  });
  function setActiveButton() {
    btnWrap.querySelectorAll(".src-btn").forEach(function (b) {
      var on = b.getAttribute("data-id") === currentId;
      b.style.background = on ? "#101b30" : "";
      b.style.color = on ? "#fff" : "";
    });
  }
  function updateChrome() {
    var src = activeSource();
    document.getElementById("srcBlurb").textContent =
      (currentId === "unknown"
        ? "Unknown tube loaded. Its lines are real data from the same NIST lists as every other source."
        : src.blurb) + "  [data: " + (src.citation || "model") + "]";
  }

  // ---------- boot ----------
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, document.getElementById("toolbar1"), function (m) {
    mode = m;
    drawScope();
  });
  LS.check.init(LAB);

  function resize() {
    cv.width = Math.round((cv.clientWidth || 480) * dpr);
    cv.height = Math.round(240 * dpr);
    drawScope();
  }
  window.addEventListener("resize", resize);
  resize();
  setActiveButton();
  updateChrome();
  renderChart();
})();
