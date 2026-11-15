// Builds one chart for the analytics dashboard: a plain-language question (or a
// ready specification) in, computed numbers out.
// Code generated with SI assistance (Claude Code).
import { runSpec, type ChartSpec } from "@/lib/analytics";
import { specFromQuestion } from "@/lib/analyticsModel";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { question?: unknown; spec?: unknown };
  if (body.spec && typeof body.spec === "object") return Response.json({ result: runSpec(body.spec as ChartSpec), by: "specification" });
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
  if (!question) return Response.json({ error: "Send a question or a spec." }, { status: 400 });
  const { spec, by, reason } = await specFromQuestion(question);
  return Response.json({ result: runSpec(spec), by, reason: reason ?? null, question });
}
