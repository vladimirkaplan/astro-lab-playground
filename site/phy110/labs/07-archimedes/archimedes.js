// PHY110 Lab 7 maths: buoyant force and Archimedes' principle.
// Two routes must give the same F_b:
//   volume route  F_b = rho_f V_f g, fully submerged V_f = V_o
//   weight route  F_g - F_g(apparent) = rho_f V_o g, the scale reads m g - F_b
// Printed course values: g = 9.80 m/s^2, rho_water = 1000 kg/m^3,
// 1 mL = 1 cm^3 = 1e-6 m^3, Table I densities Cu 8.92 / tin 7.30 / zinc 7.10
// g/cm^3. Air buoyancy is ignored, as the course says.
//
// Not printed (the drawer shows them): the three object volumes, about
// 2.5 mL each; the masses follow from the densities. A real 50 mL cylinder
// reads to about 1 mL, so the volume route carries roughly +-20 % on a
// 2.5 mL object and double-digit percent differences between the routes are
// the honest bench result, not a failed lab.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var A = {};

  // ---------- course constants ----------
  A.G = 9.80;                      // m/s^2, printed
  A.RHO_WATER = 1000;              // kg/m^3, printed
  A.ML_TO_M3 = 1e-6;               // 1 mL = 1 cm^3 = 1e-6 m^3, printed
  A.DENSITIES = Object.freeze({ Cu: 8.92, Sn: 7.30, Zn: 7.10 }); // g/cm^3, Table I
  A.MATERIALS = Object.freeze(["Cu", "Sn", "Zn"]);
  A.NAMES = Object.freeze({ Cu: "copper", Sn: "tin", Zn: "zinc" });
  A.STAMPS = Object.freeze({ Cu: "Cu", Sn: "T", Zn: "Z" });      // the stamp on the hook
  // not printed in the manual: the object sizes, about 2.5 mL each (drawer)
  A.OBJECTS = Object.freeze({ Cu: 2.50, Sn: 2.50, Zn: 2.50 });   // mL

  // ---------- unit line ----------
  A.mLtoM3 = function (ml) { return (ml || 0) * A.ML_TO_M3; };

  // ---------- the volume route ----------
  A.buoyantN = function (rhoF, vM3, g) {
    if (rhoF === undefined) rhoF = A.RHO_WATER;
    if (g === undefined) g = A.G;
    if (!isFinite(vM3)) return NaN;
    return rhoF * vM3 * g;
  };
  A.buoyantFromMl = function (vMl, rhoF, g) {
    return A.buoyantN(rhoF, A.mLtoM3(vMl), g);
  };

  // ---------- the weight route ----------
  A.massG = function (sym, vMl) {
    var d = A.DENSITIES[sym];
    if (!d) return NaN;
    return d * (vMl || 0);
  };
  A.weightN = function (massG, g) {
    if (g === undefined) g = A.G;
    return (massG || 0) / 1000 * g;
  };
  // apparent mass in grams: true mass minus the displaced water's mass
  // (tap water at 1.00 g/cm^3; the ~1 % tap-water density shift is below
  // this bench's precision and is named, not hidden)
  A.apparentMassG = function (massG, vMl, rhoGcm3) {
    if (rhoGcm3 === undefined) rhoGcm3 = 1.00;
    return (massG || 0) - rhoGcm3 * (vMl || 0);
  };
  A.buoyantFromWeightN = function (massAirG, massAppG, g) {
    if (g === undefined) g = A.G;
    return (massAirG - massAppG) / 1000 * g;
  };

  // ---------- comparing the routes ----------
  // percent difference on the mean, as the data page computes it:
  // |a - b| / ((a + b) / 2) x 100
  A.pctDiffMean = function (a, b) {
    if (!isFinite(a) || !isFinite(b)) return NaN;
    var mean = (Math.abs(a) + Math.abs(b)) / 2;
    if (!mean) return 0;
    return Math.abs(a - b) / mean * 100;
  };

  // ---------- density back-out and identification ----------
  A.densityBackGcm3 = function (massG, vMl) {
    if (!vMl) return NaN;
    return massG / vMl;
  };
  A.identify = function (densityGcm3, tolGcm3) {
    if (tolGcm3 === undefined) tolGcm3 = 0.05;
    var best = null, bestGap = tolGcm3;
    for (var i = 0; i < A.MATERIALS.length; i++) {
      var sym = A.MATERIALS[i];
      var gap = Math.abs(A.DENSITIES[sym] - densityGcm3);
      if (gap <= bestGap) { bestGap = gap; best = sym; }
    }
    return best;
  };

  // ---------- the honest instrument ----------
  // a real 50 mL cylinder reads to about 1 mL
  A.readMl = function (trueMl) { return Math.round(trueMl); };
  A.WIRE_ML = 0.10;                // the wire's own volume, Fun Mode
  A.BUBBLE_MAX_ML = 0.25;          // stuck bubbles, Fun Mode
  A.WEIGH_JITTER_G = 0.05;         // triple-beam reading, Fun Mode

  // the accepted values the bench names out loud
  A.accepted = Object.freeze({
    vMl: 2.50,
    fbN: A.buoyantFromMl(2.50)     // 0.0245 N
  });

  root.LS.archimedes = A;
})(typeof globalThis !== "undefined" ? globalThis : window);
