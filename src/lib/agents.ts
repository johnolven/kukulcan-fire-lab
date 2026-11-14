// Swarm Mind: three specialist agents (prevention, detection, suppression) and a
// lead that merges their findings into one fire-safety brief.
//
// Retrieval is deterministic: every agent receives an evidence pack built from
// the harmonized NASA PSI records. The language model only writes; it is told to
// cite record ids and to say so when the data does not cover the question.
// Without an API key the same packs are rendered as a plain evidence brief.
//
// Code generated with SI assistance (Claude Code).

import Anthropic from "@anthropic-ai/sdk";
import { ENVIRONMENTS, environmentById } from "./environments";
import {
  TESTS,
  describeTest,
  gaps,
  getInvestigation,
  label,
  materialEvidence,
  materials,
  nearestTests,
  phaseGroup,
  rankInvestigations,
} from "./lab";
import type { Target } from "./types";
import { PSI_PER_ATM } from "./types";

export type Pillar = "prevention" | "detection" | "suppression";

export interface AgentSection {
  agent: Pillar;
  title: string;
  text: string;
  citations: string[];
}

export interface Brief {
  question: string;
  design: { environment: string | null; o2_pct: number; pressure_psi: number; flow_cm_s: number | null };
  mode: "language-model" | "evidence-only";
  model: string | null;
  bottom_line: string;
  sections: AgentSection[];
  gaps: { title: string; detail: string; severity: string }[];
  disclosure: string;
}

export interface SwarmInput {
  question: string;
  environment?: string;
  o2_pct?: number;
  pressure_psi?: number;
  flow_cm_s?: number;
  material?: string;
  fast?: boolean;
}

export function resolveDesign(input: { environment?: string; o2_pct?: number; pressure_psi?: number; flow_cm_s?: number }) {
  const env = input.environment ? environmentById(input.environment) : undefined;
  const base = env ?? ENVIRONMENTS.find((e) => e.id === "base")!;
  const o2 = input.o2_pct ?? base.o2_pct;
  const psi = input.pressure_psi ?? base.pressure_psi;
  const target: Target = { o2_pct: o2, pressure_atm: psi / PSI_PER_ATM, flow_cm_s: input.flow_cm_s ?? null };
  return { env: env ?? (input.o2_pct == null && input.pressure_psi == null ? base : undefined), target, o2, psi };
}

// ---------- evidence packs ----------

function preventionPack(target: Target, material?: string) {
  const ranked = rankInvestigations(target, "prevention").slice(0, 5);
  const solids = nearestTests({ ...target, phase: "solid" }, 6);
  const any = nearestTests(target, 5);
  const mat = material ? materialEvidence(material) : undefined;
  return {
    ranked_investigations: ranked.map((r) => ({ id: r.investigation.accession, name: label(r.investigation), score: r.score, focus: r.investigation.focus, why: r.rationale })),
    closest_solid_material_records: solids.map((s) => ({ cite: `${s.item.acronym} ${s.item.test_id}`, summary: describeTest(s.item), steps_from_design: +s.distance.toFixed(2) })),
    closest_records_any_fuel: any.map((s) => ({ cite: `${s.item.acronym} ${s.item.test_id}`, summary: describeTest(s.item), steps_from_design: +s.distance.toFixed(2) })),
    asked_material: material ? (mat ?? `No record for "${material}" in the repository tables.`) : null,
    materials_with_flammability_records: materials().filter((m) => m.kinds.includes("flammability")).map((m) => ({ material: m.material, records: m.records, o2_range: m.o2_range, investigations: m.investigations })),
  };
}

