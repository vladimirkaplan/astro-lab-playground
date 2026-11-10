// Lab 15 pure math: balloon-universe layout, string measurements, velocities,
// and the synthetic cosmic data set. No DOM here; Node tests this file.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var B = {};

  // Deterministic galaxy layout on the balloon circumference (angles in deg,
  // clockwise from the reference galaxy at 0).
  B.makeLayout = function (seed) {
    var rnd = root.LS.units.mulberry32(seed);
    var angles = [];
    for (var i = 0; i < 9; i++) {
      angles.push(Math.round(12 + rnd() * 156));  // 12..168 deg apart
    }
    // nudge apart anything too close so labels never overlap
    angles.sort(function (a, b) { return a - b; });
    for (var j = 1; j < angles.length; j++) {
      if (angles[j] - angles[j - 1] < 7) angles[j] = angles[j - 1] + 7;
    }
    return angles;
  };

  // Surface distance (cm of string along the balloon skin) between the
  // reference and each galaxy at circumference circumferenceCm.
  B.arcDistances = function (circumferenceCm, anglesDeg) {
    return anglesDeg.map(function (a) {
      return circumferenceCm * (a / 360);
    });
  };

  // "String" measurement with optional instrument noise (worn string + ruler).
  B.measureAll = function (trueDistCm, noiseAmp, rnd) {
    return trueDistCm.map(function (d) {
      var v = d;
      if (noiseAmp > 0) {
        v += (rnd() + rnd() - 1) * noiseAmp + d * (rnd() - 0.5) * noiseAmp * 0.06;
      }
      return Math.round(v * 100) / 100;
    });
  };

  // v = (d2 - d1) / t   (cm per second on the balloon)
  B.velocities = function (d1, d2, tSec) {
    return d1.map(function (_, i) {
      return Math.round(((d2[i] - d1[i]) / tSec) * 1000) / 1000;
    });
  };

  // Balloon-book constants used by both sim and tests:
  // radius factor a over inflation time t gives H_balloon = (a-1)/(a*t),
  // and the 1/H "age" reads a*t/(a-1): t plus time already spent expanding.
  B.hubbleFromInflation = function (a, tSec) { return (a - 1) / (a * tSec); };
  B.ageFromInflation = function (a, tSec) { return (a * tSec) / (a - 1); };

  // Synthetic cosmic sample: recessional velocity vs distance. Clearly
  // synthetic (labelled GA-1..): v = H0*d plus peculiar velocities, matching
  // what real surveys show without pretending to cite specific galaxies.
  B.cosmicSample = function (H0, noiseMkms, seed) {
    var rnd = root.LS.units.mulberry32(seed);
    var dists = [22, 35, 48, 61, 88, 112, 146, 205, 262, 341];
    return dists.map(function (d, i) {
      var peculiar = (rnd() + rnd() - 1) * 2 * noiseMkms;
      return {
        name: "GA-" + (i + 1),
        distanceMpc: d,
        velocityKmS: Math.round(H0 * d + peculiar)
      };
    });
  };

  root.LS.balloon = B;
})(typeof globalThis !== "undefined" ? globalThis : window);
