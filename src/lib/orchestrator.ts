// Orchestrator: one question in, an answer that draws on every server out.
// Claude sees the tools of the records server (test records, ranking, fire models,
// scenarios) and of the resources server (NASA and partner library), decides which
// to call, reads the results and writes a cited answer. The trace of calls is
// returned so the path is visible. Without a model key, a fixed plan gathers the
// same sources and returns them unsummarized.
// Code generated with SI assistance (Claude Code).

import Anthropic from "@anthropic-ai/sdk";
import { resolveDesign } from "./agents";
import type { McpTool } from "./mcp";
import { LIBRARY, RESOURCE_TOOLS } from "./resources";
import { RESEARCH_TOOLS } from "./tools";

export interface TraceStep {
  server: "records" | "resources";
  tool: string;
  input: Record<string, unknown>;
  ok: boolean;
  ms: number;
}

export interface OrchestratedAnswer {
  question: string;
  answer: string;
  mode: "language-model" | "gathered-only";
  model: string | null;
  trace: TraceStep[];
  sources: { cite: string; title: string; url: string }[];
  disclosure: string;
}

// Tools that call a model themselves are left out so one question costs one model conversation.
const SKIP = new Set(["consult_swarm", "ask_chart", "get_file_link", "list_files"]);
const SERVERS: { server: TraceStep["server"]; tools: McpTool[] }[] = [
  { server: "records", tools: RESEARCH_TOOLS.filter((t) => !SKIP.has(t.name)) },
  { server: "resources", tools: RESOURCE_TOOLS },
];
const FIND = new Map(SERVERS.flatMap((s) => s.tools.map((t) => [t.name, { server: s.server, tool: t }] as const)));

async function call(name: string, input: Record<string, unknown>, trace: TraceStep[]): Promise<{ text: string; ok: boolean }> {
  const hit = FIND.get(name);
  const t0 = Date.now();
  if (!hit) return { text: `Unknown tool ${name}.`, ok: false };
  try {
    const out = await hit.tool.handler(input);
    const text = typeof out === "string" ? out : JSON.stringify(out);
    trace.push({ server: hit.server, tool: name, input, ok: true, ms: Date.now() - t0 });
    return { text: text.length > 9000 ? `${text.slice(0, 9000)}… [truncated]` : text, ok: true };
  } catch (e) {
    trace.push({ server: hit.server, tool: name, input, ok: false, ms: Date.now() - t0 });
    return { text: `Tool error: ${e instanceof Error ? e.message : String(e)}`, ok: false };
  }
}

const MODEL = "claude-opus-5-5";

const SYSTEM = `You are the orchestrator of the Kukulcan Fire Lab. Engineers who design crewed spacecraft, stations, surface bases, rovers and suits ask you about fire safety. You answer by calling tools on two servers and reading what they return.

Records server: the harmonized NASA PSI microgravity combustion test records (evidence_for_design, query_tests, material_evidence, rank_investigations, coverage_gaps, get_investigation, search_investigations, lab_overview, build_chart), published fire models (fire_models) and a cabin fire scenario simulator (run_fire_scenario).
Resources server: the library of NASA resources named by the challenge (Apollo 1, Apollo 13, the Mir fire, the Researcher's Guide to combustion science, NASA Combustion Science, the Spinoff articles on Earth benefits) and partner-agency work (JAXA, ESA): search_resources, incident_lessons, earth_benefits, partner_agencies, get_resource, list_resources.

How to work:
- Decide which sources the question needs and call them, several at once when they are independent. A design question usually needs the test evidence and, when history is relevant, the lessons from an incident. Two to five calls is typical.
- Use only what the tools return. Cite test records by their id in square brackets, for example [BASS-II O15a], and library passages by their citation id, for example [apollo-1#23].
- Keep the three kinds of source apart in your wording: test records say what was tested; models and the simulator are calculations with stated assumptions; the library is history and background.
- Never say a material or design is safe. Above the tested oxygen range, call it extrapolation. PSI holds no partial-gravity data.
- Answer in the language of the question. Plain prose in short paragraphs, at most 220 words, no headings and no markdown.`;

