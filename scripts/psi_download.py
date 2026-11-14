#!/usr/bin/env python3
"""Download a tier of PSI files listed in file_manifest.csv (resumable, parallel).

Code generated with SI assistance (Claude Code).

Usage: python3 psi_download.py <manifest.csv> <out_dir> <tier> [workers]
  tier1: everything outside Raw Data / Calibration up to 100 MB, plus small
         documents and spreadsheets inside Raw Data (<= 20 MB)
  tier2: per-test tabular/text files inside Raw Data (csv, txt, log, asc <= 20 MB)
"""
import csv
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

BASE = "https://psi.nasa.gov/geode-py/ws"
UA = {"User-Agent": "Mozilla/5.0"}
DOC_EXT = {"pdf", "docx", "doc", "xls", "xlsx", "rtf", "pptx", "ppt"}
TAB_EXT = {"csv", "txt", "log", "asc"}


def in_tier(r, tier):
    top = r["key"].split("/")[2]
    size = int(r["bytes"])
    if tier == "tier1":
        if top not in ("Raw Data", "Calibration"):
            return size <= 100e6
        return top == "Raw Data" and r["ext"] in DOC_EXT and size <= 20e6
    if tier == "tier2":
        return top == "Raw Data" and r["ext"] in TAB_EXT and size <= 20e6
    raise SystemExit("unknown tier")


def fetch(r, out_dir):
    rel = r["key"].split("/", 1)[1]  # drop "psi-data/"
    dest = out_dir / rel
    size = int(r["bytes"])
    if dest.exists() and (size == 0 or dest.stat().st_size == size):
        return "skip", r["key"]
    dest.parent.mkdir(parents=True, exist_ok=True)
    q = urllib.parse.urlencode({"file": r["file_name"], "version": r["version"], "redirect": "false"},
                               quote_via=urllib.parse.quote)
    url = f"{BASE}/studies/{r['accession']}/download?{q}"
    last = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as resp:
                signed = resp.read().decode().strip()
            if not signed.startswith("https://"):
                raise RuntimeError("no presigned url: " + signed[:120])
            tmp = dest.with_name(dest.name + ".part")
            with urllib.request.urlopen(urllib.request.Request(signed, headers=UA), timeout=300) as resp, open(tmp, "wb") as f:
                while True:
                    chunk = resp.read(1 << 20)
                    if not chunk:
                        break
                    f.write(chunk)
            tmp.rename(dest)
            return "ok", r["key"]
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 * (attempt + 1))
    return "fail", f"{r['key']} :: {last}"


def main():
    manifest, out_dir, tier = sys.argv[1], Path(sys.argv[2]), sys.argv[3]
    workers = int(sys.argv[4]) if len(sys.argv) > 4 else 8
    rows = [r for r in csv.DictReader(open(manifest)) if in_tier(r, tier)]
    total = sum(int(r["bytes"]) for r in rows)
    print(f"{tier}: {len(rows)} files, {total/1e9:.2f} GB", flush=True)
    counts = {"ok": 0, "skip": 0, "fail": 0}
    fails = []
    with ThreadPoolExecutor(workers) as ex:
        for i, (status, info) in enumerate(ex.map(lambda r: fetch(r, out_dir), rows), 1):
            counts[status] += 1
            if status == "fail":
                fails.append(info)
            if i % 250 == 0:
                print(i, counts, flush=True)
    print("DONE", counts, flush=True)
    (out_dir / f"_failed_{tier}.txt").write_text("\n".join(fails))


if __name__ == "__main__":
    main()
