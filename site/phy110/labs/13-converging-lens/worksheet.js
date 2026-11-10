// PHY110 Lab 13 worksheet content: registers this lab's printable pre-lab/
// post-lab sheet with the shared engine (shared/worksheet.js loads before
// this file). The table mirrors the sim's records: one row per lens position
// (o, i, the f pulled from them), for both kit lenses.
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "13-converging-lens",
    labNumber: "13",
    title: "Converging lens focal length and a two-lens refractor",
    intro: "The arrow and the screen stand one metre apart on a 100 cm bench. Log the two lens positions that give a sharp image, pull f out of each with 1/o + 1/i = 1/f, and average them. Then place the arrow at 2.5f, 2.0f, 1.5f and 0.5f, and record the size, the up-or-down sense, and the type of each image. Finally, space the two lenses into a refractor and record the alignment in words.",
    table: {
      header: ["Lens (colour)", "Position", "o (m)", "i (m)", "f (m)"],
      blankRows: 10
    },
    prelab: [
      "Name each symbol in the thin lens equation 1/o + 1/i = 1/f, and give its unit.",
      "When the object sits at o = 2f, where does the image form, and how big is it?",
      "On what surface can you catch a real image?",
      "In a refractor, which lens has the longer focal length, the objective or the eyepiece?"
    ],
    postlab: [
      "When does a convex lens make a virtual image of a real object?",
      "Compare the f you got from the two lens positions. Where on the bench could error have crept in?",
      "At 0.5f no screen shows the image. Why not, and where is the image?",
      "How did your final eyepiece spacing compare with f_o + f_e, and what did the view look like?"
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
