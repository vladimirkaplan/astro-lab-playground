// Canvas scatter plot with a draggable best-fit-slope handle, used by the
// Hubble lab (and later labs reuse it). No dependencies beyond LS.fit.
//
//   var p = LS.plot.create(canvas, {xLabel, yLabel, xMax, yMax, ...});
//   p.setPoints([[x,y],...]); p.setStudentSlope(0.4);
//   p.onSlope = function (s) {...}; p.addMode(true);  // canvas clicks add points
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  function niceStep(range, targetTicks) {
    var raw = range / (targetTicks || 6);
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var norm = raw / mag;
    var step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    return step * mag;
  }

  function create(canvas, cfg) {
    cfg = cfg || {};
    var dpr = (root.devicePixelRatio || 1);
    var pts = [];
    var studentSlope = null;    // student's fit ray through origin (or + intercept)
    var studentIntercept = 0;
    var fitLine = null;         // {slope, intercept, label}
    var addOn = false;
    var drag = null;
    var pad = { l: 58, r: 16, t: 14, b: 44 };

    var view = {
      xMin: cfg.xMin || 0, xMax: cfg.xMax || 10,
      yMin: cfg.yMin || 0, yMax: cfg.yMax || 10
    };
    if (!cfg.yMinAuto) {} // reserved

    function resize() {
      var w = canvas.clientWidth || 480, h = canvas.clientHeight || 320;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      draw();
    }

    function px(x) {
      var w = canvas.width / dpr;
      return pad.l + (x - view.xMin) / (view.xMax - view.xMin) * (w - pad.l - pad.r);
    }
    function py(y) {
      var h = canvas.height / dpr;
      return (h - pad.b) - (y - view.yMin) / (view.yMax - view.yMin) * (h - pad.t - pad.b);
    }
    function invX(pxv) {
      var w = canvas.width / dpr;
      return view.xMin + (pxv - pad.l) / (w - pad.l - pad.r) * (view.xMax - view.xMin);
    }
    function invY(pyv) {
      var h = canvas.height / dpr;
      return view.yMin + ((h - pad.b) - pyv) / (h - pad.t - pad.b) * (view.yMax - view.yMin);
    }

    function handlePos() {
      // Anchor the drag handle near 88% of the plot width, on the student line.
      var hx = view.xMin + 0.88 * (view.xMax - view.xMin);
      var hy = studentSlope * hx + studentIntercept;
      hy = Math.max(view.yMin, Math.min(view.yMax, hy));
      if (studentSlope !== null) hx = Math.max(0.05 * (view.xMax - view.xMin), (hy - studentIntercept) / studentSlope);
      return { x: hx, y: studentSlope * hx + studentIntercept };
    }

    function draw() {
      var ctx = canvas.getContext("2d");
      var w = canvas.width / dpr, h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);

      // grid + tick labels
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      var step = niceStep(view.xMax - view.xMin, 7);
      for (var gx = Math.ceil(view.xMin / step) * step; gx <= view.xMax + 1e-9; gx += step) {
        var xp = px(gx);
        ctx.strokeStyle = "#e8ebf2";
        ctx.beginPath(); ctx.moveTo(xp, pad.t); ctx.lineTo(xp, h - pad.b); ctx.stroke();
        ctx.fillStyle = "#667";
        ctx.fillText(String(Math.round(gx * 100) / 100), xp, h - pad.b + 5);
      }
      var stepY = niceStep(view.yMax - view.yMin, 6);
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (var gy = Math.ceil(view.yMin / stepY) * stepY; gy <= view.yMax + 1e-9; gy += stepY) {
        var yp = py(gy);
        ctx.strokeStyle = "#e8ebf2";
        ctx.beginPath(); ctx.moveTo(pad.l, yp); ctx.lineTo(w - pad.r, yp); ctx.stroke();
        ctx.fillStyle = "#667";
        ctx.fillText(String(Math.round(gy * 100) / 100), pad.l - 6, yp);
      }

      // axes
      ctx.strokeStyle = "#334"; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, h - pad.b); ctx.lineTo(w - pad.r, h - pad.b);
      ctx.stroke();

      // axis labels
      ctx.fillStyle = "#223"; ctx.font = "12.5px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText(cfg.xLabel || "x", (pad.l + w - pad.r) / 2, h - 4);
      ctx.save();
      ctx.translate(13, (pad.t + h - pad.b) / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText(cfg.yLabel || "y", 0, 0);
      ctx.restore();

      // computer fit line
      if (fitLine) {
        ctx.strokeStyle = "#2b7de0"; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
        line(ctx, fitLine.slope, fitLine.intercept);
        ctx.setLineDash([]);
        ctx.fillStyle = "#2b7de0"; ctx.textAlign = "left"; ctx.textBaseline = "top";
        if (fitLine.label) ctx.fillText(fitLine.label, pad.l + 10, pad.t + 6);
      }

      // student line + handle
      if (studentSlope !== null) {
        ctx.strokeStyle = "#d33"; ctx.lineWidth = 2.4;
        line(ctx, studentSlope, studentIntercept);
        var hp = handlePos();
        ctx.beginPath();
        ctx.arc(px(hp.x), py(hp.y), 8, 0, Math.PI * 2);
        ctx.fillStyle = "#d33"; ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
      }

      // points
      pts.forEach(function (p) {
        ctx.beginPath();
        ctx.arc(px(p[0]), py(p[1]), 5, 0, Math.PI * 2);
        ctx.fillStyle = "#19243b"; ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
      });

      if (addOn) {
        ctx.fillStyle = "#8a5a00"; ctx.font = "12px system-ui, sans-serif";
        ctx.textAlign = "right"; ctx.textBaseline = "top";
        ctx.fillText("click: place a point", w - pad.r - 6, pad.t + 4);
      }
    }

    function line(ctx, slope, intercept) {
      var ctx2 = ctx;
      var h = canvas.height / dpr, w = canvas.width / dpr;
      var y1 = slope * view.xMin + intercept, y2 = slope * view.xMax + intercept;
      var x1 = view.xMin, x2 = view.xMax;
      // clip the ray to the drawn box
      var ptsClip = [];
      [[x1, y1], [x2, y2]].forEach(function (p) {
        if (p[1] < view.yMin) { p = [(view.yMin - intercept) / slope, view.yMin]; }
        else if (p[1] > view.yMax) { p = [(view.yMax - intercept) / slope, view.yMax]; }
        ptsClip.push(p);
      });
      if (!(isFinite(ptsClip[0][1]) && isFinite(ptsClip[1][1]))) return;
      ctx2.beginPath();
      ctx2.moveTo(px(ptsClip[0][0]), py(ptsClip[0][1]));
      ctx2.lineTo(px(ptsClip[1][0]), py(ptsClip[1][1]));
      ctx2.stroke();
    }

    function evtPos(ev) {
      var r = canvas.getBoundingClientRect();
      var t = ev.touches ? ev.touches[0] : ev;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    }

    canvas.addEventListener("pointerdown", function (ev) {
      var pos = evtPos(ev);
      if (studentSlope !== null) {
        var hp = handlePos();
        var dx = pos.x - px(hp.x), dy = pos.y - py(hp.y);
        if (dx * dx + dy * dy < 15 * 15) {
          drag = true;
          canvas.setPointerCapture(ev.pointerId);
          return;
        }
      }
      if (addOn && pos.x > pad.l && pos.y < canvas.height / dpr - pad.b) {
        pts.push([Math.max(0, invX(pos.x)), Math.max(0, invY(pos.y))]);
        draw();
        if (api.onPointsChanged) api.onPointsChanged(pts);
      }
    });
    canvas.addEventListener("pointermove", function (ev) {
      if (!drag) return;
      var pos = evtPos(ev);
      var x = invX(pos.x), y = invY(pos.y);
      if (x > 0.02 * (view.xMax - view.xMin)) {
        studentSlope = Math.max(0, (y - studentIntercept) / x);
        if (api.onSlope) api.onSlope(studentSlope);
        draw();
      }
    });
    canvas.addEventListener("pointerup", function () { drag = null; });

    var api = {
      points: function () { return pts.slice(); },
      setPoints: function (list) { pts = list.slice(); draw(); },
      clearPoints: function () { pts = []; draw(); },
      addMode: function (on) { addOn = !!on; draw(); },
      setStudentSlope: function (s, intercept) {
        studentSlope = s;
        studentIntercept = intercept || 0;
        draw();
      },
      studentSlope: function () { return studentSlope; },
      setFitLine: function (slope, intercept, label) {
        fitLine = slope === null ? null : { slope: slope, intercept: intercept || 0, label: label || "computer fit" };
        draw();
      },
      autoscale: function (padFrac) {
        if (!pts.length) return;
        var xmax = 0, ymax = 0;
        pts.forEach(function (p) { if (p[0] > xmax) xmax = p[0]; if (p[1] > ymax) ymax = p[1]; });
        var pf = padFrac || 1.08;
        view.xMax = Math.max(1e-9, xmax * pf);
        view.yMax = Math.max(1e-9, ymax * pf);
        draw();
      },
      fitRange: function (xLo, yLo) {
        view.xMax = xLo; view.yMax = yLo; draw();
      },
      draw: draw,
      onSlope: null,
      onPointsChanged: null
    };
    if (root.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    resize();
    return api;
  }

  root.LS.plot = { create: create };
})(typeof globalThis !== "undefined" ? globalThis : window);
