// Printable pre-lab / post-lab worksheet engine. Each lab page registers a
// small content descriptor; this module renders one worksheet per lab as CSV
// or as a real .xlsx the student fills in and hands in. Pure module: registry,
// text, bytes - no DOM, except the guarded download helper. By convention
// shared/store.js loads first (csvText reuses LS.store.csvText).
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var W = {};
  var registry = {};

  // Named error so callers (and tests) can tell worksheet problems from bugs.
  function WorksheetError(message) {
    this.name = "WorksheetError";
    this.message = message;
    var native = new Error(message);
    if (native.stack) this.stack = native.stack;
  }
  WorksheetError.prototype = Object.create(Error.prototype);
  WorksheetError.prototype.constructor = WorksheetError;
  W.WorksheetError = WorksheetError;

  function str(v, where) {
    if (typeof v !== "string" || v.trim() === "") {
      throw new WorksheetError(where + " must be a non-empty string");
    }
    return v.trim();
  }

  function strList(v, where, min, max) {
    if (!Array.isArray(v) || v.length < min || v.length > max) {
      throw new WorksheetError(where + " must be an array of " + min + ".." + max +
        " strings (got " + (Array.isArray(v) ? v.length : typeof v) + ")");
    }
    return v.map(function (s, i) { return str(s, where + "[" + i + "]"); });
  }

  function frozenCopy(v) {
    if (Array.isArray(v)) return Object.freeze(v.map(frozenCopy));
    if (v !== null && typeof v === "object") {
      var out = {};
      Object.keys(v).forEach(function (k) { out[k] = frozenCopy(v[k]); });
      return Object.freeze(out);
    }
    return v;
  }

  function validate(spec) {
    if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
      throw new WorksheetError("worksheet spec must be an object");
    }
    var slug = str(spec.slug, "slug");
    var labNumber = str(spec.labNumber, "labNumber");
    var title = str(spec.title, "title");
    var intro = str(spec.intro, "intro");

    var table = spec.table;
    if (!table || typeof table !== "object" || Array.isArray(table)) {
      throw new WorksheetError("table must be an object with header and blankRows");
    }
    var header = strList(table.header, "table.header", 2, 1000);
    var units = null;
    if (table.units !== undefined && table.units !== null) {
      units = table.units;
      if (!Array.isArray(units) || units.length !== header.length) {
        throw new WorksheetError("table.units, when present, must be an array of " +
          header.length + " strings (one per header column)");
      }
      units = units.map(function (u, i) { return str(u, "table.units[" + i + "]"); });
    }
    var blankRows = table.blankRows;
    if (typeof blankRows !== "number" || !isFinite(blankRows) ||
        Math.floor(blankRows) !== blankRows || blankRows < 8 || blankRows > 40) {
      throw new WorksheetError("table.blankRows must be an integer in 8..40 (got " +
        String(blankRows) + ")");
    }
    var prelab = strList(spec.prelab, "prelab", 2, 6);
    var postlab = strList(spec.postlab, "postlab", 2, 6);

    return frozenCopy({
      slug: slug,
      labNumber: labNumber,
      title: title,
      intro: intro,
      table: { header: header, units: units, blankRows: blankRows },
      prelab: prelab,
      postlab: postlab
    });
  }

  W.register = function (spec) {
    var clean = validate(spec);
    if (Object.prototype.hasOwnProperty.call(registry, clean.slug)) {
      throw new WorksheetError("worksheet slug already registered: " + clean.slug);
    }
    registry[clean.slug] = clean;
    return clean;
  };

  W.get = function (slug) {
    return registry[slug];
  };

  W.all = function () {
    var snapshot = {};
    Object.keys(registry).forEach(function (slug) { snapshot[slug] = registry[slug]; });
    return Object.freeze(snapshot);
  };

  function need(slug) {
    var spec = registry[slug];
    if (!spec) throw new WorksheetError("unknown worksheet slug: " + slug);
    return spec;
  }

  // One row matrix shared by the CSV and the xlsx renderers, so both files
  // carry exactly the same sheet: title block, blank data table, question lists.
  function buildRows(spec) {
    var cols = spec.table.header.length;
    var rows = [];
    rows.push(["Lab " + spec.labNumber + " - " + spec.title]);
    rows.push([spec.intro]);
    rows.push(["Name:", "", "Date:", ""]);
    rows.push(["Class/Section:", "", "Bench partners:", ""]);
    rows.push([]);
    rows.push(spec.table.header.slice());
    if (spec.table.units) rows.push(spec.table.units.slice());
    for (var i = 0; i < spec.table.blankRows; i++) {
      var blank = [];
      for (var c = 0; c < cols; c++) blank.push("");
      rows.push(blank);
    }
    rows.push([]);
    rows.push(["PRE-LAB QUESTIONS"]);
    spec.prelab.forEach(function (p, i) { rows.push([String(i + 1) + ".", p]); });
    rows.push([]);
    rows.push(["POST-LAB QUESTIONS"]);
    spec.postlab.forEach(function (p, i) { rows.push([String(i + 1) + ".", p]); });
    return rows;
  }

  W.rowsFor = function (slug) {
    return buildRows(need(slug));
  };

  W.csvText = function (slug) {
    return root.LS.store.csvText(null, buildRows(need(slug)));
  };

  // ---------- xlsx: minimal OOXML in a hand-built STORE zip ----------
  // Mirrors scripts/offline-kit.js (STORE method, fixed 1980 timestamp, pure
  // JS CRC-32) in Uint8Array/DataView form so it runs in browsers and Node.
  // Nothing here reads the clock or a random source: bytes depend only on the spec.
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(buf) {
    var c = 0xffffffff;
    for (var i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  var DOS_TIME = 0x0000;
  var DOS_DATE = 0x0021; // 1980-01-01, fixed so a spec always rebuilds identically
  var SIG_LOCAL = 0x04034b50;
  var SIG_CENTRAL = 0x02014b50;
  var SIG_EOCD = 0x06054b50;

  function utf8(s) {
    return new TextEncoder().encode(s);
  }

  function concat(chunks, total) {
    var out = new Uint8Array(total);
    var at = 0;
    for (var i = 0; i < chunks.length; i++) {
      out.set(chunks[i], at);
      at += chunks[i].length;
    }
    return out;
  }

  // entries: [{ name, data: Uint8Array }], taken in the order given.
  function buildZip(entries) {
    var localChunks = [];
    var centralChunks = [];
    var offset = 0;
    var localSize = 0;
    var centralSize = 0;
    var i;
    for (i = 0; i < entries.length; i++) {
      var nameBuf = utf8(entries[i].name);
      var data = entries[i].data;
      var crc = crc32(data);
      var size = data.length;

      var local = new Uint8Array(30);
      var lv = new DataView(local.buffer);
      lv.setUint32(0, SIG_LOCAL, true);
      lv.setUint16(4, 20, true);        // version needed to extract
      lv.setUint16(6, 0, true);         // flags
      lv.setUint16(8, 0, true);         // method 0 = store
      lv.setUint16(10, DOS_TIME, true);
      lv.setUint16(12, DOS_DATE, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);
      lv.setUint32(22, size, true);
      lv.setUint16(26, nameBuf.length, true);
      lv.setUint16(28, 0, true);
      localChunks.push(local, nameBuf, data);
      localSize += 30 + nameBuf.length + size;

      var central = new Uint8Array(46);
      var cv = new DataView(central.buffer);
      cv.setUint32(0, SIG_CENTRAL, true);
      cv.setUint16(4, 20, true);        // version made by
      cv.setUint16(6, 20, true);        // version needed
      cv.setUint16(8, 0, true);         // flags
      cv.setUint16(10, 0, true);        // method store
      cv.setUint16(12, DOS_TIME, true);
      cv.setUint16(14, DOS_DATE, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBuf.length, true);
      cv.setUint16(30, 0, true);        // extra length
      cv.setUint16(32, 0, true);        // comment length
      cv.setUint16(34, 0, true);        // disk start
      cv.setUint16(36, 0, true);        // internal attrs
      cv.setUint32(38, 0, true);        // external attrs
      cv.setUint32(42, offset, true);   // local header offset
      centralChunks.push(central, nameBuf);
      centralSize += 46 + nameBuf.length;

      offset += 30 + nameBuf.length + size;
    }
    var eocd = new Uint8Array(22);
    var ev = new DataView(eocd.buffer);
    ev.setUint32(0, SIG_EOCD, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, localSize, true);
    ev.setUint16(20, 0, true);
    return concat(localChunks.concat(centralChunks, [eocd]), localSize + centralSize + 22);
  }

  function xmlEsc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\r\n?/g, "\n");
  }

  function colName(i) { // 0 -> A, 25 -> Z, 26 -> AA
    var s = "";
    var n = i + 1;
    while (n > 0) {
      var m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  function sheetXml(rows) {
    var out = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
      "<sheetData>"];
    for (var r = 0; r < rows.length; r++) {
      out.push('<row r="' + (r + 1) + '">');
      var row = rows[r];
      for (var c = 0; c < row.length; c++) {
        var cell = row[c];
        if (cell === "") continue; // empty cells are simply absent; grids stay blank
        out.push('<c r="' + colName(c) + (r + 1) + '" t="inlineStr"><is>' +
          '<t xml:space="preserve">' + xmlEsc(cell) + "</t></is></c>");
      }
      out.push("</row>");
    }
    out.push("</sheetData></worksheet>");
    return out.join("");
  }

  var CONTENT_TYPES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    "</Types>";

  var ROOT_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    "</Relationships>";

  var WORKBOOK = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="Worksheet" sheetId="1" r:id="rId1"/></sheets></workbook>';

  var WORKBOOK_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    "</Relationships>";

  W.xlsxBytes = function (slug) {
    var spec = need(slug);
    var entries = [
      { name: "[Content_Types].xml", data: utf8(CONTENT_TYPES) },
      { name: "_rels/.rels", data: utf8(ROOT_RELS) },
      { name: "xl/workbook.xml", data: utf8(WORKBOOK) },
      { name: "xl/_rels/workbook.xml.rels", data: utf8(WORKBOOK_RELS) },
      { name: "xl/worksheets/sheet1.xml", data: utf8(sheetXml(buildRows(spec))) }
    ];
    return buildZip(entries);
  };

  W.fileName = function (slug, kind) {
    need(slug);
    if (kind !== "csv" && kind !== "xlsx") {
      throw new WorksheetError('kind must be "csv" or "xlsx"');
    }
    return "ast110-lab-" + slug + "-worksheet." + kind;
  };

  // Browser-only glue, guarded so the module stays require-able in bare Node.
  W.download = function (slug, kind) {
    if (kind !== "csv" && kind !== "xlsx") {
      throw new WorksheetError('kind must be "csv" or "xlsx"');
    }
    need(slug);
    if (typeof root.document === "undefined" || !root.document ||
        !root.document.createElement || !root.URL || !root.URL.createObjectURL) {
      return false;
    }
    var bytes = kind === "csv" ? W.csvText(slug) : W.xlsxBytes(slug);
    var type = kind === "csv"
      ? "text/csv;charset=utf-8"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    try {
      var blob = new Blob([bytes], { type: type });
      var url = root.URL.createObjectURL(blob);
      var a = root.document.createElement("a");
      a.href = url;
      a.download = W.fileName(slug, kind);
      root.document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        root.URL.revokeObjectURL(url);
        if (a.parentNode) a.parentNode.removeChild(a);
      }, 500);
      return true;
    } catch (e) {
      return false;
    }
  };

  root.LS.worksheet = W;
})(typeof globalThis !== "undefined" ? globalThis : window);
