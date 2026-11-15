#!/usr/bin/env python3
"""Build the resource library used by the Resources MCP server: every item on the
challenge's Resources tab, split into citable passages, plus partner-agency links.

Code generated with SI assistance (Claude Code).

Usage: python3 build_resources.py <repo_root>
Reads the plain-text copies in data/context/ (made from the public pages) and
writes src/data/resources.json. Text is quoted from NASA public pages; partner
entries are links with a one-line description, not copied content.
"""
import json
import re
import sys
from pathlib import Path

root = Path(sys.argv[1])
ctx = root / "data" / "context"

RESOURCES = [
    dict(id="psi", agency="NASA", kind="data", listed=True, title="PSI Data Repository: Combustion Science",
         url="https://psi.nasa.gov/physci/repo/search?q=combustion", file=None, topics=["data"],
         summary="Physical Sciences Informatics: the source of the experimental data. The lab harmonizes its test tables and links its documents and videos live."),
    dict(id="combustion-science", agency="NASA", kind="page", listed=True, title="NASA Combustion Science (Glenn Research Center)",
         url="https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/", file="nasa_combustion_science.txt", topics=["overview", "investigations"],
         summary="Basic information about most of the combustion investigations whose data is in PSI."),
    dict(id="sciencecast", agency="NASA", kind="video", listed=True, title="NASA ScienceCasts: The Power of Studying Combustion on the ISS",
         url="https://www.youtube.com/watch?v=W1oXykoz9zg", file=None, topics=["overview", "video"],
         summary="A 3.6-minute introduction (2018) to NASA's combustion research on the International Space Station. Video only; no transcript is stored here."),
    dict(id="researchers-guide", agency="NASA", kind="document", listed=True, title="A Researcher's Guide to: International Space Station Combustion Science",
         url="https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/", file="researchers_guide_combustion.txt", topics=["overview", "investigations", "hardware"],
         summary="A 2015 review, 50+ pages, of NASA's combustion research conducted on or planned for the station, with the facilities and why microgravity matters."),
    dict(id="apollo-1", agency="NASA", kind="page", listed=True, title="Apollo 1", url="https://sma.nasa.gov/sma-disciplines/accllp/apollo-1", file="apollo_1.txt", topics=["incident", "lessons", "prevention"],
         summary="The crew, the mission, the fire that erupted during a pre-launch test in an oxygen-filled cabin, the investigation and the lessons learned."),
    dict(id="apollo-13", agency="NASA", kind="page", listed=True, title="Apollo 13", url="https://sma.nasa.gov/sma-disciplines/accllp/apollo-13", file="apollo_13.txt", topics=["incident", "lessons"],
         summary="The crew, the mission, the oxygen tank explosion on the way to the Moon, the investigation and the lessons learned."),
    dict(id="mir-fire", agency="NASA", kind="page", listed=True, title="25 Years Ago: Fire Aboard Space Station Mir", url="https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/", file="mir_fire_1997.txt", topics=["incident", "lessons", "suppression", "detection"],
         summary="The 1997 fire aboard the Russian station Mir, caused by an oxygen generator failure, during joint operations before the International Space Station."),
    dict(id="air-tanks", agency="NASA", kind="spinoff", listed=True, title="Fireman's Air Tanks", url="https://spinoff.nasa.gov/node/9582", file="spinoff_firemans_air_tanks.txt", topics=["earth", "spinoff"],
         summary="The 1970s adaptation of spacesuit technology to improve firefighters' air tanks and breathing gear."),
    dict(id="fire-detector", agency="NASA", kind="spinoff", listed=True, title="Fire Detector", url="https://spinoff.nasa.gov/node/9407", file="spinoff_fire_detector.txt", topics=["earth", "spinoff", "detection"],
         summary="A 1970s smoke detector developed for the shuttle that tells smoke from dust and so gives fewer nuisance alarms; used in industry, for example in mining."),
    dict(id="fire-attire", agency="NASA", kind="spinoff", listed=True, title="New Technology for the Fire Attire", url="https://spinoff.nasa.gov/node/9918", file="spinoff_fire_attire.txt", topics=["earth", "spinoff"],
         summary="A 1980s application of NASA spacesuit technology to improve firefighter clothing."),
    # Not on the challenge's Resources tab: international partner work on the same problem.
    dict(id="flare", agency="JAXA / NASA / ESA", kind="page", listed=False, title="Flammability Limits At Reduced-g Experiment (FLARE)",
         url="https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/flammability-limits-at-reduced-g-experiment-flare/", file="flare_nasa_glenn.txt", topics=["partner", "prevention", "materials"],
         summary="JAXA-led experiment on Kibo, with NASA, ESA and universities in Japan, the USA and France, to relate a material's flammability limit on the ground to its limit in microgravity and propose a new screening test."),
    dict(id="jaxa-solid-combustion", agency="JAXA", kind="link", listed=False, title="JAXA leaflet: combustion experiments in microgravity on Kibo",
         url="https://humans-in-space.jaxa.jp/2026/07/Leaflet_CombustionExperimentInMicrogravity.pdf", file=None, topics=["partner", "materials"],
         summary="JAXA's leaflet on its solid combustion experiments in the Japanese Experiment Module. Link only; the content is not stored here."),
    dict(id="saffire-eoportal", agency="eoPortal", kind="link", listed=False, title="Saffire (Spacecraft Fire Experiment) on eoPortal",
         url="https://eoportal.org/satellite-missions/saffire", file=None, topics=["partner", "prevention"],
         summary="Mission summary of Saffire, the large-scale fire experiments flown on Cygnus, developed by NASA with an international team that included ESA. Link only; the content is not stored here."),
    # Added after a web search on other agencies' work. Links with a one-line description written for this
    # project from what the search returned; none of their text is stored.
    dict(id="jaxa-scem", agency="JAXA", kind="link", listed=False, title="Solid Combustion Experiment Module (SCEM) on Kibo",
         url="https://humans-in-space.jaxa.jp/en/biz-lab/experiment/facility/pm/scem", file=None, topics=["partner", "materials", "hardware", "prevention"],
         summary="JAXA's facility in the Kibo module for measuring the limiting oxygen concentration at which flame spread over solid fuels is sustained. Link only."),
    dict(id="jaxa-flare-theme", agency="JAXA", kind="link", listed=False, title="FLARE: Fundamental Research on International Standard of Fire Safety in Space",
         url="https://humans-in-space.jaxa.jp/en/biz-lab/experiment/theme/detail/000807.html", file=None, topics=["partner", "materials", "prevention"],
         summary="JAXA's theme page for FLARE: flame spread over flat, rod and insulated-wire samples in microgravity, toward an international flammability standard. Link only."),
    dict(id="esa-exfires", agency="ESA", kind="link", listed=False, title="Exploration Fire Safety (ExFireS)",
         url="https://explorationscience.esa.int/?p=354", file=None, topics=["partner", "materials", "prevention", "modeling"],
         summary="ESA Exploration Science project to improve fire safety in space vehicles through material flammability experiments in microgravity that validate other facilities and support models. Link only."),
    dict(id="zarm-oxygen", agency="DLR / ZARM", kind="link", listed=False, title="Increased fire risk during astronautic space missions (Bremen Drop Tower)",
         url="https://www.zarm.uni-bremen.de/en/news-list/news-display/increased-fire-risk-during-astronautic-space-missions", file=None, topics=["partner", "materials", "prevention", "enriched-oxygen"],
         summary="ZARM (University of Bremen) drop-tower study of acrylic sheets across oxygen, pressure and opposed flow: lower pressure dampens the flame, but the effect of higher oxygen dominates. Directly on the enriched-atmosphere question. Link only."),
    dict(id="zarm-flare-g", agency="DLR / ZARM", kind="link", listed=False, title="Flammability at Reduced Gravity (FLARE-G)",
         url="https://zarm.uni-bremen.de/de/fallturm/projekte/combustion/flare-g.html", file=None, topics=["partner", "materials", "prevention"],
         summary="The DLR-funded German part of the JAXA-coordinated FLARE project: burning of plastic films in changing atmospheres at pressures up to 1 bar, in concurrent and opposed flow. Link only."),
    dict(id="zarm-iss", agency="DLR / ZARM", kind="link", listed=False, title="Flame propagation experiments on the ISS",
         url="https://www.zarm.uni-bremen.de/en/news-list/news-display/flame-propagation-experiments-on-the-iss", file=None, topics=["partner", "materials"],
         summary="ZARM and Gifu University, with JAXA and DLR, running station experiments on how fire spreads along different material samples, with longer test times than the drop tower. Link only."),
    dict(id="cnes-partial-g", agency="CNES", kind="link", listed=False, title="Flame spread over electrical wires from microgravity to Moon and Mars gravity (CNES parabolic flights)",
         url="https://discovery.ucl.ac.uk/10154634/1/PCI39_CNES-Partial-G-report_manuscript.pdf", file=None, topics=["partner", "partial-gravity", "prevention", "materials"],
         summary="Research paper from CNES-funded parabolic flights with the DIAMONDS rig (Sorbonne Universite): opposed flame spread over wire insulation at 0 g, lunar and Martian gravity. One of the few partial-gravity data sets; PSI has none. Link only."),
]

