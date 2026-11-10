"use strict";
// PHY110 Lab 14 maths module (site/phy110/labs/14-spectra/spectra14.js).
//
// Visible ~380-760 nm (printed). E = h*f, c = f*lambda (added framing).
// Sim's own: band edges 380/450/485/500/565/590/700 (the manual figure has
// only the letters V B G Y O R), the 380-700 chart scale, and the line
// reference set (standard NIST tabulated values, the sim's own answer key).
// Honesty: the manual names an argon lamp in the equipment list but says to
// view mercury - both ship, footnoted. Uncalibrated scope: +-30 nm
// colour-plus-band grading, never exact; brightness order never graded.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOD = path.join(__dirname, "..", "site", "phy110", "labs",
  "14-spectra", "spectra14.js");
require(MOD);
const O = globalThis.LS.spectra14;

test("course settings are the spec's", () => {
  assert.equal(O.VISIBLE_MIN, 380, "visible range, printed");
  assert.equal(O.VISIBLE_MAX, 760, "visible range, printed");
  assert.deepEqual(O.BAND_EDGES, [380, 450, 485, 500, 565, 590, 700],
    "the sim's own band edges");
  assert.deepEqual(O.BAND_NAMES, ["violet", "blue", "green", "yellow", "orange", "red"]);
  assert.equal(O.GAS_TOL_NM, 30, "the uncalibrated-scope tolerance");
  assert.equal(O.FUN_JITTER_NM, 30, "Fun Mode never exceeds the grading tolerance");
  assert.deepEqual(O.SOURCES, ["filament", "He", "H", "Hg", "Ar", "Ne", "fluorescent"],
    "the chart strip order, per the manual's recording chart");
  assert.deepEqual(O.GASES, ["H", "He", "Ne", "Hg", "Ar"]);
  for (const g of O.GASES) {
    assert.ok(Object.isFrozen(O.LINES[g]), g + " line set is frozen");
    assert.ok(O.LINES[g].length >= 3, g + " has a real fingerprint");
  }
});

test("the visible range and the 102 nm example", () => {
  assert.equal(O.isVisible(380), true, "380 is the edge, inside");
  assert.equal(O.isVisible(760), true, "760 is the edge, inside");
  assert.equal(O.isVisible(379.9), false);
  assert.equal(O.isVisible(760.1), false);
  assert.equal(O.isVisible(102), false, "102 nm is not visible");
  assert.equal(O.region(102), "ultraviolet", "below 380 is ultraviolet");
  assert.equal(O.region(300), "ultraviolet");
  assert.equal(O.region(900), "infrared");
  assert.equal(O.region(550), "visible");
});

test("colour bands: the sim's own edges", () => {
  assert.equal(O.band(400), "violet");
  assert.equal(O.band(470), "blue");
  assert.equal(O.band(495), "green");
  assert.equal(O.band(520), "yellow");
  assert.equal(O.band(575), "orange");
  assert.equal(O.band(656), "red");
  assert.equal(O.band(700), "red", "the chart stops at 700");
  assert.equal(O.band(701), null, "past the chart: no band");
  assert.equal(O.lineColour(656), "red", "the check item: 656 nm looks red");
  assert.equal(O.lineColour(750), "red", "red runs to 760 off the chart");
  assert.equal(O.lineColour(370), null, "ultraviolet has no colour");
});

test("wavelength to screen colour", () => {
  const red = O.wavelengthRGB(650);
  assert.ok(red[0] > 200 && red[1] < 60 && red[2] < 60, "650 nm renders red: " + red);
  const blue = O.wavelengthRGB(470);
  assert.ok(blue[2] > 150 && blue[0] < 60, "470 nm renders blue: " + blue);
  const green = O.wavelengthRGB(550);
  assert.ok(green[1] > 200, "550 nm renders green: " + green);
  assert.deepEqual(O.wavelengthRGB(300), [0, 0, 0], "ultraviolet renders black");
  assert.deepEqual(O.wavelengthRGB(900), [0, 0, 0], "infrared renders black");
});

