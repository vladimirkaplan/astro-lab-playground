// Lab 14 worksheet content: registers this lab's printable pre-lab/post-lab
// worksheet with the shared engine (shared/worksheet.js loads before this file).
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "14-galaxy-id",
    labNumber: "14",
    title: "Galaxy identification",
    intro: "Sort by picture along the tuning fork. Log every call you make, family first, then stage, before the verdict.",
    table: {
      header: ["Bench", "Round", "Object", "Your family (E / S0 / S / SB / Irr)", "Your stage (0-7 or a/b/c)"],
      blankRows: 20
    },
    prelab: [
      "Sketch the tuning fork: where do the ellipticals sit, where do the barred spirals, and what kind of galaxy waits at the fork's point?",
      "Name the one visible feature that separates SB from S every time, and the feature that separates E from S0.",
      "Order the spiral stages a, b, c by bulge size and by how loosely the arms are wound. Which stage should show the most newborn stars?",
      "Why do irregular galaxies often have no orderly shape to grade at all? Name the usual suspect."
    ],
    postlab: [
      "Which family fooled you the most? Quote one round from your log and say what you would check first next time.",
      "Cite one object where the bar decided your call: what exactly did you look for, and was the verdict on your side?",
      "You called an object E and the answer was S0. What feature, visible in the photo, would have caught the difference?",
      "Tally your rounds: how many did you get right, and which two families did you most often confuse with each other?"
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
