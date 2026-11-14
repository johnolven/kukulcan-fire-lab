"use client";
// The lab table: environment drawings, design atmosphere, evidence map,
// ranking, flame bench, data tables, analysts and the voice console.
// Code generated with SI assistance (Claude Code).

import { useCallback, useMemo, useRef, useState } from "react";
import type { Brief } from "@/lib/agents";
import { ENVIRONMENTS, environmentById } from "@/lib/environments";
import { TESTS, gaps as computeGaps, getInvestigation, label, nearestTests, queryTests, rankInvestigations, stats as computeStats, describeTest } from "@/lib/lab";
import type { FileEntry } from "@/lib/types";
import { PSI_PER_ATM } from "@/lib/types";
import type { UiAction } from "@/lib/voiceTools";
import { EnvironmentDrawing } from "./Diagrams";
import { EvidenceMap } from "./EvidenceMap";
import { FlameBench } from "./FlameBench";
import { BriefPanel, ConnectPanel, GapsPanel, InvestigationDetail, InvestigationsTable, MaterialsTable, Ranking, TestsTable } from "./Panels";
import { VoiceDock } from "./VoiceDock";

type Tab = "bench" | "investigations" | "tests" | "materials" | "gaps" | "brief" | "connect";
const TABS: [Tab, string][] = [
  ["bench", "Flame bench"],
  ["investigations", "Investigations"],
  ["tests", "Test records"],
  ["materials", "Materials"],
  ["gaps", "Evidence gaps"],
  ["brief", "Analysts"],
  ["connect", "Connect (MCP)"],
];

