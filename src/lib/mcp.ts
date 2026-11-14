// Minimal stateless MCP server over Streamable HTTP (JSON responses, no sessions).
// Implements initialize, ping, tools/list and tools/call, which is all a
// tool-only server needs. Code generated with SI assistance (Claude Code).

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

interface RpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });
}

async function handleOne(req: RpcRequest, info: { name: string; version: string; instructions: string }, tools: McpTool[]) {
  const reply = (result: unknown) => ({ jsonrpc: "2.0" as const, id: req.id ?? null, result });
  const fail = (code: number, message: string) => ({ jsonrpc: "2.0" as const, id: req.id ?? null, error: { code, message } });

  switch (req.method) {
    case "initialize": {
      const asked = String(req.params?.protocolVersion ?? "");
      return reply({
        protocolVersion: SUPPORTED.includes(asked) ? asked : SUPPORTED[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: info.name, version: info.version },
        instructions: info.instructions,
      });
    }
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case "tools/call": {
      const name = String(req.params?.name ?? "");
      const tool = tools.find((t) => t.name === name);
      if (!tool) return fail(-32602, `Unknown tool: ${name}`);
      try {
        const out = await tool.handler((req.params?.arguments as Record<string, unknown>) ?? {});
        const text = typeof out === "string" ? out : JSON.stringify(out, null, 1);
        return reply({ content: [{ type: "text", text }], isError: false });
      } catch (e) {
        return reply({ content: [{ type: "text", text: `Tool error: ${e instanceof Error ? e.message : String(e)}` }], isError: true });
      }
    }
    default:
      if (req.id === undefined || req.method.startsWith("notifications/")) return null; // notification: no reply
      return fail(-32601, `Method not found: ${req.method}`);
  }
}

export function createMcpHandlers(info: { name: string; version: string; instructions: string }, tools: McpTool[]) {
  async function POST(request: Request) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
    }
    if (Array.isArray(body)) {
      const results = (await Promise.all(body.map((r) => handleOne(r as RpcRequest, info, tools)))).filter(Boolean);
      return results.length ? json(results) : new Response(null, { status: 202, headers: CORS });
    }
    const result = await handleOne(body as RpcRequest, info, tools);
    return result ? json(result) : new Response(null, { status: 202, headers: CORS });
  }

  // No server-initiated stream: the spec lets a server answer GET with 405.
  async function GET() {
    return json(
      {
        server: info.name,
        version: info.version,
        transport: "MCP Streamable HTTP. POST JSON-RPC to this URL.",
        tools: tools.map((t) => ({ name: t.name, description: t.description })),
      },
      200,
    );
  }

  async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS });
  }

  async function DELETE() {
    return new Response(null, { status: 204, headers: CORS });
  }

  return { POST, GET, OPTIONS, DELETE };
}

export const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);
export const numArg = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
};
