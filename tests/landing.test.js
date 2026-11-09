"use strict";
// BMC-25: the landing page must read easily and lead somewhere obvious.
//
// Bar (from the BMC-22 rewrite assessment):
//   (1) every card says one thing, in one plain sentence, that starts with a verb
//       and stays at or under 18 words;
//   (2) the lab cards run in course order (Lab 1 first, Labs 16-17 last), so a
//       student reading top to bottom reads them in the order the manual does;
//   (3) Lab 1 carries a visible "Start here" tag, because the page otherwise
//       makes students guess where to begin;
//   (4) the gated landing copy (intro, banner, lead paragraphs, cards) stays at
//       FK <= 8 with no sentence over 25 words, scored by scripts/fk-check.js so
//       the same numbers are reachable from the command line;
//   (5) the practice-only banner and its OpenStax/NIST citations stay on the page.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const fk = require("../scripts/fk-check.js");

const SITE = path.join(__dirname, "..", "site");
const html = fs.readFileSync(path.join(SITE, "index.html"), "utf8");

const LAB_DIRS = ["01-measurement", "02-math", "03-celestial-sphere", "04-moon-phases",
  "05-moonrise-eclipses", "06-retrograde-mars", "07-lenses", "08-venus-phases",
  "09-pendulum", "10-spectra", "11-parallax", "12-hr-diagram", "13-variables",
  "14-galaxy-id", "15-hubbles-law", "16-time-lat-long"];

const MAX_CARD_WORDS = 18;

// Plain imperative verbs only. A card may not open on a noun phrase, a number,
// or a buzzword; the opening word tells the student what they will do.
const VERB_FIRST = new Set(["build", "change", "check", "chase", "compare", "count",
  "drive", "find", "fit", "fold", "follow", "get", "hunt", "learn", "log", "look",
  "make", "map", "mark", "match", "measure", "name", "orbit", "plot", "practice",
  "read", "see", "set", "sort", "spin", "take", "tell", "time", "tilt", "trace", "try",
  "turn", "use", "watch", "work"]);

function grid(id) {
  const start = html.indexOf('id="' + id + '"');
  assert.ok(start >= 0, "landing has a #" + id + " grid");
  const open = html.lastIndexOf("<div", start);
  let depth = 0;
  const tag = /<div\b|<\/div>/g;
  tag.lastIndex = open;
  let m;
  while ((m = tag.exec(html))) {
    depth += m[0] === "</div>" ? -1 : 1;
    if (depth === 0) return html.slice(open, m.index);
  }
  throw new Error("unbalanced div for #" + id);
}

function cards(gridHtml) {
  return (gridHtml.match(/<a class="lab-card"[\s\S]*?<\/a>/g) || []).map((raw) => {
    const num = /<span class="num">([^<]*)<\/span>/.exec(raw);
    const href = /href="\.\/([^"]+)"/.exec(raw);
    const para = /<p>([\s\S]*?)<\/p>/.exec(raw);
    return {
      num: num ? num[1].trim() : "",
      slug: /data-lab="([^"]+)"/.exec(raw)[1],
      href: href ? href[1] : "",
      sentence: para ? fk.textOf(para[1]).trim() : "",
      tagged: /class="tag"[^>]*>[\s\S]*?<\/span>/.test(raw),
    };
  });
}

const labCards = cards(grid("cards"));
const hwCards = cards(grid("hw-cards"));

test("every real lab has exactly one landing card, and each card links its own folder", () => {
  const slugs = labCards.map((c) => c.slug);
  assert.deepEqual(slugs.slice().sort(), LAB_DIRS.slice().sort());
  for (const c of labCards) {
    assert.equal(c.href, "labs/" + c.slug + "/index.html", c.slug + ": card links its own page");
  }
});

