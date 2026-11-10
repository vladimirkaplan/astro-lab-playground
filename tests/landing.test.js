"use strict";
// BMC-25 (bar) + BMC-27 (multi-course IA): the hub and every course landing page.
//
// Bar carried over from BMC-25, now run against EACH course landing:
//   (1) every card says one thing, in one plain sentence, that starts with a verb
//       and stays at or under 18 words;
//   (2) the lab cards run in course order, so a student reading top to bottom
//       reads them in the order the manual does;
//   (3) the first lab carries a visible "Start here" tag, because the page
//       otherwise makes students guess where to begin;
//   (4) the gated landing copy (intro, banner, lead paragraphs, cards) stays at
//       FK <= 8 with no sentence over 25 words, scored by scripts/fk-check.js so
//       the same numbers are reachable from the command line;
//   (5) the practice-only banner and its source citations stay on the page.
// BMC-27 adds the hub itself: site/index.html is one card per registered
// course, nothing else, and the per-course landing lists only its own labs.
// Lab lists come from tests/lab-manifest.js (the site's own registry).

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const fk = require("../scripts/fk-check.js");
const M = require("./lab-manifest.js");

const SITE = path.join(M.ROOT, "site");
const MAX_CARD_WORDS = 18;

// Plain imperative verbs only. A card may not open on a noun phrase, a number,
// or a buzzword; the opening word tells the student what they will do.
const VERB_FIRST = new Set(["build", "change", "check", "chase", "compare", "count",
  "drive", "find", "fit", "fold", "follow", "get", "hunt", "learn", "log", "look",
  "make", "map", "mark", "match", "measure", "name", "orbit", "plot", "practice",
  "read", "see", "set", "sort", "spin", "take", "tell", "time", "tilt", "trace", "try",
  "turn", "use", "watch", "work"]);

// The banner test below requires the landing to print its registry
// attribution VERBATIM (escapedRe(course.attribution)), so a registry edit
// cannot drift away from the page without red tests (License Counsel BMC-33:
// the old per-course hard-coded copies of the source line were the drift).

function grid(html, id) {
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
      slug: (/data-lab="([^"]+)"/.exec(raw) || /data-course="([^"]+)"/.exec(raw) || [])[1] || "",
      href: href ? href[1] : "",
      sentence: para ? fk.textOf(para[1]).trim() : "",
      tagged: /class="tag"[^>]*>[\s\S]*?<\/span>/.test(raw),
    };
  });
}

function gridOpt(html, id) {
  return html.includes('id="' + id + '"') ? cards(grid(html, id)) : [];
}

function escapedRe(s) {
  return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s*"));
}

// ---------- the hub (site/index.html) ----------

const hub = fs.readFileSync(M.hubFile, "utf8");
const hubCards = cards(grid(hub, "course-cards"));

