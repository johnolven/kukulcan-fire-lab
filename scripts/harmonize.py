#!/usr/bin/env python3
"""Harmonize the per-investigation PSI "Experimental table" CSVs into one
test-level dataset with common fields and units.

Code generated with SI assistance (Claude Code).

Usage: python3 harmonize.py <psi_dir> <out_dir>
  <psi_dir> contains catalog/ (investigation JSON + file_manifest.csv) and files/.

Rules:
  * Nothing is invented. A field stays null when the source table does not give it.
  * Values assumed from the facility (e.g. cabin pressure inside the Microgravity
    Science Glovebox) are written with an explicit `assumed` list.
  * `granularity` says what one row means: "test" (one burn), "session" (a test
    day with several flames) or "matrix" (a planned range of conditions).
"""
import csv
import glob
import json
import os
import re
import sys
from collections import Counter, defaultdict

MMHG_PER_ATM = 760.0
BAR_PER_ATM = 1.01325

# Curated from the challenge statement and each investigation's own description.
CURATION = {
    "PSI-10": dict(pillars=["prevention", "fundamentals"], phase="gas", facility="CIR / ACME", focus="Soot control and extinction limits of spherical flames; inverse flames reach 85% O2."),
    "PSI-20": dict(pillars=["prevention"], phase="gas", facility="CIR / ACME", focus="Gas burner that emulates burning solids and liquids to study material flammability in still atmospheres."),
    "PSI-21": dict(pillars=["fundamentals"], phase="gas", facility="CIR / ACME", focus="Coflow laminar diffusion flames: benchmark data for combustion models, soot and lifted flames."),
    "PSI-22": dict(pillars=["fundamentals", "partial-gravity proxy"], phase="gas", facility="CIR / ACME", focus="Electric fields drive ion wind in flames; used to mimic partial-gravity buoyancy."),
    "PSI-23": dict(pillars=["fundamentals"], phase="gas", facility="CIR / ACME", focus="Spherical flames: structure, extinction and flammability-limit response."),
    "PSI-25": dict(pillars=["prevention", "suppression"], phase="solid", facility="MSG / SPICE flow duct", focus="Flammability limits and flame spread of solid materials versus oxygen and air flow."),
    "PSI-26": dict(pillars=["prevention", "suppression"], phase="solid", facility="MSG / SPICE flow duct", focus="Burning and nitrogen suppression of solid samples in low-speed flow."),
    "PSI-39": dict(pillars=["fundamentals", "suppression"], phase="liquid", facility="CIR / MDCA", focus="Cool flames: droplets that keep burning invisibly after visible extinction."),
    "PSI-47": dict(pillars=["detection"], phase="aerosol", facility="ISS cabin", focus="Dust measurement with a smoke-detection instrument; nuisance-alarm discrimination."),
    "PSI-60": dict(pillars=["detection", "modeling"], phase="gas", facility="Ground analysis", focus="Computational and experimental analysis of SPICE smoke-point data."),
    "PSI-62": dict(pillars=["prevention", "modeling"], phase="solid", facility="Ground analysis", focus="Numerical modeling of concurrent flame spread over solids."),
    "PSI-68": dict(pillars=["suppression"], phase="liquid", facility="CIR / MDCA", focus="Droplet combustion and extinction across oxygen, pressure, diluent and flow."),
    "PSI-69": dict(pillars=["suppression"], phase="liquid", facility="CIR / MDCA", focus="Flame extinguishment by diluting the atmosphere with CO2, helium, nitrogen or xenon."),
    "PSI-98": dict(pillars=["prevention"], phase="solid", facility="Cygnus / Saffire", focus="Large-scale (0.4 x 0.94 m) fabric fire inside an uncrewed spacecraft."),
    "PSI-99": dict(pillars=["prevention"], phase="solid", facility="Cygnus / Saffire", focus="Nine material samples burned to test NASA flammability screening limits."),
    "PSI-100": dict(pillars=["prevention"], phase="solid", facility="Cygnus / Saffire", focus="Large-scale fabric fire at higher air flow (30 cm/s)."),
    "PSI-101": dict(pillars=["detection"], phase="solid (smoke)", facility="MSG / SAME", focus="Smoke particle size from overheated spacecraft materials; smoke-detector design."),
    "PSI-102": dict(pillars=["detection"], phase="solid (smoke)", facility="MSG / SAME", focus="First smoke aerosol measurements from overheated spacecraft materials."),
    "PSI-106": dict(pillars=["fundamentals"], phase="gas", facility="MSG / SPICE flow duct", focus="Lifted flames and flame structure in coflow."),
    "PSI-107": dict(pillars=["detection", "fundamentals"], phase="gas", facility="MSG / SPICE flow duct", focus="Smoke point: when a flame starts to release soot, versus fuel and coflow speed."),
    "PSI-115": dict(pillars=["detection", "modeling"], phase="solid (smoke)", facility="Ground analysis", focus="Uses SAME data to advance smoke transport and detection simulation."),
    "PSI-117": dict(pillars=["fundamentals", "modeling"], phase="liquid", facility="Ground analysis", focus="Cool-flame dynamics of droplets under thermo-convective perturbation."),
    "PSI-142": dict(pillars=["fundamentals", "modeling"], phase="gas", facility="Ground analysis", focus="Cool-flame transition limits under radiation and stretch."),
    "PSI-159": dict(pillars=["prevention", "fundamentals"], phase="gas", facility="CIR / ACME", focus="Cool flames of gases; highest oxygen concentrations tested in microgravity (up to 85%)."),
}
# Returned by the keyword search but not combustion investigations.
NOT_COMBUSTION = {"PSI-108": "Fluid physics (thermocapillary convection)", "PSI-181": "Materials science (solder joints)"}

