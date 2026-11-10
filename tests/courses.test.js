"use strict";
// BMC-27: the course registry (site/shared/courses.js) is the only place course
// identity lives. These tests pin the entry contract, the on-disk layout it
// describes, and the path/slug lookup helpers that ui.js, store.js and
// worksheet.js all read.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const M = require("./lab-manifest.js");
const SITE = path.join(M.ROOT, "site");
const COURSES_PATH = path.join(SITE, "shared", "courses.js");
const src = fs.readFileSync(COURSES_PATH, "utf8");

// Fresh load, like a browser loading the plain script tag.
delete require.cache[require.resolve(COURSES_PATH)];
require(COURSES_PATH);
const COURSES = globalThis.LS.courses;

test("courses.js loads as a plain script and hands out a frozen list", () => {
  assert.ok(Array.isArray(COURSES), "LS.courses is an array");
  assert.ok(Object.isFrozen(COURSES), "the list is frozen");
  assert.match(src, /globalThis|root\.LS/, "attaches to the LS namespace");
  const codes = COURSES.map((c) => c.code);
  assert.deepEqual(codes, ["ast110", "phy110"]);
});

const FIELDS = ["code", "name", "title", "landing", "worksheetFilePrefix",
  "attribution", "licenceSource", "labDirs"];

for (const course of COURSES) {
  const code = course.code;

  test(code + ": every contract field is present, typed and frozen", () => {
    for (const f of FIELDS) {
      assert.ok(course[f] !== undefined, f + " present");
    }
    assert.ok(Object.isFrozen(course), "entry frozen");
    assert.ok(Object.isFrozen(course.labDirs), "labDirs frozen");
    assert.match(course.code, /^[a-z0-9]+$/);
    assert.match(course.worksheetFilePrefix, /^[a-z0-9-]+-lab-$/);
    assert.equal(course.worksheetFilePrefix, course.code + "-lab-",
      "the file prefix names the course, like the folder does");
    assert.match(course.landing, /^\/[a-z0-9]+\/index\.html$/,
      "landing is a root-relative path");
    assert.ok(course.attribution.trim().length > 0 && /\.\s*$/.test(course.attribution),
      "attribution is one finished sentence");
    for (const dir of course.labDirs) {
      assert.match(dir, /^\d{2}-[a-z0-9-]+$/, code + "/" + dir + ": numbered folder");
    }
  });

  test(code + ": the registry describes the site that is actually on disk", () => {
    const landing = path.join(SITE, course.landing.slice(1));
    assert.ok(fs.existsSync(landing), "landing page exists: " + course.landing);
    // A course may register zero labs before its first folder exists (git
    // tracks no empty directories), but nothing on disk may escape the list.
    const labsDir = path.join(SITE, course.code, "labs");
    const onDisk = fs.existsSync(labsDir)
      ? fs.readdirSync(labsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory()).map((e) => e.name).sort()
      : [];
    assert.deepEqual(onDisk, course.labDirs.slice().sort(),
      "labDirs lists exactly the lab folders under " + course.code + "/labs/");
    for (const dir of course.labDirs) {
      for (const f of ["index.html", "sim.js", "worksheet.js"]) {
        assert.ok(fs.existsSync(path.join(SITE, course.code, "labs", dir, f)),
          dir + "/" + f + " present");
      }
    }
  });

  test(code + ": attribution is one plain source sentence the banner can print", () => {
    assert.doesNotMatch(course.attribution, /<script|href=/, "no markup beyond emphasis");
    assert.match(course.attribution, /CC BY 4\.0/, "keeps the licence tag");
    assert.ok(course.licenceSource.includes(course.code === "ast110"
      ? "Astronomy 2e" : "College Physics"), "licence names the book");
  });
}

test("AST110 is the sixteen-lab set in manual order; PHY110 carries labs 1-14", () => {
  assert.deepEqual(M.labDirsFor("ast110"), [
    "01-measurement", "02-math", "03-celestial-sphere", "04-moon-phases",
    "05-moonrise-eclipses", "06-retrograde-mars", "07-lenses", "08-venus-phases",
    "09-pendulum", "10-spectra", "11-parallax", "12-hr-diagram", "13-variables",
    "14-galaxy-id", "15-hubbles-law", "16-time-lat-long"]);
  assert.deepEqual(M.labDirsFor("phy110"), [
    "01-units-and-measurement", "02-graphs-and-slope", "03-free-fall-g",
    "04-atwood-newton2", "05-vibrating-spring", "06-rotational-equilibrium",
    "07-archimedes", "08-specific-heat", "09-ohms-law", "10-series-parallel",
    "11-air-column-sound", "12-reflection-refraction", "13-converging-lens",
    "14-spectra"],
    "PHY110 labs 1-14 ship in course order; later issues append to this list");
});

test("no lab slug belongs to two courses (worksheet slugs stay unique)", () => {
  const seen = new Map();
  for (const course of COURSES) {
    for (const dir of course.labDirs) {
      assert.ok(!seen.has(dir), dir + ": claimed by " + seen.get(dir) + " and " + course.code);
      seen.set(dir, course.code);
    }
  }
});

test("the PHY110 attribution is marked PENDING COUNSEL in the file", () => {
  const phyLine = src.indexOf("adapted from OpenStax College Physics");
  assert.ok(phyLine > 0, "the PHY110 attribution line is there");
  assert.match(src.slice(Math.max(0, phyLine - 400), phyLine),
    /PENDING COUNSEL/, "the counsel gate is noted right on the line");
});

test("courseForPath / courseByCode / courseForSlug / currentCourse behave as documented", () => {
  const L = globalThis.LS;
  assert.equal(L.courseForPath("/ast110/labs/01-measurement/index.html").code, "ast110");
  assert.equal(L.courseForPath("/phy110/index.html").code, "phy110");
  assert.equal(L.courseForPath("/astro-lab-playground/phy110/labs/01-x/index.html").code,
    "phy110", "works under the GitHub Pages subpath too");
  assert.equal(L.courseForPath("/homework/homework-1/index.html"), null,
    "pages outside any course folder derive no course");
  assert.equal(L.courseForPath(""), null);
  assert.equal(L.courseForPath(undefined), null);
  assert.equal(L.courseByCode("ast110").code, "ast110");
  assert.equal(L.courseByCode("nope"), null);
  assert.equal(L.courseForSlug("01-measurement").code, "ast110");
  assert.equal(L.courseForSlug("01-fixture-force"), null);

  const savedLoc = Object.getOwnPropertyDescriptor(globalThis, "location");
  try {
    globalThis.location = { pathname: "/astro-lab-playground/phy110/index.html" };
    assert.equal(L.currentCourse().code, "phy110", "a course page names its own course");
    globalThis.location = { pathname: "/homework/homework-1/index.html" };
    assert.equal(L.currentCourse().code, "ast110",
      "unmoved pages fall back to the first entry (today's data home)");
    delete globalThis.location;
    assert.equal(L.currentCourse().code, "ast110", "no location at all still falls back");
  } finally {
    if (savedLoc) Object.defineProperty(globalThis, "location", savedLoc);
    else delete globalThis.location;
  }
});
