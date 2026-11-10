// PHY110 Lab 12 sim: the reflection/refraction tank. A water tank with a
// circular graduated scale centred on the beam impact point, the water line
// at the 90 mark, a rotating laser box that rides the scale rim between the
// lower-left (water: reflection + TIR) and upper-left (air: refraction)
// quadrants, printed incidence sets (45-80 in 5, 10-80 in 10), a tap key for
// the laser, a standing eye-safety line, selectable error modes (tilted
// surface, off-centre laser), the two data tables, the critical-angle and
// index box, the theta_r-against-theta_i graph, and a labelled sin-plot
// add-on.
//
// Course Mode is exact Snell at the printed 1.333. Fun Mode carries a stable
// +-1 degree scale-reading offset per angle (the beam-width honesty), and the
// refracted beam still dims gradually across the critical angle. Error modes
// bias the readings (tilt 2 deg, off-centre 1.5 deg) without touching the
// graded accepted values. Fun Mode never changes the printed index, c, or the
// printed sets.
(function () {
  "use strict";
  var LS = window.LS, O = LS.refraction;
  var LAB = "12-reflection-refraction";
  var $ = function (id) { return document.getElementById(id); };
  var mode = LS.ui.getMode(LAB);

  function fmt(x, d) {
    if (x === null || !isFinite(x)) return "-";
    return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function rad(d) { return d * Math.PI / 180; }
  function deg(r) { return r * 180 / Math.PI; }

  // ---------- bench geometry (css px) ----------
  var CH = 470, RH = 300, SH = 260;
  var cv = $("tankCanvas"), cx = cv.getContext("2d");
  var rv = $("rrCanvas"), rx = rv.getContext("2d");
  var sv = $("sinCanvas"), sx2 = sv.getContext("2d");
  var dpr = window.devicePixelRatio || 1;
  var C = { x: 350, y: 235 }, R = 185;

  function scalePoint(thetaFromNormal, side, half) {
    return {
      x: C.x + side * R * Math.sin(rad(thetaFromNormal)),
      y: C.y + (half === "up" ? -1 : 1) * R * Math.cos(rad(thetaFromNormal))
    };
  }
  function boxPos(theta, part) {
    return scalePoint(theta, -1, part === "water" ? "down" : "up");
  }

  // ---------- state ----------
  var theta = 45;                 // true incidence angle, deg from normal
  var part = "water";             // "water" | "air"
  var laserOn = false;
  var tilt = false, offCenter = false;
  var refl = {};                  // printed value -> logged pair
  var refr = {};
  var crit = null;                // measured critical angle (read deg)
  var offs = { i: 0, r: 0, t: 0 };  // Fun Mode stable +-1 degree offsets
  var flash = null, dragging = null;

  function setFor(partNow) {
    return partNow === "water" ? O.REFLECTION_SET : O.REFRACTION_SET;
  }
  function biasNow() { return (tilt ? O.TILT_DEG : 0) + (offCenter ? O.OFFCENTER_DEG : 0); }
  function readings() {
    var b = biasNow();
    var ti = theta + offs.i + b;
    var tr = O.reflect(theta) + offs.r + b;
    var tir = part === "water" ? O.isTIR(O.N_WATER, theta, O.N_AIR) : false;
    var t2 = null;
    if (part === "water") {
      if (!tir) t2 = O.refractDeg(O.N_WATER, theta, O.N_AIR) + offs.t + b;
    } else {
      t2 = O.refractDeg(O.N_AIR, theta, O.N_WATER) + offs.t + b;
    }
    return { ti: ti, tr: tr, t2: t2, tir: tir };
  }
  function tirAlpha() {
    if (part !== "water") return 1;
    return O.tirDim(theta, O.criticalDeg(O.N_WATER, O.N_AIR));
  }

  // ---------- persistence ----------
  function saveState() {
    LS.store.save(LAB, "state", ["state"], [[JSON.stringify({
      theta: theta, part: part, laserOn: laserOn, tilt: tilt, offCenter: offCenter,
      refl: refl, refr: refr, crit: crit, mode: mode
    })]]);
    LS.store.save(LAB, "log", CSV_HEADER, csvRows());
  }
  function loadState() {
    try {
      var got = LS.store.load(LAB, "state");
      if (!got || !got.rows || !got.rows.length) return;
      var st = JSON.parse(got.rows[0][0]);
      theta = st.theta || 45; part = st.part || "water";
      laserOn = !!st.laserOn; tilt = !!st.tilt; offCenter = !!st.offCenter;
      refl = st.refl || {}; refr = st.refr || {}; crit = st.crit === null ? null : st.crit;
      if (st.mode === "fun") mode = "fun";
    } catch (e) {}
  }

  // ---------- readouts ----------
  function noteNow(rd) {
    if (flash && Date.now() < flash.until) return flash.text;
    if (!laserOn) return "the laser is off - close the tap key";
    if (part === "water") {
      var tc = O.criticalDeg(O.N_WATER, O.N_AIR);
      if (theta > tc + 1.5) return "TIR: nothing crosses into the air - all the light stays in the water";
      if (theta > tc - 2) return "the refracted beam is dimming - you are at the critical angle region";
      return "read both angles, and log the pair at each printed value";
    }
    return "read the refracted angle in the water, and log the pair at each printed value";
  }
  function refreshReadouts() {
    var rd = readings();
    $("tiRead").textContent = laserOn ? fmt(rd.ti, 1) + " deg" : "-";
    $("trRead").textContent = laserOn ? fmt(rd.tr, 1) + " deg" : "-";
    $("t2Read").textContent = !laserOn ? "-" :
      (rd.t2 === null ? "TIR (no beam)" : fmt(rd.t2, 1) + " deg");
    $("laserBtn").textContent = laserOn ? "Laser: ON" : "Laser: off";
    $("laserBtn").className = laserOn ? "action" : "action ghost";
    $("partWater").className = part === "water" ? "action" : "action ghost";
    $("partAir").className = part === "air" ? "action" : "action ghost";
    $("tiltChk").checked = tilt;
    $("offChk").checked = offCenter;
    $("noteRead").textContent = noteNow(rd);
    $("critBox").innerHTML = crit === null
      ? "no critical angle logged yet"
      : "your &theta;c = " + fmt(crit, 1) + " deg &rarr; n = 1/sin " + fmt(crit, 1) +
        " deg = <strong>" + fmt(O.indexFromCritical(crit), 3) + "</strong> " +
        "(printed 1.333, % error " + fmt(O.pctError(O.indexFromCritical(crit), O.N_WATER), 1) + " %)";
  }

  // ---------- data tables ----------
  var CSV_HEADER = ["part", "theta_i (deg)", "angle (deg)"];
  function csvRows() {
    var rows = [];
    Object.keys(refl).forEach(function (v) {
      rows.push(["reflection", v, fmt(refl[v], 1)]);
    });
    Object.keys(refr).forEach(function (v) {
      rows.push(["refraction", v, fmt(refr[v], 1)]);
    });
    if (crit !== null) rows.push(["critical (water to air)", fmt(crit, 1), ""]);
    rows.sort(function (a, b) { return String(a[0]).localeCompare(String(b[0])); });
    return rows;
  }
  function renderTables() {
    var reflRows = O.REFLECTION_SET.map(function (v) {
      return ["reflection " + v, String(v), refl[v] !== undefined ? fmt(refl[v], 1) : ""];
    });
    var refrRows = O.REFRACTION_SET.map(function (v) {
      return ["refraction " + v, String(v), refr[v] !== undefined ? fmt(refr[v], 1) : ""];
    });
    $("tableRefl").innerHTML = LS.store.tableHTML(
      ["part", "theta_i (deg)", "theta_r (deg)"], reflRows);
    $("tableRefr").innerHTML = LS.store.tableHTML(
      ["part", "theta_i (deg)", "theta_2 (deg)"], refrRows);
    renderWorkBox();
  }
  function renderWorkBox() {
    var lines = ["theta_i = theta_r (reflection, angles from the normal)",
      "n1 sin theta_1 = n2 sin theta_2 (Snell);  n = c/v;  n_water = 1.333 at 589 nm, n_air = 1.000",
      "critical (water to air): n = 1/sin(theta_c);  printed set gives " +
      fmt(O.criticalDeg(O.N_WATER, O.N_AIR), 1) + " deg"];
    var rp = reflPts();
    if (rp.length >= 2) {
      var f = O.fitLine(rp);
      lines.push("Table I fit: slope " + fmt(f.m, 3) + ", intercept " + fmt(f.b, 2) +
        " (expected slope 1.0, intercept 0)");
    }
    var sp = sinPts();
    if (sp.length >= 2) {
      var f2 = O.fitLine(sp);
      lines.push("add-on sin plot: slope " + fmt(f2.m, 3) +
        " against n = 1.333 (in-app extra, not course work)");
    }
    if (crit !== null) {
      lines.push("your critical angle " + fmt(crit, 1) +
        " deg -> n = " + fmt(O.indexFromCritical(crit), 3) +
        " against the printed 1.333");
    }
    if (mode === "fun") {
      lines.push("Fun Mode: each read angle carries a stable +-1 degree scale-reading offset (beam width); the refracted beam dims across the critical angle");
    }
    if (tilt || offCenter) {
      lines.push("error modes active: " + (tilt ? "surface tilted 2 deg " : "") +
        (offCenter ? "laser off-centre 1.5 deg" : "") + " - every reading is pushed, the accepted values are not");
    }
    $("workBox").textContent = lines.join("\n");
  }
  function reflPts() {
    return Object.keys(refl).map(function (v) {
      return { x: Number(v), y: refl[v] };
    });
  }
  function sinPts() {
    return Object.keys(refr).map(function (v) {
      return { x: Math.sin(rad(refr[v])), y: Math.sin(rad(Number(v))) };
    });
  }
  function refreshAll() {
    refreshReadouts();
    renderTables();
    drawTank();
    drawRR();
    drawSin();
  }

  // ---------- drawing: the tank ----------
  function drawBeam(p1, p2, color, alpha, width) {
    cx.globalAlpha = alpha === undefined ? 1 : alpha;
    cx.strokeStyle = color; cx.lineWidth = width || 3;
    cx.beginPath(); cx.moveTo(p1.x, p1.y); cx.lineTo(p2.x, p2.y); cx.stroke();
    cx.globalAlpha = 1;
  }
  function drawTank() {
    var w = cv.width / dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, w, CH);
    cx.fillStyle = "#0d1526"; cx.fillRect(0, 0, w, CH);
    var rd = readings();
    // water (rotated 2 deg when the tilt error mode is on)
    cx.save();
    cx.translate(C.x, C.y);
    if (tilt) cx.rotate(rad(O.TILT_DEG));
    cx.fillStyle = "rgba(63,138,204,0.40)";
    cx.fillRect(-w, 0, 2 * w, CH);
    cx.strokeStyle = "#8fd3ff"; cx.lineWidth = 2;
    cx.beginPath(); cx.moveTo(-w, 0); cx.lineTo(w, 0); cx.stroke();
    cx.restore();
    // scale circle + ticks, every 10 deg, labelled every 30
    cx.strokeStyle = "#3a4a6a"; cx.lineWidth = 1;
    cx.beginPath(); cx.arc(C.x, C.y, R, 0, 6.29); cx.stroke();
    cx.fillStyle = "#9fb4d8"; cx.font = "9px ui-monospace, monospace";
    for (var t = 0; t <= 90; t += 10) {
      [1, -1].forEach(function (side) {
        ["up", "down"].forEach(function (half) {
          var p = scalePoint(t, side, half);
          cx.strokeStyle = t % 30 === 0 ? "#9fb4d8" : "#4a5f8a";
          cx.beginPath(); cx.moveTo(p.x, p.y);
          cx.lineTo(C.x + side * (R - (t % 30 === 0 ? 14 : 8)) * Math.sin(rad(t)),
            C.y + (half === "up" ? -1 : 1) * (R - (t % 30 === 0 ? 14 : 8)) * Math.cos(rad(t)));
          cx.stroke();
          if (t % 30 === 0) {
            cx.fillStyle = "#9fb4d8"; cx.textAlign = "center"; cx.textBaseline = "middle";
            var lp = { x: C.x + side * (R - 26) * Math.sin(rad(t)),
              y: C.y + (half === "up" ? -1 : 1) * (R - 26) * Math.cos(rad(t)) };
            cx.fillText(String(t), lp.x, lp.y);
          }
        });
      });
    }
    // the normal
    cx.setLineDash([5, 4]);
    cx.strokeStyle = "#6d84ad"; cx.lineWidth = 1;
    cx.beginPath(); cx.moveTo(C.x, C.y - R - 12); cx.lineTo(C.x, C.y + R + 12); cx.stroke();
    cx.setLineDash([]);
    cx.fillStyle = "#6d84ad"; cx.font = "9px system-ui, sans-serif";
    cx.textAlign = "left";
    cx.fillText("normal", C.x + 6, C.y - R - 4);
    cx.fillText("90 deg water line", C.x - R - 4, C.y + 14);
    // impact point
    cx.fillStyle = "#dce6f5";
    cx.beginPath(); cx.arc(C.x, C.y, 3.5, 0, 6.29); cx.fill();
    // beams
    if (laserOn) {
      var bp = boxPos(theta, part);
      drawBeam(bp, C, "#ff5555", 1, 3);
      // reflected: mirror across the normal, same half as the box
      var rp = scalePoint(theta, 1, part === "water" ? "down" : "up");
      drawBeam(C, rp, "#ffd166", 1, 3);
      // refracted: other half, bent
      var tc = O.criticalDeg(O.N_WATER, O.N_AIR);
      var t2true = part === "water" ? O.refractDeg(O.N_WATER, theta, O.N_AIR)
        : O.refractDeg(O.N_AIR, theta, O.N_WATER);
      if (isFinite(t2true)) {
        var al = part === "water" ? tirAlpha() : 1;
        var qp = scalePoint(t2true, 1, part === "water" ? "up" : "down");
        drawBeam(C, qp, "#8affc1", al, 3);
      }
      if (part === "water" && theta > tc + 1.5) {
        cx.fillStyle = "#ff6b6b"; cx.font = "11px ui-monospace, monospace";
        cx.textAlign = "left";
        cx.fillText("TIR: no refracted beam", C.x + 60, C.y - 90);
      }
      // angle labels
      cx.font = "10px ui-monospace, monospace";
      cx.fillStyle = "#ff8f8f";
      cx.fillText("ti " + fmt(rd.ti, 1), (bp.x + C.x) / 2 - 44, (bp.y + C.y) / 2);
      cx.fillStyle = "#ffd166";
      cx.fillText("tr " + fmt(rd.tr, 1), (rp.x + C.x) / 2 + 8, (rp.y + C.y) / 2);
      if (isFinite(t2true)) {
        cx.fillStyle = "#8affc1";
        var q2 = scalePoint(t2true, 1, part === "water" ? "up" : "down");
        cx.fillText("t2 " + (rd.t2 === null ? "TIR" : fmt(rd.t2, 1)),
          (q2.x + C.x) / 2 + 8, (q2.y + C.y) / 2);
      }
    }
    // the laser box on the rim
    var bx = boxPos(theta, part);
    cx.fillStyle = dragging ? "#ffd166" : (laserOn ? "#8a3a3a" : "#3a4a6a");
    cx.save();
    cx.translate(bx.x, bx.y);
    cx.rotate(Math.atan2(C.y - bx.y, C.x - bx.x) + Math.PI);
    cx.fillRect(-18, -12, 36, 24);
    cx.strokeStyle = "#dce6f5"; cx.lineWidth = 1;
    cx.strokeRect(-18, -12, 36, 24);
    cx.restore();
    cx.fillStyle = laserOn ? "#ff8f8f" : "#9fb4d8";
    cx.font = "9px system-ui, sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillText("laser", bx.x, bx.y);
    cx.fillStyle = laserOn ? "#ff5555" : "#4a5f8a";
    cx.beginPath();
    cx.arc(bx.x, bx.y, 4, 0, 6.29); cx.fill();
  }

  // ---------- drawing: the two graphs ----------
  function drawRR() {
    var g = { x0: 52, y0: 22, x1: rv.width / dpr - 20, y1: RH - 40 };
    rx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rx.clearRect(0, 0, g.x1 + 20, RH);
    rx.fillStyle = "#0d1526"; rx.fillRect(0, 0, g.x1 + 20, RH);
    function X(v) { return g.x0 + ((v - 40) / 45) * (g.x1 - g.x0); }
    function Y(v) { return g.y1 - ((v - 40) / 45) * (g.y1 - g.y0); }
    rx.strokeStyle = "#23324e"; rx.lineWidth = 1;
    rx.fillStyle = "#6d84ad"; rx.font = "9px ui-monospace, monospace";
    rx.textAlign = "center"; rx.textBaseline = "top";
    for (var a = 40; a <= 85; a += 5) {
      rx.beginPath(); rx.moveTo(X(a), g.y0); rx.lineTo(X(a), g.y1); rx.stroke();
      if (a % 10 === 0) rx.fillText(String(a), X(a), g.y1 + 5);
    }
    rx.textAlign = "right"; rx.textBaseline = "middle";
    [40, 50, 60, 70, 80].forEach(function (a) {
      rx.beginPath(); rx.moveTo(g.x0, Y(a)); rx.lineTo(g.x1, Y(a)); rx.stroke();
      rx.fillText(String(a), g.x0 - 6, Y(a));
    });
    rx.textAlign = "left"; rx.textBaseline = "bottom";
    rx.fillText("theta_i (deg) horizontal  /  theta_r (deg) vertical  -  the course graph", g.x0, g.y0 - 6);
    // expected line y = x
    rx.setLineDash([5, 4]);
    rx.strokeStyle = "#8affc1"; rx.lineWidth = 1.2;
    rx.beginPath(); rx.moveTo(X(40), Y(40)); rx.lineTo(X(85), Y(85)); rx.stroke();
    rx.setLineDash([]);
    rx.fillStyle = "#8affc1"; rx.font = "9px system-ui, sans-serif";
    rx.fillText("expected: slope 1, intercept 0", X(58), Y(52));
    // the fit
    var pts = reflPts();
    if (pts.length >= 2) {
      var f = O.fitLine(pts);
      if (f) {
        rx.strokeStyle = "#ffd166"; rx.lineWidth = 1.8;
        rx.beginPath();
        rx.moveTo(X(40), Y(40 * f.m + f.b));
        rx.lineTo(X(85), Y(85 * f.m + f.b));
        rx.stroke();
        rx.fillStyle = "#ffd166";
        rx.fillText("your fit: slope " + fmt(f.m, 2) + ", intercept " + fmt(f.b, 1), X(42), Y(44));
      }
    }
    pts.forEach(function (p) {
      rx.fillStyle = "#ff5555";
      rx.beginPath(); rx.arc(X(p.x), Y(p.y), 3.5, 0, 6.29); rx.fill();
      rx.strokeStyle = "#0d1526"; rx.lineWidth = 1; rx.stroke();
    });
  }
  function drawSin() {
    var g = { x0: 52, y0: 22, x1: sv.width / dpr - 20, y1: SH - 40 };
    sx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    sx2.clearRect(0, 0, g.x1 + 20, SH);
    sx2.fillStyle = "#0d1526"; sx2.fillRect(0, 0, g.x1 + 20, SH);
    function X(v) { return g.x0 + (v / 0.7) * (g.x1 - g.x0); }
    function Y(v) { return g.y1 - (v / 1.05) * (g.y1 - g.y0); }
    sx2.strokeStyle = "#23324e"; sx2.lineWidth = 1;
    sx2.fillStyle = "#6d84ad"; sx2.font = "9px ui-monospace, monospace";
    sx2.textAlign = "center"; sx2.textBaseline = "top";
    [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].forEach(function (v) {
      sx2.beginPath(); sx2.moveTo(X(v), g.y0); sx2.lineTo(X(v), g.y1); sx2.stroke();
      sx2.fillText(v.toFixed(1), X(v), g.y1 + 5);
    });
    sx2.textAlign = "right"; sx2.textBaseline = "middle";
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      sx2.beginPath(); sx2.moveTo(g.x0, Y(v)); sx2.lineTo(g.x1, Y(v)); sx2.stroke();
      sx2.fillText(v.toFixed(2), g.x0 - 6, Y(v));
    });
    sx2.textAlign = "left"; sx2.textBaseline = "bottom";
    sx2.fillText("sin theta_2 (water) horizontal  /  sin theta_i (air) vertical  -  in-app add-on, not course work", g.x0, g.y0 - 6);
    // slope n line through the origin
    sx2.setLineDash([5, 4]);
    sx2.strokeStyle = "#8affc1"; sx2.lineWidth = 1.2;
    sx2.beginPath(); sx2.moveTo(X(0), Y(0)); sx2.lineTo(X(0.7), Y(0.7 * O.N_WATER)); sx2.stroke();
    sx2.setLineDash([]);
    sx2.fillStyle = "#8affc1"; sx2.font = "9px system-ui, sans-serif";
    sx2.fillText("slope n = 1.333", X(0.42), Y(0.42 * O.N_WATER) - 4);
    var pts = sinPts();
    if (pts.length >= 2) {
      var f = O.fitLine(pts);
      if (f) {
        sx2.strokeStyle = "#ffd166"; sx2.lineWidth = 1.8;
        sx2.beginPath();
        sx2.moveTo(X(0), Y(0 * f.m + f.b));
        sx2.lineTo(X(0.7), Y(0.7 * f.m + f.b));
        sx2.stroke();
        sx2.fillStyle = "#ffd166";
        sx2.fillText("your fit: slope " + fmt(f.m, 3), X(0.05), Y(0.9));
      }
    }
    pts.forEach(function (p) {
      sx2.fillStyle = "#ff5555";
      sx2.beginPath(); sx2.arc(X(p.x), Y(p.y), 3.5, 0, 6.29); sx2.fill();
      sx2.strokeStyle = "#0d1526"; sx2.lineWidth = 1; sx2.stroke();
    });
  }

  // ---------- controls ----------
  function setPart(p) {
    part = p;
    flash = {
      text: p === "water"
        ? "laser in the water: reflection and TIR part, printed set 45-80 in 5 steps"
        : "laser in the air: refraction part, printed set 10-80 in 10 steps",
      until: Date.now() + 3500
    };
    refreshAll();
    saveState();
  }
  $("partWater").addEventListener("click", function () { setPart("water"); });
  $("partAir").addEventListener("click", function () { setPart("air"); });
  $("laserBtn").addEventListener("click", function () {
    laserOn = !laserOn;
    flash = { text: laserOn ? "laser on - keep it aimed at the tank" : "laser off",
      until: Date.now() + 2000 };
    refreshAll();
    saveState();
  });
  $("nextTheta").addEventListener("click", function () {
    var set = setFor(part);
    var next = null;
    for (var i = 0; i < set.length; i++) {
      if (set[i] > theta + 0.25) { next = set[i]; break; }
    }
    if (next === null) next = set[0];   // wrap around the printed set
    theta = next;
    flash = { text: "theta_i set to the printed " + next + " deg", until: Date.now() + 2000 };
    refreshAll();
    saveState();
  });
  $("tiltChk").addEventListener("change", function () {
    tilt = this.checked;
    flash = { text: tilt ? "surface tilted 2 deg: every reading is pushed off" : "surface level again",
      until: Date.now() + 2500 };
    refreshAll();
    saveState();
  });
  $("offChk").addEventListener("change", function () {
    offCenter = this.checked;
    flash = { text: offCenter ? "laser off-centre: readings pushed again" : "laser back on centre",
      until: Date.now() + 2500 };
    refreshAll();
    saveState();
  });
  $("logPair").addEventListener("click", function () {
    if (!laserOn) {
      flash = { text: "the laser must be on to log a pair", until: Date.now() + 2500 };
      refreshAll();
      return;
    }
    var set = setFor(part);
    var hit = null;
    for (var i = 0; i < set.length; i++) {
      if (Math.abs(set[i] - theta) <= 0.75) { hit = set[i]; break; }
    }
    if (hit === null) {
      flash = { text: "set theta_i on a printed value first (Next printed theta i) before logging",
        until: Date.now() + 3500 };
      refreshAll();
      return;
    }
    var rd = readings();
    if (part === "water") {
      refl[hit] = rd.tr;
      flash = { text: "reflection pair logged: " + hit + " deg in, " + fmt(rd.tr, 1) + " deg out",
        until: Date.now() + 3000 };
    } else {
      if (rd.t2 === null) {
        flash = { text: "there is no refracted angle here - the beam is in total internal reflection",
          until: Date.now() + 3500 };
        refreshAll();
        return;
      }
      refr[hit] = rd.t2;
      flash = { text: "refraction pair logged: " + hit + " deg in, " + fmt(rd.t2, 1) + " deg in the water",
        until: Date.now() + 3000 };
    }
    refreshAll();
    saveState();
  });
  $("logCrit").addEventListener("click", function () {
    if (!laserOn || part !== "water") {
      flash = { text: "the critical angle is found with the laser in the water", until: Date.now() + 2500 };
      refreshAll();
      return;
    }
    var tc = O.criticalDeg(O.N_WATER, O.N_AIR);
    if (tirAlpha() > 0.5) {
      flash = { text: "the refracted beam is still strong - drag the box until it is nearly gone",
        until: Date.now() + 3000 };
      refreshAll();
      return;
    }
    crit = readings().ti;
    flash = { text: "critical angle logged at " + fmt(crit, 1) + " deg (the printed value is " +
      fmt(tc, 1) + " deg)", until: Date.now() + 4000 };
    refreshAll();
    saveState();
  });
  $("clearAllBtn").addEventListener("click", function () {
    theta = 45; part = "water"; laserOn = false;
    tilt = false; offCenter = false;
    refl = {}; refr = {}; crit = null;
    LS.store.clear(LAB, "log");
    $("csvCopy").style.display = "none";
    flash = { text: "cleared - the box is back at 45 deg in the water", until: Date.now() + 2500 };
    refreshAll();
    saveState();
  });
  $("exportLog").addEventListener("click", function () {
    LS.store.exportCSV("phy110-lab12-reflection-refraction.csv", CSV_HEADER, csvRows(), $("csvCopy"));
  });

  // ---------- dragging: the laser box ----------
  function evPos(ev) {
    var r = cv.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }
  cv.addEventListener("pointerdown", function (ev) {
    var p = evPos(ev);
    var bp = boxPos(theta, part);
    if (Math.hypot(p.x - bp.x, p.y - bp.y) < 28) {
      dragging = true;
      cv.setPointerCapture(ev.pointerId);
    }
  });
  cv.addEventListener("pointermove", function (ev) {
    if (!dragging) return;
    var p = evPos(ev);
    var dx = p.x - C.x, dy = p.y - C.y;
    if (Math.abs(dx) < 8) dx = dx < 0 ? -8 : 8;
    var a = Math.abs(deg(Math.atan2(Math.abs(dx), Math.abs(dy))));
    theta = clamp(a, 5, 85);
    part = dy > 0 ? "water" : "air";
    drawTank();
    var rd = readings();
    $("tiRead").textContent = laserOn ? fmt(rd.ti, 1) + " deg" : "-";
  });
  cv.addEventListener("pointerup", function () {
    if (!dragging) return;
    dragging = false;
    flash = { text: "theta_i " + fmt(theta, 0) + " deg, laser in the " + part,
      until: Date.now() + 2000 };
    refreshAll();
    saveState();
  });
  cv.addEventListener("pointercancel", function () {
    if (dragging) { dragging = false; drawTank(); }
  });

  // ---------- boot ----------
  function resizeStages() {
    cv.width = Math.round(Math.max(700, (cv.clientWidth || 760)) * dpr);
    cv.height = Math.round(CH * dpr);
    rv.width = Math.round(Math.max(460, (rv.clientWidth || 560)) * dpr);
    rv.height = Math.round(RH * dpr);
    sv.width = Math.round(Math.max(460, (sv.clientWidth || 560)) * dpr);
    sv.height = Math.round(SH * dpr);
    drawTank();
    drawRR();
    drawSin();
  }
  window.addEventListener("resize", resizeStages);

  setInterval(function () {
    if (flash && Date.now() >= flash.until) { flash = null; refreshReadouts(); }
  }, 60);

  loadState();
  if (mode === "fun") {
    offs = { i: (Math.random() * 2 - 1) * O.SCALE_NOISE_DEG,
      r: (Math.random() * 2 - 1) * O.SCALE_NOISE_DEG,
      t: (Math.random() * 2 - 1) * O.SCALE_NOISE_DEG };
  }
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (m) {
    mode = m;
    if (mode === "fun") {
      offs = { i: (Math.random() * 2 - 1) * O.SCALE_NOISE_DEG,
        r: (Math.random() * 2 - 1) * O.SCALE_NOISE_DEG,
        t: (Math.random() * 2 - 1) * O.SCALE_NOISE_DEG };
    } else {
      offs = { i: 0, r: 0, t: 0 };
    }
    refreshAll();
    saveState();
  });
  LS.check.init(LAB);
  refreshAll();
  resizeStages();
})();
