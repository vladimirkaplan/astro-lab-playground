"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

require("../site/homework/hw-core.js");
const H = globalThis.LS.hwCore;

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + " vs " + b);
const relClose = (a, b) =>
  assert.ok(Math.abs(a - b) <= 1e-9 * Math.abs(b), a + " vs " + b);
const near = (a, b, tol, msg) =>
  assert.ok(Math.abs(a - b) < tol, (msg ? msg + ": " : "") + a + " vs " + b);

// ---- 1. conversions ------------------------------------------------------

test("the factor table holds the cited equalities and nothing else", () => {
  const T = H.FACTOR_TABLE;
  assert.deepEqual(Object.keys(T).sort(),
    ["cm", "ft", "in", "km", "m", "mi", "mm"]);
  relClose(H.convert(1, "km", "m").factor, 1000);
  relClose(H.convert(1, "m", "cm").factor, 100);
  relClose(H.convert(1, "cm", "mm").factor, 10);
  relClose(H.convert(1, "mi", "ft").factor, 5280);
  relClose(H.convert(1, "ft", "in").factor, 12);
  relClose(H.convert(1, "in", "cm").factor, 2.54);
  for (const id of Object.keys(T)) {
    assert.equal(T[id].dim, "length");
    assert.ok(Array.isArray(T[id].chain), id + " needs its cited chain");
  }
  assert.ok(T.mi.chain.includes("1 mi = 5280 ft"));
  assert.ok(T.in.chain.includes("1 in = 2.54 cm"));
  assert.ok(Object.isFrozen(T), "the shared table must not be editable");
});

test("convert returns the value with the exact factor it used", () => {
  const mToFt = H.convert(1, "m", "ft");
  near(mToFt.value, 3.28084, 5e-5);
  assert.ok(H.withinTolerance(mToFt.value, 3.2808, H.TOL_PERCENT),
    "1 m should pass a 2% check against 3.2808 ft");
  const kmToMi = H.convert(100, "km", "mi");
  near(kmToMi.value, 62.1371, 1e-3);
  near(kmToMi.factor, 0.6213712, 1e-6);
  close(H.convert(0, "m", "ft").value, 0);            // zero is a legal conversion
  close(H.convert(1, "mi", "in").factor, 63360);      // exact, no float drift
  close(H.convert(1, "ft", "in").factor, 12);
  for (const [from, to] of [["km", "mi"], ["m", "ft"], ["cm", "in"], ["mm", "km"]]) {
    const out = H.convert(7.5, from, to);
    relClose(H.convert(out.value, to, from).value, 7.5);
    assert.equal(out.dim, "length");
    assert.ok(out.steps.length > 0, from + "->" + to + " should show its chain");
  }
  assert.equal(H.convert(3, "kilometers", "meters").value, 3000);
  assert.equal(H.convert(3, "feet", "inches").value, 36);
  assert.equal(H.resolveUnit("Miles"), "mi");
  assert.equal(H.resolveUnit("parsec"), null);
  assert.throws(() => H.convert(1, "m", "furlong"), RangeError);
  assert.throws(() => H.convert(NaN, "m", "ft"), RangeError);
});

test("convert refuses to mix dimensions", () => {
  const custom = {
    m: { dim: "length", num: 1, den: 1, chain: [] },
    km: { dim: "length", num: 1000, den: 1, chain: ["1 km = 1000 m"] },
    s: { dim: "time", num: 1, den: 1, chain: [] }
  };
  close(H.convert(2, "km", "m", custom).value, 2000);
  assert.throws(() => H.convert(2, "m", "s", custom), RangeError);
  assert.throws(() => H.convert(2, "m", "s"), RangeError);
  assert.throws(() => H.convert(2, "m", "x", custom), RangeError);
});