function sourcesFrom(answer: string) {
  const out = new Map<string, { cite: string; title: string; url: string }>();
  for (const m of answer.matchAll(/\[([a-z0-9-]+)#(\d+)\]/g)) {
    const r = LIBRARY.find((x) => x.id === m[1]);
    if (r) out.set(`${m[1]}#${m[2]}`, { cite: `${m[1]}#${m[2]}`, title: r.title, url: r.url });
  }
  return [...out.values()];
}

export async function orchestrate(question: string, design?: { environment?: string; o2_pct?: number; pressure_psi?: number }): Promise<OrchestratedAnswer> {
  const trace: TraceStep[] = [];
  const { env, o2, psi } = resolveDesign(design ?? {});
  const designLine = `Cabin on the table: ${env ? `${env.name}, ` : ""}${o2}% oxygen at ${psi} psi. Pass these values to tools that take a design.`;

  const gathered = async (reason: string): Promise<OrchestratedAnswer> => {
    const [evidence, library, models] = await Promise.all([
      call("evidence_for_design", { o2_pct: o2, pressure_psi: psi, limit: 4 }, trace),
      call("search_resources", { query: question, limit: 4 }, trace),
      call("fire_models", { o2_pct: o2, pressure_psi: psi }, trace),
    ]);
    const ev = JSON.parse(evidence.text.replace(/… \[truncated\]$/, "") || "{}") as { nearest_records?: { summary: string }[]; evidence_gaps?: { title: string }[] };
    const lib = JSON.parse(library.text) as { passages?: { cite: string; source: string; text: string }[] };
    const md = JSON.parse(models.text) as { flammability_map?: { burns: boolean; oxygen_limit_pct: number }; flame_temperature?: { methane_K: number } };
    const parts = [
      ev.nearest_records?.length ? `Closest test records: ${ev.nearest_records.slice(0, 3).map((r) => r.summary).join("; ")}.` : "",
      ev.evidence_gaps?.length ? `Main gap: ${ev.evidence_gaps[0].title}.` : "",
      md.flammability_map ? `Model: a thin material ${md.flammability_map.burns ? "burns" : "does not burn"} here (limit ${md.flammability_map.oxygen_limit_pct}% oxygen at 10 cm/s); methane flame ${md.flame_temperature?.methane_K} K.` : "",
      lib.passages?.length ? `From the library: ${lib.passages.slice(0, 2).map((p) => `${p.text.slice(0, 260)} [${p.cite}]`).join(" ")}` : "",
    ].filter(Boolean);
    return { question, answer: parts.join("\n\n"), mode: "gathered-only", model: null, trace, sources: sourcesFrom((lib.passages ?? []).slice(0, 4).map((p) => `[${p.cite}]`).join(" ")), disclosure: `Sources gathered by a fixed plan and shown unsummarized: ${reason}` };
  };

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return gathered("no language model key is configured.");

  try {
    const client = new Anthropic();
    const tools: Anthropic.Tool[] = [...FIND.values()].map(({ tool }) => ({ name: tool.name, description: tool.description, input_schema: tool.inputSchema as Anthropic.Tool.InputSchema }));
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: `${question}\n\n${designLine}` }];
    let answer = "";
    for (let turn = 0; turn < 6; turn++) {
      const response = await client.messages.create({ model: MODEL, max_tokens: 16000, output_config: { effort: "low" }, system: SYSTEM, tools, messages });
      if (response.stop_reason === "refusal") return gathered("the model declined the request.");
      messages.push({ role: "assistant", content: response.content });
      const uses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (response.stop_reason !== "tool_use" || !uses.length) {
        answer = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim();
        break;
      }
      // Independent calls run together; all results go back in one message.
      const results = await Promise.all(uses.map((u) => call(u.name, (u.input ?? {}) as Record<string, unknown>, trace)));
      messages.push({ role: "user", content: uses.map((u, i) => ({ type: "tool_result" as const, tool_use_id: u.id, content: results[i].text, is_error: !results[i].ok })) });
    }
    if (!answer) return gathered("the model did not finish within the call limit.");
    return {
      question,
      answer: answer.replace(/\*\*/g, ""),
      mode: "language-model",
      model: MODEL,
      trace,
      sources: sourcesFrom(answer),
      disclosure: `Answer written by an SI language model (${MODEL}) from tool results it requested. Figures, record ids and quotations come from the tools; wording from the model.`,
    };
  } catch (e) {
    const reason = e instanceof Anthropic.AuthenticationError ? "the API key was rejected." : e instanceof Anthropic.RateLimitError ? "the model was rate limited." : e instanceof Anthropic.APIError ? `the model returned an error (${e.status}).` : "the model call failed.";
    return gathered(reason);
  }
}

export const ORCHESTRATOR_TOOLS: McpTool[] = [
  {
    name: "ask_lab",
    description:
      "Ask one fire-safety question and get one cited answer drawn from every server: the NASA PSI test records, the published fire models, the cabin fire simulator, and the library of NASA and partner-agency resources (Apollo 1, Apollo 13, Mir, Researcher's Guide, Spinoff, JAXA FLARE). The orchestrator decides which tools to call and returns the answer with the trace of calls it made.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string" },
        environment: { type: "string", description: "suit, capsule, spacecraft, station, base or rover." },
        o2_pct: { type: "number" },
        pressure_psi: { type: "number" },
      },
      required: ["question"],
    },
    handler: (a) => orchestrate(String(a.question ?? ""), { environment: typeof a.environment === "string" ? a.environment : undefined, o2_pct: typeof a.o2_pct === "number" ? a.o2_pct : undefined, pressure_psi: typeof a.pressure_psi === "number" ? a.pressure_psi : undefined }),
  },
  {
    name: "list_servers",
    description: "The MCP servers behind the lab, what each holds and its tools. Use it to call a server directly instead of going through ask_lab.",
    inputSchema: { type: "object", properties: {} },
    handler: () => ({
      servers: [
        { name: "records", path: "/api/mcp", holds: "Harmonized NASA PSI test records, investigation ranking, evidence gaps, fire models, cabin fire simulator, charts, analysts", tools: RESEARCH_TOOLS.map((t) => t.name) },
        { name: "resources", path: "/api/resources/mcp", holds: "NASA resources named by the challenge and partner-agency links, as citable passages", tools: RESOURCE_TOOLS.map((t) => t.name) },
        { name: "voice", path: "/api/voice/mcp", holds: "Short spoken answers for the voice assistant", tools: "see the server" },
        { name: "orchestrator", path: "/api/orchestrator/mcp", holds: "One question, one cited answer across the servers", tools: ["ask_lab", "list_servers"] },
      ],
    }),
  },
];

export const ORCHESTRATOR_INFO = {
  name: "kukulcan-fire-lab-orchestrator",
  version: "1.0.0",
  instructions: "Front door to the Kukulcan Fire Lab. ask_lab answers a fire-safety question by calling the records and resources servers and returns a cited answer with the trace of calls. list_servers shows the servers if you prefer to call them directly.",
};
