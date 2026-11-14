// Tool definitions for the research MCP server (/api/mcp).
// Code generated with SI assistance (Claude Code).

import { agentRoster, resolveDesign, runSwarm } from "./agents";
import { ENVIRONMENTS } from "./environments";
import {
  COMBUSTION,
  INVESTIGATIONS,
  coverage,
  describeTest,
  gaps,
  getInvestigation,
  label,
  materialEvidence,
  materials,
  nearestTests,
  queryTests,
  rankInvestigations,
  searchInvestigations,
  stats,
} from "./lab";
import { numArg, str, type McpTool } from "./mcp";
import { fileCounts, fileLink, listFiles, prettyBytes } from "./psi";
import type { Investigation, TestRecord } from "./types";
import { PSI_PER_ATM } from "./types";

const SOURCE = "NASA Physical Sciences Informatics (PSI), https://psi.nasa.gov/physci/repo/search?q=combustion";

function brief(i: Investigation) {
  return {
    accession: i.accession,
    name: label(i),
    title: i.title,
    pillars: i.pillars,
    fuel_phase: i.fuel_phase,
    facility: i.facility,
    focus: i.focus,
    records: i.n_records,
    o2_range_pct: i.o2_range,
    pressure_range_atm: i.pressure_range,
    flow_range_cm_s: i.flow_range,
    videos: i.videos,
    data_size: prettyBytes(i.bytes),
    url: i.url,
  };
}

function slim(t: TestRecord, withRaw = false) {
  const { raw, ...rest } = t;
  return withRaw ? { ...rest, raw } : rest;
}

const designProps = {
  environment: { type: "string", description: `One of: ${ENVIRONMENTS.map((e) => e.id).join(", ")}. Sets the design atmosphere to that environment's preset.` },
  o2_pct: { type: "number", description: "Oxygen concentration in percent by volume. Overrides the environment preset." },
  pressure_psi: { type: "number", description: "Cabin pressure in psi. Overrides the environment preset." },
  flow_cm_s: { type: "number", description: "Ventilation air speed in cm/s, if it matters for the question." },
};

