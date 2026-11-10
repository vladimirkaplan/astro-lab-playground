"use strict";
// PHY110 Lab 11 maths module (site/phy110/labs/11-air-column-sound/aircolumn.js).
//
// v = f*lambda; closed-open tube at the odd quarter wavelengths;
// lambda = 2*(L2 - L1) cancels the open-end correction;
// v_T = 331.5 + 0.6*T (printed). Printed: room 25 C, question 2 C, dry air.
// Not printed (drawer): forks 512/440 Hz, 4 cm tube, 1.2 cm end correction.
// Honesty: broad loudness maximum (+-1-2 cm find), +-0.2 cm ruler parallax in
// Fun Mode, fork maker tolerance, idealized quiet room.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOD = path.join(__dirname, "..", "site", "phy110", "labs",
  "11-air-column-sound", "aircolumn.js");
require(MOD);
const O = globalThis.LS.aircolumn;

const near = (x, y, tol, msg) => assert.ok(Math.abs(x - y) <= tol,
  msg + ": got " + x + ", want " + y + " +/-" + tol);
const round = (x, d) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d);

test("course settings are the printed and stamped ones", () => {
  assert.equal(O.V0, 331.5, "the law at 0 C");
  assert.equal(O.SLOPE, 0.6, "m/s per C");
  assert.equal(O.T_ROOM, 25, "the printed room");
  assert.equal(O.T_COLD, 2, "the printed question temperature");
  assert.deepEqual(O.FORKS.map((f) => f.hz), [512, 440], "stamped, not printed");
  assert.equal(O.TUBE_DIAMETER_CM, 4, "the sim's own tube");
  near(O.END_CORR_M, 0.012, 1e-12, "0.3 * 4 cm in metres");
  assert.deepEqual(O.accepted, {
    v0: 331.5, slope: 0.6, tRoom: 25, tCold: 2,
    vRoom: 346.5, vCold: 332.7, forks: [512, 440] });
});

test("the temperature law", () => {
  near(O.vTemp(25), 346.5, 1e-12, "the room");
  near(O.vTemp(2), 332.7, 1e-12, "the cold question");
  near(O.vTemp(20), 343.5, 1e-12, "the pre-lab 20 C");
  assert.ok(O.vTemp(2) < O.vTemp(25), "cold air is slower");
});

test("the difference method: spacing is half a wavelength", () => {
  const v = O.vTemp(25);
  near(O.lambdaFromSpacing(0.181, 0.519), 0.676, 1e-12, "the 512 spacing in the spec");
  near(O.lambdaFromSpacing(0.209, 0.603), 0.788, 1e-12, "the 440 spacing");
  near(O.speedFromFork(512, 0.181, 0.519), 346.112, 1e-9, "512 * 0.676");
  near(O.speedFromFork(440, 0.209, 0.603), 346.72, 1e-9, "440 * 0.788");
  // the spec arithmetic
  near(O.speedFromFork(512, 0, 0.338), 346.112, 1e-9, "L2-L1 = 0.338 m at 512");
  near(O.nodeSpacing(512, v), 0.338379, 0.0005, "the 512 node spacing at the law");
  near(O.nodeSpacing(440, v), 346.5 / 880, 1e-9, "the 440 spacing is v/2f");
  assert.ok(Number.isNaN(O.lambdaFromSpacing(0.5, 0.2)), "a negative spacing is not a run");
});

test("resonance positions: the spec numbers, with and without the end correction", () => {
  const v = O.vTemp(25);
  near(O.wavelength(512, v), 0.676758, 1e-5, "lambda at 512");
  near(O.firstResonanceEstimate(512, v), O.wavelength(512, v) / 4, 1e-12, "lambda/4 alone");
  near(round(O.firstResonanceEstimate(512, v), 3), 0.169, 1e-9, "the spec's 0.169 m estimate");
  near(O.resonanceL(512, v, 1), 0.169189453 + 0.012, 1e-6, "512 first, with the correction");
  near(O.resonanceL(512, v, 3) - O.resonanceL(512, v, 1), 0.338378906, 1e-6,
    "the correction cancels in the spacing");
  near(O.resonanceL(440, v, 3) - O.resonanceL(440, v, 1), 0.39375, 1e-9,
    "the 440 spacing against the spec's 0.394");
});

