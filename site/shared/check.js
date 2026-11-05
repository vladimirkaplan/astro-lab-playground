// Self-grading exercises for the Check tab. A page declares exercises:
//
//   <div class="exercise" data-ex='{"type":"numbers","parts":[...],...}'></div>
//
// and initCheckDriven() builds inputs, a Check button, progressive hints and a
// "show the working" fallback. The answer is never shown before the student
// either solves it or asks for the working. Types:
//   numbers    parts: [{label, unit, value, tolPct|tolAbs}]  (all must pass)
//   choice     options: [...], correct: index
//   sequence   words: ["violet","blue",...] input must list them in order
//   keywords   words: [...], need: N of them present in the text
//   feetinches text like "44 ft 2 in" compared against {ft, in}
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var C = {};

  // "5,8" or "2.54 cm" -> 5.8 / 2.54. Keeps the decimal-comma habit readable.
  C.parseNumber = function (text) {
    if (text === null || text === undefined) return NaN;
    var t = String(text).trim().replace(/\s+/g, " ");
    var m = /-?\d+(?:[.,]\d+)?(?:[eE][-+]?\d+)?/.exec(t);
    if (!m) return NaN;
    return parseFloat(m[0].replace(",", "."));
  };

  function numOK(part, x) {
    if (!isFinite(x)) return false;
    if (typeof part.tolAbs === "number") return Math.abs(x - part.value) <= part.tolAbs;
    var tol = typeof part.tolPct === "number" ? part.tolPct : 2;
    if (part.value === 0) return Math.abs(x) <= (part.tolAbs || 1e-9);
    return Math.abs(x - part.value) / Math.abs(part.value) * 100 <= tol;
  }

  function normalizeWords(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9\s,->]/g, " ");
  }

  var builders = {
    numbers: function (cfg, form) {
      var inputs = [];
      (cfg.parts || []).forEach(function (part) {
        var row = root.LS.ui.el("div", { class: "part-row" });
        if (part.label) row.appendChild(root.LS.ui.el("span", { class: "part-label", text: part.label }));
        var input = root.LS.ui.el("input", {
          type: "text", inputmode: "decimal", class: "num-input",
          "aria-label": part.label || "answer",
          placeholder: part.unit ? "value in " + part.unit : "your value"
        });
        if (part.unit) row.appendChild(root.LS.ui.el("span", { class: "unit", text: part.unit }));
        row.prepend(input);
        form.appendChild(row);
        inputs.push({ input: input, part: part });
      });
      return function grade() {
        return inputs.every(function (p) {
          return numOK(p.part, C.parseNumber(p.input.value));
        });
      };
    },

    choice: function (cfg, form) {
      // Shuffle so position never leaks the answer; the correct index is kept.
      var order = cfg.options.map(function (_, i) { return i; });
      var rnd = root.LS.units.mulberry32(0xC0FFEE + cfg.correct + cfg.options.length);
      for (var i = order.length - 1; i > 0; i--) {
        var j = Math.floor(rnd() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t;
      }
      var name = "ex" + Math.random().toString(36).slice(2, 8);
      var groups = [];
      order.forEach(function (origIdx) {
        var label = root.LS.ui.el("label", { class: "choice-row" });
        var radio = root.LS.ui.el("input", { type: "radio", name: name, value: String(origIdx) });
        label.append(radio, document.createTextNode(cfg.options[origIdx]));
        form.appendChild(label);
        groups.push(radio);
      });
      return function grade() {
        var picked = groups.filter(function (r) { return r.checked; })[0];
        return !!picked && parseInt(picked.value, 10) === cfg.correct;
      };
    },

    sequence: function (cfg, form) {
      var input = root.LS.ui.el("input", {
        type: "text", class: "wide-input",
        placeholder: "list them in order, comma separated"
      });
      form.appendChild(input);
      return function grade() {
        var text = normalizeWords(input.value);
        var pos = -1;
        return cfg.words.every(function (w) {
          var found = text.indexOf(w, pos + 1);
          if (found < 0) return false;
          pos = found;
          return true;
        });
      };
    },

    keywords: function (cfg, form) {
      var area = root.LS.ui.el("textarea", {
        rows: "3", class: "wide-input",
        placeholder: cfg.placeholder || "type your answer in plain words"
      });
      form.appendChild(area);
      return function grade() {
        var dotted = " " + normalizeWords(area.value) + " ";
        var hits = cfg.words.filter(function (w) { return dotted.indexOf(w) >= 0; })
          .map(function (w) { return w; });
        var hist = area.parentNode.querySelector(".kw-hits");
        if (hist) hist.remove();
        area.parentNode.appendChild(root.LS.ui.el("div", {
          class: "kw-hits",
          text: hits.length ? "Found " + hits.length + " of the " + (cfg.need || cfg.words.length) + " ideas we accept: " + hits.join(", ") : ""
        }));
        return hits.length >= (cfg.need || cfg.words.length);
      };
    },

    feetinches: function (cfg, form) {
      var input = root.LS.ui.el("input", {
        type: "text", class: "wide-input", placeholder: 'e.g. 44 ft 2 in'
      });
      form.appendChild(input);
      return function grade() {
        var got = root.LS.units.parseFeetInches(input.value);
        if (!got) return false;
        return Math.abs(got.ft - cfg.ft) < 1e-6 && Math.abs(got.in - cfg.in) < 0.01;
      };
    }
  };

  function initExercise(node, labId, onComplete) {
    var cfg;
    try { cfg = JSON.parse(node.getAttribute("data-ex")); }
    catch (e) { console.warn("bad data-ex JSON", e); return; }
    var build = builders[cfg.type];
    if (!build) { console.warn("unknown exercise type", cfg.type); return; }

    var q = root.LS.ui.el("p", { class: "q", html: cfg.q || "" });
    var form = root.LS.ui.el("div", { class: "answer-form" });
    var grade = build(cfg, form);
    var feedback = root.LS.ui.el("div", { class: "feedback", role: "status" });
    var checkBtn = root.LS.ui.el("button", { type: "button", class: "btn-check", text: "Check" });
    var controls = root.LS.ui.el("div", { class: "ex-controls" }, [checkBtn]);
    var hintsEl = root.LS.ui.el("div");
    var done = false, tries = 0;

    node.append(q, form, controls, hintsEl, feedback);

    root.LS.ui.hintBox(hintsEl, cfg.hints || [], cfg.working, cfg.answer);

    checkBtn.addEventListener("click", function () {
      if (done) return;
      tries++;
      if (grade()) {
        done = true;
        node.classList.add("passed");
        feedback.className = "feedback ok";
        feedback.textContent = cfg.passText || "Correct. Open the working to see the reasoning.";
        var hb = hintsEl.querySelector(".show-working");
        if (hb) { hb.hidden = false; }
        root.LS.ui.progressMark(labId, "checks");
        if (onComplete) onComplete();
      } else {
        node.classList.remove("pass");
        feedback.className = "feedback nope";
        feedback.textContent = tries >= 2
          ? "Not yet. Take a hint, or ask for the working."
          : "Not quite. Check your number and try again.";
        node.classList.add("shake");
        setTimeout(function () { node.classList.remove("shake"); }, 400);
      }
    });
  }

  // Wire every .exercise on the page. Marks progress when all pass.
  C.init = function (labId, scope) {
    var nodes = (scope || document).querySelectorAll(".exercise");
    var total = nodes.length, passed = {};
    var bar = document.getElementById("check-progress");
    function refresh() {
      if (!bar) return;
      var n = Object.keys(passed).length;
      bar.textContent = n === total
        ? "All " + total + " checks passed. Nice work \u2014 progress tick saved."
        : "Passed " + n + " of " + total + " checks.";
    }
    nodes.forEach(function (node, i) {
      initExercise(node, labId, function () {
        passed[i] = true;
        refresh();
      });
    });
    refresh();
  };

  root.LS.check = C;
})(typeof globalThis !== "undefined" ? globalThis : window);
