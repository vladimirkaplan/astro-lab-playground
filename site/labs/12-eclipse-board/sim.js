// Lab 12 sim: the eclipse board. Geocentric top view in the Sun-locked frame:
// the Sun sits fixed at the right, its light rays arrive as parallel arrows.
// The calendar rim carries every new moon and the five NASA eclipse dates.
// The Moon orbit is tilted 5.1 deg, so its crossing line with the sky road
// (the two nodes) is drawn across the board; where a node line swings around
// toward the Sun, the Sun sits inside that node's +-16-deg season wedge and an
// eclipse is possible at the new or full moon. Node positions are derived from
// the baked NASA EVENTS by eclipse.js; they are not hidden parameters.
// The side-view box shows the same month from the side: heights are cut about
// 6x so the cones are visible; verdicts there are only a preview - the final
// word on eclipse types always comes from the baked NASA facts, never from
// the drawing.
(function () {
  "use strict";
  var LS = window.LS, E = LS.eclipse;
  var LAB = "12-eclipse-board";
  var $ = function (id) { return document.getElementById(id); };
  var RAD = Math.PI / 180;
  var DAY = 86400000;

  var START_MS = Date.UTC(2026, 10, 5, 12);      // slider day 0 (2026-11-05 12:00 UT)
  var LAST_DAY = 329;                            // slider day 329 (2027-09-30)

  var mode = "ideal";
  var stage = $("stage"), sctx = stage.getContext("2d");
  var dpr = window.devicePixelRatio || 1;
  var STAGE_H = 430;

  function dayMs() { return START_MS + parseInt($("dayRange").value, 10) * DAY; }
  function isoOf(ms) { return new Date(ms).toISOString().slice(0, 10); }

  // Deterministic readout wiggle for Fun Mode (small instruments read small).
  function noisy(b, ms) {
    if (mode !== "fun") return b;
    var r = LS.units.mulberry32(Math.floor(ms / 1000) ^ 0x5EED)();
    return Math.round((b + (r - 0.5) * 0.1) * 100) / 100;
  }

  function boardPoint(cx, cy, rr, angDeg) {
    var a = -angDeg * RAD;             // east = counterclockwise on screen
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  }

  function draw() {
    var w = stage.width / dpr, h = STAGE_H;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, w, h);
    sctx.fillStyle = "#0d1526";
    sctx.fillRect(0, 0, w, h);

    var ms = dayMs();
    var today = new Date(ms);
    var cx = w * 0.44, cy = 165, R = 138;
    var sunLon = E.sunLonApprox(ms);
    var elong = E.elongApprox(ms);
    var beta = E.betaAt(ms);
    var nodes = E.nodeLongitudes();

    // ---- Sun fixed at the right + parallel rays ----
    var sx = w - 40, sy = cy;
    var grad = sctx.createRadialGradient(sx, sy, 4, sx, sy, 52);
    grad.addColorStop(0, "#ffe9a3"); grad.addColorStop(1, "rgba(255,180,40,0)");
    sctx.fillStyle = grad;
    sctx.beginPath(); sctx.arc(sx, sy, 52, 0, 6.29); sctx.fill();
    sctx.fillStyle = "#ffd76e";
    sctx.beginPath(); sctx.arc(sx, sy, 17, 0, 6.29); sctx.fill();
    sctx.strokeStyle = "rgba(255,215,110,.45)"; sctx.lineWidth = 1.1;
    for (var k = -3; k <= 3; k++) {
      var yy = cy + k * R * 0.4;
      if (Math.abs(k) > 0 && Math.abs(k * R * 0.4) > R * 1.02) continue;
      sctx.beginPath(); sctx.moveTo(sx - 32, yy); sctx.lineTo(cx + R + 14, yy); sctx.stroke();
    }

    // ---- board circle + rotating calendar rim ----
    sctx.strokeStyle = "#3c4f73"; sctx.lineWidth = 1.4;
    sctx.beginPath(); sctx.arc(cx, cy, R, 0, 6.29); sctx.stroke();

    // 3-day calendar ticks: each tick sits at the Sun-locked angle its date
    // held, so the whole calendar wheel crawls about 1 sign per month.
    var t0 = Date.UTC(2026, 10, 1);
    sctx.strokeStyle = "#2c3c5c"; sctx.lineWidth = 1;
    for (var d = 0; d <= 333; d += 3) {
      var a = E.elongApprox(t0 + d * DAY) - elong;
      var p1 = boardPoint(cx, cy, R, a), p2 = boardPoint(cx, cy, R + (d % 30 === 0 ? 7 : 3.5), a);
      sctx.beginPath(); sctx.moveTo(p1[0], p1[1]); sctx.lineTo(p2[0], p2[1]); sctx.stroke();
    }
    // new-moon beads (approx calendar from the baked NM0 anchor)
    sctx.fillStyle = "#c8d4ef";
    for (var i = 0; i < 12; i++) {
      var nm = Date.parse(E.NM0_ISO) + i * E.SYNODIC * DAY;
      if (nm < t0 || nm > t0 + 333 * DAY) continue;
      var an = E.elongApprox(nm) - elong;
      var pn = boardPoint(cx, cy, R, an);
      sctx.beginPath(); sctx.arc(pn[0], pn[1], 2.2, 0, 6.29); sctx.fill();
    }
    // Five NASA eclipse dots on the rim. The wheel repeats every synodic month,
    // so same-phase pairs (Feb/Aug) sit at nearly the same angle; per-angle date
    // labels are structurally unreliable there, so the dates live in the table
    // and preset buttons instead. Colors: gold = solar, coral = lunar.
    var evDotCol = { solar: "#ffd76e", lunar: "#ff9d7a" };
    E.EVENTS.forEach(function (ev) {
      var pe = boardPoint(cx, cy, R, E.elongApprox(ev.t) - elong);
      sctx.fillStyle = evDotCol[ev.type];
      sctx.beginPath(); sctx.arc(pe[0], pe[1], 4, 0, 6.29); sctx.fill();
    });

    // ---- season wedges (baked NASA node geometry) ----
    nodes.forEach(function (nd, idx) {
      var an = nd - sunLon;            // node angle vs the Sun-locked frame
      var half = E.SEASON_HALF_DEG;
      sctx.fillStyle = idx === 0 ? "rgba(86,190,140,.14)" : "rgba(86,190,140,.10)";
      sctx.beginPath();
      sctx.arc(cx, cy, R + 12, -(an - half) * RAD, -(an + half) * RAD, true);
      sctx.arc(cx, cy, R - 3, -(an + half) * RAD, -(an - half) * RAD, false);
      sctx.closePath(); sctx.fill();
      // node line across the board
      var q1 = boardPoint(cx, cy, R, an), q2 = boardPoint(cx, cy, R, an + 180);
      sctx.strokeStyle = "#57be8c"; sctx.lineWidth = idx === 0 ? 2 : 1.4;
      sctx.setLineDash(idx === 0 ? [] : [5, 4]);
      sctx.beginPath(); sctx.moveTo(q1[0], q1[1]); sctx.lineTo(q2[0], q2[1]); sctx.stroke();
      sctx.setLineDash([]);
      sctx.fillStyle = "#8fe0b4"; sctx.font = "10px system-ui, sans-serif";
      var pn2 = boardPoint(cx, cy, R - 34, an);
      sctx.fillText(idx === 0 ? "node (Feb)" : "node (Aug)", pn2[0], pn2[1]);
    });

    // ---- Sun-Earth line ----
    sctx.strokeStyle = "rgba(255,215,110,.5)"; sctx.lineWidth = 1.4;
    sctx.setLineDash([2, 3]);
    sctx.beginPath(); sctx.moveTo(cx, cy); sctx.lineTo(sx - 20, sy); sctx.stroke();
    sctx.setLineDash([]);

    // ---- Moon on the rim orbit band; lit half faces the Sun ----
    var mp = boardPoint(cx, cy, R, elong);
    sctx.strokeStyle = "#8fa4c9"; sctx.setLineDash([3, 4]); sctx.lineWidth = 1;
    sctx.beginPath(); sctx.moveTo(cx, cy); sctx.lineTo(mp[0], mp[1]); sctx.stroke();
    sctx.setLineDash([]);
    var r2 = 13;
    var lm = Math.atan2(sy - mp[1], sx - mp[0]);
    sctx.save();
    sctx.beginPath(); sctx.arc(mp[0], mp[1], r2, 0, 6.29); sctx.clip();
    sctx.fillStyle = "#232c3d"; sctx.fillRect(mp[0] - r2, mp[1] - r2, r2 * 2, r2 * 2);
    sctx.translate(mp[0], mp[1]); sctx.rotate(lm);
    sctx.fillStyle = "#f2e3b3"; sctx.fillRect(0, -r2, r2, r2 * 2);
    sctx.restore();
    sctx.strokeStyle = Math.abs(beta) < 0.5 ? "#e0596b" : "#66799e";
    sctx.lineWidth = Math.abs(beta) < 0.5 ? 2.4 : 1.4;
    sctx.beginPath(); sctx.arc(mp[0], mp[1], r2, 0, 6.29); sctx.stroke();
    sctx.fillStyle = Math.abs(beta) < 0.5 ? "#ff8b9b" : "#a8bad9";
    sctx.font = "10.5px system-ui, sans-serif"; sctx.textAlign = "center";
    sctx.fillText("Moon  " + (beta >= 0 ? "+" : "") + noisy(beta, ms).toFixed(2) + " deg " + (beta >= 0 ? "N" : "S"),
      mp[0], mp[1] - r2 - 9);

    // ---- Earth ----
    sctx.fillStyle = "#2e6db4";
    sctx.beginPath(); sctx.arc(cx, cy, 11, 0, 6.29); sctx.fill();
    sctx.fillStyle = "#9fd0ff"; sctx.font = "11px system-ui, sans-serif";
    sctx.fillText("Earth", cx, cy + 24);

    // ---- side view box (heights cut ~6x) ----
    var bx = 12, by = STAGE_H - 158, bw = 300, bh = 146;
    sctx.fillStyle = "rgba(13,21,38,.94)";
    sctx.strokeStyle = "#3c4f73"; sctx.lineWidth = 1;
    sctx.beginPath(); sctx.rect(bx, by, bw, bh); sctx.fill(); sctx.stroke();
    sctx.fillStyle = "#93a7cd"; sctx.font = "10px system-ui, sans-serif"; sctx.textAlign = "left";
    sctx.fillText("side view, looking along the nodes (heights cut ~6x, not to scale)", bx + 10, by + 15);

    var egY = by + 96, ex = bx + 176, Lm = 96;
    sctx.strokeStyle = "#5d6f92"; sctx.lineWidth = 1;
    sctx.setLineDash([4, 4]);
    sctx.beginPath(); sctx.moveTo(bx + 8, egY); sctx.lineTo(bx + bw - 8, egY); sctx.stroke();
    sctx.setLineDash([]);
    sctx.fillStyle = "#93a7cd";
    sctx.fillText("sky road (ecliptic)", bx + 12, egY + 13);

    // Earth-shadow cones toward the left (anti-Sun)
    var umx = ex - Lm;
    sctx.fillStyle = "rgba(90,110,150,.35)";
    sctx.beginPath(); sctx.moveTo(ex, egY - 7); sctx.lineTo(umx - 8, egY - 26);
    sctx.lineTo(umx - 8, egY + 26); sctx.lineTo(ex, egY + 7); sctx.closePath(); sctx.fill();
    sctx.fillStyle = "rgba(40,52,78,.9)";
    sctx.beginPath(); sctx.moveTo(ex, egY - 3.5); sctx.lineTo(umx - 8, egY - 15);
    sctx.lineTo(umx - 8, egY + 15); sctx.lineTo(ex, egY + 3.5); sctx.closePath(); sctx.fill();
    // Moon-shadow strip toward the Sun (right)
    // Moon marker in the side view: project onto the Sun-Earth axis
    var sxx = Math.max(bx + 14, Math.min(bx + bw - 122, ex + Math.cos(elong * RAD) * Lm));
    var my = egY - beta * 6.2;
    sctx.fillStyle = "#f2e3b3";
    sctx.beginPath(); sctx.arc(sxx, my, 6, 0, 6.29); sctx.fill();
    sctx.strokeStyle = "#66799e"; sctx.lineWidth = 1;
    sctx.beginPath(); sctx.arc(sxx, my, 6, 0, 6.29); sctx.stroke();
    sctx.strokeStyle = "#57be8c"; sctx.setLineDash([2, 3]); sctx.lineWidth = 1;
    sctx.beginPath(); sctx.moveTo(sxx, my); sctx.lineTo(sxx, egY); sctx.stroke();
    sctx.setLineDash([]);
    sctx.fillStyle = "#c8d4ef"; sctx.font = "9.5px system-ui, sans-serif"; sctx.textAlign = "center";
    var ly = beta >= 0 ? my - 10 : my + 15;
    sctx.fillText("h = " + (beta >= 0 ? "+" : "") + noisy(beta, ms).toFixed(2) + " deg", sxx, ly);
    sctx.textAlign = "left";
    sctx.fillStyle = "#93a7cd";
    sctx.fillText("Earth", ex - 12, egY - 12);
    sctx.fillStyle = "#ffd76e";
    sctx.beginPath(); sctx.arc(bx + bw - 16, egY, 4, 0, 6.29); sctx.fill();
    sctx.fillStyle = "#93a7cd"; sctx.font = "9px system-ui, sans-serif";
    sctx.fillText("Sun", bx + bw - 22, egY + 12);

    // nodes at the ends of the tilted lane through Earth
    sctx.strokeStyle = "#57be8c"; sctx.lineWidth = 1.2;
    sctx.beginPath(); sctx.moveTo(bx + 12, egY - 13); sctx.lineTo(bx + bw - 12, egY + 13); sctx.stroke();
    sctx.fillStyle = "#8fe0b4";
    sctx.fillText("N", bx + 12, egY - 17);
    sctx.fillText("S", bx + bw - 18, egY + 22);

    readouts(ms, elong, beta);
  }

  function readouts(ms, elong, beta) {
    var near = E.nearestEvent(ms);
    var se = E.seasonAt(ms);
    $("dateTop").textContent = isoOf(ms);
    $("dateRead").textContent = isoOf(ms) + " 12:00 UT";
    $("phaseRead").textContent = E.phaseName(elong) + ", about " +
      E.illumApprox(elong).toFixed(0) + "% lit  (approx calendar)";
    $("betaRead").textContent = (beta >= 0 ? "+" : "") + noisy(beta, ms).toFixed(2) +
      " deg (" + (beta >= 0 ? "north" : "south") + " of the sky road)";
    var away = Math.abs(near.days);
    $("nearRead").textContent = near.event.label + " on " + E.dateUT(near.event.iso) +
      " " + E.clockUT(near.event.iso) + "  |  " +
      (near.days < 0 ? away.toFixed(1) + " days ago" : "in " + away.toFixed(1) + " days") +
      (near.within ? "  |  inside the 2-day eclipse band" : "");
    $("seasonRead").textContent = se
      ? "Sun is " + Math.abs(se.signedDeg).toFixed(1) + " deg from the " +
        (se.signedDeg >= 0 ? "far" : "near") + " edge of a node season (model spans +-16 deg)"
      : "Sun is far from both nodes: no season now";
    $("verdictRead").textContent = E.verdict(ms);
    $("verdictRead").className = near.within ? "verdict eclipse" : se ? "verdict season" : "verdict";
  }

  // ---------- events table ----------
  function eventsTable() {
    $("eventsTable").innerHTML = LS.store.tableHTML(
      ["date (UT)", "time", "type", "label", "NASA canon value"],
      E.EVENTS.map(function (ev) {
        return [E.dateUT(ev.iso), E.clockUT(ev.iso).slice(0, 5), ev.type, ev.label, ev.fact];
      }));
    var body = $("eventsTable").querySelector("tbody");
    Array.prototype.forEach.call(body.querySelectorAll("tr"), function (tr, i) {
      tr.style.cursor = "pointer";
      tr.addEventListener("click", function () {
        var ev = E.EVENTS[i];
        var idx = Math.round((ev.t - START_MS) / DAY);
        $("dayRange").value = String(Math.max(0, Math.min(LAST_DAY, idx)));
        draw();
      });
    });
  }

  // ---------- controls ----------
  $("dayRange").addEventListener("input", draw);
  Array.prototype.forEach.call(document.querySelectorAll(".preset"), function (b) {
    b.addEventListener("click", function () {
      var ms = Date.parse(b.getAttribute("data-d") + "T12:00:00Z");
      var idx = Math.round((ms - START_MS) / DAY);
      $("dayRange").value = String(Math.max(0, Math.min(LAST_DAY, idx)));
      draw();
    });
  });

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
  LS.ui.modeToggle(LAB, $("toolbar1"), function (m) { mode = m; draw(); });
  eventsTable();
  resizeStage();
})();
