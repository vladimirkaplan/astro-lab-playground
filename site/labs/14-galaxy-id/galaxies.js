// Lab 14 pure catalog: the ten Wikimedia Commons galaxies, the Hubble-sequence
// answer keys, seeded orderings and the grading helpers the page and the tests
// share. No DOM, no clock, no imports - Node tests this file directly.
//
// Numbers are rounded, representative published values (Wikipedia infobox data
// traceable to RC3/NED/SIMBAD/SEDS), named as approximate everywhere. Hubble
// stages follow the de Vaucouleurs extension of the tuning fork; the graded
// family/sub key per object is what the benches and exercises use.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var G = {};

  // Licence allowlist for every image in this catalog (board decision
  // 2026-11-08): public domain / CC0 / CC BY / CC BY-SA, any version.
  G.LICENSE_OK = /(public domain|cc0|cc by)/i;
  G.LICENSE_BAD = /nc|nd|no derivatives|non-?commercial|all rights reserved/i;

  var GALAXIES = [
    {
      key: "m87",
      name: "M87 (Virgo A)",
      designations: ["NGC 4486", "Virgo A"],
      family: "E", sub: "E1", hubStep: "E1",
      constellation: "Virgo",
      approxDistanceMly: 53.5, approxSizeArcmin: 7.2, vmag: 8.6,
      img: "m87.jpg",
      licenseShortName: "Public domain",
      credit: "NASA/Hubble Space Telescope",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:M87_optical_image.jpg",
      caption: "The supergiant elliptical at the centre of the Virgo cluster: a smooth glow of old stars with no arms anywhere.",
      reason: "A smooth, armless, dustless ball of old stars - ellipticals are featureless by definition, not by bad seeing."
    },
    {
      key: "m110",
      name: "M110 (NGC 205)",
      designations: ["NGC 205"],
      family: "E", sub: "dE10p", hubStep: "dE10p",
      constellation: "Andromeda",
      approxDistanceMly: 2.7, approxSizeArcmin: 21.9, vmag: 8.5,
      img: "m110.jpg",
      licenseShortName: "CC BY 4.0",
      credit: "NOIRLab/NSF/AURA",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:M110_-_Noao-m110.jpg",
      caption: "A faint dwarf elliptical travelling with M31 - the small, smooth sibling of the giant ellipticals.",
      reason: "Small, faint, smooth and elongated: a dwarf elliptical, still E-family, just at the scrawny end of it."
    },
    {
      key: "m31",
      name: "M31 (Andromeda)",
      designations: ["NGC 224"],
      family: "S", sub: "b", hubStep: "SA(s)b",
      constellation: "Andromeda",
      approxDistanceMly: 2.5, approxSizeArcmin: 190, vmag: 3.4,
      img: "m31.jpg",
      licenseShortName: "CC BY-SA 4.0",
      credit: "Lviatour",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Galaxie_d%27Androm%C3%A8de_M31.jpg",
      caption: "Our nearest great spiral seen at an angle: the disc reads as a flattened ellipse of light with a bright core.",
      reason: "A tilted disc with a bright bulge and arm light in the outer disc - the S family seen obliquely, not edge-on.",
      note: "Some modern catalogues give M31 a weak bar (SAB); this course keeps the classic SA(s)b, family S."
    },
    {
      key: "m33",
      name: "M33 (Triangulum)",
      designations: ["NGC 598"],
      family: "S", sub: "c", hubStep: "SA(s)c",
      constellation: "Triangulum",
      approxDistanceMly: 2.9, approxSizeArcmin: 70.8, vmag: 5.7,
      img: "m33.jpg",
      licenseShortName: "CC BY-SA 4.0",
      credit: "Denis Paryshev",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Triangulum_Galaxy_M33.jpg",
      caption: "A face-on late spiral: loose, patchy arms and pink star-forming knots around a small core.",
      reason: "Face-on, small bulge, open patchy arms: a late-type (c) spiral."
    },
    {
      key: "m51",
      name: "M51 (Whirlpool)",
      designations: ["NGC 5194", "NGC 5195"],
      family: "S", sub: "bc", hubStep: "SA(s)bc",
      constellation: "Canes Venatici",
      approxDistanceMly: 23, approxSizeArcmin: 11.2, vmag: 8.4,
      img: "m51.jpg",
      licenseShortName: "Public domain",
      credit: "NASA and European Space Agency",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Messier51_sRGB.jpg",
      caption: "The grand-design spiral caught mid-encounter: a small companion sharpened its two sweeping arms.",
      reason: "Two long, well-defined arms winding from a bright core - a spiral (interactions helped draw the arms, but the disc is the disc).",
      subNote: "Stage bc sits between b and c; either answer is accepted here."
    },
    {
      key: "m101",
      name: "M101 (Pinwheel)",
      designations: ["NGC 5457"],
      family: "S", sub: "c", hubStep: "SAB(r)c",
      constellation: "Ursa Major",
      approxDistanceMly: 21, approxSizeArcmin: 28.8, vmag: 7.9,
      img: "m101.jpg",
      licenseShortName: "CC BY 4.0",
      credit: "European Space Agency and NASA; processing Davide De Martin (ESA/Hubble)",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:M101_hires_STScI-PRC2006-10a.jpg",
      caption: "A big face-on flocculent spiral: many short arm fragments and a small, off-centre core.",
      reason: "Almost exactly face-on, late stage, flocculent arms around a tiny core - a classic S-family spiral.",
      note: "The catalogue writes SAB(r)c for a weak bar; for this bench the weak bar counts as plain S."
    },
    {
      key: "ngc1300",
      name: "NGC 1300",
      designations: ["NGC 1300"],
      family: "SB", sub: "b", hubStep: "SB(s)b",
      constellation: "Eridanus",
      approxDistanceMly: 61, approxSizeArcmin: 6.2, vmag: 11.4,
      img: "ngc1300.jpg",
      licenseShortName: "Public domain",
      credit: "NASA, ESA, and The Hubble Heritage Team (STScI/AURA)",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Hubble2005-01-barred-spiral-galaxy-NGC1300.jpg",
      caption: "The textbook barred spiral: arms break off the ends of a straight, bright bar through the core.",
      reason: "Bars are the giveaway - look for the straight lane of light through the core with the arms springing off its ends."
    },
    {
      key: "m104",
      name: "M104 (Sombrero)",
      designations: ["NGC 4594"],
      family: "S", sub: "a", hubStep: "SA(s)a",
      constellation: "Virgo",
      approxDistanceMly: 29.3, approxSizeArcmin: 9, vmag: 8.0,
      img: "m104.jpg",
      licenseShortName: "Public domain",
      credit: "NASA/ESA and The Hubble Heritage Team (STScI/AURA)",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:M104_ngc4594_sombrero_galaxy_hi-res.jpg",
      caption: "An edge-on spiral: a lens-shaped glow cut by a straight dust lane under a huge bulge.",
      reason: "Lens shape plus dust lane means a disc seen edge-on - an S family (early type a) lying on its side, not an elliptical.",
      edgeOn: true
    },
    {
      key: "ngc253",
      name: "NGC 253 (Silver Coin)",
      designations: ["NGC 253", "Sculptor Galaxy"],
      family: "S", sub: "c", hubStep: "SAB(s)c",
      constellation: "Sculptor",
      approxDistanceMly: 11.4, approxSizeArcmin: 27.5, vmag: 8.0,
      img: "ngc253.jpg",
      licenseShortName: "CC0",
      credit: "Dylan O'Donnell, deography.com",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Sculptor_Galaxy_up_Close.jpg",
      caption: "A dusty, starbursting disc seen edge-on: mottled lanes across a bright, bulging middle.",
      reason: "Another edge-on disc - the lumpy dust lanes and elongated glow say disc seen sideways, starburst on top.",
      edgeOn: true,
      note: "The catalogue writes SAB(s)c; the weak bar counts as plain S on this bench."
    },
    {
      key: "m82",
      name: "M82 (Cigar)",
      designations: ["NGC 3034", "Cigar Galaxy"],
      family: "Irr/pec", sub: "I0' starburst", hubStep: "I0' (starburst, interacting)",
      constellation: "Ursa Major",
      approxDistanceMly: 11.5, approxSizeArcmin: 11.2, vmag: 8.4,
      img: "m82.jpg",
      licenseShortName: "Public domain",
      credit: "NASA, ESA, and The Hubble Heritage Team (STScI/AURA)",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:M82_HST_ACS_2006-14-a-large_web.jpg",
      caption: "A starburst warped by its recent pass by M81: ragged lanes of glowing gas instead of an orderly disc.",
      reason: "No orderly arms or clean disc - filamentary gas and dust from a starburst stirred up by M81 put it in the peculiar/irregular box."
    }
  ];

  function deepFreezeEntry(e) {
    Object.freeze(e.designations);
    return Object.freeze(e);
  }

  G.GALAXIES = Object.freeze(GALAXIES.map(deepFreezeEntry));
  G.FAMILIES = Object.freeze(["E", "S", "SB", "Irr/pec"]);
  G.SUB_CHOICES = Object.freeze(["a", "b", "c"]);

  G.byKey = function (key) {
    for (var i = 0; i < G.GALAXIES.length; i++) {
      if (G.GALAXIES[i].key === key) return G.GALAXIES[i];
    }
    return null;
  };

  G.familyCounts = function () {
    var counts = {};
    G.FAMILIES.forEach(function (f) { counts[f] = 0; });
    G.GALAXIES.forEach(function (e) { counts[e.family]++; });
    return counts;
  };

  // Fisher-Yates over a copy with mulberry32 - same seeded shuffle the
  // benches use, so tests can pin the order.
  G.shuffleSeeded = function (list, seed) {
    var rnd = root.LS.units.mulberry32(seed);
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  };

  // Bench 1: the ten keys, one pass in seeded order.
  G.classifyOrder = function (seed) {
    return G.shuffleSeeded(G.GALAXIES.map(function (e) { return e.key; }), seed);
  };

  // Is a stage sub-answer accepted for an entry? Forgiving: a/b/c grades on
  // the tightness of winding blur into each other, so one step of slack is
  // allowed around the catalogued stage (bc centred between b and c).
  G.SUB_INDEX = { a: 0, ab: 0.5, b: 1, bc: 1.5, cd: 1.5, c: 2 };
  G.subAccepted = function (entry, sub) {
    if (entry.family !== "S" && entry.family !== "SB") return true;
    var center = G.SUB_INDEX[entry.sub];
    var pick = G.SUB_INDEX[sub];
    if (center === undefined || pick === undefined) return false;
    return Math.abs(center - pick) <= 1;
  };

  G.subRequired = function (entry) {
    return entry.family === "S" || entry.family === "SB";
  };

  // Bench 1 grading. family: one of G.FAMILIES; sub: one of G.SUB_CHOICES
  // (only consulted when the truth needs a sub). Returns the pieces the page
  // shows, including the teaching reason and, when relevant, the weak-bar note.
  G.gradeClassify = function (entry, family, sub) {
    var familyOK = family === entry.family;
    var needsSub = G.subRequired(entry);
    var subOK = !needsSub || G.subAccepted(entry, sub);
    var showNote = !familyOK && !!entry.note && family === "SB";
    return {
      familyOK: familyOK,
      subOK: subOK,
      ok: familyOK && subOK,
      needsSub: needsSub,
      reason: entry.reason,
      note: showNote ? entry.note : null
    };
  };

  // Bench 2: one identification round. Options are the target plus one
  // representative drawn from each of the other three families, so no round
  // ever tempts the student with two same-shape M-numbers as a trick. The
  // option order and the representative draws are seeded.
  G.identifyRound = function (key, seed) {
    var target = G.byKey(key);
    if (!target) return null;
    var rnd = root.LS.units.mulberry32(seed);
    var options = [target.name];
    G.FAMILIES.forEach(function (fam) {
      if (fam === target.family) return;
      var pool = G.GALAXIES.filter(function (e) { return e.family === fam; });
      options.push(pool[Math.floor(rnd() * pool.length)].name);
    });
    // seeded shuffle of the option order (independent stream)
    var shuffleRnd = root.LS.units.mulberry32(seed ^ 0x5EED);
    for (var i = options.length - 1; i > 0; i--) {
      var j = Math.floor(shuffleRnd() * (i + 1));
      var t = options[i]; options[i] = options[j]; options[j] = t;
    }
    return { key: key, options: options, answer: target.name };
  };

  // Bench 2 full pass: all ten rounds in seeded order, each with its own
  // derived round seed, so the page and the tests replay identically.
  G.identifyPass = function (seed) {
    return G.classifyOrder(seed).map(function (key, i) {
      return G.identifyRound(key, (seed + i * 7919) >>> 0);
    });
  };

  // Exercise payloads in index.html reference these; tests re-derive from here.
  G.check = {
    barredKey: "ngc1300",
    edgeOnKeys: ["m104", "ngc253"],
    m31DistanceMly: G.byKey("m31").approxDistanceMly,
    ellipseFamily: G.byKey("m87").family,
    starburstKey: "m82"
  };

  root.LS.galaxies = G;
})(typeof globalThis !== "undefined" ? globalThis : window);
