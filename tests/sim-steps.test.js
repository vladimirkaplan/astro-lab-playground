"use strict";
// BMC-23: every Simulate Part carries its own numbered "what to do" list, the
// shared usage box is mounted from shared/ui.js on every lab page, and every
// canvas with a drag handle wears a "Drag this" chip.
//
// Contract tested here (static, no browser):
//   (1) inside each lab's #simulate section, every Part/bench heading (h2/h3)
//       is followed by exactly one <ol class="steps"> with 5-8 <li> items
//       before the next heading;
//   (2) log/table/calendar headings are NOT parts and must NOT gain step
//       lists (they keep the lists honest: a part is a thing you do);
//   (3) shared/ui.js exposes usageBox/mountUsage and the box is three lines in
//       Learn -> Simulate -> Check order, mounted at the top of #simulate;
//   (4) each known canvas drag handle has a .drag-chip within a short
//       distance of the canvas element.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SITE = path.join(ROOT, "site");

const LAB_DIRS = ["01-measurement", "02-math", "03-celestial-sphere", "04-moon-phases",
  "05-moonrise-eclipses", "06-retrograde-mars", "07-lenses", "08-venus-phases",
  "09-pendulum", "10-spectra", "11-parallax", "12-hr-diagram", "13-variables",
  "14-galaxy-id", "15-hubbles-law", "16-time-lat-long"];

// Headings that are records or reference tables, not benches: no steps there.
const NON_PART = /log|table|notes|calendar|events|data page/i;

function simulateSection(html) {
  const start = html.indexOf('<section id="simulate"');
  assert.ok(start >= 0, "page has a #simulate section");
  let depth = 0;
  const tag = /<section\b|<\/section>/g;
  tag.lastIndex = start;
  let m;
  while ((m = tag.exec(html))) {
    depth += m[0] === "</section>" ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index);
  }
  throw new Error("unbalanced sections in simulate panel");
}

function headings(sim) {
  const out = [];
  const re = /<h([23])[^>]*>([\s\S]*?)<\/h\1>/g;
  let m;
  while ((m = re.exec(sim))) {
    out.push({
      at: m.index,
      text: m[2].replace(/<[^>]*>/g, "").replace(/&[^\s;]+;/g, " ").trim(),
    });
  }
  return out;
}

function firstStepsList(segment) {
  const open = segment.indexOf('<ol class="steps">');
  if (open < 0) return null;
  const close = segment.indexOf("</ol>", open);
  assert.ok(close > open, "steps list must be closed");
  const body = segment.slice(open, close);
  return (body.match(/<li\b/g) || []).length;
}

test("every Simulate Part has an ol.steps with 5-8 li before the next heading", () => {
  let total = 0;
  for (const dir of LAB_DIRS) {
    const html = fs.readFileSync(path.join(SITE, "labs", dir, "index.html"), "utf8");
    const sim = simulateSection(html);
    const hs = headings(sim);
    let parts = 0;
    hs.forEach((h, i) => {
      const end = i + 1 < hs.length ? hs[i + 1].at : sim.length;
      const segment = sim.slice(h.at, end);
      if (NON_PART.test(h.text)) {
        assert.equal(segment.indexOf('<ol class="steps">'), -1,
          dir + ": '" + h.text + "' is a record, not a part: no step list");
        return;
      }
      parts++;
      const n = firstStepsList(segment);
      assert.ok(n !== null, dir + ": part '" + h.text + "' needs <ol class=\"steps\">");
      assert.ok(n >= 5 && n <= 8,
        dir + ": part '" + h.text + "' has " + n + " steps; want 5-8");
      assert.ok(h.text.length > 0, dir + ": part heading has text");
    });
    assert.ok(parts >= 1, dir + ": Simulate tab has at least one Part/bench heading");
    total += parts;
  }
  assert.ok(total >= 30, "the 16 labs should carry 30+ step lists in total, got " + total);
});

