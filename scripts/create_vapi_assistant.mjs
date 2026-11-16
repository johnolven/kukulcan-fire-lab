#!/usr/bin/env node
// Creates the Kukulcan Fire Lab voice assistant in your Vapi account, with the
// lab's instructions and all 13 tools (6 that move the table, 7 that read data).
//
// Code generated with SI assistance (Claude Code).
//
// Usage:  node scripts/create_vapi_assistant.mjs [--lang es|en|multi] [--dry-run] [--update]
//         --update rewrites the prompt and tools of the assistant already in .env (keeps its voice)
// Needs:  VAPI_PRIVATE_KEY in .env (server-side key; never commit it, never prefix it NEXT_PUBLIC_)
//         the app running locally (npm run dev) so the prompt and tools are read from one place
//
// If NEXT_PUBLIC_VAPI_ASSISTANT_ID already points at an assistant, its voice and
// transcriber are copied so the new assistant sounds the same. The old one is left untouched.
// On success the new id is written to NEXT_PUBLIC_VAPI_ASSISTANT_ID in .env.

import { readFileSync, writeFileSync } from "node:fs";

const ENV_PATH = new URL("../.env", import.meta.url);
const API = "https://api.vapi.ai";
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const update = args.includes("--update");
const lang = args.includes("--lang") ? args[args.indexOf("--lang") + 1] : "multi";
const appUrl = process.env.APP_URL || "http://localhost:3977";

function readEnv() {
  const out = {};
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = readEnv();
const key = env.VAPI_PRIVATE_KEY || process.env.VAPI_PRIVATE_KEY;
if (!key && !dryRun) {
  console.error("VAPI_PRIVATE_KEY is missing. Add it to .env (Vapi dashboard > API keys > private key) and run again.");
  process.exit(1);
}

const cfg = await fetch(`${appUrl}/api/voice/config`).then((r) => r.json()).catch(() => null);
if (!cfg?.systemPrompt) {
  console.error(`Could not read the voice config from ${appUrl}. Start the app first (npm run dev -- -p 3977).`);
  process.exit(1);
}

const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

// Reuse the voice and transcriber of the assistant already configured, if any.
let voice = { provider: "vapi", voiceId: "Elliot" };
let transcriber = { provider: "deepgram", model: "nova-2", language: lang };
if (env.NEXT_PUBLIC_VAPI_ASSISTANT_ID && key) {
  const res = await fetch(`${API}/assistant/${env.NEXT_PUBLIC_VAPI_ASSISTANT_ID}`, { headers });
  if (res.ok) {
    const old = await res.json();
    if (old.voice) voice = old.voice;
    if (old.transcriber) transcriber = old.transcriber;
    console.log(`Copying voice (${voice.provider}) and transcriber (${transcriber.provider}) from the existing assistant "${old.name ?? "unnamed"}".`);
  } else {
    console.log(`Existing assistant id could not be read (HTTP ${res.status}); using default voice and transcriber.`);
  }
}

const body = {
  name: "Kukulcan Fire Lab",
  firstMessage: lang === "en" ? "Welcome to the lab. Where would you like to start: spacecraft design, materials, capsule, station, or the fire laboratory?" : "Bienvenido al laboratorio. ¿Por dónde quieres empezar: diseño de la nave, materiales, cápsula, estación o laboratorio de fuego?",
  model: {
    provider: "openai",
    model: "gpt-4.1",
    messages: [{ role: "system", content: cfg.systemPrompt }],
    // Client-side tools: the lab page executes them and returns data-tool results to the call.
    tools: [...cfg.uiTools, ...cfg.dataTools].map((t) => ({ type: "function", async: true, function: t })),
  },
  voice,
  transcriber,
  clientMessages: ["transcript", "tool-calls"],
};

console.log(`Assistant: ${body.model.tools.length} tools (${cfg.uiTools.length} table, ${cfg.dataTools.length} data), prompt ${cfg.systemPrompt.length} chars, transcriber language ${transcriber.language ?? "default"}.`);
if (dryRun) {
  console.log("Dry run: nothing was sent to Vapi.");
  process.exit(0);
}

if (update) {
  const id = env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
  if (!id) {
    console.error("--update needs NEXT_PUBLIC_VAPI_ASSISTANT_ID in .env.");
    process.exit(1);
  }
  const r = await fetch(`${API}/assistant/${id}`, { method: "PATCH", headers, body: JSON.stringify({ model: body.model, clientMessages: body.clientMessages, firstMessage: body.firstMessage }) });
  if (!r.ok) {
    console.error(`Vapi rejected the update (HTTP ${r.status}): ${(await r.text()).slice(0, 600)}`);
    process.exit(1);
  }
  const updated = await r.json();
  console.log(`Updated assistant "${updated.name}": prompt and ${updated.model?.tools?.length ?? 0} tools refreshed.`);
  process.exit(0);
}

const res = await fetch(`${API}/assistant`, { method: "POST", headers, body: JSON.stringify(body) });
const text = await res.text();
if (!res.ok) {
  console.error(`Vapi rejected the assistant (HTTP ${res.status}): ${text.slice(0, 600)}`);
  process.exit(1);
}
const created = JSON.parse(text);
const raw = readFileSync(ENV_PATH, "utf8");
const line = `NEXT_PUBLIC_VAPI_ASSISTANT_ID=${created.id}`;
writeFileSync(ENV_PATH, /^NEXT_PUBLIC_VAPI_ASSISTANT_ID=.*$/m.test(raw) ? raw.replace(/^NEXT_PUBLIC_VAPI_ASSISTANT_ID=.*$/m, line) : `${raw.trimEnd()}\n${line}\n`);
console.log(`Created assistant "${created.name}". Its id is now in .env; restart the app to use it.`);
