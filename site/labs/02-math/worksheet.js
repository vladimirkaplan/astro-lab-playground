// Lab 2 worksheet content: registers this lab's printable pre-lab/post-lab
// worksheet with the shared engine (shared/worksheet.js loads before this file).
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "02-math",
    labNumber: "2",
    title: "Mathematics for astronomy",
    intro: "One bench, three tools: measure pi, trade angle for size with the small-angle formula, and handle big numbers calmly.",
    table: {
      header: ["Object", "True diameter", "Distance", "Distance unit", "Angular diameter (deg)"],
      blankRows: 12
    },
    prelab: [
      "Write the small-angle formula, name every quantity in it, and state what units each quantity must be in.",
      "The formula is called small-angle for a reason. In one sentence, what goes wrong when the angle gets large?",
      "Rewrite today's biggest and smallest numbers in a x 10^n form before class so the powers of ten are not a surprise at the bench.",
      "If the object and the distance are given in different units, what must you fix before plugging numbers in?"
    ],
    postlab: [
      "From your circle measurements, what ratio did circumference divided by diameter give you, and what was its percent error against the accepted value?",
      "Put one small-angle row's numbers into the formula, one step per line, cancelling units as you go.",
      "Recompute one answer after changing the distance unit. Did the answer survive? What does that check prove about your units?",
      "In one sentence each, name the three pieces of mathematics this lab practiced and where each one showed up in your data."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