function detectionPack() {
  const smoke = materials().filter((m) => m.kinds.includes("smoke / detection"));
  const same = getInvestigation("PSI-101");
  const sameR = TESTS.filter((t) => t.accession === "PSI-101");
  const byMat: Record<string, { n: number; flows: number[] }> = {};
  for (const t of sameR) {
    const k = t.material ?? "unknown";
    byMat[k] ??= { n: 0, flows: [] };
    byMat[k].n += 1;
    if (t.flow_cm_s != null && !byMat[k].flows.includes(t.flow_cm_s)) byMat[k].flows.push(t.flow_cm_s);
  }
  return {
    investigations: ["PSI-102", "PSI-101", "PSI-47", "PSI-107", "PSI-115"].map((a) => getInvestigation(a)).filter(Boolean).map((i) => ({ id: i!.accession, name: label(i!), focus: i!.focus, records: i!.n_records, publications: i!.publications.length })),
    smoke_materials: smoke.map((m) => ({ material: m.material, records: m.records, flow_range_cm_s: m.flow_range, investigations: m.investigations })),
    same_r_by_material: byMat,
    same_r_objective: same?.objective?.slice(0, 500),
    limits: "No smoke record varies oxygen or pressure. All were taken at cabin conditions.",
  };
}

function suppressionPack(target: Target) {
  const flex = TESTS.filter((t) => t.accession === "PSI-69");
  const byDiluent: Record<string, { tests: number; extinction: number; o2_range: [number, number] }> = {};
  for (const t of flex) {
    const k = t.diluent ?? "N2";
    const o = t.o2_pct ?? 0;
    byDiluent[k] ??= { tests: 0, extinction: 0, o2_range: [o, o] };
    byDiluent[k].tests += 1;
    if (t.outcome === "Extinction") byDiluent[k].extinction += 1;
    byDiluent[k].o2_range = [Math.min(byDiluent[k].o2_range[0], o), Math.max(byDiluent[k].o2_range[1], o)];
  }
  const nearFlex = nearestTests(target, 5, { accession: "PSI-69" });
  const cfig = TESTS.filter((t) => t.accession === "PSI-159");
  return {
    investigations: ["PSI-69", "PSI-68", "PSI-39", "PSI-26", "PSI-25"].map((a) => getInvestigation(a)).filter(Boolean).map((i) => ({ id: i!.accession, name: label(i!), focus: i!.focus, records: i!.n_records, o2_range: i!.o2_range })),
    flex_droplet_tests_by_diluent: byDiluent,
    flex_records_closest_to_design: nearFlex.map((s) => ({ cite: `${s.item.acronym} ${s.item.test_id}`, summary: describeTest(s.item), steps_from_design: +s.distance.toFixed(2) })),
    cool_flames: {
      note: "CFI and ACME CFI-G show flames that keep reacting at low temperature after the visible flame goes out.",
      cfi_g_records: cfig.length,
      cfi_g_marked_cool_flame: cfig.filter((t) => (t.notes ?? "").includes("Cool flame")).length,
      cfi_g_self_extinguished: cfig.filter((t) => t.outcome === "Self-extinguished").length,
    },
    limits: "Suppression data is for liquid droplets (FLEX) and small solid samples in nitrogen flow (BASS). No record tests an extinguisher agent on a solid at 30% oxygen or more.",
  };
}

// ---------- evidence-only rendering ----------

function plainPrevention(p: ReturnType<typeof preventionPack>, o2: number): AgentSection {
  const top = p.ranked_investigations.slice(0, 3).map((r) => `${r.name} (${r.score}/100)`).join(", ");
  const solid = p.closest_solid_material_records[0];
  const solidMax = Math.max(...p.materials_with_flammability_records.flatMap((m) => (m.o2_range ? [m.o2_range[1]] : [])));
  const lines = [
    `Most relevant for material selection: ${top}.`,
    solid ? `Closest solid-material record to this design: ${solid.summary}.` : "No solid-material record carries an oxygen value.",
    o2 > solidMax + 3
      ? `Solids were only tested up to ${solidMax}% oxygen; this design is at ${o2}%. Treat any material ranking above ${solidMax}% as extrapolation.`
      : `This design sits inside the oxygen range tested on solids (up to ${solidMax}%).`,
  ];
  if (p.asked_material) {
    lines.push(
      typeof p.asked_material === "string"
        ? p.asked_material
        : `${p.asked_material.material}: ${p.asked_material.records} records in ${p.asked_material.investigations.join(", ")}${p.asked_material.o2_range ? `, oxygen ${p.asked_material.o2_range[0]}-${p.asked_material.o2_range[1]}%` : ", no oxygen values"}.`,
    );
  }
  return { agent: "prevention", title: "Prevention: material flammability", text: lines.join(" "), citations: p.closest_solid_material_records.slice(0, 3).map((r) => r.cite) };
}

