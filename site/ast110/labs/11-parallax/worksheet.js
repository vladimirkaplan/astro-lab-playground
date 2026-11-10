// Lab 11 worksheet content: registers this lab's printable pre-lab/post-lab
// worksheet with the shared engine (shared/worksheet.js loads before this file).
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "11-parallax",
    labNumber: "11",
    title: "Heliocentric parallax",
    intro: "The same thumb trick with Earth's orbit as your baseline. Log both dates, the swing, the parallax, and the distance it buys you.",
    table: {
      header: ["Target star", "Jan position (mas)", "Jul position (mas)", "Full swing (mas)", "Parallax p (mas)", "Distance (pc)"],
      blankRows: 12
    },
    prelab: [
      "Do the thumb-and-two-eyes experiment at home and write, in two sentences, why the near object jumps more than the far one.",
      "In annual parallax, what physically provides the baseline, and why are the two views six months apart instead of one hour apart?",
      "The parallax p is defined as half the January-to-July swing. Sketch the skinny triangle and show where that half comes from.",
      "Stellar shifts are tiny. Why do astronomers count them in milliarcseconds instead of arcseconds?"
    ],
    postlab: [
      "For one target, show the full chain from full swing to p to distance, with units at every step.",
      "Compare one of your distances with the catalog value and report the percent error.",
      "When the measurements got noisier, what happened to your measured parallaxes of the far stars, and what does that say about real parallax work at the limit?",
      "Why does this triangle-only way stop working for far galaxies, and what must astronomers lean on once it fails?"
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
