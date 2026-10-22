"""Build the compact JSON files the gallery visualizations load.

Reads the plot-ready exports in the research library (values transcribed from
published source data) and writes assets/data/*.json. No values are changed;
fields are only renamed, rounded for display, and packed.

Usage: python3 tools/build_viz_data.py <research-library>/datasets/plot-ready
"""
import base64, json, os, sys

src = sys.argv[1]
out = os.path.join(os.path.dirname(__file__), "..", "assets", "data")
os.makedirs(out, exist_ok=True)

def load(name):
    with open(os.path.join(src, name), encoding="utf-8") as f:
        return json.load(f)

def dump(name, obj):
    path = os.path.join(out, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, separators=(",", ":"), ensure_ascii=False)
    print(name, os.path.getsize(path))

# 1. Attention index per mouse (Lehnert et al. 2026, Fig. 4i / 4n)
a = load("attention-paired-mice.json")
dump("attention-mice.json", {
    "doi": a["doi"],
    "mice": [{"cohort": r["cohort"].lower(), "id": r["mouse_id"], "sex": r["sex"],
              "control": r["control"], "opto": r["opto"], "led_off": r["opto_control"],
              "cells": r["sheet"] + " " + ",".join(r["cells"].values())}
             for r in a["records"]],
})

# 2. Trial outcomes for the public example mouse (Dryad)
t = load("attention-trial-summary.json")
code = {"hit": 0, "miss": 1, "FA": 2}
recs = t["records"]
dump("attention-trials.json", {
    "doi": t["doi"], "scope": t["scope"],
    "sessions": [int(s) for s in t["sessions"]],
    "session": [int(r["session_number"]) for r in recs],
    "outcome": [code[r["behavioral_outcome"]] for r in recs],
    "contrast": [None if r["grating_contrast"] is None else round(r["grating_contrast"], 3) for r in recs],
    "cue": [r["cue_side"] for r in recs],
})

# 3. Stimulus frames for trial 1: each 17x26 binary frame packed to base64 bits
s = load("example-trial-stimulus.json")
def pack(frame):
    bits = [v for row in frame for v in row]
    by = bytearray((len(bits) + 7) // 8)
    for i, b in enumerate(bits):
        if b:
            by[i >> 3] |= 0x80 >> (i & 7)
    return base64.b64encode(bytes(by)).decode()
stim = {"trial": s["trial_index"], "scope": s["scope"]}
for side in ("left", "right"):
    m = s["matrices"][side]
    rows, cols = len(m["frames"][0]), len(m["frames"][0][0])
    stim[side] = {"rows": rows, "cols": cols,
                  "t": [round(x, 4) for x in m["time_from_first"]],
                  "types": m.get("types"),
                  "frames": [pack(f) for f in m["frames"]]}
dump("attention-stimulus.json", stim)

# 4. Mbd2 differential methylation sites (Lax et al. 2023, Supp. Table 2)
m = load("mbd2-selected-sites.json")
dump("mbd2-sites.json", {
    "doi": m["doi"],
    "fields": ["chr", "pos", "gene", "mlog10p", "diff"],
    "rows": [[r["chromosome"].replace("chr", ""), r["start"], r["gene"] or "",
              round(r["minus_log10_p"], 2), round(r["ko_minus_wt"], 1)] for r in m["records"]],
})
