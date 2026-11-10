"use strict";
// BMC-21 / GitHub #15 part 2 - worksheet mounting.
//
// Two things are pinned here:
//   (1) the static wiring: every one of the 16 real lab pages loads the engine right
//       after shared/check.js and its own descriptor right before sim.js, while the
//       redirect stubs, the homework pages and the landing page stay untouched;
//   (2) the ui.js auto-mount, driven through a small stub DOM that mimics a real
//       page boot: ui.js parses FIRST (descriptors not loaded yet), the descriptors
//       register their slug, then DOMContentLoaded fires and the mount happens.
//
// The mount contract: slug comes from the page path (no per-page markup), a page
// with a registered spec gets the three controls + the print sheet + the print CSS,
// a page without one (homework/landing/stub) gets nothing at all, the buttons really
// call LS.worksheet.download / window.print, and printing toggles body.ws-printing
// around the synchronous print() call and restores it afterwards.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const M = require("./lab-manifest.js");
const ROOT = M.ROOT;
const SITE = path.join(ROOT, "site");
const UI_PATH = path.join(SITE, "shared", "ui.js");

// BMC-27: AST110 sits at site/ast110/, and site/labs/ is redirect stubs only.
// Lab lists come from the site's own course registry via lab-manifest.
const COURSE = "ast110";
const LAB_DIRS = M.labDirsFor(COURSE);
const NON_LAB_PAGES = fs.readdirSync(path.join(SITE, "labs"), { withFileTypes: true })
  .filter((e) => e.isDirectory()).map((e) => "labs/" + e.name).sort();
const OTHER_LANDINGS = [".", COURSE, "phy110"];

// ---------- (1) static wiring on the pages ----------

test("every lab page loads the worksheet engine after check.js and the descriptor before sim.js", () => {
  assert.ok(LAB_DIRS.length >= 16, "the registry still carries the full AST110 set");
  for (const dir of LAB_DIRS) {
    const lines = fs.readFileSync(M.labPage(COURSE, dir), "utf8").split("\n");
    const at = (needle) => lines.map((l, i) => [l.trim(), i])
      .filter(([l]) => l === needle).map(([, i]) => i);
    const courses = at('<script src="../../../shared/courses.js"></script>');
    const units = at('<script src="../../../shared/units.js"></script>');
    const check = at('<script src="../../../shared/check.js"></script>');
    const engine = at('<script src="../../../shared/worksheet.js"></script>');
    const desc = at('<script src="./worksheet.js"></script>');
    const sim = at('<script src="./sim.js"></script>');
    assert.equal(courses.length, 1, dir + ": one shared/courses.js tag");
    assert.equal(units.length, 1, dir + ": one shared/units.js tag");
    assert.equal(courses[0], units[0] - 1, dir + ": courses.js loads immediately before units.js");
    assert.equal(check.length, 1, dir + ": one check.js tag");
    assert.equal(engine.length, 1, dir + ": exactly one shared/worksheet.js tag");
    assert.equal(desc.length, 1, dir + ": exactly one ./worksheet.js tag");
    assert.equal(sim.length, 1, dir + ": one sim.js tag");
    assert.equal(engine[0], check[0] + 1, dir + ": engine sits immediately after check.js");
    assert.equal(desc[0], sim[0] - 1, dir + ": descriptor sits immediately before sim.js");
    assert.ok(desc[0] > engine[0], dir + ": engine loads before its descriptor");
  }
});

test("stub pages, homework pages and every landing page carry no worksheet tags", () => {
  for (const rel of NON_LAB_PAGES) {
    const html = fs.readFileSync(path.join(SITE, rel, "index.html"), "utf8");
    assert.ok(!html.includes("worksheet.js"), rel + " must stay out of the worksheet feature");
  }
  for (const rel of OTHER_LANDINGS) {
    const landing = fs.readFileSync(path.join(SITE, rel, "index.html"), "utf8");
    assert.ok(!landing.includes("worksheet.js"), rel + " has no worksheet script");
  }
});

// ---------- stub DOM ----------

