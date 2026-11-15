"use client";
// The lab table. One fixed screen, no page scrolling: the environment stays on
// the left, a central stage swaps views on request (voice, typed command or
// click), and the ranking plus the voice console sit on the right.
// Code generated with SI assistance (Claude Code).

import { useCallback, useMemo, useState } from "react";
import type { Brief } from "@/lib/agents";
import { signal } from "@/lib/activity";
import { ENVIRONMENTS, environmentById } from "@/lib/environments";
import { TESTS, gaps as computeGaps, getInvestigation, label, nearestTests, queryTests, rankInvestigations, stats as computeStats, type PhaseGroup } from "@/lib/lab";
import type { FileEntry } from "@/lib/types";
import { PSI_PER_ATM } from "@/lib/types";
import type { UiAction } from "@/lib/voiceTools";
import { EnvironmentDrawing } from "./Diagrams";
import { EvidenceMap } from "./EvidenceMap";
import { FlameBench } from "./FlameBench";
import { FloatingDock } from "./FloatingDock";
import { BriefPanel, ConnectPanel, GapsPanel, InvestigationDetail, InvestigationsTable, MaterialsTable, Ranking, TestsTable } from "./Panels";
import { SystemMap } from "./SystemMap";
import { VoiceDock } from "./VoiceDock";

export type View = "fire" | "map" | "investigations" | "tests" | "materials" | "gaps" | "brief" | "connect" | "detail";

const VIEWS: [View, string, string][] = [
  ["fire", "Fire", "What happens to a flame in this cabin"],
  ["map", "Evidence map", "Has anyone tested an atmosphere like this?"],
  ["investigations", "Investigations", "All combustion investigations, scored for this design"],
  ["tests", "Test records", "Every harmonized record, searchable, with CSV download"],
  ["materials", "Materials", "What was burned or overheated, and at what oxygen level"],
  ["gaps", "Gaps", "What nobody has tested yet"],
  ["brief", "Analysts", "A cited brief from the Swarm Mind agents"],
  ["connect", "Connections", "How the voice, the MCP servers and NASA PSI connect"],
];

// Words a person might use for each view, in English or Spanish.
const VIEW_ALIASES: Record<string, View> = {
  fire: "fire", flame: "fire", bench: "fire", fuego: "fire", flama: "fire",
  map: "map", mapa: "map", evidence: "map", ranking: "map",
  investigations: "investigations", investigaciones: "investigations",
  tests: "tests", tables: "tests", table: "tests", records: "tests", tablas: "tests", pruebas: "tests",
  materials: "materials", materiales: "materials",
  gaps: "gaps", huecos: "gaps",
  brief: "brief", analysts: "brief", analistas: "brief", informe: "brief",
  connect: "connect", connections: "connect", conexiones: "connect", nodes: "connect", nodos: "connect",
};

const PHASES: [PhaseGroup, string][] = [
  ["solid", "Solid materials"],
  ["liquid", "Liquid fuels"],
  ["gas", "Gas flames"],
];

