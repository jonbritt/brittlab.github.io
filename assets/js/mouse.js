/* Pixel mouse that peeks over call-to-action buttons on hover.
   Any .cta[data-mouse] gets a sprite; data-mouse="left" puts it on the left. */
(function () {
  "use strict";

  var HEAD = [
    "..ooo..........ooo..",
    ".opppo........opppo.",
    "oppppgo......ogppppo",
    "opppgggoooooogggpppo",
    "oppggggggggggggggppo",
    ".oggggggggggggggggo.",
    ".oggkwggggggggkwggo.",
    ".oggkkggggggggkkggo.",
    ".ogggggghhhhggggggo.",
    "..ogggghhPPhhggggo..",
    "...oogghhhhhhggoo...",
    ".....oooooooooo....."
  ];
  // Lids drawn over the eyes while blinking
  var BLINK = [
    "....................",
    "....................",
    "....................",
    "....................",
    "....................",
    "....................",
    "....gg........gg....",
    "....oo........oo...."
  ];
  // Paws gripping the top edge of the button
  var PAWS = [
    "...ppp........ppp...",
    "..ppppp......ppppp..",
    "..p.p.p......p.p.p.."
  ];
  var COLORS = { o: "#3A3E44", g: "#A9AEB5", h: "#CDD1D6", p: "#F2A7B9", P: "#D9667F", k: "#121315", w: "#FFFFFF" };
  var NS = "http://www.w3.org/2000/svg";

  function rects(rows, dx, dy, colorFor) {
    var out = "";
    for (var y = 0; y < rows.length; y++) {
      var row = rows[y];
      for (var x = 0; x < row.length; ) {
        var c = row.charAt(x);
        if (c === ".") { x++; continue; }
        var run = 1;
        while (x + run < row.length && row.charAt(x + run) === c) run++;
        var fill = colorFor ? colorFor(c) : COLORS[c];
        out += '<rect x="' + (x + dx) + '" y="' + (y + dy) + '" width="' + run + '" height="1" fill="' + fill + '"/>';
        x += run;
      }
    }
    return out;
  }

  // Ears are rows 0-3, outer columns; grouped so they can twitch
  function earRows() {
    return HEAD.slice(0, 3).map(function (r) { return r.slice(0, 7) + "......" + r.slice(13); });
  }
  function headWithoutEars() {
    return HEAD.map(function (r, i) { return i < 3 ? "......." + r.slice(7, 13) + "......." : r; });
  }

  // Whiskers: two frames that alternate for a twitch
  var WHISK_A = '<g class="whisk-a" fill="#5C6168">' +
    '<rect x="-3" y="8" width="4" height="1"/><rect x="-3" y="10" width="4" height="1"/>' +
    '<rect x="19" y="8" width="4" height="1"/><rect x="19" y="10" width="4" height="1"/></g>';
  var WHISK_B = '<g class="whisk-b" fill="#5C6168">' +
    '<rect x="-3" y="7" width="4" height="1"/><rect x="-3" y="9" width="4" height="1"/>' +
    '<rect x="19" y="7" width="4" height="1"/><rect x="19" y="9" width="4" height="1"/></g>';

  var headSVG =
    '<svg xmlns="' + NS + '" viewBox="-3 0 26 12" preserveAspectRatio="xMidYMax meet" shape-rendering="crispEdges">' +
    '<g class="ears" style="transform-box:fill-box">' + rects(earRows(), 0, 0) + "</g>" +
    rects(headWithoutEars(), 0, 0) +
    '<g class="blink">' + rects(BLINK, 0, 0) + "</g>" +
    WHISK_A + WHISK_B + "</svg>";
  var pawSVG =
    '<svg xmlns="' + NS + '" viewBox="-3 0 26 3" preserveAspectRatio="xMidYMax meet" shape-rendering="crispEdges">' +
    rects(PAWS, 0, 0, function (c) { return c === "p" ? "#F2A7B9" : COLORS[c]; }) +
    '<rect x="2" y="0" width="1" height="1" fill="#D98CA0"/><rect x="18" y="0" width="1" height="1" fill="#D98CA0"/>' +
    "</svg>";

  function attach(cta) {
    if (cta.querySelector(".peek")) return;
    var label = cta.querySelector(".cta-label") || cta;
    var peek = document.createElement("span");
    peek.className = "peek" + (cta.getAttribute("data-mouse") === "left" ? " peek--left" : "");
    peek.setAttribute("aria-hidden", "true");
    peek.innerHTML =
      '<span class="peek-clip"><span class="peek-head">' + headSVG + "</span></span>" +
      '<span class="peek-paws">' + pawSVG + "</span>";
    label.appendChild(peek);
  }

  function init() {
    var ctas = document.querySelectorAll(".cta[data-mouse]");
    for (var i = 0; i < ctas.length; i++) attach(ctas[i]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
