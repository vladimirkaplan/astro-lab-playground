"use strict";
// BMC-20 / GitHub #15 part 1 - printable worksheet engine + per-lab descriptors.
//
// Pinned guarantees:
//   (a) exactly the 16 lab pages register a descriptor, from their real files,
//       and every descriptor passes the spec validation the engine enforces;
//   (b) registry hygiene: re-register throws, get/all hand out frozen data,
//       every bad spec shape is rejected by name, unknown keys are ignored;
//   (c) csvText renders title block, blank data table, and numbered question
//       sections in order, with RFC 4180 quoting for commas/quotes/newlines;
//   (d) xlsxBytes is a real, deterministic, STORE-only .xlsx whose unzipped
//       sheet carries the same content as the CSV;
//   (e) download() is a silent no-op outside a browser.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

require("../site/shared/store.js");
require("../site/shared/worksheet.js");

const REAL = globalThis.LS.worksheet;
const SHARED_PATH = require.resolve("../site/shared/worksheet.js");

const LABS = [
  "01-measurement", "02-math", "03-celestial-sphere", "04-moon-phases",
  "05-moonrise-eclipses", "06-retrograde-mars", "07-lenses", "08-venus-phases",
  "09-pendulum", "10-spectra", "11-parallax", "12-hr-diagram", "13-variables",
  "14-galaxy-id", "15-hubbles-law", "16-time-lat-long",
];

for (const slug of LABS) require("../site/labs/" + slug + "/worksheet.js");

// Rerun the engine module for an empty private registry, so fixture specs
// never touch the 16 real registrations.
function withFreshEngine(fn) {
  const prev = globalThis.LS.worksheet;
  delete require.cache[SHARED_PATH];
  require(SHARED_PATH);
  try {
    return fn(globalThis.LS.worksheet);
  } finally {
    globalThis.LS.worksheet = prev;
  }
}

function fixtureSpec(over) {
  return Object.assign({
    slug: "fixture-lab",
    labNumber: "99",
    title: "Fixture lab",
    intro: "Fixture intro line.",
    table: { header: ["A col", "B col", "C col"], blankRows: 9 },
    prelab: ["first pre?", "second pre?"],
    postlab: ["first post?", "second post?"],
  }, over);
}

const tmpDirs = [];
function tmpFile(name, data) {
  if (!tmpDirs.length) tmpDirs.push(fs.mkdtempSync(path.join(os.tmpdir(), "worksheet-test-")));
  const dir = tmpDirs[0];
  const file = path.join(dir, name);
  fs.writeFileSync(file, Buffer.from(data));
  return file;
}

// ---------- (a) registry completeness over the real lab files ----------
test("exactly the 16 lab slugs are registered, each from its own worksheet.js", () => {
  const slugs = Object.keys(REAL.all()).sort();
  assert.deepEqual(slugs, LABS.slice().sort());
  for (const slug of LABS) {
    const file = path.join(__dirname, "..", "site", "labs", slug, "worksheet.js");
    assert.ok(fs.existsSync(file), "descriptor file exists: " + slug + "/worksheet.js");
    const spec = REAL.get(slug);
    assert.equal(spec.slug, slug, "spec slug equals its folder name");
    assert.match(spec.labNumber, /^[0-9]{1,2}(-[0-9]{1,2})?$/, "labNumber like 6 or 16-17");
    assert.ok(spec.title.trim().length > 0 && spec.intro.trim().length > 0);
  }
});

test("every real descriptor's table header has 2-8 non-empty trimmed labels", () => {
  for (const spec of Object.values(REAL.all())) {
    const h = spec.table.header;
    assert.ok(h.length >= 2 && h.length <= 8, spec.slug + ": " + h.length + " columns");
    for (const label of h) {
      assert.equal(typeof label, "string");
      assert.ok(label.trim().length > 0 && label === label.trim(), "clean label: " + JSON.stringify(label));
    }
  }
});

test("every real descriptor's units array, if present, is parallel to the header", () => {
  for (const spec of Object.values(REAL.all())) {
    if (spec.table.units === null) continue;
    assert.equal(spec.table.units.length, spec.table.header.length, spec.slug);
    for (const u of spec.table.units) assert.ok(typeof u === "string" && u.trim().length > 0);
  }
});

test("every real descriptor's blankRows is an integer within 8..40", () => {
  for (const spec of Object.values(REAL.all())) {
    const n = spec.table.blankRows;
    assert.ok(Number.isInteger(n) && n >= 8 && n <= 40, spec.slug + ": blankRows " + n);
  }
});

