// Student data tables: stored in localStorage on this device only (nothing is
// sent anywhere), exported as CSV or a printable table for a paper report.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var S = {};
  var PREFIX = "labSimsTable.";

  // BMC-27: lab folders now sit under a course directory, so new writes key as
  // labSimsTable.<course>.<slug>.<name>. The old bare-slug key is still read
  // (and cleared), so tables logged before the move keep loading.
  function courseCode() {
    try {
      var c = typeof root.LS.currentCourse === "function" ? root.LS.currentCourse() : null;
      return c && c.code ? c.code + "." : "";
    } catch (e) { return ""; }
  }
  function key(labId, name) { return PREFIX + courseCode() + labId + "." + name; }
  function legacyKey(labId, name) { return PREFIX + labId + "." + name; }

  S.save = function (labId, name, header, rows) {
    try {
      localStorage.setItem(key(labId, name),
        JSON.stringify({ header: header, rows: rows, savedAt: Date.now() }));
    } catch (e) { /* private mode or file:// quirks: sims still work, just ephemeral */ }
  };

  // load returns [{header, rows, savedAt}] for one named table (usually 0 or 1).
  S.load = function (labId, name) {
    try {
      var raw = localStorage.getItem(key(labId, name)) ||
        localStorage.getItem(legacyKey(labId, name));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  };

  S.clear = function (labId, name) {
    try {
      localStorage.removeItem(key(labId, name));
      localStorage.removeItem(legacyKey(labId, name));
    } catch (e) {}
  };

  // header: array of strings; rows: array of arrays. CSV follows RFC 4180.
  S.csvText = function (header, rows) {
    var esc = function (v) {
      v = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    var lines = [];
    if (header && header.length) lines.push(header.map(esc).join(","));
    rows.forEach(function (r) { lines.push(r.map(esc).join(",")); });
    return lines.join("\r\n");
  };

  // Try a real file download; fall back to filling a textarea the student copies.
  S.exportCSV = function (filename, header, rows, fallbackTextarea) {
    var text = S.csvText(header, rows);
    var ok = false;
    try {
      var blob = new Blob([text], { type: "text/csv;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
        document.body.removeChild(a);
      }, 500);
      ok = true;
    } catch (e) { ok = false; }
    if (fallbackTextarea) {
      fallbackTextarea.value = text;
      fallbackTextarea.style.display = "block";
      try { fallbackTextarea.select(); } catch (e) {}
    }
    return ok;
  };

  // Printable readout students can copy into a paper lab report.
  S.tableHTML = function (header, rows) {
    var h = header.map(function (c) { return "<th>" + c + "</th>"; }).join("");
    var b = rows.map(function (r) {
      return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>";
    }).join("");
    return "<table class='data-table'><thead><tr>" + h + "</tr></thead><tbody>" + b + "</tbody></table>";
  };

  root.LS.store = S;
})(typeof globalThis !== "undefined" ? globalThis : window);
