"use strict";
// Lab 14 catalog + page-payload tests. The frozen image catalog (LS.galaxies)
// is checked for shape, coverage, licence gate and file existence on disk; the
// seeded orderings are pinned; every graded answer baked into index.html's
// data-ex payloads is re-derived from the module (like hw-content.test.js), so
// the Check tab can never drift from the catalog.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("../site/shared/units.js");
require("../site/labs/14-galaxy-id/galaxies.js");
const G = globalThis.LS.galaxies;

const ROOT = path.join(__dirname, "..");
const IMG_DIR = path.join(ROOT, "site", "img");
const LAB_DIR = path.join(ROOT, "site", "labs", "14-galaxy-id");

const EXPECTED_KEYS = ["m87", "m110", "m31", "m33", "m51", "m101",
  "ngc1300", "m104", "ngc253", "m82"];

// ---- catalog shape + coverage ---------------------------------------------

test("catalog: exactly ten frozen entries with the required fields", () => {
  assert.equal(G.GALAXIES.length, 10);
  assert.ok(Object.isFrozen(G.GALAXIES), "GALAXIES array must be frozen");
  const keys = G.GALAXIES.map((e) => e.key);
  assert.deepEqual(keys.slice().sort(), EXPECTED_KEYS.slice().sort(),
    "catalog keys must be the ten briefed galaxies");
  const seen = new Set();
  for (const e of G.GALAXIES) {
    assert.ok(!seen.has(e.key), "duplicate key " + e.key);
    seen.add(e.key);
    for (const f of ["name", "family", "sub", "hubStep", "constellation",
      "approxDistanceMly", "approxSizeArcmin", "vmag", "img",
      "licenseShortName", "credit", "sourceUrl", "caption", "reason"]) {
      assert.ok(e[f] !== undefined && e[f] !== "", e.key + " missing " + f);
    }
    assert.ok(Array.isArray(e.designations) && e.designations.length >= 1);
    assert.ok(isFinite(e.approxDistanceMly) && e.approxDistanceMly > 0,
      e.key + " distance");
    assert.ok(isFinite(e.approxSizeArcmin) && e.approxSizeArcmin > 0,
      e.key + " size");
    assert.ok(isFinite(e.vmag), e.key + " vmag");
    assert.ok(G.FAMILIES.includes(e.family), e.key + " bad family " + e.family);
    assert.equal(e.img, e.key + ".jpg");
    assert.ok(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(e.sourceUrl),
      e.key + " sourceUrl must name the Commons File page");
  }
});

test("catalog family coverage: >=2 E, >=4 S, a SB, an Irr/pec", () => {
  const c = G.familyCounts();
  assert.equal(c.E + c.S + c.SB + c["Irr/pec"], 10);
  assert.ok(c.E >= 2, "need >=2 ellipticals, got " + c.E);
  assert.ok(c.S >= 4, "need >=4 spirals, got " + c.S);
  assert.ok(c.SB >= 1, "need a barred spiral");
  assert.ok(c["Irr/pec"] >= 1, "need an irregular/peculiar");
});

test("licence gate: every image is PD / CC0 / CC BY(-SA); never NC/ND/ARR", () => {
  for (const e of G.GALAXIES) {
    assert.match(e.licenseShortName, G.LICENSE_OK, e.key + " licence: " + e.licenseShortName);
    assert.doesNotMatch(e.licenseShortName, G.LICENSE_BAD,
      e.key + " carries a non-allowlisted clause: " + e.licenseShortName);
    assert.ok(/noncommercial|noderiv|nc\b|nd\b/i.test(e.licenseShortName) === false);
  }
});

// ---- the image files themselves on disk ------------------------------------

test("every catalog image exists in site/img, is >20KB and a real JPEG", () => {
  for (const e of G.GALAXIES) {
    const p = path.join(IMG_DIR, e.img);
    assert.ok(fs.existsSync(p), "missing image file " + e.img);
    const buf = fs.readFileSync(p);
    assert.ok(buf.length > 20000, e.img + " too small: " + buf.length + " bytes");
    assert.equal(buf[0], 0xFF, e.img + " bad SOI marker");
    assert.equal(buf[1], 0xD8, e.img + " bad SOI marker");
  }
});

test("site/img holds exactly the ten expected files, no strays", () => {
  const files = fs.readdirSync(IMG_DIR).sort();
  assert.deepEqual(files, EXPECTED_KEYS.map((k) => k + ".jpg").sort(),
    "site/img must contain only the ten catalog images");
});

// ---- ATTRIBUTION.md mirrors the catalog -------------------------------------

test("ATTRIBUTION.md names Wikimedia Commons, every file, licence and source URL", () => {
  const md = fs.readFileSync(path.join(ROOT, "ATTRIBUTION.md"), "utf8");
  assert.match(md, /Wikimedia Commons/, "header must name Wikimedia Commons");
  for (const e of G.GALAXIES) {
    assert.ok(md.includes(e.img), "ATTRIBUTION.md missing file " + e.img);
    assert.ok(md.includes(e.licenseShortName),
      "ATTRIBUTION.md missing exact licence " + e.licenseShortName + " for " + e.img);
    assert.ok(md.includes(e.sourceUrl), "ATTRIBUTION.md missing source URL for " + e.img);
  }
});

// ---- seeded orderings --------------------------------------------------------

test("shuffleSeeded is deterministic, a permutation, and seed-sensitive", () => {
  const base = G.GALAXIES.map((e) => e.key);
  const a = G.shuffleSeeded(base, 14), b = G.shuffleSeeded(base, 14);
  assert.deepEqual(a, b, "same seed must reproduce order");
  assert.deepEqual(a.slice().sort(), base.slice().sort(), "shuffle must permute");
  assert.notDeepEqual(a, G.shuffleSeeded(base, 999), "different seeds should differ");
});

