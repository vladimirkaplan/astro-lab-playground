"use strict";
// Page-payload sanity tests for the two homework practice pages. These follow the
// existing exercise-payload style: the authored concept pools, quiz payloads, and
// worked-law strings (LS.hw1Content / LS.hw2Content) are checked for shape, and
// every numeric answer they bake in is re-derived from the verified LS.hwCore
// engine so a page can never drift from the physics. The bench tables themselves
// are exercised through genRatioTable's row invariants, including one reverse
// gravity row worked by hand.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("../site/homework/hw-core.js");
require("../site/homework/homework-1/hw1-content.js");
require("../site/homework/homework-2/hw2-content.js");
const H = globalThis.LS.hwCore;
const C1 = globalThis.LS.hw1Content;
const C2 = globalThis.LS.hw2Content;

const near = (a, b, tol, msg) =>
  assert.ok(Math.abs(a - b) <= tol, (msg ? msg + ": " : "") + a + " vs " + b);

// Shared grading mirror of what the page accepts: a decimal or "n/d".
function parseRatio(t) {
  const s = String(t).trim().replace(/\s+/g, "");
  const m = /^(-?\d+(?:\.\d+)?)(?:\/(-?\d+(?:\.\d+)?))?$/.exec(s);
  if (!m) return NaN;
  const a = parseFloat(m[1]);
  if (m[2] !== undefined) { const b = parseFloat(m[2]); return b === 0 ? NaN : a / b; }
  return a;
}
const quizPart = (q, i) => q.parts[i];

// ---- HW1 concept pool -----------------------------------------------------

test("HW1 concept pool is complete, original, and answerable", () => {
  assert.ok(C1.CONCEPTS.length >= 10, "10-12 concept checks per brief");
  assert.ok(C1.CONCEPTS.length <= 12, "pool stays within the brief's 10-12");
  for (const c of C1.CONCEPTS) {
    assert.equal(typeof c.q, "string");
    assert.ok(c.q.length > 12, c.id + " question too short");
    assert.ok(Array.isArray(c.options) && c.options.length === 4,
      c.id + " needs four options");
    assert.ok(c.correct >= 0 && c.correct < c.options.length, c.id + " bad correct index");
    for (const o of c.options) {
      assert.ok(o.t && o.t.length > 6, c.id + " option text missing");
      assert.ok(o.why && o.why.length > 10, c.id + " option needs a one-line why");
    }
    const cues = c.options.filter((o) => /^Correct:/i.test(o.why)).length;
    assert.equal(cues, 1, c.id + " must have exactly one 'Correct:' why");
  }
  assert.ok(C1.CONCEPTS_PER_ATTEMPT <= C1.CONCEPTS.length);
});

// ---- HW1 quiz: families + shape ------------------------------------------

test("HW1 quiz covers every bench family and grades cleanly", () => {
  assert.equal(C1.QUIZ.length, 6);
  const families = new Set(C1.QUIZ.map((q) => q.family));
  for (const f of ["concepts", "unit-chain", "light-travel", "sci-notation"]) {
    assert.ok(families.has(f), "HW1 quiz missing family " + f);
  }
  for (const q of C1.QUIZ) {
    assert.ok(q.q && q.working && q.answer, "each item needs q/working/answer");
    assert.ok(Array.isArray(q.hints) && q.hints.length >= 2, "each item needs hints");
    if (q.type === "choice") {
      assert.ok(q.options.length >= 3 && q.correct >= 0 && q.correct < q.options.length);
    } else if (q.type === "numbers") {
      assert.ok(q.parts.length >= 1);
      for (const p of q.parts) assert.ok(isFinite(p.value), "part value must be finite");
    } else {
      assert.fail("unexpected HW1 quiz type " + q.type);
    }
  }
});

// ---- HW1 quiz numeric answers must equal hw-core --------------------------

test("HW1 quiz numbers are re-derived from hwCore (course c, exact factors)", () => {
  const byFam = {};
  for (const q of C1.QUIZ) (byFam[q.family] = byFam[q.family] || []).push(q);

  const conv = byFam["unit-chain"][0];
  assert.equal(conv.parts[0].value, 15840);
  assert.equal(H.convert(3, "mi", "ft").value, conv.parts[0].value);
  assert.equal(H.convert(3, "mi", "ft").factor, 5280);

  const light = byFam["light-travel"][0];
  assert.equal(light.parts[0].value, H.lightDistance(1, "week", H.C_COURSE));
  assert.equal(light.parts[0].value, 181440000000);

  const pre = byFam["sci-notation"].find((q) => /um|micrometre|micro/i.test(q.q));
  const parsed = H.parseSI("500\u00b5m");
  assert.equal(parsed.mantissa, 5);
  assert.equal(parsed.exponent, -4);
  assert.equal(quizPart(pre, 0).value, parsed.mantissa);
  assert.equal(quizPart(pre, 1).value, parsed.exponent);

  const dec = byFam["sci-notation"].find((q) => /0\.00042/.test(q.q));
  const sci = H.toSci(0.00042);
  assert.equal(sci.mantissa, 4.2);
  assert.equal(sci.exponent, -4);
  assert.equal(quizPart(dec, 0).value, sci.mantissa);
  assert.equal(quizPart(dec, 1).value, sci.exponent);
});

