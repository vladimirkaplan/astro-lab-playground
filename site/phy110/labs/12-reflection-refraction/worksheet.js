// PHY110 Lab 12 worksheet content: registers this lab's printable pre-lab/
// post-lab sheet with the shared engine (shared/worksheet.js loads before
// this file). The table mirrors the sim's records: one row per printed
// incidence angle with its partner angle, for whichever part the sheet is
// used on.
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "12-reflection-refraction",
    labNumber: "12",
    title: "Reflection, refraction, and the critical angle",
    intro: "The tank has a circular graduated scale centred on the beam impact point, and the water line sits at the 90 mark. For the reflection part, work the printed set from 45 to 80 degrees in 5-degree steps and log the partner angle each time. For the refraction part, work 10 to 80 degrees in 10-degree steps. Below the table, log your measured critical angle and the index of water you compute from it with n = 1/sin(theta_c).",
    table: {
      header: ["Part", "Incidence (deg)", "Reflected or refracted (deg)"],
      blankRows: 10
    },
    prelab: [
      "Incidence and refraction angles are measured from which line: the water surface or the normal to it?",
      "State the law of reflection in symbols, with the angles measured from the normal.",
      "For total internal reflection to be possible, on which side of the surface must the denser medium sit?",
      "When light enters water from air, what happens to its speed, and what happens to its frequency?"
    ],
    postlab: [
      "Does your graph support the law of reflection? Point to the feature in your line that says so.",
      "From air into water, does the ray bend toward the normal or away from it? Say why.",
      "Use your measured critical angle to compute the index of water, and show your work with n = 1/sin(theta_c).",
      "Where does the light go once total internal reflection has started?"
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