test("the source profiles, including the mixed fluorescent case", () => {
  const fil = O.sourceProfile("filament");
  assert.equal(fil.continuum, 1, "the filament is all continuum");
  assert.equal(fil.lines.length, 0, "the filament has no lines");
  const fluo = O.sourceProfile("fluorescent");
  assert.ok(fluo.continuum > 0 && fluo.continuum < 1, "the tube keeps a faint band");
  assert.deepEqual([...fluo.lines], [...O.LINES.Hg], "the tube's lines are mercury's");
  const h = O.sourceProfile("H");
  assert.equal(h.continuum, 0, "a discharge lamp is lines only");
  assert.deepEqual([...h.lines], [...O.LINES.H]);
  assert.equal(O.sourceProfile("neon"), null, "neon is a source name, not a lamp key");
});

test("fingerprint matching at the +-30 nm tolerance", () => {
  // exact sets
  for (const g of O.GASES) {
    assert.equal(O.identifyGas([...O.LINES[g]]), g, g + " matches itself");
  }
  // the spec's hydrogen triplet, rounded to whole nanometres
  assert.equal(O.identifyGas([656, 486, 434]), "H", "the check item's triplet");
  // the uncalibrated scope: every line wobbled within the tolerance still matches
  assert.equal(O.identifyGas(O.LINES.H.map((l) => l + 12)), "H", "+12 nm all over");
  assert.equal(O.identifyGas(O.LINES.Hg.map((l) => l - 29)), "Hg", "-29 nm all over");
  // past the tolerance: no call
  assert.equal(O.identifyGas(O.LINES.H.map((l) => l + 31)), null, "+31 nm is beyond the tolerance");
  // a foreign line, far enough from every hydrogen line, disqualifies
  assert.equal(O.identifyGas([...O.LINES.H, 520]), null, "a 520 nm line in the hydrogen set");
  // a missing line disqualifies
  assert.equal(O.identifyGas(O.LINES.H.slice(0, 2)), null, "one line short is not a fingerprint");
  assert.equal(O.identifyGas([]), null, "no lines is no gas");

  const cov = O.coverage([...O.LINES.Ne], "Ne");
  assert.deepEqual(cov, { hit: 5, of: 5 }, "full coverage of neon");
  assert.equal(O.coverage([400], "Ne").hit, 0, "a line far from the set hits nothing");
});

test("the reference set obeys the spec's descriptions", () => {
  assert.deepEqual(O.LINES.H, [656.3, 486.1, 434.0], "the spec's hydrogen set");
  assert.deepEqual(O.LINES.He, [587.6, 501.6, 471.3, 447.1, 667.8].sort((a, b) => b - a),
    "the spec's helium set");
  assert.ok(O.LINES.Hg.includes(435.8) && O.LINES.Hg.includes(546.1) &&
    O.LINES.Hg.includes(577.0) && O.LINES.Hg.includes(579.0), "the spec's mercury set");
  // neon: the red-orange block, and no line at hydrogen's 656
  assert.ok(O.LINES.Ne.every((l) => l >= 585 && l <= 651), "neon sits in 585-651 nm");
  assert.ok(O.LINES.Ne.every((l) => Math.abs(l - 656.3) > 1), "no neon line at 656");
  assert.ok(O.LINES.H.some((l) => Math.abs(l - 656.3) < 0.1), "hydrogen carries the 656 line");
});

// ---- Check-tab payloads re-derived from the module ---------------------------

const LAB_DIR = path.join(__dirname, "..", "site", "phy110", "labs", "14-spectra");

