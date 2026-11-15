"use client";
// System map: how the voice, the lab table, the two MCP servers, the analysts
// and NASA's PSI repository connect. A link lights up only when a real request
// travels it; "Run a live check" sends real requests end to end.
// Code generated with SI assistance (Claude Code).

import { useCallback, useEffect, useRef, useState } from "react";
import { onSignal, signal, type LinkId } from "@/lib/activity";

interface Node {
  id: string;
  x: number;
  y: number;
  w: number;
  title: string;
  sub: string;
  tone?: "nasa" | "you";
}

const H = 46;
const NODES: Node[] = [
  { id: "you", x: 14, y: 120, w: 132, title: "You", sub: "voice · typing · clicks", tone: "you" },
  { id: "clients", x: 14, y: 318, w: 132, title: "Other MCP clients", sub: "Claude Code, agents", tone: "you" },
  { id: "vapi", x: 210, y: 36, w: 150, title: "Voice assistant", sub: "Vapi · speech in and out" },
  { id: "table", x: 210, y: 176, w: 150, title: "Lab table", sub: "this page, in your browser" },
  { id: "voicemcp", x: 440, y: 60, w: 158, title: "Voice MCP", sub: "/api/voice/mcp · 7 tools" },
  { id: "agents", x: 440, y: 190, w: 158, title: "Swarm Mind analysts", sub: "prevention · detection · suppression · lead" },
  { id: "research", x: 440, y: 318, w: 158, title: "Research MCP", sub: "/api/mcp · records, models" },
  { id: "orch", x: 440, y: 412, w: 158, title: "Orchestrator MCP", sub: "/api/orchestrator/mcp · ask_lab" },
  { id: "resources", x: 676, y: 412, w: 150, title: "Resources MCP", sub: "NASA + JAXA + ESA library" },
  { id: "core", x: 676, y: 120, w: 150, title: "Query core", sub: "1,946 harmonized records" },
  { id: "claude", x: 676, y: 232, w: 150, title: "Language model", sub: "Claude · writes the brief" },
  { id: "psi", x: 876, y: 300, w: 150, title: "NASA PSI repository", sub: "psi.nasa.gov · 13.5 TB", tone: "nasa" },
];
const N = Object.fromEntries(NODES.map((n) => [n.id, n]));

const right = (n: Node) => [n.x + n.w, n.y + H / 2];
const left = (n: Node) => [n.x, n.y + H / 2];
const curve = (a: number[], b: number[]) => {
  const mx = (a[0] + b[0]) / 2;
  return `M${a[0]} ${a[1]} C${mx} ${a[1]} ${mx} ${b[1]} ${b[0]} ${b[1]}`;
};

interface Link {
  id: LinkId;
  d: string;
  label: string;
  lx: number;
  ly: number;
}

const LINKS: Link[] = [
  { id: "you-vapi", d: curve(right(N.you), left(N.vapi)), label: "speech", lx: 158, ly: 84 },
  { id: "you-table", d: curve(right(N.you), left(N.table)), label: "commands", lx: 150, ly: 204 },
  { id: "vapi-table", d: `M${N.vapi.x + 75} ${N.vapi.y + H} L${N.table.x + 75} ${N.table.y}`, label: "tool calls · results", lx: 292, ly: 124 },
  { id: "table-voicemcp", d: curve(right(N.table), left(N.voicemcp)), label: "data tools", lx: 372, ly: 108 },
  { id: "table-agents", d: curve(right(N.table), left(N.agents)), label: "ask for a brief", lx: 366, ly: 232 },
  { id: "voicemcp-core", d: curve(right(N.voicemcp), left(N.core)), label: "", lx: 0, ly: 0 },
  { id: "agents-core", d: curve(right(N.agents), left(N.core)), label: "evidence packs", lx: 604, ly: 204 },
  { id: "agents-claude", d: curve(right(N.agents), left(N.claude)), label: "", lx: 0, ly: 0 },
  { id: "clients-research", d: curve(right(N.clients), left(N.research)), label: "MCP over HTTP", lx: 246, ly: 334 },
  { id: "research-core", d: curve(right(N.research), left(N.core)), label: "", lx: 0, ly: 0 },
  { id: "research-agents", d: `M${N.research.x + 79} ${N.research.y} L${N.agents.x + 79} ${N.agents.y + H}`, label: "consult_swarm", lx: 528, ly: 282 },
  { id: "research-psi", d: curve(right(N.research), left(N.psi)), label: "live file links", lx: 700, ly: 350 },
  { id: "clients-orch", d: curve([N.clients.x + N.clients.w, N.clients.y + 34], left(N.orch)), label: "one question", lx: 250, ly: 404 },
  { id: "table-orch", d: `M${N.table.x + 110} ${N.table.y + H} C${N.table.x + 110} 330 360 435 ${N.orch.x} ${N.orch.y + H / 2}`, label: "ask the lab", lx: 330, ly: 300 },
  { id: "orch-research", d: `M${N.orch.x + 79} ${N.orch.y} L${N.research.x + 79} ${N.research.y + H}`, label: "records, models", lx: 524, ly: 392 },
  { id: "orch-resources", d: curve(right(N.orch), left(N.resources)), label: "library", lx: 618, ly: 428 },
  { id: "orch-claude", d: `M${N.orch.x + 140} ${N.orch.y} C${N.orch.x + 140} 330 ${N.claude.x + 40} 330 ${N.claude.x + 40} ${N.claude.y + H}`, label: "decides + writes", lx: 610, ly: 300 },
  { id: "table-psi", d: `M${N.table.x + 40} ${N.table.y + H} C${N.table.x + 40} 500 ${N.psi.x + 75} 500 ${N.psi.x + 75} ${N.psi.y + H}`, label: "open a NASA file", lx: 250, ly: 478 },
];

