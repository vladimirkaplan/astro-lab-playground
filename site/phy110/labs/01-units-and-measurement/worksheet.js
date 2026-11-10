// PHY110 Lab 1 worksheet content: registers this lab's printable pre-lab/post-lab
// sheet with the shared engine (shared/worksheet.js loads before this file).
// Prompts follow the manual's own laboratory questions, rewritten in plain words.
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "01-units-and-measurement",
    labNumber: "1",
    title: "Units, instruments, and percent error",
    intro: "Read four instruments, change units, average five timings, and say how far from the accepted value your answer landed.",
    table: {
      header: ["quantity", "reading", "unit", "converted", "converted unit",
        "accepted", "percent error"],
      units: ["name", "number", "cm, g, mL, N, C ...", "number", "in, lb, fl oz, lbf, F ...",
        "number", "%"],
      blankRows: 16
    },
    prelab: [
      "A measured value has two parts. Name both parts and give one example of each from something you measured at home today.",
      "Change 3.2 km into m on one line, and write the factor you multiplied by so the km cancels.",
      "Write the rule that turns degrees C into degrees F, and say what each letter in it stands for.",
      "Match each tool to what it answers: ruler, balance, spring scale, graduated cylinder.",
      "One foot is 12 inches, so how many cubic inches are in one cubic foot? Show why the answer is not 12."
    ],
    postlab: [
      "Report the length of the walkway or board you paced: steps counted, your step size in ft per step, and the length in ft.",
      "Take your object's volume, mass, and weight and change them to fl oz, lb, and lbf. Write the factor you used on each line.",
      "Write your water temperature in C and in F, and show the arithmetic both ways.",
      "Sort these units into SI or British: fl oz, cm, mL, yd, N, lb, F, kg, C. Then circle the larger unit in each pair: cm or in, m or yd, qt or L, mi or km, kg or lb, 100 C or 100 F.",
      "Fill the blanks with the course factors: 1 in = ___ cm, 1 yd = ___ m, 1 mi = ___ km, 1 gal = ___ L, 1 lb = ___ kg, 1 kg = ___ lb.",
      "Estimate these before you measure anything: ceiling height in ft, a dollar bill in cm, the mass of a quart of milk in kg, the mass of a gallon of paint in lb. Then check one of them and give the percent error."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