function matchesSimple(el, sel) {
  const m = /^([a-zA-Z][\w-]*)?((?:[.#][\w-]+)*)$/.exec(sel);
  if (!m) throw new Error("stub DOM cannot match selector: " + sel);
  if (m[1] && el.tagName !== m[1].toUpperCase()) return false;
  const toks = (m[2].match(/[.#][\w-]+/g) || []);
  for (const t of toks) {
    if (t[0] === ".") { if (!el._classes.has(t.slice(1))) return false; }
    else if (el.id !== t.slice(1)) return false;
  }
  return true;
}

// Descendant chain, e.g. ".site-head .wrap": the element itself must match the last
// token, and walking up through its ancestors must match the rest in order.
function matchChain(el, toks) {
  if (!matchesSimple(el, toks[toks.length - 1])) return false;
  let i = toks.length - 2;
  let node = el.parentNode;
  while (i >= 0 && node) {
    if (node.nodeType === 1 && matchesSimple(node, toks[i])) i--;
    node = node.parentNode;
  }
  return i < 0;
}

function eachElement(root, fn) {
  for (const child of root.childNodes || []) {
    if (child.nodeType !== 1) continue;
    fn(child);
    eachElement(child, fn);
  }
}

function findAll(rootEl, sel) {
  const toks = sel.trim().split(/\s+/);
  const out = [];
  eachElement(rootEl, (el) => { if (matchChain(el, toks)) out.push(el); });
  return out;
}

function makeEl(tag) {
  const classes = new Set();
  const attrs = {};
  const listeners = {};
  let className = "";
  const el = {
    nodeType: 1,
    tagName: String(tag).toUpperCase(),
    childNodes: [],
    parentNode: null,
    id: "",
    _text: "",
    _classes: classes,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle: function (c, on) {
        const want = on === undefined ? !classes.has(c) : !!on;
        if (want) classes.add(c); else classes.delete(c);
        return want;
      },
    },
    setAttribute(k, v) {
      attrs[k] = String(v);
      if (k === "id") el.id = String(v);
      if (k === "class") el.className = String(v);
    },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
    appendChild(child) { child.parentNode = el; el.childNodes.push(child); return child; },
    removeChild(child) {
      const i = el.childNodes.indexOf(child);
      if (i >= 0) el.childNodes.splice(i, 1);
      child.parentNode = null;
      return child;
    },
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    _fire(t, ev) { (listeners[t] || []).slice().forEach((fn) => fn(ev || {})); },
    click() { el._fire("click", {}); },
    querySelector(sel) { return findAll(el, sel)[0] || null; },
    querySelectorAll(sel) { return findAll(el, sel); },
  };
  Object.defineProperty(el, "className", {
    get() { return className; },
    set(v) {
      className = String(v);
      classes.clear();
      className.split(/\s+/).filter(Boolean).forEach((c) => classes.add(c));
    },
  });
  Object.defineProperty(el, "textContent", {
    get() {
      if (el.childNodes.length) return el.childNodes.map((n) => n.textContent).join("");
      return el._text;
    },
    set(v) { el._text = String(v); el.childNodes.length = 0; },
  });
  el.innerHTML = ""; // U.el supports it; nothing on the worksheet path uses it
  return el;
}

function makePage(pathname, opts) {
  opts = opts || {};
  const doc = {
    readyState: "loading",
    _listeners: {},
    createElement: (tag) => makeEl(tag),
    createTextNode: (t) => ({ nodeType: 3, textContent: String(t), parentNode: null }),
    addEventListener(t, fn) { (doc._listeners[t] = doc._listeners[t] || []).push(fn); },
    _fire(t) { (doc._listeners[t] || []).slice().forEach((fn) => fn({ type: t })); },
    getElementById(id) {
      let hit = null;
      eachElement(doc.documentElement, (el) => { if (!hit && el.id === id) hit = el; });
      return hit;
    },
    querySelector(sel) { return findAll(doc.documentElement, sel)[0] || null; },
    querySelectorAll(sel) { return findAll(doc.documentElement, sel); },
  };
  doc.documentElement = makeEl("html");
  doc.head = makeEl("head");
  doc.documentElement.appendChild(doc.head);
  doc.body = makeEl("body");
  doc.documentElement.appendChild(doc.body);

  // Header chrome every lab page has, so the mount target (.site-head .wrap) exists.
  const header = makeEl("header");
  header.className = "site-head";
  const wrap = makeEl("div");
  wrap.className = "wrap";
  header.appendChild(wrap);
  doc.body.appendChild(header);
  const main = makeEl("main");
  doc.body.appendChild(main);
  if (opts.withBanner) {
    const banner = makeEl("div");
    banner.className = "banner";
    main.appendChild(banner);
  }

  const prints = [];
  const env = {
    doc,
    window: {
      print() { prints.push(doc.body.classList.contains("ws-printing")); },
      addEventListener() {},
    },
    location: { pathname },
    downloads: [], // anchor click-throughs captured by the Blob/URL stubs
    prints,
  };
  return env;
}

// Install the stub globals over the already-registered engine + descriptors, then
// boot a FRESH ui.js and fire DOMContentLoaded (the real page order).
function boot(pathname, opts) {
  opts = opts || {};
  const page = makePage(pathname, opts);
  const saved = {};
  const makeStubBlob = () => {
    const blobs = [];
    globalThis.Blob = function Blob(parts, o) {
      this.parts = parts;
      this.type = (o && o.type) || "";
      blobs.push(this);
    };
    globalThis.URL = {
      createObjectURL: (b) => { page.downloads.push({ blob: b }); return "blob:stub/" + page.downloads.length; },
      revokeObjectURL: () => {},
    };
    return blobs;
  };
  ["document", "window", "location", "Blob", "URL", "navigator"].forEach((k) => {
    saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
  });
  globalThis.document = page.doc;
  globalThis.window = page.window;
  globalThis.location = page.location;
  const blobs = makeStubBlob();
  delete globalThis.navigator; // no service worker API in the stub, by design

  // ui.js last, from scratch, exactly as the pages load it.
  delete require.cache[require.resolve(UI_PATH)];
  require(UI_PATH);

  const firedBefore = page.doc.querySelectorAll(".ws-bar").length;
  page.doc._fire("DOMContentLoaded");

  const restore = () => {
    ["document", "window", "location", "Blob", "URL", "navigator"].forEach((k) => {
      if (saved[k]) Object.defineProperty(globalThis, k, saved[k]);
      else delete globalThis[k];
    });
  };
  return {
    doc: page.doc,
    env: page,
    blobs,
    firedBefore,
    restore,
    bar: () => page.doc.getElementById("ws-control"),
    buttons: () => page.doc.querySelectorAll(".ws-btn"),
    sheet: () => page.doc.getElementById("ws-sheet"),
  };
}

// Engine + all 16 descriptors, loaded once for the whole file (store.js first: the
// engine's csvText is built on LS.store.csvText, exactly as on a real page).
require("../site/shared/store.js");
require("../site/shared/worksheet.js");
for (const course of M.COURSES) {
  for (const dir of course.labDirs) require(M.labDir(course.code, dir) + "/worksheet.js");
}

const WKS = globalThis.LS.worksheet;
const SPEC = WKS.get("01-measurement");

// ---------- (2) the auto-mount ----------

test("a lab page with a registered spec gets the three worksheet controls", () => {
  const h = boot("/ast110/labs/01-measurement/index.html", { withBanner: true });
  try {
    assert.equal(h.firedBefore, 0, "ui.js alone (no descriptors parsed yet) mounts nothing before DOMContentLoaded");
    const bar = h.bar();
    assert.ok(bar, "the worksheet bar mounts once the descriptor has registered");
    assert.equal(h.env.doc.querySelectorAll(".ws-bar").length, 1);
    assert.ok(h.env.doc.querySelector(".site-head .wrap").childNodes.includes(bar),
      "the control lives in the header, near the other injected UI");
    const labels = h.buttons().map((b) => b.textContent);
    assert.deepEqual(labels, ["Print", ".csv", ".xlsx"]);
    assert.deepEqual(h.buttons().map((b) => b.getAttribute("data-ws")), ["print", "csv", "xlsx"]);
    h.buttons().forEach((b) => {
      assert.equal(b.getAttribute("type"), "button", "never submit-style buttons");
      assert.ok(b._classes.has("ws-btn"));
    });
    assert.ok(h.env.doc.getElementById("ws-print-css"), "print CSS is injected");
    assert.ok(h.sheet(), "the printable sheet container is in the document");
    assert.ok(h.env.doc.body.childNodes.includes(h.sheet()), "the sheet is a direct body child so print CSS can isolate it");
  } finally { h.restore(); }
});

test("a page with no registered spec gets nothing at all (homework / landing / stub paths)", () => {
  for (const pathname of ["/homework/homework-1/index.html", "/index.html",
    "/ast110/index.html", "/phy110/index.html",
    "/labs/12-eclipse-board/index.html", "/labs/05-moon-phases/index.html"]) {
    const h = boot(pathname);
    try {
      assert.equal(h.bar(), null, pathname + ": no worksheet control");
      assert.equal(h.sheet(), null, pathname + ": no print sheet");
      assert.equal(h.env.doc.getElementById("ws-print-css"), null, pathname + ": no injected CSS");
      assert.equal(h.env.doc.querySelectorAll(".ws-btn").length, 0, pathname + ": no buttons");
    } finally { h.restore(); }
  }
});

test("the slug comes from the page path: index.html and bare directory URLs both mount", () => {
  for (const pathname of ["/astro-lab-playground/ast110/labs/16-time-lat-long/index.html",
    "/ast110/labs/16-time-lat-long/"]) {
    const h = boot(pathname);
    try {
      const bar = h.bar();
      assert.ok(bar, pathname + ": mounted");
      h.buttons().find((b) => b.getAttribute("data-ws") === "csv").click();
      assert.equal(h.env.downloads.length, 1, pathname + ": download fired");
      const anchors = h.doc.querySelectorAll("a");
      assert.equal(anchors.length, 1, pathname + ": one download anchor");
      assert.equal(anchors[0].download, "ast110-lab-16-time-lat-long-worksheet.csv",
        pathname + ": the folder name is the slug the file is named for");
    } finally { h.restore(); }
  }
});

test("Print calls window.print with body.ws-printing on, and restores it afterwards", () => {
  const h = boot("/ast110/labs/01-measurement/index.html");
  try {
    assert.equal(h.env.doc.body.classList.contains("ws-printing"), false, "class is off at rest");
    h.buttons().find((b) => b.getAttribute("data-ws") === "print").click();
    assert.deepEqual(h.env.prints, [true], "print() ran while the print class was on");
    assert.equal(h.env.doc.body.classList.contains("ws-printing"), false, "class restored after print()");
  } finally { h.restore(); }
});

test("a throwing or blocked print() still restores the body class", () => {
  const h = boot("/ast110/labs/01-measurement/index.html");
  try {
    h.env.window.print = () => { throw new Error("print blocked"); };
    assert.throws(() => globalThis.LS.ui.wsPrint(), /print blocked/);
    assert.equal(h.env.doc.body.classList.contains("ws-printing"), false, "restored via finally");
  } finally { h.restore(); }
});

test(".csv and .xlsx buttons hand the real worksheet bytes to the download glue", () => {
  const h = boot("/ast110/labs/01-measurement/index.html");
  try {
    h.buttons().find((b) => b.getAttribute("data-ws") === "csv").click();
    h.buttons().find((b) => b.getAttribute("data-ws") === "xlsx").click();
    assert.equal(h.env.downloads.length, 2, "one blob per click");

    const csv = h.blobs[0];
    assert.match(csv.type, /^text\/csv/, "csv blob is typed");
    const text = csv.parts.map((p) => String(p)).join("");
    assert.equal(text, globalThis.LS.worksheet.csvText("01-measurement"),
      "the download carries exactly the engine's csvText");

    const xlsx = h.blobs[1];
    assert.match(xlsx.type, /spreadsheetml\.sheet/, "xlsx blob is typed");
    const head = Array.from(xlsx.parts[0].slice(0, 2));
    assert.deepEqual(head, [0x50, 0x4b], "xlsx blob starts with the zip magic");

    const names = h.doc.querySelectorAll("a");
    assert.deepEqual(names.map((a) => a.download).sort(),
      ["ast110-lab-01-measurement-worksheet.csv", "ast110-lab-01-measurement-worksheet.xlsx"]
        .sort(),
      "anchors carry the engine's own file names");
  } finally { h.restore(); }
});

test("the print sheet renders the same content as the CSV: title, table grid, PRE and POST", () => {
  const h = boot("/ast110/labs/01-measurement/index.html");
  try {
    const sheet = h.sheet();
    const text = sheet.textContent;
    // Content parity is pinned against the ENGINE's own row matrix (the one csvText
    // and xlsxBytes render from), not a hand-copied list, so the sheet can never
    // drift from the downloadable files without failing here.
    const engineRows = WKS.rowsFor("01-measurement");
    let cells = 0;
    engineRows.forEach((row) => row.forEach((cell) => {
      if (cell === "") return;
      cells++;
      assert.ok(text.includes(cell), "sheet carries the engine cell: " + cell.slice(0, 48));
    }));
    assert.ok(cells > 20, "the engine row matrix has real content to compare (" + cells + " cells)");
    assert.ok(text.includes("PRE-LAB QUESTIONS") && text.includes("POST-LAB QUESTIONS"));

    // The hand-in fields, in the engine's own order, with nothing invented on top.
    const engineFields = engineRows[2].concat(engineRows[3]).filter((c) => c !== "");
    assert.deepEqual(
      h.sheet().querySelectorAll(".ws-field").map((s) => s.textContent.trim()),
      engineFields,
      "the sheet's Name/Date/Section/partners fields are exactly the CSV's"
    );

    const rows = sheet.querySelectorAll(".ws-grid tr");
    assert.equal(rows.length, SPEC.table.blankRows, "blank data rows match the descriptor");
    assert.equal(rows[0].childNodes.length, SPEC.table.header.length, "blank rows span every column");
    assert.equal(sheet.querySelectorAll("thead th").length, SPEC.table.header.length);
    assert.ok(h.env.doc.getElementById("ws-print-css").textContent.includes("@media print"),
      "the injected style block carries print rules");
  } finally { h.restore(); }
});

test("mount is idempotent: a second call reuses the control and never doubles the sheet", () => {
  const h = boot("/ast110/labs/01-measurement/index.html");
  try {
    const again = globalThis.LS.ui.mountWorksheet();
    assert.equal(again, h.bar(), "the same bar comes back");
    assert.equal(h.env.doc.querySelectorAll(".ws-bar").length, 1);
    assert.equal(h.env.doc.querySelectorAll(".ws-sheet").length, 1);
    assert.equal(h.env.doc.querySelectorAll("#ws-print-css").length, 1);
  } finally { h.restore(); }
});

test("every one of the 16 lab folders mounts from its own folder name", () => {
  for (const dir of LAB_DIRS) {
    const spec = WKS.get(dir);
    assert.ok(spec, dir + ": descriptor registered");
    const h = boot("/" + COURSE + "/labs/" + dir + "/index.html");
    try {
      const bar = h.bar();
      assert.ok(bar, dir + ": worksheet control mounts on its own page");
      assert.equal(h.env.doc.querySelector(".site-head .wrap").childNodes.includes(bar), true,
        dir + ": mounted in the header");
      assert.equal(h.buttons().length, 3, dir + ": Print / .csv / .xlsx");
      const rows = h.sheet().querySelectorAll(".ws-grid tr");
      assert.equal(rows.length, spec.table.blankRows, dir + ": sheet grid matches the descriptor");
      assert.equal(rows[0].childNodes.length, spec.table.header.length, dir + ": grid width");
      assert.ok(h.sheet().textContent.includes(spec.prelab[0]), dir + ": pre-lab text on the sheet");
      assert.ok(h.sheet().textContent.includes(spec.postlab[0]), dir + ": post-lab text on the sheet");
    } finally { h.restore(); }
  }
});