// ---- HW2 content framing --------------------------------------------------

test("HW2 framing states the ratio-invariance honestly and cites both laws", () => {
  assert.match(C2.INTRO, /k = G m1 m2/i);
  assert.match(C2.INTRO, /same/i);
  assert.match(C2.INTRO, /\(d2\/d1\)\^2/);
  assert.match(C2.LAW_GRAVITY, /F1\/F2 = \(d2\/d1\)\^2/);
  assert.match(C2.LAW_ACCEL, /a1\/a2 = m2\/m1/);
});

test("HW2 quiz covers both tables forward and reverse plus concept and live", () => {
  assert.equal(C2.QUIZ.length, 6);
  const fams = C2.QUIZ.map((q) => q.family);
  for (const f of ["tableA-forward", "tableA-reverse", "tableB-forward",
    "tableB-reverse", "notation-concept", "live-sanity"]) {
    assert.ok(fams.includes(f), "HW2 quiz missing family " + f);
  }
  for (const q of C2.QUIZ) {
    if (q.type === "choice") {
      assert.ok(q.correct >= 0 && q.correct < q.options.length);
    } else {
      for (const p of q.parts) assert.ok(isFinite(p.value));
    }
  }
});

test("HW2 quiz ratio answers match the ratio solvers exactly", () => {
  const byFam = {};
  for (const q of C2.QUIZ) byFam[q.family] = q;

  near(byFam["tableA-forward"].parts[0].value, H.gravityRatio(4, 1), 1e-12, "d1=4d2 -> F1/F2");
  near(byFam["tableA-reverse"].parts[0].value, H.gravityDistFromRatio(25 / 9), 1e-12, "9F1=25F2 -> d1/d2");
  near(byFam["tableB-forward"].parts[0].value, H.accelRatio(5, 1), 1e-12, "m1=5m2 -> a1/a2");
  near(byFam["tableB-reverse"].parts[0].value, H.accelMassFromRatio(5 / 3), 1e-12, "3a1=5a2 -> m1/m2");
  near(byFam["live-sanity"].parts[0].value, H.gravityRatio(1, 2), 1e-12, "d2=2d1 -> F1/F2");
});

// ---- bench table generators stay gradeable --------------------------------

test("generated ratio rows are gradeable by a decimal-or-fraction answer", () => {
  for (const kind of ["gravity", "accel"]) {
    for (const seed of ["a", "b", 7, "homework"]) {
      const tbl = H.genRatioTable(seed, kind, 8);
      for (const row of tbl.rows) {
        assert.ok(isFinite(row.answer.value) && row.answer.value > 0);
        near(row.check, row.answer.value, 1e-9, kind + " row check != answer");
        near(parseRatio(row.answerText), row.answer.value, 1e-9,
          "answerText not parseable: " + row.answerText);
      }
      const dirs = new Set(tbl.rows.map((r) => r.direction));
      assert.ok(dirs.has("forward") && dirs.has("reverse"),
        kind + " table should contain both directions");
    }
  }
});

test("one reverse gravity table row, worked by hand (the worksheet skill)", () => {
  let found = null;
  for (let s = 0; s < 200 && !found; s++) {
    for (const row of H.genRatioTable("rev" + s, "gravity", 8).rows) {
      const m = /^(\d+)F1 = (\d+)F2$/.exec(row.given);
      if (m) { found = { row, A: +m[1], B: +m[2] }; break; }
    }
  }
  assert.ok(found, "should be able to produce a reverse gravity row");
  const { row, A, B } = found;
  // A F1 = B F2  =>  F1/F2 = B/A.  F1/F2 = (d2/d1)^2  =>  d1/d2 = sqrt(A/B).
  const worked = Math.sqrt(A / B);
  near(row.answer.value, worked, 1e-9, "reverse row d1/d2 = sqrt(A/B)");
  near(row.check, H.gravityDistFromRatio(B / A), 1e-9, "solver agrees");
  const okDir = B > A ? row.answer.value < 1 : row.answer.value > 1;
  assert.ok(okDir, "closer distance must carry the bigger force");
});

// ---- pages wire the shared modules in the right order ---------------------

test("homework pages include core, content, and the shared grading modules", () => {
  const root = path.join(__dirname, "..");
  const expect = {
    "site/homework/homework-1": "./hw1-content.js",
    "site/homework/homework-2": "./hw2-content.js"
  };
  for (const dir of Object.keys(expect)) {
    const html = fs.readFileSync(path.join(root, dir, "index.html"), "utf8");
    for (const inc of ["../hw-core.js", expect[dir], "./sim.js",
      "../../shared/check.js", "../../shared/ui.js",
      "../../shared/store.js", "../../shared/units.js"]) {
      assert.ok(html.includes(inc), dir + " missing script include " + inc);
    }
    assert.ok(html.includes('id="check-progress"') && html.includes('id="quiz-mount"'),
      dir + " missing Check-tab mount points");
    assert.match(html, /not a submission|not your BMCC submission|practice only/i,
      dir + " missing a practice-only disclaimer");
  }
});
