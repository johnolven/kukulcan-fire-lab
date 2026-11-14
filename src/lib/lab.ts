// Query core shared by the dashboard, the MCP servers and the agents.
// Everything here is deterministic and reads only the harmonized NASA PSI data.
// Code generated with SI assistance (Claude Code).

import testsJson from "@/data/tests.json";
import investigationsJson from "@/data/investigations.json";
import type { Investigation, Target, TestRecord } from "./types";
import { PSI_PER_ATM } from "./types";

export const TESTS = testsJson as unknown as TestRecord[];
export const INVESTIGATIONS = investigationsJson as unknown as Investigation[];
export const COMBUSTION = INVESTIGATIONS.filter((i) => i.is_combustion);

const byAccession = new Map(INVESTIGATIONS.map((i) => [i.accession, i]));

export function getInvestigation(id: string): Investigation | undefined {
  const key = id.trim().toLowerCase();
  return (
    byAccession.get(id.trim().toUpperCase()) ??
    INVESTIGATIONS.find((i) => i.acronym && i.acronym.toLowerCase() === key) ??
    INVESTIGATIONS.find((i) => i.acronym && i.acronym.toLowerCase().replace(/[^a-z0-9]/g, "").includes(key.replace(/[^a-z0-9]/g, "")))
  );
}

export function label(i: Investigation): string {
  return i.acronym || i.accession;
}

// ---------- phases ----------

export type PhaseGroup = "solid" | "liquid" | "gas" | "smoke";

export function phaseGroup(phase: string | null | undefined): PhaseGroup {
  const p = (phase ?? "").toLowerCase();
  if (p.includes("smoke") || p.includes("aerosol")) return "smoke";
  if (p.startsWith("solid")) return "solid";
  if (p.startsWith("liquid")) return "liquid";
  return "gas";
}

// ---------- filtering ----------

export interface TestFilter {
  accession?: string;
  phase?: string;
  material?: string;
  fuel?: string;
  o2_min?: number;
  o2_max?: number;
  pressure_min_atm?: number;
  pressure_max_atm?: number;
  outcome?: string;
  text?: string;
}

export function o2Of(t: TestRecord): number | null {
  if (t.o2_pct != null) return t.o2_pct;
  if (t.o2_min != null && t.o2_max != null) return (t.o2_min + t.o2_max) / 2;
  return null;
}

export function queryTests(f: TestFilter): TestRecord[] {
  const acc = f.accession ? getInvestigation(f.accession)?.accession : undefined;
  const has = (v: string | null, needle?: string) => !needle || (v ?? "").toLowerCase().includes(needle.toLowerCase());
  return TESTS.filter((t) => {
    if (f.accession && t.accession !== acc) return false;
    if (f.phase && phaseGroup(t.fuel_phase) !== phaseGroup(f.phase)) return false;
    if (!has(t.material, f.material) && !has(t.fuel, f.material)) return false;
    if (!has(t.fuel, f.fuel)) return false;
    if (!has(t.outcome, f.outcome)) return false;
    if (f.o2_min != null && (t.o2_max == null || t.o2_max < f.o2_min)) return false;
    if (f.o2_max != null && (t.o2_min == null || t.o2_min > f.o2_max)) return false;
    if (f.pressure_min_atm != null && (t.pressure_atm == null || t.pressure_atm < f.pressure_min_atm)) return false;
    if (f.pressure_max_atm != null && (t.pressure_atm == null || t.pressure_atm > f.pressure_max_atm)) return false;
    if (f.text) {
      const blob = `${t.accession} ${t.acronym} ${t.test_id} ${t.fuel} ${t.material} ${t.geometry} ${t.outcome} ${t.notes}`.toLowerCase();
      if (!blob.includes(f.text.toLowerCase())) return false;
    }
    return true;
  });
}

// ---------- distance to a design atmosphere ----------

// Scales: 10 points of oxygen ~ 0.25 atm ~ 15 cm/s count as "one step away".
const O2_STEP = 10;
const P_STEP = 0.25;
const FLOW_STEP = 15;

