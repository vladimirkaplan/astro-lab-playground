// Regenerates the frozen BETA_CURVE block in site/labs/12-eclipse-board/eclipse.js
// from the vendored astronomy-engine: Moon geocentric ecliptic latitude, one
// sample per day at 12:00 UT, 2026-11-01 through 2027-09-30 inclusive.
// Run: node scripts/eclipse-events.js
// then run npm test (tests/eclipse.test.js pins the values) and commit both.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const ctx = { console };
ctx.self = ctx; ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "site/vendor/astronomy-engine/astronomy.browser.min.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(root, "site/shared/ephem.js"), "utf8"), ctx);

// All Date objects must be created INSIDE the realm: astronomy-engine checks
// instanceof against the realm's own Date, so host Dates throw.
vm.runInContext(`
self.__elat = function (t) {
  var A = self.Astronomy;
  var g = A.GeoVector(A.Body.Moon, new Date(t), true);
  var el = A.Ecliptic(g);
  return el.elat;
};
self.__curve = function (startMs, days, stepMs) {
  var out = [];
  for (var i = 0; i <= days; i++) {
    var v = Math.round(self.__elat(startMs + i * stepMs) * 100) / 100;
    out.push([i, v]);
  }
  return JSON.stringify(out);
};
`, ctx);

const DAY = 86400000;
const START = Date.UTC(2026, 10, 1, 12, 0, 0);     // 2026-11-01 12:00 UT
const END = Date.UTC(2027, 8, 30, 12, 0, 0);       // 2027-09-30 12:00 UT
const DAYS = Math.round((END - START) / DAY);      // inclusive day count

const arr = JSON.parse(vm.runInContext(`self.__curve(${START}, ${DAYS}, ${DAY})`, ctx));
const pairs = arr.map(p => "[" + p[0] + "," + p[1] + "]");
const lines = [];
for (let i = 0; i < pairs.length; i += 10) lines.push("  " + pairs.slice(i, i + 10).join(", ") + (i + 10 < pairs.length ? "," : ""));
console.log("// Moon ecliptic latitude (deg), samples at 12:00 UT every day,");
console.log("// index 0 = 2026-11-01T12:00:00Z, step 1 day, " + arr.length + " samples.");
console.log("E.BETA_CURVE_START = \"2026-11-01T12:00:00Z\";");
console.log("E.BETA_CURVE = [");
console.log(lines.join("\n"));
console.log("];");
console.error("samples:", arr.length);