MSG_CABIN = {"PSI-25", "PSI-26", "PSI-106", "PSI-107", "PSI-101", "PSI-102"}


def clean(s):
    return " ".join((s or "").replace("�", "").split())


def num(s):
    s = clean(s).replace(",", "")
    if not re.match(r"^[~<>= ]*-?\.?\d", s):  # "LOW O2", "RAMPED", "n/a" are not numbers
        return None
    m = re.search(r"-?\d*\.?\d+(?:[eE]-?\d+)?", s)
    return float(m.group(0)) if m else None


def nums(s):
    return [float(x) for x in re.findall(r"\d+(?:\.\d+)?", clean(s))]


def pct(v):
    """Mole fraction or percent -> percent."""
    if v is None:
        return None
    return round(v * 100 if v <= 1.0 else v, 2)


def read(path):
    with open(path, encoding="utf-8-sig", errors="replace") as f:
        rows = list(csv.reader(f))
    hdr = [clean(h) for h in rows[0]]
    out = []
    for r in rows[1:]:
        if not any(clean(c) for c in r):
            continue
        out.append({hdr[i]: clean(r[i]) if i < len(r) else "" for i in range(len(hdr))})
    return out


def col(row, *needles):
    for k in row:
        lk = k.lower()
        if all(n in lk for n in needles):
            return row[k]
    return ""


def base(acc, acr, src, raw, **kw):
    rec = dict(
        accession=acc, acronym=acr, test_id=None, date=None, granularity="test",
        fuel=None, fuel_phase=CURATION.get(acc, {}).get("phase"), material=None, geometry=None,
        o2_pct=None, o2_min=None, o2_max=None, o2_where="ambient",
        pressure_atm=None, flow_cm_s=None, diluent=None,
        ignited=None, outcome=None, burn_time_s=None, n_flames=None,
        assumed=[], notes=None, source_file=src, raw=raw,
    )
    rec.update(kw)
    if rec["o2_pct"] is not None and rec["o2_min"] is None:
        rec["o2_min"] = rec["o2_max"] = rec["o2_pct"]
    if rec["pressure_atm"] is not None and rec["pressure_atm"] <= 0:
        rec["pressure_atm"] = None
    if rec["pressure_atm"] is None and acc in MSG_CABIN:
        rec["pressure_atm"] = 1.0
        rec["assumed"].append("pressure_atm: ISS cabin pressure (experiment ran open to cabin air inside the glovebox)")
    return rec


def o2_range(text):
    v = [pct(x) for x in nums(text)]
    v = [x for x in v if x is not None and 5 <= x <= 100]
    if not v:
        return None, None, None
    return (v[0] if len(v) == 1 else None), min(v), max(v)


