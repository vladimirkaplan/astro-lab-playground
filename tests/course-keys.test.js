"use strict";
// BMC-27: localStorage survived the move.
//
// Lab folders now sit under a course directory, so new writes are keyed
// <prefix>.<course>.<slug>...; every old bare-slug key must still READ, so no
// student loses a Check-tab tick, a Fun Mode choice, or a logged table. The
// fallbacks are pinned here, together with the registry-driven banner/licence
// text (the AST110 output is byte-identical to the pre-move html).

const test = require("node:test");
const assert = require("node:assert/strict");

const M = require("./lab-manifest.js");
const UI_PATH = require.resolve("../site/shared/ui.js");
const STORE_PATH = require.resolve("../site/shared/store.js");

// ---------- stub browser ----------

function makeFakeEl(tag) {
  const attrs = {};
  const listeners = {};
  const el = {
    tagName: String(tag).toUpperCase(),
    childNodes: [],
    id: "",
    className: "",
    textContent: "",
    innerHTML: "",
    setAttribute(k, v) { attrs[k] = String(v); if (k === "id") el.id = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
    appendChild(c) { el.childNodes.push(c); return c; },
    prepend(c) { el.childNodes.unshift(c); return c; },
    append(...cs) { cs.forEach((c) => el.childNodes.push(c)); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    _fire(t) { (listeners[t] || []).slice().forEach((fn) => fn({})); },
    click() { el._fire("click"); },
  };
  return el;
}

function makeStore() {
  const map = new Map();
  return {
    _map: map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}

function makeDocument() {
  const body = makeFakeEl("body");
  return {
    readyState: "complete",
    body,
    createElement: (t) => makeFakeEl(t),
    createTextNode: (t) => ({ nodeType: 3, textContent: String(t) }),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

// Boot fresh ui.js + store.js with the page at `pathname` and the given
// pre-seeded localStorage. fn gets { U, store, ls, mount }.
function boot(pathname, seed, fn) {
  const ls = makeStore();
  Object.entries(seed || {}).forEach(([k, v]) => ls.setItem(k, v));
  const saved = {};
  const keys = ["document", "location", "localStorage"];
  keys.forEach((k) => { saved[k] = Object.getOwnPropertyDescriptor(globalThis, k); });
  globalThis.document = makeDocument();
  globalThis.location = { pathname, href: "https://x.test" + pathname,
    hash: "", replace() {}, split() {} };
  globalThis.localStorage = ls;
  try {
    delete require.cache[UI_PATH];
    delete require.cache[STORE_PATH];
    require(UI_PATH);
    require(STORE_PATH);
    return fn({ U: globalThis.LS.ui, store: globalThis.LS.store, ls,
      mount: makeFakeEl("main") });
  } finally {
    keys.forEach((k) => {
      if (saved[k]) Object.defineProperty(globalThis, k, saved[k]);
      else delete globalThis[k];
    });
  }
}

const AST_LAB = "/ast110/labs/09-pendulum/index.html";
const PHY_LAB = "/phy110/labs/01-fixture/index.html";
const HW_PAGE = "/homework/homework-1/index.html";

// ---------- banner + licence render from the registry ----------

test("AST110 pages print the banner and licence from the registry", () => {
  boot(AST_LAB, {}, ({ U, mount }) => {
    U.banner(mount);
    const banner = mount.childNodes[0];
    assert.equal(banner.innerHTML,
      "<strong>Practice sim, not your BMCC submission.</strong> Do the real lab and " +
      "follow your instructor's rules. Explanations are written for this site. " +
      "Topic order follows OpenStax <em>Astronomy 2e</em> for further reading.");
    const licence = mount.childNodes[mount.childNodes.length - 1];
    assert.equal(licence.innerHTML,
      "Unofficial student project, not affiliated with any college. Code: MIT. " +
      "Explanations: CC BY 4.0 (topic order follows OpenStax <em>Astronomy 2e</em>). " +
      "Public data sources only; no student data of any kind lives here. " +
      "This sim rehearses the lab - it is not a submission channel.");
  });
});

test("PHY110 pages print the College Physics source line, not the Astronomy one", () => {
  boot(PHY_LAB, {}, ({ U, mount }) => {
    U.banner(mount);
    const banner = mount.childNodes[0];
    assert.match(banner.innerHTML, /Practice sim, not your BMCC submission\./);
    assert.ok(banner.innerHTML.includes(
      "Explanations are written for this site. Topic order follows OpenStax " +
      "<em>College Physics 2e</em> for further reading."),
    "the PHY110 attribution line prints as registered");
    assert.doesNotMatch(banner.innerHTML, /Astronomy/);
    const licence = mount.childNodes[mount.childNodes.length - 1];
    assert.ok(licence.innerHTML.includes(
      "Explanations: CC BY 4.0 (topic order follows OpenStax <em>College Physics 2e</em>)."));
  });
});

// ---------- Fun/Ideal mode key with bare-slug fallback ----------

test("Fun Mode saved under the old bare-slug key still loads on the moved lab", () => {
  boot(AST_LAB, { "labSimsMode.09-pendulum": "fun" }, ({ U }) => {
    assert.equal(U.getMode("09-pendulum"), "fun", "legacy key still honoured");
  });
});

test("the course key wins over the legacy key, and is what new writes use", () => {
  boot(AST_LAB, {
    "labSimsMode.09-pendulum": "fun",
    "labSimsMode.ast110.09-pendulum": "ideal",
  }, ({ U }) => {
    assert.equal(U.getMode("09-pendulum"), "ideal", "new key beats the fallback");
  });
  boot(AST_LAB, { "labSimsMode.09-pendulum": "fun" }, ({ U, ls, mount }) => {
    const wrap = U.modeToggle("09-pendulum", mount);
    const fun = wrap.childNodes.find((b) => b.textContent === "Fun (noisy instrument)");
    assert.ok(fun, "the Fun button is rendered");
    fun.click(); // the real handler: localStorage.setItem(U.MODE_KEY(labId), "fun")
    assert.equal(ls._map.get("labSimsMode.ast110.09-pendulum"), "fun",
      "new writes are keyed by course");
    assert.equal(ls._map.get("labSimsMode.09-pendulum"), "fun", "legacy value untouched");
  });
});

test("PHY110 lab writes its own course key", () => {
  boot(PHY_LAB, {}, ({ U, ls }) => {
    ls.setItem(U.MODE_KEY("01-fixture"), "fun");
    assert.equal(ls._map.get("labSimsMode.phy110.01-fixture"), "fun");
    assert.equal(U.getMode("01-fixture"), "fun");
  });
});

test("homework (not moved yet) keeps the fallback course and reads its old key", () => {
  boot(HW_PAGE, { "labSimsMode.hw1": "fun" }, ({ U }) => {
    assert.equal(U.getMode("hw1"), "fun", "old homework tick survives");
    assert.equal(U.MODE_KEY("hw1"), "labSimsMode.ast110.hw1",
      "new homework writes land in the first course's namespace");
  });
});

// ---------- progress ticks ----------

test("AST110 landing shows ticks from the legacy blob and its own course blob", () => {
  boot("/ast110/index.html", {
    "labSimsProgress.v1": JSON.stringify({ "01-measurement": { checks: true } }),
    "labSimsProgress.ast110.v1": JSON.stringify({ "02-math": { checks: true } }),
  }, ({ U }) => {
    const all = U.progressAll();
    assert.ok(all["01-measurement"] && all["01-measurement"].checks,
      "pre-move Check-tab tick still renders");
    assert.ok(all["02-math"] && all["02-math"].checks, "post-move tick renders");
  });
});

test("progressMark writes the course blob and never touches the legacy blob", () => {
  const legacy = JSON.stringify({ "01-measurement": { checks: true } });
  boot("/ast110/labs/02-math/index.html", { "labSimsProgress.v1": legacy }, ({ U, ls }) => {
    const before = ls._map.get("labSimsProgress.v1");
    U.progressMark("02-math", "checks");
    assert.equal(ls._map.get("labSimsProgress.v1"), before, "legacy blob untouched");
    const course = JSON.parse(ls._map.get("labSimsProgress.ast110.v1"));
    assert.ok(course["02-math"].checks, "new tick in the course blob");
    assert.ok(!course["01-measurement"], "legacy ticks are not copied along");
  });
});

test("PHY110 progress lives in the PHY110 blob and cannot collide with AST110", () => {
  boot(PHY_LAB, {
    "labSimsProgress.ast110.v1": JSON.stringify({ "01-measurement": { checks: true } }),
  }, ({ U, ls }) => {
    U.progressMark("01-fixture", "checks");
    const phy = JSON.parse(ls._map.get("labSimsProgress.phy110.v1"));
    assert.ok(phy["01-fixture"].checks, "PHY110 tick stored per course");
    assert.ok(!phy["01-measurement"],
      "PHY110 blob stays free of AST110 lab ids, so same-slug labs cannot shadow each other");
  });
});

// ---------- data tables (store.js) ----------

test("a table logged under the old bare key still loads on the moved lab", () => {
  const row = { header: ["a", "b"], rows: [[1, 2]], savedAt: 1 };
  boot(AST_LAB, { "labSimsTable.09-pendulum.runs": JSON.stringify(row) },
    ({ store }) => {
      assert.deepEqual(store.load("09-pendulum", "runs"), row,
        "pre-move logged table still opens");
    });
});

test("store.save writes the course key, load prefers it, clear removes both", () => {
  const old = { header: ["a", "b"], rows: [["old", "old"]], savedAt: 1 };
  boot(AST_LAB, { "labSimsTable.09-pendulum.runs": JSON.stringify(old) },
    ({ store, ls }) => {
      store.save("09-pendulum", "runs", ["a", "b"], [["new", "new"]]);
      assert.ok(ls._map.has("labSimsTable.ast110.09-pendulum.runs"),
        "new writes are keyed by course");
      const got = store.load("09-pendulum", "runs");
      assert.deepEqual(got.rows, [["new", "new"]], "the course key wins over the fallback");
      store.clear("09-pendulum", "runs");
      assert.equal(store.load("09-pendulum", "runs"), null, "clear sweeps both keys");
    });
});

test("PHY110 lab tables use the phy110 key", () => {
  boot(PHY_LAB, {}, ({ store, ls }) => {
    store.save("01-fixture", "runs", ["a", "b"], [[1, 2]]);
    assert.ok(ls._map.has("labSimsTable.phy110.01-fixture.runs"));
  });
});

// ---------- no registry at all: nothing crashes, keys stay bare ----------

test("ui.js and store.js without courses.js fall back to the pre-BMC-27 bare keys", () => {
  const savedLSdesc = Object.getOwnPropertyDescriptor(globalThis, "LS");
  const saved = {};
  const keys = ["document", "location", "localStorage"];
  try {
    keys.forEach((k) => { saved[k] = Object.getOwnPropertyDescriptor(globalThis, k); });
    globalThis.document = makeDocument();
    globalThis.location = { pathname: "/somewhere/labs/x/index.html", hash: "", replace() {} };
    globalThis.localStorage = makeStore();
    delete globalThis.LS; // the registry is NOT loaded in this scenario
    delete require.cache[UI_PATH];
    delete require.cache[STORE_PATH];
    require(UI_PATH);
    require(STORE_PATH);
    const U = globalThis.LS.ui;
    const S = globalThis.LS.store;
    assert.equal(U.MODE_KEY("x"), "labSimsMode.x", "mode key stays bare, no crash");
    assert.equal(U.progressKey(), "labSimsProgress.v1", "progress key stays bare");
    U.banner(globalThis.document.body); // banner keeps its first half, drops the source line
    S.save("x", "t", ["a", "b"], [[1, 2]]);
    assert.ok(globalThis.localStorage._map.has("labSimsTable.x.t"), "table key stays bare");
  } finally {
    keys.forEach((k) => {
      if (saved[k]) Object.defineProperty(globalThis, k, saved[k]);
      else delete globalThis[k];
    });
    delete globalThis.LS;
    if (savedLSdesc) Object.defineProperty(globalThis, "LS", savedLSdesc);
    require(M.siteFile("shared", "courses.js")); // restore the registry for later tests
  }
});