export const RESEARCH_TOOLS: McpTool[] = [
  {
    name: "lab_overview",
    description:
      "Start here. Headline numbers for the harmonized NASA PSI microgravity combustion dataset, the list of crewed environments with their design atmospheres, the agent roster, and the main evidence gaps.",
    inputSchema: { type: "object", properties: {} },
    handler: () => ({
      source: SOURCE,
      stats: stats(),
      environments: ENVIRONMENTS.map((e) => ({ id: e.id, name: e.name, o2_pct: e.o2_pct, pressure_psi: e.pressure_psi, gravity: e.gravity, basis: e.basisNote })),
      agents: agentRoster(),
      evidence_gaps: gaps().map((g) => `${g.severity.toUpperCase()}: ${g.title}`),
      not_combustion: INVESTIGATIONS.filter((i) => !i.is_combustion).map((i) => `${i.accession} ${label(i)}: ${i.excluded_reason}`),
    }),
  },
  {
    name: "search_investigations",
    description:
      "Find combustion investigations by free text (acronym, fuel, material, hardware, topic). Optional filters: pillar (prevention, detection, suppression, fundamentals, modeling) and fuel phase (solid, liquid, gas, smoke).",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" }, pillar: { type: "string" }, phase: { type: "string" } },
    },
    handler: (a) => {
      const found = searchInvestigations(str(a.query) ?? "", str(a.pillar), str(a.phase));
      return { count: found.length, investigations: found.map(brief) };
    },
  },
  {
    name: "get_investigation",
    description:
      "Full record for one investigation by accession (PSI-25) or acronym (BASS-II): objective, approach, hypothesis, Earth benefits, hardware, people, publications with DOI, tested ranges, fuels and materials, file counts.",
    inputSchema: { type: "object", properties: { id: { type: "string", description: "Accession or acronym." } }, required: ["id"] },
    handler: (a) => {
      const i = getInvestigation(str(a.id) ?? "");
      if (!i) return { error: `No investigation matches "${a.id}".`, known: COMBUSTION.map((c) => `${c.accession} ${label(c)}`) };
      return { ...i, data_size: prettyBytes(i.bytes), indexed_files: fileCounts(i.accession) };
    },
  },
  {
    name: "query_tests",
    description:
      "Filter the harmonized test records. Each record is one burn (granularity test), one test day (session) or a planned range (matrix). Units are common across investigations: oxygen in percent, pressure in atm, flow in cm/s. Fields that the source table does not give are null; assumed values are listed in `assumed`.",
    inputSchema: {
      type: "object",
      properties: {
        investigation: { type: "string", description: "Accession or acronym." },
        phase: { type: "string", description: "solid, liquid, gas or smoke." },
        material: { type: "string", description: "Material or fuel name contains this text." },
        o2_min: { type: "number" },
        o2_max: { type: "number" },
        pressure_min_psi: { type: "number" },
        pressure_max_psi: { type: "number" },
        outcome: { type: "string", description: "e.g. Extinction, Self-extinguished." },
        text: { type: "string", description: "Free text across id, fuel, geometry, notes." },
        limit: { type: "number", description: "Default 25, max 200." },
        include_raw: { type: "boolean", description: "Include the original source row." },
      },
    },
    handler: (a) => {
      const pMin = numArg(a.pressure_min_psi);
      const pMax = numArg(a.pressure_max_psi);
      const rows = queryTests({
        accession: str(a.investigation),
        phase: str(a.phase),
        material: str(a.material),
        o2_min: numArg(a.o2_min),
        o2_max: numArg(a.o2_max),
        pressure_min_atm: pMin != null ? pMin / PSI_PER_ATM : undefined,
        pressure_max_atm: pMax != null ? pMax / PSI_PER_ATM : undefined,
        outcome: str(a.outcome),
        text: str(a.text),
      });
      const limit = Math.min(200, numArg(a.limit) ?? 25);
      return { matched: rows.length, returned: Math.min(limit, rows.length), records: rows.slice(0, limit).map((t) => slim(t, a.include_raw === true)) };
    },
  },
  {
    name: "evidence_for_design",
    description:
      "The core question of the lab: for a crewed environment or a specific atmosphere, return the closest real test records, the investigations ranked by relevance with the reasons, and the evidence gaps. Distance is in steps, where one step is 10 oxygen points or 0.25 atm (3.7 psi).",
    inputSchema: {
      type: "object",
      properties: { ...designProps, phase: { type: "string", description: "Restrict nearest records to solid, liquid, gas or smoke." }, material: { type: "string" }, limit: { type: "number" } },
    },
    handler: (a) => {
      const { env, target, o2, psi } = resolveDesign({ environment: str(a.environment), o2_pct: numArg(a.o2_pct), pressure_psi: numArg(a.pressure_psi), flow_cm_s: numArg(a.flow_cm_s) });
      const t = { ...target, phase: str(a.phase) ?? null, material: str(a.material) ?? null };
      const limit = Math.min(40, numArg(a.limit) ?? 10);
      return {
        design: { environment: env?.name ?? "custom", o2_pct: o2, pressure_psi: psi, flow_cm_s: target.flow_cm_s, basis: env?.basisNote ?? "Custom atmosphere." },
        nearest_records: nearestTests(t, limit).map((s) => ({ steps_from_design: +s.distance.toFixed(2), measured_axes: s.known, summary: describeTest(s.item), record: slim(s.item) })),
        nearest_solid_material_record: nearestTests({ ...target, phase: "solid" }, 1).map((s) => ({ steps_from_design: +s.distance.toFixed(2), summary: describeTest(s.item) }))[0] ?? null,
        ranked_investigations: rankInvestigations(t).slice(0, 10).map((r) => ({ accession: r.investigation.accession, name: label(r.investigation), score: r.score, score_parts: r.parts, why: r.rationale })),
        evidence_gaps: gaps(t),
        caution: "Records describe what was tested. They do not certify a material or a design as safe.",
      };
    },
  },
  {
    name: "rank_investigations",
    description:
      "Rank all combustion investigations for a design atmosphere. Score out of 100 = directness to fire safety (30) + proximity of tested conditions (30) + relevance of the fuel or material (20) + evidence volume (10) + data availability (10). Each entry lists the reasons.",
    inputSchema: { type: "object", properties: { ...designProps, pillar: { type: "string", description: "prevention, detection or suppression." } } },
    handler: (a) => {
      const { target, o2, psi } = resolveDesign({ environment: str(a.environment), o2_pct: numArg(a.o2_pct), pressure_psi: numArg(a.pressure_psi), flow_cm_s: numArg(a.flow_cm_s) });
      return {
        design: { o2_pct: o2, pressure_psi: psi },
        ranking: rankInvestigations(target, str(a.pillar)).map((r, n) => ({ rank: n + 1, accession: r.investigation.accession, name: label(r.investigation), score: r.score, score_parts: r.parts, why: r.rationale })),
      };
    },
  },
  {
    name: "material_evidence",
    description:
      "What the repository holds for a material (PMMA, SIBAL, Nomex, silicone, Kapton, Teflon, Pyrell, lamp wick, wax). Returns record counts, oxygen and flow ranges tested, outcomes, and sample records. Leave `material` empty to list every material. Says so plainly when a material was never tested.",
    inputSchema: { type: "object", properties: { material: { type: "string" } } },
    handler: (a) => {
      const name = str(a.material);
      if (!name) return { materials: materials() };
      const m = materialEvidence(name);
      if (!m) return { material: name, found: false, message: `No test record for "${name}". Materials with records: ${materials().map((x) => x.material).join("; ")}.` };
      const sample = queryTests({ material: m.material.split(" ")[0] }).slice(0, 8).map(describeTest);
      return { found: true, ...m, sample_records: sample, caution: m.enriched_records === 0 ? "Never tested at 30% oxygen or more." : undefined };
    },
  },
  {
    name: "coverage_gaps",
    description:
      "Where the evidence is thin. Returns the list of gaps (optionally relative to a design atmosphere) and a coverage grid: number of records per oxygen band and pressure band, split by solid, liquid and gas fuel.",
    inputSchema: { type: "object", properties: designProps },
    handler: (a) => {
      const hasDesign = a.environment != null || a.o2_pct != null || a.pressure_psi != null;
      const { target } = resolveDesign({ environment: str(a.environment), o2_pct: numArg(a.o2_pct), pressure_psi: numArg(a.pressure_psi) });
      return { gaps: gaps(hasDesign ? target : undefined), coverage_grid: coverage().filter((c) => c.total > 0 || c.o2 === "30-40%") };
    },
  },
  {
    name: "list_files",
    description:
      "List documents and directly playable videos that PSI holds for an investigation (engineering and science documents, reports, presentations, analyzed data, mp4 video). Raw zipped image sets are not indexed here; see the investigation page for those.",
    inputSchema: {
      type: "object",
      properties: { investigation: { type: "string" }, kind: { type: "string", description: "video, document, or a folder name such as Reports." }, search: { type: "string" }, limit: { type: "number" } },
      required: ["investigation"],
    },
    handler: (a) => {
      const i = getInvestigation(str(a.investigation) ?? "");
      if (!i) return { error: `No investigation matches "${a.investigation}".` };
      const files = listFiles(i.accession, str(a.kind), str(a.search), Math.min(100, numArg(a.limit) ?? 40));
      return { investigation: label(i), counts: fileCounts(i.accession), files: files.map((f) => ({ file_name: f.n, kind: f.k, category: f.c, size: prettyBytes(f.b) })) };
    },
  },
  {
    name: "get_file_link",
    description: "Ask NASA PSI for a short-lived download link to one file. Use the exact file_name from list_files. The file stays on NASA's servers.",
    inputSchema: { type: "object", properties: { investigation: { type: "string" }, file_name: { type: "string" } }, required: ["investigation", "file_name"] },
    handler: async (a) => {
      const i = getInvestigation(str(a.investigation) ?? "");
      if (!i) return { error: `No investigation matches "${a.investigation}".` };
      const r = await fileLink(i.accession, str(a.file_name) ?? "");
      return "error" in r ? r : { url: r.url, size: prettyBytes(r.file.b), expires: "Link is temporary; request a new one if it stops working." };
    },
  },
  {
    name: "consult_swarm",
    description:
      "Ask the Swarm Mind agents (prevention, detection, suppression, lead) for a cited fire-safety brief on a design question. Each agent reads its own evidence pack from the PSI records. Takes up to a minute with the language model; set fast=true for an instant evidence-only brief.",
    inputSchema: {
      type: "object",
      properties: { question: { type: "string" }, ...designProps, material: { type: "string" }, fast: { type: "boolean" } },
      required: ["question"],
    },
    handler: (a) =>
      runSwarm({
        question: str(a.question) ?? "What does the evidence say about fire safety for this design?",
        environment: str(a.environment),
        o2_pct: numArg(a.o2_pct),
        pressure_psi: numArg(a.pressure_psi),
        flow_cm_s: numArg(a.flow_cm_s),
        material: str(a.material),
        fast: a.fast === true,
      }),
  },
];

export const RESEARCH_INFO = {
  name: "kukulcan-fire-lab",
  version: "1.0.0",
  instructions:
    "Harmonized NASA PSI microgravity combustion records for spacecraft fire safety. Call lab_overview first. Use evidence_for_design for a habitat atmosphere, material_evidence for a material, consult_swarm for a written brief. Records say what was tested; they never certify a design as safe. PSI holds no partial-gravity data.",
};