test("classifyOrder and identifyPass return all ten with unique keys", () => {
  for (const seed of [14, 91, 2026]) {
    const order = G.classifyOrder(seed);
    assert.equal(order.length, 10);
    assert.deepEqual(order.slice().sort(), G.GALAXIES.map((e) => e.key).sort());
    const pass = G.identifyPass(seed);
    assert.equal(pass.length, 10);
    assert.deepEqual(pass.map((r) => r.key).sort(),
      G.GALAXIES.map((e) => e.key).sort());
  }
});

test("identifyRound options: answer present, no duplicate families (no same-shape trick)", () => {
  const pass = G.identifyPass(91);
  for (const r of pass) {
    const target = G.byKey(r.key);
    assert.ok(r.options.includes(r.answer), r.key + " answer must be an option");
    assert.equal(r.options.length, 4, r.key + " needs four options");
    assert.equal(new Set(r.options).size, 4, r.key + " duplicate option");
    const fams = r.options.map((n) => G.GALAXIES.find((e) => e.name === n).family);
    assert.equal(new Set(fams).size, 4,
      r.key + " options must span four distinct families, got " + fams.join("/"));
    assert.ok(fams.includes(target.family), r.key + " own family must appear");
  }
});

// ---- classification grading (module answers, reused by Check payloads) -------

test("gradeClassify: truth passes, one step of stage slack, wrong family fails", () => {
  for (const e of G.GALAXIES) {
    const truth = G.gradeClassify(e, e.family, "b");
    assert.ok(truth.familyOK, e.key + " own family must pass");
    if (G.subRequired(e)) {
      // e.sub is always at/next to b for these targets; verify true-sub passes too
      const sub = e.sub.length === 1 ? e.sub : "b";
      assert.ok(G.gradeClassify(e, e.family, sub).familyOK);
    } else {
      assert.ok(G.gradeClassify(e, e.family, null).ok, e.key + " family-only must pass");
    }
    const wrong = G.FAMILIES.find((f) => f !== e.family);
    assert.equal(G.gradeClassify(e, wrong, "b").ok, false,
      e.key + " wrong family must fail");
  }
  // stage forgiveness is bounded: an 'a' (Sombrero) rejects 'c' but takes 'b'
  assert.ok(G.subAccepted(G.byKey("m104"), "b"));
  assert.ok(!G.subAccepted(G.byKey("m104"), "c"));
  // bc centred between b and c accepts both
  assert.ok(G.subAccepted(G.byKey("m51"), "b") && G.subAccepted(G.byKey("m51"), "c"));
});

// ---- Check-tab payloads re-derived from the module ---------------------------

test("index.html check payloads: all parse, and graded answers match the module", () => {
  const html = fs.readFileSync(path.join(LAB_DIR, "index.html"), "utf8");
  const payloads = [];
  const re = /data-ex='([\s\S]*?)'/g;
  let m;
  while ((m = re.exec(html))) payloads.push(JSON.parse(m[1]));
  assert.ok(payloads.length >= 6, "expected 6+ exercises, found " + payloads.length);

  // edge-on keywords question must name one of the module's edge-on objects
  const lens = payloads.find((p) => p.type === "keywords" && /lens/i.test(p.q));
  assert.ok(lens, "missing edge-on lens keywords exercise");
  const edgeNames = G.check.edgeOnKeys.map((k) => G.byKey(k).name.split(" (")[0]);
  assert.ok(edgeNames.some((n) => lens.q.includes(n)),
    "lens exercise must reference " + edgeNames.join(" or "));

  // every exercise carries hints + working + answer (house style)  // barred-spiral choice -> correct option equals the module's barred object
  const barred = payloads.find((p) => p.type === "choice" && /textbook barred/i.test(p.q));
  assert.ok(barred, "missing barred-spiral exercise");
  assert.equal(barred.options[barred.correct], G.byKey(G.check.barredKey).name);

  // ellipse-family choice -> correct option is the module's elliptical family letter
  const ellipse = payloads.find((p) => p.type === "choice" && /star-rich ellipse/i.test(p.q));
  assert.ok(ellipse, "missing ellipse-family exercise");
  assert.match(ellipse.options[ellipse.correct], new RegExp("^" + G.check.ellipseFamily));

  // M31 distance number -> re-derived from catalog approxDistanceMly
  const dist = payloads.find((p) => p.type === "numbers" && /M31/i.test(p.q));
  assert.ok(dist, "missing M31 distance exercise");
  assert.equal(dist.parts[0].value, G.check.m31DistanceMly);
  assert.equal(G.check.m31DistanceMly, G.byKey("m31").approxDistanceMly);

  // every exercise carries hints + working + answer (house style)
  for (const p of payloads) {
    assert.ok(Array.isArray(p.hints) && p.hints.length >= 1, p.q.slice(0, 30) + " needs hints");
    assert.ok(p.working && p.answer, p.q.slice(0, 30) + " needs working+answer");
  }
});

// ---- purity ------------------------------------------------------------------

test("galaxies.js is pure: no wall clock, no DOM, mutation throws", () => {
  const src = fs.readFileSync(path.join(LAB_DIR, "galaxies.js"), "utf8");
  assert.doesNotMatch(src, /Date\.now|new Date|performance\.now/, "no clock reads");
  assert.doesNotMatch(src, /\bdocument\b|\bwindow\.(?! )*getElementById|querySelector/,
    "no DOM access");
  assert.throws(() => { G.GALAXIES.push({}); }, "frozen catalog must reject push");
  assert.throws(() => { G.GALAXIES[0].name = "hacked"; }, "frozen entries must reject edits");
  assert.throws(() => { G.GALAXIES[0].designations.push("x"); }, "designations frozen too");
});
