// Analytics engine: turns a small chart specification into numbers computed from
// the harmonized NASA PSI records. The specification can come from a person, from
// an MCP client, or from the language model translating a plain-language request.
// The model only chooses the specification; every figure is computed here.
// Code generated with SI assistance (Claude Code).

import { TESTS, getInvestigation, phaseGroup } from "./lab";
import type { TestRecord } from "./types";
import { PSI_PER_ATM } from "./types";

export const CATEGORY_FIELDS = ["investigation", "phase", "material", "fuel", "diluent", "outcome", "ignited", "row_type"] as const;
export const NUMBER_FIELDS = ["o2_pct", "pressure_psi", "flow_cm_s", "burn_time_s"] as const;
export type CategoryField = (typeof CATEGORY_FIELDS)[number];
export type NumberField = (typeof NUMBER_FIELDS)[number];
export type Field = CategoryField | NumberField;
export const AGGREGATES = ["count", "mean", "median", "min", "max", "share_extinguished"] as const;
export type Aggregate = (typeof AGGREGATES)[number];
export const CHART_TYPES = ["bar", "scatter", "table"] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export const FIELD_LABEL: Record<Field, string> = {
  investigation: "Investigation",
  phase: "Fuel type",
  material: "Material",
  fuel: "Fuel",
  diluent: "Diluent gas",
  outcome: "Outcome",
  ignited: "Ignited",
  row_type: "Row type",
  o2_pct: "Oxygen, %",
  pressure_psi: "Pressure, psi",
  flow_cm_s: "Air flow, cm/s",
  burn_time_s: "Burn time, s",
};

export interface ChartSpec {
  title: string;
  chart: ChartType;
  /** bar/table: the category (or a number field, which is binned). scatter: a number field. */
  x: Field;
  /** scatter: a number field. bar/table with mean/median/min/max: the number field to aggregate. */
  y?: NumberField | null;
  aggregate?: Aggregate | null;
  /** Second category that splits bars into series or colors scatter points. */
  group_by?: CategoryField | null;
  filters?: {
    investigation?: string | null;
    phase?: string | null;
    material?: string | null;
    fuel?: string | null;
    diluent?: string | null;
    outcome?: string | null;
    o2_min?: number | null;
    o2_max?: number | null;
  } | null;
  /** One sentence on what to look for. Written by whoever made the spec. */
  note?: string | null;
}

export interface ChartResult {
  spec: ChartSpec;
  kind: ChartType;
  x_label: string;
  y_label: string;
  categories: string[]; // bar/table: x values in display order
  series: { name: string; values: (number | null)[]; counts: number[] }[]; // bar/table
  points: { x: number; y: number; group: string; label: string }[]; // scatter
  groups: string[]; // legend order (entity order, stable)
  matched: number; // records after filters
  used: number; // records that had the fields needed
  warnings: string[];
}

const OUT = ["Extinction", "Self-extinguished", "Did not sustain burning"];

function value(t: TestRecord, f: Field): string | number | null {
  switch (f) {
    case "investigation":
      return t.acronym || t.accession;
    case "phase":
      return { solid: "Solid material", liquid: "Liquid droplet", gas: "Gas flame", smoke: "Smoke / aerosol" }[phaseGroup(t.fuel_phase)];
    case "material":
      return t.material;
    case "fuel":
      return t.fuel;
    case "diluent":
      return t.diluent;
    case "outcome":
      return t.outcome ?? (t.ignited === false ? "Did not ignite" : null);
    case "ignited":
      return t.ignited == null ? null : t.ignited ? "Ignited" : "Did not ignite";
    case "row_type":
      return t.granularity;
    case "o2_pct":
      return t.o2_pct ?? (t.o2_min != null && t.o2_max != null ? (t.o2_min + t.o2_max) / 2 : null);
    case "pressure_psi":
      return t.pressure_atm == null ? null : +(t.pressure_atm * PSI_PER_ATM).toFixed(2);
    case "flow_cm_s":
      return t.flow_cm_s;
    case "burn_time_s":
      return t.burn_time_s;
  }
}

const isNumberField = (f: string): f is NumberField => (NUMBER_FIELDS as readonly string[]).includes(f);
const has = (v: string | null | undefined, needle?: string | null) => !needle || (v ?? "").toLowerCase().includes(needle.toLowerCase());

function applyFilters(spec: ChartSpec): TestRecord[] {
  const f = spec.filters ?? {};
  const acc = f.investigation ? getInvestigation(f.investigation)?.accession : undefined;
  return TESTS.filter((t) => {
    if (f.investigation && t.accession !== acc) return false;
    if (f.phase && phaseGroup(t.fuel_phase) !== phaseGroup(f.phase)) return false;
    if (!has(t.material, f.material) && !has(t.fuel, f.material)) return false;
    if (!has(t.fuel, f.fuel)) return false;
    if (f.diluent && !(t.diluent ?? "").toUpperCase().includes(f.diluent.toUpperCase())) return false;
    if (!has(t.outcome, f.outcome)) return false;
    if (f.o2_min != null && (t.o2_max == null || t.o2_max < f.o2_min)) return false;
    if (f.o2_max != null && (t.o2_min == null || t.o2_min > f.o2_max)) return false;
    return true;
  });
}

