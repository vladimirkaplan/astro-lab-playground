// PHY110 Lab 2 worksheet content: registers this lab's printable pre-lab/post-lab
// sheet with the shared engine (shared/worksheet.js loads before this file).
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "02-graphs-and-slope",
    labNumber: "2",
    title: "Graph scales, plotting, and slope",
    intro: "Design an axis you can read, plot the points, draw one straight line, and report what its slope measures.",
    table: {
      header: ["data set", "x value", "y value", "trendline point 1",
        "trendline point 2", "slope", "what the slope measures"],
      units: ["name", "s or cm", "m/s or N", "(x, y) on the line", "(x, y) on the line",
        "with units", "one line"],
      blankRows: 16
    },
    prelab: [
      "Name the marks a class-standard graph must carry: title, axis names with units in brackets, and axis values.",
      "An axis must carry a range of 40 units on 20 divisions. What is the pre-scale, and what scale do you choose per division?",
      "Which three numbers does this course allow as the base of a scale? Give one reason the others are a bad idea.",
      "In two sentences, explain why the two points you use for a slope come from the trendline instead of from two of your data dots.",
      "Write the start-value formula and say what each symbol means, including N."
    ],
    postlab: [
      "Report your slope for the Earth table and for the Moon table, each with its units, and call each one your measured g for that body.",
      "Find the percent error of your Earth slope against 9.80 m/s^2, and of your Moon slope against 1.62 m/s^2.",
      "The car example graphs distance against time. In one sentence, say what its slope of about 4.4 measures and why the units come out that way.",
      "Did your trendline leave about the same number of dots above and below? Write the counts and say what you changed to fix an unbalanced line.",
      "Read the force your spring line predicts at 7 cm stretch, and show the two points on the line you used for it."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
