// Lab 7 worksheet content: registers this lab's printable pre-lab/post-lab
// worksheet with the shared engine (shared/worksheet.js loads before this file).
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "07-lenses",
    labNumber: "7",
    title: "Lenses and Telescopes",
    intro: "Move the card until the image snaps sharp, log both distances, and let the lens equation grade you.",
    table: {
      header: ["Focal length f (cm)", "Object distance (cm)", "Sharp screen distance (cm)", "Sharpness (%)", "Predicted image distance (cm)", "Predicted magnification"],
      blankRows: 12
    },
    prelab: [
      "Write the thin-lens equation and the magnification relation, and name what every symbol means and what units it carries.",
      "When can a converging lens throw a real image onto a card, and when can it only make a virtual one? Answer by saying where the object sits next to the focal length.",
      "Predict before you bench it: as the object creeps closer to the lens (staying outside the focal point), does the sharp-image distance creep toward the lens or away from it?",
      "Two lenses spaced right make a telescope. Which one faces the far object, which one faces your eye, and how do their focal lengths compare?"
    ],
    postlab: [
      "Take two rows and show the equation checks: solve for the predicted image distance, compare it with where the card went sharp, and give the percent error.",
      "Your sharpest image was upside down. What does that tell you about real versus virtual, and which rows could not have been virtual?",
      "From your best row, what magnification did you predict, and did the card image look about that size?",
      "Name one setup detail that could make a row's sharpness percentage low, and one change that would sharpen the trial next time."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