interface Pulse {
  key: number;
  link: LinkId;
}

interface Check {
  name: string;
  ok: boolean;
  ms: number;
  detail: string;
}

async function timed<T>(fn: () => Promise<T>): Promise<[T | null, number]> {
  const t0 = performance.now();
  try {
    return [await fn(), Math.round(performance.now() - t0)];
  } catch {
    return [null, Math.round(performance.now() - t0)];
  }
}

const rpc = (path: string, method: string, params?: unknown) =>
  fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }).then((r) => r.json());

export function SystemMap() {
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [hot, setHot] = useState<Record<string, number>>({}); // link id -> number of signals still glowing
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [running, setRunning] = useState(false);
  const seq = useRef(0);

  useEffect(
    () =>
      onSignal((links) => {
        setPulses((p) => [...p.slice(-30), ...links.map((link) => ({ key: ++seq.current, link }))]);
        const bump = (by: number) => setHot((h) => ({ ...h, ...Object.fromEntries(links.map((l) => [l, Math.max(0, (h[l] ?? 0) + by)])) }));
        bump(1);
        setCounts((c) => {
          const next = { ...c };
          for (const l of links) next[l] = (next[l] ?? 0) + 1;
          return next;
        });
        window.setTimeout(() => bump(-1), 1600); // let the highlight fade
      }),
    [],
  );

  const liveCheck = useCallback(async () => {
    setRunning(true);
    const out: Check[] = [];

    signal("clients-research", "research-core");
    const [tools, t1] = await timed(() => rpc("/api/mcp", "tools/list"));
    const n1 = tools?.result?.tools?.length ?? 0;
    out.push({ name: "Research MCP", ok: n1 > 0, ms: t1, detail: n1 ? `${n1} tools listed` : "no answer" });
    setChecks([...out]);

    signal("table-voicemcp", "voicemcp-core");
    const [voice, t2] = await timed(() => rpc("/api/voice/mcp", "tools/call", { name: "lab_numbers", arguments: {} }));
    const said = voice?.result?.content?.[0]?.text ?? "";
    out.push({ name: "Voice MCP → query core", ok: said.includes("records"), ms: t2, detail: said.includes("records") ? "answered from the harmonized records" : "no answer" });
    setChecks([...out]);

    signal("clients-research", "research-psi");
    const [link, t3] = await timed(() => rpc("/api/mcp", "tools/call", { name: "get_file_link", arguments: { investigation: "PSI-25", file_name: "PSI-25_Experimental table_BASS-II.csv" } }));
    const linked = (link?.result?.content?.[0]?.text ?? "").includes("https://");
    out.push({ name: "Research MCP → NASA PSI", ok: linked, ms: t3, detail: linked ? "NASA issued a live link to the BASS-II table" : "NASA did not answer" });
    setChecks([...out]);
    setRunning(false);
  }, []);

  const isHot = (id: string) => (hot[id] ?? 0) > 0;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h2 className="text-[16px] font-medium">How it connects</h2>
        <span className="text-[12.5px] text-dim">A link lights up when a real request travels it. Talk, type a command or ask the analysts and watch the path.</span>
        <button className="btn ml-auto" onClick={liveCheck} disabled={running}>{running ? "Checking…" : "Run a live check"}</button>
      </div>

      <div className="scroll">
        <svg viewBox="0 0 1040 500" className="w-full min-w-[820px]" role="img" aria-label="Diagram of how the voice assistant, the lab page, the two MCP servers, the analysts and the NASA PSI repository connect">
          {/* zones */}
          <rect x={196} y={12} width={178} height={228} fill="none" stroke="var(--line)" strokeDasharray="3 5" />
          <text x={204} y={26} fontSize={8.5} letterSpacing={1.4} fill="var(--ink-faint)" className="mono">CLIENT</text>
          <rect x={426} y={36} width={414} height={436} fill="none" stroke="var(--line)" strokeDasharray="3 5" />
          <text x={434} y={50} fontSize={8.5} letterSpacing={1.4} fill="var(--ink-faint)" className="mono">KUKULCAN FIRE LAB SERVER</text>

          {/* dataset provenance: built offline from NASA's tables */}
          <path id="prov" d={`M${N.psi.x + 75} ${N.psi.y} C${N.psi.x + 75} 180 ${N.core.x + 190} 143 ${N.core.x + N.core.w} ${N.core.y + H / 2}`} fill="none" stroke="var(--warn)" strokeWidth={1} strokeDasharray="5 4" opacity={0.75} />
          <text x={906} y={196} fontSize={8.5} letterSpacing={1} fill="var(--warn)" className="mono">
            <tspan x={868} dy={0}>BUILT FROM NASA TABLES</tspan>
            <tspan x={868} dy={11}>(HARMONIZED OFFLINE)</tspan>
          </text>

          <path d={`M${N.psi.x + 40} ${N.psi.y + H} C${N.psi.x + 40} 440 ${N.resources.x + N.resources.w + 40} 435 ${N.resources.x + N.resources.w} ${N.resources.y + H / 2}`} fill="none" stroke="var(--warn)" strokeWidth={1} strokeDasharray="5 4" opacity={0.75} />
          <text x={846} y={452} fontSize={8.5} letterSpacing={1} fill="var(--warn)" className="mono">NASA + PARTNER PAGES</text>

          {/* links */}
          {LINKS.map((l) => {
            const on = isHot(l.id);
            return (
              <g key={l.id}>
                <path id={`link-${l.id}`} d={l.d} fill="none" stroke={on ? "var(--accent)" : "var(--line-strong)"} strokeWidth={on ? 1.6 : 1} style={{ transition: "stroke 0.4s" }} />
                {l.label && (
                  <text x={l.lx} y={l.ly} fontSize={8.5} letterSpacing={0.8} fill={on ? "var(--accent)" : "var(--ink-dim)"} className="mono">
                    {l.label.toUpperCase()}
                    {counts[l.id] ? ` · ${counts[l.id]}` : ""}
                  </text>
                )}
              </g>
            );
          })}

          {/* travelling pulses */}
          {pulses.map((p) => (
            <circle key={p.key} r={3.2} fill="var(--accent)" style={{ filter: "drop-shadow(0 0 4px var(--accent))" }}>
              <animateMotion dur="1.1s" fill="freeze" begin="indefinite" ref={(el) => { try { (el as SVGAnimationElement | null)?.beginElement(); } catch {} }}>
                <mpath href={`#link-${p.link}`} />
              </animateMotion>
              <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.85;1" dur="1.1s" fill="freeze" begin="indefinite" ref={(el) => { try { (el as SVGAnimationElement | null)?.beginElement(); } catch {} }} />
            </circle>
          ))}

          {/* nodes */}
          {NODES.map((n) => {
            const active = LINKS.some((l) => isHot(l.id) && l.id.split("-").includes(n.id));
            const color = n.tone === "nasa" ? "var(--warn)" : active ? "var(--accent)" : "var(--ink)";
            return (
              <g key={n.id}>
                <rect x={n.x} y={n.y} width={n.w} height={H} fill={active ? "rgba(127,231,255,0.10)" : "rgba(4,7,12,0.92)"} stroke={color} strokeWidth={active ? 1.5 : 1} style={{ transition: "fill 0.4s" }} />
                <path d={`M${n.x} ${n.y + 8} v-8 h8 M${n.x + n.w} ${n.y + H - 8} v8 h-8`} fill="none" stroke={color} strokeWidth={1.6} />
                <text x={n.x + 10} y={n.y + 19} fontSize={12} fill={color} fontWeight={500}>{n.title}</text>
                <text x={n.x + 10} y={n.y + 34} fontSize={8.2} letterSpacing={0.4} fill="var(--ink-dim)" className="mono">{n.sub}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 grid gap-3 md:grid-cols-3">
        {(checks ?? []).map((c) => (
          <div key={c.name} className="border-l-2 pl-3" style={{ borderColor: c.ok ? "var(--ok)" : "var(--danger)" }}>
            <div className="label" style={{ color: c.ok ? "var(--ok)" : "var(--danger)" }}>{c.ok ? "reachable" : "failed"} · {c.ms} ms</div>
            <div className="text-[13px]">{c.name}</div>
            <div className="text-[12px] text-dim">{c.detail}</div>
          </div>
        ))}
        {!checks && (
          <p className="text-[12px] leading-relaxed text-dim md:col-span-3">
            The records the lab reads were harmonized ahead of time from NASA&apos;s experimental tables, so queries are instant and work offline. NASA&apos;s servers are contacted live only to issue a link when you open a document or video, which stays on NASA&apos;s side. Other MCP clients reach the research server directly; their traffic does not pass through this page, so it is not animated here.
          </p>
        )}
      </div>
    </div>
  );
}
