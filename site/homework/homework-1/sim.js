// Homework 1 practice page wiring. It builds four practice benches in the
// Practice tab (concept checks, unit-factor chains, light-travel distances,
// scientific notation), grades them against the pure LS.hwCore engine, logs
// every attempt to localStorage with CSV export, and injects the six exam-style
// quiz payloads from LS.hw1Content into the Check tab before handing that tab to
// shared/check.js. DOM only - all math, tables and generators live in hw-core.js;
// all prompt text and answers live in hw1-content.js.
(function () {
  "use strict";
  var LS = window.LS;
  var U = LS.units, H = LS.hwCore, CT = LS.hw1Content, CHK = LS.check;
  var LAB = "hw1";
  var $ = function (id) { return document.getElementById(id); };

  // A fresh-but-labelled seed for each regenerate click; string seeds keep the
  // generated text readable and never collide with a graded number.
  var counter = 0;
  function nextSeed(tag) {
    counter += 1;
    return tag + "-" + Math.floor(Math.random() * 1e9).toString(36) + "-" + counter;
  }

  function shuffle(rng, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function prompt(p) {
    var el = LS.ui.el("p", { class: "q" });
    el.innerHTML = p;
    return el;
  }

  // ================= log =================
  var HEADER = ["when", "bench", "prompt", "your answer", "correct answer", "result"];
  var rows = [];
  try {
    var saved = LS.store.load(LAB, "log");
    if (saved && saved.rows) rows = saved.rows;
  } catch (e) {}
  function stamp() {
    try { return new Date().toLocaleString(); } catch (e) { return ""; }
  }
  function log(bench, q, yours, truth, pass) {
    rows.push([stamp(), bench, q, String(yours), String(truth), pass ? "pass" : "check"]);
    if (rows.length > 400) rows = rows.slice(rows.length - 400);
    LS.store.save(LAB, "log", HEADER, rows);
    renderLog();
  }
  function renderLog() {
    var mount = $("logTable");
    if (!rows.length) {
      mount.innerHTML = "<p class='muted'>Nothing logged yet. Every Check button appends " +
        "what you typed, the right answer, and the verdict. The table survives a reload, and " +
        "CSV export hands you the practice record you would keep in a notebook.</p>";
      return;
    }
    mount.innerHTML = LS.store.tableHTML(
      ["when", "bench", "question", "your answer", "correct", "result"], rows);
  }

  // ================= Bench A: concept checks =================
  var concepts = null;
  function newConcepts() {
    var rng = U.mulberry32(Math.floor(Math.random() * 0x7fffffff));
    var picked = shuffle(rng, CT.CONCEPTS).slice(0, CT.CONCEPTS_PER_ATTEMPT);
    concepts = picked.map(function (c) {
      var order = shuffle(rng, c.options.map(function (_, i) { return i; }));
      return { item: c, order: order, radios: [] };
    });
    var mount = $("concepts-mount");
    mount.innerHTML = "";
    concepts.forEach(function (rec, qi) {
      var c = rec.item;
      var block = LS.ui.el("div", { class: "bench-row" });
      block.appendChild(prompt((qi + 1) + ". " + c.q));
      var name = "con" + qi + "-" + Math.floor(Math.random() * 1e6);
      rec.order.forEach(function (origIdx) {
        var opt = c.options[origIdx];
        var label = LS.ui.el("label", { class: "choice-row" });
        var radio = LS.ui.el("input", { type: "radio", name: name, value: String(origIdx) });
        label.append(radio, document.createTextNode(" " + opt.t));
        var why = LS.ui.el("span", { class: "why", hidden: true, text: "  - " + opt.why });
        label.appendChild(why);
        block.appendChild(label);
        rec.radios.push({ radio: radio, why: why, origIdx: origIdx, label: label });
      });
      mount.appendChild(block);
    });
  }
  function checkConcepts() {
    if (!concepts) return;
    var pass = 0;
    concepts.forEach(function (rec) {
      var c = rec.item;
      var chosen = rec.radios.filter(function (r) { return r.radio.checked; })[0];
      rec.radios.forEach(function (r) {
        r.why.hidden = false;
        r.label.classList.toggle("why-correct", r.origIdx === c.correct);
        r.label.classList.toggle("why-chosen-wrong", r.radio.checked && r.origIdx !== c.correct);
      });
      var ok = !!chosen && chosen.origIdx === c.correct;
      if (ok) pass++;
      var chosenText = chosen ? c.options[chosen.origIdx].t : "(no answer)";
      log("concepts", c.q, chosenText, c.options[c.correct].t, ok);
    });
    $("conceptsCheck").textContent = "Concepts: " + pass + " / " + concepts.length +
      " - check the reasons";
  }

  // ================= Bench B: unit-factor chains =================
  function renderFactorTable() {
    var T = H.FACTOR_TABLE;
    var head = ["unit", "equals (exact)"];
    var body = [];
    Object.keys(T).forEach(function (k) {
      var r = T[k];
      var metres = r.num / r.den;
      body.push([r.label + " (" + k + ")",
        metres === 1 ? "= 1 m (base)" : "= " + H.formatNumber(metres) + " m"]);
    });
    var extra = ["1 km = 1000 m", "1 m = 100 cm", "1 cm = 10 mm",
      "1 mi = 5280 ft", "1 ft = 12 in", "1 in = 2.54 cm (exact)"];
    $("factorTable").innerHTML =
      LS.store.tableHTML(head, body) +
      "<p class='muted'>Cited equalities (NIST SP 811 / SI Brochure): " +
      extra.join(", ") + ". Compound factors are derived from these, never memorised.</p>";
  }
  var conv = null, convEls = [];
  function newConv() {
    conv = H.genConversionSet(nextSeed("conv"), 6).rows;
    convEls = [];
    var mount = $("conv-mount");
    mount.innerHTML = "";
    conv.forEach(function (row) {
      var block = LS.ui.el("div", { class: "bench-row" });
      block.appendChild(prompt(row.given.replace("____", '<input class="num-input" ' +
        'type="text" inputmode="decimal" aria-label="your answer" style="width:12ch">')));
      var fb = LS.ui.el("div", { class: "feedback" });
      block.appendChild(fb);
      convEls.push({ fb: fb, input: block.querySelector("input") });
      mount.appendChild(block);
    });
  }
  function checkConv() {
    if (!conv) return;
    var pass = 0;
    conv.forEach(function (row, i) {
      var el = convEls[i];
      var x = CHK.parseNumber(el.input.value);
      var ok = isFinite(x) && H.withinTolerance(x, row.answer, row.tolerance);
      if (ok) pass++;
      el.fb.className = "feedback " + (ok ? "ok" : "nope");
      el.fb.innerHTML = (ok ? "Right. " : "Answer: " + row.answerText + ". ") +
        "Chain: " + row.steps.join("; ");
      log("unit-chain", row.given, el.input.value || "(blank)", row.answerText, ok);
    });
    $("convCheck").textContent = "Conversions: " + pass + " / " + conv.length;
  }

  // ================= Bench C: light-travel =================
  var light = null, lightEls = [];
  function newLight() {
    light = H.genLightSet(nextSeed("light"), 6).rows;
    lightEls = [];
    var mount = $("light-mount");
    mount.innerHTML = "";
    light.forEach(function (row) {
      var unitLabel = row.type === "lightTime" ? row.unit + "s" : "km";
      var block = LS.ui.el("div", { class: "bench-row" });
      block.appendChild(prompt(row.given));
      var line = LS.ui.el("div", { class: "sci-line" }, [
        document.createTextNode("answer: "),
        LS.ui.el("input", { class: "num-input", type: "text", inputmode: "decimal",
          "aria-label": "your answer", style: "width:14ch" }),
        LS.ui.el("span", { class: "unit", text: unitLabel })
      ]);
      var fb = LS.ui.el("div", { class: "feedback" });
      block.append(line, fb);
      lightEls.push({ fb: fb, input: block.querySelector("input") });
      mount.appendChild(block);
    });
  }
  function checkLight() {
    if (!light) return;
    var pass = 0;
    light.forEach(function (row, i) {
      var el = lightEls[i];
      var x = CHK.parseNumber(el.input.value);
      var ok = isFinite(x) && H.withinTolerance(x, row.answer, row.tolerance);
      if (ok) pass++;
      var hint = row.type === "lightDistance" ?
        "c x time = 300000 km/s x " + row.seconds + " s" :
        "time = distance / c = " + H.formatNumber(row.km) + " km / 300000 km/s";
      el.fb.className = "feedback " + (ok ? "ok" : "nope");
      el.fb.innerHTML = (ok ? "Right. " : "Answer: " + row.answerText + ". ") + hint;
      log("light-travel", row.given, el.input.value || "(blank)", row.answerText, ok);
    });
    $("lightCheck").textContent = "Light travel: " + pass + " / " + light.length;
  }

  // ================= Bench D: scientific notation =================
  var sci = null, sciEls = [];
  function newSci() {
    sci = H.genSciSet(nextSeed("sci"), 6).rows;
    sciEls = [];
    var mount = $("sci-mount");
    mount.innerHTML = "";
    sci.forEach(function (row) {
      var block = LS.ui.el("div", { class: "bench-row" });
      block.appendChild(prompt(row.given));
      var rowline = LS.ui.el("div", { class: "sci-line" }, [
        document.createTextNode("= "),
        LS.ui.el("input", { class: "num-input sci-mant", type: "text",
          inputmode: "decimal", "aria-label": "mantissa", style: "width:9ch",
          placeholder: "mantissa" }),
        document.createTextNode(" x 10^"),
        LS.ui.el("input", { class: "num-input sci-exp", type: "text",
          inputmode: "numeric", "aria-label": "exponent", style: "width:5ch",
          placeholder: "n" })
      ]);
      var fb = LS.ui.el("div", { class: "feedback" });
      block.append(rowline, fb);
      sciEls.push({ fb: fb,
        mant: block.querySelector(".sci-mant"), exp: block.querySelector(".sci-exp") });
      mount.appendChild(block);
    });
  }
  function checkSci() {
    if (!sci) return;
    var pass = 0;
    sci.forEach(function (row, i) {
      var el = sciEls[i];
      var m = CHK.parseNumber(el.mant.value);
      var e = CHK.parseNumber(el.exp.value);
      var mantOK = isFinite(m) && U.near(m, row.mantissa, 0.5);
      var expOK = isFinite(e) && Math.round(e) === row.exponent;
      var ok = mantOK && expOK;
      if (ok) pass++;
      var msg;
      if (ok) msg = "Right: " + row.answerText + ".";
      else {
        msg = "Answer: <b>" + row.answerText + "</b> (mantissa " + row.mantissa +
          ", exponent " + row.exponent + ").";
        if (!mantOK && !expOK) msg += " Both the mantissa and the exponent are off.";
        else if (!mantOK) msg += " The mantissa must land between 1 and 10.";
        else if (!expOK) {
          msg += " The exponent is wrong.";
          var off = Math.round(e) - row.exponent;
          var gt = String(row.givenText || "");
          var microMilli = /[µ\u00b5μ]/.test(gt) || /\b(mm|ms|millimet|millisecond)\b/i.test(gt);
          if (off === -3 && microMilli) msg += " Off by 10^3: did you read milli (10^-3) as micro (10^-6)?";
          else if (off === 3 && microMilli) msg += " Off by 10^3: did you read micro (10^-6) as milli (10^-3)?";
          else msg += " Normalise the prefix before you read the exponent.";
        }
      }
      el.fb.className = "feedback " + (ok ? "ok" : "nope");
      el.fb.innerHTML = msg;
      log("sci-notation", row.given,
        (el.mant.value || "?") + " x 10^" + (el.exp.value || "?"),
        row.answerText, ok);
    });
    $("sciCheck").textContent = "Notation: " + pass + " / " + sci.length;
  }

  // ================= boot =================
  function wire(btn, fn) { if ($(btn)) $(btn).addEventListener("click", fn); }

  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();

  renderFactorTable();
  newConcepts();
  newConv();
  newLight();
  newSci();
  renderLog();

  wire("conceptsNew", function () { newConcepts();
    $("conceptsCheck").textContent = "Check concepts"; });
  wire("conceptsCheck", checkConcepts);
  wire("convNew", function () { newConv(); $("convCheck").textContent = "Check conversions"; });
  wire("convCheck", checkConv);
  wire("lightNew", function () { newLight(); $("lightCheck").textContent = "Check light travel"; });
  wire("lightCheck", checkLight);
  wire("sciNew", function () { newSci(); $("sciCheck").textContent = "Check notation"; });
  wire("sciCheck", checkSci);

  $("logCsv").addEventListener("click", function () {
    LS.store.exportCSV("homework1-practice-log.csv", HEADER, rows, $("csvFallback"));
  });
  $("logClear").addEventListener("click", function () {
    rows = [];
    LS.store.save(LAB, "log", HEADER, rows);
    $("csvFallback").style.display = "none";
    renderLog();
  });

  // Build the exam-style quiz into the Check tab, then hand the whole page to
  // shared/check.js which grades every .exercise node it finds.
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
