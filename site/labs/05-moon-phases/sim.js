// Lab 5 sim. Geometry sandbox: sunlit top view (north up, sun at the right,
// elongation grows counterclockwise = eastward) plus an Earth's-eye view whose
// perspective is computed honestly: look at the Moon, drop a perpendicular to
// the Earth-Sun line, put the Sun propped on that side of the disk.
// Real-sky mode evaluates the bundled ephemeris for a chosen date at 9 PM NY.
(function () {
  "use strict";
  var LS = window.LS, P = LS.moonPhase;
  var LAB = "05-moon-phases";
  var $ = function (id) { return document.getElementById(id); };

  var view = "geo";
  var elong = 135;
  var stage = $("stage"), sctx = stage.getContext("2d");
  var dpr = window.devicePixelRatio || 1;
  var STAGE_H = 400;
  var RAD = Math.PI / 180;

  function draw() {
    var w = stage.width / dpr, h = STAGE_H;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, w, h);
    sctx.fillStyle = "#0d1526";
    sctx.fillRect(0, 0, w, h);

    var cx = w * 0.44, cy = h * 0.48, R = Math.min(w, h) * 0.34;
    var d = elong * RAD;

    // sun at the right edge
    var sx = w - 34, sy = cy;
    var grad = sctx.createRadialGradient(sx, sy, 5, sx, sy, 60);
    grad.addColorStop(0, "#ffe9a3"); grad.addColorStop(1, "rgba(255,180,40,0)");
    sctx.fillStyle = grad;
    sctx.beginPath(); sctx.arc(sx, sy, 60, 0, 6.29); sctx.fill();
    sctx.fillStyle = "#ffd76e";
    sctx.beginPath(); sctx.arc(sx, sy, 20, 0, 6.29); sctx.fill();
    sctx.fillStyle = "#93a7cd"; sctx.font = "11px system-ui, sans-serif";
    sctx.textAlign = "center";
    sctx.fillText("Sun", sx, sy + 34);

    // parallel rays toward the left
    sctx.strokeStyle = "rgba(255,215,110,.5)"; sctx.lineWidth = 1.2;
    for (var k = -2; k <= 2; k++) {
      var yy = cy + k * R * 0.55;
      var x0 = sx - 40, x1 = cx - R - 26;
      if (Math.abs(k * R * 0.55) > R * 1.15) continue;
      sctx.beginPath(); sctx.moveTo(x0, yy); sctx.lineTo(x1, yy); sctx.stroke();
      arrowHead(sctx, x1, yy, Math.PI, "#ffd76e");
    }

    // orbit + elongation wedge
    sctx.strokeStyle = "#3c4f73";
    sctx.setLineDash([4, 5]);
    sctx.beginPath(); sctx.arc(cx, cy, R, 0, 6.29); sctx.stroke();
    sctx.setLineDash([]);
    sctx.strokeStyle = "rgba(255,215,110,.35)";
    sctx.beginPath(); sctx.moveTo(cx, cy); sctx.lineTo(cx + R * 1.25, cy); sctx.stroke();
    if (elong > 0.5) {
      sctx.strokeStyle = "#9fd0ff"; sctx.lineWidth = 2;
      sctx.beginPath();
      sctx.arc(cx, cy, 34, 0, -d, true);   // CCW on screen = canvas' anticlockwise
      sctx.stroke();
    }

    // Moon on the orbit: eastward (CCW on screen) from the Sun direction
    var mx = cx + R * Math.cos(-d), my = cy + R * Math.sin(-d);
    sctx.strokeStyle = "#8fa4c9"; sctx.setLineDash([3, 4]);
    sctx.beginPath(); sctx.moveTo(cx, cy); sctx.lineTo(mx, my); sctx.stroke();
    sctx.setLineDash([]);

    // top-view moon: lit half faces the Sun (clip disc, fill sunward rect)
    var lm = Math.atan2(sy - my, sx - mx);
    var r2 = 17;
    sctx.save();
    sctx.beginPath(); sctx.arc(mx, my, r2, 0, 6.29); sctx.clip();
    sctx.fillStyle = "#232c3d"; sctx.fillRect(mx - r2, my - r2, r2 * 2, r2 * 2);
    sctx.translate(mx, my); sctx.rotate(lm);
    sctx.fillStyle = "#f2e3b3"; sctx.fillRect(0, -r2, r2, r2 * 2);
    sctx.restore();
    sctx.strokeStyle = "#66799e"; sctx.lineWidth = 1.5;
    sctx.beginPath(); sctx.arc(mx, my, r2, 0, 6.29); sctx.stroke();
    sctx.fillStyle = "#a8bad9"; sctx.font = "10.5px system-ui, sans-serif";
    sctx.textAlign = "center";
    sctx.fillText("Moon (top view)", mx, my - 24);

    // Earth
    sctx.fillStyle = "#2e6db4";
    sctx.beginPath(); sctx.arc(cx, cy, 13, 0, 6.29); sctx.fill();
    sctx.fillStyle = "#9fd0ff"; sctx.font = "11px system-ui, sans-serif";
    sctx.fillText("Earth", cx, cy + 27);

    // ---- Earth's-eye view (inset) ----
    var ix = w - 110, iy = 62, ir = 38;
    sctx.fillStyle = "rgba(13,21,38,.92)";
    sctx.strokeStyle = "#3c4f73";
    roundRect(sctx, ix - ir - 14, iy - ir - 26, (ir + 14) * 2, (ir + 42) * 2, 10);
    sctx.fill(); sctx.stroke();
    sctx.fillStyle = "#93a7cd"; sctx.font = "10.5px system-ui, sans-serif";
    sctx.textAlign = "center";
    sctx.fillText("view from Earth (N sky)", ix, iy - ir - 12);

    // dark disk
    sctx.fillStyle = "#1b2434";
    sctx.beginPath(); sctx.arc(ix, iy, ir, 0, 6.29); sctx.fill();
    var f = P.illum(elong) / 100;
    if (f > 0.004) {
      // perpendicular foot: E + t'(M-E); t < 0.5 => Moon nearer the Sun side
      // => we look toward the Sun => lit limb on viewer's LEFT, else RIGHT
      // Northern-sky orientation rule (what a phone app prints): waxing
      // shapes light up on the RIGHT, waning on the LEFT.
      var sunOnLeft = !P.waxing(elong);
      var rx = ir * Math.abs(2 * f - 1);
      sctx.save();
      sctx.beginPath(); sctx.arc(ix, iy, ir, 0, 6.29); sctx.clip();
      sctx.fillStyle = "#f4e6b8";
      sctx.beginPath();
      // outer half-circle on the lit side
      sctx.moveTo(ix, iy - ir);
      sctx.arc(ix, iy, ir, -Math.PI / 2, Math.PI / 2, !sunOnLeft ? false : true);
      // terminator: half-ellipse bulging the correct way
      sctx.ellipse(ix, iy, rx, ir, 0, Math.PI / 2, -Math.PI / 2, f > 0.5 ? !sunOnLeft : sunOnLeft ? false : true);
      sctx.closePath();
      sctx.fill();
      sctx.restore();
      // sun prop
      sctx.fillStyle = "#ffd76e";
      var px2 = sunOnLeft ? ix - ir - 6 : ix + ir + 6;
      sctx.beginPath(); sctx.arc(px2, iy, 3.4, 0, 6.29); sctx.fill();
    }
    sctx.strokeStyle = "#66799e"; sctx.lineWidth = 1.5;
    sctx.beginPath(); sctx.arc(ix, iy, ir, 0, 6.29); sctx.stroke();

    // readouts
    var sch = P.schedule(elong);
    $("phaseRead").textContent = P.name(elong) + "  |  " + P.illum(elong).toFixed(1) + "% lit  |  " +
      (elong === 0 ? "lit side faces away" : elong === 180 ? "fully facing you" : (P.waxing(elong) ? "waxing" : "waning") + ", lit limb toward the Sun dot");
    $("schedRead").textContent = "rise ~" + P.hourLabel(sch.riseH) + "   highest ~" +
      P.hourLabel(sch.transitH) + "   set ~" + P.hourLabel(sch.setH) +
      "   (textbook hours; the Real sky tab gives exact ones)";
  }
  function arrowHead(ctx, x, y, ang, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-7, -3.5); ctx.lineTo(-7, 3.5);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---------- geometry controls ----------
  $("elongRange").addEventListener("input", function (e) {
    elong = parseInt(e.target.value, 10);
    $("elongRead").textContent = String(elong);
    draw();
  });
  Array.prototype.forEach.call(document.querySelectorAll(".preset"), function (b) {
    b.addEventListener("click", function () {
      elong = parseInt(b.getAttribute("data-e"), 10);
      $("elongRange").value = String(elong);
      $("elongRead").textContent = String(elong);
      draw();
    });
  });

  // ---------- real-sky mode ----------
  function nyNoon(isoDate) {   // 'YYYY-MM-DD' meaning 9 PM New York, as UTC Date
    var p = isoDate.split("-").map(Number);
    var lm = Date.UTC(p[0], p[1] - 1, p[2], 21, 0, 0);           // local wall time as ms
    var u = lm + 5 * 3600000;                                    // EST first guess
    var off = LS.ephem.nyOffsetHours(new Date(u));               // -4 (EDT) or -5
    return new Date(lm - off * 3600000);
  }
  function report() {
    var iso = $("dateIn").value || "2026-11-24";
    var at = nyNoon(iso);
    var mp = LS.ephem.moon(at);
    var up = LS.ephem.moonrise("newyork", new Date(+at - 18 * 3600000));
    var dn = LS.ephem.moonset("newyork", new Date(+at - 18 * 3600000));
    $("rPhase").textContent = mp.phaseName + ", " + mp.illumPct.toFixed(0) + "% lit";
    $("rEvents").textContent =
      "moonrise: " + (up ? LS.ephem.fmtNY(up) : "none that period") +
      "   moonset: " + (dn ? LS.ephem.fmtNY(dn) : "none") +
      "   moon age ~" + (mp.phaseAngle / 360 * 29.53).toFixed(1) + " days";
  }
  function eventsTable() {
    var rows = P.EVENTS.map(function (ev, i) {
      var d = new Date(ev.iso);
      var iso = d.getUTCFullYear() + "-" +
        String(d.getUTCMonth() + 1).padStart(2, "0") + "-" +
        String(d.getUTCDate()).padStart(2, "0");
      return "<tr data-iso='" + iso + "' style='cursor:pointer'>" +
        "<td><strong>" + ev.name + "</strong></td><td>" + ev.ny + "</td>" +
        "<td>" + ev.rise + "</td><td>" + ev.set + "</td></tr>";
    }).join("");
    $("eventsTable").innerHTML = LS.store.tableHTML(
      ["phase", "moment (NY)", "moonrise near it", "moonset near it"],
      P.EVENTS.map(function (ev) {
        return [ev.name, ev.ny, ev.rise, ev.set];
      }));
    var body = $("eventsTable").querySelector("tbody");
    if (body) {
      Array.prototype.forEach.call(body.querySelectorAll("tr"), function (tr, i) {
        tr.addEventListener("click", function () {
          var ev = P.EVENTS[i];
          var nyd = LS.ephem.utcToNYParts(new Date(ev.iso));
          $("dateIn").value = nyd.y + "-" + String(nyd.mo).padStart(2, "0") + "-" +
            String(nyd.d).padStart(2, "0");
          report();
        });
      });
    }
  }
  function nudge(days) {
    var el = $("dateIn");
    var d = new Date((el.value || "2026-11-24") + "T12:00:00Z");
    d = new Date(+d + days * 86400000);
    el.value = d.toISOString().slice(0, 10);
    report();
  }
  $("dPrev").addEventListener("click", function () { nudge(-1); });
  $("dNext").addEventListener("click", function () { nudge(1); });
  $("dateIn").addEventListener("change", report);

  // ---------- view switching ----------
  function showView(v) {
    view = v;
    $("geoView").hidden = v !== "geo";
    $("realView").hidden = v !== "real";
    $("modeGeo").className = "action" + (v !== "geo" ? " ghost" : "");
    $("modeReal").className = "action" + (v !== "real" ? " ghost" : "");
    resizeStage();
    if (v === "real") { report(); }
  }
  $("modeGeo").addEventListener("click", function () { showView("geo"); });
  $("modeReal").addEventListener("click", function () { showView("real"); });

  // ---------- boot ----------
  function resizeStage() {
    stage.width = Math.round(Math.max(300, stage.clientWidth || 480) * dpr);
    stage.height = Math.round(STAGE_H * dpr);
    draw();
  }
  window.addEventListener("resize", resizeStage);
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.check.init(LAB);
  eventsTable();
  resizeStage();
})();
