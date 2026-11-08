// Lab 12 worksheet content: registers this lab's printable pre-lab/post-lab
// worksheet with the shared engine (shared/worksheet.js loads before this file).
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "12-hr-diagram",
    labNumber: "12",
    title: "The H-R diagram",
    intro: "Two numbers per star, one surprising map. Log temperature, luminosity, radius, and where the star parked itself.",
    table: {
      header: ["Star", "Temperature (K)", "Luminosity (sun = 1)", "Radius (sun = 1)", "Region on the chart"],
      blankRows: 24
    },
    prelab: [
      "What are the two quantities plotted on the H-R diagram's axes, and what extra ingredient do you usually need before a luminosity can be plotted at all?",
      "Astronomy axes often run backwards or on log scales. Predict what the temperature axis will do as you move left to right on the course chart.",
      "Before plotting, draw the blank chart frame and mark roughly where you would expect a hot dim star and a cool bright star to land.",
      "Predict the shape of the finished plot: which band should most stars sit on, and which corners should look nearly empty?"
    ],
    postlab: [
      "Name the regions your stars actually landed in, and for one star in each region quote its temperature and luminosity as the evidence.",
      "Two of your stars share a temperature, but one is far more luminous. What must differ about them, and which row pair shows it?",
      "Which star on your chart is the biggest, and which is the smallest? Justify from temperature and luminosity, not from looking at dot sizes.",
      "In one or two sentences: why did arranging stars this way organize the whole subject before anyone knew what makes stars shine?"
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