def material_family(m):
    l = (m or "").lower()
    for key, fam in [("sibal", "SIBAL (cotton-fiberglass fabric)"), ("cotton", "SIBAL (cotton-fiberglass fabric)"),
                     ("nomex", "Nomex"), ("pmma", "PMMA (acrylic)"), ("rod", "PMMA (acrylic)"), ("sphere", "PMMA (acrylic)"),
                     ("acrylic", "PMMA (acrylic)"), ("silicone", "Silicone"), ("kapton", "Kapton"), ("teflon", "Teflon"),
                     ("pyrell", "Pyrell (polyurethane foam)"), ("lampwick", "Lamp wick (cellulose)"), ("candle", "Wax candle"),
                     ("wax", "Wax candle"), ("dust", "Arizona road dust"), ("phthalate", "Dibutyl phthalate (reference aerosol)")]:
        if key in l:
            return fam
    return clean(m) or None


def harmonize(files_dir, acr_of):
    T = []

    def table(acc, contains=""):
        out = []
        for f in sorted(glob.glob(f"{files_dir}/{acc}/Experimental table/*.csv")):
            if contains.lower() in os.path.basename(f).lower():
                out.append((os.path.basename(f), read(f)))
        return out

    def add(acc, src, raw, **kw):
        T.append(base(acc, acr_of.get(acc, ""), src, raw, **kw))

    # --- ACME Flame Design (spherical flames) ---
    for src, rows in table("PSI-10", "Normal"):
        for r in rows:
            p = num(r.get("pmean (atm)")) or num(r.get("pinit (atm)"))
            add("PSI-10", src, r, test_id=r["Test"], fuel=r["Fuel"], geometry="spherical burner, normal flame (fuel issues into oxidizer)",
                o2_pct=pct(num(r.get("XO2 (init)"))), pressure_atm=p and round(p, 3), diluent="N2",
                notes="Fuel flow ramped during test" if r.get("Xfuel") == "RAMPED" else None)
    for src, rows in table("PSI-10", "Inverse"):
        for r in rows:
            p = num(r.get("pmean (atm)")) or num(r.get("pinit (atm)"))
            add("PSI-10", src, r, test_id=r["Test"], fuel="C2H4", geometry="spherical burner, inverse flame (oxidizer issues into fuel atmosphere)",
                o2_pct=pct(num(r.get("XO2"))), o2_where="burner oxidizer stream", pressure_atm=p and round(p, 3), diluent="N2")

    # --- ACME session-level tables ---
    for src, rows in table("PSI-20"):
        for r in rows:
            one, lo, hi = o2_range(r.get("Oxygen Conc (percent)", ""))
            add("PSI-20", src, r, granularity="session", test_id=f"{r['Year']}-{r['Month']}-{r['Date']}", date=f"{r['Year']} {r['Month']} {r['Date']}",
                fuel=r["Fuel Bottle"], geometry=f"{r['Burner Size (mm)']} mm flat porous burner (condensed-fuel emulator)",
                o2_pct=one, o2_min=lo, o2_max=hi, n_flames=num(r.get("Flames Ignited")) and int(num(r["Flames Ignited"])))
    for src, rows in table("PSI-21"):
        for r in rows:
            if not r.get("Test Day"):
                continue
            add("PSI-21", src, r, granularity="session", test_id=r["Test Day"], fuel=r["Fuel Bottle"], geometry="coflow burner",
                n_flames=num(r.get("Flames ignited")) and int(num(r["Flames ignited"])), notes=r.get("Test Type"))
    for src, rows in table("PSI-22"):
        for r in rows:
            if not r.get("Test Day"):
                continue
            add("PSI-22", src, r, granularity="session", test_id=r["Test Day"], date=f"{r['Year']}-{r['Month']}-{r['Date']}", fuel=r["Fuel Bottle"],
                geometry=f"gas-jet / coflow burner with electric-field mesh ({r.get('Mesh Polarity')} polarity)",
                n_flames=num(r.get("Flames Ignited")) and int(num(r["Flames Ignited"])), notes=r.get("Test Type"))
    for src, rows in table("PSI-23"):
        for r in rows:
            day = col(r, "test day")
            if not day:
                continue
            atm = col(r, "atmosphere")
            one, lo, hi = o2_range(atm.split("O2")[0])
            dil = "He" if "He" in atm else ("N2" if "N" in atm.split("with")[-1] else None)
            fl = num(col(r, "flames ignited"))
            add("PSI-23", src, r, granularity="session", test_id=day, date=f"{r['Year']} {r['Month']} {r['Date']}", fuel=r["Fuel Bottle"],
                geometry="spherical porous burner", o2_pct=one, o2_min=lo, o2_max=hi, diluent=dil,
                pressure_atm=1.0, n_flames=fl and int(fl), notes=r.get("Test Type"),
                assumed=["pressure_atm: table note states atmosphere is ~1 atm"])

    # --- BASS-II / BASS (solids in the MSG flow duct) ---
    for src, rows in table("PSI-25"):
        for r in rows:
            m = r["Fuel Sample Material"]
            add("PSI-25", src, r, test_id=r["Test #"], date=r["Date"], material=material_family(m), fuel=m, geometry=m,
                o2_pct=pct(num(col(r, "initial o2"))),
                notes=f"PI {r['PI']}; fan display {r.get('Fan display')} (duct fan setting, not converted to cm/s)")
    for src, rows in table("PSI-26"):
        for r in rows:
            m = r["Fuel Sample Material"]
            add("PSI-26", src, r, test_id=r["Test #"], date=r["Date"], material=material_family(m), fuel=m, geometry=m)

    # --- Droplet combustion (MDCA) ---
    for src, rows in table("PSI-39"):
        for r in rows:
            he = num(r.get("Helium")) or 0
            add("PSI-39", src, r, test_id=r["Flex Number"], date=r["Test Date"], fuel=r["Fuel"],
                geometry="liquid droplet" + (" on fiber" if r.get("Fiber", "").lower().startswith("y") else ", free"),
                o2_pct=pct(num(r.get("Oxygen"))), pressure_atm=num(r.get("Pressure")), diluent="He+N2" if he > 0 else "N2")
    for src, rows in table("PSI-68"):
        for r in rows:
            _, lo, hi = o2_range(r.get("Oxygen Mole Fraction", ""))
            ps = nums(r.get("Ambient Pressure (atm)", ""))
            fl = nums(r.get("Flow Velocity (cm/s)", ""))
            add("PSI-68", src, r, granularity="matrix", test_id=r["Sample (Fuel Type)"], fuel=r["Sample (Fuel Type)"],
                geometry=f"liquid droplet {r.get('Initial Droplet Diameter (mm)')} mm", o2_min=lo, o2_max=hi,
                diluent=r.get("Ambient Gas Mixture"),
                notes=f"Planned ranges: pressure {min(ps)}-{max(ps)} atm; flow {min(fl)}-{max(fl)} cm/s" if ps and fl else None)
    for src, rows in table("PSI-69"):
        for r in rows:
            p = num(col(r, "ambient pressure"))
            co2 = num(col(r, "co initial")) or 0
            he = num(col(r, "he initial")) or 0
            dil = "+".join(x for x, v in (("CO2", co2), ("He", he)) if v > 0) or "N2"
            end = r.get("Test end") or None
            add("PSI-69", src, r, test_id=r["FLEX Identifier"], date=r["Test Date"], fuel=r["Fuel"],
                geometry=f"liquid droplet {col(r, 'droplet initial')} mm", o2_pct=pct(num(col(r, "o initial"))),
                pressure_atm=p and round(p / MMHG_PER_ATM, 3), diluent=dil, outcome=end, burn_time_s=num(r.get("Burn time; s")), ignited=True)

    # --- Saffire (large-scale, Cygnus) ---
    for acc in ("PSI-98", "PSI-99", "PSI-100"):
        for src, rows in table(acc):
            for r in rows:
                mat = r.get("Material", "")
                if not mat or mat.lower().startswith("pre-test") or r["Sample Number"].lower().startswith("note"):
                    continue
                one, lo, hi = o2_range(col(r, "percent o2"))
                if one is None and lo is not None:
                    one = round((lo + hi) / 2, 2)
                bt = col(r, "burn time")
                direction = col(r, "direction")
                add(acc, src, r, test_id=r["Sample Number"], material=material_family(mat), fuel=mat,
                    geometry=f"sheet {col(r, 'thickness')} thick x {col(r, 'length')} x {col(r, 'width')}; {direction.lower()} flow",
                    o2_pct=one, o2_min=lo, o2_max=hi, flow_cm_s=num(col(r, "air flow")), burn_time_s=num(bt) if re.match(r"^\d", bt) else None,
                    outcome=("Did not sustain burning" if bt.lower().startswith("insig") else None))

    # --- Smoke / aerosol (detection) ---
    for src, rows in table("PSI-101"):
        for r in rows:
            add("PSI-101", src, r, test_id=r["SAME Test #"], date=r.get("Date"), material=material_family(r["Sample Type"]), fuel=r["Sample Type"],
                geometry="overheated sample (smoke generation, no flame)", flow_cm_s=num(r.get("Inlet velocity (cm/s)")), notes=r.get("Description") or None)
    for src, rows in table("PSI-102"):
        last = ""
        for r in rows:
            last = r.get("Sample Material") or last
            add("PSI-102", src, r, test_id=r["Sample #"], material=material_family(last), fuel=last,
                geometry="overheated sample (smoke generation, no flame)", flow_cm_s=num(r.get("Air Flow (cm/s)")))
    for src, rows in table("PSI-47"):
        for r in rows:
            add("PSI-47", src, r, granularity="session", test_id=r["Session Name"], date=r.get("Actual Day"), material=material_family(r["Sample Material"]),
                fuel=r["Sample Material"], geometry="aerosol sampling (no combustion)", notes=r.get("Sampled Location"))

    # --- Gas flames in the MSG duct ---
    for src, rows in table("PSI-106"):
        for r in rows:
            add("PSI-106", src, r, granularity="session", test_id=r["Test Date"][:11], date=r["Test Date"][:11], fuel=r["Fuel Type"], geometry="coflow gas-jet burner")
    for src, rows in table("PSI-107"):
        seen = set()
        for i, r in enumerate(rows):
            key = tuple(r.values())
            if key in seen:
                continue
            seen.add(key)
            lost = "los" in (r.get("GMT ignition", "") + r.get("GMT Flame Off", "")).lower()
            add("PSI-107", src, r, test_id=f"GMT{r['GMT date']}-{i + 1}", date=f"GMT day {r['GMT date']}", fuel=r["Fuel"],
                geometry=f"gas jet, {r.get('Nozzle (mm)')} mm nozzle, coflow air", flow_cm_s=num(r.get("Air Rate (cm/s)")),
                notes="Downlink loss of signal; times not recorded" if lost else None)

    # --- ACME CFI-G ---
    for src, rows in table("PSI-159", "Inverse"):
        for r in rows:
            if not r.get("Test"):
                continue
            p = num(r.get("approx p (bar)"))
            hot = r.get("Hot ignition", "").lower()
            end = {"se": "Self-extinguished", "ft": "Flow terminated"}.get(col(r, "self").lower())
            add("PSI-159", src, r, test_id=r["Test"].replace(" ", ""), fuel=r["Fuel"], geometry="spherical burner, inverse flame (oxidizer issues into fuel atmosphere)",
                o2_pct=pct(num(r.get("XO2"))), o2_where="burner oxidizer stream", pressure_atm=p and round(p / BAR_PER_ATM, 3), diluent="N2",
                ignited=True if hot.startswith("y") else (False if hot.startswith("n") else None), outcome=end,
                burn_time_s=num(r.get("burn time (sec)")), notes=r.get("Comments") or None)
    for src, rows in table("PSI-159", "Normal"):
        for r in rows:
            if not r.get("Test"):
                continue
            p = num(r.get("approx p (bar)"))
            hot = r.get("Hot ignition", "").lower()
            end = {"se": "Self-extinguished", "ft": "Flow terminated"}.get(col(r, "self").lower())
            cool = r.get("TFP", "")
            add("PSI-159", src, r, test_id=r["Test"].replace(" ", ""), fuel=r["Fuel"], geometry="spherical burner, normal flame (fuel issues into oxidizer)",
                o2_pct=pct(num(col(r, "xo2 before"))), pressure_atm=p and round(p / BAR_PER_ATM, 3), diluent="N2",
                ignited=True if hot.startswith("y") else (False if hot.startswith("n") else None), outcome=end,
                burn_time_s=num(r.get("burn time (sec)")), notes=("Cool flame observed. " if r.get("Cool flame?", "").lower().startswith("y") else "") + (r.get("Comments") or "") or None)

    for i, t in enumerate(T):
        t["id"] = f"{t['accession']}:{i}"
    return T


