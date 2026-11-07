// Shared UI plumbing: tabs, the "practice only" banner, Ideal/Fun mode toggle,
// the hint widget, and progress ticks shown on the landing page.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var U = {};

  U.el = function (tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (k === "class") node.className = attrs[k];
      else if (k === "text") node.textContent = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  };

  // ---------- tabs ----------
  // Markup contract: buttons .tab-btn[data-tab=id] + sections .tab-panel[id].
  U.initTabs = function (rootEl) {
    var scope = rootEl || document;
    var btns = scope.querySelectorAll(".tab-btn");
    var select = function (id) {
      scope.querySelectorAll(".tab-panel").forEach(function (p) {
        p.hidden = p.id !== id;
      });
      btns.forEach(function (b) {
        var on = b.getAttribute("data-tab") === id;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      try { location.replace(location.href.split("#")[0] + "#" + id); } catch (e) {}
    };
    btns.forEach(function (b, idx) {
      b.addEventListener("click", function () { select(b.getAttribute("data-tab")); });
      b.addEventListener("keydown", function (ev) {
        // Left/right arrows move between tabs, like real tab widgets.
        if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
        ev.preventDefault();
        var dir = ev.key === "ArrowRight" ? 1 : -1;
        var next = btns[(idx + dir + btns.length) % btns.length];
        next.focus();
        select(next.getAttribute("data-tab"));
      });
    });
    var hash = location.hash.replace("#", "");
    var start = scope.getElementById ? scope : document;
    var target = hash && document.getElementById(hash) ? hash :
      (btns[0] && btns[0].getAttribute("data-tab"));
    if (target) select(target);
  };

  // ---------- disclaimer banner ----------
  U.banner = function (mount) {
    var b = U.el("div", { class: "banner", role: "note", html:
      "<strong>Practice sim, not your BMCC submission.</strong> Do the real lab and " +
      "follow your instructor's rules. Explanations adapted from OpenStax " +
      "<em>Astronomy 2e</em> (CC BY 4.0)." });
    (mount || document.body).prepend(b);
    U.licence(mount || document.body);
    return b;
  };

  // ---------- license footer ----------
  // Every lab page carries the same licence line, so a student who lands on one
  // page still sees what they may do with it.
  U.licence = function (mount) {
    var f = U.el("footer", { class: "lab-licence", html:
      "Unofficial student project, not affiliated with any college. Code: MIT. " +
      "Explanations: CC BY 4.0 (adapted from OpenStax <em>Astronomy 2e</em>). " +
      "Public data sources only; no student data of any kind lives here. " +
      "This sim rehearses the lab - it is not a submission channel." });
    (mount || document.body).appendChild(f);
    return f;
  };

  // ---------- Ideal / Fun mode ----------
  // Fun Mode adds realistic instrument noise to measurements; Ideal is exact.
  U.MODE_KEY = function (labId) { return "labSimsMode." + labId; };
  U.getMode = function (labId) {
    try { return localStorage.getItem(U.MODE_KEY(labId)) === "fun" ? "fun" : "ideal"; }
    catch (e) { return "ideal"; }
  };
  U.modeToggle = function (labId, mount, onChange) {
    var current = U.getMode(labId);
    var wrap = U.el("div", { class: "mode-toggle" }, [
      U.el("span", { class: "mode-label", text: "Instrument:" })
    ]);
    var mk = function (mode, label) {
      var b = U.el("button", {
        type: "button", class: "mode-btn" + (current === mode ? " active" : ""),
        text: label, "aria-pressed": current === mode ? "true" : "false"
      });
      b.addEventListener("click", function () {
        current = mode;
        try { localStorage.setItem(U.MODE_KEY(labId), mode); } catch (e) {}
        wrap.querySelectorAll(".mode-btn").forEach(function (x) {
          var on = x === b;
          x.classList.toggle("active", on);
          x.setAttribute("aria-pressed", on ? "true" : "false");
        });
        if (onChange) onChange(mode);
      });
      wrap.appendChild(b);
    };
    mk("ideal", "Ideal (exact)");
    mk("fun", "Fun (noisy instrument)");
    (mount || document.body).appendChild(wrap);
    return wrap;
  };

  // ---------- hint widget ----------
  // Reveals one hint per click; the working/answer is only offered via a
  // separate button so nobody stumbles into the answer by accident.
  U.hintBox = function (mount, hints, workingHTML, answerText) {
    var shown = 0;
    var list = U.el("div", { class: "hints" });
    var btn = U.el("button", { type: "button", class: "hint-btn", text: "Need a hint? (0/" + hints.length + ")" });
    var solve = U.el("button", { type: "button", class: "hint-btn show-working", text: "Show the working", hidden: true });
    var work = U.el("div", { class: "working", hidden: true, html: workingHTML || "" });
    btn.addEventListener("click", function () {
      if (shown < hints.length) {
        list.appendChild(U.el("p", { class: "hint", text: (shown + 1) + ". " + hints[shown] }));
        shown++;
        btn.textContent = "Need a hint? (" + shown + "/" + hints.length + ")";
      }
      if (shown >= hints.length) btn.disabled = true;
      if (workingHTML) solve.hidden = false;
    });
    solve.addEventListener("click", function () {
      work.hidden = false;
      if (answerText) {
        work.appendChild(U.el("p", { class: "answer-line", text: "Answer: " + answerText }));
      }
      solve.disabled = true;
    });
    (mount || document.body).append(btn, list, solve, work);
  };

  // ---------- progress ticks ----------
  U.PROGRESS_KEY = "labSimsProgress.v1";
  U.progressAll = function () {
    try { return JSON.parse(localStorage.getItem(U.PROGRESS_KEY)) || {}; }
    catch (e) { return {}; }
  };
  U.progressMark = function (labId, what) {
    var p = U.progressAll();
    p[labId] = p[labId] || {};
    p[labId][what] = true;
    try { localStorage.setItem(U.PROGRESS_KEY, JSON.stringify(p)); } catch (e) {}
    return p;
  };

  U.plural = function (n, word) { return n + " " + word + (n === 1 ? "" : "s"); };

  root.LS.ui = U;
})(typeof globalThis !== "undefined" ? globalThis : window);