test("the loudness maximum is broad and sits on the resonance", () => {
  const v = O.vTemp(25);
  const L1 = O.resonanceL(512, v, 1) * 100;
  near(O.loudness(L1, 512, v, O.LOUD_WIDTH_CM), 1, 1e-9, "the peak is 1.0");
  assert.ok(O.loudness(L1 + 2, 512, v, O.LOUD_WIDTH_CM) > 0.8,
    "still loud 2 cm off the peak: the -1-2 cm find is honest");
  assert.ok(O.loudness(L1 + 8, 512, v, O.LOUD_WIDTH_CM) < 0.35,
    "8 cm off is quiet again");
  const L3 = O.resonanceL(512, v, 3) * 100;
  const mid = (L1 + L3) / 2;
  assert.ok(O.loudness(mid, 512, v, O.LOUD_WIDTH_CM) < 0.35,
    "halfway between the peaks it drops to a real valley");
  near(O.loudness(L3, 512, v, O.LOUD_WIDTH_CM), 1, 1e-9, "the second swell tops out too");
});

test("averaging and percent error against the law", () => {
  near(O.average(340, 350), 345, 1e-12, "the spec's 341-against-346.5 setup");
  near(round(O.pctError(341, 346.5), 1), 1.6, 1e-9, "5.5/346.5 prints 1.6 %");
  assert.ok(Number.isNaN(O.average(NaN, 350)), "one open fork is not an average");
  assert.ok(Number.isNaN(O.pctError(1, 0)), "zero accepted is not a question");
});

test("Fun Mode ruler parallax stays inside +-0.2 cm", () => {
  assert.equal(O.RULER_JITTER_CM, 0.2, "the stated parallax");
  const lo = 30 - O.RULER_JITTER_CM, hi = 30 + O.RULER_JITTER_CM;
  assert.ok(lo >= 29.8 - 1e-12 && hi <= 30.2 + 1e-12, "the band is +-0.2 cm");
});

// ---- Check-tab payloads re-derived from the module ---------------------------

const LAB_DIR = path.join(__dirname, "..", "site", "phy110", "labs", "11-air-column-sound");

