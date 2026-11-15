// Orchestrator MCP server: one question, one cited answer across the servers.
// Code generated with SI assistance (Claude Code).
import { createMcpHandlers } from "@/lib/mcp";
import { ORCHESTRATOR_INFO, ORCHESTRATOR_TOOLS } from "@/lib/orchestrator";

export const maxDuration = 120;
export const { POST, GET, OPTIONS, DELETE } = createMcpHandlers(ORCHESTRATOR_INFO, ORCHESTRATOR_TOOLS);
