// Lab 14 galaxy identification sim. All shape data, answer keys and seeded
// orderings come from LS.galaxies (the frozen catalog); this file only draws,
// collects the student's calls, grades them through the module, logs them and
// exports CSV. No grading logic is reimplemented here.
//
// Bench 1 (Classify it): ten real galaxy photos in seeded order; pick Hubble
// family, plus a/b/c stage for spirals. Graded by LS.galaxies.gradeClassify,
// which reveals the catalogued reason (and a weak-bar note where relevant).
// Bench 2 (Identify it): ten seeded rounds, four name options each (target plus
// one per other family, so no two same-shape M-numbers tempt a lucky guess),
// graded by name against LS.galaxies.identifyPass.
//
// Ideal Mode shows each photo sharp. Fun Mode first blurs it and makes you press
// Focus - eye training only; the graded pixels and the answers are unchanged.
// Every image carries its Wikimedia Commons credit + licence line; the full
// per-file attribution lives in ATTRIBUTION.md.
(function () {
  "use strict";
  var LS = window.LS, G = LS.galaxies;
  var LAB = "14-galaxy-id";
  var IMG_BASE = "../../img/";
  var $ = function (id) { return document.getElementById(id); };

  var mode = LS.ui.getMode(LAB);
  var LOG_HEADER = ["bench", "round", "object", "your_call", "correct_answer", "verdict"];

  // ---------- shared log ----------
  var log = [];
  try {
    var saved = LS.store.load(LAB, "log");
    if (saved && saved.rows) log = saved.rows;
  } catch (e) {}
  function logRow(bench, round, object, your, correct, verdict) {
    log.push([bench, round, object, your, correct, verdict]);
    LS.store.save(LAB, "log", LOG_HEADER, log);
    renderLog();
  }
  function renderLog() {
    if (!log.length) {
      $("logTable").innerHTML = "<p class='muted'>Nothing logged yet. Answer the " +
        "benches and every graded call - your call, the correct answer and the " +
        "verdict - stacks up here, survives a reload, and exports to CSV from " +
        "either bench.</p>";
      return;
    }
    $("logTable").innerHTML = LS.store.tableHTML(LOG_HEADER, log);
  }
  function exportLog(filename, which, textarea) {
    var rows = log.filter(function (r) { return r[0] === which; });
    LS.store.exportCSV(filename, LOG_HEADER, rows, textarea);
  }
  $("logClear").addEventListener("click", function () {
    log = [];
    LS.store.clear(LAB, "log");
    $("csvB1").style.display = "none";
    $("csvB2").style.display = "none";
    renderLog();
  });

  // ---------- image + credit helpers ----------
  function creditHTML(entry, reveal) {
    var line = "Image: " + entry.credit + " &middot; " + entry.licenseShortName +
      " &middot; via Wikimedia Commons";
    if (reveal) {
      line += ' &middot; <a href="' + entry.sourceUrl +
        '" target="_blank" rel="noopener">source file</a><br>' +
        "<em>" + entry.caption + "</em>";
    }
    return line;
  }
  // In-bench credit shows only author + licence (never the object name) so the
  // image stays unidentified until the student answers.
  function mountImage(imgEl, creditEl, focusBtn, src, creditRevealed, entry) {
    imgEl.src = src;
    imgEl.alt = creditRevealed ? ("photo of " + entry.name + ": " + entry.caption)
      : "unidentified galaxy";
    creditEl.innerHTML = creditHTML(entry, creditRevealed);
    applyFocus(imgEl, focusBtn);
  }
  function applyFocus(imgEl, focusBtn) {
    if (mode === "fun") {
      imgEl.classList.add("out-of-focus");
      focusBtn.hidden = false;
    } else {
      imgEl.classList.remove("out-of-focus");
      focusBtn.hidden = true;
    }
  }
  focusWire($("b1Img"), $("b1Focus"));
  focusWire($("b2Img"), $("b2Focus"));
  function focusWire(imgEl, btn) {
    btn.addEventListener("click", function () {
      imgEl.classList.remove("out-of-focus");
      btn.hidden = true;
    });
  }

  // =========================================================
  // BENCH 1 - Classify it
  // =========================================================
  var famLabels = { "E": "E (elliptical)", "S": "S (spiral)", "SB": "SB (barred)", "Irr/pec": "Irr/pec" };
  var b1 = { seed: 14, order: [], idx: 0, ok: 0, n: 0, fam: null, sub: null, answered: false };

  function b1BuildOptions() {
    var famBox = $("b1Fams"); famBox.innerHTML = "";
    G.FAMILIES.forEach(function (f) {
      var b = LS.ui.el("button", { type: "button", text: famLabels[f], "data-f": f });
      b.addEventListener("click", function () {
        if (b1.answered) return;
        b1.fam = f;
        Array.prototype.forEach.call(famBox.children, function (x) { x.classList.toggle("on", x === b); });
        $("b1Check").disabled = false;
      });
      famBox.appendChild(b);
    });
    var subBox = $("b1Subs"); subBox.innerHTML = "";
    G.SUB_CHOICES.forEach(function (s) {
      var b = LS.ui.el("button", { type: "button", text: s, "data-s": s });
      b.addEventListener("click", function () {
        if (b1.answered) return;
        b1.sub = s;
        Array.prototype.forEach.call(subBox.children, function (x) { x.classList.toggle("on", x === b); });
      });
      subBox.appendChild(b);
    });
  }
  function b1Render() {
    if (b1.idx >= b1.order.length) return b1Finish();
    var entry = G.byKey(b1.order[b1.idx]);
    b1.fam = null; b1.sub = null; b1.answered = false;
    $("b1Progress").textContent = (b1.idx + 1) + " / " + b1.order.length;
    $("b1Score").textContent = b1.ok + " / " + b1.n;
    mountImage($("b1Img"), $("b1Credit"), $("b1Focus"), IMG_BASE + entry.img, false, entry);
    Array.prototype.forEach.call($("b1Fams").children, function (x) { x.classList.remove("on"); x.disabled = false; });
    Array.prototype.forEach.call($("b1Subs").children, function (x) { x.classList.remove("on"); x.disabled = false; });
    $("b1Check").disabled = true; $("b1Check").hidden = false;
    $("b1Next").hidden = true;
    $("b1Feedback").className = "feedback"; $("b1Feedback").textContent = "";
    $("b1Reveal").innerHTML = "";
  }
  function b1Finish() {
    $("b1Progress").textContent = "pass complete";
    $("b1Feedback").className = "feedback ok";
    $("b1Feedback").textContent = "Bench 1 done: " + b1.ok + " / " + b1.order.length +
      " classified correctly. Redo this order to tighten up, or New set to reshuffle.";
    $("b1Check").hidden = true; $("b1Next").hidden = true;
    $("b1Img").removeAttribute("src");
    $("b1Credit").innerHTML = "";
  }
  $("b1Check").addEventListener("click", function () {
    if (b1.answered || !b1.fam) return;
    var entry = G.byKey(b1.order[b1.idx]);
    var res = G.gradeClassify(entry, b1.fam, b1.sub);
    b1.answered = true; b1.n++; if (res.ok) b1.ok++;
    Array.prototype.forEach.call($("b1Fams").children, function (x) { x.disabled = true; });
    Array.prototype.forEach.call($("b1Subs").children, function (x) { x.disabled = true; });

    var yourCall = famLabels[b1.fam] + (res.needsSub ? (b1.sub ? " " + b1.sub : " ?") : "");
    var correctCall = famLabels[entry.family] + (res.needsSub ? " " + entry.hubStep : "");
    var fb = $("b1Feedback");
    if (res.ok) {
      fb.className = "feedback ok";
      fb.textContent = "Right - " + entry.name + " is " + entry.hubStep + ". " + res.reason;
    } else {
      fb.className = "feedback nope";
      var what = !res.familyOK ? "family" : "stage";
      fb.textContent = "Not quite (the " + what + " is off). " + entry.name +
        " is catalogued " + entry.hubStep + ". " + res.reason;
    }
    if (res.note) fb.textContent += " Note: " + res.note;

    mountImage($("b1Img"), $("b1Credit"), $("b1Focus"), IMG_BASE + entry.img, true, entry);
    $("b1Reveal").innerHTML = LS.store.tableHTML(
      ["object", "family", "Hubble stage", "constellation", "distance (Mly, approx)", "size (arcmin, approx)", "V mag (approx)"],
      [[entry.name, entry.family, entry.hubStep, entry.constellation,
        entry.approxDistanceMly, entry.approxSizeArcmin, entry.vmag]]);
    $("b1Score").textContent = b1.ok + " / " + b1.n;
    $("b1Check").hidden = true;
    $("b1Next").hidden = false;
    logRow("classify", b1.idx + 1, entry.name, yourCall, correctCall, res.ok ? "yes" : "no");
  });
  $("b1Next").addEventListener("click", function () { b1.idx++; b1Render(); });
  $("b1Reset").addEventListener("click", function () { b1Start(b1.seed); });
  $("b1Shuffle").addEventListener("click", function () { b1Start((b1.seed * 7 + 13) >>> 0); });
  function b1Start(seed) {
    b1.seed = seed;
    b1.order = G.classifyOrder(seed);
    b1.idx = 0; b1.ok = 0; b1.n = 0;
    b1Render();
  }

  // =========================================================
  // BENCH 2 - Identify it
  // =========================================================
  var b2 = { seed: 91, rounds: [], idx: 0, ok: 0, n: 0, notes: [], answered: false };
  function b2Render() {
    if (b2.idx >= b2.rounds.length) return b2Finish();
    var round = b2.rounds[b2.idx];
    var entry = G.byKey(round.key);
    b2.answered = false;
    $("b2Progress").textContent = (b2.idx + 1) + " / " + b2.rounds.length;
    $("b2Score").textContent = b2.ok + " / " + b2.n;
    mountImage($("b2Img"), $("b2Credit"), $("b2Focus"), IMG_BASE + entry.img, false, entry);
    var box = $("b2Options"); box.innerHTML = "";
    round.options.forEach(function (name) {
      var b = LS.ui.el("button", { type: "button", text: name });
      b.addEventListener("click", function () { b2Pick(name, round); });
      box.appendChild(b);
    });
    $("b2Feedback").className = "feedback"; $("b2Feedback").textContent = "";
    $("b2Next").hidden = true;
  }
  function b2Pick(name, round) {
    if (b2.answered) return;
    b2.answered = true; b2.n++;
    var ok = name === round.answer;
    if (ok) b2.ok++;
    var box = $("b2Options");
    Array.prototype.forEach.call(box.children, function (b) {
      b.disabled = true;
      if (b.textContent === round.answer) b.classList.add("on");
    });
    var entry = G.byKey(round.key);
    var fb = $("b2Feedback");
    if (ok) {
      fb.className = "feedback ok";
      fb.textContent = "Correct - that is " + round.answer + ". " + entry.caption;
    } else {
      fb.className = "feedback nope";
      fb.textContent = "That one is " + round.answer + ", not " + name + ". " + entry.caption;
    }
    mountImage($("b2Img"), $("b2Credit"), $("b2Focus"), IMG_BASE + entry.img, true, entry);
    $("b2Score").textContent = b2.ok + " / " + b2.n;
    b2.notes.push([b2.idx + 1, round.answer, name, ok ? "yes" : "no"]);
    $("b2Notes").innerHTML = LS.store.tableHTML(
      ["round", "correct name", "your pick", "correct?"], b2.notes);
    $("b2Next").hidden = false;
    logRow("identify", b2.idx + 1, round.answer, name, round.answer, ok ? "yes" : "no");
  }
  function b2Finish() {
    $("b2Progress").textContent = "pass complete";
    $("b2Feedback").className = "feedback ok";
    $("b2Feedback").textContent = "Bench 2 done: " + b2.ok + " / " + b2.rounds.length +
      " identified. Your field notes are below - export them as CSV for your notes.";
    $("b2Next").hidden = true;
    $("b2Img").removeAttribute("src");
    $("b2Credit").innerHTML = "";
  }
  $("b2Next").addEventListener("click", function () { b2.idx++; b2Render(); });
  $("b2Reset").addEventListener("click", function () { b2Start(b2.seed); });
  $("b2Shuffle").addEventListener("click", function () { b2Start((b2.seed * 7 + 13) >>> 0); });
  function b2Start(seed) {
    b2.seed = seed;
    b2.rounds = G.identifyPass(seed);
    b2.idx = 0; b2.ok = 0; b2.n = 0; b2.notes = []; b2.answered = false;
    $("b2Notes").innerHTML = "";
    b2Render();
  }

  // ---------- CSV export ----------
  $("b1Export").addEventListener("click", function () {
    exportLog("lab14-classify.csv", "classify", $("csvB1"));
  });
  $("b2Export").addEventListener("click", function () {
    exportLog("lab14-identify.csv", "identify", $("csvB2"));
  });

  // ---------- boot ----------
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (m) {
    mode = m;
    applyFocus($("b1Img"), $("b1Focus"));
    applyFocus($("b2Img"), $("b2Focus"));
  });
  LS.check.init(LAB);
  b1BuildOptions();
  b1Start(b1.seed);
  b2Start(b2.seed);
  renderLog();
})();
