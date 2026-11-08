// Authored content for Homework 1 practice: the concept-check pool that the
// Simulate tab samples and shuffles per attempt, and the six "exam-style" quiz
// payloads that the Check tab renders through shared/check.js. Pure data and
// grading logic - no DOM, no imports, no network, no clock - so Node can test
// every prompt, option, and answer against site/homework/hw-core.js.
//
// Every sentence here is original practice wording written to rehearse the
// METHOD of the course's first homework set (stars, galaxies, units, scientific
// notation). It reproduces no lab-manual or handout text, figures, or answers;
// the physics and definitions are public facts. Numbers used by the quiz are
// verified against LS.hwCore (course c = 300000 km/s, exact unit factors), and
// the benches draw FRESH randomised numbers on every attempt so this page can
// never fill in a graded assignment's blanks.
// Constants and data sources:
// - c = 300000 km/s is the rounded classroom value; the precise vacuum value is
//   299792.458 km/s (NIST SP 811). The page shows both, honestly labelled.
// - Unit factors (1 mi = 5280 ft, 1 ft = 12 in, 1 in = 2.54 cm) and SI prefixes
//   (micro = 1e-6, milli = 1e-3, mega = 1e6, nano = 1e-9) are exact definitions
//   per NIST SP 811 / the SI Brochure.
// - Concept framing (what a star is, galaxy classes, AU, heliocentrism, fusion
//   conditions) follows OpenStax Astronomy 2e (CC BY 4.0) in plain restatement.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var C = {};

  C.LAB = "hw1";
  C.TITLE = "Homework 1 practice: stars, galaxies, units, scientific notation";

  // One honest line the page shows up top. Practice only, never a submission.
  C.DISCLAIMER =
    "This rehearses the homework METHOD with freshly generated numbers each " +
    "attempt. It is not a submission channel and it does not compute your graded " +
    "assignment's blanks - the generators make new values every time you load it.";

  // ---- concept-check pool -------------------------------------------------
  // Each item: original wording, four options (t) with a one-line "why" for
  // each (shown on check), and `correct` = index into the ORIGINAL option
  // order. sim.js shuffles the displayed order per attempt so position never
  // leaks the answer; check.js shuffles its own choice lists the same way.
  C.CONCEPTS = [
    {
      id: "star-and-count", family: "concepts",
      q: "What is a star, and how many of them does the Solar System have?",
      options: [
        { t: "A self-luminous ball of hot gas with fusion in its core, held up by its own gravity; the Solar System has exactly one - the Sun",
          why: "Correct: gravity squeezes the core hot enough to fuse so the star shines, and our Solar System has a single star, the Sun." },
        { t: "A rocky body that reflects a planet's light; the Solar System has one", why: "That describes a moon, not a star; stars make their own light by fusion." },
        { t: "A ball of hot gas with fusion in its core; the Solar System has one for each planet", why: "Right definition, wrong count: planets are not stars, so the Solar System has exactly one star." },
        { t: "A hole in space that traps light; the Solar System has none", why: "That is a black hole; the Sun is a fusion star and is the Solar System's only one." }
      ],
      correct: 0
    },
    {
      id: "why-energy", family: "concepts",
      q: "Why do stars matter to life on Earth as an energy source?",
      options: [
        { t: "The Sun's fusion light drives weather, photosynthesis, and nearly every food chain",
          why: "Correct: sunlight is the energy input for climate and for the plants at the base of food webs." },
        { t: "Stars provide the gravity that holds atoms together", why: "Atomic structure is set by electromagnetism and the nuclear force, not stellar gravity." },
        { t: "Starlight is what makes the ground warm from inside the Earth", why: "Warm ground comes from Earth's internal heat and radioactivity, not from starlight." },
        { t: "They matter only for navigation, not for energy", why: "Navigation is one use; as an energy source the Sun's light is the whole point." }
      ],
      correct: 0
    },
    {
      id: "why-elements", family: "concepts",
      q: "Why are stars called the universe's element factories?",
      options: [
        { t: "Fusion in stars builds heavier elements from light ones, and dying stars scatter them into space",
          why: "Correct: stars forge carbon, oxygen, iron and more, and return them to the gas that seeds new stars and planets." },
        { t: "Stars are made only of hydrogen and never change", why: "Stars do fuse hydrogen into heavier nuclei over their lives." },
        { t: "Elements were all created fully formed at the Big Bang", why: "The Big Bang made mostly hydrogen and helium; the heavier elements came later from stars." },
        { t: "Elements are mined from the vacuum between galaxies", why: "There is no such mining; the atoms in your body were made in stars." }
      ],
      correct: 0
    },
    {
      id: "why-gravity", family: "concepts",
      q: "In what sense is a star a 'gravity anchor' for a planetary system?",
      options: [
        { t: "Its huge mass means planets orbit around it rather than around each other",
          why: "Correct: the star holds most of the system's mass, so its gravity sets the orbits." },
        { t: "It pushes planets away with solar wind so they never collide", why: "Solar wind is a thin stream of particles; orbits are set by gravity, not by a push." },
        { t: "It has a magnetic field that physically carries the planets", why: "Magnetic fields do not carry planets; gravity governs the orbits." },
        { t: "It is the hottest object, and heat attracts matter", why: "Heat does not pull planets in; mass and gravity do." }
      ],
      correct: 0
    },
    {
      id: "galaxy-def", family: "concepts",
      q: "What is a galaxy, and name one example.",
      options: [
        { t: "A gravitationally bound system of billions to trillions of stars, gas, and dust - the Milky Way is one",
          why: "Correct: a galaxy is a vast star system held together by gravity; the Milky Way and Andromeda are examples." },
        { t: "A single star with its planets", why: "That is a planetary system, a tiny part of one galaxy." },
        { t: "A cloud of gas where stars are born", why: "That is a nebula, a small component inside a galaxy." },
        { t: "The empty space between two stars", why: "Empty space is not a galaxy; a galaxy is the bound collection of stars and gas itself." }
      ],
      correct: 0
    },
    {
      id: "nebula", family: "concepts",
      q: "What is a nebula?",
      options: [
        { t: "A cloud of gas and dust in space - some are star-birthing regions, some are the debris of dead stars",
          why: "Correct: nebulae are interstellar clouds; some form stars, some are stellar remains." },
        { t: "A galaxy far outside our own", why: "Early telescopes mistook some nebulae for galaxies, but a nebula is a cloud within a galaxy." },
        { t: "A planet with rings", why: "Ringed planets are within Solar Systems; nebulae are diffuse clouds spread across light-years." },
        { t: "A beam of radiation from a black hole", why: "That is a jet; a nebula is ordinary matter shaped by gravity and starlight." }
      ],
      correct: 0
    },
    {
      id: "supernova", family: "concepts",
      q: "What is a supernova?",
      options: [
        { t: "The violent explosion that ends a massive star's life (or destroys a white dwarf), briefly outshining a whole galaxy",
          why: "Correct: a supernova is a stellar explosion, among the most energetic events, and it forges and spreads heavy elements." },
        { t: "A new star just switched on by fusion", why: "A newly ignited star is a protostar; a supernova is a star dying, not being born." },
        { t: "A sudden brightening of the Sun's surface", why: "That is a solar flare; a supernova destroys an entire star." },
        { t: "Two galaxies colliding", why: "That is a galaxy collision; a supernova happens to a single star." }
      ],
      correct: 0
    },
    {
      id: "au", family: "concepts",
      q: "What is an astronomical unit (AU)?",
      options: [
        { t: "The average Earth-Sun distance, about 150 million km, used as a ruler inside the Solar System",
          why: "Correct: 1 AU is roughly the Earth-Sun distance, a handy scale for planetary orbits." },
        { t: "The distance light travels in one year", why: "That is a light-year; an AU is about 8 light-MINUTES, vastly smaller." },
        { t: "The distance across the Milky Way", why: "The Galaxy is about 100,000 light-years wide, about 6 billion AU; an AU is one Earth-Sun spacing." },
        { t: "The mass of the Sun", why: "An AU measures distance, not mass." }
      ],
      correct: 0
    },
    {
      id: "geo-helio", family: "concepts",
      q: "In the geocentric versus heliocentric models, who puts what at the centre?",
      options: [
        { t: "Geocentric puts Earth at the centre; heliocentric puts the Sun at the centre",
          why: "Correct: geo = Earth-centred (Ptolemy), helio = Sun-centred (Copernicus), and heliocentrism matches the observations." },
        { t: "Both put the Sun at the centre; they differ only in the year's length", why: "The defining difference is the centre: Earth versus Sun." },
        { t: "Geocentric puts the Sun at the centre; heliocentric puts Earth there", why: "That reverses the two models." },
        { t: "Both put Earth at the centre but disagree about the planets' order", why: "They disagree about the centre itself, not just the ordering." }
      ],
      correct: 0
    },
    {
      id: "hubble-classes", family: "concepts",
      q: "Which set lists Hubble's main classes of galaxy?",
      options: [
        { t: "Elliptical, spiral, and irregular",
          why: "Correct: Hubble sorted galaxies into smooth ellipticals, disk-and-arm spirals, and shapeless irregulars." },
        { t: "Red, yellow, and blue", why: "Those are colour/temperature descriptions, not Hubble's structural classes." },
        { t: "Solid, liquid, and gas", why: "Those are states of matter; galaxies are not classified by them." },
        { t: "Main sequence, giant, and dwarf", why: "Those are stellar evolutionary classes, not galaxy classes." }
      ],
      correct: 0
    },
    {
      id: "planet-def", family: "concepts",
      q: "What is a planet, and name one example?",
      options: [
        { t: "A large body orbiting a star, massive enough to be rounded by its own gravity and to have cleared its orbit - Jupiter is one",
          why: "Correct: that is the working definition; Jupiter, Earth, and Mars are examples." },
        { t: "Any object that twinks in the night sky", why: "Twinkling is atmospheric; most twinkling points are stars, not planets." },
        { t: "A small moon that orbits another moon", why: "Planets orbit stars, not other moons." },
        { t: "A star too small to shine", why: "Too-small stars are brown dwarfs; a planet never runs sustained core fusion." }
      ],
      correct: 0
    },
    {
      id: "fusion-core", family: "concepts",
      q: "Why does nuclear fusion require a stellar core rather than a planet's surface?",
      options: [
        { t: "Fusing nuclei needs the extreme temperature and pressure that only a massive, self-gravitating core can reach",
          why: "Correct: positive nuclei repel, so only the core's heat and squeeze are enough to force them together." },
        { t: "Fusion happens anywhere there is hydrogen, even on a cold rock", why: "Without the core's temperature and pressure, hydrogen nuclei never get close enough to fuse." },
        { t: "Fusion needs a magnetic field that only planets have", why: "Planets do not power fusion; stars do, and it is heat and pressure that matter." },
        { t: "Fusion is a chemical reaction like burning, so any warm surface works", why: "Fusion is nuclear, not chemical, and needs conditions millions of times beyond a warm surface." }
      ],
      correct: 0
    }
  ];
  Object.freeze(C.CONCEPTS);
  C.CONCEPTS.forEach(function (c) {
    Object.freeze(c);
    Object.freeze(c.options);
    c.options.forEach(Object.freeze);
  });

  // How many of the pool to draw per practice attempt.
  C.CONCEPTS_PER_ATTEMPT = 10;

  // ---- exam-style quiz (6 items, one from each bench family) --------------
  // These are exactly the exercise configs shared/check.js grades, authored as
  // data so the Check tab renders and tests can verify them. Bench families
  // covered: concepts (2), unit chain (1), light travel (1), sci notation (2).
  // Every numeric answer is verified against LS.hwCore by tests/hw-content.test.js.
  C.QUIZ = [
    {
      type: "choice", family: "concepts",
      q: "1. A star generates its own light because, deep in its core,",
      options: [
        "gravity squeezes the gas hot and dense enough for nuclear fusion to fuse hydrogen into helium",
        "the surface is on fire, burning hydrogen the way a flame burns gas",
        "the star reflects sunlight back at us",
        "friction from the star's spin heats it until it glows"
      ],
      correct: 0,
      hints: ["A flame is chemistry; a star outshines chemistry.",
        "What does gravity do to gas when it squeezes it?",
        "Fusion, not burning."],
      working: "A star shines from <strong>nuclear fusion</strong>: its own gravity crushes the core to millions of degrees and immense pressure, forcing hydrogen nuclei to fuse into helium and release energy. It is not combustion (no oxygen in space), not reflection, and spin-friction is nowhere near enough. (OpenStax <em>Astronomy 2e</em>, CC BY 4.0.)",
      answer: "gravity ignites fusion in the core"
    },
    {
      type: "choice", family: "concepts",
      q: "2. Which pairing correctly matches each ancient world-system to what it placed at the centre?",
      options: [
        "geocentric = Earth at the centre, heliocentric = Sun at the centre",
        "geocentric = Sun at the centre, heliocentric = Earth at the centre",
        "both place the Sun at the centre and differ only about the Moon",
        "both place Earth at the centre and differ only about the order of the planets"
      ],
      correct: 0,
      hints: ["geo = Earth, helio = Sun.", "The prefix names the centre.",
        "Ptolemy versus Copernicus."],
      working: "<strong>Geo</strong>centric (Ptolemy) puts <strong>Earth</strong> still at the centre; <strong>helio</strong>centric (Copernicus) puts the <strong>Sun</strong> at the centre with Earth a planet orbiting it. The centre is the whole difference.",
      answer: "geo = Earth-centred, helio = Sun-centred"
    },
    {
      type: "numbers", family: "unit-chain",
      q: "3. A survey line is 3 miles long. Using 1 mi = 5280 ft, how long is it in feet?",
      parts: [{ label: "length", unit: "ft", value: 15840, tolPct: 0.01 }],
      hints: ["Multiply the miles by 5280.", "3 x 5280, done.",
        "Keep all the digits: this factor is exact."],
      working: "3 mi x 5280 ft/mi = <strong>15840 ft</strong>. The chain is a single cited rung, 1 mi = 5280 ft, so the factor is exact and the answer should match to the unit. (Factor per NIST SP 811.)",
      answer: "15840 ft"
    },
    {
      type: "numbers", family: "light-travel",
      q: "4. How far does light travel in one week, at the course value c = 300000 km/s? Give the distance in km.",
      parts: [{ label: "distance", unit: "km", value: 181440000000, tolPct: 1 }],
      hints: ["A week is 7 x 24 x 60 x 60 = 604800 s.",
        "distance = c x time.", "300000 x 604800; type it as 1.8144e11 if you like."],
      working: "One week = 7 x 24 x 3600 = <strong>604800 s</strong>. Distance = c x t = 300000 km/s x 604800 s = <strong>1.8144 x 10^11 km</strong> (181,440,000,000 km). The course rounds c to 300000 km/s; the precise vacuum value is 299792.458 km/s, which would change this by only about 0.002%.",
      answer: "about 1.814 x 10^11 km"
    },
    {
      type: "numbers", family: "sci-notation",
      q: "5. Write 500 micrometres (500 um) in scientific notation, in metres. Enter the mantissa and the exponent separately.",
      parts: [
        { label: "mantissa", unit: "", value: 5, tolPct: 0.1 },
        { label: "exponent", unit: "(power of 10)", value: -4, tolAbs: 0 }
      ],
      hints: ["micro means 10^-6, so 500 um = 500 x 10^-6 m.",
        "500 x 10^-6 = 5 x 10^-4 once the mantissa is between 1 and 10.",
        "Do not confuse micro (10^-6) with milli (10^-3)."],
      working: "500 um = 500 x 10^-6 m = <strong>5 x 10^-4 m</strong>, so the mantissa is <strong>5</strong> and the exponent is <strong>-4</strong>. The classic trap: <strong>micro</strong> (u, 10^-6) is a thousand times smaller than <strong>milli</strong> (m, 10^-3). Reading 500 um as milli would give 5 x 10^-1 m - off by exactly 10^3. (SI prefixes per NIST SP 811 / SI Brochure.)",
      answer: "5 x 10^-4 m (mantissa 5, exponent -4)"
    },
    {
      type: "numbers", family: "sci-notation",
      q: "6. Write 0.00042 in scientific notation. Enter the mantissa and the exponent separately.",
      parts: [
        { label: "mantissa", unit: "", value: 4.2, tolPct: 0.1 },
        { label: "exponent", unit: "(power of 10)", value: -4, tolAbs: 0 }
      ],
      hints: ["Move the decimal point right until one nonzero digit sits left of it.",
        "0.00042 -> 4.2 means the point moved 4 places.",
        "Moving right over small numbers keeps the exponent negative."],
      working: "Slide the point four places right: 0.00042 = <strong>4.2 x 10^-4</strong>, mantissa <strong>4.2</strong>, exponent <strong>-4</strong>. The mantissa must land in [1, 10), which fixes the exponent uniquely; a value below one always has a negative exponent.",
      answer: "4.2 x 10^-4 (mantissa 4.2, exponent -4)"
    }
  ];
  Object.freeze(C.QUIZ);
  C.QUIZ.forEach(function (qq) {
    Object.freeze(qq);
    if (qq.options) Object.freeze(qq.options);
    if (qq.parts) { Object.freeze(qq.parts); qq.parts.forEach(Object.freeze); }
    if (qq.hints) Object.freeze(qq.hints);
  });

  root.LS.hw1Content = C;
})(typeof window !== "undefined" ? window : globalThis);
