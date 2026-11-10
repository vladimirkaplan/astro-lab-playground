// PHY110 Lab 11 worksheet content: registers this lab's printable pre-lab/
// post-lab sheet with the shared engine (shared/worksheet.js loads before
// this file). The table mirrors the sim's record: one row per fork with the
// resonance positions in cm and m, the wavelength from the spacing, and the
// speed from f times lambda.
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "11-air-column-sound",
    labNumber: "11",
    title: "Speed of sound from a resonance tube",
    intro: "Work one fork at a time. Strike the fork, find the two loudest water levels, and log L1 and L2 in centimeters and in meters. Fill the wavelength from the spacing between the two, and the speed from f times lambda. Below the table, log the average speed, the room temperature, the accepted speed from the printed law, and the percent error.",
    table: {
      header: ["f (Hz)", "L1 (cm)", "L1 (m)", "L2 (cm)", "L2 (m)", "lambda (m)", "v (m/s)"],
      blankRows: 8
    },
    prelab: [
      "Which standing waves fit in a tube that is closed at one end: quarter waves, half waves, or full waves?",
      "Use the printed law, 331.5 plus 0.6 per degree C, to compute the accepted speed at 20 degrees C.",
      "Why is the distance between two resonances a better ruler for the wavelength than the first position alone?",
      "At resonance the standing wave has a node at which end of the air column: the closed end or the open end?"
    ],
    postlab: [
      "At 2 degrees C the accepted speed is 332.7 m/s. Is that larger, equal, or smaller than the value at 25 degrees C?",
      "Compare your average speed from the two forks with the temperature-law value, and say how big the gap is in percent.",
      "The second resonance sits about three times as far down the tube as the first. Why about three times?",
      "Would the distance between resonances get larger or smaller if the fork frequency doubled? Use your 512 Hz and 440 Hz numbers to say how."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
