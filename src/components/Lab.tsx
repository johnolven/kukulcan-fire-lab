"use client";
// The lab table. One fixed screen, no page scrolling: the environment stays on
// the left, a central stage swaps views on request (voice, typed command or
// click), and the ranking plus the voice console sit on the right.
// Code generated with SI assistance (Claude Code).

import { ThemeSwitch } from "./ThemeSwitch";
import { initTheme } from "@/lib/theme";
import { initLang } from "@/lib/i18n";
import { LangSwitch } from "./LangSwitch";
import { VoiceButton } from "./VoiceButton";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Brief } from "@/lib/agents";
import { signal } from "@/lib/activity";
import { ENVIRONMENTS, environmentById } from "@/lib/environments";
import { TESTS, gaps as computeGaps, getInvestigation, label, nearestTests, queryTests, rankInvestigations, stats as computeStats, type PhaseGroup } from "@/lib/lab";
import type { FileEntry } from "@/lib/types";
import { PSI_PER_ATM } from "@/lib/types";
import { CONTROLS, controls, setTableState, type ActionId, type ControlId } from "@/lib/controls";
import { useControl, useT } from "@/lib/useControl";
import type { UiAction } from "@/lib/voiceTools";
import { AnalyticsView, requestChart } from "./AnalyticsView";
import { EnvironmentDrawing } from "./Diagrams";
import { EvidenceMap } from "./EvidenceMap";
import { FlameBench } from "./FlameBench";
import { FloatingDock } from "./FloatingDock";
import { IntroScreen, type StartId } from "./IntroScreen";
import { LabView } from "./LabView";
import { LibraryView, requestAsk, requestWatch } from "./LibraryView";
import { EnvironmentModel } from "./Models3D";
import { BriefPanel, ConnectPanel, GapsPanel, InvestigationDetail, InvestigationsTable, MaterialsTable, Ranking, TestsTable } from "./Panels";
import { ScenarioView } from "./ScenarioView";
import { SystemMap } from "./SystemMap";
import { TimelineView } from "./TimelineView";
import { VideosView, requestVideo } from "./VideosView";
import { VoiceDock } from "./VoiceDock";
import { VoiceStage } from "./VoiceStage";

export type View = "fire" | "ranking" | "ask" | "videos" | "timeline" | "scenarios" | "lab" | "environment" | "analytics" | "voice" | "map" | "investigations" | "tests" | "materials" | "gaps" | "brief" | "connect" | "detail";

const VIEWS: [View, string, string][] = [
  ["fire", "Fire", "What happens to a flame in this cabin"],
  ["ranking", "Ranking", "Investigations ranked for this design, with the reasons"],
  ["ask", "Ask + Library", "One question across every server, and the NASA and partner library"],
  ["videos", "Videos", "Footage of the experiments, streamed from NASA"],
  ["timeline", "Timeline", "Incidents, Earth technology and investigations since 1967"],
  ["scenarios", "Scenarios", "A fire starts: what the crew does and what happens to them"],
  ["lab", "Lab", "A live cabin with flame and smoke, and five fire models"],
  ["environment", "Environment", "The cabin on the table, in full size"],
  ["analytics", "Analytics", "Charts and tables built as you ask"],
  ["voice", "Voice", "The lab voice at full size"],
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
  environment: "environment", model: "environment", "3d": "environment", cabin: "environment", entorno: "environment", ambiente: "environment", modelo: "environment", nave: "environment", dibujo: "environment",
  scenarios: "scenarios", scenario: "scenarios", simulator: "scenarios", simulation: "scenarios", escenarios: "scenarios", escenario: "scenarios", simulador: "scenarios", "simulación": "scenarios", simulacion: "scenarios",
  ask: "ask", library: "ask", resources: "ask", orchestrator: "ask", biblioteca: "ask", recursos: "ask", orquestador: "ask", apollo: "ask", history: "ask", historia: "ask",
  videos: "videos", video: "videos", footage: "videos",
  timeline: "timeline", "línea de tiempo": "timeline", cronologia: "timeline", "cronología": "timeline",
  lab: "lab", laboratory: "lab", models: "lab", laboratorio: "lab", modelos: "lab",
  voice: "voice", voz: "voice", assistant: "voice", asistente: "voice",
  analytics: "analytics", dashboard: "analytics", charts: "analytics", chart: "analytics", analitica: "analytics", "analítica": "analytics", graficas: "analytics", "gráficas": "analytics",
  map: "map", mapa: "map", evidence: "map", ranking: "ranking", rank: "ranking",
  investigations: "investigations", investigaciones: "investigations",
  tests: "tests", tables: "tests", table: "tests", records: "tests", tablas: "tests", pruebas: "tests",
  materials: "materials", materiales: "materials",
  gaps: "gaps", huecos: "gaps",
  brief: "brief", analysts: "brief", analistas: "brief", informe: "brief",
  connect: "connect", connections: "connect", conexiones: "connect", nodes: "connect", nodos: "connect",
};

