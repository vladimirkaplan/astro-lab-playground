// Regenerates the frozen EVENTS block in site/labs/04-moon-phases/moon.js
// from the vendored astronomy-engine. Run: node scripts/moon-events.js [n]
// then run npm test (tests/moon.test.js pins the values) and commit both.
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
self.__signed = function (t, target) {
  var a = ((self.LS.ephem.moon(t).phaseAngle % 360) + 360) % 360;
  var d = ((a - target) % 360 + 360) % 360;
  if (d > 180) d -= 360;
  return d;
};
self.__scan = function (fromMs, target) {
  var a = fromMs;
  if (self.__signed(new Date(a), target) >= 0) {
    var ok = false;
    for (var x = a; x < a + 31 * 86400000; x += 1800000) {
      if (self.__signed(new Date(x), target) < 0) { a = x - 1800000; ok = true; break; }
    }
    if (!ok) return null;
  }
  var lo = a, hi = a + 31 * 86400000, pv = self.__signed(new Date(lo), target);
  for (var x2 = lo; x2 < hi; x2 += 1800000) {
    var cv = self.__signed(new Date(x2), target);
    if (pv < 0 && cv >= 0) { lo = x2 - 1800000; hi = x2; break; }
    pv = cv;
  }
  if (!(hi > lo)) return null;
  for (var k = 0; k < 40; k++) {
    var m = (lo + hi) / 2;
    if (self.__signed(new Date(m), target) < 0) lo = m; else hi = m;
  }
  return new Date(Math.round((lo + hi) / 2 / 60000) * 60000);
};
self.__Round = function (startMs, n) {
  var ME = self.LS.ephem, out = [], cursor = startMs;
  var seq = [[90, "first quarter"], [180, "full moon"], [270, "last quarter"], [0, "new moon"]];
  for (var i = 0; i < n; i++) {
    var pr = seq[i % 4];
    var w = self.__scan(cursor, pr[0]);
    if (!w) break;
    cursor = +w + 3600000;
    var from = new Date(+w - 16 * 3600000);
    var up = ME.moonrise("newyork", from);
    var dn = ME.moonset("newyork", from);
    var iso = w.toISOString();
    out.push({
      iso: iso.slice(0, 16) + "Z",
      ny: ME.nyDateLabel(w),
      name: pr[1],
      rise: up ? ME.nyDateLabel(up) : "-",
      set: dn ? ME.nyDateLabel(dn) : "-"
    });
  }
  return JSON.stringify(out);
};
`, ctx);

const N = parseInt(process.argv[2] || "8", 10);
const rows = JSON.parse(vm.runInContext(`self.__Round(${Date.now()}, ${N})`, ctx));

const pad = (s, n) => s + " ".repeat(Math.max(1, n - s.length));
const block = rows.map(r =>
  `    { iso: "${r.iso}", ny: "${r.ny}",${" ".repeat(Math.max(1, 17 - r.ny.length))}name: "${r.name}",${" ".repeat(Math.max(1, 18 - r.name.length))}rise: "${r.rise}",${" ".repeat(Math.max(1, 20 - r.rise.length))}set: "${r.set}" }`
).join(",\n");
console.log("M.EVENTS = [\n" + block + "\n  ];");
console.error("rows:", rows.length);
