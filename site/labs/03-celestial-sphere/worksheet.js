// Lab 3 worksheet content: registers this lab's printable pre-lab/post-lab
// worksheet with the shared engine (shared/worksheet.js loads before this file).
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "03-celestial-sphere",
    labNumber: "3",
    title: "The Celestial Sphere",
    intro: "Give the sky street addresses: record each object's RA and Dec the way you read them off the chart, not the way you wish they read.",
    table: {
      header: ["Object", "RA (h m)", "Dec (deg, + or -)", "Constellation", "Date / Sun position"],
      blankRows: 16
    },
    prelab: [
      "In your own words: where does declination start counting, where does right ascension start counting, and which way does each grow?",
      "Why can Dec be negative while RA is only ever between 0h and 24h?",
      "Name the Earth system that Dec copies, and the Earth system that RA loosely copies. Where does the copy break?",
      "Look at how the course chart is oriented before lab. Predict which direction RA numbers grow across the page, and why looking up flips the usual left-right."
    ],
    postlab: [
      "Pick one object you plotted: write its RA/Dec and show it really lands in the constellation you recorded, on the chart, not from memory.",
      "The Sun moved along the ecliptic as you dragged the date. Describe in two sentences what its Dec did and what that has to do with seasons.",
      "Two students read the same chart and get opposite RA orders for the same pair of stars. What orientation mistake explains the disagreement?",
      "An astronomer can point any telescope at RA 13h 25m, Dec +47 09 from any country. Give two reasons RA/Dec make that work when 'over the barn' never could."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