test("hub: one card per registered course, nothing else links out", () => {
  const slugs = hubCards.map((c) => c.slug).sort();
  assert.deepEqual(slugs, M.codes.slice().sort(),
    "every course has exactly one hub card and the hub has no other cards");
  for (const c of hubCards) {
    assert.equal("./" + c.href, M.byCode(c.slug).landing.replace(/^\//, "./"),
      c.slug + ": hub card links the registry landing");
    assert.ok(fs.existsSync(path.join(SITE, M.byCode(c.slug).landing.slice(1))),
      c.slug + ": the landing file exists");
  }
  assert.ok(!/href="[^"]*labs\//.test(hub), "the hub links no lab, only courses");
});

test("hub: the practice-only banner stays on the page", () => {
  assert.match(hub, /<div class="banner" role="note">/, "the disclaimer banner is present");
  assert.match(hub, /Practice sims?, not your BMCC submission\./, "the banner names itself");
});

test("hub: gated copy is inside the FK bar with no 25+ word sentence", () => {
  const rows = fk.checkBlocks(fk.landingBlocks(hub)).filter((r) => r.gated);
  assert.ok(rows.length >= 4, "the hub exposes intro, banner, lead and course cards");
  const bad = rows.filter((r) => r.problems.length);
  assert.deepEqual(bad.map((r) => r.name + ": " + r.problems.join("; ")), [],
    "no gated hub block may exceed FK " + fk.FK_MAX + " or " + fk.SENT_MAX + " words");
});

for (const c of hubCards) {
  test("hub card " + c.num + ": one plain sentence of at most 18 words", () => {
    assert.ok(c.sentence.length, c.slug + ": card has a one-line summary");
    const sentences = fk.splitSentences(c.sentence);
    assert.equal(sentences.length, 1, c.slug + ": card says one thing, not " +
      sentences.length + " sentences");
    const words = fk.wordTokens(c.sentence);
    assert.ok(words.length <= MAX_CARD_WORDS,
      c.slug + ": " + words.length + " words is over the " + MAX_CARD_WORDS + " word bar");
    assert.ok(!/[!?]/.test(c.sentence), c.slug + ": card stays a plain statement");
    assert.ok(fk.fkGrade(c.sentence) <= fk.FK_MAX,
      c.slug + ": card copy is above FK " + fk.FK_MAX);
  });
}

// ---------- each course landing ----------

for (const course of M.COURSES) {
  const code = course.code;
  const LAB_DIRS = course.labDirs;
  const html = fs.readFileSync(M.landingFile(code), "utf8");
  const labCards = cards(grid(html, "cards"));
  const hwCards = gridOpt(html, "hw-cards");

  test(code + ": every real lab has exactly one landing card, and each card links its own folder", () => {
    const slugs = labCards.map((c) => c.slug);
    assert.deepEqual(slugs.slice().sort(), LAB_DIRS.slice().sort());
    for (const c of labCards) {
      assert.equal(c.href, "labs/" + c.slug + "/index.html", c.slug + ": card links its own page");
    }
  });

  test(code + ": lab cards run in course order, first lab first and last lab last", () => {
    const order = labCards.map((c) => c.slug);
    assert.deepEqual(order, LAB_DIRS, "card order must match the manual's lab order");
    if (LAB_DIRS.length) {
      assert.equal(labCards[0].slug, LAB_DIRS[0]);
      assert.equal(labCards[labCards.length - 1].slug, LAB_DIRS[LAB_DIRS.length - 1]);
    }
    labCards.forEach((c, i) => {
      const num = Number(c.slug.slice(0, 2));
      if (i > 0) assert.ok(num >= Number(labCards[i - 1].slug.slice(0, 2)),
        c.slug + ": number chip must not run backwards");
    });
  });

  if (LAB_DIRS.length) {
    test(code + ": the first lab is tagged 'Start here' and it is the only tagged card", () => {
      const first = labCards.find((c) => c.slug === LAB_DIRS[0]);
      assert.ok(first, "the first lab card exists");
      assert.match(html, /class="tag"[^>]*>\s*Start here\s*<\/span>/, "a 'Start here' tag is rendered");
      assert.ok(first.tagged, "the tag sits on the first lab card");
      const tagged = labCards.concat(hwCards).filter((c) => c.tagged);
      assert.equal(tagged.length, 1, "exactly one card carries a tag");
    });
  }

  for (const c of labCards.concat(hwCards)) {
    test(code + " card " + c.num + ": one plain verb-first sentence of at most 18 words", () => {
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

  test(code + ": gated landing copy is inside the FK bar with no 25+ word sentence", () => {
    const rows = fk.checkBlocks(fk.landingBlocks(html)).filter((r) => r.gated);
    // AST110's 16-card landing exposes 20+ blocks; a young course landing only
    // has its intro, banner, leads and its own cards, so the floor follows the
    // card count instead of pretending the page is sixteen labs deep.
    const minRows = LAB_DIRS.length ? Math.min(20, 5 + LAB_DIRS.length) : 3;
    assert.ok(rows.length >= minRows,
      "the landing page exposes intro, banner, leads and cards (got " + rows.length + ")");
    const bad = rows.filter((r) => r.problems.length);
    assert.deepEqual(bad.map((r) => r.name + ": " + r.problems.join("; ")), [],
      "no gated landing block may exceed FK " + fk.FK_MAX + " or " + fk.SENT_MAX + " words");
    const intro = rows.find((r) => r.name === "intro");
    assert.ok(intro && intro.st.sentences >= 3, "the intro is scored, not empty");
  });

  test(code + ": the Start here pill cannot land under the progress tick", () => {
    const css = fs.readFileSync(path.join(SITE, "styles.css"), "utf8");
    const rule = /\.landing \.lab-card \.tag\s*\{([^}]*)\}/.exec(css);
    assert.ok(rule, "styles.css has a landing-card tag rule");
    assert.match(rule[1], /float:\s*none/, "the pill must not float into the tick's corner");
    assert.match(css, /\.lab-card \.tick\s*\{[^}]*position:\s*absolute/,
      "the progress tick keeps its own absolutely positioned corner");
  });

  test(code + ": the practice-only banner and its source citations stay on the landing page", () => {
    assert.match(html, /<div class="banner" role="note">/, "the disclaimer banner is present");
    assert.match(html, /Practice sim, not your BMCC submission\./, "the banner names itself");
    assert.match(html, escapedRe(course.attribution),
      code + ": the source citation is the registry attribution, verbatim");
    if (code === "ast110") assert.match(html, /NIST/, "the NIST line-data citation is kept");
  });
}