def investigations(catalog_dir, tests):
    by_acc = defaultdict(list)
    for t in tests:
        by_acc[t["accession"]].append(t)
    man = defaultdict(lambda: dict(files=0, bytes=0, videos=0, cats=Counter()))
    with open(f"{catalog_dir}/file_manifest.csv") as f:
        for r in csv.DictReader(f):
            m = man[r["accession"]]
            m["files"] += 1
            m["bytes"] += int(r["bytes"])
            m["cats"][r["key"].split("/")[2]] += 1
            if r["ext"] in ("mp4", "ts", "avi", "mpg"):
                m["videos"] += 1
    out = []
    for path in sorted(glob.glob(f"{catalog_dir}/investigations/PSI-*.json"), key=lambda p: int(re.search(r"PSI-(\d+)", p).group(1))):
        d = json.load(open(path))
        acc = d["accession"]
        cur = CURATION.get(acc)
        ts = by_acc.get(acc, [])
        o2 = [x for t in ts for x in (t["o2_min"], t["o2_max"]) if x is not None]
        pr = [t["pressure_atm"] for t in ts if t["pressure_atm"] is not None]
        fl = [t["flow_cm_s"] for t in ts if t["flow_cm_s"] is not None]
        pis = [f"{c.get('firstName', '')} {c.get('lastName', '')}".strip() for c in d.get("contacts", [])]
        out.append(dict(
            accession=acc, acronym=d.get("investigationAcronym") or "", title=d.get("title"),
            is_combustion=acc not in NOT_COMBUSTION, excluded_reason=NOT_COMBUSTION.get(acc),
            research_area=d.get("researchArea"), sub_area=d.get("subResearchArea"), project_type=d.get("projectType"),
            platform=d.get("flightProgram"), hardware=d.get("experimentHardware"), center=d.get("managingNasaCenter"),
            start=d.get("investigationStartDate"), end=d.get("investigationEndDate"), doi=d.get("doi"),
            objective=clean(d.get("objective")), approach=clean(d.get("approach")), hypothesis=clean(d.get("hypothesis")),
            impacts=clean(d.get("researchImpacts")), related=d.get("related_glds") or "",
            people=[p for p in pis if p][:8],
            publications=[dict(title=clean(p.get("title")), authors=clean(p.get("authorList")), doi=p.get("doi") or "") for p in d.get("publications", [])],
            pillars=(cur or {}).get("pillars", []), fuel_phase=(cur or {}).get("phase"), facility=(cur or {}).get("facility"),
            focus=(cur or {}).get("focus"),
            url=f"https://psi.nasa.gov/physci/repo/data/investigations/{acc}",
            n_records=len(ts), n_tests=sum(1 for t in ts if t["granularity"] == "test"),
            n_flames=sum(t["n_flames"] or 0 for t in ts) or None,
            o2_range=[min(o2), max(o2)] if o2 else None, pressure_range=[min(pr), max(pr)] if pr else None,
            flow_range=[min(fl), max(fl)] if fl else None,
            fuels=sorted({t["fuel"] for t in ts if t["fuel"]})[:40],
            materials=sorted({t["material"] for t in ts if t["material"]}),
            files=man[acc]["files"], bytes=man[acc]["bytes"], videos=man[acc]["videos"], file_categories=dict(man[acc]["cats"]),
        ))
    return out


