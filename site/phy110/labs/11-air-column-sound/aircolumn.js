// PHY110 Lab 11 maths: speed of sound from a resonance tube.
// v = f*lambda. A tube closed at one end resonates near the odd quarter
// wavelengths: L near lambda/4, 3*lambda/4, with an open-end correction.
// lambda = 2*(L2 - L1): the difference method cancels the open-end correction.
// Accepted speed, printed form: v_T = 331.5 + 0.6*T_air (m/s, T in C).
//
// Printed: the temperature law (331.5 m/s and 0.6 m/s per C), the question
// temperatures 2 C against a room of 25 C, dry air (humidity correction not
// specified, ignored and said so). Not printed, shown in the drawer: the fork
// frequencies 512 Hz and 440 Hz are physical and stamped on each fork, and the
// 4 cm tube diameter the sim assumes for the 0.3*d open-end correction.
// Honesty: the loudness maximum is broad (±1-2 cm of position uncertainty);
// forks drop slightly in pitch when held and carry maker tolerance; level
// parallax, the meniscus, and a ruler zero off the mouth shift readings; a
// clean sim view is idealized, a real lab's noise masks the maximum.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var O = {};

  // ---------- course constants ----------
  O.V0 = 331.5;             // m/s at 0 C, printed law
  O.SLOPE = 0.6;            // m/s per C, printed law
  O.T_ROOM = 25;            // C, the printed room
  O.T_COLD = 2;             // C, the printed question temperature
  O.FORKS = Object.freeze([
    { id: "512", hz: 512 },
    { id: "440", hz: 440 }
  ]);
  // not printed: the sim's own tube and its end correction
  O.TUBE_DIAMETER_CM = 4;
  O.END_CORR_M = 0.3 * O.TUBE_DIAMETER_CM / 100;   // 1.2 cm, as metres

  // ---------- the physics ----------
  O.vTemp = function (Tc) { return O.V0 + O.SLOPE * Tc; };
  O.wavelength = function (f, v) {
    if (!f || !v) return NaN;
    return v / f;
  };
  // the difference method: node spacing is lambda/2
  O.lambdaFromSpacing = function (L1, L2) {         // metres in, metres out
    if (!isFinite(L1) || !isFinite(L2) || !(L2 > L1)) return NaN;
    return 2 * (L2 - L1);
  };
  O.speedFromFork = function (f, L1, L2) {
    var lam = O.lambdaFromSpacing(L1, L2);
    return isFinite(lam) ? f * lam : NaN;
  };
  O.nodeSpacing = function (f, v) {
    var lam = O.wavelength(f, v);
    return isFinite(lam) ? lam / 2 : NaN;
  };
  // ideal resonance positions in metres, with the end correction
  // harmonic 1 -> lambda/4, harmonic 3 -> 3*lambda/4
  O.resonanceL = function (f, v, harmonic) {
    var lam = O.wavelength(f, v);
    if (!isFinite(lam)) return NaN;
    return (harmonic * lam) / 4 + O.END_CORR_M;
  };
  // first resonance without the correction: the lambda/4 estimate
  O.firstResonanceEstimate = function (f, v) {
    var lam = O.wavelength(f, v);
    return isFinite(lam) ? lam / 4 : NaN;
  };
  O.average = function (a, b) {
    if (!isFinite(a) || !isFinite(b)) return NaN;
    return (a + b) / 2;
  };
  O.pctError = function (measured, accepted) {
    if (!accepted) return NaN;
    return Math.abs(measured - accepted) / Math.abs(accepted) * 100;
  };

  // ---------- the honest instrument ----------
  O.LOUD_WIDTH_CM = 5;      // the broad maximum, in cm from the peak
  O.RULER_JITTER_CM = 0.2;  // +-0.2 cm parallax on a logged level, Fun Mode
  // loudness 0..1 at a water level Lcm for fork frequency f at speed v
  O.loudness = function (Lcm, f, v, widthCm) {
    var s = 0;
    [1, 3].forEach(function (h) {
      var Lr = O.resonanceL(f, v, h) * 100;
      var d = (Lcm - Lr) / widthCm;
      s += 1 / (1 + d * d);
    });
    return Math.min(1, s);
  };

  O.accepted = Object.freeze({
    v0: 331.5, slope: 0.6, tRoom: 25, tCold: 2,
    vRoom: O.vTemp(25),      // 346.5 m/s
    vCold: O.vTemp(2),       // 332.7 m/s
    forks: [512, 440]
  });

  root.LS.aircolumn = O;
})(typeof globalThis !== "undefined" ? globalThis : window);
