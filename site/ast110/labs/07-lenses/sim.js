// Lab 7 sim: thin-lens bench with a sliding card, ray diagram, and a
// telescope view that measures magnification from actual beam angles.
(function () {
  "use strict";
  var LS = window.LS, U = LS.units, K = LS.lenses;
  var LAB = "07-lenses";
  var mode = LS.ui.getMode(LAB);
  var $ = function (id) { return document.getElementById(id); };

  var view = "single";
  var H = 4;                 // object arrow height on the bench, cm
  var st = { f: 20, do: 30, screen: 60, objF: 100, eyeF: 20, eyeMode: "relaxed" };
  var rows = [];
  try {
    var sv = LS.store.load(LAB, "setups");
    if (sv && sv.rows) rows = sv.rows;
  } catch (e) {}

  function curDi() {
    var dO = st.do === "far" ? Infinity : st.do;
    return K.imageDist(st.f, dO);
  }
  function curM() {
    var dO = st.do === "far" ? Infinity : st.do;
    return K.magn(st.f, dO);
  }

  // ---------- single-lens stage ----------
  var stage = $("stage"), sctx = stage.getContext("2d");
  var scope = $("stage2"), xctx = scope.getContext("2d");
  var dpr = window.devicePixelRatio || 1;
  var STAGE_H = 360;

  function span() {
    var xL = -75, xR = 112;
    var di = curDi();
    if (di > 0 && isFinite(di) && di + 12 > xR) xR = di + 15;
    return { L: xL, R: xR };
  }

  function draw() {
    var sp = span();
    var w = stage.width / dpr, h = STAGE_H;
    var midY = h * 0.42;
    var px = function (x) { return (x - sp.L) / (sp.R - sp.L) * (w - 24) + 12; };
    var sc = (px(1) - px(0));
    var hs = function (cm) { return cm * sc * 1.05; };

    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, w, h);
    sctx.fillStyle = "#f7f9fc";
    sctx.fillRect(0, 0, w, h);

    // optical axis + bench ruler
    sctx.strokeStyle = "#98a4b8"; sctx.lineWidth = 1;
    sctx.beginPath(); sctx.moveTo(6, midY); sctx.lineTo(w - 6, midY); sctx.stroke();
    sctx.fillStyle = "#7d8aa0"; sctx.font = "9.5px system-ui, sans-serif";
    sctx.textAlign = "center"; sctx.textBaseline = "top";
    for (var t = Math.ceil(sp.L / 10) * 10; t <= sp.R; t += 10) {
      if (t === 0) continue;
      sctx.fillText(String(t), px(t), midY + 58);
    }

    // lens
    sctx.strokeStyle = "#2b7de0"; sctx.lineWidth = 3.2;
    sctx.beginPath(); sctx.moveTo(px(0), midY - hs(5.2)); sctx.lineTo(px(0), midY + hs(5.2)); sctx.stroke();
    sctx.strokeStyle = "#2b7de0"; sctx.lineWidth = 1.6;
    [-1, 1].forEach(function (u) {
      var ye = midY + u * hs(5.2);
      sctx.beginPath();
      sctx.moveTo(px(0) - 6, ye - u * 8);
      sctx.lineTo(px(0), ye);
      sctx.lineTo(px(0) + 6, ye - u * 8);
      sctx.stroke();
    });
    sctx.fillStyle = "#33507f"; sctx.font = "11.5px system-ui, sans-serif";
    sctx.fillText("f = " + st.f, px(0), midY - hs(5.2) - 16);
    // focal ticks
    sctx.fillStyle = "#8fa4c9";
    [-st.f, st.f].forEach(function (fx) {
      if (fx < sp.L || fx > sp.R) return;
      sctx.beginPath(); sctx.arc(px(fx), midY, 3, 0, 6.29); sctx.fill();
      sctx.fillText((fx / Math.abs(fx)) < 0 ? "F" : "F'", px(fx), midY + 40);
    });

    var far = st.do === "far";
    var xO = far ? -62 : -st.do;
    var dOreal = far ? Infinity : st.do;
    var di = curDi(), m = curM();
    var tipY = midY - hs(H);

    // object arrow
    arrow(sctx, px(xO), midY, tipY, "#19243b", far ? "far object" : "object");

    if (!far) {
      // ray 1: straight through the lens center
      var slope1 = (0 - tipY) / (px(0) - px(xO));
      seg(tipY, px(xO), slope1, px(sp.R), "#d9822b", true);
      // ray 2: parallel to axis, then aimed at the far focus F'
      var slope2 = (0 - tipY) / (px(st.f) - px(0));
      sctx.strokeStyle = "#c23b3b"; sctx.lineWidth = 1.6;
      sctx.beginPath(); sctx.moveTo(px(xO), tipY); sctx.lineTo(px(0), tipY); sctx.stroke();
      seg(tipY, px(0), slope2, px(sp.R), "#c23b3b", true);

      if (di > 0 && isFinite(di)) {
        // real image arrow at di (clamped to stay near the visible bench)
        var rawTip = midY - hs(H * m);
        var imgTip = Math.max(-30, Math.min(STAGE_H + 30, rawTip));
        arrow(sctx, px(di), midY, imgTip, "#c23b3b", "image " + U.round(H * m, 1) + " cm");
      } else if (isFinite(di)) {
        // virtual: dashed back-extensions meet at the virtual image
        sctx.setLineDash([4, 4]);
        sctx.strokeStyle = "#9a9aa8"; sctx.lineWidth = 1.4;
        var backX = px(di), backTip = midY - hs(Math.abs(m) * H);
        // back-extension of the center ray (uphill leftward toward o = ndi)
        sctx.beginPath(); sctx.moveTo(px(0), midY); sctx.lineTo(backX, backTip); sctx.stroke();
        // ray-2 back extension: from (0, tipY) along slope2 backward
        sctx.beginPath();
        sctx.moveTo(px(0), tipY);
        sctx.lineTo(backX, tipY + slope2 * (backX - px(0)));
        sctx.stroke();
        sctx.setLineDash([]);
        arrow(sctx, backX, midY, backTip, "#8a5ad0", "virtual x" + U.round(Math.abs(m), 1));
      }

      // card
      var sharp = K.sharpness(st.screen, di);
      var cxp = px(st.screen);
      sctx.fillStyle = "#e8e2d4"; sctx.strokeStyle = "#b7ab90"; sctx.lineWidth = 2;
      sctx.fillRect(cxp - 3, midY - hs(6), 6, hs(12));
      sctx.strokeRect(cxp - 3, midY - hs(6), 6, hs(12));
      if (di > 0 && isFinite(di)) {
        // spot = gap between the two principal rays where they cross the card
        var yAt = [tipY + slope1 * (px(st.screen) - px(xO)),
                   tipY + slope2 * (px(st.screen) - px(0))];
        // spread between the two rays at the card = spot size proxy
        var spread = Math.abs(yAt[0] - yAt[1]);
        sctx.fillStyle = "rgba(216,146,43," + (0.25 + 0.7 * sharp).toFixed(2) + ")";
        sctx.beginPath();
        sctx.arc(cxp, (yAt[0] + yAt[1]) / 2, Math.max(1.6, spread / 2), 0, 6.29);
        sctx.fill();
        $("blurRead").textContent = sharp > 0.985 ? "SHARP - smallest spot" :
          "blurry (sharpness " + Math.round(sharp * 100) + "%)";
      } else {
        $("blurRead").textContent = "card never sharpens: virtual image";
      }
    } else {
      // far object: parallel bundle, focuses at f
      [-1.2, 0, 1.2].forEach(function (off) {
        var y = midY - off * hs(1.5);
        sctx.strokeStyle = "#c23b3b"; sctx.lineWidth = 1.4;
        sctx.beginPath(); sctx.moveTo(px(sp.L + 4), y); sctx.lineTo(px(0), y); sctx.stroke();
        var pxE = px(Math.min(sp.R, st.f * 2.1));
        if (off === 0) {
          sctx.beginPath(); sctx.moveTo(px(0), y); sctx.lineTo(pxE, y); sctx.stroke();
        } else {
          sctx.beginPath();
          sctx.moveTo(px(0), y);
          sctx.lineTo(px(st.f), midY);
          sctx.lineTo(pxE, midY + (midY - y) * ((pxE - px(st.f)) / (px(st.f) - px(0))));
          sctx.stroke();
        }
      });
      var sharpF = K.sharpness(st.screen, st.f);
      $("blurRead").textContent = sharpF > 0.985 ? "SHARP - smallest spot" :
        "blurry (sharpness " + Math.round(sharpF * 100) + "%)";
    }

    function seg(y0, x0, slope, x1, col, dash) {
      sctx.strokeStyle = col; sctx.lineWidth = 1.6;
      if (dash) sctx.setLineDash([]);
      sctx.beginPath();
      sctx.moveTo(x0, y0);
      sctx.lineTo(x1, y0 + slope * (x1 - x0));
      sctx.stroke();
    }
  }

  function arrow(ctx, x, y0, yTip, col, label) {
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, yTip); ctx.stroke();
    var dir = yTip < y0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(x, yTip); ctx.lineTo(x - 4, yTip + 7 * dir); ctx.lineTo(x + 4, yTip + 7 * dir);
    ctx.closePath(); ctx.fill();
    ctx.font = "10.5px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(label, x, Math.min(yTip, y0) - 10);
  }

  // ---------- readouts + table ----------
  function readouts() {
    var di = curDi();
    $("diRead").textContent = isFinite(di)
      ? U.round(di, 1) + " cm" + (di < 0 ? " (virtual, same side as the object)" : "") +
        "  |  predicted m = " + U.round(curM(), 2)
      : "no image forms (object exactly on F): the lens spits parallel light";
  }
  var HEADER = ["f_cm", "do_cm", "screen_cm", "sharp_percent", "di_pred_cm", "m_pred"];
  function renderTable() {
    if (!rows.length) { $("dataTable").innerHTML = ""; return; }
    $("dataTable").innerHTML = LS.store.tableHTML(
      ["f (cm)", "d_o (cm)", "card (cm)", "sharpness %", "d_i predicted", "m predicted"], rows);
  }
  $("logBtn").addEventListener("click", function () {
    var di = curDi();
    rows.push([st.f, st.do, st.screen,
      Math.round(K.sharpness(st.screen, di) * 100),
      isFinite(di) ? U.round(di, 1) : "parallel",
      isFinite(curM()) ? U.round(curM(), 2) : "-"]);
    LS.store.save(LAB, "setups", HEADER, rows);
    renderTable();
  });
  $("clearTable").addEventListener("click", function () {
    rows = []; LS.store.clear(LAB, "setups"); renderTable();
  });
  $("exportCsv").addEventListener("click", function () {
    LS.store.exportCSV("lab07-lens-setups.csv", HEADER, rows, $("csvCopy"));
  });

  // ---------- controls ----------
  function jumpCardToImage() {
    var di = curDi();
    if (isFinite(di) && di > 0) {
      st.screen = Math.min(105, Math.max(5, Math.round(di)));
      $("scrRange").value = String(st.screen);
      $("scrRead").textContent = st.screen + " cm";
    }
  }
  $("fPick").addEventListener("change", function (e) { st.f = +e.target.value; jumpCardToImage(); sync(); });
  $("doPick").addEventListener("change", function (e) {
    var v = e.target.value;
    st.do = v === "far" ? "far" : +v;
    jumpCardToImage();
    sync();
  });
  $("scrRange").addEventListener("input", function (e) {
    st.screen = +e.target.value;
    $("scrRead").textContent = st.screen + " cm";
    draw();
  });
  $("autoFocus").addEventListener("click", function () {
    var di = curDi();
    if (!isFinite(di) || di <= 0) return;
    st.screen = Math.round(Math.min(105, Math.max(5, di)));
    $("scrRange").value = String(st.screen);
    sync();
  });
  $("objPick").addEventListener("change", function (e) { st.objF = +e.target.value; drawScope(); scopeRead(); });
  $("eyePick").addEventListener("change", function (e) { st.eyeF = +e.target.value; drawScope(); scopeRead(); });
  $("eyeMode").addEventListener("change", function (e) { st.eyeMode = e.target.value; drawScope(); scopeRead(); });

  function sync() { draw(); readouts(); }

  // ---------- telescope view ----------
  function drawScope() {
    var w = scope.width / dpr, h = STAGE_H;
    var mid = h * 0.44;
    xctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    xctx.clearRect(0, 0, w, h);
    xctx.fillStyle = "#f7f9fc";
    xctx.fillRect(0, 0, w, h);
    xctx.strokeStyle = "#98a4b8";
    xctx.beginPath(); xctx.moveTo(6, mid); xctx.lineTo(w - 6, mid); xctx.stroke();

    var fO = st.objF, fE = st.eyeF;
    var spacing = fO + (st.eyeMode === "relaxed" ? fE : fE * 0.72);
    var x0 = 46, x1 = x0 + fO;                        // objective at x0, eyepiece x1
    var total = x0 + fO + fE * 2.4 + 60;
    var S = Math.min(1, (w - 30) / total);
    function X(x) { return 12 + x * S; }
    var lensH = 74;

    // Object at infinity, tilted 2 degrees "up": the objective focuses the
    // parallel bundle in the shared focal plane at o = -fO*tan(a): below the
    // axis, because the real image is inverted. The eyepiece (spaced fO + fE)
    // turns that field point back into a parallel bundle whose angle carries
    // the magnification: tan(b) = -o/fE = -(fO/fE)*tan(a).
    var M = fO / fE;
    var aD = 10;                                   // exaggerated entry tilt, deg
    var a = aD * Math.PI / 180;
    var oOff = -fO * Math.tan(a);                  // focal-plane offset (px): below axis
    // beam heights where they cross the objective plane (parallel entry bundle)
    var lensHeights = [oOff - 40, oOff, oOff + 40];
    var relax = st.eyeMode === "relaxed";
    var epX = x0 + spacing;                        // eyepiece position, cm-axis
    var tailX = epX + 120;
    // the intermediate image point every ray converges to:
    var imgY = mid + oOff, imgX = x0 + fO;
    lensHeights.forEach(function (hL) {
      xctx.strokeStyle = "#c23b3b"; xctx.lineWidth = 1.4;
      // incoming parallel stub (40 cm beam before the objective)
      xctx.beginPath();
      xctx.moveTo(X(x0 - 40), mid + hL - Math.tan(a) * 40);
      xctx.lineTo(X(x0), mid + hL);
      xctx.stroke();
      // refracted: converges to the shared focal-plane point
      xctx.beginPath();
      xctx.moveTo(X(x0), mid + hL);
      xctx.lineTo(X(imgX), imgY);
      xctx.stroke();
      if (relax) {
        var tanB = (imgY - mid) / fE;              // exit beam slope (= -M*tan a)
        xctx.strokeStyle = "#d9822b";
        xctx.beginPath();
        xctx.moveTo(X(imgX), imgY);
        xctx.lineTo(X(tailX), imgY + tanB * (tailX - imgX));
        xctx.stroke();
      } else {
        // mis-spaced eyepiece: the cone keeps converging right into the eye
        xctx.strokeStyle = "#d9822b";
        xctx.beginPath();
        xctx.moveTo(X(imgX), imgY);
        xctx.lineTo(X(epX + 60), imgY + (imgY - mid) * -0.6);
        xctx.stroke();
      }
    });
    // intermediate image marker at the shared focal plane
    xctx.fillStyle = "#19243b";
    xctx.beginPath(); xctx.arc(X(imgX), imgY, 3, 0, 6.29); xctx.fill();
    xctx.font = "10px system-ui, sans-serif";
    xctx.fillText("inverted real image", X(imgX) - 30, imgY + 12);
    // lenses
    [[x0, fO, "objective " + fO], [x1, fE, "eyepiece " + fE]].forEach(function (L) {
      xctx.strokeStyle = "#2b7de0"; xctx.lineWidth = 3;
      xctx.beginPath(); xctx.moveTo(X(L[0]), mid - lensH); xctx.lineTo(X(L[0]), mid + lensH); xctx.stroke();
      xctx.fillStyle = "#33507f"; xctx.font = "11px system-ui, sans-serif";
      xctx.fillText(L[2], X(L[0]), mid - lensH - 14);
    });
    // spacing + eye
    xctx.fillStyle = "#7d8aa0";
    xctx.fillText("tube " + spacing + " cm", (X(x0) + X(x1)) / 2, mid + lensH + 16);
    xctx.font = "20px system-ui, sans-serif";
    xctx.fillText("eye", X(x1) + 44, mid - 4);
  }
  function scopeRead() {
    var g = K.rayAngles(st.objF, st.eyeF, 2);
    var t = K.telescope(st.objF, st.eyeF);
    if (st.eyeMode === "relaxed") {
      $("angRead").textContent = "naked 2.0 deg (about 25 cm away)  ->  in-tube " +
        (-g.exit).toFixed(1) + " deg but upside down";
    } else {
      $("angRead").textContent = "eyepiece " + Math.round(st.eyeF * 0.28) +
        " cm close to focus: the exit cone converges - your eye strains, image swims. At the correct " +
        t.tube + " cm tube length (f_O + f_E) the beam is parallel AND " + t.M + "x wider in angle.";
    }
  }

  // ---------- view switching ----------
  function showView(v) {
    view = v;
    $("singleView").hidden = v !== "single";
    $("scopeView").hidden = v !== "scope";
    $("modeSingle").className = "action" + (v !== "single" ? " ghost" : "");
    $("modeScope").className = "action" + (v !== "scope" ? " ghost" : "");
    resizeAll();
  }
  $("modeSingle").addEventListener("click", function () { showView("single"); });
  $("modeScope").addEventListener("click", function () { showView("scope"); });

  // ---------- resize + boot ----------
  function resizeAll() {
    if (view === "single" || true) {
      stage.width = Math.round(Math.max(320, stage.clientWidth || 480) * dpr);
      stage.height = Math.round(STAGE_H * dpr);
      draw();
    }
    if (view === "scope") {
      scope.width = Math.round(Math.max(320, scope.clientWidth || 480) * dpr);
      scope.height = Math.round(STAGE_H * dpr);
      drawScope();
    }
  }
  window.addEventListener("resize", resizeAll);

  LS.ui.banner(document.querySelector("main"));
  LS.ui.initTabs();
  LS.ui.modeToggle(LAB, $("toolbar1"), function (m) { mode = m; });
  LS.check.init(LAB);

  renderTable();
  readouts();
  resizeAll();
  drawScope();
  scopeRead();
})();
