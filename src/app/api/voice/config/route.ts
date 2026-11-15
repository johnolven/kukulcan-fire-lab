// Hands the browser the voice assistant definition (prompt + tools).
// The Vapi public key is a browser-safe key; it is read from the environment
// so it never lives in the repository.
// Code generated with SI assistance (Claude Code).
import { UI_TOOLS, VOICE_MCP_TOOLS, voiceSystemPrompt } from "@/lib/voiceTools";

export async function GET(request: Request) {
  const origin = process.env.PUBLIC_BASE_URL || new URL(request.url).origin;
  return Response.json({
    publicKey: process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? null,
    assistantId: process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? null,
    mcpUrl: `${origin}/api/voice/mcp`,
    reachable: !/localhost|127\.0\.0\.1/.test(origin),
    systemPrompt: voiceSystemPrompt(),
    uiTools: UI_TOOLS,
    // Data tools are also offered to the browser, which runs them against the voice MCP
    // and hands the result to the call. That keeps voice working on localhost.
    dataTools: VOICE_MCP_TOOLS.map((t) => ({ name: t.name, description: t.description, parameters: t.inputSchema })),
  });
}
