/* Site-wide behaviour: sticky header state, mobile menu, reveal on scroll,
   publication filtering and the gallery filter + lightbox. */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

  // Header border once the page scrolls
  var header = document.querySelector("[data-header]");
  function onScroll() { if (header) header.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile menu
  var toggle = document.querySelector("[data-menu-toggle]");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    var closeLabel = toggle.querySelector(".menu-toggle-label");
    var openText = closeLabel ? closeLabel.textContent : "";
    function setMenu(open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      nav.classList.toggle("is-open", open);
    }
    toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); toggle.focus(); }
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    if (closeLabel) closeLabel.textContent = openText;
  }

  // Reveal on scroll
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  // Pause / play buttons (data-motion-toggle) for anything that moves on its own
  function motionToggle(btn, onChange) {
    var label = btn.querySelector("span");
    function set(paused) {
      btn.setAttribute("aria-pressed", paused ? "true" : "false");
      btn.setAttribute("aria-label", btn.getAttribute(paused ? "data-play" : "data-pause"));
      if (label) label.textContent = btn.getAttribute(paused ? "data-play" : "data-pause").split(" ")[0];
      onChange(paused);
    }
    btn.addEventListener("click", function () { set(btn.getAttribute("aria-pressed") !== "true"); });
    return set;
  }
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Funder logo marquee
  var funders = document.querySelector(".funders");
  if (funders) {
    var marquee = funders.querySelector(".marquee");
    var mBtn = funders.querySelector("[data-motion-toggle]");
    if (mBtn) {
      if (reduce) mBtn.hidden = true;
      motionToggle(mBtn, function (paused) { marquee.classList.toggle("is-paused", paused); });
    }
  }

  // Publications: text search
  var pubRoot = document.querySelector("[data-pubs]");
  if (pubRoot) {
    var rows = pubRoot.querySelectorAll(".pub-row");
    var groups = pubRoot.querySelectorAll(".year-group");
    var input = pubRoot.querySelector("input[type=search]");
    var count = pubRoot.querySelector("[data-count]");
    var none = pubRoot.querySelector("[data-none]");
    function apply() {
      var q = (input && input.value || "").trim().toLowerCase();
      var shown = 0;
      rows.forEach(function (r) {
        var ok = !q || r.getAttribute("data-search").indexOf(q) !== -1;
        r.hidden = !ok;
        if (ok) shown++;
      });
      groups.forEach(function (g) { g.hidden = !g.querySelector(".pub-row:not([hidden])"); });
      if (count) count.textContent = shown + " " + (shown === 1 ? count.getAttribute("data-one") : count.getAttribute("data-many"));
      if (none) none.hidden = shown !== 0;
    }
    if (input) input.addEventListener("input", apply);
    apply();
  }

  // Gallery: category chips + lightbox
  var gal = document.querySelector("[data-gallery]");
  if (gal) {
    var chips = gal.querySelectorAll("[data-cat-filter]");
    var tiles = gal.querySelectorAll(".tile");
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        var cat = c.getAttribute("data-cat-filter");
        chips.forEach(function (o) { o.setAttribute("aria-pressed", o === c ? "true" : "false"); });
        tiles.forEach(function (t) { t.hidden = !(cat === "all" || t.getAttribute("data-cat") === cat); });
      });
    });

    var lb = document.querySelector("[data-lightbox]");
    var lbImg = lb.querySelector("img");
    var lbTitle = lb.querySelector("[data-lb-title]");
    var lbCap = lb.querySelector("[data-lb-caption]");
    var current = -1, lastFocus = null;
    function visibleTiles() { return Array.prototype.filter.call(tiles, function (t) { return !t.hidden; }); }
    function show(tile) {
      var b = tile.querySelector("button");
      lbImg.src = b.getAttribute("data-full");
      lbImg.alt = tile.querySelector("img").alt;
      lbTitle.textContent = b.getAttribute("data-title");
      lbCap.textContent = b.getAttribute("data-caption") || "";
      current = visibleTiles().indexOf(tile);
    }
    function open(tile) {
      lastFocus = document.activeElement;
      show(tile);
      lb.hidden = false;
      document.body.style.overflow = "hidden";
      lb.querySelector(".lb-close").focus();
    }
    function close() {
      lb.hidden = true;
      document.body.style.overflow = "";
      lbImg.removeAttribute("src");
      if (lastFocus) lastFocus.focus();
    }
    function step(d) {
      var v = visibleTiles();
      if (!v.length) return;
      show(v[(current + d + v.length) % v.length]);
    }
    tiles.forEach(function (t) { t.querySelector("button").addEventListener("click", function () { open(t); }); });
    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector("[data-lb-prev]").addEventListener("click", function () { step(-1); });
    lb.querySelector("[data-lb-next]").addEventListener("click", function () { step(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lightbox-stage")) close(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Tab") {
        var f = lb.querySelectorAll("button");
        var first = f[0], lastB = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastB.focus(); }
        else if (!e.shiftKey && document.activeElement === lastB) { e.preventDefault(); first.focus(); }
      }
    });
    // Open a specific image from a #slug link (home-page teaser)
    var hash = decodeURIComponent(location.hash.slice(1));
    if (hash) {
      var target = document.getElementById(hash);
      if (target && target.classList.contains("tile")) setTimeout(function () { open(target); }, 300);
    }
  }
})();