export interface Scored<T> {
  item: T;
  distance: number;
  known: string[]; // which axes were actually measured for this record
}

export function distance(t: TestRecord, target: Target): { d: number; known: string[] } | null {
  const known: string[] = [];
  let sum = 0;
  if (t.o2_min != null && t.o2_max != null) {
    const gap = target.o2_pct < t.o2_min ? t.o2_min - target.o2_pct : target.o2_pct > t.o2_max ? target.o2_pct - t.o2_max : 0;
    sum += (gap / O2_STEP) ** 2;
    known.push("oxygen");
  }
  if (t.pressure_atm != null) {
    sum += ((t.pressure_atm - target.pressure_atm) / P_STEP) ** 2;
    known.push("pressure");
  }
  if (target.flow_cm_s != null && t.flow_cm_s != null) {
    sum += ((t.flow_cm_s - target.flow_cm_s) / FLOW_STEP) ** 2;
    known.push("flow");
  }
  if (!known.includes("oxygen")) return null; // cannot place a record without oxygen
  if (!known.includes("pressure")) sum += 1; // unknown pressure costs one step
  return { d: Math.sqrt(sum), known };
}

export function nearestTests(target: Target, limit = 12, filter: TestFilter = {}): Scored<TestRecord>[] {
  const f: TestFilter = { ...filter };
  if (target.phase) f.phase = target.phase;
  if (target.material) f.material = target.material;
  const out: Scored<TestRecord>[] = [];
  for (const t of queryTests(f)) {
    const r = distance(t, target);
    if (r) out.push({ item: t, distance: r.d, known: r.known });
  }
  return out.sort((a, b) => a.distance - b.distance).slice(0, limit);
}

// ---------- ranking investigations for a design atmosphere ----------

export interface RankedInvestigation {
  investigation: Investigation;
  score: number;
  parts: { directness: number; proximity: number; material: number; volume: number; data: number };
  nearest: Scored<TestRecord> | null;
  rationale: string[];
}

const SAFETY_PILLARS = ["prevention", "detection", "suppression"];

export function rankInvestigations(target: Target, pillar?: string): RankedInvestigation[] {
  const list = COMBUSTION.filter((i) => !pillar || i.pillars.includes(pillar.toLowerCase()));
  return list
    .map((inv) => {
      const rationale: string[] = [];
      const safety = inv.pillars.filter((p) => SAFETY_PILLARS.includes(p));
      const groundOnly = inv.project_type?.toLowerCase().includes("ground") || inv.pillars.includes("modeling");
      let directness = safety.length ? 22 + Math.min(8, (safety.length - 1) * 4 + (inv.sub_area?.toLowerCase().includes("fire") ? 4 : 0)) : 10;
      if (groundOnly && !inv.n_records) directness = Math.min(directness, 14);
      rationale.push(
        safety.length ? `Addresses ${safety.join(" + ")} directly.` : "Fundamental combustion science; indirect fire-safety relevance.",
      );

      const near = nearestTests(target, 1, { accession: inv.accession })[0] ?? null;
      let proximity = 0;
      if (near) {
        proximity = Math.round(30 * Math.exp(-near.distance / 1.5));
        const t = near.item;
        const o2 = t.o2_min === t.o2_max ? `${t.o2_min}%` : `${t.o2_min}-${t.o2_max}%`;
        rationale.push(
          `Closest record: ${o2} O2${t.pressure_atm != null ? ` at ${(t.pressure_atm * PSI_PER_ATM).toFixed(1)} psi` : ", pressure not given"} (${near.distance < 0.5 ? "inside" : near.distance < 1.5 ? "near" : "far from"} the design point).`,
        );
      } else {
        rationale.push("No oxygen values in its test table, so it cannot be placed against the design atmosphere.");
      }

      const g = phaseGroup(inv.fuel_phase);
      let material = g === "solid" ? 20 : g === "smoke" ? 16 : g === "liquid" ? 9 : 7;
      if (inv.accession === "PSI-20") material = 14; // gas burner built to emulate burning solids
      if (target.phase && phaseGroup(target.phase) !== g) material = Math.round(material * 0.5);
      rationale.push(
        g === "solid" ? "Burns real solid materials." : g === "smoke" ? "Measures smoke from overheated spacecraft materials." : g === "liquid" ? "Liquid droplets: transferable physics, not cabin materials." : inv.accession === "PSI-20" ? "Gas burner designed to emulate burning solids." : "Gas flames: transferable physics, not cabin materials.",
      );

      const volume = Math.min(10, Math.round(3.3 * Math.log10(1 + inv.n_records + (inv.n_flames ?? 0))));
      const data = (inv.n_tests > 0 ? 5 : inv.n_records > 0 ? 3 : 0) + (inv.videos > 0 ? 3 : 0) + (inv.publications.length > 0 ? 2 : 0);
      const score = directness + proximity + material + volume + data;
      return { investigation: inv, score, parts: { directness, proximity, material, volume, data }, nearest: near, rationale };
    })
    .sort((a, b) => b.score - a.score);
}

