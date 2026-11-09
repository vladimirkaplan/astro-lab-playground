// Flesch-Kincaid readability check for the landing page copy (BMC-25).
//
// Why a script and not just a test: the same numbers have to be checkable by a
// human editor working on the prose, from the command line, without reading test
// output. Run it, see the grade per block, edit, run again.
//
//   node scripts/fk-check.js                 # landing page, human table
//   node scripts/fk-check.js --json          # same data as JSON
//   node scripts/fk-check.js a.html b.html   # any other HTML files
//
// Exit code is 1 when any block breaks the bar (FK > 8.0, or one sentence over
// 25 words), so CI can call it straight from a test or a script.
//
// The counters match tests/readability.test.js (same FK formula, same syllable
// heuristic). That test keeps its own copy on purpose: it is pinned to the Learn
// sections, this one is pinned to the landing page, and neither should be able to
// move the other's bar by accident.
//
// Node stdlib only. No network, no clock, no random.
"use strict";

const fs = require("fs");
const path = require("path");

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

function textOf(html) {
  // Soft-wrapped HTML source must not read as sentence breaks: collapse real
  // newlines first, then let block tags create them. (tests/readability.test.js
  // does the same, so a line break never fakes a short sentence here.)
  const flat = html.replace(/\r?\n/g, " ");
  const s = flat
    .replace(/<(h2|h3|p|li|div)[^>]*>/g, "\n")
    .replace(/<\/(p|li|div|h2|h3|ul|ol)>/g, "\n");
  return decodeEntities(s.replace(/<[^>]+>/g, " "));
}

const ABBREVS = ["dr", "mr", "mrs", "ms", "st", "vs", "etc", "e.g", "i.e", "approx",
  "fig", "figs", "no", "nos", "prof", "inc", "ltd", "dept", "univ", "ch", "vol", "jr", "sr"];

function isAbbrev(token) {
  const t = token.toLowerCase().replace(/[^a-z.]/g, "");
  if (!t) return false;
  if (ABBREVS.includes(t.replace(/\.$/, ""))) return true;
  return /^[a-z]\.$/.test(token.toLowerCase());
}

function splitSentences(text) {
  const out = [];
  for (const lineRaw of text.split(/\n+/)) {
    const line = lineRaw.trim();
    if (!line) continue;
    const tokens = line.split(/\s+/);
    let cur = [];
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      cur.push(tok);
      const ends = /[.!?]["')\]]*$/.test(tok);
      const hardEnd = /[!?]["')\]]*$/.test(tok);
      const numeric = /\d[.!?]$/.test(tok) && !!tokens[i + 1] && /^[a-z]/.test(tokens[i + 1]);
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

// score() returns { sentences, words, fk, longest, longestSentence } for a block.
function score(sentences) {
  let words = 0, syl = 0, longest = 0, longestSentence = "";
  for (const s of sentences) {
    const ws = wordTokens(s);
    words += ws.length;
    for (const w of ws) syl += syllables(w);
    if (ws.length > longest) { longest = ws.length; longestSentence = s; }
  }
  const fk = sentences.length && words
    ? 0.39 * (words / sentences.length) + 11.8 * (syl / words) - 15.59
    : 0;
  return {
    sentences: sentences.length, words,
    fk: Math.round(fk * 100) / 100,
    longest, longestSentence,
  };
}

function fkGrade(text) {
  return score(splitSentences(text)).fk;
}

// ---------- landing page copy blocks ----------

function section(html, id) {
  const start = html.indexOf('<section id="' + id + '"');
  if (start < 0) return "";
  const end = html.indexOf("</section>", start);
  return end < 0 ? html.slice(start) : html.slice(start, end);
}

// landingBlocks() cuts the landing page into the blocks the bar applies to:
// the header intro, each muted lead paragraph, and each card's one sentence.
// The footer keeps licence and data citations, so it is measured but not gated.
function landingBlocks(html) {
  const blocks = [];
  const head = /<header class="site-head">([\s\S]*?)<\/header>/.exec(html);
  if (head) {
    const body = head[1].replace(/<h1[^>]*>[\s\S]*?<\/h1>/, "").replace(/<p><small>[\s\S]*?<\/small><\/p>/, "");
    blocks.push({ name: "intro", gated: true, text: textOf(body) });
  }
  const banner = /<div class="banner"[\s\S]*?<\/div>/.exec(html);
  if (banner) blocks.push({ name: "banner", gated: true, text: textOf(banner[0]) });
  const muted = html.match(/<p class="muted">[\s\S]*?<\/p>/g) || [];
  muted.forEach((m, i) => {
    blocks.push({ name: "lead " + (i + 1), gated: true, text: textOf(m) });
  });
  const cards = html.match(/<a class="lab-card"[\s\S]*?<\/a>/g) || [];
  for (const c of cards) {
    const num = /<span class="num">([^<]*)<\/span>/.exec(c);
    const para = /<p>([\s\S]*?)<\/p>/.exec(c);
    blocks.push({
      name: "card " + (num ? num[1].trim() : cards.indexOf(c) + 1),
      gated: true,
      text: para ? textOf(para[1]) : "",
    });
  }
  const foot = /<footer class="site-foot">([\s\S]*?)<\/footer>/.exec(html);
  if (foot) blocks.push({ name: "footer (cite block)", gated: false, text: textOf(foot[1]) });
  return blocks;
}

// checkBlocks() scores every block and lists every rule it breaks.
function checkBlocks(blocks) {
  return blocks.map((b) => {
    const st = score(splitSentences(b.text));
    const problems = [];
    if (b.gated && st.sentences && st.fk > FK_MAX) {
      problems.push("FK " + st.fk + " > " + FK_MAX);
    }
    if (b.gated && st.longest > SENT_MAX) {
      problems.push(st.longest + "-word sentence: " + st.longestSentence);
    }
    return { name: b.name, gated: b.gated, st, problems };
  });
}

function run(files) {
  let bad = 0;
  const out = [];
  for (const f of files) {
    const html = fs.readFileSync(f, "utf8");
    const rows = checkBlocks(landingBlocks(html));
    out.push({ file: f, blocks: rows });
    bad += rows.filter((r) => r.problems.length).length;
  }
  return { out, bad };
}

function main(argv) {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const files = args.filter((a) => a !== "--json");
  const targets = files.length
    ? files
    : [path.join(__dirname, "..", "site", "index.html")];
  const { out, bad } = run(targets);
  if (json) {
    console.log(JSON.stringify(out, null, 2));
  } else {
    for (const entry of out) {
      console.log(entry.file);
      for (const r of entry.blocks) {
        const mark = r.problems.length ? "FAIL" : (r.gated ? "ok  " : "info");
        console.log("  " + mark + " " + r.name.padEnd(22) +
          " FK " + String(r.st.fk).padStart(5) +
          "  words " + String(r.st.words).padStart(4) +
          "  sentences " + String(r.st.sentences).padStart(3) +
          "  longest " + String(r.st.longest).padStart(3));
        for (const p of r.problems) console.log("       - " + p);
      }
    }
    console.log(bad ? bad + " block(s) over the bar." : "All gated blocks are inside the bar.");
  }
  return bad ? 1 : 0;
}

if (require.main === module) process.exitCode = main(process.argv);

module.exports = {
  FK_MAX, SENT_MAX, fkGrade, score, splitSentences, syllables, wordTokens,
  textOf, landingBlocks, checkBlocks,
};