test("index.html check payloads: all parse, and graded answers match the module", () => {
  const html = fs.readFileSync(path.join(LAB_DIR, "index.html"), "utf8");
  const payloads = [];
  const re = /data-ex='([\s\S]*?)'/g;
  let m;
  while ((m = re.exec(html))) payloads.push(JSON.parse(m[1]));
  assert.ok(payloads.length >= 7, "expected 7+ exercises, found " + payloads.length);

  const byQ = (re2) => payloads.find((p) => re2.test(p.q));
  const v = O.vTemp(25);

  const ex1 = byQ(/room is at 25 C/);
  assert.ok(ex1 && ex1.type === "numbers", "exercise 1: the accepted speed");
  assert.equal(ex1.parts[0].value, round(O.vTemp(25), 6), "346.5 re-derived");

  const ex2 = byQ(/first resonance position from lambda/);
  assert.ok(ex2 && ex2.type === "numbers", "exercise 2: the lambda/4 estimate");
  const est = O.firstResonanceEstimate(512, v);
  assert.ok(Math.abs(ex2.parts[0].value - est) <= 0.005, "0.169 within the stated tolerance");
  assert.equal(ex2.parts[0].value, round(est, 3), "and it prints 0.169");

  const ex3 = byQ(/L2 - L1 = 0\.338 m/);
  assert.ok(ex3 && ex3.type === "numbers", "exercise 3: the spec speed");
  assert.ok(Math.abs(ex3.parts[0].value - O.speedFromFork(512, 0, 0.338)) <= 5,
    "346 within the stated tolerance of the module's 346.112");

  const ex4 = byQ(/440 Hz fork show/);
  assert.ok(ex4 && ex4.type === "numbers", "exercise 4: the 440 spacing");
  assert.equal(ex4.parts[0].value, round(O.nodeSpacing(440, v), 3),
    "346.5/880 re-derived");

  const ex5 = byQ(/percent error/);
  assert.ok(ex5 && ex5.type === "numbers", "exercise 5: the percent error");
  assert.equal(ex5.parts[0].value, round(O.pctError(341, 346.5), 1), "1.6 % re-derived");

  const ex6 = byQ(/At 2 C the law gives/);
  assert.ok(ex6 && ex6.type === "choice", "exercise 6: the cold room");
  assert.match(ex6.options[ex6.correct], /smaller/i,
    "the correct option says smaller");
  assert.match(ex6.options[ex6.correct], /332\.7/, "and names the 2 C value");
  assert.ok(O.vTemp(2) < O.vTemp(25), "and the module agrees cold is slower");

  const ex7 = byQ(/better ruler for the wavelength/);
  assert.ok(ex7 && ex7.type === "keywords", "exercise 7: why the spacing");
  assert.ok(ex7.words.length >= 5 && ex7.need >= 2, "the keyword set is real");

  for (const p of payloads) {
    assert.ok(Array.isArray(p.hints) && p.hints.length >= 1, p.q.slice(0, 30) + " needs hints");
    assert.ok(p.working && p.answer, p.q.slice(0, 30) + " needs working+answer");
    if (p.type === "numbers") {
      for (const part of p.parts) {
        assert.ok(part.unit, p.q.slice(0, 30) + " part " + part.label + " needs a unit");
        assert.ok(part.tolAbs !== undefined,
          p.q.slice(0, 30) + " part " + part.label + " states a tolerance");
      }
    }
  }
});

// ---- page wiring --------------------------------------------------------------

test("the page carries the shared scripts in the repo order, and the sim names the folder", () => {
  const html = fs.readFileSync(path.join(LAB_DIR, "index.html"), "utf8");
  const order = ["../../../shared/courses.js", "../../../shared/units.js",
    "../../../shared/ui.js", "../../../shared/store.js", "../../../shared/check.js",
    "../../../shared/worksheet.js", "./aircolumn.js", "./worksheet.js", "./sim.js"];
  let last = -1;
  for (const s of order) {
    const i = html.indexOf('<script src="' + s + '"></script>');
    assert.ok(i > last, s + " loads after the previous script");
    last = i;
  }
  const sim = fs.readFileSync(path.join(LAB_DIR, "sim.js"), "utf8");
  assert.match(sim, /var LAB = "11-air-column-sound";/, "LAB equals the folder name");
  assert.match(sim, /LS\.ui\.banner\(document\.querySelector\("main"\)\)/, "the banner mounts");
  assert.match(sim, /LS\.ui\.initTabs\(\)/, "tabs init");
  assert.match(sim, /LS\.ui\.modeToggle\(LAB/, "mode toggle on the lab key");
  assert.match(sim, /LS\.check\.init\(LAB\)/, "check init");
  const ws = fs.readFileSync(path.join(LAB_DIR, "worksheet.js"), "utf8");
  assert.match(ws, /slug: "11-air-column-sound"/, "the worksheet slug equals the folder");
});

// ---- purity ------------------------------------------------------------------

test("aircolumn.js is pure: no wall clock, no DOM", () => {
  const src = fs.readFileSync(MOD, "utf8");
  assert.doesNotMatch(src, /Date\.now|new Date|performance\.now/, "no clock reads");
  assert.doesNotMatch(src, /\bdocument\b|querySelector/, "no DOM access");
});
