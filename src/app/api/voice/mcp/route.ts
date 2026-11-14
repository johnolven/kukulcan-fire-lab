// Voice MCP server: short spoken answers for the voice assistant.
// Code generated with SI assistance (Claude Code).
import { createMcpHandlers } from "@/lib/mcp";
import { VOICE_INFO, VOICE_MCP_TOOLS } from "@/lib/voiceTools";

export const { POST, GET, OPTIONS, DELETE } = createMcpHandlers(VOICE_INFO, VOICE_MCP_TOOLS);
