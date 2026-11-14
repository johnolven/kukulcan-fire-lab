// Voice layer: tools for the spoken assistant.
//
// Two groups:
//   1. VOICE_MCP_TOOLS run on the server (/api/voice/mcp). They answer in one or
//      two short sentences meant to be spoken, built from the same query core as
//      the research MCP.
//   2. UI_TOOLS run in the browser. The voice model calls them to move the lab
//      (pick an environment, set the atmosphere, open a panel); the page listens
//      for those calls and applies them.
//
// Code generated with SI assistance (Claude Code).

import { resolveDesign, runSwarm } from "./agents";
import { ENVIRONMENTS } from "./environments";
import { describeTest, gaps, getInvestigation, label, materialEvidence, materials, nearestTests, rankInvestigations, stats } from "./lab";
import { numArg, str, type McpTool } from "./mcp";
import { PSI_PER_ATM } from "./types";

const designProps = {
  environment: { type: "string", description: `One of: ${ENVIRONMENTS.map((e) => e.id).join(", ")}.` },
  o2_pct: { type: "number", description: "Oxygen percent." },
  pressure_psi: { type: "number", description: "Pressure in psi." },
};

function design(a: Record<string, unknown>) {
  return resolveDesign({ environment: str(a.environment), o2_pct: numArg(a.o2_pct), pressure_psi: numArg(a.pressure_psi) });
}

export const VOICE_MCP_TOOLS: McpTool[] = [
  {
    name: "check_design",
    description: "Spoken summary of the evidence for an environment or atmosphere: closest real test, closest solid-material test, top investigation and the main gap. Call this whenever the user picks or changes a design.",
    inputSchema: { type: "object", properties: designProps },
    handler: (a) => {
      const { env, target, o2, psi } = design(a);
      const near = nearestTests(target, 1)[0];
      const solid = nearestTests({ ...target, phase: "solid" }, 1)[0];
      const top = rankInvestigations(target)[0];
      const gap = gaps(target)[0];
      return {
        say: [
          `${env ? env.name : "That design"}: ${o2} percent oxygen at ${psi} psi.`,
          near ? `Closest test on record is ${describeTest(near.item)}.` : "No test on record sits near it.",
          solid ? `Closest solid material test is ${solid.item.acronym}, ${solid.item.material ?? solid.item.fuel}, at ${solid.item.o2_max} percent oxygen.` : "",
          `Most relevant investigation is ${label(top.investigation)}, scoring ${top.score} of 100.`,
          `Main gap: ${gap.title}.`,
        ].filter(Boolean).join(" "),
        closest_record_id: near?.item.id ?? null,
        top_investigation: top.investigation.accession,
      };
    },
  },
  {
    name: "check_material",
    description: "Spoken summary of what NASA tested for a material, or a plain statement that it was never tested.",
    inputSchema: { type: "object", properties: { material: { type: "string" } }, required: ["material"] },
    handler: (a) => {
      const name = str(a.material) ?? "";
      const m = materialEvidence(name);
      if (!m) return { say: `There is no test record for ${name}. Materials on record are ${materials().map((x) => x.material.split(" (")[0]).join(", ")}.`, found: false };
      const o2 = m.o2_range ? `between ${m.o2_range[0]} and ${m.o2_range[1]} percent oxygen` : "with no oxygen level recorded";
      return {
        say: `${m.material}: ${m.records} records from ${m.investigations.join(" and ")}, ${o2}, for ${m.kinds.join(" and ")}. ${m.enriched_records === 0 ? "It was never tested at 30 percent oxygen or more, so an enriched cabin is extrapolation." : `${m.enriched_records} records are at 30 percent oxygen or more.`}`,
        found: true,
        material: m.material,
      };
    },
  },
  {
    name: "explain_investigation",
    description: "Spoken two-sentence description of one investigation by acronym or accession.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    handler: (a) => {
      const i = getInvestigation(str(a.id) ?? "");
      if (!i) return { say: `I can't find an investigation called ${a.id}.` };
      const o2 = i.o2_range ? ` Oxygen ranged from ${i.o2_range[0]} to ${i.o2_range[1]} percent.` : "";
      return { say: `${label(i)}: ${i.focus} It has ${i.n_records} records in its test table and ${i.publications.length} publications.${o2}`, accession: i.accession };
    },
  },
  {
    name: "rank_for_design",
    description: "Spoken top three investigations for a design, optionally for one pillar (prevention, detection, suppression).",
    inputSchema: { type: "object", properties: { ...designProps, pillar: { type: "string" } } },
    handler: (a) => {
      const { target } = design(a);
      const top = rankInvestigations(target, str(a.pillar)).slice(0, 3);
      return { say: `Top three: ${top.map((r) => `${label(r.investigation)} at ${r.score}`).join(", ")}. ${top[0].rationale.join(" ")}`, accessions: top.map((r) => r.investigation.accession) };
    },
  },
  {
    name: "name_the_gaps",
    description: "Spoken list of the main evidence gaps for a design.",
    inputSchema: { type: "object", properties: designProps },
    handler: (a) => {
      const { target } = design(a);
      const g = gaps(target).slice(0, 3);
      return { say: `Three gaps. ${g.map((x, n) => `${n + 1}: ${x.title}.`).join(" ")} ${g[0].detail}` };
    },
  },
  {
    name: "lab_numbers",
    description: "Spoken headline numbers of the dataset.",
    inputSchema: { type: "object", properties: {} },
    handler: () => {
      const s = stats();
      return { say: `${s.investigations} combustion investigations, ${s.records} harmonized records, about ${s.terabytes} terabytes of source data. ${s.tests_at_30pct_o2_or_more} tests reach 30 percent oxygen or more, and ${s.solid_tests_at_30pct_o2_or_more} of those are solid materials.` };
    },
  },
  {
    name: "swarm_brief",
    description: "Ask the three analysts for an evidence brief on the current design. Instant, evidence only. Read the bottom line aloud and tell the user the full brief is on screen.",
    inputSchema: { type: "object", properties: { question: { type: "string" }, ...designProps, material: { type: "string" } } },
    handler: async (a) => {
      const b = await runSwarm({ question: str(a.question) ?? "Fire-safety evidence for this design", environment: str(a.environment), o2_pct: numArg(a.o2_pct), pressure_psi: numArg(a.pressure_psi), material: str(a.material), fast: true });
      return { say: b.bottom_line, sections: b.sections.map((s) => `${s.agent}: ${s.text}`) };
    },
  },
];

