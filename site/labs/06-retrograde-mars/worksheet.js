// Lab 6 worksheet content: registers this lab's printable pre-lab/post-lab
// worksheet with the shared engine (shared/worksheet.js loads before this file).
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "06-retrograde-mars",
    labNumber: "6",
    title: "Retrograde motion of Mars",
    intro: "Track the planet night after night. Record where Mars sat and which way it was walking against the stars, including the nights it seemed to stop.",
    table: {
      header: ["Date", "Mars RA (h)", "Mars Dec (deg)", "Motion (E / W / stationary)", "Notes"],
      blankRows: 28
    },
    prelab: [
      "In your own words: what does retrograde motion look like against the background stars, and which planet does this lab track?",
      "Sketch the Sun, a small fast orbit, and a larger slow orbit. Mark the moment the inside planet catches up, and predict what the line of sight does there.",
      "Prediction: as the planet turns around on the sky, what should your direction column do at the turn itself, and on either side of it?",
      "Why does a run of modest observations over many weeks beat one excellent night for catching this effect?"
    ],
    postlab: [
      "Mark both stops (the stationary points) in your log. What was the direction doing immediately before and after each one?",
      "Explain the catch-up in your own words with a rough sketch: who moves faster, on which orbit, and why the swinging line of sight drags the planet westward for a while.",
      "Convince a skeptic that Mars never actually reverses in space. Use the phrase line of sight in your answer.",
      "Compare your logged motion column with the model's verdict column: pick the row where you least agreed with the model and say which reading threw you."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