function plainDetection(p: ReturnType<typeof detectionPack>): AgentSection {
  const mats = Object.entries(p.same_r_by_material).map(([m, v]) => `${m} (${v.n})`).join(", ");
  const flows = p.smoke_materials.flatMap((m) => m.flow_range_cm_s ?? []);
  return {
    agent: "detection",
    title: "Detection: smoke and aerosols",
    text: `SAME-R characterized smoke from ${mats}, with SAME before it, at inlet flows from ${Math.min(...flows)} to ${Math.max(...flows)} cm/s. DAFT used the same instrument on dust to separate nuisance alarms from smoke. ${p.limits} Detector thresholds for an enriched or low-pressure cabin are therefore untested.`,
    citations: ["SAME-R", "SAME", "DAFT / DAFT-2"],
  };
}

function plainSuppression(p: ReturnType<typeof suppressionPack>): AgentSection {
  const d = Object.entries(p.flex_droplet_tests_by_diluent)
    .map(([k, v]) => `${k}: ${v.extinction}/${v.tests} ended in extinction (oxygen ${v.o2_range[0]}-${v.o2_range[1]}%)`)
    .join("; ");
  return {
    agent: "suppression",
    title: "Suppression: extinguishment",
    text: `FLEX droplet tests by diluent: ${d}. ${p.cool_flames.cfi_g_marked_cool_flame} CFI-G records are explicitly flagged as cool flames in the table, a reminder that a flame that looks out may still be reacting. ${p.limits}`,
    citations: p.flex_records_closest_to_design.slice(0, 3).map((r) => r.cite),
  };
}

// ---------- language-model path ----------

const MODEL = "claude-opus-5-5";

const RULES = `You are part of Swarm Mind, a team of fire-safety analysts reading NASA's Physical Sciences Informatics (PSI) microgravity combustion records for engineers who design crewed spacecraft, stations, surface bases and pressurized rovers.

Rules that keep the analysis honest:
- Use only the evidence pack in the message. It was retrieved from the PSI experimental tables; nothing else is known to you about these tests.
- Cite records inline in square brackets using the "cite" strings or investigation names from the pack, for example [BASS-II O15a].
- Never state that a material or design is safe. Say what was tested, what happened, and what was not tested.
- When the design atmosphere lies outside what was tested, say it is extrapolation and name the direction of the risk (higher oxygen makes materials more flammable).
- PSI has no partial-gravity data. Microgravity and normal gravity only bound lunar or Martian behavior.
- Plain prose, no headings, no bullet lists, at most 130 words.`;

async function ask(client: Anthropic, system: string, user: string, effort: "low" | "medium"): Promise<string | null> {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort },
    system,
    messages: [{ role: "user", content: user }],
  });
  if (response.stop_reason === "refusal") return null;
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  return text || null;
}

function citesIn(text: string): string[] {
  return [...new Set([...text.matchAll(/\[([^\]]{2,60})\]/g)].map((m) => m[1]))].slice(0, 12);
}

