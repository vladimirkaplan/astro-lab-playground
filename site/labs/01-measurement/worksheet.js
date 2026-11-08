// Lab 1 worksheet content: registers this lab's printable pre-lab/post-lab
// worksheet with the shared engine (shared/worksheet.js loads before this file).
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "01-measurement",
    labNumber: "1",
    title: "Measurement",
    intro: "Log each quantity you measure, the unit you read it in, and how far it lands from the accepted value.",
    table: {
      header: ["Thing measured", "Your value", "Unit", "Accepted value", "Percent error (%)"],
      blankRows: 12
    },
    prelab: [
      "Before lab, name the two rulers you will compare and the unit each one reports in.",
      "Write the percent-error formula in your own words: what goes on top, what goes on the bottom, and why the accepted value is on the bottom.",
      "A coin that has been in circulation for years is not exactly as the mint made it. Predict which way that will push your percent error, then plan how you will check.",
      "Why is a conversion factor you derive from your own two measurements more convincing than one copied from a formula sheet?"
    ],
    postlab: [
      "Report the centimeters-per-inch factor you measured and give its percent error against the accepted value.",
      "Which of the two rulers gave you the larger reading uncertainty, and what feature of that ruler caused it?",
      "Name one way today's bench work could have biased a number, and one change that would reduce that bias next time.",
      "Would measuring ten coins instead of one make your conversion factor better or worse? Explain the reason, not just the guess."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
