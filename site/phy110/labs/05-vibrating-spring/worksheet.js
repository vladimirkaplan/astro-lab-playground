// PHY110 Lab 5 worksheet content: registers this lab's printable pre-lab/post-lab
// sheet with the shared engine (shared/worksheet.js loads before this file).
// The table mirrors the sim's Table 1 (K); the sim's own tables carry the
// Table 2 period rows and both footers.
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "05-vibrating-spring",
    labNumber: "5",
    title: "Spring constant and vertical spring periods",
    intro: "Capture the no-load level x0, add the load in 50 g steps, read the mark at every row, and pull K out two ways: row by row, and from the trendline slope. Write the header values first: hanger mass (g), g = 9.80 m/s^2, x0 (cm).",
    table: {
      header: ["added mass (g)", "total mass (g)", "total mass (kg)", "F (N)", "x_f (cm)", "x (cm)", "x (m)", "K (N/m)"],
      units: ["g", "g", "kg", "N", "cm", "cm", "m", "N/m"],
      blankRows: 8
    },
    prelab: [
      "Write Hooke's law for a spring, and give the units of K.",
      "With x0 = 1.6 cm and the mark reading 2.4 cm under load, what is x? Show the subtraction.",
      "Write the period formula T = 2 pi sqrt(m/K), and say in words what m is in this lab.",
      "If one cycle takes T = 0.50 s, what is the frequency f?"
    ],
    postlab: [
      "Look at your period rows. As the hanging mass grows, what does the period do?",
      "If a stiffer spring (bigger K) takes the place of yours, what happens to the frequency?",
      "In your own words, what does K tell you about how stiff a spring is?",
      "Your measured T runs a little long. Which extra piece of mass does the formula leave out?"
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
