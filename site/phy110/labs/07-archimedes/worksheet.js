// PHY110 Lab 7 worksheet content: registers this lab's printable pre-lab/post-lab
// sheet with the shared engine (shared/worksheet.js loads before this file).
// The table mirrors the sim's Table 1 (volume route); the sim's Table 2 carries
// the weight-route numbers and the percent difference against Table 1.
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "07-archimedes",
    labNumber: "7",
    title: "Buoyant force and Archimedes' principle",
    intro: "Fill one row per metal, copper first, then tin, then zinc. Columns in this order: symbol; material; V_water in mL; V_water plus cylinder in mL; V_o in mL; V_o in m^3; F_b in N. The weight-route numbers (mass in air, F_g, apparent mass, F_g apparent, F_b, and the percent difference against this table) go on the data page in the sim.",
    table: {
      header: ["symbol", "material", "V_water (mL)", "V_water+cyl (mL)", "V_o (mL)", "V_o (m^3)", "F_b (N)"],
      blankRows: 8
    },
    prelab: [
      "State Archimedes' principle in one sentence, in your own words.",
      "Define V_f, the displaced volume. When is V_f exactly the object's own volume V_o?",
      "A copper block and a tin block have the same volume and are both fully submerged. How do their buoyant forces compare, and why?",
      "You lower the hooked cylinder into the graduated cylinder. What does the rising water level measure?",
      "Convert 2.5 mL to cubic metres. Show each step of the conversion."
    ],
    postlab: [
      "Compare your two F_b numbers from the two routes. What do they say about Archimedes' principle? Show the percent difference.",
      "Name two things that could make your two routes disagree, and say how each one moves the number.",
      "The cylinder's apparent weight drops in the water while its true mass stays the same. Explain why."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
