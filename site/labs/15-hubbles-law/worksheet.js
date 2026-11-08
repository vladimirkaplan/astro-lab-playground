// Lab 15 worksheet content: registers this lab's printable pre-lab/post-lab
// worksheet with the shared engine (shared/worksheet.js loads before this file).
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "15-hubbles-law",
    labNumber: "15",
    title: "Hubble's Law",
    intro: "Ten dots, one breath of inflation. Log each galaxy's before and after distance, the change, and the speed it implies.",
    table: {
      header: ["Galaxy label", "Distance before inflation", "Distance after inflation", "Change in distance", "Recession speed"],
      units: ["label", "cm", "cm", "cm", "cm/s"],
      blankRows: 12
    },
    prelab: [
      "One dot on the balloon is home. Predict what speed every other dot will turn out to have relative to your dot, before measuring any of them.",
      "Write Hubble's law as an equation, name each symbol including the slope, and state the units the slope carries.",
      "Why do you divide the distance change by the inflation time instead of just reporting the distance change?",
      "If your dots obey speed proportional to distance seen from your dot, predict whether a classmate's dot sees the same law. Say how the bench could check you."
    ],
    postlab: [
      "Compute the speed-to-distance ratio for two of your galaxies. Within your measurement noise, are they equal?",
      "Does your speed-versus-distance line pass through the origin? Say what a yes means physically for a dot that is barely away from home.",
      "Suppose every before distance was one centimeter too big, a systematic slip. Argue what that does to your slope, or redo one row to show it.",
      "The balloon surface has no center, and neither does the expansion. In two sentences: what is actually expanding, and what is a recession speed not?"
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
