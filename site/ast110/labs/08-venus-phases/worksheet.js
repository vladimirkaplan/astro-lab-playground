// Lab 8 worksheet content: registers this lab's printable pre-lab/post-lab
// worksheet with the shared engine (shared/worksheet.js loads before this file).
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "08-venus-phases",
    labNumber: "8",
    title: "Phases of Venus",
    intro: "An inside orbit fixes everything a viewer sees. Log position, stretch from the Sun, lit share, and apparent size together.",
    table: {
      header: ["Orbit position (deg)", "Elongation (deg)", "Illuminated (%)", "Apparent diameter (arcsec)", "Earth-Venus distance (AU)", "Phase name"],
      blankRows: 16
    },
    prelab: [
      "Sketch the order of orbits, Sun inward to outward. Why does that one order mean Venus can never be seen at local midnight?",
      "Mark greatest elongation on your sketch. Predict: is Venus closer to us at greatest elongation or when it is between us and the Sun?",
      "Prediction before observing: when Venus looks biggest in the telescope, is its lit share large or small? Say why in one sentence.",
      "Suppose the old Earth-centered arrangement, with Venus chained to the Sun's line, were correct. Which of Venus's phases would it never be able to show?"
    ],
    postlab: [
      "Does your own table show bigger disk with thinner crescent? Quote two rows, one fat and one thin, with their diameters and lit shares.",
      "What phase does Venus show when it is on the far side of the Sun, and what does your data say about its size there?",
      "Galileo's full set of phases buried one other picture of the solar system. Name it and say which single row in your table does the work.",
      "Estimate from your columns how many times wider Venus looks at its biggest than at its smallest, and name the orbital spot where each extreme happened."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
