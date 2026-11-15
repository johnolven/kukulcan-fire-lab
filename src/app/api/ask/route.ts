// The dashboard's door to the orchestrator.
// Code generated with SI assistance (Claude Code).
import { orchestrate } from "@/lib/orchestrator";

export const maxDuration = 120;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 600) : "";
  if (!question) return Response.json({ error: "Send a question." }, { status: 400 });
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  return Response.json(await orchestrate(question, { o2_pct: n(body.o2_pct), pressure_psi: n(body.pressure_psi) }));
}