export function Lab({ files }: { files: Record<string, FileEntry[]> }) {
  const [envId, setEnvId] = useState("base");
  const [o2, setO2] = useState(34);
  const [psi, setPsi] = useState(8.2);
  const [phase, setPhase] = useState("");
  const [material, setMaterial] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("bench");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const env = ENVIRONMENTS.find((e) => e.id === envId)!;
  const custom = env.o2_pct !== o2 || env.pressure_psi !== psi;
  const target = useMemo(() => ({ o2_pct: o2, pressure_atm: psi / PSI_PER_ATM }), [o2, psi]);

  const stats = useMemo(() => computeStats(), []);
  const ranked = useMemo(() => rankInvestigations(target), [target]);
  const scores = useMemo(() => new Map(ranked.map((r) => [r.investigation.accession, r.score])), [ranked]);
  const nearest = useMemo(() => nearestTests(target, 8), [target]);
  const nearestSolid = useMemo(() => nearestTests({ ...target, phase: "solid" }, 1)[0], [target]);
  const nearestIds = useMemo(() => new Set(nearest.map((n) => n.item.id)), [nearest]);
  const gapList = useMemo(() => computeGaps(target), [target]);
  const filtered = useMemo(() => queryTests({ phase: phase || undefined, material: material || undefined }), [phase, material]);
  const selectedInv = selected ? getInvestigation(selected) : undefined;

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

  const openTab = useCallback((t: Tab) => {
    setTab(t);
    requestAnimationFrame(() => tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  // Actions arriving from the voice assistant or typed commands.
  const onAction = useCallback(
    (a: UiAction) => {
      const s = (v: unknown) => (typeof v === "string" ? v : "");
      const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(+v) ? +v : undefined);
      switch (a.tool) {
        case "show_environment":
          pickEnv(s(a.args.environment));
          mapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          break;
        case "set_atmosphere": {
          const o = n(a.args.o2_pct);
          const p = n(a.args.pressure_psi);
          if (o != null) setO2(Math.min(100, Math.max(10, Math.round(o * 10) / 10)));
          if (p != null) setPsi(Math.min(45, Math.max(3, Math.round(p * 10) / 10)));
          break;
        }
        case "open_panel": {
          const p = s(a.args.panel);
          if (p === "map" || p === "ranking") mapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          else if (TABS.some(([t]) => t === p)) openTab(p as Tab);
          break;
        }
        case "focus_investigation": {
          const inv = getInvestigation(s(a.args.id));
          if (inv) {
            setSelected(inv.accession);
            requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
          }
          break;
        }
        case "filter_tests":
          setPhase(s(a.args.phase));
          setMaterial(s(a.args.material));
          break;
        case "write_brief":
          openTab("brief");
          runBrief(s(a.args.question) || "What does the evidence say about fire safety for this design?", false);
          break;
      }
    },
    [pickEnv, openTab, runBrief],
  );

  const openInvestigation = useCallback((acc: string) => {
    setSelected(acc);
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  const solidGap = nearestSolid ? o2 - (nearestSolid.item.o2_max ?? 0) : null;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pb-16 pt-4 lg:px-6">
      {/* header */}
      <header className="flex flex-wrap items-end gap-x-6 gap-y-2 border-b border-line pb-3">
        <div>
          <div className="label">Project Swarm Mind Kukulcan · NASA Space Apps 2026 · Flame in Freefall</div>
          <h1 className="mt-0.5 text-[26px] font-light leading-none tracking-tight">
            Kukulcan <span className="text-accent">Fire Lab</span>
          </h1>
        </div>
        <p className="max-w-[560px] text-[12.5px] leading-snug text-dim">
          Pick the cabin you are designing. The lab shows which of NASA&apos;s microgravity combustion tests sit near it, which investigations matter most, and what nobody has tested yet.
        </p>
        <a className="label ml-auto underline decoration-white/30 underline-offset-4 hover:text-accent" href="https://psi.nasa.gov/physci/repo/search?q=combustion" target="_blank" rel="noreferrer">
          Data: NASA Physical Sciences Informatics ↗
        </a>
      </header>

      {/* headline metrics */}
      <section className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8" aria-label="Dataset metrics">
        {[
          [stats.investigations, "combustion investigations"],
          [stats.records.toLocaleString(), "harmonized records"],
          [stats.individual_tests.toLocaleString(), "individual burns"],
          [`${stats.terabytes} TB`, `source data, ${stats.files.toLocaleString()} files`],
          [stats.publications, "linked publications"],
          [`${stats.max_o2_pct}%`, "highest oxygen tested"],
          [stats.tests_at_30pct_o2_or_more, "tests at 30% oxygen or more"],
          [stats.solid_tests_at_30pct_o2_or_more, "of those on solid materials", true],
        ].map(([v, k, alert]) => (
          <div key={String(k)} className="panel px-3 py-2">
            <div className="mono text-[22px] leading-none" style={{ color: alert ? "var(--danger)" : undefined }}>{v}</div>
            <div className="label mt-1.5 leading-tight">{k}</div>
          </div>
        ))}
      </section>

      {/* lab table */}
      <section className="mt-3 grid gap-3 xl:grid-cols-[330px_minmax(0,1fr)_370px]">
        {/* environments */}
        <div className="panel p-3">
          <div className="label">Environment on the table</div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {ENVIRONMENTS.map((e) => (
              <button key={e.id} onClick={() => pickEnv(e.id)} aria-pressed={envId === e.id} className={`border px-1 pb-1 pt-0.5 text-center transition-colors hover:border-accent ${envId === e.id ? "border-accent bg-white/[0.05] text-accent" : "border-line text-dim"}`}>
                <EnvironmentDrawing id={e.id} notes={false} className="h-[52px] w-full" />
                <span className="mono block text-[9px] tracking-[0.14em]">{e.short}</span>
              </button>
            ))}
          </div>
          <EnvironmentDrawing id={envId} className="mt-2 h-[210px] w-full text-ink" />
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] font-medium">{env.name}</span>
            <span className="label">{env.gravity}</span>
          </div>
          <p className="mt-1 text-[12px] leading-snug text-dim">{env.concern}</p>

          <div className="mt-3 space-y-1.5 border-t border-line pt-3">
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
        </div>

        {/* evidence map */}
        <div className="panel min-w-0 p-3" ref={mapRef}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="label">Evidence map · where NASA has burned something</span>
            <span className="ml-auto flex gap-1.5">
              {[["", "All"], ["solid", "Solids"], ["liquid", "Liquids"], ["gas", "Gases"]].map(([v, name]) => (
                <button key={v} className="btn !px-2 !py-1" aria-pressed={phase === v} onClick={() => setPhase(v)}>{name}</button>
              ))}
            </span>
          </div>
          {material && (
            <div className="label mt-1.5">
              Material filter: <span className="text-accent">{material}</span>
              <button className="ml-2 underline underline-offset-2" onClick={() => setMaterial("")}>clear</button>
            </div>
          )}
          <div className="mt-1">
            <EvidenceMap tests={filtered} o2={o2} psi={psi} nearestIds={nearestIds} onPick={(o, p) => { setO2(o); setPsi(p); }} />
          </div>

          <div className="mt-3 grid gap-3 border-t border-line pt-3 md:grid-cols-3">
            <div>
              <div className="label">Closest test of any kind</div>
              <div className="mt-1 text-[12.5px] leading-snug">{nearest[0] ? describeTest(nearest[0].item) : "No record carries oxygen values."}</div>
              {nearest[0] && <div className="mono mt-1 text-[11px]" style={{ color: nearest[0].distance < 0.5 ? "var(--ok)" : nearest[0].distance < 1.5 ? "var(--warn)" : "var(--danger)" }}>{nearest[0].distance.toFixed(2)} steps away</div>}
            </div>
            <div>
              <div className="label">Closest solid-material test</div>
              <div className="mt-1 text-[12.5px] leading-snug">{nearestSolid ? describeTest(nearestSolid.item) : "None with oxygen values."}</div>
              {solidGap != null && <div className="mono mt-1 text-[11px]" style={{ color: solidGap > 3 ? "var(--danger)" : "var(--ok)" }}>{solidGap > 0 ? `${solidGap.toFixed(1)} oxygen points below this design` : "at or above this oxygen level"}</div>}
            </div>
            <div>
              <div className="label">Verdict</div>
              <div className="mt-1 text-[12.5px] leading-snug">{gapList[0].title}.</div>
              <button className="mono mt-1 text-[11px] text-accent underline underline-offset-2" onClick={() => openTab("gaps")}>See all {gapList.length} gaps</button>
            </div>
          </div>
        </div>

        {/* ranking + voice */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="panel p-3">
            <div className="label mb-2">Investigations ranked for this design</div>
            <Ranking ranked={ranked.slice(0, 8)} onOpen={openInvestigation} selected={selected} compact />
            <button className="mono mt-1 text-[11px] text-accent underline underline-offset-2" onClick={() => openTab("investigations")}>All {ranked.length} investigations</button>
          </div>
          <div className="min-h-[250px] flex-1">
            <VoiceDock o2={o2} psi={psi} onAction={onAction} />
          </div>
        </div>
      </section>

      {/* investigation detail */}
      <div ref={detailRef} className="scroll-mt-4">
        {selectedInv && (
          <div className="mt-3">
            <InvestigationDetail inv={selectedInv} files={files[selectedInv.accession] ?? []} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>

      {/* tabs */}
      <section className="mt-3 scroll-mt-4" ref={tabsRef}>
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {TABS.map(([t, name]) => (
            <button key={t} role="tab" aria-selected={tab === t} className={`btn ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{name}</button>
          ))}
        </div>
        <div className="panel mt-2 p-4" role="tabpanel">
          {tab === "bench" && (
            <>
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
                <h2 className="text-[16px] font-medium">Flame bench</h2>
                <span className="text-[12.5px] text-dim">Change the air around a flame and see what the closest real tests did. An emulator anchored to records, not a physics simulation.</span>
              </div>
              <FlameBench o2={o2} psi={psi} onChange={(o, p) => { setO2(o); setPsi(p); }} />
            </>
          )}
          {tab === "investigations" && <InvestigationsTable onOpen={openInvestigation} scores={scores} />}
          {tab === "tests" && <TestsTable tests={filtered} total={TESTS.length} />}
          {tab === "materials" && <MaterialsTable onFilter={(m) => { setMaterial(m); setTab("tests"); }} />}
          {tab === "gaps" && <GapsPanel gaps={gapList} />}
          {tab === "brief" && <BriefPanel brief={brief} loading={briefLoading} onRun={runBrief} hasDesign={`${o2}% oxygen at ${psi} psi${custom ? "" : ` (${env.name})`}`} />}
          {tab === "connect" && <ConnectPanel />}
        </div>
      </section>

      <footer className="mt-6 space-y-1 border-t border-line pt-3 text-[11.5px] leading-relaxed text-dim">
        <p>
          Records come from the experimental tables of {stats.investigations_with_tables} investigations in NASA&apos;s Physical Sciences Informatics repository, harmonized to common units. Values the source does not give are left blank; assumed values are marked. The lab reports what was tested. It does not certify any material or design as safe, and PSI holds no partial-gravity data.
        </p>
        <p>
          SI disclosure: code, line drawings and analyst text were produced with SI assistance (Claude). Spoken replies are synthetic. This project is not affiliated with or endorsed by NASA.
        </p>
        <p className="mono text-[10px] text-faint">Top match for this design: {label(ranked[0].investigation)} · {ranked[0].score}/100</p>
      </footer>
    </div>
  );
}
