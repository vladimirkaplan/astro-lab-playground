// Homework 2 practice page wiring. Builds two ratio tables (inverse-square
// gravity and constant-force second law) whose rows come fresh from
// LS.hwCore.genRatioTable each attempt, grades a whole table at once and reveals
// the worked law line only after the check, wires a live-ratio panel whose
// sliders drive the same solvers, logs every attempt with CSV export, and injects
// the six exam-style quiz payloads from LS.hw2Content into the Check tab before
// handing it to shared/check.js. DOM only - the math lives in hw-core.js and the
// authored quiz/law strings in hw2-content.js.
(function () {
  "use strict";
  var LS = window.LS;
  var U = LS.units, H = LS.hwCore, CT = LS.hw2Content, CHK = LS.check;
  var LAB = "hw2";
  var $ = function (id) { return document.getElementById(id); };

  var counter = 0;
  function nextSeed(tag) {
    counter += 1;
    return tag + "-" + Math.floor(Math.random() * 1e9).toString(36) + "-" + counter;
  }

  // Accept a decimal or a simple fraction: "0.6", "3/5", "1/16", "5".
  function parseRatio(t) {
    if (t === null || t === undefined) return NaN;
    var s = String(t).trim().replace(/\s+/g, "");
    var m = /^(-?\d+(?:\.\d+)?)(?:\/(-?\d+(?:\.\d+)?))?$/.exec(s);
    if (!m) return NaN;
    var a = parseFloat(m[1]);
    if (m[2] !== undefined) {
      var b = parseFloat(m[2]);
      if (b === 0) return NaN;
      return a / b;
    }
    return a;
  }

  // ================= log =================
  var HEADER = ["when", "bench", "given", "your answer", "correct answer", "result"];
  var rows = [];
  try {
    var saved = LS.store.load(LAB, "log");
    if (saved && saved.rows) rows = saved.rows;
  } catch (e) {}
  function stamp() { try { return new Date().toLocaleString(); } catch (e) { return ""; } }
  function log(bench, given, yours, truth, pass) {
    rows.push([stamp(), bench, given, String(yours), String(truth), pass]);
    if (rows.length > 400) rows = rows.slice(rows.length - 400);
    LS.store.save(LAB, "log", HEADER, rows);
    renderLog();
  }
  function renderLog() {
    var mount = $("logTable");
    if (!rows.length) {
      mount.innerHTML = "<p class='muted'>Nothing logged yet. Checking a table appends every " +
        "row you attempted - the given relation, what you typed, and the right answer - and the " +
        "live bench can log a snapshot. The table survives a reload; CSV export prints it. " +
        "Nothing leaves this browser.</p>";
      return;
    }
    mount.innerHTML = LS.store.tableHTML(
      ["when", "bench", "given", "your answer", "correct", "result"], rows);
  }

  // ================= ratio tables =================
  function renderTable(mountEl, tbl) {
    mountEl.innerHTML = "";
    var body = tbl.rows.map(function (row) {
      return "<tr><td>" + row.given + "</td><td>" + row.ask + "</td>" +
        "<td><input class='ratio-input' type='text' inputmode='text' " +
        "aria-label='your ratio' data-row='" + row.index + "'></td></tr>";
    }).join("");
    var head = "<tr><th>Given</th><th>Find</th><th>Your answer</th></tr>";
    var wrap = LS.ui.el("div");
    wrap.innerHTML = "<table class='data-table'>" + head + body + "</table>" +
      "<div class='law-line' hidden></div>";
    mountEl.appendChild(wrap);
    var inputs = {};
    wrap.querySelectorAll(".ratio-input").forEach(function (inp) {
      inputs[inp.getAttribute("data-row")] = inp;
    });
    var lawLine = wrap.querySelector(".law-line");
    lawLine.textContent = tbl.kind === "gravity" ? CT.LAW_GRAVITY : CT.LAW_ACCEL;
    return { rows: tbl.rows, inputs: inputs, lawLine: lawLine };
  }

  function checkTable(state, label) {
    if (!state) return;
    var pass = 0;
    state.rows.forEach(function (row) {
      var inp = state.inputs[row.index];
      var x = parseRatio(inp.value);
      var ok = isFinite(x) && H.withinTolerance(x, row.answer.value, row.tolerance);
      if (ok) pass++;
      inp.classList.toggle("ok", ok);
      inp.classList.toggle("nope", !ok);
      log(label, row.given, inp.value || "(blank)", row.answerText, ok ? "pass" : "check");
    });
    state.lawLine.hidden = false;
    return pass;
  }

  var grav = null, accel = null;
  function newTable(kind) {
    var tbl = H.genRatioTable(nextSeed(kind), kind, 8);
    if (kind === "gravity") {
      grav = renderTable($("grav-mount"), tbl);
      $("gravCheck").textContent = "Check table";
    } else {
      accel = renderTable($("accel-mount"), tbl);
      $("accelCheck").textContent = "Check table";
    }
  }
  function checkBench(state, btn, label) {
    if (!state) return;
    var pass = checkTable(state, label);
    btn.textContent = label + ": " + pass + " / " + state.rows.length + " - law shown below";
  }

  // ================= live-ratio bench =================
  function live() {
    var mR = parseFloat($("mRange").value);   // m1/m2
    var dR = parseFloat($("dRange").value);   // d1/d2
    if (!isFinite(mR) || mR <= 0) mR = 1;      // guard a blank/odd slider value
    if (!isFinite(dR) || dR <= 0) dR = 1;
    var aRatio = H.accelRatio(mR, 1);          // a1/a2 = m2/m1
    var fRatio = H.gravityRatio(dR, 1);        // F1/F2 = (d2/d1)^2
    $("mRead").textContent = U.round(mR, 2).toFixed(1);
    $("dRead").textContent = U.round(dR, 2).toFixed(1);
    $("roMRatio").textContent = U.round(mR, 3);
    $("roAratio").textContent = U.round(aRatio, 3);
    $("roDratio").textContent = U.round(dR, 3);
    $("roFratio").textContent = U.round(fRatio, 3);
    var equal = Math.abs(mR - 1) < 1e-9 && Math.abs(dR - 1) < 1e-9;
    $("liveNote").innerHTML = equal ?
      "Both sliders are 1.0, so a1/a2 and F1/F2 read exactly <b>1</b> - the " +
      "equal-inputs sanity row. Now move one slider and watch that ratio split." :
      "Equalise both sliders at 1.0 and every ratio snaps back to exactly 1.";
  }
  function logSnapshot() {
    var mR = parseFloat($("mRange").value), dR = parseFloat($("dRange").value);
    if (!isFinite(mR) || mR <= 0) mR = 1;
    if (!isFinite(dR) || dR <= 0) dR = 1;
    var aRatio = H.accelRatio(mR, 1), fRatio = H.gravityRatio(dR, 1);
    log("live-snapshot",
      "m1/m2 = " + U.round(mR, 2) + ", d1/d2 = " + U.round(dR, 2),
      "(live readout)",
      "a1/a2 = " + U.round(aRatio, 3) + ", F1/F2 = " + U.round(fRatio, 3),
      "snapshot");
  }

  // ================= boot =================
  function wire(id, fn) { if ($(id)) $(id).addEventListener("click", fn); }

  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();

  newTable("gravity");
  newTable("accel");
  renderLog();
  live();

  wire("gravNew", function () { newTable("gravity"); });
  wire("gravCheck", function () { checkBench(grav, $("gravCheck"), "Table A"); });
  wire("accelNew", function () { newTable("accel"); });
  wire("accelCheck", function () { checkBench(accel, $("accelCheck"), "Table B"); });
  wire("liveLog", logSnapshot);
  $("mRange").addEventListener("input", live);
  $("dRange").addEventListener("input", live);

  $("logCsv").addEventListener("click", function () {
    LS.store.exportCSV("homework2-practice-log.csv", HEADER, rows, $("csvFallback"));
  });
  $("logClear").addEventListener("click", function () {
    rows = [];
    LS.store.save(LAB, "log", HEADER, rows);
    $("csvFallback").style.display = "none";
    renderLog();
  });

  // Build the exam-style quiz, then let shared/check.js grade every .exercise.
  (function buildQuiz() {
    var mount = $("quiz-mount");
    CT.QUIZ.forEach(function (cfg) {
      var node = LS.ui.el("div", { class: "exercise" });
      node.setAttribute("data-ex", JSON.stringify(cfg));
      mount.appendChild(node);
    });
  })();
  LS.check.init(LAB);
})();
