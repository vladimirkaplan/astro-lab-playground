"use strict";
// PHY110 Lab 13 maths module (site/phy110/labs/13-converging-lens/lens13.js).
//
// 1/o + 1/i = 1/f (thin lens, metres); m = -i/o (added, not printed);
// two-position method o = (D +- sqrt(D^2 - 4Df))/2, real only for D >= 4f;
// refractor spacing = f_o + f_e, M = f_o/f_e (both added). Printed: the
// 2.5f/2.0f/1.5f/0.5f classification distances. Not printed (drawer): kit
// focal lengths 0.20/0.10 m, 1 mm bench division, 5 cm arrow. Honesty:
// focus is a +-4 mm band, the bench refuses below 4f, nothing at 0.5f.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOD = path.join(__dirname, "..", "site", "phy110", "labs",
  "13-converging-lens", "lens13.js");
require(MOD);
const O = globalThis.LS.lens13;

const near = (x, y, tol, msg) => assert.ok(Math.abs(x - y) <= tol,
  msg + ": got " + x + ", want " + y + " +/-" + tol);
const round = (x, d) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d);

test("course settings are the spec's", () => {
  assert.equal(O.F_A, 0.20, "Lens A kit focal length, not printed");
  assert.equal(O.F_B, 0.10, "Lens B kit focal length, not printed");
  assert.deepEqual(O.CLASS_SET, [2.5, 2.0, 1.5, 0.5], "printed classification set");
  assert.equal(O.BENCH_MM, 1, "bench division, not printed");
  assert.equal(O.ARROW_CM, 5, "arrow size, not printed");
  assert.equal(O.FOCUS_BAND_MM, 4, "inside the real bench's +-3-5 mm");
  assert.equal(O.READ_NOISE_MM, 2, "Fun Mode reading jitter");
  assert.ok(Object.isFrozen(O.CLASS_SET), "the printed set is frozen");
  assert.equal(O.lensF("A"), 0.20);
  assert.equal(O.lensF("B"), 0.10);
  assert.equal(O.lensColour("A"), "blue");
  assert.equal(O.lensColour("B"), "amber");
});

test("the thin-lens equation", () => {
  // the spec's check case: f = 15 cm, o = 24 cm -> i = 40 cm
  near(O.imageDistance(0.24, 0.15), 0.40, 1e-12, "i = 40 cm from 1/15 - 1/24");
  near(O.imageDistance(0.30, 0.10), 0.15, 1e-12, "o = 2f gives i = f");
  near(O.imageDistance(0.50, 0.10), 0.125, 1e-12, "o = 2.5f, f = 0.10");
  assert.equal(O.imageDistance(0.10, 0.10), Infinity, "o = f: image at infinity");
  assert.ok(O.imageDistance(0.05, 0.10) < 0, "o < f: virtual, negative i");
  assert.ok(Number.isNaN(O.imageDistance(0, 0.1)), "no object, no image");

  // f from a logged pair round-trips
  near(O.focalFrom(0.40, 0.60), 1 / (1 / 0.40 + 1 / 0.60), 1e-12, "f from (o, i)");
  near(O.focalFrom(0.24, 0.40), 0.15, 1e-12, "the spec pair gives f = 15 cm");
  assert.ok(Number.isNaN(O.focalFrom(0.24, Infinity)), "infinity is not a log entry");

  // magnification: magnitude the size ratio, sign the sense
  near(Math.abs(O.magnification(0.24, 0.40)), 40 / 24, 1e-12, "size ratio 1.67x");
  assert.ok(O.magnification(0.24, 0.40) < 0, "a real image is inverted");
  assert.ok(O.magnification(0.05, O.imageDistance(0.05, 0.10)) > 0,
    "a virtual image is erect");
});

test("the four printed classification distances", () => {
  for (const f of [0.20, 0.10]) {
    assert.deepEqual(O.classify(2.5 * f, f),
      { size: "smaller", orientation: "inverted", type: "real" }, "2.5f");
    assert.deepEqual(O.classify(2.0 * f, f),
      { size: "equal", orientation: "inverted", type: "real" }, "2.0f");
    assert.deepEqual(O.classify(1.5 * f, f),
      { size: "larger", orientation: "inverted", type: "real" }, "1.5f");
    assert.deepEqual(O.classify(0.5 * f, f),
      { size: "larger", orientation: "erect", type: "virtual" }, "0.5f");
  }
  assert.deepEqual(O.classify(0.10, 0.10),
    { size: "none", orientation: "none", type: "none" }, "at f: no image");
  assert.equal(O.classify(0, 0.1), null, "no object is not a question");
});

