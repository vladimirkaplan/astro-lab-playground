// PHY110 Lab 14 worksheet content: registers this lab's printable pre-lab/
// post-lab sheet with the shared engine (shared/worksheet.js loads before
// this file). The manual ships no numeric table: the sheet carries one row
// per source strip with the plotted line positions and colours, mirroring
// the sim's line chart.
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "14-spectra",
    labNumber: "14",
    title: "Line and continuous spectra with a spectroscope",
    intro: "Look at each lamp through the grating spectroscope and sweep the spectrum. Plot the lines you see onto the source strips on the 380 to 700 nm chart, and draw the filament's continuous band. For the unknown gas, plot its lines on the strip you think they belong to, then record your call.",
    table: {
      header: ["Source strip", "Line positions (nm)", "Line colours", "Spectrum type"],
      blankRows: 8
    },
    prelab: [
      "Contrast a continuous spectrum with a line spectrum, and name one source of each.",
      "Which part inside a spectroscope splits the light into its colours, the slit or the grating?",
      "Why are the emission lines of an element called its fingerprint?",
      "Which visible colour has the longest wavelength, violet or red?"
    ],
    postlab: [
      "Define a spectrum in your own words.",
      "Is white light one colour or a mixture? Give the evidence from your view.",
      "If your plotted lines match a known set, what does that tell you about the gas?",
      "Which spectrum type does the filament bulb give?",
      "Which type or types of spectrum appear in the fluorescent tube?"
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
