// Lab 3 sim. One big equirectangular RA/Dec chart (RA hours growing eastward
// to the left, matching the course star chart), with the ecliptic drawn on it,
// catalog stars sized by magnitude, a Sun marker driven by a day-of-year
// slider, a birthday-Sun readout, a name-the-star quiz, and the Check tab
// exercises. All coordinate math comes from sphere.js and the catalog from
// data/stars.js; this file is DOM only.
(function () {
  "use strict";
  var LS = window.LS, SP = LS.sphere, ST = LS.stars;
  var LAB = "03-celestial-sphere";
  var $ = function (id) { return document.getElementById(id); };
  var DEG = Math.PI / 180;
  var dpr = window.devicePixelRatio || 1;
  var CHART_H = 420;
  var BASE = (CHART_H - 64) / 156;   // px per degree of Dec at zoom 1 (156 deg band)
  var chartW = 480;
  var MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var SEASON_SHORT = ["spring", "summer", "autumn", "winter"];
  var SEASON_LONG = ["northern spring", "northern summer",
    "northern autumn", "northern winter"];
  var ZODIAC = [
    [12, 22, 1, 19, "Capricorn"], [1, 20, 2, 18, "Aquarius"],
    [2, 19, 3, 20, "Pisces"], [3, 21, 4, 19, "Aries"],
    [4, 20, 5, 20, "Taurus"], [5, 21, 6, 20, "Gemini"],
    [6, 21, 7, 22, "Cancer"], [7, 23, 8, 22, "Leo"],
    [8, 23, 9, 22, "Virgo"], [9, 23, 10, 22, "Libra"],
    [10, 23, 11, 21, "Scorpius"], [11, 22, 12, 21, "Sagittarius"]
  ];

  function norm24(x) { return ((x % 24) + 24) % 24; }
  function wrap12(x) {
    var d = ((x % 24) + 36) % 24;
    return d > 12 ? d - 24 : d;
  }
  function signed(v, d) { return (v >= 0 ? "+" : "") + v.toFixed(d); }
  function raHM(h) {
    var hh = Math.floor(h);
    var mm = Math.round((h - hh) * 60);
    if (mm === 60) { hh++; mm = 0; }
    if (hh === 24) hh = 0;
    return hh + "h " + (mm < 10 ? "0" : "") + mm + "m";
  }
  function doyToMD(n) {
    var m = 0, d = n;
    while (d > MONTH_DAYS[m]) { d -= MONTH_DAYS[m]; m++; }
    return MONTH_NAMES[m] + " " + d;
  }
  function zodiacForMD(mo, d) {
    var v = mo * 100 + d;
    for (var i = 0; i < ZODIAC.length; i++) {
      var z = ZODIAC[i];
      var a = z[0] * 100 + z[1], b = z[2] * 100 + z[3];
      if (a <= b ? (v >= a && v <= b) : (v >= a || v <= b)) return z[4];
    }
    return "";
  }
  function seasonIdx(lon) { return Math.floor((((lon % 360) + 360) % 360) / 90) % 4; }

  // ---------- chart state ----------
  // RA runs eastward = leftward on this map, exactly like the course chart.
  var view = { raC: 10, decC: 3, zoom: 1 };
  function ppd() { return BASE * view.zoom; }
  function pph() { return ppd() * 15; }
  function xOf(ra) { return chartW / 2 - wrap12(ra - view.raC) * pph(); }
  function yOf(dec) { return CHART_H / 2 - (dec - view.decC) * ppd(); }
  function raAt(x) { return norm24(view.raC + (chartW / 2 - x) / pph()); }
  function decAt(y) { return view.decC + (CHART_H / 2 - y) / ppd(); }
  function clampDec(v) { return Math.max(-72, Math.min(84, v)); }

  // ---------- celestial objects ----------
  var STARS = ST.list;
  var LUM = {};
  STARS.slice().sort(function (a, b) { return a.mag - b.mag; })
    .slice(0, 25).forEach(function (s) { LUM[s.name] = true; });
  var sunCache = {};
  function sunAt(doy) {
    if (!sunCache[doy]) sunCache[doy] = SP.sunEquatorial(doy);
    return sunCache[doy];
  }
  var eclPts = [];
  for (var el = 0; el <= 360; el += 2) {
    eclPts.push(SP.eclipticToEquatorial(el));
  }

  // ---------- drawing ----------
  var chart = $("chartStage"), ctx = chart.getContext("2d");
  var boxes = [];

  function labelOK(b) {
    for (var i = 0; i < boxes.length; i++) {
      var o = boxes[i];
      if (b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y) {
        return false;
      }
    }
    boxes.push(b);
    return true;
  }
  function putLabel(text, x, y, align, color) {
    var w = text.length * 5.6 + 3;
    var bx = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
    var bb = { x: bx, y: y - 8, w: w, h: 10 };
    if (bx < -2 || bx + w > chartW + 2) return;
    if (!labelOK(bb)) return;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
  }

  function drawChart(phase) {
    var W = chartW, H = CHART_H;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0d1526";
    ctx.fillRect(0, 0, W, H);
    if (W < 80) return;
    boxes = [];
    var g, d, x, y;

    // RA grid lines every 2 h; xOf already wraps across the map
    ctx.font = "9.5px system-ui, sans-serif";
    for (g = 0; g < 24; g += 2) {
      x = xOf(g);
      if (x < 1 || x > W - 1) continue;
      if (g === 0) {
        ctx.strokeStyle = "rgba(255,215,110,.55)"; ctx.lineWidth = 1.8;
      } else {
        ctx.strokeStyle = "rgba(84,103,140,.5)"; ctx.lineWidth = 0.7;
      }
      ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, H - 30); ctx.stroke();
      ctx.fillStyle = "#93a7cd"; ctx.textAlign = "center";
      ctx.fillText(g + "h", x, H - 16);
    }
    // Dec grid lines every 20 deg
    for (d = -80; d <= 80; d += 20) {
      y = yOf(d);
      if (y < 12 || y > H - 32) continue;
      if (d === 0) {
        ctx.strokeStyle = "#9fd0ff"; ctx.lineWidth = 2.2;
      } else {
        ctx.strokeStyle = "rgba(84,103,140,.5)"; ctx.lineWidth = 0.7;
      }
      ctx.beginPath(); ctx.moveTo(6, y); ctx.lineTo(W - 6, y); ctx.stroke();
      ctx.fillStyle = "#93a7cd"; ctx.textAlign = "left";
      ctx.fillText(d === 0 ? "Dec 0" : signed(d, 0), 9, y - 4);
    }

    // ecliptic (skip the wrap seam at RA 0h/24h)
    ctx.strokeStyle = "#e0b357"; ctx.lineWidth = 1.8;
    ctx.beginPath();
    var pen = false, prevRa = 0;
    for (var i = 0; i < eclPts.length; i++) {
      var p = eclPts[i];
      x = xOf(p.raHours); y = yOf(p.decDeg);
      if (pen && Math.abs(p.raHours - prevRa) > 12) pen = false;
      if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
      prevRa = p.raHours;
    }
    ctx.stroke();

    // four ecliptic keystones: the Sun's positions on the season dates
    var KEYS = [[0, "Mar 21"], [90, "Jun 21"], [180, "Sep 23"], [270, "Dec 21"]];
    KEYS.forEach(function (k) {
      var ke = SP.eclipticToEquatorial(k[0]);
      x = xOf(ke.raHours); y = yOf(ke.decDeg);
      if (x < 4 || x > W - 4 || y < 12 || y > H - 32) return;
      ctx.strokeStyle = "rgba(224,179,87,.8)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 6.29); ctx.stroke();
      putLabel(k[1], x + 6, y + 11, "left", "rgba(224,179,87,.85)");
    });

    // stars
    var quizOn = quiz.on && quiz.cur;
    for (i = 0; i < STARS.length; i++) {
      var s = STARS[i];
      x = xOf(s.ra); y = yOf(s.dec);
      if (x < -6 || x > W + 6 || y < -6 || y > H + 6) continue;
      var r = Math.max(1.1, (4.2 - s.mag) * 0.85);
      ctx.globalAlpha = quizOn ? 0.5 : 0.95;
      ctx.fillStyle = "#dfe9fb";
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Sun on the slider date + ghost trail
    var sun = sunAt(currentDoy);
    x = xOf(sun.raHours); y = yOf(sun.decDeg);
    [-20, -10, 10, 20].forEach(function (k) {
      var gs = sunAt(Math.max(1, Math.min(365, currentDoy + k)));
      var gx = xOf(gs.raHours), gy = yOf(gs.decDeg);
      if (gx < -4 || gx > W + 4 || gy < -4 || gy > H + 4) return;
      ctx.fillStyle = "rgba(255,215,110," + (0.42 - Math.abs(k) * 0.014) + ")";
      ctx.beginPath(); ctx.arc(gx, gy, 2.2, 0, 6.29); ctx.fill();
    });
    ctx.strokeStyle = "#ffd76e"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 6, 0, 6.29); ctx.stroke();
    ctx.fillStyle = "#ffd76e";
    ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 6.29); ctx.fill();

    // birthday marker
    if (bday) {
      x = xOf(bday.raHours); y = yOf(bday.decDeg);
      ctx.strokeStyle = "#7fe3a8"; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(x, y, 6.5, 0, 6.29); ctx.stroke();
      ctx.fillStyle = "#7fe3a8";
      ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.29); ctx.fill();
    }

    // labels for the ~25 brightest (collision-culled; hidden during the quiz
    // so a highlighted star cannot give its own name away)
    ctx.font = "10px system-ui, sans-serif";
    if (!quiz.on) {
      for (i = 0; i < STARS.length; i++) {
        s = STARS[i];
        if (!LUM[s.name]) continue;
        x = xOf(s.ra); y = yOf(s.dec);
        if (x < 0 || x > W || y < 10 || y > H - 30) continue;
        putLabel(s.name, x, y - 6, "center", "#c9d8f2");
      }
    }

    // quiz highlight
    if (quizOn) {
      s = quiz.cur;
      x = xOf(s.ra); y = yOf(s.dec);
      var pulse = 8 + 5 * (0.5 + 0.5 * Math.sin(phase * 4.6));
      ctx.strokeStyle = quiz.reveal ? "#ff6b6b" : "#ff8f5e";
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(x, y, pulse, 0, 6.29); ctx.stroke();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(x, y, Math.max(1.6, (4.2 - s.mag) * 0.85), 0, 6.29);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (quiz.reveal) {
        putLabel(s.name + " (" + s.con + ")", x, y - pulse - 4, "center", "#ffd76e");
      }
    } else if (hoverStar) {
      x = xOf(hoverStar.ra); y = yOf(hoverStar.dec);
      ctx.strokeStyle = "rgba(159,208,255,.9)"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.29); ctx.stroke();
    }

    // orientation note: east = left, like looking up
    var ax = W - 100;
    ctx.strokeStyle = "#93a7cd"; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(ax + 52, 16); ctx.lineTo(ax, 16); ctx.stroke();
    ctx.fillStyle = "#93a7cd";
    ctx.beginPath(); ctx.moveTo(ax - 5, 16); ctx.lineTo(ax + 3, 12);
    ctx.lineTo(ax + 3, 20); ctx.closePath(); ctx.fill();
    ctx.textAlign = "center"; ctx.font = "9.5px system-ui, sans-serif";
    ctx.fillText("RA increases east", ax + 58, 30);
  }

  // ---------- stage sizing + interaction ----------
  function redraw() { drawChart(performance.now() / 1000); }

  function resizeStage() {
    chartW = Math.max(300, chart.clientWidth || 480);
    chart.width = Math.round(chartW * dpr);
    chart.height = Math.round(CHART_H * dpr);
    redraw();
  }
  window.addEventListener("resize", resizeStage);

  function chartCoords(clientX, clientY) {
    var r = chart.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }
  function pickStar(cx, cy) {
    var best = null, bestD = 14;
    for (var i = 0; i < STARS.length; i++) {
      var dx = xOf(STARS[i].ra) - cx, dy = yOf(STARS[i].dec) - cy;
      var dd = Math.sqrt(dx * dx + dy * dy);
      if (dd < bestD) { bestD = dd; best = STARS[i]; }
    }
    return best;
  }
  var hoverStar = null;

  function anchorTo(cx, cy, raAnchor, decAnchor) {
    view.raC = norm24(raAnchor - (chartW / 2 - cx) / pph());
    view.decC = clampDec(decAnchor - (CHART_H / 2 - cy) / ppd());
    redraw();
  }
  var drag = null;
  var movedFar;

  chart.addEventListener("pointerdown", function (e) {
    var c = chartCoords(e.clientX, e.clientY);
    drag = { x: c.x, y: c.y, ra: raAt(c.x), dec: decAt(c.y) };
    movedFar = false;
    chart.setPointerCapture(e.pointerId);
  });
  chart.addEventListener("pointermove", function (e) {
    var c = chartCoords(e.clientX, e.clientY);
    if (drag) {
      if (Math.abs(c.x - drag.x) + Math.abs(c.y - drag.y) > 5) movedFar = true;
      if (movedFar) anchorTo(c.x, c.y, drag.ra, drag.dec);
    }
  });
  chart.addEventListener("pointerup", function (e) {
    var c = chartCoords(e.clientX, e.clientY);
    if (drag && !movedFar && !quiz.on) {
      var s = pickStar(c.x, c.y);
      hoverStar = s;
      $("starRead").textContent = s
        ? s.name + " (" + s.con + ")   RA " + raHM(s.ra) + "   Dec " +
          signed(s.dec, 1) + " deg   mag " + s.mag
        : "point: RA " + raHM(raAt(c.x)) + "   Dec " + signed(decAt(c.y), 1) + " deg";
      redraw();
    }
    drag = null;
  });
  chart.addEventListener("wheel", function (e) {
    e.preventDefault();
    var c = chartCoords(e.clientX, e.clientY);
    zoomAt(c.x, c.y, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });

  function zoomAt(cx, cy, factor) {
    var ra = raAt(cx), dec = decAt(cy);
    view.zoom = Math.max(0.55, Math.min(6, view.zoom * factor));
    anchorTo(cx, cy, ra, dec);
  }

  chart.addEventListener("keydown", function (e) {
    var step = 0.9;
    if (e.key === "ArrowLeft") { view.raC = norm24(view.raC + step); }
    else if (e.key === "ArrowRight") { view.raC = norm24(view.raC - step); }
    else if (e.key === "ArrowUp") { view.decC = clampDec(view.decC + step); }
    else if (e.key === "ArrowDown") { view.decC = clampDec(view.decC - step); }
    else if (e.key === "+" || e.key === "=") { zoomAt(chartW / 2, CHART_H / 2, 1.25); }
    else if (e.key === "-" || e.key === "_") { zoomAt(chartW / 2, CHART_H / 2, 1 / 1.25); }
    else return;
    e.preventDefault();
    redraw();
  });

  // touch: one finger pans (pointer events), two fingers pinch-zoom
  var pinch = null;
  function tdist(t) {
    var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  chart.addEventListener("touchstart", function (e) {
    if (e.touches.length === 2) {
      var r = chart.getBoundingClientRect();
      pinch = {
        d: tdist(e.touches),
        zoom0: view.zoom,
        cx: (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left,
        cy: (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top
      };
      pinch.ra = raAt(pinch.cx);
      pinch.dec = decAt(pinch.cy);
      drag = null;
    }
  }, { passive: true });
  chart.addEventListener("touchmove", function (e) {
    if (pinch && e.touches.length === 2) {
      e.preventDefault();
      var f = tdist(e.touches) / pinch.d;
      view.zoom = Math.max(0.55, Math.min(6, pinch.zoom0 * f));
      anchorTo(pinch.cx, pinch.cy, pinch.ra, pinch.dec);
    }
  }, { passive: false });
  chart.addEventListener("touchend", function () { pinch = null; });

  // ---------- slider + birthday ----------
  var dayRange = $("dayRange");
  var bday = null;
  function currentDoyOf() { return parseInt(dayRange.value, 10); }
  var currentDoy = currentDoyOf();

  function updateDay() {
    currentDoy = currentDoyOf();
    $("dayNum").textContent = String(currentDoy);
    var e = sunAt(currentDoy);
    $("dayRead").textContent =
      doyToMD(currentDoy) + "   lon " + e.lonDeg.toFixed(1) + " deg   RA " +
      raHM(e.raHours) + "   Dec " + signed(e.decDeg, 1) + "   NH " +
      SEASON_SHORT[seasonIdx(e.lonDeg)];
    redraw();
  }
  dayRange.addEventListener("input", updateDay);

  function updateBday() {
    var v = $("bdayInput").value;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
    if (!m) { bday = null; $("bdayRead").textContent = "pick a date"; redraw(); return; }
    var y = +m[1], mo = +m[2], d = +m[3];
    bday = SP.sunPositionForDate(y, mo, d);
    var md = MONTH_NAMES[mo - 1] + " " + d;
    $("bdayRead").textContent =
      "Your birthday Sun (" + md + ") lands at RA ~" + raHM(bday.raHours) +
      ", Dec ~" + signed(bday.decDeg, 1) + " deg (ecliptic lon " +
      bday.lonDeg.toFixed(0) + " deg, background: " + zodiacForMD(mo, d) + ")";
    redraw();
  }
  $("bdayInput").addEventListener("input", updateBday);

  // ---------- quiz ----------
  var QUIZ_N = 7;
  var quiz = { on: false, queue: [], qi: 0, score: 0, cur: null, wrongs: 0,
    reveal: false, raf: 0, timer: 0, busy: false };
  var quizBtn = $("quizBtn"), quizInput = $("quizInput"),
    quizMsg = $("quizMsg"), quizScore = $("quizScore");

  function loop(ts) {
    if (!quiz.on) { quiz.raf = 0; return; }
    drawChart(ts / 1000);
    quiz.raf = window.requestAnimationFrame(loop);
  }

  function startQuiz() {
    window.clearTimeout(quiz.timer);
    var pool = STARS.slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = pool[i];
      pool[i] = pool[j]; pool[j] = t;
    }
    quiz.on = true; quiz.queue = pool.slice(0, QUIZ_N);
    quiz.qi = 0; quiz.score = 0; quiz.cur = null; quiz.reveal = false;
    quiz.busy = false;
    quizBtn.textContent = "Restart quiz (7 stars)";
    quizScore.textContent = "0/" + QUIZ_N;
    if (!quiz.raf) quiz.raf = window.requestAnimationFrame(loop);
    nextQ();
  }

  function nextQ() {
    quiz.reveal = false; quiz.wrongs = 0; quiz.busy = false;
    if (quiz.qi >= QUIZ_N) { endQuiz(); return; }
    quiz.cur = quiz.queue[quiz.qi];
    quizInput.value = "";
    quizInput.disabled = false;
    quizInput.focus();
    quizMsg.textContent = "Star " + (quiz.qi + 1) + " of " + QUIZ_N +
      ": the highlighted star blinks, what is its name?";
  }

  function endQuiz() {
    quiz.cur = null; quiz.on = false;
    quizInput.disabled = true;
    quizScore.textContent = quiz.score + "/" + QUIZ_N;
    quizMsg.textContent = "Round over: " + quiz.score + " of " + QUIZ_N +
      " named. The catalog holds " + STARS.length + " stars to work through.";
    if (quiz.score > 0) LS.ui.progressMark(LAB, "sim");
    redraw();
  }

  function gradeQuiz() {
    if (!quiz.on || !quiz.cur || quiz.busy) return;
    var v = (quizInput.value || "").trim().toLowerCase();
    if (!v) return;
    if (v === quiz.cur.name.toLowerCase()) {
      quiz.score++; quiz.cur = null; quiz.busy = true;
      quizInput.disabled = true;
      quizScore.textContent = quiz.score + "/" + QUIZ_N;
      quizMsg.textContent = "Yes, " + quiz.score + " so far. Next star...";
      window.clearTimeout(quiz.timer);
      quiz.timer = window.setTimeout(function () { quiz.qi++; nextQ(); }, 1100);
    } else {
      quiz.wrongs++;
      if (quiz.wrongs >= 3) {
        quiz.reveal = true; quiz.busy = true;
        var s = quiz.cur;
        quizInput.disabled = true;
        quizMsg.textContent = "It was " + s.name + " (" + s.con + "), RA ~" +
          raHM(s.ra) + ", Dec ~" + signed(s.dec, 1) + " deg. No point this time.";
        window.clearTimeout(quiz.timer);
        quiz.timer = window.setTimeout(function () { quiz.qi++; nextQ(); }, 2200);
      } else if (quiz.wrongs === 2) {
        quizMsg.textContent = "Not it. A look: it sits in " + quiz.cur.con +
          ", Dec ~" + signed(quiz.cur.dec, 0) + " deg. Pan/zoom to that spot.";
      } else {
        quizMsg.textContent = "Not quite (names are case-insensitive, try again).";
      }
    }
  }
  quizBtn.addEventListener("click", startQuiz);
  quizInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") gradeQuiz();
  });

  // ---------- Check tab exercises ----------
  function starOf(name) {
    var s = ST.findByName ? ST.findByName(name) : null;
    if (!s) {
      STARS.forEach(function (x) { if (x.name === name) s = x; });
    }
    return s;
  }
  var vega = starOf("Vega"), sirius = starOf("Sirius"), polaris = starOf("Polaris");
  var aug1 = SP.sunPositionForDate(2026, 8, 1);
  var mar1 = SP.sunPositionForDate(2026, 3, 1);
  var octLon = SP.sunEclipticLon(291);
  var sepGC = SP.angularSeparation(12, 60, 15, 60);

  var EX = [
    {
      type: "numbers",
      q: "1. Find <strong>Vega</strong> (small constellation Lyr) on the chart: the ecliptic keystones and the 2h grid lines are your ruler. Enter its RA in decimal hours and its Dec in degrees. Tolerance 0.3 h and 3 deg.",
      parts: [
        { label: "RA (hours)", unit: "h", value: vega.ra, tolAbs: 0.3 },
        { label: "Dec (degrees)", unit: "deg", value: vega.dec, tolAbs: 3 }
      ],
      hints: ["Grid lines are every 2 h. Vega sits between the 18h and 20h lines.", "It is well above the thick Dec 0 line, so Dec is positive: count toward the +40 mark."],
      working: "Vega sits at <strong>" + vega.ra.toFixed(2) + " h (" + raHM(vega.ra) + "), Dec " + signed(vega.dec, 1) + " deg</strong>: just past the 18h grid line, well above the equator, close to the +40 mark. You can also click the star on the chart and the lookup line prints the same numbers.",
      answer: vega.ra.toFixed(2) + " h, " + signed(vega.dec, 1) + " deg"
    },
    {
      type: "numbers",
      q: "2. Same method for <strong>Sirius</strong> (CMa), the brightest star in the whole sky. Watch the sign this time. Tolerance 0.3 h and 3 deg.",
      parts: [
        { label: "RA (hours)", unit: "h", value: sirius.ra, tolAbs: 0.3 },
        { label: "Dec (degrees)", unit: "deg", value: sirius.dec, tolAbs: 3 }
      ],
      hints: ["Sirius is just past the 6h line, between 6h and 8h.", "It hangs below the thick equator line, so Dec is negative: the minus is part of the answer."],
      working: "Sirius: <strong>" + sirius.ra.toFixed(2) + " h (" + raHM(sirius.ra) + "), Dec " + signed(sirius.dec, 1) + " deg</strong>. A southern star without the minus sign lands you nearly 17 deg and several constellations off target: this is the sign slip the manual drills.",
      answer: sirius.ra.toFixed(2) + " h, " + signed(sirius.dec, 1) + " deg"
    },
    {
      type: "choice",
      correct: 0,
      q: "3. Polaris sits at Dec " + signed(polaris.dec, 1) + ", barely " + (90 - polaris.dec).toFixed(1) + " deg off the north celestial pole. Why does it sit there?",
      options: [
        "Earth's rotation axis, projected onto the sky, lands almost exactly on it, and Dec +90 is the pole by definition",
        "It is the brightest star in the sky, and the brightest star always marks the pole",
        "It sits at the northernmost point of the ecliptic, the summer solstice mark at Dec +23.5",
        "It marks the vernal equinox, where RA 0h crosses the celestial equator"
      ],
      hints: ["Dec is measured from the celestial equator, which is Earth's equator extended outward.", "The pole is where Earth's axis extended outward crosses the sky.", "Sirius outshines Polaris by a mile, and the equinox sits at Dec 0."],
      working: "The poles in the sky are just the rotation axis extended: the NCP is Dec " + signed(90, 1) + ". Polaris happens to lie under that pointer, so it inherits a Dec of about " + signed(polaris.dec, 1) + " and wheels in a tiny circle instead of rising or setting. Brightness has nothing to do with it (Sirius is far brighter), the solstice point is only Dec +23.5, and the equinox is on the equator.",
      answer: "the pole is the axis projection, and Polaris happens to sit next to it"
    },
    {
      type: "numbers",
      q: "4. Step math on the grid: (a) how many degrees of arc are 4 h of RA? (b) the same RA gap of 40 deg, counted along the small circle at Dec +60, narrows to how many degrees of actual arc along that circle? (Use cos Dec; tolerance 1.6 deg on part b.)",
      parts: [
        { label: "4 h along the equator", unit: "deg", value: 60, tolAbs: 0 },
        { label: "40 deg at Dec +60 along the parallel", unit: "deg", value: 22.3, tolAbs: 1.6 }
      ],
      hints: ["360 deg around comes 24 h around, so 1 h = 15 deg.", "A circle at Dec +60 is narrower than the equator's by cos 60 = 0.5."],
      working: "360/24 = <strong>15 deg per hour</strong>, so 4 h = 60 deg along the equator. At Dec +60 the RA circles shrink by cos 60 = 0.5, so 40 deg of RA difference is only 40 x 0.5 = 22.5 deg measured along the parallel. The straight great-circle distance between two stars at Dec +60 exactly 3 h apart in RA works out to " + sepGC.toFixed(1) + " deg by the spherical formula in the sim's math file: same answer either way, which is why the rough parallel route is fine at this level.",
      answer: "60 deg; about 22 deg"
    },
    {
      type: "numbers",
      q: "5. Slide the date slider to day 213 (Aug 1) and read the Sun (the gold marker) off the ecliptic, or read the day readout: enter the Sun's RA (decimal hours) and Dec (degrees). Tolerance 0.3 h and 3 deg.",
      parts: [
        { label: "Sun RA (hours)", unit: "h", value: Math.round(aug1.raHours * 100) / 100, tolAbs: 0.3 },
        { label: "Sun Dec (degrees)", unit: "deg", value: Math.round(aug1.decDeg * 10) / 10, tolAbs: 3 }
      ],
      hints: ["Between Jun 21 (6h, +23.5) and Sep 23 (12h, 0): the Sun is past its northern peak.", "The day readout ticks lon, RA, Dec live as you slide."],
      working: "On Aug 1 the Sun's ecliptic longitude is " + aug1.lonDeg.toFixed(1) + " deg, which converts to <strong>RA " + aug1.raHours.toFixed(2) + " h (" + raHM(aug1.raHours) + "), Dec " + signed(aug1.decDeg, 1) + " deg</strong>. Still north of the equator (the + sign matters), still in Leo by the course's date table, headed toward the September crossing.",
      answer: aug1.raHours.toFixed(2) + " h, " + signed(aug1.decDeg, 1) + " deg"
    },
    {
      type: "numbers",
      q: "6. Birthday-Sun drill, the manual's Q1: set the birthday picker to <strong>March 1</strong> and enter where the green marker lands: RA in decimal hours, Dec in degrees. Tolerance 0.3 h and 3 deg.",
      parts: [
        { label: "Sun RA (hours)", unit: "h", value: Math.round(mar1.raHours * 100) / 100, tolAbs: 0.3 },
        { label: "Sun Dec (degrees)", unit: "deg", value: Math.round(mar1.decDeg * 10) / 10, tolAbs: 3 }
      ],
      hints: ["March 1 is 20 days before the vernal equinox, so the Sun's RA is close to 24 h but not yet there: it wraps.", "Between Dec 21 (-23.5) and Mar 21 (0): still negative, climbing."],
      working: "March 1 puts the Sun at lon " + mar1.lonDeg.toFixed(0) + " deg =~ <strong>RA " + mar1.raHours.toFixed(2) + " h (" + raHM(mar1.raHours) + "), Dec " + signed(mar1.decDeg, 1) + " deg</strong>, near the RA 22-23 h edge: high hours, about to wrap past 24h to 0h at the equinox, exactly the end-of-table place where sign slips and wrap slips happen. The background by the course's date table is Pisces (Feb 19 - Mar 20).",
      answer: mar1.raHours.toFixed(2) + " h, " + signed(mar1.decDeg, 1) + " deg (Sun in Pisces)"
    },
    {
      type: "choice",
      correct: seasonIdx(octLon),
      q: "7. A date's Sun sits at ecliptic longitude " + octLon.toFixed(0) + " deg. Which season is it in the northern hemisphere?",
      options: SEASON_LONG,
      hints: ["0 deg is the March equinox, 90 the June solstice, 180 the September equinox, 270 the December solstice.", "That longitude falls between the September equinox and the December solstice."],
      working: "Between 180 deg (Sep 23, the Sun crossing the equator southward) and 270 deg (Dec 21, the low point of the year) the northern hemisphere leans increasingly away from the Sun: <strong>" + SEASON_LONG[seasonIdx(octLon)] + "</strong>, about October. Same sky, opposite season south of the equator.",
      answer: SEASON_LONG[seasonIdx(octLon)]
    },
    {
      type: "keywords",
      need: 2,
      q: "8. In your own words: astronomer says the coordinates of a faint galaxy are RA 13h 25m, Dec +47 09 and every telescope in the world can point at it, any night, in any weather it can observe at all. Name at least two ideas about <em>why</em> RA/Dec make any telescope pointable, unlike 'the bright star over the barn'.",
      words: ["telescope", "point", "catalog", "mount", "night", "sky", "go", "dial", "anywhere", "fixed", "stars", "clock", "15", "east"],
      placeholder: "two plain ideas...",
      working: "The grid is <strong>stitched to the stars</strong>, not to your horizon or your clock: a pair of RA/Dec numbers means the same thing in any country and any season, so a catalog entry is a universal address a student in Bogotá and one in Bangkok can dial into the same mount. And because the sky turns at <strong>15 deg = 1 h per hour eastward</strong>, a mount that tracks against that one rate holds the target all night once the two dials are set.",
      answer: "star-tied universal address + the fixed 15 deg per hour turn rate"
    }
  ];

  function buildExercises() {
    var host = $("check-list");
    EX.forEach(function (cfg) {
      var div = document.createElement("div");
      div.className = "exercise";
      div.setAttribute("data-ex", JSON.stringify(cfg));
      host.appendChild(div);
    });
  }

  // ---------- boot ----------
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  buildExercises();
  LS.check.init(LAB);
  resizeStage();
  updateDay();
  updateBday();
})();
