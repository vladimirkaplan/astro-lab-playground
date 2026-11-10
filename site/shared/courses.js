// Course registry (BMC-27): one entry per course, so no course-specific text
// stays hard-coded in shared code. Plain ordered script; loads BEFORE ui.js /
// store.js / worksheet.js on every page that needs course identity, and loads
// as a bare file in Node (tests read the same array this ships to browsers).
//
// Entry contract (all fields required, entry and labDirs frozen):
//   code                 folder name under site/ and localStorage key prefix
//   name                 short course label a student knows ("AST110")
//   title                one-line course description
//   landing              root-relative path of the course landing page. The
//                        pages themselves keep RELATIVE links (file:// must
//                        keep working), so nothing in site/ uses this as an
//                        href; tests and tooling compare against it.
//   worksheetFilePrefix  prefix for worksheet downloads: <code>-lab-
//   attribution          the one-sentence source line LS.ui.banner prints
//   licenceSource        the same source as the licence footer prints it
//                        (byte-identical to the pre-BMC-27 footer wording)
//   labDirs              ordered lab folder names, course order
//
// path-derived course wins (LS.courseForPath); pages outside a course folder
// (homework today, the hub) fall back to the FIRST entry, which is today's
// behaviour and is where today's saved bare-slug data belongs.
(function (root) {
  "use strict";
  root.LS = root.LS || {};

  function frozenCourse(c) {
    return Object.freeze({
      code: c.code,
      name: c.name,
      title: c.title,
      landing: c.landing,
      worksheetFilePrefix: c.worksheetFilePrefix,
      attribution: c.attribution,
      licenceSource: c.licenceSource,
      labDirs: Object.freeze(c.labDirs.slice())
    });
  }

  root.LS.courses = Object.freeze([
    frozenCourse({
      code: "ast110",
      name: "AST110",
      title: "Intro astronomy lab practice",
      landing: "/ast110/index.html",
      worksheetFilePrefix: "ast110-lab-",
      attribution: "Explanations adapted from OpenStax <em>Astronomy 2e</em> (CC BY 4.0).",
      licenceSource: "adapted from OpenStax <em>Astronomy 2e</em>",
      labDirs: ["01-measurement", "02-math", "03-celestial-sphere", "04-moon-phases",
        "05-moonrise-eclipses", "06-retrograde-mars", "07-lenses", "08-venus-phases",
        "09-pendulum", "10-spectra", "11-parallax", "12-hr-diagram", "13-variables",
        "14-galaxy-id", "15-hubbles-law", "16-time-lat-long"]
    }),
    frozenCourse({
      code: "phy110",
      name: "PHY110",
      title: "Intro physics lab practice",
      landing: "/phy110/index.html",
      worksheetFilePrefix: "phy110-lab-",
      // PENDING COUNSEL: licence line not yet confirmed; a separate counsel
      // issue signs off on this attribution before any PHY110 lab ships.
      attribution: "Explanations adapted from OpenStax College Physics 2e CE (CC BY 4.0).",
      licenceSource: "adapted from OpenStax College Physics 2e CE",
      labDirs: ["01-units-and-measurement", "02-graphs-and-slope", "03-free-fall-g",
        "04-atwood-newton2", "05-vibrating-spring", "06-rotational-equilibrium",
        "07-archimedes", "08-specific-heat", "09-ohms-law", "10-series-parallel",
        "11-air-column-sound", "12-reflection-refraction", "13-converging-lens",
        "14-spectra"]
    })
  ]);

  // ---------- lookup helpers (guarded: every reader may load without this file) ----------

  function list() {
    return Array.isArray(root.LS.courses) ? root.LS.courses : [];
  }

  // Exact path derivation: the first URL segment that names a course code.
  // Returns null when the path sits outside every course folder.
  root.LS.courseForPath = function (pathname) {
    try {
      var segs = String(pathname || "").split("/");
      var courses = list();
      for (var i = 0; i < segs.length; i++) {
        for (var j = 0; j < courses.length; j++) {
          if (segs[i] === courses[j].code) return courses[j];
        }
      }
    } catch (e) { /* no path, no course */ }
    return null;
  };

  root.LS.courseByCode = function (code) {
    var courses = list();
    for (var i = 0; i < courses.length; i++) {
      if (courses[i].code === code) return courses[i];
    }
    return null;
  };

  // Course owning a lab slug, by the registry's ordered labDirs.
  root.LS.courseForSlug = function (slug) {
    var courses = list();
    for (var i = 0; i < courses.length; i++) {
      if (courses[i].labDirs.indexOf(slug) >= 0) return courses[i];
    }
    return null;
  };

  // The course a page belongs to: path first, first registry entry for pages
  // that have not moved under a course folder yet (homework today).
  root.LS.currentCourse = function () {
    var here = null;
    try { here = root.location && root.location.pathname; } catch (e) { here = null; }
    return root.LS.courseForPath(here) || list()[0] || null;
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