// ---------- coverage and gaps ----------

export const O2_BINS: [number, number, string][] = [
  [0, 18, "<18%"],
  [18, 23, "18-23%"],
  [23, 30, "23-30%"],
  [30, 40, "30-40%"],
  [40, 60, "40-60%"],
  [60, 101, "60%+"],
];
export const P_BINS: [number, number, string][] = [
  [0, 0.6, "<8.8 psi"],
  [0.6, 0.8, "8.8-11.8"],
  [0.8, 1.1, "11.8-16.2"],
  [1.1, 2, "16.2-29.4"],
  [2, 99, "29.4+ psi"],
];

export interface CoverageCell {
  o2: string;
  pressure: string;
  solid: number;
  liquid: number;
  gas: number;
  total: number;
}

export function coverage(): CoverageCell[] {
  const cells: CoverageCell[] = [];
  for (const [plo, phi, pl] of P_BINS) {
    for (const [olo, ohi, ol] of O2_BINS) {
      const c: CoverageCell = { o2: ol, pressure: pl, solid: 0, liquid: 0, gas: 0, total: 0 };
      for (const t of TESTS) {
        const o = o2Of(t);
        if (o == null || t.pressure_atm == null) continue;
        if (o < olo || o >= ohi || t.pressure_atm < plo || t.pressure_atm >= phi) continue;
        const g = phaseGroup(t.fuel_phase);
        if (g === "smoke") continue;
        c[g] += 1;
        c.total += 1;
      }
      cells.push(c);
    }
  }
  return cells;
}

export interface Gap {
  title: string;
  detail: string;
  severity: "critical" | "major" | "note";
}

