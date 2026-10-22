"""Generate the pixel-mouse brand mark and favicon from one pixel map.

The same map is embedded in assets/js/mouse.js for the hover animation.
Run: python3 tools/mouse_sprite.py
"""
import os

HEAD = [
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
    ".....oooooooooo.....",
]
COLORS = {"o": "#3A3E44", "g": "#A9AEB5", "h": "#CDD1D6", "p": "#F2A7B9",
          "P": "#D9667F", "k": "#121315", "w": "#FFFFFF"}

def rects(rows, color_for):
    out = []
    for y, row in enumerate(rows):
        x = 0
        while x < len(row):
            c = row[x]
            if c == ".":
                x += 1
                continue
            run = 1
            while x + run < len(row) and row[x + run] == c:
                run += 1
            fill = color_for(c)
            if fill:
                out.append(f'<rect x="{x}" y="{y}" width="{run}" height="1" fill="{fill}"/>')
            x += run
    return "".join(out)

root = os.path.join(os.path.dirname(__file__), "..")
w, h = len(HEAD[0]), len(HEAD)

# Favicon: full-colour head on a paper tile
fav = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -4 {w + 4} {w + 4}" shape-rendering="crispEdges">'
       f'<rect x="-2" y="-4" width="{w + 4}" height="{w + 4}" rx="4" fill="#F5F4EF"/>'
       + rects(HEAD, lambda c: COLORS[c]) + "</svg>")
open(os.path.join(root, "assets/img/brand/favicon.svg"), "w").write(fav)

# Brand mark: one-colour silhouette with knocked-out eyes, uses currentColor
def mono(c):
    return None if c in "kw" else "currentColor"
mark = (f'<svg class="brand-mark" viewBox="0 0 {w} {h}" width="{w * 1.4:.0f}" height="{h * 1.4:.0f}" '
        f'shape-rendering="crispEdges" aria-hidden="true" focusable="false">' + rects(HEAD, mono) + "</svg>")
open(os.path.join(root, "_includes/brand-mark.svg"), "w").write(mark)
print(len(fav), len(mark))