test("convert and the generators leave their inputs alone", () => {
  const before = JSON.stringify(H.FACTOR_TABLE);
  const custom = Object.freeze({
    m: Object.freeze({ dim: "length", num: 1, den: 1, chain: Object.freeze([]) }),
    ft: Object.freeze({
      dim: "length", num: 3048, den: 10000,
      chain: Object.freeze(["1 ft = 12 in"])
    })
  });
  const out = H.convert(5, "m", "ft", custom);         // frozen table must not break it
  near(out.value, 5 / 0.3048, 1e-9);
  assert.equal(JSON.stringify(H.FACTOR_TABLE), before);
  const t = [3, 4];
  H.genRatioTable(1, "gravity", 6);
  H.genConversionSet(1, 6);
  H.genSciSet(1, 6);
  H.genLightSet(1, 6);
  assert.deepEqual(t, [3, 4]);
  assert.equal(JSON.stringify(H.FACTOR_TABLE), before);
  const table = H.genRatioTable(2, "gravity", 4);
  assert.ok(Object.isFrozen(table.rows) && Object.isFrozen(table.rows[0]));
  assert.throws(() => { table.rows[0].given = "tampered"; }, TypeError);
});

// ---- 2. scientific notation ---------------------------------------------

test("toSci normalises into a clean mantissa between 1 and 10", () => {
  assert.deepEqual(H.toSci(0.00023), { mantissa: 2.3, exponent: -4 });
  assert.deepEqual(H.toSci(1e-9), { mantissa: 1, exponent: -9 });
  assert.deepEqual(H.toSci(1265), { mantissa: 1.265, exponent: 3 });
  assert.deepEqual(H.toSci(9.4608e12), { mantissa: 9.4608, exponent: 12 });
  assert.deepEqual(H.toSci(300000), { mantissa: 3, exponent: 5 });
  assert.deepEqual(H.toSci(-0.04), { mantissa: -4, exponent: -2 });
  assert.deepEqual(H.toSci(0), { mantissa: 0, exponent: 0 });
  assert.throws(() => H.toSci(Infinity), RangeError);
  assert.throws(() => H.toSci("3e5"), RangeError);
});

test("parseSci accepts the notations students actually type", () => {
  const want = { mantissa: 1.265, exponent: 3 };
  for (const text of ["1.265e3", "1.265E3", "1.265e+3", "1.265 x 10^3",
    "1.265 \u00d7 10^3", "1.265*10**3", "1265", "1265e0", "1265 x 10^0",
    "12.65 x 10^2"]) {
    assert.deepEqual(H.parseSci(text), want, "should read " + text);
  }
  assert.deepEqual(H.parseSci("10^3"), { mantissa: 1, exponent: 3 });
  assert.deepEqual(H.parseSci("10**-3"), { mantissa: 1, exponent: -3 });
  assert.deepEqual(H.parseSci("1.265e-3"), { mantissa: 1.265, exponent: -3 });
  assert.deepEqual(H.parseSci("0.00023"), { mantissa: 2.3, exponent: -4 });
  assert.deepEqual(H.parseSci("-4.2e-7"), { mantissa: -4.2, exponent: -7 });
  assert.deepEqual(H.parseSci("0"), { mantissa: 0, exponent: 0 });
  assert.deepEqual(H.parseSci("  7 x 10^9  "), { mantissa: 7, exponent: 9 });
});

test("parseSci hands back null for junk instead of throwing", () => {
  for (const junk of ["", "   ", "abc", "1.2.3", "1e", "e3", "1.265 x 10",
    "1.265 x 10^", "1,265", "12 34", "nan", "Infinity", "1e1.5", "1.265e3 km",
    "1.2.6.5", "--3", "10^", "x10^3", null, 42, {}, ["1e3"]]) {
    assert.equal(H.parseSci(junk), null, "should reject " + JSON.stringify(junk));
  }
});

