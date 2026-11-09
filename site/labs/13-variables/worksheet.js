// Lab 13 worksheet content: registers this lab's printable pre-lab/post-lab
// worksheet with the shared engine (shared/worksheet.js loads before this file).
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "13-variables",
    labNumber: "13",
    title: "Variable stars and Cepheids",
    intro: "No standard candle, just two steps: pull the period from the scatter, then let the period buy the distance.",
    table: {
      header: ["Target star", "Period you measured (d)", "Mean apparent magnitude", "Absolute magnitude M_V", "Distance you measured (pc)"],
      blankRows: 12
    },
    prelab: [
      "The slogan Cepheids are standard candles is wrong in a way that matters. Write out the honest two-step chain: period gives what, and that gives what, and that finally gives what?",
      "A light curve is scattered points, not a clean wave. Name a way to pull a period out of it without fitting software, and what you would repeat to trust it.",
      "Magnitudes run backwards: of two stars, which is brighter, the one at magnitude 3 or the one at magnitude 8?",
      "For the mean brightness, which is the better input: one carefully chosen night, or the average over the whole curve? Say why you picked it."
    ],
    postlab: [
      "For your best star, report the period you measured and how you read it off the curve (peak-to-peak, dip-to-dip, or a repeated stretch) and why.",
      "Show all your work for one star: period, then absolute magnitude, then distance, with the number for every step written down.",
      "Compare your measured distance with the truth column, give the percent error, and name which input you now distrust the most.",
      "If your period had come out too long, would your final distance be too big or too small? Trace the chain to show why it goes that way."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