test("index.html check payloads: all parse, and graded answers match the module", () => {
  const html = fs.readFileSync(path.join(LAB_DIR, "index.html"), "utf8");
  const payloads = [];
  const re = /data-ex='([\s\S]*?)'/g;
  let m;
  while ((m = re.exec(html))) payloads.push(JSON.parse(m[1]));
  assert.equal(payloads.length, 6, "the spec's six choice items");
  for (const p of payloads) {
    assert.equal(p.type, "choice", "all six are choice items");
    assert.ok(p.options.length >= 3, p.q.slice(0, 30) + " has real options");
    assert.ok(Array.isArray(p.hints) && p.hints.length >= 1, p.q.slice(0, 30) + " needs hints");
    assert.ok(p.working && p.answer, p.q.slice(0, 30) + " needs working+answer");
  }
  const byQ = (re2) => payloads.find((p) => re2.test(p.q));

  const ex1 = byQ(/656 nm/);
  assert.match(ex1.options[ex1.correct], /^red$/i, "656 nm is red");
  assert.equal(O.lineColour(656), "red", "the module agrees");

  const ex2 = byQ(/656, 486 and 434/);
  assert.match(ex2.options[ex2.correct], /hydrogen/i, "the triplet is hydrogen");
  assert.equal(O.identifyGas([656, 486, 434]), "H", "the module agrees");

  const ex3 = byQ(/no line at 656/);
  assert.match(ex3.options[ex3.correct], /neon/i, "red-orange without 656 is neon");
  assert.ok(O.LINES.Ne.every((l) => l >= 585 && l <= 651), "the module's neon block agrees");

  const ex4 = byQ(/filament bulb/);
  assert.match(ex4.options[ex4.correct], /continuous/i, "the filament is continuous");
  assert.equal(O.sourceProfile("filament").continuum, 1, "the module agrees");

  const ex5 = byQ(/fluorescent tube/);
  assert.match(ex5.options[ex5.correct], /mercury lines on a faint continuous/i,
    "the mixed answer is the graded one");
  const fluo = O.sourceProfile("fluorescent");
  assert.ok(fluo.continuum > 0 && fluo.continuum < 1,
    "the module's fluorescent is mixed, not either extreme");

  const ex6 = byQ(/102 nm/);
  assert.match(ex6.options[ex6.correct], /ultraviolet/i, "102 nm is ultraviolet");
  assert.equal(O.isVisible(102), false, "the module agrees");
  assert.equal(O.region(102), "ultraviolet");
});

// ---- page wiring --------------------------------------------------------------

test("the page carries the shared scripts in the repo order, and the sim names the folder", () => {
  const html = fs.readFileSync(path.join(LAB_DIR, "index.html"), "utf8");
  const order = ["../../../shared/courses.js", "../../../shared/units.js",
    "../../../shared/ui.js", "../../../shared/store.js", "../../../shared/check.js",
    "../../../shared/worksheet.js", "./spectra14.js", "./worksheet.js", "./sim.js"];
  let last = -1;
  for (const s of order) {
    const i = html.indexOf('<script src="' + s + '"></script>');
    assert.ok(i > last, s + " loads after the previous script");
    last = i;
  }
  const sim = fs.readFileSync(path.join(LAB_DIR, "sim.js"), "utf8");
  assert.match(sim, /var LAB = "14-spectra";/, "LAB equals the folder name");
  assert.match(sim, /LS\.ui\.banner\(document\.querySelector\("main"\)\)/, "the banner mounts");
  assert.match(sim, /LS\.ui\.initTabs\(\)/, "tabs init");
  assert.match(sim, /LS\.ui\.modeToggle\(LAB/, "mode toggle on the lab key");
  assert.match(sim, /LS\.check\.init\(LAB\)/, "check init");
  const ws = fs.readFileSync(path.join(LAB_DIR, "worksheet.js"), "utf8");
  assert.match(ws, /slug: "14-spectra"/, "the worksheet slug equals the folder");
});

// ---- purity ------------------------------------------------------------------

test("spectra14.js is pure: no wall clock, no DOM", () => {
  const src = fs.readFileSync(MOD, "utf8");
  assert.doesNotMatch(src, /Date\.now|new Date|performance\.now/, "no clock reads");
  assert.doesNotMatch(src, /\bdocument\b|querySelector/, "no DOM access");
});