test("toSci and parseSci round-trip across nine orders of magnitude", () => {
  const values = [0.00023, 1e-9, 4e-7, 0.025, 1.5, 37.5, 1265, 4600000,
    3e8, 9.4608e12, 299792.458, -4.2e-7];
  for (const v of values) {
    const sci = H.toSci(v);
    assert.ok(Math.abs(sci.mantissa) >= 1 && Math.abs(sci.mantissa) < 10 || v === 0);
    assert.deepEqual(H.parseSci(H.sciText(sci)), sci, "text round trip for " + v);
    assert.deepEqual(H.parseSci(H.plainDecimal(v)), sci, "plain round trip for " + v);
    assert.deepEqual(H.parseSci(v.toExponential()), sci, "e-form round trip for " + v);
    relClose(H.parseSci(H.sciText(sci)).mantissa * Math.pow(10, sci.exponent), v);
  }
  assert.equal(H.plainDecimal(0.00023), "0.00023");
  assert.equal(H.plainDecimal(9.4608e12), "9460800000000");
  assert.equal(H.sciText({ mantissa: 2.3, exponent: -4 }), "2.3 x 10^-4");
});

test("parseSI reads a prefix into the base unit with mantissa and exponent", () => {
  const cases = [
    ["400 nanoseconds", 4e-7, "n", "s"],
    ["300MHz", 3e8, "M", "Hz"],
    ["300 MHz", 3e8, "M", "Hz"],
    ["300 mhz", 3e8, "M", "Hz"],
    ["500\u00b5m", 5e-4, "\u00b5", "m"],
    ["500um", 5e-4, "\u00b5", "m"],
    ["500 micrometers", 5e-4, "\u00b5", "m"],
    ["2.5 milliseconds", 2.5e-3, "m", "s"],
    ["2 mm", 0.002, "m", "m"],
    ["4.5 km", 4500, "k", "m"],
    ["2 cm", 0.02, "c", "m"],
    ["12 ns", 1.2e-8, "n", "s"],
    ["1.5 s", 1.5, "", "s"]
  ];
  for (const [text, value, prefix, unit] of cases) {
    const p = H.parseSI(text);
    assert.ok(p, "should read " + text);
    relClose(p.value, value, text);
    assert.equal(p.prefix, prefix, text + " prefix");
    assert.equal(p.unit, unit, text + " base unit");
    const sci = H.toSci(value);
    assert.equal(p.mantissa, sci.mantissa, text + " mantissa");
    assert.equal(p.exponent, sci.exponent, text + " exponent");
    assert.equal(H.sciText({ mantissa: p.mantissa, exponent: p.exponent }), p.text);
  }
  assert.equal(H.parseSI("400 nanoseconds").prefixName, "nano");
  assert.ok(H.parseSI("400 nanoseconds").count === 400);
});

test("parseSI returns null when no unit can be read", () => {
  for (const junk of ["", "400", "nanoseconds", "400 bananas", "300MHz-ish",
    "12.5.5 ns", "MHz", "e-3 m", "500 \u00b6m", "two metres", null, 7, {}]) {
    assert.equal(H.parseSI(junk), null, "should reject " + JSON.stringify(junk));
  }
});

// ---- 3. light travel ----------------------------------------------------

test("light-travel constants keep the course c and the true c apart", () => {
  assert.equal(H.C_COURSE, 300000);
  assert.equal(H.C_TRUE, 299792.458);
  close(H.lightKm(1), 300000);
  close(H.lightKm(1, H.C_TRUE), 299792.458);
  assert.equal(H.timeSeconds(1, "minute"), 60);
  assert.equal(H.timeSeconds(1, "hours"), 3600);
  assert.equal(H.timeSeconds(1, "week"), 604800);
  assert.equal(H.timeSeconds(2, "weeks"), 1209600);
  assert.equal(H.TIME_MULT.year, 31536000);
  assert.equal(H.lightDistance(1, "week"), 181440000000);
  assert.equal(H.lightDistance(1, "year"), 9.4608e12);
  assert.equal(H.plainDecimal(H.lightDistance(1, "year")), "9460800000000");
  // the course's rounded numbers land on the real light-year
  near(H.lightKm(H.SECONDS_PER_JULIAN_YEAR, H.C_TRUE), 9.4608e12, 9.4608e8);
  assert.throws(() => H.timeSeconds(1, "fortnight"), RangeError);
  assert.throws(() => H.lightKm(-5), RangeError);
  assert.throws(() => H.lightKm(5, 0), RangeError);
});

