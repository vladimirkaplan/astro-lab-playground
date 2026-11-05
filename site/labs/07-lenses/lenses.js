// Lab 7 pure optics: thin lens equation, magnification, two-lens systems,
// the afocal telescope, and a blur helper. Sign convention: light travels
// left to right; real images have positive image distance (right of lens),
// virtual images negative (left of lens, same side as the object).
// All distances in cm as handled on the course bench.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var FAR = Infinity;

  // Image distance for one thin lens. Infinity in (distant object) gives f.
  function imageDist(f, dO) {
    if (dO === FAR) return f;
    var inv = 1 / f - 1 / dO;
    return inv === 0 ? Infinity : 1 / inv;
  }

  // Lateral magnification (negative = inverted).
  function magn(f, dO) {
    if (dO === FAR) return 0;      // point-like: real sun image is tiny but finite
    return -imageDist(f, dO) / dO;
  }

  // -1 = perfectly sharp, 0 = heavily blurred on a screen at screenPos.
  function sharpness(screenPos, di) {
    if (!isFinite(di)) return 0;
    var blur = Math.abs(screenPos - di);
    return 1 / (1 + blur * blur / 90);   // ~3 cm off already looks soft
  }

  // Two lenses on the axis. sep = lens2 x minus lens1 x. The image of lens 1
  // becomes the object of lens 2 (virtual object allowed when di1 > sep).
  // Returns null when an intermediate object sits exactly on a focal point.
  function system(f1, dO, sep, f2) {
    var di1 = imageDist(f1, dO);
    var m1 = magn(f1, dO);
    if (!isFinite(di1)) return null;
    var dO2 = sep - di1;
    if (dO2 === 0) return null;                    // object at lens 2
    var di2 = imageDist(f2, dO2);
    // afocal: intermediate image lands on lens 2's focal point -> exit parallel
    var afocal = Math.abs(dO2 - f2) < 1e-6;
    var di2u = afocal ? Infinity : imageDist(f2, dO2);
    var m2 = afocal ? null : -di2u / dO2;
    return {
      di1: di1, m1: m1,
      dO2: dO2, di2: di2u, m2: m2,
      afocal: afocal,
      finalReal: isFinite(di2u) ? di2u > 0 : "parallel",
      totalM: m2 === null ? null : m1 * m2
    };
  }

  // Keplerian telescope, relaxed eye: lenses fO and fE spaced fO + fE.
  function telescope(fO, fE) {
    return {
      M: fO / fE,              // angular magnification (magnitude)
      inverted: true,          // Keplerian tubes flip the view
      tube: fO + fE            // lens spacing, cm
    };
  }

  // Angular magnification done honestly from geometry: angle the exit beam
  // makes vs the naked-eye angle. Must reproduce M = -fO/fE when afocal
  // (negative = Keplerian inversion).
  function rayAngles(fO, fE, objAngleDeg) {
    // Parallel bundle of slope tan(a) through the objective focuses in the
    // shared focal plane at y = +fO*tan(a); the eyepiece turns that field
    // point into an exit bundle of slope -y/fE, hence the inverted image.
    var a = objAngleDeg * Math.PI / 180;
    var y = fO * Math.tan(a);
    var b = Math.atan(-y / fE);
    return { naked: objAngleDeg, exit: b * 180 / Math.PI };
  }

  root.LS.lenses = {
    FAR: FAR,
    imageDist: imageDist,
    magn: magn,
    sharpness: sharpness,
    system: system,
    telescope: telescope,
    rayAngles: rayAngles
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
