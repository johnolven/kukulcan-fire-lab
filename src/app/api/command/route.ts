// Typed chat with the lab: a message in, table actions and a short reply out.
// Code generated with SI assistance (Claude Code).
import { runCommand } from "@/lib/commandModel";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { text?: unknown; state?: unknown };
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 600) : "";
  if (!text) return Response.json({ error: "Send a message." }, { status: 400 });
  return Response.json(await runCommand(text, body.state ?? {}));
}