test("lab cards run in course order, Lab 1 first and Labs 16-17 last", () => {
  const order = labCards.map((c) => c.slug);
  assert.deepEqual(order, LAB_DIRS, "card order must match the manual's lab order");
  assert.equal(labCards[0].slug, "01-measurement");
  assert.equal(labCards[labCards.length - 1].slug, "16-time-lat-long");
  labCards.forEach((c, i) => {
    const num = Number(c.slug.slice(0, 2));
    if (i > 0) assert.ok(num >= Number(labCards[i - 1].slug.slice(0, 2)),
      c.slug + ": number chip must not run backwards");
  });
});

test("Lab 1 is tagged 'Start here' and it is the only tagged card", () => {
  const first = labCards.find((c) => c.slug === "01-measurement");
  assert.ok(first, "Lab 1 card exists");
  assert.match(html, /class="tag"[^>]*>\s*Start here\s*<\/span>/, "a 'Start here' tag is rendered");
  assert.ok(first.tagged, "the tag sits on the Lab 1 card");
  const tagged = labCards.concat(hwCards).filter((c) => c.tagged);
  assert.equal(tagged.length, 1, "exactly one card carries a tag");
});

for (const c of labCards.concat(hwCards)) {
  test("card " + c.num + ": one plain verb-first sentence of at most 18 words", () => {
    assert.ok(c.sentence.length, c.slug + ": card has a one-line summary");
    const sentences = fk.splitSentences(c.sentence);
    assert.equal(sentences.length, 1, c.slug + ": card says one thing, not " +
      sentences.length + " sentences");
    const words = fk.wordTokens(c.sentence);
    assert.ok(words.length <= MAX_CARD_WORDS,
      c.slug + ": " + words.length + " words is over the " + MAX_CARD_WORDS + " word bar");
    const first = words[0].toLowerCase().replace(/[^a-z]/g, "");
    assert.ok(VERB_FIRST.has(first),
      c.slug + ': card must open on a plain verb, not "' + words[0] + '"');
    assert.ok(!/[!?]/.test(c.sentence), c.slug + ": card stays a plain statement");
    assert.ok(fk.fkGrade(c.sentence) <= fk.FK_MAX,
      c.slug + ": card copy is above FK " + fk.FK_MAX);
  });
}

test("gated landing copy is inside the FK bar with no 25+ word sentence", () => {
  const rows = fk.checkBlocks(fk.landingBlocks(html)).filter((r) => r.gated);
  assert.ok(rows.length >= 20, "the landing page exposes intro, banner, leads and cards");
  const bad = rows.filter((r) => r.problems.length);
  assert.deepEqual(bad.map((r) => r.name + ": " + r.problems.join("; ")), [],
    "no gated landing block may exceed FK " + fk.FK_MAX + " or " + fk.SENT_MAX + " words");
  const intro = rows.find((r) => r.name === "intro");
  assert.ok(intro && intro.st.sentences >= 3, "the intro is scored, not empty");
});

test("the Start here pill cannot land under the progress tick", () => {
  const css = fs.readFileSync(path.join(SITE, "styles.css"), "utf8");
  const rule = /\.landing \.lab-card \.tag\s*\{([^}]*)\}/.exec(css);
  assert.ok(rule, "styles.css has a landing-card tag rule");
  assert.match(rule[1], /float:\s*none/, "the pill must not float into the tick's corner");
  assert.match(css, /\.lab-card \.tick\s*\{[^}]*position:\s*absolute/,
    "the progress tick keeps its own absolutely positioned corner");
});

test("the practice-only banner and its source citations stay on the landing page", () => {
  assert.match(html, /<div class="banner" role="note">/, "the disclaimer banner is present");
  assert.match(html, /Practice sim, not your BMCC submission\./, "the banner names itself");
  assert.match(html, /OpenStax\s*<em>Astronomy 2e<\/em>\s*\(CC BY 4\.0\)/,
    "the OpenStax CC BY 4.0 citation is kept");
  assert.match(html, /NIST/, "the NIST line-data citation is kept");
});