export const VOICE_INFO = {
  name: "kukulcan-fire-lab-voice",
  version: "1.0.0",
  instructions: "Voice tools for the Kukulcan Fire Lab. Every tool returns a `say` string: speak it, lightly rephrased, and keep answers under four sentences.",
};

// ----- browser-side tools (definitions only; the page executes them) -----

export interface UiAction {
  tool: string;
  args: Record<string, unknown>;
}

export const UI_TOOLS = [
  {
    name: "show_environment",
    description: "Show one crewed environment on the lab table and load its design atmosphere. Call this when the user names a suit, capsule, transit spacecraft, station, surface base or rover.",
    parameters: { type: "object", properties: { environment: { type: "string", enum: ENVIRONMENTS.map((e) => e.id) } }, required: ["environment"] },
  },
  {
    name: "set_atmosphere",
    description: "Change the design atmosphere on the lab table. Use when the user asks for a specific oxygen percentage or pressure.",
    parameters: { type: "object", properties: { o2_pct: { type: "number" }, pressure_psi: { type: "number" } } },
  },
  {
    name: "open_panel",
    description: "Bring one panel of the lab into view.",
    parameters: { type: "object", properties: { panel: { type: "string", enum: ["map", "ranking", "investigations", "tests", "materials", "gaps", "brief", "connect"] } }, required: ["panel"] },
  },
  {
    name: "focus_investigation",
    description: "Open the detail of one investigation on screen, by acronym or accession (for example BASS-II or PSI-25).",
    parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "filter_tests",
    description: "Filter the test table and the map by fuel phase and/or material text. Pass empty strings to clear.",
    parameters: { type: "object", properties: { phase: { type: "string", enum: ["", "solid", "liquid", "gas", "smoke"] }, material: { type: "string" } } },
  },
  {
    name: "write_brief",
    description: "Have the Swarm Mind analysts write the brief for the current design on screen.",
    parameters: { type: "object", properties: { question: { type: "string" } } },
  },
];

export function voiceSystemPrompt(): string {
  return `You are the voice of the Kukulcan Fire Lab, a workshop table where engineers explore NASA's microgravity combustion records while they design crewed spacecraft, stations, surface bases, pressurized rovers and suits. You speak like a calm, quick lab partner: short sentences, plain words, a suggestion for the next step when it helps.

How to work:
- The lab table is on the user's screen. When they name an environment, call show_environment and then check_design, and tell them what the evidence says. When they give numbers, call set_atmosphere and then check_design with the same numbers.
- For a material, call check_material. For an investigation, call focus_investigation and explain_investigation. For "what is missing", call name_the_gaps and open_panel with gaps.
- Every data tool returns a "say" string. Speak it in your own words and keep it under four sentences. Read numbers naturally.
- Only state figures that came from a tool. If a tool says something was never tested, say exactly that.
- Never say a material or design is safe. Say what was tested and what was not. Above the tested oxygen range, call it extrapolation.
- NASA's repository has no partial-gravity data; lunar and Martian behavior can only be bounded between microgravity and normal gravity.
- Rockets and propellants are outside this lab.
- Reply in the language the user speaks.

Environments: ${ENVIRONMENTS.map((e) => `${e.id} (${e.name}, ${e.o2_pct}% oxygen at ${e.pressure_psi} psi)`).join("; ")}. One atmosphere is ${PSI_PER_ATM} psi.`;
}
