// Authored content for Homework 2 practice: the honest framing of the ratio
// method, the worked-law strings shown only after a check, the live-ratio panel
// labels, and the six "exam-style" quiz payloads the Check tab renders through
// shared/check.js. Pure data - no DOM, no imports, no network, no clock - so
// Node can verify every quiz answer against site/homework/hw-core.js.
//
// The two ratio solvers and every table row come from LS.hwCore
// (genRatioTable('gravity' | 'accel')), so the benches draw FRESH randomised
// rows each attempt and can never reproduce a graded assignment's numbers.
// Physics facts (Newton's law of gravitation, Newton's second law) are public;
// every sentence here is original practice wording that reproduces no lab-manual
// or handout text. Course framing follows OpenStax Astronomy 2e (CC BY 4.0).
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var C = {};

  C.LAB = "hw2";
  C.TITLE = "Homework 2 practice: Newton's gravitation and second-law ratios";

  C.DISCLAIMER =
    "This rehearses the ratio METHOD with freshly generated rows every attempt. " +
    "It is not a submission channel and it does not compute your graded " +
    "assignment's blanks - the generators make new rows each time you load it.";

  // The one honest intro line the brief asks for, and nothing editorial after it.
  C.INTRO =
    "For a fixed pair of masses the product k = G m1 m2 is just a constant, so " +
    "F = k / d^2 and F = G m1 m2 / d^2 give the SAME ratios: F1/F2 = (d2/d1)^2 " +
    "either way. The worksheet's choice of notation never changes a ratio answer.";

  // Worked-law lines. Shown after a check, never before the student tries.
  C.LAW_GRAVITY = "F1/F2 = (d2/d1)^2  (Newton's law of gravitation: double the distance, quarter the force)";
  C.LAW_ACCEL = "a1/a2 = m2/m1  (Newton's second law at constant force, a = F/m: four times the mass, a quarter of the acceleration)";

  // ---- exam-style quiz (6 items, one per bench family) --------------------
  // Families: Table A forward, Table A reverse, Table B forward, Table B
  // reverse, notation-invariance concept, live-ratio sanity. Every number is
  // re-derived from LS.hwCore in tests/hw-content.test.js.
  C.QUIZ = [
    {
      type: "numbers", family: "tableA-forward",
      q: "1. Table A, forward. Two masses sit so that d1 = 4 d2. Using F = G m1 m2 / d^2, what is the force ratio F1/F2?",
      parts: [{ label: "F1/F2", unit: "", value: 1 / 16, tolPct: 1 }],
      hints: ["For the same masses, F is proportional to 1/d^2.",
        "F1/F2 = (d2/d1)^2.", "d2/d1 = 1/4, squared is 1/16 = 0.0625."],
      working: "Same masses, so F1/F2 = (d2/d1)^2 = (1/4)^2 = <strong>1/16 = 0.0625</strong>. " +
        "Four times the distance means one-sixteenth the force. The constant k = G m1 m2 " +
        "cancels in the ratio, so F = k/d^2 and F = G m1 m2/d^2 give the identical answer. " +
        "(Newton's law of gravitation; course framing after OpenStax <em>Astronomy 2e</em>, CC BY 4.0.)",
      answer: "1/16 = 0.0625"
    },
    {
      type: "numbers", family: "tableA-reverse",
      q: "2. Table A, reverse. The handout tells you 9 F1 = 25 F2 for the same two masses. What is the distance relation d1/d2?",
      parts: [{ label: "d1/d2", unit: "", value: 0.6, tolPct: 1 }],
      hints: ["9 F1 = 25 F2 means F1/F2 = 25/9.",
        "F1/F2 = (d2/d1)^2, so d2/d1 = sqrt(25/9) = 5/3.",
        "You want d1/d2, the reciprocal: 3/5."],
      working: "9 F1 = 25 F2 gives F1/F2 = 25/9. Since F1/F2 = (d2/d1)^2, take the root: " +
        "d2/d1 = 5/3, therefore <strong>d1/d2 = 3/5 = 0.6</strong>. The bigger force sits at the " +
        "smaller distance, which is exactly what an inverse-square law demands: F1 wins, so d1 " +
        "loses, and d1/d2 comes out below 1. This reverse reading is the skill the worksheet tests.",
      answer: "3/5 = 0.6"
    },
    {
      type: "numbers", family: "tableB-forward",
      q: "3. Table B, forward. The same force acts on two carts with m1 = 5 m2. What is the acceleration ratio a1/a2?",
      parts: [{ label: "a1/a2", unit: "", value: 0.2, tolPct: 1 }],
      hints: ["a = F/m, with the same F for both.",
        "a1/a2 = (F/m1)/(F/m2) = m2/m1.", "m2/m1 = 1/5 = 0.2."],
      working: "Constant force, so a = F/m and a1/a2 = m2/m1 = 1/5 = <strong>0.2</strong>. " +
        "Five times the mass gets one-fifth the acceleration. Notice it is the inverse of the " +
        "mass ratio - the mass you divide by is on the bottom. (Newton's second law.)",
      answer: "1/5 = 0.2"
    },
    {
      type: "numbers", family: "tableB-reverse",
      q: "4. Table B, reverse. Same force on both, and the sheet says 3 a1 = 5 a2. What is the mass relation m1/m2?",
      parts: [{ label: "m1/m2", unit: "", value: 0.6, tolPct: 1 }],
      hints: ["3 a1 = 5 a2 means a1/a2 = 5/3.",
        "a1/a2 = m2/m1, so m2/m1 = 5/3.", "You want m1/m2, the reciprocal: 3/5."],
      working: "3 a1 = 5 a2 gives a1/a2 = 5/3. Because a1/a2 = m2/m1, we have m2/m1 = 5/3, so " +
        "<strong>m1/m2 = 3/5 = 0.6</strong>. The object that accelerates MORE is the LESS massive " +
        "one, so the one with the larger a (here object 1) has the smaller m, and m1/m2 falls below 1. " +
        "Same inverse logic as the gravity reverse rows, just with a = F/m.",
      answer: "3/5 = 0.6"
    },
    {
      type: "choice", family: "notation-concept",
      q: "5. The worksheet lets you write the force law as F = k/d^2 (lumping the masses into a constant k) or as F = G m1 m2/d^2. How does that choice affect a ratio answer like F1/F2 for a fixed pair of masses?",
      options: [
        "Not at all: for fixed masses k = G m1 m2 is a constant that cancels in the ratio, so F1/F2 = (d2/d1)^2 either way",
        "It doubles the ratio, because G carries units the constant k does not",
        "It inverts the ratio, because k sits in the numerator while G m1 m2 sits in the denominator",
        "It changes the answer only if the distance is also squared"
      ],
      correct: 0,
      hints: ["What is k in terms of G, m1, m2?", "Same masses in F1 and F2 means the same k in both.",
        "A constant that appears in both numerator and denominator cancels."],
      working: "For a fixed pair of masses, k = G m1 m2 is a single constant that multiplies both " +
        "F1 and F2, so it cancels: F1/F2 = (k/d1^2)/(k/d2^2) = <strong>(d2/d1)^2</strong>, identical " +
        "whether you write k or G m1 m2. Notation never moves a ratio - only the distances (or masses) " +
        "that actually change do.",
      answer: "no effect: the constant cancels, the ratio is (d2/d1)^2 either way"
    },
    {
      type: "numbers", family: "live-sanity",
      q: "6. On the live bench, slide the distance so the second position is twice the first (d2 = 2 d1), masses unchanged. What is F1/F2?",
      parts: [{ label: "F1/F2", unit: "", value: 4, tolPct: 1 }],
      hints: ["F1/F2 = (d2/d1)^2.", "d2/d1 = 2.", "2 squared is 4. Equal distances would give 1."],
      working: "F1/F2 = (d2/d1)^2 = 2^2 = <strong>4</strong>: the closer position feels four times the " +
        "force. It is the inverse-square law the live panel redraws as you move the slider. Sanity " +
        "check the panel shows: when both the masses and the distances are equal, every ratio is " +
        "exactly 1, and doubling the distance always quarters the force.",
      answer: "4 (and equal inputs give ratio 1)"
    }
  ];
  Object.freeze(C.QUIZ);
  C.QUIZ.forEach(function (qq) {
    Object.freeze(qq);
    if (qq.options) Object.freeze(qq.options);
    if (qq.parts) { Object.freeze(qq.parts); qq.parts.forEach(Object.freeze); }
    if (qq.hints) Object.freeze(qq.hints);
  });

  root.LS.hw2Content = C;
})(typeof window !== "undefined" ? window : globalThis);
