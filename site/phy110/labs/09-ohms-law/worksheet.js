// PHY110 Lab 9 worksheet content: registers this lab's printable pre-lab/post-lab
// sheet with the shared engine (shared/worksheet.js loads before this file).
// The table mirrors the sim's data tables: one row per set point, starting
// with (0, 0), for whichever resistor run the sheet is used on.
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "09-ohms-law",
    labNumber: "9",
    title: "Ohm's law from a V-I line",
    intro: "Fill one row per set point, starting with 0 V, 0 mA, 0 A. The 200 ohm run uses 2, 4, 6, 8, 10, 11 V; the 100 ohm run uses 1, 2, 3, 4, 5, 5.5 V. Write the current in milliamps and again in amperes. Below the sheet, record the nominal resistance, the resistance from the slope, and the percent error.",
    table: {
      header: ["V (V)", "I (mA)", "I (A)"],
      blankRows: 8
    },
    prelab: [
      "Draw the circuit: the ammeter in series with the resistor, the voltmeter across the resistor. Label the red and black leads.",
      "Convert 15 mA to amperes, and 0.040 A to milliamps.",
      "A V-I graph puts volts on the vertical axis and amperes on the horizontal axis. What quantity is the slope of that line?",
      "At 6 V, which draws more current, the 200 ohm or the 100 ohm resistor? Give a number for each to say why."
    ],
    postlab: [
      "Do these resistors obey Ohm's law? Look at the shape of your lines and say how you know.",
      "The two lines have different slopes. Explain the difference using the resistor values.",
      "Your line does not pass exactly through (0, 0). Where could a small offset at zero come from?",
      "The 100 ohm run stops at 5.5 V. What would the ammeter show at 11 V, and why is that a problem?"
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