function aggregate(rows: TestRecord[], agg: Aggregate, y?: NumberField | null): number | null {
  if (agg === "count") return rows.length;
  if (agg === "share_extinguished") {
    const known = rows.filter((t) => t.outcome || t.ignited === false);
    if (!known.length) return null;
    return Math.round((1000 * known.filter((t) => t.ignited === false || OUT.includes(t.outcome ?? "")).length) / known.length) / 10;
  }
  const vals = rows.map((t) => (y ? value(t, y) : null)).filter((v): v is number => typeof v === "number").sort((a, b) => a - b);
  if (!vals.length) return null;
  const r = (v: number) => Math.round(v * 100) / 100;
  if (agg === "mean") return r(vals.reduce((s, v) => s + v, 0) / vals.length);
  if (agg === "median") return r(vals[Math.floor(vals.length / 2)]);
  if (agg === "min") return r(vals[0]);
  return r(vals[vals.length - 1]);
}

function binLabel(field: NumberField, v: number): [number, string] {
  const steps: Record<NumberField, number[]> = {
    o2_pct: [0, 15, 18, 21, 23, 30, 40, 60, 101],
    pressure_psi: [0, 8.8, 11.8, 16.2, 29.4, 200],
    flow_cm_s: [0, 0.001, 5, 10, 20, 40, 200],
    burn_time_s: [0, 5, 10, 20, 40, 80, 100000],
  };
  const edges = steps[field];
  for (let i = 0; i < edges.length - 1; i++) {
    if (v >= edges[i] && v < edges[i + 1]) {
      const lo = edges[i];
      const hi = edges[i + 1];
      const last = i === edges.length - 2;
      const name = field === "flow_cm_s" && hi === 0.001 ? "still air" : last ? `${lo}+` : `${lo}-${hi}`;
      return [i, name];
    }
  }
  return [edges.length, "other"];
}