export function gaps(target?: Target): Gap[] {
  const solid = TESTS.filter((t) => phaseGroup(t.fuel_phase) === "solid");
  const solidO2 = solid.filter((t) => t.o2_max != null);
  const solidMax = Math.max(...solidO2.map((t) => t.o2_max as number));
  const enriched = TESTS.filter((t) => t.granularity === "test" && (o2Of(t) ?? 0) >= 30);
  const enrichedSolid = solid.filter((t) => (t.o2_max ?? 0) >= 30).length;
  const lowP = TESTS.filter((t) => t.pressure_atm != null && t.pressure_atm <= 10.2 / PSI_PER_ATM && (o2Of(t) ?? 0) >= 30);
  const out: Gap[] = [
    {
      severity: "critical",
      title: "No solid-material test at 30% oxygen or more",
      detail: `${enriched.length} tests reach 30% oxygen or more, and all are gas flames or liquid droplets. ${enrichedSolid} are solids. The highest oxygen level recorded for a solid sample is ${solidMax}% (${solidO2.length} solid records carry an oxygen value). Material selection for an enriched cabin rests on extrapolation.`,
    },
    {
      severity: "critical",
      title: "No partial-gravity data",
      detail:
        "Every record is microgravity or a ground reference. Lunar (0.17 g) and Martian (0.38 g) behavior can only be bounded between the two. ACME E-FIELD Flames used an electric field to mimic buoyancy, which is the closest proxy in the repository.",
    },
    {
      severity: "major",
      title: "Enriched oxygen at reduced pressure is thinly covered",
      detail: `${lowP.length} records combine 30% oxygen or more with 10.2 psi or less, the corner where a Moon base is expected to operate. They come from ${[...new Set(lowP.map((t) => t.acronym))].join(", ") || "no investigation"}, all with gaseous fuel.`,
    },
    {
      severity: "major",
      title: "Air flow is missing from most records",
      detail: `Only ${TESTS.filter((t) => t.flow_cm_s != null).length} of ${TESTS.length} records give a flow speed in cm/s. BASS and BASS-II log a fan setting rather than a calibrated speed, so ventilation effects on solids need the raw data to quantify.`,
    },
    {
      severity: "note",
      title: "Smoke data has no oxygen dimension",
      detail:
        "SAME and SAME-R characterize smoke from five overheated materials by flow and aging time. None of those records vary oxygen, so detector tuning for an enriched cabin is untested.",
    },
  ];
  if (target) {
    const near = nearestTests(target, 1)[0];
    const nearSolid = nearestTests({ ...target, phase: "solid" }, 1)[0];
    if (near && near.distance > 1) {
      out.unshift({
        severity: "critical",
        title: "The design point itself is outside the tested envelope",
        detail: `The closest record of any kind is ${near.item.acronym} ${near.item.test_id} at ${near.item.o2_min}-${near.item.o2_max}% oxygen${near.item.pressure_atm != null ? ` and ${(near.item.pressure_atm * PSI_PER_ATM).toFixed(1)} psi` : ""}.`,
      });
    }
    if (nearSolid && target.o2_pct - (nearSolid.item.o2_max ?? 0) > 3) {
      out.unshift({
        severity: "critical",
        title: `Solids were tested ${(target.o2_pct - (nearSolid.item.o2_max ?? 0)).toFixed(1)} oxygen points below this design`,
        detail: `Closest solid record: ${nearSolid.item.acronym} ${nearSolid.item.test_id}, ${nearSolid.item.material ?? nearSolid.item.fuel} at ${nearSolid.item.o2_max}% oxygen. Flammability depends strongly on oxygen, so this cannot be read across.`,
      });
    }
  }
  return out;
}

// ---------- materials ----------

export interface MaterialEvidence {
  material: string;
  records: number;
  investigations: string[];
  o2_range: [number, number] | null;
  flow_range: [number, number] | null;
  kinds: string[];
  outcomes: Record<string, number>;
  enriched_records: number;
}

export function materials(): MaterialEvidence[] {
  const groups = new Map<string, TestRecord[]>();
  for (const t of TESTS) {
    if (!t.material) continue;
    groups.set(t.material, [...(groups.get(t.material) ?? []), t]);
  }
  return [...groups.entries()]
    .map(([material, ts]) => {
      const o2 = ts.flatMap((t) => (t.o2_min != null && t.o2_max != null ? [t.o2_min, t.o2_max] : []));
      const fl = ts.flatMap((t) => (t.flow_cm_s != null ? [t.flow_cm_s] : []));
      const outcomes: Record<string, number> = {};
      for (const t of ts) if (t.outcome) outcomes[t.outcome] = (outcomes[t.outcome] ?? 0) + 1;
      return {
        material,
        records: ts.length,
        investigations: [...new Set(ts.map((t) => t.acronym))],
        o2_range: o2.length ? ([Math.min(...o2), Math.max(...o2)] as [number, number]) : null,
        flow_range: fl.length ? ([Math.min(...fl), Math.max(...fl)] as [number, number]) : null,
        kinds: [...new Set(ts.map((t) => (phaseGroup(t.fuel_phase) === "smoke" ? "smoke / detection" : "flammability")))],
        outcomes,
        enriched_records: ts.filter((t) => (t.o2_max ?? 0) >= 30).length,
      };
    })
    .filter((m) => m.records >= 2)
    .sort((a, b) => b.records - a.records);
}

