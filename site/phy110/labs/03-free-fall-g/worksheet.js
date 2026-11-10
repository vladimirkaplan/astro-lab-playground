// PHY110 Lab 3 worksheet content: registers this lab's printable pre-lab/post-lab
// sheet with the shared engine (shared/worksheet.js loads before this file).
// Prompts follow the manual's own laboratory questions, rewritten in plain words.
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "03-free-fall-g",
    labNumber: "3",
    title: "Free fall: measuring g",
    intro: "Drop a steel ball from three set heights, time five trials at each, average the times, and compare your g with the accepted 9.80 m/s^2.",
    table: {
      header: ["trial", "t (s) at h = 0.200 m", "t (s) at h = 0.400 m", "t (s) at h = 0.800 m"],
      units: ["count", "s", "s", "s"],
      blankRows: 8
    },
    prelab: [
      "Start from h = g t^2 / 2 for a drop from rest. Rearrange it so g is on its own, and write the rule you get.",
      "With g = 9.80 m/s^2, predict the fall time from h = 0.40 m. Show the square root step.",
      "In two sentences, say what free fall means and what condition the motion must meet for g to be constant.",
      "The data table measures height from the ball bottom to the pad top. In one sentence, say why that rule keeps your heights true.",
      "Name the accepted value of g this course uses, and write the percent error rule with that value in place."
    ],
    postlab: [
      "Use the model g = G M_E / (R_E + h)^2 with the constants printed on your bench page. Does g change across your three heights, and by what fraction?",
      "Stopping the timer late makes t bigger. Say whether that pushes your g up or down, and show one line of math.",
      "Which of your three heights gave the best percent error? Say why the timing slip matters less or more there.",
      "Report your final answer: the average of your three g values, and its percent error against 9.80 m/s^2."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
