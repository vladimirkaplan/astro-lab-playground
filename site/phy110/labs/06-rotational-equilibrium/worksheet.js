// PHY110 Lab 6 worksheet content: registers this lab's printable pre-lab/post-lab
// sheet with the shared engine (shared/worksheet.js loads before this file).
// The table mirrors the sim's Table 1 (Part I); the sim's own tables carry the
// Part II mass comparison and the Part III condition sheet.
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "06-rotational-equilibrium",
    labNumber: "6",
    title: "Torque balance on a meter stick",
    intro: "Weigh the clamp and hanger first, then balance 100 g against 50 g. Fill one row per quantity, left side then right side, in this order: clamp + hanger (g); hook weight (g); total M_T (g); total M_T (kg); X (m); F (N); d (m); tau (N m); the last row is the percent difference of the two torques.",
    table: {
      header: ["quantity", "left side", "right side"],
      blankRows: 9
    },
    prelab: [
      "Write the torque equation tau = F d, and say what d is at this bench.",
      "Write the equilibrium condition for two hanging masses, and say what each symbol stands for.",
      "Figure 3 shows a gate hinged at O on a 3-4-5 m layout, with a 400 N force at the far corner. What is the lever arm about O?",
      "What is the torque about O for that 400 N force? Use the lever arm from the question above.",
      "A 20 lb bag hangs 80 cm from the pivot of a bar. What mass must hang at 60 cm on the other side to balance it?"
    ],
    postlab: [
      "Do your two torques support the equilibrium condition tau_ccw = tau_cw? Show the percent difference of your two torques.",
      "With three clamps in Part III, is the condition still valid? Explain how you checked it.",
      "What error appears in the balance mark X2 if the mass of the clamp and hanger is ignored? Show it with numbers."
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
