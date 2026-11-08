// Lab 4 worksheet content: registers this lab's printable pre-lab/post-lab
// worksheet with the shared engine (shared/worksheet.js loads before this file).
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "04-moon-phases",
    labNumber: "4",
    title: "Phases of the Moon",
    intro: "One angle runs the show. Record the elongation you set and everything the model says that angle causes.",
    table: {
      header: ["Date", "Elongation (deg)", "Phase shape", "Moonrise", "Moonset"],
      blankRows: 14
    },
    prelab: [
      "Define elongation in one sentence, and say which object sits at the vertex of the angle.",
      "A half-lit Moon appears twice each cycle. For each of the two, predict where in the sky it hangs and roughly what time of day you could see it.",
      "Which half of the Moon is lit right now, this minute, at full moon and at new moon alike? Why does the lit half not answer the question 'what phase is it?'",
      "Predict whether a thin crescent can be visible in the daytime sky, and what elongation range you would look for it in."
    ],
    postlab: [
      "From your own table, describe in one sentence what happened to moonrise time as the elongation grew from new toward full.",
      "Use one row of your data to answer a classmate who says Moon phases are caused by Earth's shadow.",
      "Pick a row and sketch the Sun-Moon-Earth geometry roughly enough to show why the shape you recorded matches the elongation you set.",
      "Why can a crescent share the day sky with the Sun while a full Moon never can? Answer using the geometry, not a rule to memorize."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
