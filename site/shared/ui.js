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
    // Refit flag: canvases sized themselves from clientWidth, which is 0 while
    // their panel is display:none at boot, so the first visible tab needs a
    // resize kick before any canvas in a hidden panel is trustworthy.
    var refitCanvases = function () {
      // Sim canvases listen on window "resize" and re-fit idempotently from the
      // now-real clientWidth, so one synthetic event heals every lab at once.
      try {
        if (typeof window !== "undefined" &&
            typeof window.dispatchEvent === "function" &&
            typeof Event === "function") {
          window.dispatchEvent(new Event("resize"));
        }
      } catch (e) {}
    };
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
      // Order matters: the panel is visible now, so a canvas reading clientWidth
      // inside the resize handler sees its real layout width, not the boot 0.
      refitCanvases();
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
    return { select: select };
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

  // ---------- usage box ----------
  // BMC-23: every Simulate tab opens with the same three-line orientation, so a
  // student who lands straight on Simulate still sees the Learn -> Simulate ->
  // Check route. Pages carry no markup for it (same no-per-page-contract idea as
  // the worksheet control): mountUsage finds #simulate by id, and a page without
  // a Simulate tab (landing, homework, redirect stubs) gets nothing.
  U.USAGE_ID = "usage-box";
  U.usageBox = function (mount) {
    var box = U.el("div", { class: "usage-box", id: U.USAGE_ID, role: "note" }, [
      U.el("p", { class: "usage-title", text: "How to use this page:" }),
      U.el("p", { class: "usage-line", text: "1. Learn: read the short explanation first." }),
      U.el("p", { class: "usage-line", text: "2. Simulate: follow the numbered steps in each Part, and log what you measure." }),
      U.el("p", { class: "usage-line", text: "3. Check: answer the self-graded questions with numbers from Simulate." })
    ]);
    if (mount && typeof mount.prepend === "function") mount.prepend(box);
    else (mount || document.body).appendChild(box);
    return box;
  };
  U.mountUsage = function () {
    try {
      var d = root.document;
      if (!d || typeof d.getElementById !== "function") return null;
      if (d.getElementById(U.USAGE_ID)) return d.getElementById(U.USAGE_ID);
      var sim = d.getElementById("simulate");
      if (!sim) return null;
      return U.usageBox(sim);
    } catch (e) {
      return null;
    }
  };
  U.autoMountUsage = function () {
    try {
      var d = root.document;
      if (!d) return null;
      if (d.readyState === "loading" && typeof d.addEventListener === "function") {
        d.addEventListener("DOMContentLoaded", function () { U.mountUsage(); });
        return "queued";
      }
      return U.mountUsage();
    } catch (e) {
      return null;
    }
  };
  U.autoMountUsage();

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

  // ---------- offline kit: service worker registration ----------
  // Additive, guarded, error-swallowing: the offline kit must never break a page.
  // Register only on the live https site or a localhost dev server; a plain-http
  // classroom mirror never registers (browsers refuse service workers on http BY
  // DESIGN, and the mirror needs no cache because nothing on the site ever calls
  // the network). Every failure path returns quietly instead of throwing.
  U.registerServiceWorker = function () {
    try {
      if (typeof navigator === "undefined" || !navigator.serviceWorker) return false;
      if (typeof location === "undefined") return false;
      var host = location.hostname || "";
      var secure = location.protocol === "https:" ||
        host === "localhost" || host === "127.0.0.1";
      if (!secure) return false;
      // Site root, derived from THIS script's own .../shared/ui.js URL, so the same
      // ui.js stays loadable from an unzipped mirror sitting at an unknown path on
      // any origin. With no current-script URL we bail rather than risk a scope that
      // does not match a real sw.js.
      var here = typeof document !== "undefined" && document.currentScript &&
        document.currentScript.src;
      if (!here) return false;
      var rootUrl = new URL("../", here).href;   // up from .../shared/ui.js to the site root
      var swUrl = new URL("sw.js", rootUrl).href;
      navigator.serviceWorker.register(swUrl, { scope: rootUrl }).then(
        function () { console.info("[offline-kit] service worker active for " + rootUrl); },
        function () {}
      );
      return true;
    } catch (e) {
      return false;
    }
  };
  U.registerServiceWorker();

  // ---------- printable worksheet control ----------
  // shared/worksheet.js (engine) + labs/<slug>/worksheet.js (that lab's content
  // descriptor) register one printable pre-lab/post-lab sheet per lab. Pages carry
  // no markup for it: the slug is the lab folder name read off the page's own path,
  // so any page without a descriptor - landing, homework, redirect stubs - finds no
  // spec and stays exactly as it was. Dependency-free, no popups, no network.
  U.wsSlug = function () {
    try {
      var path = (typeof location !== "undefined" && location.pathname) || "";
      var segs = String(path).split("/").filter(function (s) { return s !== ""; });
      if (!segs.length) return "";
      if (/\.html?$/i.test(segs[segs.length - 1])) segs.pop();
      return segs.length ? segs[segs.length - 1] : "";
    } catch (e) { return ""; }
  };

  // Screen: a compact bar in the header. Paper: only the sheet (@media print hides
  // every other body child while body.ws-printing is on, which U.wsPrint toggles).
  var WS_CSS =
    ".ws-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px;" +
    "font-size:.85rem;color:#9fb4dd}" +
    ".ws-bar .ws-btn{font:inherit;font-size:.82rem;padding:4px 10px;border-radius:7px;" +
    "border:1px solid #6f88bf;background:rgba(255,255,255,.12);color:#eef3ff;cursor:pointer}" +
    ".ws-bar .ws-btn:hover{background:rgba(255,255,255,.22)}" +
    ".ws-sheet{display:none}" +
    "@media print{" +
    "body.ws-printing>*:not(.ws-sheet){display:none!important}" +
    "body.ws-printing{background:#fff}" +
    "body.ws-printing .ws-sheet{display:block;color:#000;font-size:11pt;line-height:1.35}" +
    ".ws-sheet h1{font-size:15pt;margin:0 0 .2em}" +
    ".ws-sheet .ws-intro{margin:0 0 1em;font-size:10pt}" +
    ".ws-sheet .ws-fields{display:flex;flex-wrap:wrap;gap:18px;margin:0 0 1em;font-size:10pt}" +
    ".ws-sheet .ws-field{white-space:nowrap}" +
    ".ws-sheet .ws-rule{display:inline-block;min-width:14ch;border-bottom:1px solid #000}" +
    ".ws-sheet table{border-collapse:collapse;width:100%;margin-bottom:1em}" +
    ".ws-sheet th,.ws-sheet td{border:1px solid #333;padding:3px 5px;text-align:left;" +
    "vertical-align:top;font-size:9.5pt}" +
    ".ws-sheet thead th{background:#eee}" +
    ".ws-sheet .ws-grid td{height:1.9em}" +
    ".ws-sheet h2{font-size:12pt;margin:1.2em 0 .4em}" +
    ".ws-sheet ul.ws-qs{margin:0;padding-left:0;list-style:none}" +
    ".ws-sheet ul.ws-qs li{margin-bottom:2.6em;padding-left:2.4em;text-indent:-2.4em}" +
    "@page{margin:14mm}" +
    "}";

  function wsField(label) {
    return U.el("span", { class: "ws-field" }, [label + " ", U.el("span", { class: "ws-rule" })]);
  }

  // Same content as LS.worksheet.csvText, rendered for paper: header row, optional
  // units row, blankRows empty cells, then the numbered PRE/POST question lists.
  function wsTableNode(table) {
    var thead = U.el("thead", {}, [
      U.el("tr", {}, table.header.map(function (h) { return U.el("th", { text: h }); }))
    ]);
    if (table.units) {
      thead.appendChild(U.el("tr", { class: "ws-units" },
        table.units.map(function (u) { return U.el("th", { text: u }); })));
    }
    var grid = U.el("tbody", { class: "ws-grid" });
    for (var r = 0; r < table.blankRows; r++) {
      var tr = U.el("tr");
      for (var c = 0; c < table.header.length; c++) tr.appendChild(U.el("td"));
      grid.appendChild(tr);
    }
    return U.el("table", {}, [thead, grid]);
  }

  // Question numbers are written into the text, not left to list markers: the CSV and
  // the xlsx number their own cells, and a sheet printed without author CSS (or pasted
  // anywhere) must still carry "1.", "2." on every question.
  function wsListNode(items) {
    return U.el("ul", { class: "ws-qs" }, items.map(function (q, i) {
      return U.el("li", { text: (i + 1) + ". " + q });
    }));
  }

  function wsSheetNode(spec) {
    return U.el("section", { class: "ws-sheet", id: "ws-sheet", "aria-hidden": "true" }, [
      U.el("h1", { text: "Lab " + spec.labNumber + " - " + spec.title }),
      U.el("p", { class: "ws-intro", text: spec.intro }),
      U.el("p", { class: "ws-fields" }, [
        wsField("Name:"), wsField("Date:"), wsField("Class/Section:"), wsField("Bench partners:")
      ]),
      wsTableNode(spec.table),
      U.el("h2", { text: "PRE-LAB QUESTIONS" }),
      wsListNode(spec.prelab),
      U.el("h2", { text: "POST-LAB QUESTIONS" }),
      wsListNode(spec.postlab)
    ]);
  }

  // Body class around the synchronous print() call: the browser snapshots the page
  // for paper while only the sheet is display:block, and the live page is restored
  // the moment print() returns. finally restores even if print() throws or is blocked.
  U.wsPrint = function () {
    var body = root.document && root.document.body;
    var win = root.window || null;
    if (!body || !body.classList || !win || typeof win.print !== "function") return false;
    body.classList.add("ws-printing");
    try {
      win.print();
    } finally {
      body.classList.remove("ws-printing");
    }
    return true;
  };

  U.mountWorksheet = function () {
    try {
      var W = root.LS && root.LS.worksheet;
      var d = root.document;
      if (!W || !d || !d.body || !d.createElement || typeof d.getElementById !== "function") return null;
      if (d.getElementById("ws-control")) return d.getElementById("ws-control");
      var slug = U.wsSlug();
      var spec = slug && W.get ? W.get(slug) : null;
      if (!spec) return null;

      (d.head || d.body).appendChild(U.el("style", { id: "ws-print-css", text: WS_CSS }));
      d.body.appendChild(wsSheetNode(spec));

      var bar = U.el("div", { class: "ws-bar", id: "ws-control" }, [
        U.el("span", { class: "ws-bar-label", text: "Worksheet:" })
      ]);
      var mk = function (action, label) {
        var b = U.el("button", {
          type: "button", class: "ws-btn", "data-ws": action, text: label,
          title: action === "print"
            ? "Print just the worksheet sheet"
            : "Download the worksheet as " + label
        });
        b.addEventListener("click", function () {
          if (action === "print") U.wsPrint();
          else W.download(slug, action);
        });
        bar.appendChild(b);
      };
      mk("print", "Print");
      mk("csv", ".csv");
      mk("xlsx", ".xlsx");

      var head = d.querySelector && d.querySelector(".site-head .wrap");
      (head || d.body).appendChild(bar);
      return bar;
    } catch (e) {
      return null;
    }
  };

  // Descriptors load after ui.js, so mounting has to wait for the document unless
  // ui.js is somehow parsed late. Fully guarded: no engine, no spec, no DOM means
  // no-op, never a throw.
  U.autoMountWorksheet = function () {
    try {
      var d = root.document;
      if (!d) return null;
      if (d.readyState === "loading" && typeof d.addEventListener === "function") {
        d.addEventListener("DOMContentLoaded", function () { U.mountWorksheet(); });
        return "queued";
      }
      return U.mountWorksheet();
    } catch (e) {
      return null;
    }
  };
  U.autoMountWorksheet();

  root.LS.ui = U;
})(typeof globalThis !== "undefined" ? globalThis : window);
