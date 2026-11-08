"use strict";
// Regression test for BMC-17: switching to the Simulate tab must re-fit the sim
// canvases. At boot only the Learn panel is visible, so every canvas in the
// hidden #simulate panel sized its bitmap from clientWidth === 0 and fell back
// to the 480/520 default; a plain tab click fired no resize event, so opening
// Simulate stretched the stale bitmap while the click-to-nm mapping used the
// real layout width - the drawn scale and reported wavelengths disagreed, i.e.
// the spectrum range appeared to drift. The fix dispatches a synthetic window
// resize *after* the panel is unhidden, so a canvas reading clientWidth inside
// its resize handler sees its real width. These tests pin both halves: that a
// resize fires once per select, and that it fires only after the panel is shown.

const test = require("node:test");
const assert = require("node:assert/strict");

function makeEl(id, classes) {
  const set = new Set(classes || []);
  const attrs = {};
  const listeners = {};
  return {
    id: id || "",
    hidden: false,
    className: (classes || []).join(" "),
    classList: {
      toggle: function (name, on) { if (on) set.add(name); else set.delete(name); },
      contains: function (name) { return set.has(name); },
    },
    setAttribute: function (k, v) { attrs[k] = String(v); },
    getAttribute: function (k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
    addEventListener: function (type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    _fire: function (type, ev) { (listeners[type] || []).forEach(fn => fn(ev)); },
    _classes: set,
  };
}

function makeScope() {
  // The markup contract initTabs expects: .tab-btn[data-tab] + .tab-panel[id].
  const learnBtn = makeEl("", ["tab-btn"]); learnBtn.setAttribute("data-tab", "learn");
  const simBtn = makeEl("", ["tab-btn"]); simBtn.setAttribute("data-tab", "simulate");
  const checkBtn = makeEl("", ["tab-btn"]); checkBtn.setAttribute("data-tab", "check");
  const learn = makeEl("learn", ["tab-panel", "learn"]);
  const simulate = makeEl("simulate", ["tab-panel"]);
  const check = makeEl("check", ["tab-panel"]);
  const all = [learnBtn, simBtn, checkBtn, learn, simulate, check];
  const byId = { learn, simulate, check };
  const scope = {
    querySelectorAll: function (sel) {
      const cls = sel.replace(/^\./, "");
      return all.filter(e => e._classes.has(cls));
    },
    getElementById: function (id) { return byId[id] || null; },
  };
  return { scope, byId };
}

function installEnv(scope) {
  const saved = {};
  const env = {};
  // window doubles as the global event bus the sims listen on.
  const listeners = {};
  env.window = {
    addEventListener: function (type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    dispatchEvent: function (ev) { (listeners[ev.type] || []).slice().forEach(fn => fn(ev)); return true; },
  };
  env.Event = function Event(type) { this.type = type; };
  env.document = scope;
  env.location = { href: "https://example.test/lab/index.html", hash: "", replace: function () {} };
  env.localStorage = { getItem: () => null, setItem: () => {} };
  ["window", "Event", "document", "location", "localStorage"].forEach(k => {
    saved[k] = globalThis[k]; globalThis[k] = env[k];
  });
  let resizeCount = 0;
  const resizeStates = [];
  env.window.addEventListener("resize", () => {
    resizeCount++;
    // Snapshot panel visibility the instant a canvas would run its re-fit.
    resizeStates.push({
      learnHidden: scope.getElementById("learn").hidden,
      simHidden: scope.getElementById("simulate").hidden,
    });
  });
  const restore = () => {
    Object.keys(saved).forEach(k => {
      if (saved[k] === undefined) delete globalThis[k]; else globalThis[k] = saved[k];
    });
  };
  return { env, restore, stats: () => ({ resizeCount, resizeStates }) };
}

test("initTabs().select is exposed so callers can drive a tab switch", () => {
  const { scope } = makeScope();
  const { restore } = installEnv(scope);
  try {
    delete globalThis.LS; // force a fresh ui.js load for a clean return value
    delete require.cache[require.resolve("../site/shared/ui.js")];
    require("../site/shared/ui.js");
    const tabs = globalThis.LS.ui.initTabs(scope);
    assert.equal(typeof tabs.select, "function");
  } finally { restore(); }
});

test("switching to Simulate dispatches a resize AFTER the panel is shown (BMC-17)", () => {
  const { scope } = makeScope();
  const { restore, stats } = installEnv(scope);
  try {
    delete globalThis.LS;
    delete require.cache[require.resolve("../site/shared/ui.js")];
    require("../site/shared/ui.js");
    const tabs = globalThis.LS.ui.initTabs(scope); // boots on "learn"

    const before = stats().resizeCount; // boot select already fired once
    tabs.select("simulate");
    const { resizeCount, resizeStates } = stats();

    assert.equal(resizeCount, before + 1, "exactly one synthetic resize per tab switch");
    const last = resizeStates[resizeStates.length - 1];
    // Ordering is the crux: when the handler runs, the Simulate panel is already
    // visible, so a canvas reading clientWidth no longer sees the boot-time 0.
    assert.equal(last.simHidden, false, "resize fired after #simulate was unhidden");
    assert.equal(last.learnHidden, true, "the Learn panel is hidden on the new tab");
  } finally { restore(); }
});

test("every tab switch re-kicks the canvases, including returning to Simulate", () => {
  const { scope } = makeScope();
  const { restore, stats } = installEnv(scope);
  try {
    delete globalThis.LS;
    delete require.cache[require.resolve("../site/shared/ui.js")];
    require("../site/shared/ui.js");
    const tabs = globalThis.LS.ui.initTabs(scope);

    const start = stats().resizeCount;
    tabs.select("check");
    tabs.select("learn");
    tabs.select("simulate");
    const { resizeCount, resizeStates } = stats();
    assert.equal(resizeCount, start + 3, "one resize per select, no double-firing");
    assert.equal(resizeStates[resizeStates.length - 1].simHidden, false);
  } finally { restore(); }
});
