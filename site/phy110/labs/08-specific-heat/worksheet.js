// PHY110 Lab 8 worksheet content: registers this lab's printable pre-lab/post-lab
// sheet with the shared engine (shared/worksheet.js loads before this file).
// The table mirrors the sim's single-run sheet: one row per quantity, in the
// order the data page writes it.
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "08-specific-heat",
    labNumber: "8",
    title: "Specific heat of a metal by mixtures",
    intro: "Fill one row per quantity, in this order: element symbol; m_s in g; m_c in g; m_c + m_w in g; m_w in g; T_i in degrees C; T_s in degrees C; T_f in degrees C; your measured c_s; the accepted c_s; the percent error. Course values: c_cup = 0.22 cal/g C, c_water = 1.000 cal/g C, T_s = 100 C (assumed 1 atm).",
    table: {
      header: ["quantity", "value"],
      blankRows: 11
    },
    prelab: [
      "Write the energy balance for the mix: what the hot metal loses, the cup and the water gain. Name each symbol.",
      "Look up copper in the table of accepted values. Predict its specific heat, and say which row it sits in.",
      "Why must the metal cylinder sit in the boiling water before it goes into the calorimeter?",
      "If 1 cal = 4.184 J, how many joules is a 100 cal heat gain?",
      "Why does the energy balance count the aluminium cup as a heat sink, and not just the water?"
    ],
    postlab: [
      "Which takes more heat per gram to warm from 20 degrees C to 30 degrees C, the water or the aluminium cup? Use the c values to say why.",
      "Which metal did you find, and does the stamp on the cylinder match the number you pulled out?",
      "Some boiling water rides along on the cylinder into the cup. What happens to your c_s, and why?",
      "Your measured c_s sits a few percent below the accepted line. Name one cause, and say which way it moves the number."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
