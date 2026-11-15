// Tool definitions for the research MCP server (/api/mcp).
// Code generated with SI assistance (Claude Code).

import { agentRoster, resolveDesign, runSwarm } from "./agents";
import { AGGREGATES, CATEGORY_FIELDS, CHART_TYPES, NUMBER_FIELDS, describeResult, runSpec, type ChartSpec } from "./analytics";
import { specFromQuestion } from "./analyticsModel";
import * as FM from "./fireModels";
import { MODEL_NOTE, PLANS, ZONES, compareResponses, detectionLimit, runScenario, summarize, LEVELS, type ScenarioInput, type ZoneId } from "./scenario";
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
    name: "run_fire_scenario",
    description:
      "Simulate a fire in a sealed crew module and report what happens to the crew over ten minutes: fire size, oxygen, carbon monoxide, temperature, pressure, events and outcome. Also ranks the standard crew responses and gives the latest detection time that keeps the crew within every limit. This is a simplified engineering model with stated assumptions, separate from the PSI test records; it compares decisions and certifies nothing.",
    inputSchema: {
      type: "object",
      properties: {
        ...designProps,
        zone: { type: "string", enum: Object.keys(ZONES), description: "Where the fire starts." },
        detection_s: { type: "number", description: "Seconds until the fire is detected (10-300). Default 60." },
        gravity_g: { type: "number", description: "0 for microgravity, 0.17 Moon, 0.38 Mars, 1 Earth. Defaults by environment." },
        ventilation_off: { type: "boolean" },
        extinguisher: { type: "boolean" },
        masks: { type: "boolean" },
        leave_module: { type: "boolean" },
        nitrogen_flood: { type: "boolean" },
        relief_valve: { type: "boolean", description: "Default true." },
      },
    },
    handler: (a) => {
      const { env, o2, psi } = resolveDesign({ environment: str(a.environment), o2_pct: numArg(a.o2_pct), pressure_psi: numArg(a.pressure_psi) });
      const zone = (Object.keys(ZONES).includes(str(a.zone) ?? "") ? str(a.zone) : "cabin") as ZoneId;
      const input: ScenarioInput = {
        p0_kpa: psi * 6.895,
        x0: o2 / 100,
        g: numArg(a.gravity_g) ?? (env && ["base", "rover"].includes(env.id) ? 0.17 : 0),
        zone,
        det: Math.min(300, Math.max(10, numArg(a.detection_s) ?? 60)),
        relief: a.relief_valve !== false,
        fan: a.ventilation_off === true,
        ext: a.extinguisher === true,
        mask: a.masks === true,
        leave: a.leave_module === true,
        inert: a.nitrogen_flood === true,
      };
      const r = runScenario(input);
      return {
        ...summarize(input, r),
        latest_safe_detection_s: detectionLimit(input),
        responses_ranked: compareResponses(input).map(({ plan, result }) => ({ response: plan.name, outcome: LEVELS[result.level], peak_fire_kw: +result.peak.toFixed(0), co_breathed_ppm: Math.round(result.crew.maxCO) })),
        standard_responses: PLANS.map((p) => p.name),
        model: MODEL_NOTE,
      };
    },
  },
  {
    name: "fire_models",
    description:
      "Evaluate the lab's published fire models at a design atmosphere: thin-fuel flammability limit and flame spread rate for an airflow, Earth-test versus orbit margin, test burn probability, NASA CEA flame temperature, and droplet burning with cool flames. Models with stated assumptions, separate from the PSI test records.",
    inputSchema: {
      type: "object",
      properties: {
        ...designProps,
        airflow_cm_s: { type: "number", description: "Airflow at the flame, default 10." },
        fuel_half_thickness_mm: { type: "number", description: "Default 0.1." },
        material_limit_earth_pct: { type: "number", description: "Oxygen limit of the material in the Earth test (MOC), default 30." },
        orbit_shift_pts: { type: "number", description: "How many oxygen points lower the limit is in orbit, 0-4, default 4." },
        scatter_pts: { type: "number", description: "Scatter between samples in oxygen points, default 1." },
        droplet_mm: { type: "number", description: "Initial heptane droplet diameter, default 3." },
      },
    },
    handler: (a) => {
      const { o2, psi } = resolveDesign({ environment: str(a.environment), o2_pct: numArg(a.o2_pct), pressure_psi: numArg(a.pressure_psi) });
      const x = o2 / 100, kpa = psi * 6.895;
      const u = numArg(a.airflow_cm_s) ?? 10, tau = numArg(a.fuel_half_thickness_mm) ?? 0.1;
      const moc = numArg(a.material_limit_earth_pct) ?? 30, shift = numArg(a.orbit_shift_pts) ?? 4, sc = numArg(a.scatter_pts) ?? 1;
      const d = FM.droplet(numArg(a.droplet_mm) ?? 3, x);
      const r = (v: number, n = 2) => +v.toFixed(n);
      return {
        design: { o2_pct: o2, pressure_psi: psi },
        flammability_map: { airflow_cm_s: u, oxygen_limit_pct: r(100 * FM.xlim(u)), burns: x > FM.xlim(u), spread_rate_mm_s: r(FM.spread(x, u, tau)), buoyant_flow_cm_s: { moon: r(FM.ubuoy(0.17), 1), mars: r(FM.ubuoy(0.38), 1), earth: r(FM.ubuoy(1), 1) }, source: FM.SOURCES.map },
        earth_test_vs_orbit: { ...FM.margin(moc, o2, shift), source: FM.SOURCES.margin },
        test_probability: { chance_one_sample_burns: r(FM.pburn(o2, moc, sc), 3), oxygen_for_50pct: r(FM.uloi(moc, sc)), oxygen_for_5pct: r(FM.x05(moc, sc)), source: FM.SOURCES.test },
        flame_temperature: { methane_K: Math.round(FM.ceaT("CH4", x, kpa)), ethylene_K: Math.round(FM.ceaT("C2H4", x, kpa)), methane_in_sea_level_air_K: Math.round(FM.ceaT("CH4", 0.21, 101.3)), clamped: x < 0.15 || x > 0.4 || kpa < 30 || kpa > 101.3, source: FM.SOURCES.flame },
        droplet: { burning_constant_mm2_s: r(d.K, 3), total_life_s: r(d.T, 1), cool_flame: d.ph.some((p) => p.k === "cool"), phases: d.ph.map((p) => ({ phase: p.k, from_s: r(p.t0, 1), to_s: r(p.t1, 1) })), source: FM.SOURCES.droplet },
      };
    },
  },
  {
    name: "build_chart",
    description:
      "Compute a chart or table from the harmonized records with an explicit specification. Returns the aggregated numbers, so a client can render or reason over them. bar/table: x is a category or a number field (binned); aggregate is count, mean/median/min/max (need y), or share_extinguished. scatter: x and y are number fields. group_by splits into series.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        chart: { type: "string", enum: [...CHART_TYPES] },
        x: { type: "string", enum: [...CATEGORY_FIELDS, ...NUMBER_FIELDS] },
        y: { type: "string", enum: [...NUMBER_FIELDS] },
        aggregate: { type: "string", enum: [...AGGREGATES] },
        group_by: { type: "string", enum: [...CATEGORY_FIELDS] },
        filters: {
          type: "object",
          properties: { investigation: { type: "string" }, phase: { type: "string" }, material: { type: "string" }, fuel: { type: "string" }, diluent: { type: "string" }, outcome: { type: "string" }, o2_min: { type: "number" }, o2_max: { type: "number" } },
        },
      },
      required: ["chart", "x"],
    },
    handler: (a) => describeResult(runSpec({ ...(a as unknown as ChartSpec), title: str(a.title) ?? "Chart" })),
  },
  {
    name: "ask_chart",
    description:
      "Describe a chart or table in plain language; the lab's language model turns it into a specification and code computes the numbers from the harmonized records. Returns the specification used and the aggregated numbers.",
    inputSchema: { type: "object", properties: { request: { type: "string" } }, required: ["request"] },
    handler: async (a) => {
      const { spec, by, reason } = await specFromQuestion(str(a.request) ?? "records by oxygen level and fuel type");
      return { specification_by: by, reason: reason ?? null, specification: spec, ...describeResult(runSpec(spec)) };
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
