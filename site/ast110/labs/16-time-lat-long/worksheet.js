// Labs 16-17 worksheet content: registers this lab's printable pre-lab/post-lab
// worksheet with the shared engine (shared/worksheet.js loads before this file).
(function (root) {
  "use strict";
  root.LS.worksheet.register({
    slug: "16-time-lat-long",
    labNumber: "16-17",
    title: "Time, Latitude, Longitude",
    intro: "The grid, the clock, and the letters that make them true. Log each place with coordinates, zone, and local time together.",
    table: {
      header: ["Place or point", "Latitude (deg + letter)", "Longitude (deg + letter)", "Time zone (hours from Greenwich)", "Local time"],
      blankRows: 16
    },
    prelab: [
      "Define latitude and longitude in your own words: what line does each count from, in which directions, and up to what maximum?",
      "Give an example of a pair of coordinates that names one place with its direction letters and a completely different place without them.",
      "The turning sky links angle to clock time. Work out how many degrees of longitude equal one hour, and say why the sky forces that number.",
      "Time zone borders wiggle instead of following meridians like a ruler. Predict who drew them that way and why."
    ],
    postlab: [
      "Read one point you placed on the graticule back off your own work, letters attached, and show it lands where you put it.",
      "Two cities sit 90 degrees of longitude apart. When it is noon in the western city, what time is it in the eastern one? Show the degrees-per-hour step you used.",
      "Your clock-face zone answer and a real wall clock disagreed somewhere. Name one reason zones and clocks part company.",
      "In your own words: why does the date change have to happen somewhere in the middle of the ocean, and what breaks if travelers ignore it?"
    ]
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
