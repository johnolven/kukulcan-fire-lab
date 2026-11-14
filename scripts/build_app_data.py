#!/usr/bin/env python3
"""Copy the harmonized dataset into the app and build a compact file index.

Code generated with SI assistance (Claude Code).

Usage: python3 build_app_data.py <repo_root>
"""
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

root = Path(sys.argv[1])
src = root / "data" / "harmonized"
dst = root / "src" / "data"
dst.mkdir(parents=True, exist_ok=True)

tests = json.load(open(src / "tests.json"))
inv = json.load(open(src / "investigations.json"))
json.dump(tests, open(dst / "tests.json", "w"), ensure_ascii=False, separators=(",", ":"))
json.dump(inv, open(dst / "investigations.json", "w"), ensure_ascii=False, separators=(",", ":"))

# Compact file index: every document outside Raw Data plus every directly playable video.
VIDEO = {"mp4", "avi", "mpg"}
files = defaultdict(list)
seen = set()
with open(root / "data" / "psi" / "catalog" / "file_manifest.csv") as f:
    for r in csv.DictReader(f):
        if r["key"] in seen:
            continue
        seen.add(r["key"])
        top = r["key"].split("/")[2]
        is_video = r["ext"] in VIDEO
        if top in ("Raw Data", "Calibration") and not is_video:
            continue
        files[r["accession"]].append({
            "n": r["file_name"], "k": "video" if is_video else top, "c": r["category"], "b": int(r["bytes"]), "v": int(r["version"] or 1),
        })
json.dump(files, open(dst / "files.json", "w"), ensure_ascii=False, separators=(",", ":"))
print("tests", len(tests), "investigations", len(inv), "indexed files", sum(len(v) for v in files.values()))
for name in ("tests.json", "investigations.json", "files.json"):
    print(name, round((dst / name).stat().st_size / 1e6, 2), "MB")
