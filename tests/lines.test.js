"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

require("../site/data/lines.js");
const SP = globalThis.LS.spectra;

test("every source is shaped per contract", () => {
  for (const src of SP.sources) {
    assert.ok(["continuous", "lines", "mixed"].includes(src.kind), src.id);
    assert.ok(src.name && src.blurb, src.id);
    if (src.kind === "lines") {
      assert.ok(src.lines.length >= 3, "too few lines: " + src.id);
    }
    if (src.lines) {
      for (const l of src.lines) {
        assert.ok(l.nm >= 380 && l.nm <= 750, src.id + " line out of band: " + l.nm);
        assert.ok(l.i > 0 && l.i <= 1, src.id);
      }
    }
  }
});

test("hydrogen carries the Balmer visible four", () => {
  const h = SP.sourceById("h");
  const nm = h.lines.map(l => l.nm).sort((a, b) => a - b);
  assert.deepEqual(nm, [410.2, 434.0, 486.1, 656.3]);
});

test("mercury's green 546 dominates", () => {
  const hg = SP.sourceById("hg");
  const top = hg.lines.reduce((a, b) => (a.i > b.i ? a : b));
  assert.equal(top.nm, 546.1);
});

test("brightness peaks on lines and dips between them", () => {
  const h = SP.sourceById("h");
  assert.ok(SP.brightness(h, 656.3) > 20 * SP.brightness(h, 570));
  const bulb = SP.sourceById("bulb");
  assert.ok(SP.brightness(bulb, 570) > SP.brightness(bulb, 410)); // 2850 K is red-leaning
  const fluo = SP.sourceById("fluoro");
  assert.ok(SP.brightness(fluo, 546.1) > SP.brightness(fluo, 520)); // line over band
});

test("color words tile the visible range", () => {
  assert.equal(SP.wordForNm(405), "violet");
  assert.equal(SP.wordForNm(486.1), "blue");
  assert.equal(SP.wordForNm(546.1), "green");
  assert.equal(SP.wordForNm(579.1), "yellow");
  assert.equal(SP.wordForNm(600), "orange");
  assert.equal(SP.wordForNm(656.3), "red");
});

test("wavelengthToRGB returns drawable colors with sane hue anchors", () => {
  const red = SP.wavelengthToRGB(660);
  const blue = SP.wavelengthToRGB(450);
  assert.equal(red.length, 3);
  assert.ok(red[0] > red[2], "red channel should lead at 660");
  assert.ok(blue[2] > blue[0], "blue channel should lead at 450");
  for (let nm = 380; nm <= 750; nm += 5) {
    const c = SP.wavelengthToRGB(nm);
    assert.ok(c.every(v => v >= 0 && v <= 255), String(nm));
  }
});

test("planck curve leans red at 2850 K and flattens at 6500 K (Wien sanity)", () => {
  const ratio = T => SP.planck(660, T) / SP.planck(440, T);
  assert.ok(ratio(2850) > 2.0, "2850 K should clearly favor red: " + ratio(2850));
  assert.ok(ratio(6500) < ratio(2850), "hotter source should be bluer in ratio");
});
