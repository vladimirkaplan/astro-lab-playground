"use strict";
// BMC-19 / GitHub #16 - offline kit (service worker + one-zip classroom download).
//
// These tests pin the guarantees the offline kit makes:
//   (a) the precache manifest baked into the generated site/sw.js equals the exact
//       same site/ walk the generator used, every path really exists on disk, and the
//       site root "/" resolves to index.html;
//   (b) site/offline/kit.zip's central-directory listing equals that same walk, the
//       whole zip stays under 8 MB, and it is a genuine STORE zip (the stdlib reader
//       re-verifies every entry's CRC as it reads);
//   (c) the build is deterministic: rebuilding in memory reproduces the exact same zip
//       and service-worker bytes, without touching any tracked file;
//   (d) the generated worker is valid JavaScript (node --check);
//   (e) shared/ui.js registers the worker only on https/localhost, derives the site
//       root from its own shared/ui.js URL, and never throws;
//   (f) no absolute vladimirkaplan.github.io URL is baked into any page or script, so
//       the unzipped mirror works from any origin.
//
// The generator's own helpers are reused so "the same walk" is literally the same code.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const kit = require("../scripts/offline-kit.js");

const SITE = kit.SITE_DIR;
const SW_PATH = path.join(SITE, "sw.js");
const ZIP_PATH = path.join(SITE, "offline", "kit.zip");
const UI_PATH = path.join(SITE, "shared", "ui.js");

// Run the exact walk the generator uses, as leading-slash root-relative paths.
function walkManifest() {
  return kit.listSiteFiles(SITE).map((p) => "/" + p);
}

function parsePrecache(swSource) {
  const block = swSource.match(/var PRECACHE = \[([\s\S]*?)\];/);
  assert.ok(block, "site/sw.js must declare a var PRECACHE = [...] manifest");
  const out = [];
  for (const m of block[1].matchAll(/"([^"]*)"/g)) out.push(m[1]);
  return out;
}

// ---------- (a) precache manifest vs. the walk ----------
test("sw.js precache manifest == the site walk, every path exists, / maps to index.html", () => {
  const sw = fs.readFileSync(SW_PATH, "utf8");
  const precache = parsePrecache(sw);
  const walk = walkManifest();

  assert.deepEqual(precache, walk, "PRECACHE must equal the current walk, path for path");
  assert.ok(precache.length > 80, "the manifest should cover the whole site");

  for (const p of precache) {
    assert.ok(p.startsWith("/"), "manifest paths are root-relative: " + p);
    const abs = path.join(SITE, p.slice(1));
    assert.ok(fs.existsSync(abs), "precached path exists on disk: " + p);
  }

  // Site root resolves to the landing page.
  assert.ok(precache.includes("/index.html"), "the landing page is precached");
  assert.match(sw, /var INDEX = "\/index\.html";/, "INDEX is the cached landing page");
  assert.match(sw, /if \(p === "\/"\) list\.push\(INDEX\);/, '"/" maps to index.html on navigation');

  // The committed worker carries the version a fresh build would produce right now.
  const fresh = kit.buildSite(SITE);
  const m = sw.match(/var KIT_VERSION = "([0-9a-f]{64})";/);
  assert.ok(m, "KIT_VERSION is a 64-hex sha256");
  assert.equal(m[1], fresh.version, "committed sw.js version matches a fresh build (not stale)");
});

