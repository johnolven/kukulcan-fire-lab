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
import { ACTION_IDS, ACTIONS, CONTROL_IDS, describeControls } from "./controls";
import { numArg, str, type McpTool } from "./mcp";
import { searchLibrary } from "./resources";
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
    name: "search_library",
    description: "Look up history and background in the library of NASA and partner-agency resources: Apollo 1, Apollo 13, the Mir fire, how the station's combustion facilities work, technology that reached Earth (firefighter gear, smoke detector), JAXA's FLARE. Returns the best passage to say aloud.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    handler: (a) => {
      const hits = searchLibrary(str(a.query) ?? "", { limit: 2 });
      if (!hits.length) return { say: "The library has nothing on that. It covers Apollo 1, Apollo 13, the Mir fire, the station's combustion research, the Spinoff articles and JAXA's FLARE." };
      const t = hits[0].passage.text;
      return { say: `From ${hits[0].resource.title}: ${t.length > 420 ? `${t.slice(0, t.lastIndexOf(". ", 420) + 1 || 420)}` : t}`, cite: hits[0].passage.id, also: hits[1] ? hits[1].resource.title : null };
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
    description:
      "Change what the centre stage of the lab shows. fire = the flame and what nearby tests did; ranking = investigations ranked for this design; ask = the orchestrator and the library of NASA and partner-agency resources (Apollo 1, Apollo 13, Mir, Spinoff, JAXA); videos = footage of the experiments streamed from NASA; timeline = incidents, Earth technology and investigations since 1967; scenarios = the cabin fire simulator where a fire starts and the crew responds; lab = five published fire models (flammability map, Earth test versus orbit, test probability, flame temperature, burning droplet); environment = the 3D model of the cabin in full size with its facts; analytics = the dashboard of charts built on request; voice = the large voice visualizer; map = evidence map of every test by oxygen and pressure; investigations = table of investigations; tests = table of test records; materials = materials table; gaps = what is untested; brief = the analysts; connections = diagram of how the voice, the MCP servers and NASA connect.",
    parameters: { type: "object", properties: { panel: { type: "string", enum: ["fire", "ranking", "ask", "videos", "timeline", "scenarios", "lab", "environment", "analytics", "voice", "map", "investigations", "tests", "materials", "gaps", "brief", "connections"] } }, required: ["panel"] },
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
    name: "set_controls",
    description:
      "Set one or more controls anywhere in the lab: sliders, selectors and switches of the fire bench, the scenarios, the lab models, the live cabin, and the layout. Send every change the request needs in one call; they are applied in order and the matching view opens by itself. Values: a number for sliders, true or false for switches, one of the listed options for selectors.",
    parameters: {
      type: "object",
      properties: {
        changes: {
          type: "array",
          items: { type: "object", properties: { control: { type: "string", enum: CONTROL_IDS }, value: { type: "string", description: "Number, true/false, or option name, as text." } }, required: ["control", "value"] },
        },
      },
      required: ["changes"],
    },
  },
  {
    name: "press_control",
    description: `Press a button in the lab. ${ACTION_IDS.map((id) => `${id}: ${ACTIONS[id].label}`).join("; ")}.`,
    parameters: { type: "object", properties: { action: { type: "string", enum: ACTION_IDS } }, required: ["action"] },
  },
  {
    name: "read_controls",
    description: "Read the current state of the whole lab: environment, atmosphere, the view on the stage and the value of every control. Call it when you need to know what is on screen before changing or describing it.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "play_video",
    description: "Play footage of an experiment, streamed from NASA's repository. Give the investigation (BASS-II, BASS, FLEX, CFI, SPICE, SLICE, SAME-R, ACME BRE, ACME CLD Flame, ACME E-FIELD Flames, ACME s-Flame) and optionally words from the file name such as a sample or test id.",
    parameters: { type: "object", properties: { investigation: { type: "string" }, search: { type: "string" } }, required: ["investigation"] },
  },
  {
    name: "watch_nasa_video",
    description: "Show NASA's ScienceCasts video 'The Power of Studying Combustion on the ISS' inside the library. Use when the user asks for the NASA video or an introduction to combustion on the station.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "build_chart",
    description: "Add a chart or table to the analytics dashboard, built from the NASA records. Pass the user's request in plain words, for example 'extinction rate by diluent gas in FLEX' or 'burn time against oxygen for droplets'. Use it whenever the user asks for a chart, graph, comparison, table of numbers or dashboard.",
    parameters: { type: "object", properties: { request: { type: "string" } }, required: ["request"] },
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
- For a material, call check_material and open_panel with materials. For an investigation, call focus_investigation and explain_investigation. For "what is missing", call name_the_gaps and open_panel with gaps.
- The centre stage shows one view at a time and the page never scrolls. Whenever the user asks to see something, call open_panel so it appears: fire or flame -> fire; the map -> map; tables, tests or records -> tests; investigations -> investigations; materials -> materials; how it connects, nodes or MCP -> connections. the cabin, the model or 3D -> environment; a simulation, a scenario or 'what if a fire starts' -> scenarios; fire models, the flammability map, flame temperature or the lab -> lab. After showing an environment or changing the atmosphere, open fire unless they asked for another view.
- For history or background (Apollo 1, Apollo 13, Mir, how NASA technology reached Earth, other agencies), call search_library and open_panel with ask.
- To show footage of an experiment, call play_video. For NASA's introduction video, call watch_nasa_video. For dates and history at a glance, open_panel with timeline.
- You can operate every control of the lab with set_controls and press_control. When the user describes a situation ("fire in stowage, detected at 90 seconds, fans off, play it"), send all the changes in one set_controls call, then press_control if a button is needed. To run a fire in the live cabin, set lab.case to cabin and press cabin.restart. If you are unsure what is on screen, call read_controls first; its answer arrives as a LAB RESULT.
- Controls: ${describeControls()}.
- For a chart, graph, comparison or dashboard, call build_chart with the request in plain words and say the chart is on the stage. You cannot see the chart, so do not describe its numbers.
- Data tools (check_design, check_material, explain_investigation, rank_for_design, name_the_gaps, lab_numbers, swarm_brief, search_library) answer a moment later in a system message that starts with "LAB RESULT". After calling one, say at most "One moment" and stop. When the LAB RESULT arrives, speak its "say" text in your own words, under four sentences, reading numbers naturally.
- If a LAB RESULT has not arrived, do not guess and do not say the lab has no information. Wait for it.
- Only state figures that came from a tool. If a tool says something was never tested, say exactly that.
- Never say a material or design is safe. Say what was tested and what was not. Above the tested oxygen range, call it extrapolation.
- NASA's repository has no partial-gravity data; lunar and Martian behavior can only be bounded between microgravity and normal gravity.
- Rockets and propellants are outside this lab.
- Reply in the language the user speaks.

Environments: ${ENVIRONMENTS.map((e) => `${e.id} (${e.name}, ${e.o2_pct}% oxygen at ${e.pressure_psi} psi)`).join("; ")}. One atmosphere is ${PSI_PER_ATM} psi.`;
}
