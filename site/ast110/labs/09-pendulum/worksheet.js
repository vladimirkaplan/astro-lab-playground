// Lab 9 worksheet content: registers this lab's printable pre-lab/post-lab
// worksheet with the shared engine (shared/worksheet.js loads before this file).
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "09-pendulum",
    labNumber: "9",
    title: "Acceleration Due to Gravity",
    intro: "One stopwatch, one string: log each run, then let period-squared against length do the weighing of the Earth.",
    table: {
      header: ["String length", "Release angle", "Swings counted", "Total time", "Period T", "T squared"],
      units: ["cm", "deg", "count", "s", "s", "s^2"],
      blankRows: 12
    },
    prelab: [
      "Define the period of a pendulum in one sentence, and explain why timing many swings and dividing beats timing one swing with the same stopwatch.",
      "Predict before benching: what happens to the period when you double the string length? What happens when you release from a noticeably bigger angle?",
      "If period-squared turns out to be proportional to length, what shape do the points make on a T^2-versus-length graph, and what might the steepness of that shape be good for?",
      "Name one timing mistake that comes out different each run, and one that pushes the same way every run. Say which kind a late button press is."
    ],
    postlab: [
      "Report the period for your longest string, showing the division from total time and swing count with units attached.",
      "Do your T^2-versus-length points look like a straight line? Quote two points, near opposite ends, as your evidence.",
      "What did your runs say about release angle: within the usual spread of your times, did the bigger angle change the period?",
      "Name the single biggest reason your times could be off, and one change to the steps that would shrink it."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
