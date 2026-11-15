// Typed chat: the language model reads a message and operates the lab with the
// same tools the voice has. Tools that move the table are recorded and sent back
// to the page to apply; tools that read data run here.
// Code generated with SI assistance (Claude Code).

import Anthropic from "@anthropic-ai/sdk";
import { UI_TOOLS, VOICE_MCP_TOOLS, voiceSystemPrompt, type UiAction } from "./voiceTools";

const MODEL = "claude-opus-5-5";

export interface CommandResult {
  say: string;
  actions: UiAction[];
  used: string[];
  fallback: boolean;
}

export async function runCommand(text: string, state: unknown): Promise<CommandResult> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return { say: "", actions: [], used: [], fallback: true };
  const client = new Anthropic();
  const serverTools = new Map(VOICE_MCP_TOOLS.map((t) => [t.name, t]));
  const tools: Anthropic.Tool[] = [
    ...UI_TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters as Anthropic.Tool.InputSchema })),
    ...VOICE_MCP_TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema as Anthropic.Tool.InputSchema })),
  ];
  const system = `${voiceSystemPrompt()}

This conversation is typed, not spoken. Tool results arrive directly as tool results, not as LAB RESULT messages, so act on them at once. Reply in one to three short sentences in the language of the message, without markdown. Say what you changed on the table and the one finding that matters.`;
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: `${text}\n\nCurrent state of the lab: ${JSON.stringify(state)}` }];
  const actions: UiAction[] = [];
  const used: string[] = [];
  let say = "";
  try {
    for (let turn = 0; turn < 5; turn++) {
      const response = await client.messages.create({ model: MODEL, max_tokens: 16000, output_config: { effort: "low" }, system, tools, messages });
      if (response.stop_reason === "refusal") return { say: "", actions: [], used: [], fallback: true };
      messages.push({ role: "assistant", content: response.content });
      const uses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (response.stop_reason !== "tool_use" || !uses.length) {
        say = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").replace(/\*\*/g, "").trim();
        break;
      }
      const results = await Promise.all(
        uses.map(async (u) => {
          const input = (u.input ?? {}) as Record<string, unknown>;
          used.push(u.name);
          const server = serverTools.get(u.name);
          if (server) {
            try {
              const out = await server.handler(input);
              return { text: typeof out === "string" ? out : JSON.stringify(out), ok: true };
            } catch (e) {
              return { text: `Tool error: ${e instanceof Error ? e.message : String(e)}`, ok: false };
            }
          }
          if (u.name === "read_controls") return { text: JSON.stringify(state), ok: true };
          actions.push({ tool: u.name, args: input });
          return { text: "Applied on the table.", ok: true };
        }),
      );
      messages.push({ role: "user", content: uses.map((u, i) => ({ type: "tool_result" as const, tool_use_id: u.id, content: results[i].text, is_error: !results[i].ok })) });
    }
  } catch {
    return { say: "", actions: [], used: [], fallback: true };
  }
  return { say, actions, used, fallback: false };
}
