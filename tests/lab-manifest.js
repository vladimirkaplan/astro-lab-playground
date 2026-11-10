"use strict";
// BMC-27: ONE source for "which lab folders does each course have".
//
// Before the multi-course move, the same 16-dir LAB_DIRS array was copy-pasted
// into five test files. This module reads the same registry the site itself
// loads (site/shared/courses.js), so a lab folder, a landing card, and a test
// list can never drift apart without a test failing here first.
//
// Plain Node module: requires the registry the same way a browser loads it.

const path = require("path");

const ROOT = path.join(__dirname, "..");
if (!globalThis.LS || !globalThis.LS.courses) {
  require(path.join(ROOT, "site", "shared", "courses.js"));
}

const COURSES = globalThis.LS.courses;

function byCode(code) {
  const c = COURSES.find((x) => x.code === code);
  if (!c) throw new Error("course not in registry: " + code);
  return c;
}

module.exports = {
  ROOT,
  COURSES,
  codes: COURSES.map((c) => c.code),
  byCode,
  hubFile: path.join(ROOT, "site", "index.html"),
  siteFile: (...seg) => path.join(ROOT, "site", ...seg),
  labDirsFor: (code) => byCode(code).labDirs.slice(),
  landingFile: (code) => path.join(ROOT, "site", code, "index.html"),
  labDir: (code, dir) => path.join(ROOT, "site", code, "labs", dir),
  labPage: (code, dir) => path.join(ROOT, "site", code, "labs", dir, "index.html"),
  // URL path (site-root relative) for a lab page, e.g. /ast110/labs/01-measurement.
  labUrl: (code, dir) => "/" + code + "/labs/" + dir + "/",
};