// ---------- worker shape ----------
test("sw.js is a classic worker with a version-derived cache name and network fallback", () => {
  const sw = fs.readFileSync(SW_PATH, "utf8");
  assert.doesNotMatch(sw, /importScripts|workbox|import\s/, "classic worker: no imports/workbox");
  assert.match(sw, /var CACHE = "astro-lab-playground-" \+ KIT_VERSION;/, "cache name = prefix + version");
  assert.match(sw, /k === CACHE \? undefined : caches\.delete\(k\)/, "activate deletes every other cache");
  assert.match(sw, /addEventListener\("fetch"/, "fetch handler present");
  assert.match(sw, /await cache\.match\(cands\[i\]\)/, "cache-first lookup");
  assert.match(sw, /return await fetch\(request\)/, "network fallback");
  assert.match(sw, /return Response\.error\(\);/, "fetch failure is signalled, never crashes the worker");
});

// ---------- (b) kit.zip central directory ----------
test("kit.zip central directory == the walk exactly, CRC-verified, under 8 MB", () => {
  const buf = fs.readFileSync(ZIP_PATH);
  const { entries } = kit.readZipEntries(buf, { withData: true }); // throws on any CRC mismatch
  const names = entries.map((e) => e.name).sort();
  const walk = kit.listSiteFiles(SITE).slice().sort();

  assert.deepEqual(names, walk, "zip listing equals the walk exactly (same files, same paths)");
  assert.ok(names.includes("index.html") && names.includes("sw.js"));
  assert.ok(!names.some((n) => n.startsWith("/")), "zip paths are site-relative, not absolute");
  assert.ok(!names.includes("offline/kit.zip"), "the zip does not contain itself");
  assert.ok(entries.every((e) => e.method === 0), "STORE method (no compression)");
  assert.ok(buf.length < 8 * 1024 * 1024, "kit.zip < 8 MB (was " + buf.length + " bytes)");
});

// ---------- (c) deterministic build ----------
test("rebuilding in memory is byte-identical (zip + sw) and writes nothing", () => {
  const before = fs.readFileSync(ZIP_PATH);
  const b1 = kit.buildSite(SITE);
  const b2 = kit.buildSite(SITE);
  assert.ok(b1.zipBuffer.equals(b2.zipBuffer), "two rebuilds produce identical zip bytes");
  assert.equal(b1.swSource, b2.swSource, "two rebuilds produce identical service-worker bytes");
  assert.ok(b1.zipBuffer.equals(before), "committed kit.zip already matches a deterministic rebuild");
  assert.ok(Buffer.from(b1.swSource, "utf8").equals(fs.readFileSync(SW_PATH)), "committed sw.js matches a rebuild");
});

// ---------- (d) the worker parses ----------
test("node --check accepts the generated site/sw.js", () => {
  const r = spawnSync(process.execPath, ["--check", SW_PATH], { encoding: "utf8" });
  assert.equal(r.status, 0, "sw.js must parse: " + (r.stderr || r.stdout));
});

// ---------- (e) ui.js registration guard ----------
test("ui.js registers the worker only on https/localhost, with the site root derived from its URL", () => {
  const src = fs.readFileSync(UI_PATH, "utf8");
  // Isolate the registration helper's own body so the assertions describe it, not the
  // unrelated try/catch blocks elsewhere in the file.
  const fnAt = src.indexOf("U.registerServiceWorker = function");
  assert.ok(fnAt > 0, "ui.js defines U.registerServiceWorker");
  const fn = src.slice(fnAt, src.indexOf("U.registerServiceWorker();", fnAt));

  const registerAt = fn.indexOf("navigator.serviceWorker.register(");
  assert.ok(registerAt > 0, "the helper registers a service worker");
  assert.equal(fn.indexOf("navigator.serviceWorker.register(", registerAt + 1), -1, "registers exactly once");

  // The registration is gated on a secure context.
  assert.match(fn, /location\.protocol === "https:"/, "gates on https");
  assert.match(fn, /"localhost"/, "allows localhost");
  assert.match(fn, /"127\.0\.0\.1"/, "allows 127.0.0.1");
  const guardAt = fn.indexOf("if (!secure) return false;");
  assert.ok(guardAt > 0, "explicit bail-out when not a secure context");
  assert.ok(guardAt < registerAt, "the secure-context guard runs before any register() call");

  // Site root comes from this script's own .../shared/ui.js URL, and a register()
  // with no resolvable root is skipped. The whole thing runs inside try/catch.
  assert.match(fn, /new URL\("\.\.\/", here\)/, "site root derived by going up from .../shared/ui.js");
  assert.match(fn, /if \(!here\) return false;/, "no current-script URL => no registration");
  assert.ok(fn.indexOf("try {") < registerAt && fn.indexOf("} catch (e) {") > registerAt,
    "registration runs inside try/catch so it can never break a page");
});

test("ui.js runtime: registers on https/localhost with correct sw URL + scope, silent elsewhere", () => {
  const desc = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const uiPath = require.resolve("../site/shared/ui.js");
  const probe = (protocol, host, scriptSrc, hasSW) => {
    delete globalThis.LS;
    delete require.cache[uiPath];
    let reg = null;
    const nav = hasSW
      ? { serviceWorker: { register: (u, o) => { reg = { swUrl: u, scope: o && o.scope }; return Promise.resolve(); } } }
      : undefined;
    Object.defineProperty(globalThis, "navigator", { value: nav, configurable: true, writable: true });
    globalThis.location = { protocol, hostname: host };
    globalThis.document = { currentScript: scriptSrc ? { src: scriptSrc } : null };
    require(uiPath);
    return reg;
  };
  try {
    const gh = probe("https:", "vladimirkaplan.github.io",
      "https://vladimirkaplan.github.io/astro-lab-playground/shared/ui.js", true);
    assert.deepEqual(gh, {
      swUrl: "https://vladimirkaplan.github.io/astro-lab-playground/sw.js",
      scope: "https://vladimirkaplan.github.io/astro-lab-playground/",
    }, "https: sw URL + scope both land on the site root");

    const lo = probe("http:", "localhost", "http://localhost:8080/shared/ui.js", true);
    assert.deepEqual(lo, { swUrl: "http://localhost:8080/sw.js", scope: "http://localhost:8080/" }, "localhost registers over http too");

    const lan = probe("http:", "10.0.0.5", "http://10.0.0.5:8080/shared/ui.js", true);
    assert.equal(lan, null, "plain-http LAN mirror never registers (browsers refuse it, and it is not needed)");

    assert.equal(probe("file:", "", "file:///home/x/site/shared/ui.js", true), null, "file:// never registers");
    assert.equal(probe("https:", "example.test", "https://example.test/shared/ui.js", false), null, "no SW API => no-op");
    assert.equal(probe("https:", "example.test", null, true), null, "no current-script URL => no-op");
  } finally {
    delete globalThis.location;
    delete globalThis.document;
    delete globalThis.LS;
    if (desc) Object.defineProperty(globalThis, "navigator", desc);
    else delete globalThis.navigator;
  }
});

// ---------- (f) no baked-in site origin ----------
test("no absolute vladimirkaplan.github.io URL anywhere in site/**/*.html or *.js", () => {
  const offenders = [];
  (function walk(rel) {
    const dir = rel ? path.join(SITE, rel) : SITE;
    for (const name of fs.readdirSync(dir)) {
      const childRel = rel ? rel + "/" + name : name;
      const abs = path.join(SITE, childRel);
      if (fs.statSync(abs).isDirectory()) { walk(childRel); continue; }
      if (!/\.(html|js)$/.test(name)) continue;
      if (fs.readFileSync(abs, "utf8").includes("vladimirkaplan.github.io")) offenders.push(childRel);
    }
  })("");
  assert.deepEqual(offenders, [], "site must work from any origin: no baked-in github.io URLs");
});
