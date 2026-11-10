"use strict";
// BMC-27: every URL ever published still lands somewhere.
//
// The 16 real labs moved from /labs/<slug>/ to /ast110/labs/<slug>/, so a
// meta-refresh stub now sits at every old URL - including the eight stubs
// older renames had already left behind, which were repointed at the new
// home. This test walks site/labs/ and pins, for every stub:
//   (1) it is a stub: no app scripts, just canonical + meta refresh + link;
//   (2) canonical and refresh agree, and both point into ast110/labs/;
//   (3) the target page really exists;
//   (4) each of the 16 current labs has a stub under its own former slug,
//       and the eight pre-rename slugs kept their same target lab.
// The old landing URL /index.html needed no stub: it is now the course hub.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const M = require("./lab-manifest.js");
const SITE = path.join(M.ROOT, "site");
const LABS_DIR = path.join(SITE, "labs");

const LEGACY_STUBS = {
  "05-moon-phases": "04-moon-phases",
  "08-pendulum": "09-pendulum",
  "09-spectra": "10-spectra",
  "12-eclipse-board": "05-moonrise-eclipses",
  "hr-diagram": "12-hr-diagram",
  "parallax": "11-parallax",
  "variables": "13-variables",
  "venus-phases": "08-venus-phases",
};

function stub(slug) {
  const file = path.join(LABS_DIR, slug, "index.html");
  assert.ok(fs.existsSync(file), "old URL still exists as a page: /labs/" + slug + "/");
  return fs.readFileSync(file, "utf8");
}

function targetOf(html) {
  const refresh = /<meta http-equiv="refresh" content="0; url=([^"]+)">/.exec(html);
  const canonical = /<link rel="canonical" href="([^"]+)">/.exec(html);
  const link = /<a href="([^"]+)">/.exec(html);
  assert.ok(refresh, "stub carries a meta refresh");
  assert.ok(canonical, "stub carries a canonical link");
  assert.equal(canonical[1], refresh[1], "canonical and refresh point at one place");
  assert.equal(link[1], refresh[1], "the manual link agrees too");
  return refresh[1];
}

const dirs = fs.readdirSync(LABS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory()).map((e) => e.name).sort();

test("site/labs/ holds exactly the redirect stubs: 16 old lab URLs + 8 older ones", () => {
  assert.deepEqual(dirs, [].concat(
    M.labDirsFor("ast110"), Object.keys(LEGACY_STUBS)).sort());
});

for (const slug of dirs) {
  test("stub /labs/" + slug + "/ points at a real page under /ast110/labs/", () => {
    const html = stub(slug);
    const target = targetOf(html);
    assert.match(target, /^\.\.\/\.\.\/ast110\/labs\/[0-9a-z-]+\/$/,
      slug + ": depth-correct relative target into the course folder");
    const dest = path.join(LABS_DIR, slug, target);
    assert.ok(fs.existsSync(path.join(dest, "index.html")),
      slug + ": target page exists: " + target);
    assert.doesNotMatch(html, /<script|worksheet\.js/, slug + ": a stub runs no app code");
    assert.match(html, /This lab moved to/, slug + ": tells the student what happened");
  });
}

test("each of the 16 moved labs has a stub at its own old URL", () => {
  for (const dir of M.labDirsFor("ast110")) {
    const html = stub(dir);
    assert.equal(targetOf(html), "../../ast110/labs/" + dir + "/",
      dir + ": stub points at the lab's own new home");
  }
});

test("the eight pre-rename stubs kept their same target lab after the move", () => {
  for (const [slug, target] of Object.entries(LEGACY_STUBS)) {
    const html = stub(slug);
    assert.equal(targetOf(html), "../../ast110/labs/" + target + "/",
      slug + ": still redirects to " + target);
  }
});

test("the old landing URL became the hub (no stub) and the repo-root refresh still works", () => {
  const hub = fs.readFileSync(path.join(SITE, "index.html"), "utf8");
  assert.doesNotMatch(hub, /http-equiv="refresh"/, "site/index.html is a real page, not a stub");
  const root = fs.readFileSync(path.join(M.ROOT, "index.html"), "utf8");
  assert.match(root, /url=\.\/site\/index\.html/, "repo-root meta refresh untouched");
});