def main():
    psi, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    acr = {}
    for p in glob.glob(f"{psi}/catalog/investigations/PSI-*.json"):
        d = json.load(open(p))
        acr[d["accession"]] = d.get("investigationAcronym") or d["accession"]
    tests = harmonize(f"{psi}/files", acr)
    inv = investigations(f"{psi}/catalog", tests)
    json.dump(tests, open(f"{out_dir}/tests.json", "w"), ensure_ascii=False)
    json.dump(inv, open(f"{out_dir}/investigations.json", "w"), ensure_ascii=False, indent=1)
    cols = ["id", "accession", "acronym", "test_id", "date", "granularity", "fuel", "fuel_phase", "material", "geometry", "o2_pct", "o2_min",
            "o2_max", "o2_where", "pressure_atm", "flow_cm_s", "diluent", "ignited", "outcome", "burn_time_s", "n_flames", "assumed", "notes", "source_file"]
    with open(f"{out_dir}/tests.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for t in tests:
            w.writerow(["; ".join(t[c]) if isinstance(t[c], list) else ("" if t[c] is None else t[c]) for c in cols])

    print("records", len(tests), dict(Counter(t["granularity"] for t in tests)))
    for i in inv:
        print(f"{i['accession']:8} {i['acronym'][:20]:20} rec={i['n_records']:5} O2={i['o2_range']} P={i['pressure_range']} flow={i['flow_range']} mats={len(i['materials'])}")
    for f in ("o2_pct", "o2_min", "pressure_atm", "flow_cm_s", "material", "outcome", "burn_time_s"):
        print(f"  filled {f}: {sum(1 for t in tests if t[f] is not None)}")


if __name__ == "__main__":
    main()