export function Lab({ files }: { files: Record<string, FileEntry[]> }) {
  const [envId, setEnvId] = useState("base");
  const [o2, setO2] = useState(34);
  const [psi, setPsi] = useState(8.2);
  const [phase, setPhase] = useState("");
  const [material, setMaterial] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<View>("fire");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  const env = ENVIRONMENTS.find((e) => e.id === envId)!;
  const custom = env.o2_pct !== o2 || env.pressure_psi !== psi;
  const target = useMemo(() => ({ o2_pct: o2, pressure_atm: psi / PSI_PER_ATM }), [o2, psi]);

  const stats = useMemo(() => computeStats(), []);
  const ranked = useMemo(() => rankInvestigations(target), [target]);
  const scores = useMemo(() => new Map(ranked.map((r) => [r.investigation.accession, r.score])), [ranked]);
  const nearestIds = useMemo(() => new Set(nearestTests(target, 8).map((n) => n.item.id)), [target]);
  const gapList = useMemo(() => computeGaps(target), [target]);
  const filtered = useMemo(() => queryTests({ phase: phase || undefined, material: material || undefined }), [phase, material]);
  const selectedInv = selected ? getInvestigation(selected) : undefined;

  // Plain-language verdict per kind of fuel: was anything tested within one step of this design?
  const verdicts = useMemo(
    () =>
      PHASES.map(([g, name]) => {
        const near = nearestTests({ ...target, phase: g }, 2000);
        const within = near.filter((n) => n.distance <= 1).length;
        const first = near[0];
        const what = first ? `${first.item.acronym}, ${first.item.material ?? first.item.fuel}` : "";
        const firstO2 = first?.item.o2_max ?? o2;
        return {
          g,
          name,
          tone: within > 0 ? "ok" : "danger",
          headline: within > 0 ? `Tested near here · ${within} record${within === 1 ? "" : "s"}` : "Never tested near here",
          detail: !first
            ? "No record carries an oxygen value"
            : within > 0
              ? `Closest: ${what} at ${firstO2}% oxygen`
              : `Closest is ${what} at ${firstO2}% oxygen, ${Math.abs(o2 - firstO2).toFixed(1)} points ${o2 > firstO2 ? "below" : "above"} this design`,
        };
      }),
    [target, o2],
  );

  const pickEnv = useCallback((id: string) => {
    const e = environmentById(id);
    if (!e) return;
    setEnvId(e.id);
    setO2(e.o2_pct);
    setPsi(e.pressure_psi);
  }, []);

  const runBrief = useCallback(
    async (question: string, fast: boolean) => {
      setBriefLoading(true);
      signal("table-agents", "agents-core");
      if (!fast) signal("agents-claude");
      try {
        const r = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, o2_pct: o2, pressure_psi: psi, environment: custom ? undefined : envId, material: material || undefined, fast }),
        });
        setBrief(await r.json());
      } catch {
        setBrief(null);
      } finally {
        setBriefLoading(false);
      }
    },
    [o2, psi, envId, custom, material],
  );

  const openInvestigation = useCallback((acc: string) => {
    setSelected(acc);
    setView("detail");
  }, []);

  // Actions arriving from the voice assistant or typed commands. Nothing scrolls:
  // every request changes what the stage shows.
  const onAction = useCallback(
    (a: UiAction) => {
      const s = (v: unknown) => (typeof v === "string" ? v : "");
      const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(+v) ? +v : undefined);
      switch (a.tool) {
        case "show_environment":
          pickEnv(s(a.args.environment));
          break;
        case "set_atmosphere": {
          const o = n(a.args.o2_pct);
          const p = n(a.args.pressure_psi);
          if (o != null) setO2(Math.min(100, Math.max(10, Math.round(o * 10) / 10)));
          if (p != null) setPsi(Math.min(45, Math.max(3, Math.round(p * 10) / 10)));
          break;
        }
        case "open_panel": {
          const v = VIEW_ALIASES[s(a.args.panel).toLowerCase().trim()];
          if (v) setView(v);
          break;
        }
        case "focus_investigation": {
          const inv = getInvestigation(s(a.args.id));
          if (inv) openInvestigation(inv.accession);
          break;
        }
        case "filter_tests":
          setPhase(s(a.args.phase));
          setMaterial(s(a.args.material));
          break;
        case "write_brief":
          setView("brief");
          runBrief(s(a.args.question) || "What does the evidence say about fire safety for this design?", false);
          break;
      }
    },
    [pickEnv, openInvestigation, runBrief],
  );

  const current = VIEWS.find(([v]) => v === view);

  return (
    <div className="flex min-h-screen flex-col px-3 pb-2 pt-2 lg:h-screen lg:overflow-hidden lg:px-4">
      {/* header with the dataset numbers on one line */}
      <header className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-line pb-2">
        <div>
          <div className="label !text-[9px]">Project Swarm Mind Kukulcan · NASA Space Apps 2026 · Flame in Freefall</div>
          <h1 className="text-[21px] font-light leading-none tracking-tight">
            Kukulcan <span className="text-accent">Fire Lab</span>
          </h1>
        </div>
        <dl className="ml-auto flex flex-wrap items-end gap-x-5 gap-y-1" aria-label="Dataset metrics">
          {[
            [stats.investigations, "investigations"],
            [stats.records.toLocaleString(), "harmonized records"],
            [`${stats.terabytes} TB`, "NASA source data"],
            [stats.publications, "publications"],
            [`${stats.max_o2_pct}%`, "highest oxygen tested"],
            [stats.tests_at_30pct_o2_or_more, "tests at 30% oxygen or more"],
            [stats.solid_tests_at_30pct_o2_or_more, "of those on solids", true],
          ].map(([v, k, alert]) => (
            <div key={String(k)} className="leading-none">
              <dd className="mono text-[17px]" style={{ color: alert ? "var(--danger)" : undefined }}>{v}</dd>
              <dt className="label mt-1 !text-[8.5px]">{k}</dt>
            </div>
          ))}
        </dl>
      </header>

      <div className="mt-2 grid min-h-0 flex-1 gap-2 lg:grid-cols-[292px_minmax(0,1fr)_350px] lg:grid-rows-[minmax(0,1fr)]">
        {/* left: the environment on the table, always visible */}
        <aside className="panel scroll flex min-h-0 flex-col p-3" style={{ overflowX: "hidden" }}>
          <div className="label">Environment on the table</div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {ENVIRONMENTS.map((e) => (
              <button key={e.id} onClick={() => pickEnv(e.id)} aria-pressed={envId === e.id} className={`border px-1 pb-1 pt-0.5 text-center transition-colors hover:border-accent ${envId === e.id ? "border-accent bg-white/[0.05] text-accent" : "border-line text-dim"}`}>
                <EnvironmentDrawing id={e.id} notes={false} className="h-[40px] w-full" />
                <span className="mono block text-[8.5px] tracking-[0.14em]">{e.short}</span>
              </button>
            ))}
          </div>
          <EnvironmentDrawing id={envId} className="mt-1 min-h-[110px] w-full flex-1 text-ink" />
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[15px] font-medium">{env.name}</span>
            <span className="label text-right">{env.gravity}</span>
          </div>
          <p className="mt-1 text-[12px] leading-snug text-dim">{env.concern}</p>

          <div className="mt-2 space-y-1 border-t border-line pt-2">
            <label className="block">
              <span className="label flex justify-between"><span>Oxygen</span><span className="text-[13px] text-ink">{o2}%</span></span>
              <input type="range" min={10} max={100} step={0.5} value={o2} onChange={(e) => setO2(+e.target.value)} />
            </label>
            <label className="block">
              <span className="label flex justify-between"><span>Pressure</span><span className="text-[13px] text-ink">{psi} psi · {(psi / PSI_PER_ATM).toFixed(2)} atm</span></span>
              <input type="range" min={3} max={45} step={0.1} value={psi} onChange={(e) => setPsi(+e.target.value)} />
            </label>
            <div className="text-[11px] leading-snug text-dim">
              <span className="mono mr-1.5 border border-line px-1 py-px text-[9px] uppercase tracking-widest" style={{ color: custom ? "var(--warn)" : env.basis === "challenge" ? "var(--ok)" : undefined }}>
                {custom ? "custom" : env.basis === "challenge" ? "from the challenge" : "preset"}
              </span>
              {custom ? "You moved the atmosphere away from the preset." : env.basisNote}
              {custom && <button className="ml-1 underline underline-offset-2 hover:text-accent" onClick={() => pickEnv(envId)}>Reset</button>}
            </div>
          </div>
        </aside>

        {/* centre: verdict + the stage */}
        <main className="flex min-h-0 min-w-0 flex-col gap-2">
          <section className="grid gap-2 sm:grid-cols-3" aria-label="Has this atmosphere been tested?">
            {verdicts.map((v) => (
              <button
                key={v.g}
                className="panel px-3 py-2 text-left transition-colors hover:border-accent"
                onClick={() => { setPhase(v.g); setMaterial(""); setView("map"); }}
                title="Show these records on the evidence map"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: `var(--${v.g})` }} />
                  <span className="label">{v.name}</span>
                  <span className="mono ml-auto whitespace-nowrap text-[9.5px] text-faint">{o2}% O₂ · {psi} psi</span>
                </div>
                <div className="mt-1 text-[14.5px] font-medium leading-tight" style={{ color: v.tone === "ok" ? "var(--ok)" : "var(--danger)" }}>{v.headline}</div>
                <div className="mt-0.5 truncate text-[11.5px] text-dim" title={v.detail}>{v.detail}</div>
              </button>
            ))}
          </section>

          <section className="panel flex min-h-0 flex-1 flex-col">
            <nav className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1.5" role="tablist" aria-label="Stage views">
              {VIEWS.map(([v, name]) => (
                <button key={v} role="tab" aria-selected={view === v} className={`btn !px-2.5 !py-1 ${view === v ? "on" : ""}`} onClick={() => setView(v)}>
                  {name}
                </button>
              ))}
              {view === "detail" && selectedInv && <span className="btn on !px-2.5 !py-1">{label(selectedInv)}</span>}
              <span className="ml-auto hidden truncate pl-2 text-[11.5px] text-dim xl:block">{view === "detail" ? "Investigation detail" : current?.[2]}</span>
            </nav>

            <div className="scroll stage min-h-0 flex-1 p-3" role="tabpanel">
              {view === "fire" && <FlameBench o2={o2} psi={psi} onChange={(o, p) => { setO2(o); setPsi(p); }} />}

              {view === "map" && (
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-[12.5px] text-dim">Each dot is a real test, placed by its oxygen and pressure. If your design (white ring) sits in empty space, nobody has burned anything there.</span>
                    <span className="ml-auto flex gap-1.5">
                      {[["", "All"], ["solid", "Solids"], ["liquid", "Liquids"], ["gas", "Gases"]].map(([v, name]) => (
                        <button key={v} className="btn !px-2 !py-1" aria-pressed={phase === v} onClick={() => setPhase(v)}>{name}</button>
                      ))}
                    </span>
                  </div>
                  {material && (
                    <div className="label mb-1">
                      Material filter: <span className="text-accent">{material}</span>
                      <button className="ml-2 underline underline-offset-2" onClick={() => setMaterial("")}>clear</button>
                    </div>
                  )}
                  <div className="mx-auto" style={{ maxWidth: "calc((100vh - 330px) * 1.55)" }}>
                    <EvidenceMap tests={filtered} o2={o2} psi={psi} nearestIds={nearestIds} onPick={(o, p) => { setO2(o); setPsi(p); }} />
                  </div>
                </div>
              )}

              {view === "investigations" && <InvestigationsTable onOpen={openInvestigation} scores={scores} />}
              {view === "tests" && (
                <div>
                  {(phase || material) && (
                    <div className="label mb-2">
                      Filtered to {[phase && `${phase} fuels`, material].filter(Boolean).join(" · ")}
                      <button className="ml-2 underline underline-offset-2 hover:text-accent" onClick={() => { setPhase(""); setMaterial(""); }}>clear</button>
                    </div>
                  )}
                  <TestsTable tests={filtered} total={TESTS.length} />
                </div>
              )}
              {view === "materials" && <MaterialsTable onFilter={(m) => { setMaterial(m); setPhase(""); setView("tests"); }} />}
              {view === "gaps" && <GapsPanel gaps={gapList} />}
              {view === "brief" && <BriefPanel brief={brief} loading={briefLoading} onRun={runBrief} hasDesign={`${o2}% oxygen at ${psi} psi${custom ? "" : ` (${env.name})`}`} />}
              {view === "detail" && selectedInv && <InvestigationDetail inv={selectedInv} files={files[selectedInv.accession] ?? []} onClose={() => setView("investigations")} />}

              {/* Kept mounted so link counts and check results survive view changes. */}
              <div className="space-y-5" hidden={view !== "connect"}>
                <SystemMap />
                <div className="border-t border-line pt-4">
                  <ConnectPanel />
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* right: ranking and the voice console */}
        <aside className="flex min-h-0 min-w-0 flex-col gap-2">
          <div className="panel flex min-h-0 flex-1 flex-col p-3">
            <div className="label mb-2">Investigations ranked for this design</div>
            <Ranking ranked={ranked} onOpen={openInvestigation} selected={view === "detail" ? selected : null} compact />
          </div>
          {/* Sits here by default; drag it by its header to float it anywhere. */}
          <FloatingDock>
            <VoiceDock o2={o2} psi={psi} onAction={onAction} />
          </FloatingDock>
        </aside>
      </div>

      <footer
        className="mt-1.5 truncate text-[10.5px] text-faint"
        title="Records come from the experimental tables of NASA's Physical Sciences Informatics repository, harmonized to common units. The lab reports what was tested; it does not certify any material or design as safe, and PSI holds no partial-gravity data. Code, line drawings and analyst text were produced with SI assistance (Claude); spoken replies are synthetic. Not affiliated with or endorsed by NASA."
      >
        Data: NASA Physical Sciences Informatics, {stats.investigations_with_tables} experimental tables harmonized · Reports what was tested, never certifies a design as safe · No partial-gravity data in PSI · Code, drawings, analyst text and voice produced with SI (Claude) · Not affiliated with or endorsed by NASA
      </footer>
    </div>
  );
}