const clampCol = (w: number) => Math.min(620, Math.max(200, Math.round(w)));

function Resizer({ label: name, width, direction, fallback, onChange, onCommit }: { label: string; width: number; direction: 1 | -1; fallback: number; onChange: (w: number) => void; onCommit: () => void }) {
  const drag = useRef<{ x: number; start: number } | null>(null);
  const t = useT();
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={name}
      title={t("Drag to resize · double-click to reset")}
      className="group hidden cursor-col-resize touch-none select-none items-center justify-center lg:flex"
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, start: width };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current) onChange(clampCol(drag.current.start + (e.clientX - drag.current.x) * direction));
      }}
      onPointerUp={() => {
        if (!drag.current) return;
        drag.current = null;
        onCommit();
      }}
      onDoubleClick={() => {
        onChange(fallback);
        onCommit();
      }}
    >
      <span className="h-12 w-[3px] rounded-full bg-mark/15 transition-colors group-hover:bg-accent group-active:bg-accent" />
    </div>
  );
}

const PHASES: [PhaseGroup, string][] = [
  ["solid", "Solid materials"],
  ["liquid", "Liquid fuels"],
  ["gas", "Gas flames"],
];

// Label of the fuel filter shown above the test records.
const PHASE_FUELS: Record<string, string> = { solid: "solid fuels", liquid: "liquid fuels", gas: "gas fuels" };

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
  const [intro, setIntro] = useState(true);
  const t = useT();
  // welcome screen shown on load
  useEffect(() => initTheme(), []);
  useEffect(() => initLang(), []);
  const [drawing, setDrawing] = useControl<"3d" | "2d">("env.drawing");

  // Side columns: drag the bar between a column and the stage to resize it.
  const [leftW, setLeftW] = useControl<number>("layout.left");
  const [rightW, setRightW] = useControl<number>("layout.right");
  const cols = { left: leftW, right: rightW };
  // The voice starts docked on the right; minimized, it floats and the stage takes the space.
  const [voiceMode, setVoiceMode] = useControl<"docked" | "floating">("layout.voice");
  const voiceFloating = voiceMode === "floating";
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem("firelab:cols-v2") ?? "null");
        if (saved && typeof saved.left === "number" && typeof saved.right === "number") {
          setLeftW(clampCol(saved.left));
          setRightW(clampCol(saved.right));
        }
      } catch {
        /* keep defaults */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [setLeftW, setRightW]);
  const saveCols = useCallback(() => {
    try {
      window.localStorage.setItem("firelab:cols-v2", JSON.stringify({ left: controls.get<number>("layout.left"), right: controls.get<number>("layout.right") }));
    } catch {
      /* ignore */
    }
  }, []);

  const env = ENVIRONMENTS.find((e) => e.id === envId)!;
  const custom = env.o2_pct !== o2 || env.pressure_psi !== psi;
  const target = useMemo(() => ({ o2_pct: o2, pressure_atm: psi / PSI_PER_ATM }), [o2, psi]);

  const stats = useMemo(() => computeStats(), []);
  // t is a dependency so the generated text follows the language switch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ranked = useMemo(() => rankInvestigations(target), [target, t]);
  const scores = useMemo(() => new Map(ranked.map((r) => [r.investigation.accession, r.score])), [ranked]);
  const nearestIds = useMemo(() => new Set(nearestTests(target, 8).map((n) => n.item.id)), [target]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const gapList = useMemo(() => computeGaps(target), [target, t]);
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
          headline: within > 0 ? (within === 1 ? t("Tested near here · {n} record", { n: within }) : t("Tested near here · {n} records", { n: within })) : t("Never tested near here"),
          detail: !first
            ? t("No record carries an oxygen value")
            : within > 0
              ? t("Closest: {what} at {o2}% oxygen", { what, o2: firstO2 })
              : o2 > firstO2
                ? t("Closest is {what} at {o2}% oxygen, {d} points below this design", { what, o2: firstO2, d: Math.abs(o2 - firstO2).toFixed(1) })
                : t("Closest is {what} at {o2}% oxygen, {d} points above this design", { what, o2: firstO2, d: Math.abs(o2 - firstO2).toFixed(1) }),
        };
      }),
    [target, o2, t],
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
      setIntro(false);
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
        case "set_controls": {
          const changes = Array.isArray(a.args.changes) ? (a.args.changes as { control?: unknown; value?: unknown }[]) : [];
          for (const c of changes) {
            const id = s(c.control) as ControlId;
            if (!(id in CONTROLS)) continue;
            if (controls.set(id, c.value) === null) continue;
            // bring the control into view
            const area = CONTROLS[id].view;
            if (id.startsWith("cabin.")) controls.set("lab.case", "cabin");
            if (area === "fire" || area === "scenarios" || area === "lab" || area === "environment") setView(area);
          }
          break;
        }
        case "press_control": {
          const id = s(a.args.action) as ActionId;
          if (id.startsWith("scenario.")) setView("scenarios");
          if (id.startsWith("cabin.")) {
            controls.set("lab.case", "cabin");
            setView("lab");
          }
          // let the view mount before the button is pressed
          window.setTimeout(() => controls.press(id), 120);
          break;
        }
        case "play_video": {
          setView("videos");
          requestVideo(s(a.args.investigation), s(a.args.search));
          break;
        }
        case "watch_nasa_video":
          setView("ask");
          requestWatch();
          break;
        case "build_chart": {
          const request = s(a.args.request);
          setView("analytics");
          if (request) requestChart(request);
          break;
        }
        case "write_brief":
          setView("brief");
          runBrief(s(a.args.question) || "What does the evidence say about fire safety for this design?", false);
          break;
      }
    },
    [pickEnv, openInvestigation, runBrief],
  );

  // keep the registry's picture of the table current, for read_controls
  useEffect(() => {
    setTableState({ environment: envId, oxygen_pct: o2, pressure_psi: psi, stage_view: view, fuel_filter: phase || null, material_filter: material || null, open_investigation: view === "detail" ? selected : null });
  }, [envId, o2, psi, view, phase, material, selected]);

  // the five starting points of the welcome screen
  const start = useCallback(
    (id: StartId) => {
      if (id === "materials") setView("materials");
      else if (id === "lab") {
        controls.set("lab.case", "cabin");
        setView("lab");
      } else {
        pickEnv(id);
        setView("environment");
      }
      setIntro(false);
    },
    [pickEnv],
  );

  const current = VIEWS.find(([v]) => v === view);

  return (
    <div className="flex min-h-screen flex-col px-3 pb-2 pt-2 lg:h-screen lg:overflow-hidden lg:px-4">
      {/* phones and tablets: the voice is far down the page, so a bar pinned to the top keeps it one tap away */}
      <div className="sticky top-0 z-30 -mx-3 mb-2 flex items-center gap-2 border-b border-line px-3 py-2 lg:hidden" style={{ background: "var(--surface)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/kukulcan.svg" alt="Kukulcan Space" className="logo h-7 w-auto shrink-0" />
        <div className="min-w-0 truncate text-[15px] font-light leading-none tracking-tight">Kukulcan <span className="text-accent">Fire Lab</span></div>
        <button type="button" className="btn ml-auto !min-h-[40px] !px-3" onClick={() => document.getElementById("voice-console")?.scrollIntoView({ behavior: "smooth", block: "start" })} title={t("Go to the conversation")}>{t("Chat")}</button>
        <VoiceButton size="sm" />
      </div>

      {/* header with the dataset numbers on one line */}
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line pb-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/kukulcan.svg" alt="Kukulcan Space" className="logo hidden h-9 w-auto shrink-0 lg:block" />
        <div className="hidden lg:block">
          <div className="label !text-[9px]">NASA Space Apps 2026 · Flame in Freefall</div>
          <h1 className="text-[21px] font-light leading-none tracking-tight">
            Kukulcan <span className="text-accent">Fire Lab</span>
          </h1>
        </div>
        <dl className="grid w-full grid-cols-3 items-end gap-x-3 gap-y-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-x-5 sm:gap-y-1 lg:ml-auto" aria-label={t("Dataset metrics")}>
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
              <dt className="label mt-1 !text-[8.5px]">{t(String(k))}</dt>
            </div>
          ))}
        </dl>
        <div className="flex shrink-0 items-center gap-4">
          <LangSwitch />
          <ThemeSwitch />
        </div>
      </header>

      <div
        className={`mt-2 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-y-2 lg:grid-rows-[minmax(0,1fr)] ${voiceFloating ? "lg:grid-cols-[var(--lw)_10px_minmax(0,1fr)]" : "lg:grid-cols-[var(--lw)_10px_minmax(0,1fr)_10px_var(--rw)]"}`}
        // side columns never squeeze the stage below about 40% of the window
        style={{ "--lw": `min(${cols.left}px, 28vw)`, "--rw": `min(${cols.right}px, 32vw)` } as React.CSSProperties}
      >
        {/* left: the environment on the table, always visible */}
        <aside className="panel scroll flex min-h-0 flex-col p-3" style={{ overflowX: "hidden" }}>
          <div className="label">{t("Environment on the table")}</div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {ENVIRONMENTS.map((e) => (
              <button key={e.id} onClick={() => pickEnv(e.id)} aria-pressed={envId === e.id} className={`border px-1 pb-1 pt-0.5 text-center transition-colors hover:border-accent ${envId === e.id ? "border-accent bg-mark/[0.05] text-accent" : "border-line text-dim"}`}>
                <EnvironmentDrawing id={e.id} notes={false} className="h-[40px] w-full" />
                <span className="mono block text-[8.5px] tracking-[0.14em]">{t(e.short)}</span>
              </button>
            ))}
          </div>
          <div className="relative mt-1 flex min-h-[130px] flex-1 flex-col">
            <div className="absolute right-0 top-0 z-10 flex gap-1" role="tablist" aria-label={t("Drawing type")}>
              {(["3d", "2d"] as const).map((d) => (
                <button key={d} role="tab" aria-selected={drawing === d} className={`btn !px-2 !py-0.5 !text-[10px] ${drawing === d ? "on" : ""}`} onClick={() => setDrawing(d)}>
                  {d.toUpperCase()}
                </button>
              ))}
            </div>
            {drawing === "3d" ? (
              <>
                <EnvironmentModel id={envId} className="min-h-0 w-full flex-1" />
                <span className="mono pointer-events-none absolute bottom-0 left-0 text-[8.5px] uppercase tracking-[0.14em] text-faint">{t("Drag to turn")}</span>
              </>
            ) : (
              <EnvironmentDrawing id={envId} className="min-h-0 w-full flex-1 text-ink" />
            )}
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[15px] font-medium">{t(env.name)}</span>
            <span className="label text-right">{t(env.gravity)}</span>
          </div>
          <p className="mt-1 text-[12px] leading-snug text-dim">{t(env.concern)}</p>

          <div className="mt-2 space-y-1 border-t border-line pt-2">
            <label className="block">
              <span className="label flex justify-between"><span>{t("Oxygen")}</span><span className="text-[13px] text-ink">{o2}%</span></span>
              <input type="range" min={10} max={100} step={0.5} value={o2} onChange={(e) => setO2(+e.target.value)} />
            </label>
            <label className="block">
              <span className="label flex justify-between"><span>{t("Pressure")}</span><span className="text-[13px] text-ink">{psi} psi · {(psi / PSI_PER_ATM).toFixed(2)} atm</span></span>
              <input type="range" min={3} max={45} step={0.1} value={psi} onChange={(e) => setPsi(+e.target.value)} />
            </label>
            <div className="text-[11px] leading-snug text-dim">
              <span className="mono mr-1.5 border border-line px-1 py-px text-[9px] uppercase tracking-widest" style={{ color: custom ? "var(--warn)" : env.basis === "challenge" ? "var(--ok)" : undefined }}>
                {custom ? t("custom") : env.basis === "challenge" ? t("from the challenge") : t("preset")}
              </span>
              {custom ? t("You moved the atmosphere away from the preset.") : t(env.basisNote)}
              {custom && <button className="ml-1 underline underline-offset-2 hover:text-accent" onClick={() => pickEnv(envId)}>{t("Reset")}</button>}
            </div>
          </div>
        </aside>

        <Resizer label={t("Resize the environment panel")} width={cols.left} direction={1} fallback={292} onChange={setLeftW} onCommit={saveCols} />

        {/* centre: verdict + the stage */}
        <main className="flex min-h-0 min-w-0 flex-col gap-2">
          <section className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-3" aria-label={t("Has this atmosphere been tested?")}>
            {verdicts.map((v) => (
              <button
                key={v.g}
                className="panel min-w-0 px-3 py-2 text-left transition-colors hover:border-accent"
                onClick={() => { setPhase(v.g); setMaterial(""); setView("map"); }}
                title={t("Show these records on the evidence map")}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: `var(--${v.g})` }} />
                  <span className="label">{t(v.name)}</span>
                  <span className="mono ml-auto whitespace-nowrap text-[9.5px] text-faint">{o2}% O₂ · {psi} psi</span>
                </div>
                <div className="mt-1 text-[14.5px] font-medium leading-tight" style={{ color: v.tone === "ok" ? "var(--ok)" : "var(--danger)" }}>{v.headline}</div>
                <div className="mt-0.5 truncate text-[11.5px] text-dim" title={v.detail}>{v.detail}</div>
              </button>
            ))}
          </section>

          <section className="panel flex min-h-0 flex-1 flex-col">
            <nav className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1.5" role="tablist" aria-label={t("Stage views")}>
              {VIEWS.map(([v, name]) => (
                <button key={v} role="tab" aria-selected={view === v} className={`btn !px-2.5 !py-1 ${view === v ? "on" : ""}`} onClick={() => setView(v)}>
                  {t(name)}
                </button>
              ))}
              {view === "detail" && selectedInv && <span className="btn on !px-2.5 !py-1">{label(selectedInv)}</span>}
              <span className="ml-auto hidden truncate pl-2 text-[11.5px] text-dim xl:block">{view === "detail" ? t("Investigation detail") : current ? t(current[2]) : undefined}</span>
            </nav>

            <div className="scroll stage min-h-0 flex-1 p-3" role="tabpanel">
              {view === "environment" && (
                <div className="grid h-full min-h-[420px] gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)]">
                  <div className="relative min-h-[300px] border border-line">
                    <div className="absolute right-2 top-2 z-10 flex gap-1" role="tablist" aria-label={t("Drawing type")}>
                      {(["3d", "2d"] as const).map((d) => (
                        <button key={d} role="tab" aria-selected={drawing === d} className={`btn !px-2 !py-0.5 !text-[10px] ${drawing === d ? "on" : ""}`} onClick={() => setDrawing(d)}>{d.toUpperCase()}</button>
                      ))}
                    </div>
                    {drawing === "3d" ? <EnvironmentModel id={envId} className="absolute inset-0" /> : <EnvironmentDrawing id={envId} className="absolute inset-0 h-full w-full p-6 text-ink" />}
                    <span className="mono pointer-events-none absolute bottom-2 left-2 text-[9px] uppercase tracking-[0.14em] text-faint">{drawing === "3d" ? t("Drag to turn · schematic, not to scale") : t("Schematic, not to scale")}</span>
                  </div>
                  <div className="min-w-0 space-y-3">
                    <div>
                      <div className="label">{t(env.gravity)}</div>
                      <h2 className="text-[20px] font-medium leading-tight">{t(env.name)}</h2>
                      <p className="mt-1 text-[13px] leading-relaxed text-dim">{t(env.concern)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><div className="label">{t("Oxygen")}</div><div className="mono text-[20px]">{o2}%</div></div>
                      <div><div className="label">{t("Pressure")}</div><div className="mono text-[20px]">{psi} psi</div></div>
                    </div>
                    <p className="text-[11.5px] leading-snug text-dim">{custom ? t("Custom atmosphere: you moved it away from the preset.") : t(env.basisNote)}</p>
                    <div>
                      <div className="label mb-1">{t("Most relevant investigations here")}</div>
                      {ranked.slice(0, 4).map((r) => (
                        <button key={r.investigation.accession} className="flex w-full items-baseline gap-2 border-b border-line py-1 text-left text-[12.5px] hover:text-accent" onClick={() => openInvestigation(r.investigation.accession)}>
                          <span className="font-medium">{label(r.investigation)}</span>
                          <span className="min-w-0 flex-1 truncate text-[11.5px] text-dim">{r.investigation.focus}</span>
                          <span className="mono text-accent">{r.score}</span>
                        </button>
                      ))}
                    </div>
                    <div>
                      <div className="label mb-1">{t("What is untested for this cabin")}</div>
                      {gapList.slice(0, 3).map((g) => (
                        <div key={g.title} className="mb-1 border-l-2 pl-2 text-[12.5px] leading-snug" style={{ borderColor: g.severity === "critical" ? "var(--danger)" : "var(--warn)" }}>{g.title}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {view === "scenarios" && <ScenarioView o2={o2} psi={psi} defaultGravity={envId === "base" || envId === "rover" ? 0.17 : 0} />}
              {/* Kept mounted so an answer in progress is not lost when the view changes. */}
              <div hidden={view !== "ask"}>
                <LibraryView o2={o2} psi={psi} />
              </div>
              {/* Kept mounted so a video requested by voice starts even from another view. */}
              <div hidden={view !== "videos"}>
                <VideosView files={files} />
              </div>
              {view === "timeline" && <TimelineView onOpen={openInvestigation} onAsk={(question) => { setView("ask"); requestAsk(question); }} />}
              {view === "lab" && <LabView o2={o2} psi={psi} defaultGravity={envId === "base" || envId === "rover" ? 0.17 : 0} />}
              {view === "voice" && <VoiceStage />}

              {/* Kept mounted so charts requested by voice land even while another view is open. */}
              <div hidden={view !== "analytics"}>
                <AnalyticsView />
              </div>

              {view === "ranking" && (
                <div>
                  <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
                    <h2 className="text-[16px] font-medium">{t("Investigations ranked for this design")}</h2>
                    <span className="text-[12.5px] text-dim">{t("Scored out of 100 for {o2}% oxygen at {psi} psi. Click one to open it.", { o2, psi })}</span>
                  </div>
                  <Ranking ranked={ranked} onOpen={openInvestigation} selected={selected} />
                </div>
              )}
              {view === "fire" && <FlameBench o2={o2} psi={psi} onChange={(o, p) => { setO2(o); setPsi(p); }} />}

              {view === "map" && (
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-[12.5px] text-dim">{t("Each dot is a real test, placed by its oxygen and pressure. If your design (the ring) sits in empty space, nobody has burned anything there.")}</span>
                    <span className="ml-auto flex gap-1.5">
                      {[["", "All"], ["solid", "Solids"], ["liquid", "Liquids"], ["gas", "Gases"]].map(([v, name]) => (
                        <button key={v} className="btn !px-2 !py-1" aria-pressed={phase === v} onClick={() => setPhase(v)}>{t(name)}</button>
                      ))}
                    </span>
                  </div>
                  {material && (
                    <div className="label mb-1">
                      {t("Material filter:")} <span className="text-accent">{material}</span>
                      <button className="ml-2 underline underline-offset-2" onClick={() => setMaterial("")}>{t("clear")}</button>
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
                      {t("Filtered to {what}", { what: [phase && (PHASE_FUELS[phase] ? t(PHASE_FUELS[phase]) : t("{phase} fuels", { phase })), material].filter(Boolean).join(" · ") })}
                      <button className="ml-2 underline underline-offset-2 hover:text-accent" onClick={() => { setPhase(""); setMaterial(""); }}>{t("clear")}</button>
                    </div>
                  )}
                  <TestsTable tests={filtered} total={TESTS.length} />
                </div>
              )}
              {view === "materials" && <MaterialsTable onFilter={(m) => { setMaterial(m); setPhase(""); setView("tests"); }} />}
              {view === "gaps" && <GapsPanel gaps={gapList} />}
              {view === "brief" && <BriefPanel brief={brief} loading={briefLoading} onRun={runBrief} hasDesign={custom ? t("{o2}% oxygen at {psi} psi", { o2, psi }) : t("{o2}% oxygen at {psi} psi ({name})", { o2, psi, name: t(env.name) })} />}
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

        {/* right: the voice. Minimized, it floats over the page and this column closes. */}
        {!voiceFloating && <Resizer label={t("Resize the voice panel")} width={cols.right} direction={-1} fallback={400} onChange={setRightW} onCommit={saveCols} />}
        <div id="voice-console" className="min-h-0 min-w-0 scroll-mt-[64px] lg:contents" />
        <FloatingDock floating={voiceFloating}>
          <VoiceDock o2={o2} psi={psi} onAction={onAction} floating={voiceFloating} onToggleMode={() => setVoiceMode(voiceFloating ? "docked" : "floating")} />
        </FloatingDock>
      </div>

      {intro && <IntroScreen onChoose={start} onSkip={() => setIntro(false)} />}

      <footer
        className="mt-1.5 truncate text-[10.5px] text-faint"
        title={t("Records come from the experimental tables of NASA's Physical Sciences Informatics repository, harmonized to common units. The lab reports what was tested; it does not certify any material or design as safe, and PSI holds no partial-gravity data. Code, line drawings and analyst text were produced with SI assistance (Claude); spoken replies are synthetic. Not affiliated with or endorsed by NASA.")}
      >
        {t("Data: NASA Physical Sciences Informatics, {n} experimental tables harmonized · Reports what was tested, never certifies a design as safe · No partial-gravity data in PSI · Code, drawings, analyst text and voice produced with SI (Claude) · Not affiliated with or endorsed by NASA", { n: stats.investigations_with_tables })}
      </footer>
    </div>
  );
}
