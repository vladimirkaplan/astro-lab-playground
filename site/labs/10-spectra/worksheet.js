// Lab 10 worksheet content: registers this lab's printable pre-lab/post-lab
// worksheet with the shared engine (shared/worksheet.js loads before this file).
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "10-spectra",
    labNumber: "10",
    title: "Spectra",
    intro: "Each source paints its own picture through the grating. Log every bright line you mark, with its position and color word.",
    table: {
      header: ["Light source", "Marked line position (nm)", "Color word", "Continuous or discrete lines?"],
      blankRows: 20
    },
    prelab: [
      "In your own words, what does a diffraction grating do to white light before it reaches your eye?",
      "Predict how the picture from a glowing gas tube will differ from the picture of an incandescent bulb, before you look through the scope.",
      "Why is a list of line positions a better ID card for a gas than a color name?",
      "To compare line positions between sources fairly, what must stay fixed while you swing the spectroscope from source to source?"
    ],
    postlab: [
      "Which sources showed continuous spectra and which showed separate bright lines? Name one of each from your own log.",
      "Pick one unknown you matched: name the two or more lines that convinced you and the element they pointed to.",
      "Why can a single line rarely identify an element by itself? What property of the whole pattern does the matching?",
      "If a star's spectrum had dark lines sitting at exactly the positions of bright lab lines, what would that tell an astronomer about the star?"
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
