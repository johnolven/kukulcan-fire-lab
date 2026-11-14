// Runs the Swarm Mind agents for the dashboard.
// Code generated with SI assistance (Claude Code).
import { runSwarm } from "@/lib/agents";

export const maxDuration = 120;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 600) : undefined);
  const brief = await runSwarm({
    question: s(body.question) ?? "What does the evidence say about fire safety for this design?",
    environment: s(body.environment),
    o2_pct: n(body.o2_pct),
    pressure_psi: n(body.pressure_psi),
    flow_cm_s: n(body.flow_cm_s),
    material: s(body.material),
    fast: body.fast === true,
  });
  return Response.json(brief);
}