export function materialEvidence(name: string): MaterialEvidence | undefined {
  const key = name.toLowerCase();
  const alias: Record<string, string> = { acrylic: "pmma", plexiglass: "pmma", cotton: "sibal", fabric: "sibal", foam: "pyrell", polyurethane: "pyrell", ptfe: "teflon", polyimide: "kapton", aramid: "nomex" };
  const k = Object.entries(alias).find(([a]) => key.includes(a))?.[1] ?? key;
  return materials().find((m) => m.material.toLowerCase().includes(k));
}

// ---------- headline numbers ----------

export function stats() {
  const withO2 = TESTS.filter((t) => o2Of(t) != null);
  const enriched = TESTS.filter((t) => t.granularity === "test" && (o2Of(t) ?? 0) >= 30);
  return {
    investigations: COMBUSTION.length,
    investigations_with_tables: COMBUSTION.filter((i) => i.n_records > 0).length,
    records: TESTS.length,
    individual_tests: TESTS.filter((t) => t.granularity === "test").length,
    flames_in_session_tables: TESTS.reduce((s, t) => s + (t.n_flames ?? 0), 0),
    records_with_oxygen: withO2.length,
    tests_at_30pct_o2_or_more: enriched.length,
    solid_tests_at_30pct_o2_or_more: enriched.filter((t) => phaseGroup(t.fuel_phase) === "solid").length,
    max_o2_pct: Math.max(...withO2.map((t) => t.o2_max ?? 0)),
    files: COMBUSTION.reduce((s, i) => s + i.files, 0),
    terabytes: Math.round(COMBUSTION.reduce((s, i) => s + i.bytes, 0) / 1e11) / 10,
    videos: COMBUSTION.reduce((s, i) => s + i.videos, 0),
    publications: COMBUSTION.reduce((s, i) => s + i.publications.length, 0),
    materials: materials().length,
  };
}

// ---------- text search over investigations ----------

export function searchInvestigations(query: string, pillar?: string, phase?: string): Investigation[] {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  return COMBUSTION.map((i) => {
    const hay = `${i.accession} ${i.acronym} ${i.title} ${i.focus} ${i.sub_area} ${i.objective} ${i.fuels.join(" ")} ${i.materials.join(" ")} ${i.hardware} ${i.pillars.join(" ")}`.toLowerCase();
    const title = `${i.acronym} ${i.title} ${i.focus}`.toLowerCase();
    const score = words.reduce((s, w) => s + (title.includes(w) ? 3 : hay.includes(w) ? 1 : 0), 0);
    return { i, score };
  })
    .filter(({ i, score }) => (words.length === 0 || score > 0) && (!pillar || i.pillars.includes(pillar.toLowerCase())) && (!phase || phaseGroup(i.fuel_phase) === phaseGroup(phase)))
    .sort((a, b) => b.score - a.score)
    .map(({ i }) => i);
}

export function describeTest(t: TestRecord): string {
  const o2 = t.o2_min == null ? "oxygen not given" : t.o2_min === t.o2_max ? `${t.o2_min}% O2` : `${t.o2_min}-${t.o2_max}% O2`;
  const p = t.pressure_atm == null ? "pressure not given" : `${(t.pressure_atm * PSI_PER_ATM).toFixed(1)} psi`;
  const bits = [t.material ?? t.fuel, o2 + (t.o2_where !== "ambient" ? ` (${t.o2_where})` : ""), p];
  if (t.flow_cm_s != null) bits.push(`${t.flow_cm_s} cm/s flow`);
  if (t.outcome) bits.push(t.outcome);
  if (t.burn_time_s != null) bits.push(`${t.burn_time_s} s burn`);
  return `${t.acronym} ${t.test_id}: ${bits.filter(Boolean).join(", ")}`;
}
