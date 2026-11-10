"use strict";
// Originality gate (License Counsel, BMC-33): no shipped site file may share a
// 7-word run with the BMCC manual transcript. The corpus is OUT-OF-BAND -
// $MANUAL_CORPUS_DIR must point at a directory of extracted manual text that
// lives OUTSIDE this repo (the transcript is refused by .gitignore and must
// never be committed here). Without the env var the test skips with a clear
// message; with it set the corpus dir must exist and hold readable text.
//
// Method (counsel's spec, stdlib only): lowercase both sides, strip tags and
// non-alphanumerics, tokenize on whitespace, build the set of word 7-grams
// from the manual, and report every site file containing any of them. A hit
// inside an allowlisted phrase is exempt - the allowlist covers functional
// definitional phrases counsel verified as unprotectable (merger / scenes a
// faire): the object/lens/image distance definitions in ast110 07-lenses.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const M = require("./lab-manifest.js");
const SITE = path.join(M.ROOT, "site");
const NGRAM = 7;

const ALLOWLIST = [
  "here do is the distance from the object to the lens",
  "the di is the distance from the lens to the image"
];

function tokens(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function grams(tokens) {
  const out = new Set();
  for (let i = 0; i + NGRAM <= tokens.length; i++) {
    out.add(tokens.slice(i, i + NGRAM).join(" "));
  }
  return out;
}

function corpusTokens(dir) {
  const toks = [];
  let files = 0;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else { files += 1; toks.push(...tokens(fs.readFileSync(p, "utf8"))); }
    }
  };
  walk(dir);
  return { toks, files };
}

function siteFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "vendor" || entry.name === "offline") continue;
      out.push(...siteFiles(p));
    } else if (/\.(html|js|css)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const corpusDir = process.env.MANUAL_CORPUS_DIR;

test("no shipped site file shares a 7-gram with the manual corpus", {
  skip: corpusDir
    ? false
    : "MANUAL_CORPUS_DIR not set: point it at the extracted manual corpus OUTSIDE this repo to run the scan (the transcript must never be committed here)"
}, () => {
  assert.ok(fs.existsSync(corpusDir) && fs.statSync(corpusDir).isDirectory(),
    "MANUAL_CORPUS_DIR must point at an existing directory");
  const { toks, files } = corpusTokens(corpusDir);
  assert.ok(files > 0 && toks.length >= NGRAM,
    "the corpus directory holds readable manual text (got " + files + " files)");

  const corpusSet = grams(toks);
  const allowed = ALLOWLIST.map((p) => tokens(p).join(" "));

  const report = [];
  for (const file of siteFiles(SITE)) {
    const shared = [...grams(tokens(fs.readFileSync(file, "utf8")))]
      .filter((g) => corpusSet.has(g))
      .filter((g) => !allowed.some((phrase) => phrase.includes(g)));
    if (shared.length) report.push(path.relative(M.ROOT, file) + ": " + shared.length +
      " shared 7-gram(s), e.g. \"" + shared[0] + "\"");
  }
  assert.deepEqual(report, [],
    "site copy must not share 7-word runs with the manual:\n" + report.join("\n"));
});
