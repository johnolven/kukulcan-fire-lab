// Research MCP server: POST JSON-RPC here (MCP Streamable HTTP).
// Code generated with SI assistance (Claude Code).
import { createMcpHandlers } from "@/lib/mcp";
import { RESEARCH_INFO, RESEARCH_TOOLS } from "@/lib/tools";

export const maxDuration = 120;
export const { POST, GET, OPTIONS, DELETE } = createMcpHandlers(RESEARCH_INFO, RESEARCH_TOOLS);