test("each canvas drag handle has a nearby Drag-this chip", () => {
  const expected = [
    ["01-measurement", "rulerCanvas"],
    ["03-celestial-sphere", "chartStage"],
    ["09-pendulum", "plot"],
    ["10-spectra", "scopeCanvas"],
    ["15-hubbles-law", "plot"],
    ["15-hubbles-law", "plot2"],
  ];
  for (const [dir, canvasId] of expected) {
    const html = fs.readFileSync(path.join(SITE, "labs", dir, "index.html"), "utf8");
    const at = html.indexOf('id="' + canvasId + '"');
    assert.ok(at >= 0, dir + ": canvas " + canvasId + " exists");
    const near = html.slice(at, at + 400);
    assert.ok(near.includes('class="drag-chip"'),
      dir + ": " + canvasId + " needs a .drag-chip within reach of the canvas");
  }
  for (const dir of LAB_DIRS) {
    const html = fs.readFileSync(path.join(SITE, "labs", dir, "index.html"), "utf8");
    assert.ok(!/class="drag-chip"[^>]*>[^<]{20,}/.test(html),
      dir + ": the drag chip stays short (\"Drag this\", not a sentence)");
  }
});

// ---------- usage box ----------

function makeFakeEl(tag) {
  const attrs = {};
  const el = {
    tagName: String(tag).toUpperCase(),
    childNodes: [],
    id: "",
    className: "",
    textContent: "",
    setAttribute(k, v) { attrs[k] = String(v); if (k === "id") el.id = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
    appendChild(c) { el.childNodes.push(c); return c; },
    prepend(c) { el.childNodes.unshift(c); return c; },
  };
  return el;
}

function loadUiFresh() {
  delete globalThis.LS;
  delete require.cache[require.resolve("../site/shared/ui.js")];
  globalThis.document = {
    createElement: makeFakeEl,
    createTextNode: (t) => ({ nodeType: 3, textContent: String(t) }),
  };
  require("../site/shared/ui.js");
  return globalThis.LS.ui;
}

function restoreDoc(saved) {
  if (saved === undefined) delete globalThis.document; else globalThis.document = saved;
}

test("usageBox is one title + three lines in Learn -> Simulate -> Check order", () => {
  const savedDoc = globalThis.document;
  try {
    const U = loadUiFresh();
    const mount = makeFakeEl("section");
    const box = U.usageBox(mount);
    assert.equal(box.className, "usage-box");
    assert.equal(box.id, "usage-box");
    assert.equal(box.childNodes.length, 4, "title + exactly three lines");
    const lines = box.childNodes.slice(1).map((p) => p.textContent);
    assert.match(lines[0], /Learn/);
    assert.match(lines[1], /Simulate/);
    assert.match(lines[2], /Check/);
    assert.ok(!/Learn/.test(lines[1]), "each tab is named on exactly one line");
    assert.equal(mount.childNodes[0], box, "the box is prepended into the Simulate panel");
  } finally {
    restoreDoc(savedDoc);
  }
});

test("mountUsage targets #simulate, no-ops without it, and is idempotent", () => {
  const savedDoc = globalThis.document;
  try {
    const U = loadUiFresh();
    globalThis.document = { getElementById: () => null };
    assert.equal(U.mountUsage(), null, "no #simulate: nothing mounted");

    const sim = makeFakeEl("section");
    sim.id = "simulate";
    globalThis.document = {
      createElement: makeFakeEl,
      createTextNode: (t) => ({ nodeType: 3, textContent: String(t) }),
      getElementById: (id) => [sim].concat(sim.childNodes).find((el) => el.id === id) || null,
    };
    const box = U.mountUsage();
    assert.ok(box && box.id === "usage-box", "box mounted at #simulate");
    assert.equal(sim.childNodes[0], box);
    const again = U.mountUsage();
    assert.equal(again, box, "second mount reuses the box, never stacks");
  } finally {
    restoreDoc(savedDoc);
  }
});
