// Lab 5 worksheet content: registers this lab's printable pre-lab/post-lab
// worksheet with the shared engine (shared/worksheet.js loads before this file).
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "05-moonrise-eclipses",
    labNumber: "5",
    title: "Moonrise drift and the Eclipse Board",
    intro: "Two roads in the sky, slightly tilted. Log each new or full Moon, whether the Moon was near a crossing, and what the board did about it.",
    table: {
      header: ["Date", "Time (UT)", "New or Full", "Moon near a crossing? (Y/N)", "Eclipse happened? (Y/N)"],
      blankRows: 14
    },
    prelab: [
      "Draw the classic flat top-view diagram for new Moon and full Moon, then mark where it promises an eclipse every single month.",
      "The flat diagram leaves one fact out, and that fact decides eclipses. Predict what the board's data will show about how often new Moons actually produce an eclipse.",
      "In one sentence: what is the Moon's orbit tilted relative to, and what does the tilt do to the shadow most months?",
      "Moonrise is late every day, even though the sky turns on a steady clock. Predict the cause in one sentence before you run the drift bench."
    ],
    postlab: [
      "Using your own rows, compare one new Moon that sat near a crossing with one that did not, and explain why only one line produced a shadow.",
      "Explain the idea of a shadow window in your own words: why must both bodies be on the same road at the same time?",
      "Describe the moonrise drift you measured and say whether the Moon's direction of travel along its road explains the direction of the drift.",
      "Why do eclipses arrive in seasons rather than on a monthly schedule? Answer with the tilt, the crossings, and the phase cycle, in that order."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