NOISE = re.compile(r"^(menu|search|advanced search|toggle navigation|visit nasa\.gov|suggested searches|explore|share|details|related terms|read more|keep exploring|national aeronautics and space administration)$", re.I)


def passages(text, pdf=False):
    out, section = [], ""
    blocks = re.split(r"\n\s*\n", text) if pdf else text.split("\n")
    for b in blocks:
        t = " ".join(b.split())
        t = re.sub(r"(\w)- (\w)", r"\1\2", t) if pdf else t  # undo line-break hyphenation
        if not t or NOISE.match(t) or t.startswith("at some point for screen readers"):
            continue
        if len(t) < 90:
            if 3 <= len(t) <= 70 and not t.endswith(".") and not t.isdigit():
                section = t
            continue
        # keep passages a readable size
        while len(t) > 1100:
            cut = t.rfind(". ", 0, 1000)
            cut = cut + 1 if cut > 300 else 1000
            out.append({"section": section, "text": t[:cut].strip()})
            t = t[cut:].strip()
        if len(t) >= 90:
            out.append({"section": section, "text": t})
    return out


library = []
for r in RESOURCES:
    item = {k: r[k] for k in ("id", "agency", "kind", "listed", "title", "url", "topics", "summary")}
    item["passages"] = []
    if r["file"]:
        text = (ctx / r["file"]).read_text(encoding="utf-8", errors="replace")
        if r["id"] == "researchers-guide":
            n = 0
            for page_no, page in enumerate(text.split("\f"), 1):
                for p in passages(page, pdf=True):
                    p["page"] = page_no
                    item["passages"].append(p)
                    n += 1
        else:
            item["passages"] = passages(text)
        seen, unique = set(), []
        for p in item["passages"]:  # some pages repeat a paragraph (teaser + body)
            if p["text"] not in seen:
                seen.add(p["text"])
                unique.append(p)
        item["passages"] = unique
        for i, p in enumerate(item["passages"]):
            p["id"] = f"{r['id']}#{i + 1}"
    library.append(item)
    print(f"{r['id']:22} {r['agency']:18} passages={len(item['passages']):4} chars={sum(len(p['text']) for p in item['passages'])}")

dst = root / "src" / "data" / "resources.json"
dst.write_text(json.dumps(library, ensure_ascii=False, separators=(",", ":")))
print("written", dst, round(dst.stat().st_size / 1e3), "KB")
