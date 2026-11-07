// Star catalog for the Celestial Sphere lab sim: naked-eye bright stars whose
// positions the students can drill on an RA/Dec star map. Pure data (no DOM),
// so Node can test it.
//
// Source: Yale Bright Star Catalog v5, public values, J2000, rounded;
// curated subset: naked-eye V <= 3.7 plus Polaris and Eta Cas, which the
// course drills. Where commonly printed values conflict (for example a
// multiple star listed by component or combined, or two rounded magnitudes
// in circulation), the more-cited value was used. Variables carry their
// typical visual magnitude (Betelgeuse, Algol, Navi).
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  var D = {};

  // name: proper name, con: 3-letter constellation, ra: hours (J2000),
  // dec: degrees, mag: visual magnitude.
  D.list = [
    // Cassiopeia, Andromeda, Pegasus, Cepheus and neighbors
    { name: "Alpheratz", con: "And", ra: 0.14, dec: 29.1, mag: 2.1 },
    { name: "Delta Andromedae", con: "And", ra: 0.66, dec: 30.9, mag: 3.3 },
    { name: "Mirach", con: "And", ra: 1.16, dec: 35.6, mag: 2.1 },
    { name: "Almach", con: "And", ra: 2.07, dec: 42.3, mag: 2.3 },
    { name: "Caph", con: "Cas", ra: 0.15, dec: 59.1, mag: 2.3 },
    { name: "Schedar", con: "Cas", ra: 0.68, dec: 56.5, mag: 2.2 },
    { name: "Navi", con: "Cas", ra: 0.95, dec: 60.7, mag: 2.2 },
    { name: "Ruchbah", con: "Cas", ra: 1.43, dec: 60.2, mag: 2.7 },
    { name: "Eta Cas", con: "Cas", ra: 1.3, dec: 57.6, mag: 3.4 },
    { name: "Segin", con: "Cas", ra: 1.91, dec: 63.7, mag: 3.4 },
    { name: "Algenib", con: "Peg", ra: 0.22, dec: 15.2, mag: 2.8 },
    { name: "Markab", con: "Peg", ra: 23.08, dec: 15.2, mag: 2.5 },
    { name: "Scheat", con: "Peg", ra: 23.06, dec: 28.1, mag: 2.4 },
    { name: "Homam", con: "Peg", ra: 22.7, dec: 30.2, mag: 2.9 },
    { name: "Alderamin", con: "Cep", ra: 21.31, dec: 62.6, mag: 2.5 },
    { name: "Zeta Cephei", con: "Cep", ra: 23.37, dec: 58.5, mag: 3.4 },
    { name: "Errai", con: "Cep", ra: 23.66, dec: 77.6, mag: 3.2 },
    { name: "Diphda", con: "Cet", ra: 0.73, dec: -18.0, mag: 2.0 },
    { name: "Menkar", con: "Cet", ra: 3.04, dec: 4.1, mag: 2.5 },
    { name: "Menkib", con: "Cet", ra: 4.73, dec: 7.4, mag: 3.5 },
    { name: "Hamal", con: "Ari", ra: 2.12, dec: 23.5, mag: 2.0 },

    // Ursa Minor, Ursa Major, Draco
    { name: "Polaris", con: "UMi", ra: 2.53, dec: 89.3, mag: 2.0 },
    { name: "Kochab", con: "UMi", ra: 14.85, dec: 74.2, mag: 2.1 },
    { name: "Pherkad", con: "UMi", ra: 15.35, dec: 71.8, mag: 3.1 },
    { name: "Merak", con: "UMa", ra: 11.03, dec: 56.4, mag: 2.4 },
    { name: "Dubhe", con: "UMa", ra: 11.06, dec: 61.8, mag: 1.8 },
    { name: "Phecda", con: "UMa", ra: 11.9, dec: 53.7, mag: 2.4 },
    { name: "Megrez", con: "UMa", ra: 12.26, dec: 57.0, mag: 3.3 },
    { name: "Alioth", con: "UMa", ra: 12.9, dec: 55.9, mag: 1.8 },
    { name: "Mizar", con: "UMa", ra: 13.4, dec: 54.9, mag: 2.2 },
    { name: "Alkaid", con: "UMa", ra: 13.79, dec: 49.3, mag: 1.9 },
    { name: "Thuban", con: "Dra", ra: 14.07, dec: 64.4, mag: 3.7 },
    { name: "Rastaban", con: "Dra", ra: 17.5, dec: 52.3, mag: 2.8 },
    { name: "Eltanin", con: "Dra", ra: 17.94, dec: 51.5, mag: 2.2 },

    // Perseus, Auriga, Taurus on the winter Milky Way
    { name: "Algol", con: "Per", ra: 3.14, dec: 40.9, mag: 2.1 },
    { name: "Mirfak", con: "Per", ra: 3.41, dec: 49.9, mag: 1.8 },
    { name: "Zeta Persei", con: "Per", ra: 3.9, dec: 31.9, mag: 2.9 },
    { name: "Alcyone", con: "Tau", ra: 3.79, dec: 24.1, mag: 2.9 },
    { name: "Electra", con: "Tau", ra: 3.75, dec: 24.1, mag: 3.7 },
    { name: "Atlas", con: "Tau", ra: 3.82, dec: 24.1, mag: 3.6 },
    { name: "Lambda Tauri", con: "Tau", ra: 4.01, dec: 12.5, mag: 3.5 },
    { name: "Ain", con: "Tau", ra: 4.48, dec: 19.2, mag: 3.5 },
    { name: "Aldebaran", con: "Tau", ra: 4.6, dec: 16.5, mag: 0.9 },
    { name: "Hassaleh", con: "Aur", ra: 4.95, dec: 33.2, mag: 2.7 },
    { name: "Capella", con: "Aur", ra: 5.28, dec: 46.0, mag: 0.1 },
    { name: "Elnath", con: "Tau", ra: 5.44, dec: 28.6, mag: 1.7 },
    { name: "Tianguan", con: "Tau", ra: 5.63, dec: 21.1, mag: 3.0 },
    { name: "Menkalinan", con: "Aur", ra: 5.99, dec: 44.9, mag: 1.9 },
    { name: "Theta Aurigae", con: "Aur", ra: 6.0, dec: 37.2, mag: 2.7 },
    { name: "Mahasim", con: "Aur", ra: 7.34, dec: 37.9, mag: 3.7 },

    // Orion, Lepus, Gemini, Canis Major/Minor (winter)
    { name: "Rigel", con: "Ori", ra: 5.24, dec: -8.2, mag: 0.2 },
    { name: "Bellatrix", con: "Ori", ra: 5.42, dec: 6.3, mag: 1.6 },
    { name: "Mintaka", con: "Ori", ra: 5.53, dec: -0.3, mag: 2.2 },
    { name: "Meissa", con: "Ori", ra: 5.59, dec: 9.9, mag: 3.4 },
    { name: "Alnilam", con: "Ori", ra: 5.6, dec: -1.2, mag: 1.7 },
    { name: "Alnitak", con: "Ori", ra: 5.68, dec: -1.9, mag: 1.8 },
    { name: "Saiph", con: "Ori", ra: 5.8, dec: -9.7, mag: 2.1 },
    { name: "Hatysa", con: "Ori", ra: 5.91, dec: -0.3, mag: 3.7 },
    { name: "Betelgeuse", con: "Ori", ra: 5.92, dec: 7.4, mag: 0.5 },
    { name: "Nihal", con: "Lep", ra: 5.56, dec: -16.7, mag: 2.8 },
    { name: "Arneb", con: "Lep", ra: 5.58, dec: -17.8, mag: 2.6 },
    { name: "Mirzam", con: "CMa", ra: 6.38, dec: -17.9, mag: 2.0 },
    { name: "Propus", con: "Gem", ra: 6.25, dec: 22.5, mag: 3.3 },
    { name: "Tejat", con: "Gem", ra: 6.38, dec: 22.5, mag: 2.9 },
    { name: "Alhena", con: "Gem", ra: 6.63, dec: 16.4, mag: 1.9 },
    { name: "Mebsuta", con: "Gem", ra: 6.73, dec: 25.1, mag: 3.0 },
    { name: "Sirius", con: "CMa", ra: 6.75, dec: -16.7, mag: -1.5 },
    { name: "Adhara", con: "CMa", ra: 6.98, dec: -29.0, mag: 1.5 },
    { name: "Wezen", con: "CMa", ra: 7.14, dec: -26.4, mag: 1.8 },
    { name: "Wasat", con: "Gem", ra: 7.34, dec: 21.9, mag: 3.5 },
    { name: "Aludra", con: "CMa", ra: 7.4, dec: -29.3, mag: 2.3 },
    { name: "Gomeisa", con: "CMi", ra: 7.45, dec: 8.3, mag: 2.9 },
    { name: "Procyon", con: "CMi", ra: 7.65, dec: 5.2, mag: 0.4 },
    { name: "Castor", con: "Gem", ra: 7.76, dec: 31.9, mag: 1.6 },
    { name: "Pollux", con: "Gem", ra: 7.76, dec: 28.0, mag: 1.1 },
    { name: "Alzirr", con: "Gem", ra: 7.81, dec: 19.4, mag: 3.7 },

    // Hydra, Leo, Virgo, Corvus, Libra (spring)
    { name: "Alphard", con: "Hya", ra: 9.46, dec: -8.7, mag: 2.0 },
    { name: "Regulus", con: "Leo", ra: 10.14, dec: 12.0, mag: 1.0 },
    { name: "Adhafera", con: "Leo", ra: 10.23, dec: 23.6, mag: 3.4 },
    { name: "Algieba", con: "Leo", ra: 10.33, dec: 19.8, mag: 2.1 },
    { name: "Chertan", con: "Leo", ra: 11.24, dec: 15.4, mag: 3.3 },
    { name: "Zosma", con: "Leo", ra: 11.4, dec: 20.5, mag: 2.6 },
    { name: "Denebola", con: "Leo", ra: 11.82, dec: 14.6, mag: 2.1 },
    { name: "Alkes", con: "Crt", ra: 11.94, dec: -18.3, mag: 3.6 },
    { name: "Gienah", con: "Crv", ra: 12.26, dec: -17.5, mag: 2.6 },
    { name: "Algorab", con: "Crv", ra: 12.29, dec: -16.5, mag: 2.9 },
    { name: "Kraz", con: "Crv", ra: 12.36, dec: -23.4, mag: 3.0 },
    { name: "Porrima", con: "Vir", ra: 12.69, dec: -1.4, mag: 2.7 },
    { name: "Vindemiatrix", con: "Vir", ra: 13.04, dec: 10.9, mag: 2.8 },
    { name: "Spica", con: "Vir", ra: 13.42, dec: -11.2, mag: 1.0 },
    { name: "Zubenelgenubi", con: "Lib", ra: 14.85, dec: -16.0, mag: 2.8 },
    { name: "Zubeneschamali", con: "Lib", ra: 15.28, dec: -9.4, mag: 2.6 },

    // Bootes, Hercules, Ophiuchus, Scorpius (summer arc and the zodiac below)
    { name: "Muphrid", con: "Boo", ra: 13.91, dec: 18.4, mag: 2.7 },
    { name: "Arcturus", con: "Boo", ra: 14.26, dec: 19.2, mag: 0.0 },
    { name: "Seginus", con: "Boo", ra: 14.54, dec: 38.3, mag: 3.0 },
    { name: "Izar", con: "Boo", ra: 14.75, dec: 27.1, mag: 2.4 },
    { name: "Nekkar", con: "Boo", ra: 15.03, dec: 40.4, mag: 3.5 },
    { name: "Alphecca", con: "CrB", ra: 15.58, dec: 26.7, mag: 2.2 },
    { name: "Pusian", con: "Sco", ra: 15.98, dec: -26.1, mag: 2.9 },
    { name: "Dschubba", con: "Sco", ra: 16.0, dec: -22.6, mag: 2.3 },
    { name: "Acrab", con: "Sco", ra: 16.09, dec: -19.8, mag: 2.6 },
    { name: "Alniyat", con: "Sco", ra: 16.35, dec: -25.6, mag: 2.9 },
    { name: "Yed Posterior", con: "Oph", ra: 16.3, dec: 4.7, mag: 3.2 },
    { name: "Yed Prior", con: "Oph", ra: 16.44, dec: 4.3, mag: 2.7 },
    { name: "Antares", con: "Sco", ra: 16.49, dec: -26.4, mag: 1.0 },
    { name: "Kornephoros", con: "Her", ra: 16.5, dec: 21.5, mag: 2.8 },
    { name: "Zeta Herculis", con: "Her", ra: 16.69, dec: 31.8, mag: 2.8 },
    { name: "Paikauhale", con: "Sco", ra: 16.6, dec: -28.2, mag: 2.8 },
    { name: "Larawag", con: "Sco", ra: 16.84, dec: -34.3, mag: 2.3 },
    { name: "Mu Scorpii", con: "Sco", ra: 16.86, dec: -38.1, mag: 3.1 },
    { name: "Zeta Ophiuchi", con: "Oph", ra: 16.91, dec: -10.6, mag: 2.6 },
    { name: "Sabik", con: "Oph", ra: 17.17, dec: -15.7, mag: 2.4 },
    { name: "Theta Ophiuchi", con: "Oph", ra: 17.21, dec: -24.8, mag: 2.7 },
    { name: "Eta Scorpii", con: "Sco", ra: 17.2, dec: -43.2, mag: 3.3 },
    { name: "Lesath", con: "Sco", ra: 17.51, dec: -37.3, mag: 2.7 },
    { name: "Shaula", con: "Sco", ra: 17.56, dec: -37.1, mag: 1.6 },
    { name: "Rasalhague", con: "Oph", ra: 17.59, dec: 12.6, mag: 2.1 },
    { name: "Sargas", con: "Sco", ra: 17.62, dec: -43.0, mag: 1.9 },
    { name: "Girtab", con: "Sco", ra: 17.7, dec: -39.0, mag: 2.4 },

    // Lyra, Cygnus, Aquila, Sagittarius up to Aquarius
    { name: "Kaus Media", con: "Sgr", ra: 18.35, dec: -27.0, mag: 2.7 },
    { name: "Kaus Australis", con: "Sgr", ra: 18.4, dec: -34.4, mag: 1.8 },
    { name: "Vega", con: "Lyr", ra: 18.62, dec: 38.8, mag: 0.0 },
    { name: "Sheliak", con: "Lyr", ra: 18.83, dec: 33.4, mag: 3.5 },
    { name: "Nunki", con: "Sgr", ra: 18.92, dec: -26.5, mag: 2.1 },
    { name: "Sulafat", con: "Lyr", ra: 18.98, dec: 32.7, mag: 3.2 },
    { name: "Ascella", con: "Sgr", ra: 19.04, dec: -29.9, mag: 2.6 },
    { name: "Albireo", con: "Cyg", ra: 19.51, dec: 28.0, mag: 3.1 },
    { name: "Tarazed", con: "Aql", ra: 19.77, dec: 10.6, mag: 2.7 },
    { name: "Altair", con: "Aql", ra: 19.85, dec: 8.9, mag: 0.8 },
    { name: "Alshain", con: "Aql", ra: 19.92, dec: 6.4, mag: 3.7 },
    { name: "Fawaris", con: "Cyg", ra: 20.29, dec: 45.3, mag: 2.9 },
    { name: "Sadr", con: "Cyg", ra: 20.37, dec: 40.3, mag: 2.2 },
    { name: "Deneb", con: "Cyg", ra: 20.69, dec: 45.3, mag: 1.3 },
    { name: "Gienah Cygni", con: "Cyg", ra: 20.77, dec: 33.9, mag: 2.5 },
    { name: "Sadalmelik", con: "Aqr", ra: 20.86, dec: -0.3, mag: 3.0 },
    { name: "Sadalsuud", con: "Aqr", ra: 21.74, dec: -5.8, mag: 2.9 },
    { name: "Deneb Algedi", con: "Cap", ra: 21.79, dec: -16.1, mag: 2.9 },
    { name: "Nashira", con: "Cap", ra: 21.92, dec: -16.7, mag: 3.7 },
    { name: "Ancha", con: "Aqr", ra: 23.76, dec: -3.4, mag: 3.6 },

    // Centaurus, Crux, Vela, Carina and the deep south
    { name: "Canopus", con: "Car", ra: 6.4, dec: -52.7, mag: -0.7 },
    { name: "Avior", con: "Car", ra: 7.73, dec: -59.3, mag: 2.0 },
    { name: "Regor", con: "Vel", ra: 8.19, dec: -40.0, mag: 1.9 },
    { name: "Alsephina", con: "Vel", ra: 8.37, dec: -52.9, mag: 1.9 },
    { name: "Miaplacidus", con: "Car", ra: 9.22, dec: -69.7, mag: 1.9 },
    { name: "Aspidiske", con: "Car", ra: 9.56, dec: -59.2, mag: 2.2 },
    { name: "Gacrux", con: "Cru", ra: 12.52, dec: -57.1, mag: 1.6 },
    { name: "Ginan", con: "Cru", ra: 12.66, dec: -57.7, mag: 1.6 },
    { name: "Acrux", con: "Cru", ra: 12.44, dec: -63.1, mag: 1.3 },
    { name: "Mimosa", con: "Cru", ra: 12.8, dec: -60.6, mag: 1.3 },
    { name: "Zeta Centauri", con: "Cen", ra: 13.93, dec: -36.3, mag: 2.5 },
    { name: "Hadar", con: "Cen", ra: 14.06, dec: -60.4, mag: 0.6 },
    { name: "Menkent", con: "Cen", ra: 14.11, dec: -36.4, mag: 2.1 },
    { name: "Rigil Kentaurus", con: "Cen", ra: 14.66, dec: -60.8, mag: -0.3 },
    { name: "Men", con: "Lup", ra: 14.72, dec: -47.4, mag: 2.3 },
    { name: "Peacock", con: "Gru", ra: 20.43, dec: -56.7, mag: 1.9 },
    { name: "Fomalhaut", con: "PsA", ra: 22.96, dec: -29.6, mag: 1.2 },
    { name: "Alnair", con: "Gru", ra: 22.13, dec: -47.0, mag: 1.7 },
    { name: "Dabih", con: "Cap", ra: 20.35, dec: -14.8, mag: 3.1 }
  ];

  D.findByName = function (name) {
    if (typeof name !== "string") return null;
    var want = name.trim().toLowerCase();
    for (var i = 0; i < D.list.length; i++) {
      if (D.list[i].name.toLowerCase() === want) return D.list[i];
    }
    return null;
  };

  // Guard the no-duplicates rule where it is cheap: browser and Node both hit
  // this at load. Keeps the data honest without a build step.
  var seen = {};
  for (var i = 0; i < D.list.length; i++) {
    var key = D.list[i].name.toLowerCase();
    if (seen[key]) {
      throw new Error("duplicate star in stars.js: " + D.list[i].name);
    }
    seen[key] = true;
  }

  root.LS.stars = D;
})(typeof globalThis !== "undefined" ? globalThis : window);