export function runSpec(input: ChartSpec): ChartResult {
  const warnings: string[] = [];
  const spec: ChartSpec = { ...input, filters: input.filters ?? {} };
  if (!(CHART_TYPES as readonly string[]).includes(spec.chart)) spec.chart = "bar";
  const all = [...CATEGORY_FIELDS, ...NUMBER_FIELDS] as readonly string[];
  if (!all.includes(spec.x)) {
    warnings.push(`Unknown field "${spec.x}", using investigation.`);
    spec.x = "investigation";
  }
  if (spec.y && !isNumberField(spec.y)) {
    warnings.push(`"${spec.y}" is not a number field and was ignored.`);
    spec.y = null;
  }
  if (spec.group_by && !(CATEGORY_FIELDS as readonly string[]).includes(spec.group_by)) spec.group_by = null;
  if (spec.group_by === spec.x) spec.group_by = null;

  const rows = applyFilters(spec);
  const base: ChartResult = { spec, kind: spec.chart, x_label: FIELD_LABEL[spec.x], y_label: "", categories: [], series: [], points: [], groups: [], matched: rows.length, used: 0, warnings };

  if (spec.chart === "scatter") {
    if (!isNumberField(spec.x) || !spec.y) {
      warnings.push("A scatter needs two number fields; showing a bar chart instead.");
      spec.chart = "bar";
      base.kind = "bar";
    } else {
      const counts = new Map<string, number>();
      for (const t of rows) {
        const x = value(t, spec.x);
        const y = value(t, spec.y);
        if (typeof x !== "number" || typeof y !== "number") continue;
        const g = spec.group_by ? String(value(t, spec.group_by) ?? "not recorded") : "All records";
        counts.set(g, (counts.get(g) ?? 0) + 1);
        base.points.push({ x, y, group: g, label: `${t.acronym} ${t.test_id}` });
      }
      base.used = base.points.length;
      base.y_label = FIELD_LABEL[spec.y];
      const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
      base.groups = ordered.slice(0, 7);
      if (ordered.length > 7) {
        base.groups.push("Other");
        base.points.forEach((p) => {
          if (!base.groups.includes(p.group)) p.group = "Other";
        });
      }
      if (base.points.length > 1500) {
        warnings.push(`Showing the first 1,500 of ${base.points.length} points.`);
        base.points = base.points.slice(0, 1500);
      }
      if (!base.used) warnings.push("No record has both values. Try another pair of fields.");
      return base;
    }
  }

  // bar / table
  let agg: Aggregate = spec.aggregate && (AGGREGATES as readonly string[]).includes(spec.aggregate) ? spec.aggregate : spec.y ? "mean" : "count";
  if (agg !== "count" && agg !== "share_extinguished" && !spec.y) {
    warnings.push(`"${agg}" needs a number field; counting records instead.`);
    agg = "count";
  }
  spec.aggregate = agg;
  base.y_label = agg === "count" ? "Records" : agg === "share_extinguished" ? "Went out or did not ignite, % of records with an outcome" : `${agg[0].toUpperCase()}${agg.slice(1)} ${FIELD_LABEL[spec.y as NumberField].toLowerCase()}`;

  const buckets = new Map<string, { order: number; byGroup: Map<string, TestRecord[]> }>();
  const groupTotals = new Map<string, number>();
  for (const t of rows) {
    const raw = value(t, spec.x);
    if (raw == null || raw === "") continue;
    let key: string;
    let order = 0;
    if (typeof raw === "number") [order, key] = binLabel(spec.x as NumberField, raw);
    else key = String(raw);
    const g = spec.group_by ? String(value(t, spec.group_by) ?? "not recorded") : base.y_label;
    const b = buckets.get(key) ?? { order, byGroup: new Map() };
    b.byGroup.set(g, [...(b.byGroup.get(g) ?? []), t]);
    buckets.set(key, b);
    groupTotals.set(g, (groupTotals.get(g) ?? 0) + 1);
    base.used += 1;
  }
  const numericX = isNumberField(spec.x);
  let cats = [...buckets.entries()];
  const size = (b: { byGroup: Map<string, TestRecord[]> }) => [...b.byGroup.values()].reduce((s, r) => s + r.length, 0);
  cats.sort((a, b) => (numericX ? a[1].order - b[1].order : size(b[1]) - size(a[1])));
  if (!numericX && cats.length > 14) {
    warnings.push(`Showing the 14 largest of ${cats.length} categories.`);
    cats = cats.slice(0, 14);
  }
  let groups = [...groupTotals.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
  if (groups.length > 6) {
    warnings.push(`Showing the 6 largest of ${groups.length} series.`);
    groups = groups.slice(0, 6);
  }
  base.categories = cats.map(([k]) => k);
  base.groups = groups;
  base.series = groups.map((g) => ({
    name: g,
    values: cats.map(([, b]) => (b.byGroup.has(g) ? aggregate(b.byGroup.get(g)!, agg, spec.y) : null)),
    counts: cats.map(([, b]) => b.byGroup.get(g)?.length ?? 0),
  }));
  if (!base.used) warnings.push("No record matches. Loosen the filters or pick another field.");
  return base;
}

/** Compact, model-readable summary of a result (used by the MCP tool). */
export function describeResult(r: ChartResult) {
  return {
    title: r.spec.title,
    chart: r.kind,
    x: r.x_label,
    y: r.y_label,
    records_matched: r.matched,
    records_used: r.used,
    table:
      r.kind === "scatter"
        ? { points: r.points.length, groups: r.groups, sample: r.points.slice(0, 25) }
        : r.categories.map((c, i) => ({ [r.x_label]: c, ...Object.fromEntries(r.series.map((s) => [s.name, s.values[i]])), records: r.series.reduce((n, s) => n + s.counts[i], 0) })),
    warnings: r.warnings,
    note: r.spec.note ?? null,
  };
}

export const PRESETS: ChartSpec[] = [
  { title: "Does diluting the air put the flame out? FLEX droplets by diluent gas", chart: "bar", x: "diluent", aggregate: "share_extinguished", filters: { investigation: "FLEX" }, note: "Share of droplet tests that ended in extinction, for each gas added to the atmosphere." },
  { title: "Where the evidence is: records by oxygen level and fuel type", chart: "bar", x: "o2_pct", aggregate: "count", group_by: "phase", note: "Solid materials stop at 23% oxygen. Everything above is gas or liquid." },
  { title: "Burn time against oxygen, liquid droplets", chart: "scatter", x: "o2_pct", y: "burn_time_s", group_by: "outcome", filters: { phase: "liquid" }, note: "Each point is one droplet test." },
  { title: "Records per investigation", chart: "bar", x: "investigation", aggregate: "count", note: "How much each investigation contributes to the harmonized dataset." },
  { title: "Materials: how many records and what oxygen they saw", chart: "table", x: "material", y: "o2_pct", aggregate: "max", note: "Highest oxygen level at which each material appears in a test table." },
  { title: "Gas flames: did they ignite, by oxygen level", chart: "bar", x: "o2_pct", aggregate: "count", group_by: "ignited", filters: { investigation: "ACME CFI-G" }, note: "ACME CFI-G records with an ignition result." },
];

/** Used when no language model is configured: pick the closest preset by keywords. */
export function heuristicSpec(question: string): ChartSpec {
  const q = question.toLowerCase();
  const pick = (i: number) => ({ ...PRESETS[i] });
  if (/diluent|dilu|co2|helium|helio|nitrogen|suppress|extin|apag/.test(q)) return pick(0);
  if (/burn time|duraci|tiempo|scatter|versus|vs\b|against/.test(q)) return pick(2);
  if (/material/.test(q)) return pick(4);
  if (/ignit|encend/.test(q)) return pick(5);
  if (/investigat|investigaci|per investigation|por investigaci/.test(q)) return pick(3);
  return pick(1);
}