test("sigFigs rounds as the course does and shows the figures kept", () => {
  close(H.sigFigs(299792.458, 3), 300000);
  close(H.sigFigs(126500, 3), 127000);
  close(H.sigFigs(0.00023537, 3), 0.000235);
  close(H.sigFigs(0.00023537, 1), 0.0002);
  close(H.sigFigs(-1.2654, 4), -1.265);
  close(H.sigFigs(0, 3), 0);
  assert.equal(H.sigFigsText(299792.458, 3), "3.00 x 10^5");
  assert.equal(H.sigFigsText(0.00023537, 3), "0.000235");
  assert.equal(H.sigFigsText(1.2654, 4), "1.265");
  assert.equal(H.sigFigsText(9.4608e12, 5), "9.4608 x 10^12");
  assert.throws(() => H.sigFigs(1, 0), RangeError);
  assert.throws(() => H.sigFigs(1, 16), RangeError);
  assert.throws(() => H.sigFigs(1, 2.5), RangeError);
});

// ---- 4 and 5. ratio solvers --------------------------------------------

test("gravityRatio obeys the inverse square law exactly at the identities", () => {
  for (const d of [1, 2, 2.5, 7, 1234.5]) close(H.gravityRatio(d, d), 1);
  close(H.gravityRatio(2, 1), 0.25);      // d1 = 2 d2 quarters the force
  close(H.gravityRatio(1, 2), 4);
  const grid = [1, 2, 3, 5, 7.5];
  for (const a of grid) {
    for (const b of grid) {
      relClose(H.gravityRatio(a, b) * H.gravityRatio(b, a), 1);
      const expected = Math.pow(b / a, 2);
      relClose(H.gravityRatio(a, b), expected);
    }
  }
  assert.throws(() => H.gravityRatio(0, 1), RangeError);
  assert.throws(() => H.gravityRatio(2, -1), RangeError);
  assert.throws(() => H.gravityRatio(NaN, 1), RangeError);
});

test("gravityDistFromRatio runs the same law backwards", () => {
  // 9F1 = 25F2 means F1/F2 = 25/9, so d1/d2 = 3/5
  relClose(H.gravityDistFromRatio(25 / 9), 3 / 5);
  relClose(H.gravityDistFromRatio(1), 1);
  relClose(H.gravityDistFromRatio(4), 0.5);
  relClose(H.gravityDistFromRatio(0.25), 2);
  const grid = [1, 2, 3, 4, 5, 7.5, 13];
  for (const d1 of grid) {
    for (const d2 of grid) {
      relClose(H.gravityDistFromRatio(H.gravityRatio(d1, d2)), d1 / d2);
    }
  }
  assert.throws(() => H.gravityDistFromRatio(0), RangeError);
  assert.throws(() => H.gravityDistFromRatio(-4), RangeError);
});

test("accelRatio and its inverse run the second law both ways", () => {
  // four times the mass at the same force is a quarter of the acceleration
  close(H.accelRatio(4, 1), 0.25);        // m1 = 4 m2 gives a1/a2 = 1/4
  close(H.accelRatio(1, 4), 4);           // and a2/a1 = 4
  for (const m of [1, 3, 4.5, 99]) close(H.accelRatio(m, m), 1);
  const grid = [1, 2, 4, 5, 6.5];
  for (const m1 of grid) {
    for (const m2 of grid) {
      relClose(H.accelRatio(m1, m2) * H.accelRatio(m2, m1), 1);
      relClose(H.accelMassFromRatio(H.accelRatio(m1, m2)), m1 / m2);
      relClose(H.accelMassFromRatio(4), 0.25);
    }
  }
  assert.throws(() => H.accelRatio(0, 2), RangeError);
  assert.throws(() => H.accelMassFromRatio(0), RangeError);
  assert.throws(() => H.accelMassFromRatio(-1), RangeError);
});

// ---- 6 and 7. seeded generators ----------------------------------------

