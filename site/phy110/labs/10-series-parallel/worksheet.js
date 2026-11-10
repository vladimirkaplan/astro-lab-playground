// PHY110 Lab 10 worksheet content: registers this lab's printable pre-lab/
// post-lab sheet with the shared engine (shared/worksheet.js loads before
// this file). The table mirrors the sim's one-shot tables: quantity, value,
// unit, one row per printed quantity for whichever pair the sheet is used on.
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "10-series-parallel",
    labNumber: "10",
    title: "Series and parallel resistor rules",
    intro: "The supply is fixed at 6.0 V for both parts. For each pair, log the total voltage and current, the measured resistance, the nominal resistance from the rule, and the percent error. Then log the voltage across each resistor, the drop sum with its equality check, and the total power. The parallel table adds the two branch currents and their sum check.",
    table: {
      header: ["Quantity", "Value", "Unit"],
      blankRows: 13
    },
    prelab: [
      "Write the total-resistance formula for two resistors in series, then write the total-resistance formula for two in parallel.",
      "In a series pair, which quantity is the same through both resistors: the voltage across them or the current through them?",
      "A series pair totals 300 ohm at 6.0 V. Predict the current in milliamps before you build anything.",
      "Sketch both layouts on paper before you build them: one pair in a single line, one pair in two branches."
    ],
    postlab: [
      "As more resistors join a series chain, what happens to the total resistance of the chain?",
      "As more resistors join the same series chain at 6.0 V, what happens to the total current?",
      "Ask the same two questions now for a parallel bank: what happens to total resistance, and to total current, as branches are added?",
      "At the same 6.0 V, which pair takes more total power, the series one or the parallel one? Give a number for each."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
