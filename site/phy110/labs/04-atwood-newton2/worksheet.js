// PHY110 Lab 4 worksheet content: registers this lab's printable pre-lab/post-lab
// sheet with the shared engine (shared/worksheet.js loads before this file).
// The table mirrors the sim's timing log; the sim's own table adds the
// a_theory / a_measured / percent-difference rows.
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "04-atwood-newton2",
    labNumber: "4",
    title: "Atwood's machine: Newton's second law",
    intro: "Set up four mass trials with a 10 g difference, time five drops at each, and pull a out of the averaged time. Fill the table one row per quantity, one column per trial, in this order: pulley M (g); holder 1 (g); added 1 (g); total m1 (g); holder 2 (g); added 2 (g); total m2 (g); h (m); t1 to t5 (s); average t (s); a_theory; a_measured; percent difference.",
    table: {
      header: ["quantity", "trial 1", "trial 2", "trial 3", "trial 4"],
      blankRows: 16
    },
    prelab: [
      "Write Newton's second law for the whole two-hanger system, with the units on each piece.",
      "Compute a_theory for m1 = 150 g, m2 = 160 g, M = 70 g. Show your working in two lines.",
      "In your own words, say why the system's acceleration must stay far below g.",
      "The formula puts half the pulley mass in the denominator. In your own words, say why half and not the whole.",
      "Write the measured-side rule a = 2h / t^2 in words, and say what h and t each stand for at this bench."
    ],
    postlab: [
      "Your measured a usually lands below the theory value. Name the two things on a real machine that pull it down.",
      "If any of your trials ran a mass difference over 20 g, say what it did to your timing.",
      "You kept every mass in grams and never switched to kg. In one or two sentences, say why that works."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