const FORWARD_GRAVITY = /^d1 = (\d+)(?:\/(\d+))? d2$/;
const REVERSE_GRAVITY = /^(\d+)F1 = (\d+)F2$/;
const FORWARD_ACCEL = /^m1 = (\d+)(?:\/(\d+))? m2$/;
const REVERSE_ACCEL = /^(\d+)a1 = (\d+)a2$/;

test("genRatioTable reproduces the same problem set from the same seed", () => {
  const a = H.genRatioTable(20260107, "gravity", 10);
  const b = H.genRatioTable(20260107, "gravity", 10);
  assert.deepEqual(a.rows, b.rows);
  assert.deepEqual(H.genRatioTable("week 4", "accel", 8).rows,
    H.genRatioTable("week 4", "accel", 8).rows);
  assert.notDeepEqual(a.rows, H.genRatioTable(20260108, "gravity", 10).rows);
  assert.notDeepEqual(a.rows, H.genRatioTable("week 4", "gravity", 10).rows);
  assert.notDeepEqual(H.genRatioTable(3, "gravity", 6).rows,
    H.genRatioTable(3, "accel", 6).rows);
  assert.equal(a.kind, "gravity");
  assert.equal(a.rows.length, 10);
});

test("every generated ratio row is solvable with the published solvers", () => {
  for (const kind of ["gravity", "accel"]) {
    const table = H.genRatioTable(4242, kind, 12);
    const dirs = new Set();
    for (const row of table.rows) {
      assert.equal(row.kind, kind);
      dirs.add(row.direction);
      let expected;
      if (kind === "gravity") {
        if (row.direction === "forward") {
          const m = FORWARD_GRAVITY.exec(row.given);
          assert.ok(m, "unparseable given: " + row.given);
          expected = H.gravityRatio(Number(m[1]) / (m[2] ? Number(m[2]) : 1), 1);
          assert.equal(row.ask, "F1/F2");
        } else {
          const m = REVERSE_GRAVITY.exec(row.given);
          assert.ok(m, "unparseable given: " + row.given);
          assert.ok(Number.isInteger(Math.sqrt(Number(m[1]))),
            row.given + " coefficients should be squares");
          expected = H.gravityDistFromRatio(Number(m[2]) / Number(m[1]));
          assert.equal(row.ask, "d1/d2");
        }
      } else if (row.direction === "forward") {
        const m = FORWARD_ACCEL.exec(row.given);
        assert.ok(m, "unparseable given: " + row.given);
        expected = H.accelRatio(Number(m[1]) / (m[2] ? Number(m[2]) : 1), 1);
        assert.equal(row.ask, "a1/a2");
      } else {
        const m = REVERSE_ACCEL.exec(row.given);
        assert.ok(m, "unparseable given: " + row.given);
        expected = H.accelMassFromRatio(Number(m[2]) / Number(m[1]));
        assert.equal(row.ask, "m1/m2");
      }
      relClose(row.answer.value, expected, row.given);
      relClose(row.check, expected, row.given);
      // answers stay classroom-clean: small integer numerator and denominator
      assert.ok(Number.isInteger(row.answer.num) && Number.isInteger(row.answer.den));
      assert.ok(Math.abs(row.answer.num) <= 25 && row.answer.den <= 25,
        row.given + " answer " + row.answerText + " is not clean");
      assert.ok(/^-?\d+(\/\d+)?$/.test(row.answer.text), row.answer.text);
      assert.equal(row.tolerance, H.TOL_PERCENT);
    }
    assert.ok(dirs.has("forward") && dirs.has("reverse"),
      kind + " table should practise both directions");
  }
});

test("genRatioTable validates its arguments", () => {
  assert.throws(() => H.genRatioTable(1, "magnetism"), RangeError);
  assert.throws(() => H.genRatioTable(1, "gravity", 0), RangeError);
  assert.throws(() => H.genRatioTable(1, "gravity", 41), RangeError);
  assert.throws(() => H.genRatioTable(1, "gravity", 2.5), RangeError);
  assert.throws(() => H.genRatioTable(null, "gravity"), RangeError);
  assert.equal(H.genRatioTable(1).rows.length, 8);
  assert.equal(H.genRatioTable(1, "gravity", 1).rows[0].direction, "forward");
  assert.equal(H.genRatioTable(1, "gravity", 2).rows[1].direction, "reverse");
});

