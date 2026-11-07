// Labs 16-17 sim. Left panel: a flat equirectangular graticule you can drop a
// pin on (readout gives lat/long with direction letters + ideal zone offset).
// Right panel: a 24-hour dial where the home-city hand and target-city hand
// show the same instant; a badge and a weekday strip track the date shift.
// All math comes from timelong.js; this file is DOM only. Exercises for the
// Check tab are built here and wired through shared/check.js.
(function () {
  "use strict";
  var LS = window.LS, TL = LS.timeLong;
  var LAB = "16-time-lat-long";
  var $ = function (id) { return document.getElementById(id); };
  var RAD = Math.PI / 180;
  var dpr = window.devicePixelRatio || 1;
  var WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  function zfmt(r) {
    return r.hour + ":" + (r.minute < 10 ? "0" : "") + r.minute + " " +
      (r.isPM ? "PM" : "AM");
  }
  function zfmt24(h, m) {
    return h + ":" + (m < 10 ? "0" : "") + m;
  }

  // ---------- graticule binmap ----------
  var map = $("mapStage"), mctx = map.getContext("2d");
  var MAP_H = 360;
  var pin = null;

  function mx(lon, w) { return (lon + 180) / 360 * (w - 44) + 30; }
  function my(lat, h) { return (90 - lat) / 180 * (h - 40) + 24; }
  function unLon(x, w) { return (x - 30) / (w - 44) * 360 - 180; }
  function unLat(y, h) { return 90 - (y - 24) / (h - 40) * 180; }

  function drawMap() {
    var w = map.width / dpr, h = MAP_H;
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.clearRect(0, 0, w, h);
    mctx.fillStyle = "#0d1526";
    mctx.fillRect(0, 0, w, h);

    // dotted ideal zone meridians every 15 deg
    mctx.strokeStyle = "rgba(255,215,110,.28)";
    mctx.lineWidth = 1;
    mctx.setLineDash([2, 4]);
    for (var z = -180 + 7.5; z < 180; z += 15) {
      mctx.beginPath();
      mctx.moveTo(mx(z, w), my(90, h)); mctx.lineTo(mx(z, w), my(-90, h));
      mctx.stroke();
    }
    mctx.setLineDash([]);

    // graticule: 18 deg lon x 12 deg lat
    mctx.strokeStyle = "#3c4f73"; mctx.lineWidth = 0.7;
    for (var g = -180 + 18; g < 180; g += 18) {
      if (g % 15 === 0 && g !== 0) mctx.strokeStyle = "rgba(60,79,115,.45)";
      mctx.beginPath();
      mctx.moveTo(mx(g, w), my(90, h)); mctx.lineTo(mx(g, w), my(-90, h));
      mctx.stroke();
    }
    for (var b = -90 + 12; b < 90; b += 12) {
      mctx.beginPath();
      mctx.moveTo(mx(-180, w), my(b, h)); mctx.lineTo(mx(180, w), my(b, h));
      mctx.stroke();
    }

    // thick equator + prime meridian
    mctx.strokeStyle = "#9fd0ff"; mctx.lineWidth = 2.2;
    mctx.beginPath(); mctx.moveTo(mx(-180, w), my(0, h)); mctx.lineTo(mx(180, w), my(0, h)); mctx.stroke();
    mctx.strokeStyle = "#ffd76e";
    mctx.beginPath(); mctx.moveTo(mx(0, w), my(90, h)); mctx.lineTo(mx(0, w), my(-90, h)); mctx.stroke();
    // date line
    mctx.strokeStyle = "rgba(255,110,110,.7)"; mctx.lineWidth = 1.6;
    mctx.setLineDash([6, 4]);
    mctx.beginPath(); mctx.moveTo(mx(180, w), my(90, h)); mctx.lineTo(mx(180, w), my(-90, h)); mctx.stroke();
    mctx.beginPath(); mctx.moveTo(mx(-180, w), my(90, h)); mctx.lineTo(mx(-180, w), my(-90, h)); mctx.stroke();
    mctx.setLineDash([]);

    // edge labels
    mctx.fillStyle = "#93a7cd"; mctx.font = "9.5px system-ui, sans-serif";
    mctx.textAlign = "center";
    for (var lx = -150; lx <= 150; lx += 60) {
      mctx.fillText(lx === 0 ? "0" : Math.abs(lx) + (lx > 0 ? "E" : "W"), mx(lx, w), h - 8);
    }
    mctx.textAlign = "left";
    for (var ly = -60; ly <= 60; ly += 30) {
      if (ly === 0) continue;
      mctx.fillText(Math.abs(ly) + (ly > 0 ? "N" : "S"), 3, my(ly, h) + 3);
    }
    mctx.fillText("90N", 3, my(90, h) + 3);
    mctx.fillText("90S", 3, my(-90, h) + 3);

    // cities
    Object.keys(TL.CITIES).forEach(function (k) {
      var c = TL.CITIES[k];
      mctx.fillStyle = "#7fe3a8";
      mctx.beginPath(); mctx.arc(mx(c.lon, w), my(c.lat, h), 3.4, 0, 6.29); mctx.fill();
      mctx.fillStyle = "#cde8d6"; mctx.font = "10px system-ui, sans-serif";
      mctx.textAlign = "center";
      mctx.fillText(c.name, mx(c.lon, w), my(c.lat, h) - 7);
    });

    // pin
    if (pin) {
      mctx.strokeStyle = "#ff8f5e"; mctx.lineWidth = 1.6;
      mctx.beginPath(); mctx.arc(mx(pin.lon, w), my(pin.lat, h), 6, 0, 6.29); mctx.stroke();
      mctx.fillStyle = "#ff8f5e";
      mctx.beginPath(); mctx.arc(mx(pin.lon, w), my(pin.lat, h), 2.2, 0, 6.29); mctx.fill();
    }
  }

  function dropPin(clientX, clientY) {
    var r = map.getBoundingClientRect();
    var x = (clientX - r.left), y = (clientY - r.top);
    var lon = Math.max(-180, Math.min(180, unLon(x, map.width / dpr)));
    var lat = Math.max(-90, Math.min(90, unLat(y, map.height / dpr)));
    lon = Math.round(lon * 10) / 10; lat = Math.round(lat * 10) / 10;
    pin = { lat: lat, lon: lon };
    var z = TL.zoneOffsetHours(lon);
    $("pinRead").textContent = TL.coordLabel(lat, lon) +
      "   |   ideal zone " + TL.zoneLabel(z) +
      " (" + (z >= 0 ? "+" : "-") + Math.abs(z) + " h from Greenwich)";
    drawMap();
  }
  map.addEventListener("click", function (e) { dropPin(e.clientX, e.clientY); });

  // ---------- clock dial binmap ----------
  var dial = $("dialStage"), dctx = dial.getContext("2d");
  var DIAL_H = 340;
  var homeSel = $("homeSel"), targetSel = $("targetSel"), hourRange = $("hourRange");

  function handAngle(hourFloat) {   // noon at top, hours increase clockwise
    return (hourFloat - 12) * 15 * RAD;
  }

  function drawDial() {
    var w = dial.width / dpr, h = DIAL_H;
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dctx.clearRect(0, 0, w, h);
    dctx.fillStyle = "#0d1526";
    dctx.fillRect(0, 0, w, h);

    var cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.37;

    // rim + 24 hour ticks (15 deg per hour = Earth's rotation rate)
    dctx.strokeStyle = "#3c4f73"; dctx.lineWidth = 1.4;
    dctx.beginPath(); dctx.arc(cx, cy, R, 0, 6.29); dctx.stroke();
    dctx.strokeStyle = "#8fa4c9"; dctx.fillStyle = "#93a7cd";
    dctx.font = "10.5px system-ui, sans-serif"; dctx.textAlign = "center";
    for (var hh = 0; hh < 24; hh++) {
      var a = handAngle(hh);
      var big = hh % 6 === 0;
      var r0 = R - (big ? 10 : 5), r1 = R;
      dctx.lineWidth = big ? 2 : 1;
      dctx.beginPath();
      dctx.moveTo(cx + r0 * Math.sin(a), cy - r0 * Math.cos(a));
      dctx.lineTo(cx + r1 * Math.sin(a), cy - r1 * Math.cos(a));
      dctx.stroke();
      if (big) {
        var lab = ["mid", "6A", "noon", "6P"][hh / 6];
        dctx.fillText(lab, cx + (R + 14) * Math.sin(a), cy - (R + 14) * Math.cos(a) + 3);
      }
    }
    dctx.strokeStyle = "#5b6f95"; dctx.setLineDash([4, 5]);
    dctx.beginPath(); dctx.arc(cx, cy, R * 0.72, 0, 6.29); dctx.stroke();
    dctx.setLineDash([]);

    // rotation reminder on the rim
    dctx.fillStyle = "#93a7cd"; dctx.font = "10px system-ui, sans-serif";
    dctx.fillText("Earth turns 15 deg = 1 h", cx, cy + R + 34);

    var homeLon = TL.CITIES[homeSel.value].lon;
    var targetLon = TL.CITIES[targetSel.value].lon;
    var hour = parseInt(hourRange.value, 10);
    var off = Math.round(TL.solarTimeGapHours(targetLon, homeLon));
    if (off === -12) off = 12;
    var targetHour = ((hour + off) % 24 + 24) % 24;

    // short-way arrow along the rim: home hand to target hand
    var aA = handAngle(hour), aB = handAngle(targetHour);
    dctx.strokeStyle = "#ffd76e"; dctx.lineWidth = 2.4;
    dctx.beginPath();
    dctx.arc(cx, cy, R * 0.86, aA - Math.PI / 2, aB - Math.PI / 2, off < 0);
    dctx.stroke();
    var tipA = aB - Math.PI / 2;
    drawHead(dctx, cx + R * 0.86 * Math.cos(tipA), cy + R * 0.86 * Math.sin(tipA),
      tipA + (off >= 0 ? Math.PI / 2 : -Math.PI / 2), "#ffd76e");

    // hands
    drawHand(dctx, cx, cy, R * 0.62, aA, "#9fd0ff", TL.CITIES[homeSel.value].name + " " + zfmt24(hour, 0));
    drawHand(dctx, cx, cy, R * 0.44, aB, "#7fe3a8", TL.CITIES[targetSel.value].name + " " + zfmt24(targetHour, 0));
    dctx.fillStyle = "#e6edf8";
    dctx.beginPath(); dctx.arc(cx, cy, 4, 0, 6.29); dctx.fill();
  }
  function drawHand(ctx, cx, cy, r, ang, col, label) {
    var x = cx + r * Math.sin(ang), y = cy - r * Math.cos(ang);
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = col; ctx.font = "10.5px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(label, x, y - 6);
  }
  function drawHead(ctx, x, y, ang, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-7, -3.5); ctx.lineTo(-7, 3.5);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function updateClock() {
    var home = TL.CITIES[homeSel.value], target = TL.CITIES[targetSel.value];
    var hour = parseInt(hourRange.value, 10);
    $("hourRead").textContent = String(hour);
    var hPM = hour >= 12, h12 = hour % 12 || 12;
    var r = TL.convertClock(h12, 0, hPM, home.lon, target.lon);
    $("clockRead").textContent =
      home.name + " " + zfmt({ hour: h12, minute: 0, isPM: hPM }) +
      "   =   " + target.name + " " + zfmt(r);
    var shift = r.dayShift;
    var badge = $("dayRead");
    if (shift === 0) {
      badge.textContent = "same day";
      badge.style.color = "";
    } else {
      badge.textContent = (shift > 0 ? "+" : "-") + Math.abs(shift) + " day" +
        (Math.abs(shift) > 1 ? "s" : "") + (shift > 0 ? " (calendar moves forward)" : " (calendar moves back)");
      badge.style.color = "#ffb37a";
    }
    var wk = WEEK.map(function (d, i) {
      return "<span class='wk' data-d='" + i + "' style='padding:2px 6px;border-radius:6px;" +
        (i === 0 ? "background:#1d3a5f;" : "") + "'>" + d.slice(0, 3) + "</span>";
    });
    var homeDay = 0;
    var targetDay = (0 + shift % 7 + 7) % 7;
    wk[homeDay] = wk[homeDay].replace("background:#1d3a5f;", "background:#2c5a2e;font-weight:bold;");
    wk[targetDay] = wk[targetDay].replace(/background:[^;]+;/, "background:#5f3a1d;font-weight:bold;");
    $("weekRead").innerHTML = "home: " + wk.join(" ") +
      "   |   target lands on <strong>" + WEEK[targetDay] + "</strong>";
    drawDial();
  }

  // ---------- wire controls ----------
  function fillSelect(sel, chosen) {
    Object.keys(TL.CITIES).forEach(function (k) {
      var o = document.createElement("option");
      o.value = k; o.textContent = TL.CITIES[k].name;
      if (k === chosen) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", updateClock);
  }
  fillSelect(homeSel, "london");
  fillSelect(targetSel, "tokyo");
  hourRange.addEventListener("input", updateClock);

  // ---------- Check tab exercises ----------
  var EX = [
    {
      type: "numbers",
      q: "1. Graticule: click London on the flat map, then enter its latitude and longitude here, positive numbers with the letters already sorted out for you (north and west are expected). Tolerance 2 deg.",
      parts: [
        { label: "latitude (deg N)", unit: "deg N", value: 51.5, tolAbs: 2 },
        { label: "longitude (deg W)", unit: "deg W", value: 0.1, tolAbs: 2 }
      ],
      hints: ["London sits a little above the 45 deg mark up the left scale.", "The prime meridian runs through it, so longitude is almost 0."],
      working: "London is <strong>51.5 deg N, 0.1 deg W</strong>: the prime meridian passes through Greenwich, part of London, which is exactly why that meridian became longitude 0.",
      answer: "51.5 deg N, 0.1 deg W"
    },
    {
      type: "numbers",
      q: "2. Which meridian centers Tokyo's ideal 15-deg zone? Enter degrees east as a positive number.",
      parts: [{ unit: "deg E", value: 135, tolAbs: 0.5 }],
      hints: ["Tokyo is about 139.7 deg E. Divide by 15 and round.", "9 zones east of Greenwich, and each zone meridian is 15 deg apart."],
      working: "139.7 / 15 = 9.3, so Tokyo falls in zone +9, <strong>9 x 15 = 135 deg E</strong>. The city itself sits 4.7 deg east of its zone meridian, well inside the plus/minus 7.5 deg band.",
      answer: "135 deg E"
    },
    {
      type: "choice",
      correct: 3,
      q: "3. It is 3:00 PM in London. Same instant, what does Tokyo's clock and calendar say (ideal zones)?",
      options: [
        "6:00 AM the same day",
        "3:00 AM the next day",
        "2:00 PM the previous day",
        "12:00 AM (midnight) at the start of the next day"
      ],
      hints: ["London zone 0, Tokyo zone +9: Tokyo is 9 hours ahead.", "3 PM plus 9 h passes midnight, so the calendar rolls."],
      working: "15:00 + 9 h = 24:00 = <strong>midnight, day +1</strong>. Strictly the hour offset (9 h) never crosses the 180 date line here; the day change comes from passing midnight, the other half of the bookkeeping.",
      answer: "12:00 AM midnight, the next day"
    },
    {
      type: "choice",
      correct: 1,
      q: "4. It is 3:00 PM Friday in Tokyo. Same instant in New York (ideal zones)? Both date ledgers are in play: name the result the two ledgers leave behind.",
      options: [
        "1:00 AM Saturday",
        "1:00 AM Friday",
        "1:00 AM Thursday",
        "3:00 PM Thursday"
      ],
      hints: ["Tokyo +9, New York -5: 14 hours apart, and the short way crosses the Pacific, over the date line.", "Count the two ledgers separately: the hour walk passes one midnight, the date line crossing pulls one day back."],
      working: "The short road from Tokyo to New York runs east over the date line: 15:00 + 10 h fold = 25:00, which rolls past midnight (+1 day), then the eastward date-line crossing takes a day back (-1). Net: <strong>1:00 AM Friday</strong>. The two ledgers cancel, which is exactly why the manual drills them separately.",
      answer: "1:00 AM Friday (midnight plus, date line minus)"
    },
    {
      type: "numbers",
      q: "5. Tokyo's clock reads 11:00 AM on Wednesday. Same instant, what does New York's clock read (give the PM hour, e.g. 9) and what is the day shift in days?",
      parts: [
        { label: "New York clock (PM hour)", unit: "PM h", value: 9, tolAbs: 0 },
        { label: "day shift", unit: "days", value: -1, tolAbs: 0 }
      ],
      hints: ["11 AM plus the same 10-hour fold lands before midnight, so no midnight fee this time.", "Only one ledger moves: which one?"],
      working: "11:00 + 10 h fold = 21:00 without touching midnight, so the only day move is the eastward date-line crossing: <strong>9:00 PM Tuesday, day shift -1</strong>. Same fold as Q4, different starting hour, and the midnight ledger stays silent.",
      answer: "9 PM Tuesday, day shift -1"
    },
    {
      type: "numbers",
      q: "6. Same-parallel distance: Sydney (about 34 deg S, 151.2 E) and Tokyo (139.7 E) sit near the same latitude band. Measured along the parallel, how far apart are their meridians? Use 111 km per degree and the cos(latitude) squeeze. Enter km.",
      parts: [{ unit: "km", value: 1058, tolPct: 5 }],
      hints: ["1 deg of latitude is always ~111 km, but 1 deg of longitude is 111 x cos(lat).", "cos 34 = 0.829. The two cities differ in longitude by 151.2 - 139.7 = 11.5 deg."],
      working: "11.5 deg x 111 x cos(34 deg) = 11.5 x 92.0 = <strong>~1058 km</strong>. At latitude 34 a degree of longitude is only 83% of a degree of latitude; at the poles it shrinks to zero, which is why flat maps blow Antarctica up.",
      answer: "about 1058 km (plus or minus 5%)"
    },
    {
      type: "numbers",
      q: "7. Sun-transit (solar-time) gap: London (0 deg) and Cairo (31.2 E). When the Sun stands on Cairo's meridian, how many hours earlier did it stand on London's? Enter hours as a decimal.",
      parts: [{ unit: "h", value: 2.08, tolAbs: 0.15 }],
      hints: ["Solar time ignores zones entirely: it is just longitude / 15.", "31.2 / 15 = ?"],
      working: "31.2 / 15 = <strong>2.08 h</strong>, about 2 h 5 min. Cairo's sundial is always that far ahead of London's no matter what either city's legal clock says. Clock time and solar time disagree for two reasons: the zone you are locked into, and the distance to your zone meridian.",
      answer: "about 2.1 hours"
    },
    {
      type: "keywords",
      need: 2,
      q: "8. In your own words: you fly west from Los Angeles to Tokyo. Your old phone clock, still on LA time, says 11 PM; the airport board says it is 11 PM but the NEXT day. Name the two separate accounting steps the trip forces on you.",
      words: ["hour", "zone", "add", "clock", "midnight", "date line", "day", "calendar", "15", "west", "ahead", "east"],
      placeholder: "two plain ideas...",
      working: "Step 1, the clock: each 15-deg zone crossed while heading west winds the local hour forward (LA -8 to Tokyo +9 is 17 h of dial motion). Step 2, the calendar: crossing the date line westward <strong>adds a day</strong>. Hours and days are two different ledgers, and most wrong answers come from paying one bill twice or skipping the other.",
      answer: "zone hours on the clock + one added day at the date line"
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
  function resizeStages() {
    map.width = Math.round(Math.max(300, map.clientWidth || 480) * dpr);
    map.height = Math.round(MAP_H * dpr);
    dial.width = Math.round(Math.max(300, dial.clientWidth || 480) * dpr);
    dial.height = Math.round(DIAL_H * dpr);
    drawMap();
    drawDial();
  }
  window.addEventListener("resize", resizeStages);
  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  buildExercises();
  LS.check.init(LAB);
  resizeStages();
  updateClock();
})();