test("every real descriptor has 2..6 non-empty prelab and postlab prompts", () => {
  for (const spec of Object.values(REAL.all())) {
    for (const [name, list] of [["prelab", spec.prelab], ["postlab", spec.postlab]]) {
      assert.ok(list.length >= 2 && list.length <= 6, spec.slug + "." + name);
      for (const p of list) {
        assert.ok(typeof p === "string" && p.trim().length > 0 && p === p.trim());
      }
    }
  }
});

test("all 16 real slugs render csvText with header, blank rows, and both sections", () => {
  for (const spec of Object.values(REAL.all())) {
    const text = REAL.csvText(spec.slug);
    assert.ok(text.includes(spec.table.header.map((c) => /[",\n]/.test(c) ? '"' + c + '"' : c).join(",")),
      spec.slug + ": header row present");
    assert.ok(text.includes("PRE-LAB QUESTIONS") && text.includes("POST-LAB QUESTIONS"), spec.slug);
    assert.ok(text.includes("Lab " + spec.labNumber + " - " + spec.title), spec.slug + ": title row");
  }
});

// ---------- (b) registry hygiene and validation ----------
test("registered specs are deep-frozen; strict-mode mutation throws, data unchanged", () => {
  const spec = REAL.get("06-retrograde-mars");
  assert.ok(Object.isFrozen(spec));
  assert.ok(Object.isFrozen(spec.table) && Object.isFrozen(spec.table.header));
  assert.ok(Object.isFrozen(spec.prelab));
  const before = spec.title;
  assert.throws(() => { spec.title = "tampered"; }, TypeError);
  assert.throws(() => { spec.table.header[0] = "tampered"; }, TypeError);
  assert.equal(spec.title, before, "title survived the attempt");
});

test("all() is a frozen snapshot; get() of an unknown slug is undefined", () => {
  const snap = REAL.all();
  assert.ok(Object.isFrozen(snap));
  assert.throws(() => { snap["sneaky"] = 1; }, TypeError);
  assert.equal(snap["sneaky"], undefined, "attempt left the snapshot untouched");
  assert.equal(REAL.get("not-a-lab"), undefined);
  assert.throws(() => REAL.csvText("not-a-lab"), { name: "WorksheetError" });
  assert.throws(() => REAL.xlsxBytes("not-a-lab"), { name: "WorksheetError" });
});

test("registering the same slug twice throws WorksheetError", () => {
  withFreshEngine((ws) => {
    ws.register(fixtureSpec());
    assert.throws(() => ws.register(fixtureSpec()), { name: "WorksheetError", message: /already registered/ });
  });
});

test("register validates shapes by name, ignores unknown keys, trims strings", () => {
  withFreshEngine((ws) => {
    const bad = [
      [null, "spec must be an object"],
      ["slug me", "slug must be a non-empty string"],
      [fixtureSpec({ slug: "  " }), "blank slug"],
      [fixtureSpec({ labNumber: "" }), "blank labNumber"],
      [fixtureSpec({ title: 42 }), "numeric title"],
      [fixtureSpec({ table: undefined }), "missing table"],
      [fixtureSpec({ table: { header: ["only one"], blankRows: 10 } }), "one-column header"],
      [fixtureSpec({ table: { header: ["a", ""], blankRows: 10 } }), "empty header label"],
      [fixtureSpec({ table: { header: ["a", "b"], units: ["cm"], blankRows: 10 } }), "short units"],
      [fixtureSpec({ table: { header: ["a", "b"], blankRows: 7 } }), "blankRows too small"],
      [fixtureSpec({ table: { header: ["a", "b"], blankRows: 41 } }), "blankRows too big"],
      [fixtureSpec({ table: { header: ["a", "b"], blankRows: 9.5 } }), "non-integer blankRows"],
      [fixtureSpec({ prelab: ["only one?"] }), "one prelab"],
      [fixtureSpec({ postlab: ["1?", "2?", "3?", "4?", "5?", "6?", "7?"] }), "seven postlab"],
      [fixtureSpec({ prelab: ["ok?", "   "] }), "blank prompt"],
    ];
    for (const [spec, label] of bad) {
      assert.throws(() => ws.register(spec), { name: "WorksheetError" }, "must reject: " + label);
    }
    const good = ws.register(fixtureSpec({
      slug: "  spaced-slug  ",
      labNumber: "16-17",
      table: { header: ["h1 ", "h2"], units: [" units1 ", "units2"], blankRows: 40 },
      homeworkKey: "unknown keys must be ignored",
    }));
    assert.equal(good.slug, "spaced-slug");
    assert.deepEqual(good.table.header, ["h1", "h2"]);
    assert.deepEqual(good.table.units, ["units1", "units2"]);
    assert.equal(Object.values(REAL.all()).length, 16, "the shared registry never saw the fixtures");
  });
});

// ---------- (c) CSV layout and RFC 4180 quoting ----------
test("csvText renders title block, blank data table, then numbered PRE and POST sections", () => {
  withFreshEngine((ws) => {
    ws.register(fixtureSpec({
      table: { header: ["A col", "B col", "C col"], units: ["u1", "u2", "u3"], blankRows: 9 },
    }));
    const text = ws.csvText("fixture-lab");
    const at = (s) => {
      const i = text.indexOf(s);
      assert.ok(i >= 0, "missing: " + s);
      return i;
    };
    const title = at("Lab 99 - Fixture lab");
    const intro = at("Fixture intro line.");
    const nameRow = at("Name:,,Date:,");
    const partners = at("Class/Section:,,Bench partners:,");
    const header = at("A col,B col,C col");
    const units = at("u1,u2,u3");
    const pre = at("PRE-LAB QUESTIONS");
    const p1 = at('1.,first pre?');
    const post = at("POST-LAB QUESTIONS");
    const q1 = at("1.,first post?");
    assert.ok(title < intro && intro < nameRow && nameRow < partners, "title block order");
    assert.ok(partners < header && header < units, "data table order");
    assert.ok(units < pre && pre < p1 && p1 < post && post < q1, "sections order");
    const blanks = (text.match(/^,,\r?$/gm) || []).length;
    assert.equal(blanks, 9, "nine empty data rows");
    assert.ok(text.includes('2.,second post?'), "numbered rows");
  });
});

test("csvText quotes commas, doubled quotes, and embedded newlines per RFC 4180", () => {
  withFreshEngine((ws) => {
    ws.register(fixtureSpec({
      prelab: ['plain, with comma', 'contains "quotes" inside', "line one\nline two"],
      postlab: ["still ok?", "yes, fine, all, commas"],
    }));
    const text = ws.csvText("fixture-lab");
    assert.ok(text.includes('1.,"plain, with comma"'), "comma cell quoted");
    assert.ok(text.includes('2.,"contains ""quotes"" inside"'), "quotes doubled inside quotes");
    assert.ok(text.includes('2.,"yes, fine, all, commas"'), "later commas still quoted");
    assert.ok(text.includes('1.,still ok?'), "plain cells stay unquoted");
    assert.ok(text.includes('"line one\nline two"'), "newline cell quoted, raw newline inside");
    assert.ok(text.includes("POST-LAB QUESTIONS"), "sections still present");
  });
});

// ---------- (d) xlsx ----------
test("xlsxBytes is deterministic, starts PK, and the module never reads clock or random", () => {
  withFreshEngine((ws) => {
    ws.register(fixtureSpec());
    const a = ws.xlsxBytes("fixture-lab");
    const b = ws.xlsxBytes("fixture-lab");
    assert.ok(a instanceof Uint8Array, "returns Uint8Array");
    assert.equal(a.length, b.length);
    assert.ok(a.every((v, i) => v === b[i]), "two calls are byte-identical");
    assert.deepEqual(Array.from(a.slice(0, 4)), [0x50, 0x4b, 0x03, 0x04], "local file header signature");
    const src = fs.readFileSync(SHARED_PATH, "utf8");
    assert.doesNotMatch(src, /Date\.now|Math\.random|new Date\(/, "no clock or random sources in the engine");
  });
});

test("unzip -t passes on the xlsx and the listing has every OOXML part", () => {
  withFreshEngine((ws) => {
    ws.register(fixtureSpec());
    const file = tmpFile("fixture.xlsx", ws.xlsxBytes("fixture-lab"));
    const t = spawnSync("unzip", ["-t", file], { encoding: "utf8" });
    assert.equal(t.status, 0, "unzip -t must pass: " + t.stdout + t.stderr);
    assert.match(t.stdout, /No errors detected/);
    for (const part of ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels", "xl/worksheets/sheet1.xml"]) {
      assert.ok(t.stdout.includes(part), "entry present: " + part);
    }
  });
});

test("unzipped sheet1.xml carries headers, prompts, and the same row count as the CSV", () => {
  withFreshEngine((ws) => {
    ws.register(fixtureSpec({
      table: { header: ["Star & co", "Temp <K>", "A", "B"], blankRows: 8 },
      prelab: ["why & where?", "which <one>?"],
      postlab: ["sum up?", "next time?"],
    }));
    const file = tmpFile("fixture-content.xlsx", ws.xlsxBytes("fixture-lab"));
    const r = spawnSync("unzip", ["-p", file, "xl/worksheets/sheet1.xml"], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    const xml = r.stdout;
    for (const needle of ["Star &amp; co", "Temp &lt;K&gt;", "PRE-LAB QUESTIONS", "POST-LAB QUESTIONS",
      "why &amp; where?", "which &lt;one&gt;?", "Lab 99 - Fixture lab",
      "Name:", "Bench partners:", "t=\"inlineStr\""]) {
      assert.ok(xml.includes(needle), "sheet must contain " + needle);
    }
    const rows = ws.rowsFor("fixture-lab");
    const rowTags = (xml.match(/<row /g) || []).length;
    assert.equal(rowTags, rows.length, "every CSV row exists as a sheet row");
    const csv = ws.csvText("fixture-lab");
    for (const cell of ["Star & co", "why & where?", "sum up?", "next time?"]) {
      assert.ok(csv.includes(cell), "csv shares the sheet's words: " + cell);
    }
  });
});

test("a real lab renders a valid deterministic xlsx end to end", () => {
  const a = REAL.xlsxBytes("14-galaxy-id");
  const b = REAL.xlsxBytes("14-galaxy-id");
  assert.ok(a.every((v, i) => v === b[i]), "real-lab bytes are deterministic");
  const file = tmpFile("galaxy.xlsx", a);
  const t = spawnSync("unzip", ["-t", file], { encoding: "utf8" });
  assert.equal(t.status, 0, t.stdout + t.stderr);
  const r = spawnSync("unzip", ["-p", file, "xl/worksheets/sheet1.xml"], { encoding: "utf8" });
  for (const label of REAL.get("14-galaxy-id").table.header) {
    assert.ok(r.stdout.includes(label), "header label in sheet: " + label);
  }
  for (const p of REAL.get("14-galaxy-id").postlab) {
    assert.ok(r.stdout.includes(p.replace(/&/g, "&amp;").replace(/</g, "&lt;")), "prompt in sheet");
  }
});

// ---------- (e) download guard ----------
test("download() is a silent false-returning no-op in bare Node, never throws", () => {
  withFreshEngine((ws) => {
    ws.register(fixtureSpec());
    assert.equal(globalThis.document, undefined, "test must run without a document");
    assert.equal(ws.download("fixture-lab", "csv"), false);
    assert.equal(ws.download("fixture-lab", "xlsx"), false);
    assert.throws(() => ws.download("fixture-lab", "pdf"), { name: "WorksheetError" });
    assert.throws(() => ws.download("no-such-lab", "csv"), { name: "WorksheetError" });
    assert.equal(ws.fileName("fixture-lab", "xlsx"), "ast110-lab-fixture-lab-worksheet.xlsx");
    assert.equal(REAL.fileName("06-retrograde-mars", "csv"), "ast110-lab-06-retrograde-mars-worksheet.csv");
  });
});

test("descriptor files are pure registration (no DOM, no network references)", () => {
  for (const slug of LABS) {
    const src = fs.readFileSync(path.join(__dirname, "..", "site", "labs", slug, "worksheet.js"), "utf8");
    assert.doesNotMatch(src, /document\.|window\.[a-z]|fetch\(|XMLHttpRequest|https?:/, slug);
    assert.match(src, /LS\.worksheet\.register\(/, slug + " registers");
  }
});

test("engine source is dependency-free and names no live origin URLs", () => {
  const src = fs.readFileSync(SHARED_PATH, "utf8");
  assert.doesNotMatch(src, /vladimirkaplan\.github\.io/);
  const urls = src.match(/https?:\/\/[^"'<> )]+/g) || [];
  for (const u of urls) {
    assert.match(u, /^https?:\/\/schemas\.openxmlformats\.org\//,
      "only inert XML namespace names, never fetched: " + u);
  }
  assert.doesNotMatch(src, /fetch\(|XMLHttpRequest|require\(|import\s/, "no network, no dependencies");
});

test("cleanup: remove the tmp xlsx scratch files", () => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
});
