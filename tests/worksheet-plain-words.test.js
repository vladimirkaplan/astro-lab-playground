"use strict";
// BMC-25: worksheet prompts must ask in the words a student would use out loud.
//
// The bar is a banned-word list, not a rewrite-by-eye, because a printed sheet
// cannot stop and explain itself. The words below are lab-report vocabulary that
// students meet on worksheets before they meet it in a textbook: "derive", "bias",
// "reading uncertainty", "systematic", "justify". None of them carries the question;
// the same question works in plain words, so the plain words win.
//
// Numbering and intent are pinned by tests/worksheet.test.js (prompt counts, order,
// and the numbered PRE/POST render), so this file only polices wording. Physics
// terms the lab actually teaches (elongation, parallax, luminosity, graticule) are
// deliberately NOT on the list: they are the point of the course, and each Learn
// tab defines them in its own "Words in this lab" box.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("../site/shared/store.js");
require("../site/shared/worksheet.js");

const LABS = ["01-measurement", "02-math", "03-celestial-sphere", "04-moon-phases",
  "05-moonrise-eclipses", "06-retrograde-mars", "07-lenses", "08-venus-phases",
  "09-pendulum", "10-spectra", "11-parallax", "12-hr-diagram", "13-variables",
  "14-galaxy-id", "15-hubbles-law", "16-time-lat-long"];

for (const slug of LABS) require("../site/labs/" + slug + "/worksheet.js");

const BANNED = [
  ["derive / derived / derivation", /\bderiv(e|es|ed|ing|ation)\b/i],
  ["bias / biased", /\bbias(es|ed)?\b/i],
  ["uncertainty / uncertain", /\buncertain(ty|ies)?\b/i],
  ["systematic (error)", /\bsystematic(ally)?\b/i],
  ["reading uncertainty", /\breadings?\s+uncertainty\b/i],
  ["rehearse / rehearsal", /\brehears(e|es|ed|ing|al)\b/i],
  ["reduce / reduction", /\breduc(e|es|ed|ing|tion)\b/i],
  ["verify / verification", /\bverif(y|ies|ied|ication)\b/i],
  ["justify / justification", /\bjustif(y|ies|ied|ication)\b/i],
  ["defend (an answer)", /\bdefen(d|ds|ding|ce)\b/i],
  ["argue / argument", /\bargu(men(ts)?|e|es|ed|ing)\b/i],
  ["cite / citation", /\bcit(e|es|ed|ation)\b/i],
  ["in terms of", /\bin terms of\b/i],
  ["orient / orientation", /\borient(s|ed|ing|ation)?\b/i],
  ["intermediate", /\bintermediate\b/i],
  ["substitution", /\bsubstitut(e|es|ed|ion)\b/i],
  ["forbid / forbids", /\bforbid(s|den|ding)?\b/i],
  ["competing", /\bcompeting\b/i],
  ["epoch / epochs", /\bepoch(es)?\b/i],
  ["usable", /\busable\b/i],
  ["utilize", /\butiliz(e|es|ed|ation)\b/i],
  ["obtain / obtained", /\bobtain(s|ed|ing)?\b/i],
  ["sufficient", /\bsufficient(ly)?\b/i],
];

const spec = globalThis.LS.worksheet;

function prompts(slug) {
  const d = spec.get(slug);
  assert.ok(d, slug + ": descriptor is registered");
  return {
    intro: [["intro", d.intro]],
    table: d.table.header.map((h, i) => ["table header " + (i + 1), h]),
    prelab: d.prelab.map((p, i) => ["pre-lab " + (i + 1), p]),
    postlab: d.postlab.map((p, i) => ["post-lab " + (i + 1), p]),
  };
}

for (const slug of LABS) {
  test(slug + ": printed prompts avoid the banned academic wording", () => {
    const groups = prompts(slug);
    const lines = [].concat(groups.intro, groups.table, groups.prelab, groups.postlab);
    assert.ok(lines.length >= 12, slug + ": a real sheet has intro, table and prompts");
    const hits = [];
    for (const [where, text] of lines) {
      for (const [word, re] of BANNED) {
        if (re.test(text)) hits.push(where + " -> " + word);
      }
    }
    assert.deepEqual(hits, [], slug + ": rewrite these in plain words: " + hits.join("; "));
  });

  test(slug + ": prompts still ask (each ends in ? or .) and keep their numbering", () => {
    const groups = prompts(slug);
    const ask = [].concat(groups.prelab, groups.postlab);
    assert.ok(ask.length >= 8, slug + ": pre-lab and post-lab prompts are present");
    for (const [where, text] of ask) {
      assert.match(text.trim(), /[?.]["']?$/, slug + ": " + where + " must be a full sentence");
      assert.ok(text.trim().length > 20, slug + ": " + where + " is not a stub");
    }
    const numbered = spec.csvText(slug);
    assert.match(numbered, /^PRE-LAB/m, slug + ": PRE section still renders");
    assert.match(numbered, /^POST-LAB/m, slug + ": POST section still renders");
  });
}

test("the banned list itself has no duplicates and stays plain-word focused", () => {
  const names = BANNED.map((b) => b[0]);
  assert.equal(new Set(names).size, names.length, "each banned entry is unique");
  assert.ok(names.length >= 15, "the banned list covers the flagged academic wording");
});
