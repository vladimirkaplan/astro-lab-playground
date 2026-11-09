"use strict";
// BMC-24: Learn prose on every lab page must be easy English.
//
// Bar (from the BMC-22 rewrite assessment):
//   (1) Flesch-Kincaid grade <= 8.0 over each lab's #learn section text;
//   (2) no single sentence over 25 words;
//   (3) each Learn opens with a "Words in this lab" box of 5-8 short lines.
//
// The sentence splitter guards decimals ("2.54"), course abbreviations
// ("Ch.", "e.g.") and headings, so prose can keep its numbers and citations.
// Syllables use the standard vowel-group heuristic; FK is computed on
// whole-section totals (words/sentence, syllables/word), not per sentence.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const LABS_DIR = path.join(ROOT, "site", "labs");

const LAB_DIRS = ["01-measurement", "02-math", "03-celestial-sphere", "04-moon-phases",
  "05-moonrise-eclipses", "06-retrograde-mars", "07-lenses", "08-venus-phases",
  "09-pendulum", "10-spectra", "11-parallax", "12-hr-diagram", "13-variables",
  "14-galaxy-id", "15-hubbles-law", "16-time-lat-long"];

const FK_MAX = 8.0;
const SENT_MAX = 25;

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  middot: "/", ndash: "-", mdash: "-", lsquo: "'", rsquo: "'",
  ldquo: '"', rdquo: '"', hellip: "...", times: " x ", divide: " / ",
  plusmn: "+/-", deg: " degrees ", le: " <= ", ge: " >= ", pm: "+/- ",
  rarr: "->", larr: "<-", harr: "<->", circ: " ^ ", sup2: "2", sup3: "3",
  mu: "micro", asymp: " about ", approx: " about ", alpha: "alpha", beta: "beta",
  gamma: "gamma", delta: "delta", lambda: "lambda", pi: "pi", rho: "rho",
  sigma: "sigma", tau: "tau", omega: "omega", degc: " C",
};

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (m, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, name) =>
      Object.prototype.hasOwnProperty.call(ENTITIES, name) ? " " + ENTITIES[name] + " " : m);
}

function learnHtml(dir) {
  const html = fs.readFileSync(path.join(LABS_DIR, dir, "index.html"), "utf8");
  const start = html.indexOf('<section id="learn"');
  assert.ok(start >= 0, dir + ": page has a #learn section");
  let depth = 0;
  const tag = /<section\b|<\/section>/g;
  tag.lastIndex = start;
  let m;
  while ((m = tag.exec(html))) {
    depth += m[0] === "</section>" ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index);
  }
  throw new Error(dir + ": unbalanced sections");
}

function learnText(section) {
  let s = section.replace(/\r?\n/g, " ");
  s = s.replace(/<(h2|h3)[^>]*>/g, "\n@@HEAD@@ ").replace(/<\/(h2|h3)>/g, "\n");
  s = s.replace(/<li[^>]*>/g, "\n").replace(/<\/(p|li|div|ul|ol)>/g, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  return decodeEntities(s);
}

const ABBREVS = ["dr", "mr", "mrs", "ms", "st", "vs", "etc", "e.g", "i.e", "approx",
  "fig", "figs", "no", "nos", "prof", "inc", "ltd", "dept", "univ", "ch", "vol", "jr", "sr"];

function isAbbrev(token) {
  const t = token.toLowerCase().replace(/[^a-z.]/g, "");
  if (!t) return false;
  const core = t.replace(/\.$/, "");
  if (ABBREVS.includes(core)) return true;
  return /^[a-z]\.$/.test(token.toLowerCase());
}

function nextIsLower(tok) {
  return !!tok && /^[a-z]/.test(tok);
}

function splitSentences(text) {
  const out = [];
  for (const lineRaw of text.split(/\n+/)) {
    const line = lineRaw.replace(/^@@HEAD@@\s*/, "").trim();
    if (!line) continue;
    const tokens = line.split(/\s+/);
    let cur = [];
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      cur.push(tok);
      const ends = /[.!?]["')\]]*$/.test(tok);
      const hardEnd = /[!?]["')\]]*$/.test(tok);
      const numeric = /\d[.!?]$/.test(tok) && nextIsLower(tokens[i + 1]);
      const next = tokens[i + 1];
      const endsSentence = hardEnd || (ends && !numeric && !isAbbrev(tok) &&
        (next === undefined || /^[A-Z(0-9"'*_]/.test(next)));
      if (endsSentence) { out.push(cur.join(" ")); cur = []; }
    }
    if (cur.length) out.push(cur.join(" "));
  }
  return out.filter((s) => /[A-Za-z0-9]/.test(s));
}

function wordTokens(sentence) {
  return sentence.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w));
}

function syllables(word) {
  const lower = word.toLowerCase();
  let w = lower.replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  w = w.replace(/^y/, "");
  const groups = w.match(/[aeiouy]{1,2}/g);
  let n = groups ? groups.length : 1;
  if (/[^laeiouy]le(s?)$/.test(lower)) n += 1;
  return Math.max(1, n);
}

function score(sentences) {
  let words = 0, syl = 0, longest = 0, longestS = "";
  for (const s of sentences) {
    const ws = wordTokens(s);
    words += ws.length;
    for (const w of ws) syl += syllables(w);
    if (ws.length > longest) { longest = ws.length; longestS = s; }
  }
  const fk = sentences.length && words
    ? 0.39 * (words / sentences.length) + 11.8 * (syl / words) - 15.59
    : 0;
  return { sentences: sentences.length, fk: Math.round(fk * 100) / 100, longest, longestS };
}

function readLab(dir) {
  const section = learnHtml(dir);
  const st = score(splitSentences(learnText(section)));
  const box = section.match(/<div class="words-box">([\s\S]*?)<\/div>/);
  let items = 0;
  if (box) items = (box[1].match(/<li\b/g) || []).length;
  return { section, st, box, items };
}

for (const dir of LAB_DIRS) {
  test(dir + ": Learn prose is easy English (FK <= 8.0, no 25+ word sentence)", () => {
    const { st } = readLab(dir);
    assert.ok(st.sentences >= 10, dir + ": Learn has measurable prose (found " + st.sentences + " sentences)");
    assert.ok(st.fk <= FK_MAX,
      dir + ": FK grade " + st.fk + " exceeds " + FK_MAX + " over " + st.sentences + " sentences");
    assert.ok(st.longest <= SENT_MAX,
      dir + ": " + st.longest + "-word sentence exceeds " + SENT_MAX + ": " + st.longestS);
  });

  test(dir + ": Learn opens with a 5-8 line Words in this lab box", () => {
    const { box, items } = readLab(dir);
    assert.ok(box, dir + ': has a <div class="words-box"> block');
    assert.match(box[1], /Words in this lab/, dir + ": box is titled 'Words in this lab'");
    assert.ok(items >= 5 && items <= 8, dir + ": box has 5-8 terms (found " + items + ")");
  });
}