test("genConversionSet answers come straight out of convert", () => {
  const set = H.genConversionSet(31337, 8);
  assert.deepEqual(set.rows, H.genConversionSet(31337, 8).rows);
  assert.notDeepEqual(set.rows, H.genConversionSet(31338, 8).rows);
  assert.equal(set.rows.length, 8);
  const seen = new Set();
  for (const row of set.rows) {
    const exact = H.convert(row.value, row.from, row.to);
    assert.equal(row.answer, exact.value);
    assert.equal(row.factor, exact.factor);
    assert.ok(row.steps.length > 0);
    assert.ok(H.withinTolerance(row.answer, row.answer, H.TOL_PERCENT));
    assert.ok(row.given.includes(row.from) && row.given.includes(row.to));
    seen.add(row.given);
  }
  assert.equal(seen.size, 8, "one problem sheet should not repeat itself");
  assert.throws(() => H.genConversionSet(1, 31), RangeError);
});

test("genSciSet prompts parse back into their own answers", () => {
  const set = H.genSciSet(9, 12);
  assert.deepEqual(set.rows, H.genSciSet(9, 12).rows);
  assert.notDeepEqual(set.rows, H.genSciSet(10, 12).rows);
  let prefixes = 0, plains = 0;
  for (const row of set.rows) {
    const read = row.type === "prefix" ? H.parseSI(row.givenText) : H.parseSci(row.givenText);
    assert.ok(read, "generated prompt must be parseable: " + row.given);
    assert.equal(read.mantissa, row.mantissa, row.given);
    assert.equal(read.exponent, row.exponent, row.given);
    assert.equal(H.sciText({ mantissa: row.mantissa, exponent: row.exponent }),
      row.answerText);
    assert.ok(Math.abs(row.mantissa) >= 1 && Math.abs(row.mantissa) < 10);
    assert.notEqual(row.exponent, 0);
    if (row.type === "prefix") prefixes++; else plains++;
  }
  assert.ok(prefixes > 0 && plains > 0, "should mix both prompt shapes");
  assert.throws(() => H.genSciSet(1, 0), RangeError);
});

test("genLightSet stays consistent with lightKm at the course c", () => {
  const set = H.genLightSet(5, 12);
  assert.deepEqual(set.rows, H.genLightSet(5, 12).rows);
  assert.notDeepEqual(set.rows, H.genLightSet(6, 12).rows);
  let distances = 0, times = 0;
  for (const row of set.rows) {
    assert.equal(row.c, H.C_COURSE);
    if (row.type === "lightDistance") {
      assert.equal(row.answer, H.lightDistance(row.count, row.unit, H.C_COURSE));
      assert.ok(row.given.includes(String(row.count)));
      distances++;
    } else {
      assert.equal(row.km, H.lightKm(row.answer * H.TIME_MULT[row.unit], H.C_COURSE));
      assert.ok(row.answer >= 1, "ask in a unit the answer fills: " + row.given);
      times++;
    }
  }
  assert.ok(distances > 0 && times > 0);
  const oneWeek = set.rows.find((r) => r.unit === "week" && r.count === 1);
  assert.ok(oneWeek === undefined || oneWeek.answer === 181440000000);
});

test("generated sheets carry no more than fresh numbers", () => {
  const kinds = ["gravity", "accel"];
  const all = kinds.map((k) => H.genRatioTable(11, k, 12).rows)
    .concat([H.genConversionSet(11, 12).rows, H.genSciSet(11, 12).rows,
      H.genLightSet(11, 12).rows]).flat();
  assert.ok(all.length > 40);
  for (const row of all) {
    assert.equal(typeof row.given, "string");
    assert.ok(row.given.length > 4);
    assert.ok(row.given.length < 110, "prompts stay terse, not prose: " + row.given);
    assert.ok("tolerance" in row || "answerText" in row);
  }
});
