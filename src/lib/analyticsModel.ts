// Turns a plain-language request into a chart specification with Claude.
// The model picks fields and filters; the numbers are computed by runSpec.
// Code generated with SI assistance (Claude Code).

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { AGGREGATES, CATEGORY_FIELDS, CHART_TYPES, NUMBER_FIELDS, heuristicSpec, type ChartSpec } from "./analytics";
import { COMBUSTION, label, materials } from "./lab";

const FIELDS = [...CATEGORY_FIELDS, ...NUMBER_FIELDS] as [string, ...string[]];

const SpecSchema = z.object({
  title: z.string().describe("Short chart title that states what is shown, in the language of the request"),
  chart: z.enum(CHART_TYPES),
  x: z.enum(FIELDS),
  y: z.enum(NUMBER_FIELDS).nullable(),
  aggregate: z.enum(AGGREGATES).nullable(),
  group_by: z.enum(CATEGORY_FIELDS).nullable(),
  filters: z.object({
    investigation: z.string().nullable(),
    phase: z.enum(["solid", "liquid", "gas", "smoke"]).nullable(),
    material: z.string().nullable(),
    fuel: z.string().nullable(),
    diluent: z.string().nullable(),
    outcome: z.string().nullable(),
    o2_min: z.number().nullable(),
    o2_max: z.number().nullable(),
  }),
  note: z.string().describe("One sentence telling the reader what to look for; no figures, since you have not seen the data"),
});

const SYSTEM = `You translate a request from a spacecraft fire-safety engineer into one chart specification over the harmonized NASA PSI microgravity combustion records. You do not see the data and must not state figures; code computes them from your specification.

Record fields:
- Categories: investigation, phase (solid, liquid, gas, smoke), material, fuel, diluent (N2, CO2, He, He+N2), outcome (Extinction, Disruption, Completion, Self-extinguished, Flow terminated, Did not sustain burning), ignited, row_type.
- Numbers: o2_pct (oxygen percent), pressure_psi, flow_cm_s (air flow), burn_time_s.

Chart types:
- bar: x is a category, or a number field that will be binned. aggregate is count, mean, median, min, max (these four need y), or share_extinguished (percent of records with an outcome that went out or did not ignite). group_by splits bars into series.
- scatter: x and y are both number fields; group_by colors the points.
- table: same as bar, shown as rows.

Investigations: ${COMBUSTION.filter((i) => i.n_records > 0).map((i) => label(i)).join(", ")}.
Materials: ${materials().map((m) => m.material).join("; ")}.

What is sparse, so you choose fields that have data: burn_time_s and outcome exist mainly for FLEX and ACME CFI-G; flow_cm_s mainly for SPICE, SAME-R and Saffire; solids (BASS, BASS-II, Saffire) have oxygen but rarely an outcome; smoke records have no oxygen. Set filters only when the request implies them. Use null for anything not needed.`;

export async function specFromQuestion(question: string): Promise<{ spec: ChartSpec; by: "language-model" | "keywords"; reason?: string }> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return { spec: heuristicSpec(question), by: "keywords", reason: "No language model key is configured." };
  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "low", format: zodOutputFormat(SpecSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: question }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return { spec: heuristicSpec(question), by: "keywords", reason: "The model did not return a specification." };
    return { spec: response.parsed_output as ChartSpec, by: "language-model" };
  } catch (e) {
    const reason = e instanceof Anthropic.AuthenticationError ? "The API key was rejected." : e instanceof Anthropic.RateLimitError ? "The model was rate limited." : e instanceof Anthropic.APIError ? `The model returned an error (${e.status}).` : "The model call failed.";
    return { spec: heuristicSpec(question), by: "keywords", reason };
  }
}
