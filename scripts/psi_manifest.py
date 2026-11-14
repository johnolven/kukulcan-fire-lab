#!/usr/bin/env python3
"""Fetch investigation metadata + full file tree for every PSI investigation
and build a flat manifest (one row per file).

Code generated with SI assistance (Claude Code).

Usage: python3 psi_manifest.py <out_dir> [--all]
  default: only combustion investigations; --all: the 133 investigations in PSI.
"""
import csv
import json
import sys
import time
import urllib.request
from pathlib import Path

BASE = "https://psi.nasa.gov/geode-py/ws"
UA = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}


def get(url, data=None):
    headers = dict(UA)
    if data is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(data).encode()
    req = urllib.request.Request(url, data=data, headers=headers)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read().decode("utf-8", "replace"))
        except Exception as e:  # noqa: BLE001
            if attempt == 3:
                raise
            time.sleep(2 * (attempt + 1))


def flatten(nodes, category, out):
    for n in nodes:
        if n.get("directory") or n.get("files"):
            flatten(n.get("files") or [], n.get("displayName") or category, out)
        elif n.get("key") and not n.get("key", "").endswith("/"):
            out.append((category, n))


def main():
    out_dir = Path(sys.argv[1])
    want_all = "--all" in sys.argv
    (out_dir / "investigations").mkdir(parents=True, exist_ok=True)
    (out_dir / "filetrees").mkdir(parents=True, exist_ok=True)

    hits = get(f"{BASE}/repo/search?from=0&size=500")["hits"]["hits"]
    combustion_term = get(f"{BASE}/repo/search?term=combustion&from=0&size=500")["hits"]["hits"]
    term_ids = {h["_source"]["Accession"] for h in combustion_term}
    rows = []
    summary = []
    for h in sorted(hits, key=lambda h: int(h["_source"]["Accession"].split("-")[1])):
        s = h["_source"]
        acc = s["Accession"]
        is_comb = s.get("Research Area") == "Combustion Science" or acc in term_ids
        if not (want_all or is_comb):
            continue
        try:
            inv = get(f"{BASE}/repo/investigations/{acc}")
        except Exception as e:  # noqa: BLE001
            print(acc, "investigation ERROR", e)
            continue
        (out_dir / "investigations" / f"{acc}.json").write_text(json.dumps(inv, indent=1))
        version = inv.get("version")
        try:
            tree = get(f"{BASE}/files/v2", {"folder": "", "fileType": "study", "studyId": acc, "version": version})
        except Exception as e:  # noqa: BLE001
            print(acc, "filetree ERROR", e)
            tree = {"files": []}
        (out_dir / "filetrees" / f"{acc}.json").write_text(json.dumps(tree, indent=1))
        flat = []
        flatten(tree.get("files", []), "", flat)
        total = 0
        for cat, n in flat:
            size = int(n.get("bytes_size") or 0)
            total += size
            key = n["key"]
            name = key.rsplit("/", 1)[-1]
            ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
            rows.append({
                "accession": acc, "acronym": s.get("Acronym", ""), "research_area": s.get("Research Area", ""),
                "category": cat, "subcategory": n.get("subcategory") or "", "file_name": name, "ext": ext,
                "bytes": size, "restricted": n.get("restricted"), "version": n.get("version"), "key": key,
            })
        summary.append((acc, s.get("Acronym", ""), s.get("Research Area", ""), len(flat), total))
        print(f"{acc:8} {s.get('Acronym','')[:22]:22} files={len(flat):6} size={total/1e9:9.2f} GB")

    with open(out_dir / "file_manifest.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    print("TOTAL files", len(rows), "GB", sum(r["bytes"] for r in rows) / 1e9)


if __name__ == "__main__":
    main()