test("the two-position method, including the honest refusal", () => {
  // the spec's check case: D = 1.00 m, f = 0.15 m
  const tp = O.twoPositions(1.00, 0.15);
  assert.equal(tp.ok, true);
  near(tp.split, Math.sqrt(0.40), 1e-12, "split sqrt(D^2 - 4Df) = 0.63 m");
  near(tp.oFar, 0.82, 0.02, "far spot o = 0.82 m (spec +/-0.02)");
  near(tp.oNear, 0.18, 0.02, "near spot o = 0.18 m (spec +/-0.02)");
  near(tp.iFar, tp.oNear, 1e-12, "the far spot's image distance is the near o");
  near(tp.iNear, tp.oFar, 1e-12, "and vice versa - the spots are conjugate");

  // the kit lenses on the 1.00 m bench
  const A = O.twoPositions(1.00, 0.20);
  assert.equal(A.ok, true, "D = 1.00 m >= 4f_A = 0.80 m");
  near(A.oFar, 0.724, 1e-3, "Lens A far spot");
  near(A.oNear, 0.276, 1e-3, "Lens A near spot");
  const B = O.twoPositions(1.00, 0.10);
  assert.equal(B.ok, true, "D = 1.00 m >= 4f_B = 0.40 m");
  near(B.oFar, 0.887, 1e-3, "Lens B far spot");
  near(B.oNear, 0.113, 1e-3, "Lens B near spot");

  // the honest refusal: below 4f no position works
  const no = O.twoPositions(0.60, 0.20);
  assert.equal(no.ok, false, "D = 0.60 m < 4f = 0.80 m is refused");
  assert.match(no.why, /4f/, "the refusal names the 4f rule");
  const edge = O.twoPositions(0.80, 0.20);
  assert.equal(edge.ok, true, "exactly 4f is the degenerate single spot");
  near(edge.oFar, 0.40, 1e-12, "at 4f the two spots merge at o = D/2");
});

test("the two-lens refractor", () => {
  // the spec's check case: f_o = 20 cm, f_e = 5 cm
  near(O.telescopeSpacing(0.20, 0.05), 0.25, 1e-12, "spacing 25 cm");
  near(O.telescopeMagnification(0.20, 0.05), 4, 1e-12, "M = 4x");
  // the kit pair
  near(O.telescopeSpacing(O.F_A, O.F_B), 0.30, 1e-12, "kit spacing 30 cm");
  near(O.telescopeMagnification(O.F_A, O.F_B), 2, 1e-12, "kit M = 2x");
  near(O.telescopeMagnification(O.F_B, O.F_A), 0.5, 1e-12,
    "swap the roles and the magnification drops below 1");
  assert.ok(Number.isNaN(O.telescopeSpacing(0, 0.05)), "zero focal is not a lens");
});

test("bench bookkeeping: average, percent error, sharpness band", () => {
  near(O.average(0.199, 0.202), 0.2005, 1e-12, "average of two logged f");
  near(O.pctError(0.202, 0.20), 1, 1e-9, "1 percent off the kit value");
  near(O.sharpness(0.40, 0.40, 0.004), 1, 1e-12, "dead centre: sharp");
  near(O.sharpness(0.404, 0.40, 0.004), 0, 1e-12, "a band wide: soft");
  assert.ok(O.sharpness(0.401, 0.40, 0.004) > 0.5,
    "mid-band still reads as in focus - a range, not a point");
});

// ---- Check-tab payloads re-derived from the module ---------------------------

const LAB_DIR = path.join(__dirname, "..", "site", "phy110", "labs", "13-converging-lens");