export function hasLanguageModel(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export async function runSwarm(input: SwarmInput): Promise<Brief> {
  const { env, target, o2, psi } = resolveDesign(input);
  const prevention = preventionPack(target, input.material);
  const detection = detectionPack();
  const suppression = suppressionPack(target);
  const gapList = gaps(target).slice(0, 5);
  const design = { environment: env?.name ?? null, o2_pct: o2, pressure_psi: psi, flow_cm_s: input.flow_cm_s ?? null };
  const designLine = `Design atmosphere: ${o2}% oxygen at ${psi} psi${input.flow_cm_s != null ? `, ${input.flow_cm_s} cm/s ventilation flow` : ""}${env ? ` (${env.name}, gravity: ${env.gravity})` : ""}.`;

  const plain: AgentSection[] = [plainPrevention(prevention, o2), plainDetection(detection), plainSuppression(suppression)];
  const plainBottom = `${gapList[0].title}. ${plain[0].text.split(". ").slice(0, 2).join(". ")}.`;
  const evidenceOnly: Brief = {
    question: input.question,
    design,
    mode: "evidence-only",
    model: null,
    bottom_line: plainBottom,
    sections: plain,
    gaps: gapList,
    disclosure: "Evidence-only brief assembled by code from NASA PSI records. No language model was used.",
  };
  if (input.fast || !hasLanguageModel()) return evidenceOnly;

  try {
    const client = new Anthropic();
    const packs: [Pillar, string, unknown][] = [
      ["prevention", "You are the PREVENTION analyst: material flammability, ignition, flame spread.", prevention],
      ["detection", "You are the DETECTION analyst: smoke, aerosols, detector design and nuisance alarms.", detection],
      ["suppression", "You are the SUPPRESSION analyst: extinguishment, diluents, re-ignition and cool flames.", suppression],
    ];
    const written = await Promise.all(
      packs.map(([, role, pack]) =>
        ask(client, `${RULES}\n\n${role}`, `Question from the engineer: ${input.question}\n${designLine}\n\nEvidence pack:\n${JSON.stringify(pack)}`, "low"),
      ),
    );
    const sections: AgentSection[] = packs.map(([agent], i) => {
      const text = written[i] ?? plain[i].text;
      return { agent, title: plain[i].title, text, citations: written[i] ? citesIn(text) : plain[i].citations };
    });
    const lead = await ask(
      client,
      `${RULES}\n\nYou are the LEAD. Merge the three analysts into the bottom line an engineer acts on: two or three sentences, the single most important finding first, then what must be tested before committing to the design. Keep their citations. At most 80 words.`,
      `Question from the engineer: ${input.question}\n${designLine}\n\nAnalyst findings:\n${sections.map((s) => `${s.agent.toUpperCase()}: ${s.text}`).join("\n\n")}\n\nKnown evidence gaps:\n${gapList.map((g) => `- ${g.title}: ${g.detail}`).join("\n")}`,
      "medium",
    );
    return {
      ...evidenceOnly,
      mode: "language-model",
      model: MODEL,
      bottom_line: lead ?? plainBottom,
      sections,
      disclosure: `Text written by an SI language model (${MODEL}) from evidence packs retrieved by code from NASA PSI records. Figures and record ids come from the data, wording from the model.`,
    };
  } catch (e) {
    const reason =
      e instanceof Anthropic.AuthenticationError ? "the API key was rejected" : e instanceof Anthropic.RateLimitError ? "the model was rate limited" : e instanceof Anthropic.APIError ? `the model returned an error (${e.status})` : "the model call failed";
    return { ...evidenceOnly, disclosure: `Evidence-only brief: ${reason}, so no language model text is included.` };
  }
}

export function agentRoster() {
  return [
    { id: "prevention", name: "Prevention analyst", reads: "BASS, BASS-II, Saffire I-III, ACME BRE, CFI-G: material flammability versus oxygen, pressure and flow." },
    { id: "detection", name: "Detection analyst", reads: "SAME, SAME-R, DAFT, SPICE: smoke particles, aerosols, soot onset." },
    { id: "suppression", name: "Suppression analyst", reads: "FLEX, FLEX-2, CFI, BASS: extinction by diluent, cool flames, re-ignition." },
    { id: "lead", name: "Lead", reads: "Merges the three into a bottom line and lists what is untested." },
  ];
}

export { phaseGroup };
