// Resources MCP server: the challenge's NASA resources and partner-agency links.
// Code generated with SI assistance (Claude Code).
import { createMcpHandlers } from "@/lib/mcp";
import { RESOURCE_INFO, RESOURCE_TOOLS } from "@/lib/resources";

export const { POST, GET, OPTIONS, DELETE } = createMcpHandlers(RESOURCE_INFO, RESOURCE_TOOLS);