test("index.html check payloads: all parse, and graded answers match the module", () => {
  const html = fs.readFileSync(path.join(LAB_DIR, "index.html"), "utf8");
  const payloads = [];
  const re = /data-ex='([\s\S]*?)'/g;
  let m;
  while ((m = re.exec(html))) payloads.push(JSON.parse(m[1]));
  assert.equal(payloads.length, 5, "the spec's five exercises");

  const byQ = (re2) => payloads.find((p) => re2.test(p.q));

  const ex1 = byQ(/f = 15 cm.*o = 24 cm/);
  assert.ok(ex1 && ex1.type === "numbers", "exercise 1: i and the size ratio");
  const i15 = O.imageDistance(0.24, 0.15) * 100;
  assert.equal(ex1.parts[0].value, round(i15, 6), "i = 40 cm re-derived");
  assert.ok(Math.abs(ex1.parts[1].value - i15 / 24) <= 0.05, "1.67 within tolerance");
  assert.equal(ex1.parts[1].value, round(round(i15, 6) / 24, 2), "and it prints 1.67");

  const ex2 = byQ(/stand 1\.00 m apart/);
  assert.ok(ex2 && ex2.type === "numbers", "exercise 2: the two spots");
  const tp = O.twoPositions(1.00, 0.15);
  assert.ok(Math.abs(ex2.parts[0].value - tp.oFar) <= 0.02, "0.82 within the spec tolerance");
  assert.equal(ex2.parts[0].value, round(tp.oFar, 2), "and it prints 0.82");
  assert.ok(Math.abs(ex2.parts[1].value - tp.oNear) <= 0.02, "0.18 within the spec tolerance");
  assert.equal(ex2.parts[1].value, round(tp.oNear, 2), "and it prints 0.18");

  const ex3 = byQ(/classification table is right/);
  assert.ok(ex3 && ex3.type === "choice", "exercise 3: the four-row table");
  assert.equal(ex3.options.length, 4, "a four-choice item");
  const correct = ex3.options[ex3.correct];
  for (const k of [2.5, 2.0, 1.5, 0.5]) {
    const lbl = { 2.5: "2.5f", 2: "2.0f", 1.5: "1.5f", 0.5: "0.5f" }[k];
    const c = O.classify(k, 1);
    const frag = k === 0.5
      ? "0.5f no screen image, virtual, erect, larger"
      : lbl + " " + c.size + ", " + c.orientation + ", " + c.type;
    assert.ok(correct.includes(frag), "the correct row carries " + frag);
  }
  for (const i of [1, 2, 3]) {
    assert.notEqual(ex3.options[i], correct, "distractors differ from the answer");
  }

  const ex4 = byQ(/20 cm objective.*5 cm eyepiece/);
  assert.ok(ex4 && ex4.type === "numbers", "exercise 4: spacing and M");
  assert.equal(ex4.parts[0].value, round(O.telescopeSpacing(0.20, 0.05) * 100, 6),
    "25 cm re-derived");
  assert.equal(ex4.parts[1].value, round(O.telescopeMagnification(0.20, 0.05), 6),
    "M = 4 re-derived");

  const ex5 = byQ(/virtual image of a real object/);
  assert.ok(ex5 && ex5.type === "choice", "exercise 5: when the image goes virtual");
  assert.match(ex5.options[ex5.correct], /o below f|inside the focal length/i,
    "the correct option is o < f");

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
    "../../../shared/worksheet.js", "./lens13.js", "./worksheet.js", "./sim.js"];
  let last = -1;
  for (const s of order) {
    const i = html.indexOf('<script src="' + s + '"></script>');
    assert.ok(i > last, s + " loads after the previous script");
    last = i;
  }
  const sim = fs.readFileSync(path.join(LAB_DIR, "sim.js"), "utf8");
  assert.match(sim, /var LAB = "13-converging-lens";/, "LAB equals the folder name");
  assert.match(sim, /LS\.ui\.banner\(document\.querySelector\("main"\)\)/, "the banner mounts");
  assert.match(sim, /LS\.ui\.initTabs\(\)/, "tabs init");
  assert.match(sim, /LS\.ui\.modeToggle\(LAB/, "mode toggle on the lab key");
  assert.match(sim, /LS\.check\.init\(LAB\)/, "check init");
  const ws = fs.readFileSync(path.join(LAB_DIR, "worksheet.js"), "utf8");
  assert.match(ws, /slug: "13-converging-lens"/, "the worksheet slug equals the folder");
});

// ---- purity ------------------------------------------------------------------

test("lens13.js is pure: no wall clock, no DOM", () => {
  const src = fs.readFileSync(MOD, "utf8");
  assert.doesNotMatch(src, /Date\.now|new Date|performance\.now/, "no clock reads");
  assert.doesNotMatch(src, /\bdocument\b|querySelector/, "no DOM access");
});
