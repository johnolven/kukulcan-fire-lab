"use client";
// Tables and detail panels of the lab.
// Code generated with SI assistance (Claude Code).

import { useMemo, useState, useSyncExternalStore } from "react";
import { signal } from "@/lib/activity";
import { t as tx } from "@/lib/i18n";
import { useT } from "@/lib/useControl";
import type { Brief } from "@/lib/agents";
import { COMBUSTION, coverage, label, materials, O2_BINS, P_BINS, phaseGroup, type Gap, type RankedInvestigation } from "@/lib/lab";
import type { FileEntry, Investigation, TestRecord } from "@/lib/types";
import { PSI_PER_ATM } from "@/lib/types";

const PHASE_COLOR: Record<string, string> = { solid: "var(--solid)", liquid: "var(--liquid)", gas: "var(--gas)", smoke: "var(--smoke)" };

export function bytes(b: number) {
  return b >= 1e12 ? `${(b / 1e12).toFixed(1)} TB` : b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(0)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`;
}
const range = (r: [number, number] | null, unit = "", f = (v: number) => String(v)) => (r ? (r[0] === r[1] ? `${f(r[0])}${unit}` : `${f(r[0])}-${f(r[1])}${unit}`) : tx("not given"));

export function PhaseDot({ phase }: { phase: string | null }) {
  const t = useT();
  const g = phaseGroup(phase);
  return <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: PHASE_COLOR[g] }} title={t(g)} />;
}

// ---------- ranking ----------

const PART_LABEL: [keyof RankedInvestigation["parts"], string, number, string][] = [
  ["directness", "Fire-safety directness", 30, "Direct"],
  ["proximity", "Tested near this design", 30, "Near"],
  ["material", "Fuel or material relevance", 20, "Material"],
  ["volume", "Evidence volume", 10, "Volume"],
  ["data", "Data availability", 10, "Data"],
];

export function Ranking({ ranked, onOpen, selected, compact }: { ranked: RankedInvestigation[]; onOpen: (acc: string) => void; selected: string | null; compact?: boolean }) {
  const t = useT();
  return (
    <div className={compact ? "flex min-h-0 flex-1 flex-col" : ""}>
      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1">
        {PART_LABEL.map(([k, name, max, short], n) => (
          <span key={k} className="label flex items-center gap-1" title={t("{name}, out of {max}", { name: t(name), max })}>
            <span className="inline-block h-1.5 w-3" style={{ background: `rgba(127,231,255,${1 - n * 0.17})` }} />
            {t(compact ? short : name)} /{max}
          </span>
        ))}
      </div>
      <div className={`scroll fill pr-1 ${compact ? "min-h-0 flex-1" : "max-h-[520px]"}`}>
      {ranked.map((r, n) => (
        <button
          key={r.investigation.accession}
          onClick={() => onOpen(r.investigation.accession)}
          className={`mb-1.5 block w-full border px-3 py-2 text-left transition-colors hover:border-accent ${selected === r.investigation.accession ? "border-accent bg-mark/[0.04]" : "border-line"}`}
        >
          <div className="flex items-baseline gap-2">
            <span className="mono w-5 text-[11px] text-faint">{String(n + 1).padStart(2, "0")}</span>
            <PhaseDot phase={r.investigation.fuel_phase} />
            <span className="whitespace-nowrap text-[13px] font-medium">{label(r.investigation)}</span>
            <span className="label min-w-0 truncate">{r.investigation.pillars.map((p) => t(p)).join(" · ")}</span>
            <span className="mono ml-auto text-[15px] text-accent">{r.score}</span>
          </div>
          <div className="mt-1.5 flex h-1.5 w-full gap-px">
            {PART_LABEL.map(([k], i) => (
              <span key={k} style={{ width: `${r.parts[k]}%`, background: `rgba(127,231,255,${1 - i * 0.17})` }} />
            ))}
          </div>
          <div className="mt-1.5 text-[11.5px] leading-snug text-dim">{compact ? r.rationale.slice(0, 2).join(" ") : r.rationale.join(" ")}</div>
        </button>
      ))}
      </div>
    </div>
  );
}

// ---------- investigation detail ----------

export function InvestigationDetail({ inv, files, onClose }: { inv: Investigation; files: FileEntry[]; onClose: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const videos = files.filter((f) => f.k === "video");
  const docs = files.filter((f) => f.k !== "video");

  async function open(f: FileEntry) {
    setBusy(f.n);
    setErr(null);
    signal("table-psi");
    // open the tab inside the click so the browser does not block it
    const tab = window.open("about:blank", "_blank");
    try {
      const r = await fetch(`/api/psi/link?accession=${inv.accession}&file=${encodeURIComponent(f.n)}`);
      const j = await r.json();
      if (!j.url) throw new Error(j.error ?? t("No link returned"));
      (tab ?? window).location.assign(j.url);
    } catch (e) {
      tab?.close();
      setErr(t("NASA PSI did not return a link for this file ({reason}). Open the investigation page instead.", { reason: e instanceof Error ? e.message : "error" }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="panel p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <div className="label">{inv.accession} · {inv.facility ?? inv.hardware} · {inv.platform || t("ground")}</div>
          <h3 className="mt-1 text-[18px] font-medium leading-tight"><PhaseDot phase={inv.fuel_phase} />{label(inv)} <span className="text-dim">— {inv.title}</span></h3>
        </div>
        <button className="btn ml-auto shrink-0" onClick={onClose}>{t("Close")}</button>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed">{inv.focus}</p>

      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4">
        {[
          [t("Records in table"), inv.n_flames ? t("{n} ({flames} flames)", { n: inv.n_records, flames: inv.n_flames }) : String(inv.n_records)],
          [t("Oxygen tested"), range(inv.o2_range, "%")],
          [t("Pressure tested"), range(inv.pressure_range, " psi", (v) => (v * PSI_PER_ATM).toFixed(1))],
          [t("Air flow tested"), range(inv.flow_range, " cm/s")],
          [t("Source data"), t("{n} files · {size}", { n: inv.files.toLocaleString(), size: bytes(inv.bytes) })],
          [t("Video files"), String(inv.videos)],
          [t("Publications"), String(inv.publications.length)],
          [t("Dates"), `${inv.start || "?"} → ${inv.end || "?"}`],
        ].map(([k, v]) => (
          <div key={k}>
            <div className="label">{k}</div>
            <div className="mono text-[12.5px]">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 text-[12.5px] leading-relaxed">
          {inv.objective && <div><div className="label mb-0.5">{t("Objective")}</div>{inv.objective}</div>}
          {inv.hypothesis && <div><div className="label mb-0.5">{t("Hypothesis")}</div>{inv.hypothesis}</div>}
          {inv.impacts && <div><div className="label mb-0.5">{t("Impact and Earth benefits")}</div>{inv.impacts}</div>}
          {(inv.fuels.length > 0 || inv.materials.length > 0) && (
            <div>
              <div className="label mb-0.5">{inv.materials.length ? t("Materials") : t("Fuels")}</div>
              {(inv.materials.length ? inv.materials : inv.fuels).slice(0, 16).join(" · ")}
            </div>
          )}
          <a className="btn inline-block" href={inv.url} target="_blank" rel="noreferrer">{t("Open in NASA PSI ↗")}</a>
        </div>
        <div className="min-w-0 space-y-3">
          {inv.publications.length > 0 && (
            <div>
              <div className="label mb-1">{t("Publications ({n})", { n: inv.publications.length })}</div>
              <div className="scroll max-h-[150px] space-y-1.5 text-[12px] leading-snug">
                {inv.publications.map((p, i) => (
                  <div key={i}>
                    {p.doi ? <a className="underline decoration-mark/30 underline-offset-2 hover:text-accent" href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">{p.title}</a> : p.title}
                    <span className="text-faint"> — {p.authors}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(videos.length > 0 || docs.length > 0) && (
            <div>
              <div className="label mb-1">{t("Files served live by NASA PSI · {videos} video · {docs} documents", { videos: videos.length, docs: docs.length })}</div>
              <div className="scroll max-h-[170px]">
                <table className="data">
                  <tbody>
                    {[...videos.slice(0, 40), ...docs.slice(0, 60)].map((f) => (
                      <tr key={f.n}>
                        <td className="max-w-0 w-full truncate" title={f.n}>
                          <button className="text-left underline decoration-mark/25 underline-offset-2 hover:text-accent" onClick={() => open(f)} disabled={busy === f.n}>
                            {busy === f.n ? t("Requesting link…") : f.n.replace(`${inv.accession}_`, "")}
                          </button>
                        </td>
                        <td className="label whitespace-nowrap">{f.k}</td>
                        <td className="num whitespace-nowrap">{bytes(f.b)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {err && <div className="mt-1 text-[12px] text-warn">{err}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- investigations table ----------

export function InvestigationsTable({ onOpen, scores }: { onOpen: (acc: string) => void; scores: Map<string, number> }) {
  const t = useT();
  const [sort, setSort] = useState<"score" | "records" | "size" | "name">("score");
  const rows = useMemo(() => {
    const r = [...COMBUSTION];
    r.sort((a, b) => (sort === "score" ? (scores.get(b.accession) ?? 0) - (scores.get(a.accession) ?? 0) : sort === "records" ? b.n_records - a.n_records : sort === "size" ? b.bytes - a.bytes : label(a).localeCompare(label(b))));
    return r;
  }, [sort, scores]);
  const th = (k: typeof sort, name: string, num = false) => (
    <th className={num ? "num" : ""}>
      <button className={`uppercase tracking-[0.12em] ${sort === k ? "text-accent" : ""}`} onClick={() => setSort(k)}>{name}{sort === k ? " ↓" : ""}</button>
    </th>
  );
  return (
    <div className="scroll fill max-h-[560px]">
      <table className="data">
        <thead>
          <tr>
            {th("name", t("Investigation"))}
            <th>{t("Pillars")}</th>
            <th>{t("Facility")}</th>
            <th>{t("Fuel or material")}</th>
            {th("records", t("Records"), true)}
            <th className="num">{t("Oxygen %")}</th>
            <th className="num">{t("Pressure psi")}</th>
            <th className="num">{t("Video")}</th>
            <th className="num">{t("Papers")}</th>
            {th("size", t("Source data"), true)}
            {th("score", t("Score"), true)}
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i.accession} className="cursor-pointer" onClick={() => onOpen(i.accession)}>
              <td className="whitespace-nowrap"><PhaseDot phase={i.fuel_phase} /><span className="font-medium">{label(i)}</span> <span className="mono text-[10px] text-faint">{i.accession}</span></td>
              <td className="text-dim">{i.pillars.map((p) => t(p)).join(", ")}</td>
              <td className="whitespace-nowrap text-dim">{i.facility}</td>
              <td className="max-w-[240px] truncate text-dim" title={(i.materials.length ? i.materials : i.fuels).join(", ")}>{(i.materials.length ? i.materials : i.fuels).slice(0, 4).join(", ") || "—"}</td>
              <td className="num">{i.n_records || "—"}</td>
              <td className="num">{i.o2_range ? range(i.o2_range) : "—"}</td>
              <td className="num">{i.pressure_range ? range(i.pressure_range, "", (v) => (v * PSI_PER_ATM).toFixed(1)) : "—"}</td>
              <td className="num">{i.videos || "—"}</td>
              <td className="num">{i.publications.length || "—"}</td>
              <td className="num">{bytes(i.bytes)}</td>
              <td className="num text-accent">{scores.get(i.accession) ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- tests table ----------

const CSV_COLS: (keyof TestRecord)[] = ["id", "accession", "acronym", "test_id", "date", "granularity", "fuel", "fuel_phase", "material", "geometry", "o2_pct", "o2_min", "o2_max", "o2_where", "pressure_atm", "flow_cm_s", "diluent", "ignited", "outcome", "burn_time_s", "n_flames", "notes", "source_file"];

function downloadCsv(rows: TestRecord[]) {
  const esc = (v: unknown) => {
    const s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [CSV_COLS.join(","), ...rows.map((t) => CSV_COLS.map((c) => esc(t[c])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "kukulcan-fire-lab-psi-tests.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

export function TestsTable({ tests, total }: { tests: TestRecord[]; total: number }) {
  const tr = useT();
  const [text, setText] = useState("");
  const rows = useMemo(() => {
    const q = text.toLowerCase().trim();
    return q ? tests.filter((t) => `${t.acronym} ${t.test_id} ${t.fuel} ${t.material} ${t.geometry} ${t.outcome} ${t.notes}`.toLowerCase().includes(q)) : tests;
  }, [tests, text]);
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input className="field w-64" placeholder={tr("Search id, fuel, material, outcome")} value={text} onChange={(e) => setText(e.target.value)} aria-label={tr("Search test records")} />
        <span className="label">{tr("{n} of {total} records", { n: rows.length.toLocaleString(), total: total.toLocaleString() })}{rows.length > 300 ? ` · ${tr("showing first 300")}` : ""}</span>
        <button className="btn ml-auto" onClick={() => downloadCsv(rows)}>{tr("Download CSV ({n})", { n: rows.length })}</button>
      </div>
      <div className="scroll fill max-h-[520px]">
        <table className="data">
          <thead>
            <tr>
              <th>{tr("Investigation")}</th><th>{tr("Test")}</th><th>{tr("Row is")}</th><th>{tr("Fuel or material")}</th><th>{tr("Setup")}</th>
              <th className="num">O₂ %</th><th className="num">psi</th><th className="num">{tr("Flow cm/s")}</th><th>{tr("Diluent")}</th><th>{tr("Outcome")}</th><th className="num">{tr("Burn s")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 300).map((t) => (
              <tr key={t.id} title={t.notes ?? undefined}>
                <td className="whitespace-nowrap"><PhaseDot phase={t.fuel_phase} />{t.acronym}</td>
                <td className="mono whitespace-nowrap text-[11px]">{t.test_id}</td>
                <td className="text-dim">{tr(t.granularity)}</td>
                <td className="max-w-[200px] truncate" title={t.fuel ?? ""}>{t.material ?? t.fuel ?? "—"}</td>
                <td className="max-w-[230px] truncate text-dim" title={t.geometry ?? ""}>{t.geometry ?? "—"}</td>
                <td className="num">{t.o2_min == null ? "—" : t.o2_min === t.o2_max ? t.o2_min : `${t.o2_min}-${t.o2_max}`}{t.o2_where !== "ambient" && t.o2_min != null ? "*" : ""}</td>
                <td className="num">{t.pressure_atm == null ? "—" : (t.pressure_atm * PSI_PER_ATM).toFixed(1)}{t.assumed.length ? "†" : ""}</td>
                <td className="num">{t.flow_cm_s ?? "—"}</td>
                <td className="text-dim">{t.diluent ?? "—"}</td>
                <td className="whitespace-nowrap">{t.outcome ? tr(t.outcome) : t.ignited === false ? tr("Did not ignite") : "—"}</td>
                <td className="num">{t.burn_time_s ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-1.5 text-[11px] text-dim">{tr("— not given in the source table · * oxygen is the burner stream, not the chamber · † cabin pressure assumed (experiment open to cabin air)")}</div>
    </div>
  );
}

// ---------- materials ----------

export function MaterialsTable({ onFilter }: { onFilter: (m: string) => void }) {
  const t = useT();
  const rows = useMemo(() => materials(), []);
  return (
    <div>
      <div className="scroll fill max-h-[420px]">
        <table className="data">
          <thead>
            <tr><th>{t("Material")}</th><th>{t("Evidence type")}</th><th>{t("Investigations")}</th><th className="num">{t("Records")}</th><th className="num">{t("Oxygen tested %")}</th><th className="num">{t("Flow cm/s")}</th><th>{t("At 30% O₂ or more")}</th></tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.material} className="cursor-pointer" onClick={() => onFilter(m.material.split(" (")[0])}>
                <td className="font-medium">{m.material}</td>
                <td className="text-dim">{m.kinds.map((k) => t(k)).join(", ")}</td>
                <td className="text-dim">{m.investigations.join(", ")}</td>
                <td className="num">{m.records}</td>
                <td className="num">{m.o2_range ? range(m.o2_range) : "—"}</td>
                <td className="num">{m.flow_range ? range(m.flow_range) : "—"}</td>
                <td style={{ color: m.enriched_records ? "var(--ok)" : "var(--danger)" }}>{m.enriched_records ? t("{n} records", { n: m.enriched_records }) : t("never tested")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-[12px] leading-relaxed text-dim">
        {t("These are the only materials in the PSI experimental tables. Structural metals, composites and most cabin plastics have no record here. Click a row to filter the test table.")}
      </div>
    </div>
  );
}

// ---------- gaps and coverage ----------

export function GapsPanel({ gaps }: { gaps: Gap[] }) {
  const t = useT();
  const cells = useMemo(() => coverage(), []);
  const max = Math.max(...cells.map((c) => c.total));
  const [phase, setPhase] = useState<"total" | "solid" | "liquid" | "gas">("solid");
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-2">
        {gaps.map((g) => (
          <div key={g.title} className="border-l-2 py-0.5 pl-3" style={{ borderColor: g.severity === "critical" ? "var(--danger)" : g.severity === "major" ? "var(--warn)" : "var(--line-strong)" }}>
            <div className="label" style={{ color: g.severity === "critical" ? "var(--danger)" : g.severity === "major" ? "var(--warn)" : undefined }}>{t(g.severity)}</div>
            <div className="text-[13.5px] font-medium">{g.title}</div>
            <div className="text-[12px] leading-relaxed text-dim">{g.detail}</div>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="label">{t("Records per oxygen and pressure band")}</span>
          {(["solid", "liquid", "gas", "total"] as const).map((p) => (
            <button key={p} className="btn !px-2 !py-1" aria-pressed={phase === p} onClick={() => setPhase(p)}>{t(p)}</button>
          ))}
        </div>
        <table className="w-full border-separate border-spacing-[3px] text-center">
          <thead>
            <tr><th />{O2_BINS.map((b) => <th key={b[2]} className="label font-normal">{b[2]}</th>)}</tr>
          </thead>
          <tbody>
            {[...P_BINS].reverse().map((pb) => (
              <tr key={pb[2]}>
                <td className="label whitespace-nowrap pr-1 text-right">{pb[2]}</td>
                {O2_BINS.map((ob) => {
                  const c = cells.find((x) => x.o2 === ob[2] && x.pressure === pb[2])!;
                  const v = c[phase];
                  const corner = ob[0] >= 30 && pb[1] <= 0.8;
                  return (
                    <td key={ob[2]} className="mono h-9 text-[12px]" style={{ background: v ? `color-mix(in srgb, var(--accent) ${Math.round(100 * (0.1 + 0.55 * Math.sqrt(v / max)))}%, transparent)` : corner ? "rgba(255,100,100,0.13)" : "color-mix(in srgb, var(--mark) 2%, transparent)", outline: corner ? "1px dashed var(--warn)" : undefined, color: v ? "var(--mark)" : "var(--ink-faint)" }}>
                      {v || "0"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 text-[11.5px] leading-relaxed text-dim">{t("Dashed cells are the Moon base and rover corner (30% oxygen or more, about 10.2 psi or less). Only records with both oxygen and pressure are counted.")}</div>
      </div>
    </div>
  );
}

// ---------- brief ----------

export function BriefPanel({ brief, loading, onRun, hasDesign }: { brief: Brief | null; loading: boolean; onRun: (q: string, fast: boolean) => void; hasDesign: string }) {
  const t = useT();
  // Until the user types, the default question follows the interface language.
  const [typed, setQ] = useState<string | null>(null);
  const q = typed ?? t("What should I know before selecting cabin materials for this atmosphere?");
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input className="field min-w-[260px] flex-1" value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("Question for the analysts")} onKeyDown={(e) => e.key === "Enter" && !loading && onRun(q, false)} />
        <button className="btn" disabled={loading} onClick={() => onRun(q, false)}>{loading ? t("Analysts working…") : t("Ask the swarm")}</button>
        <button className="btn" disabled={loading} onClick={() => onRun(q, true)} title={t("Assembled by code, no language model")}>{t("Evidence only")}</button>
      </div>
      <div className="label mt-2">{t("Design: {design} · Agents: prevention · detection · suppression · lead", { design: hasDesign })}</div>
      {brief && (
        <div className="mt-3 space-y-3">
          <div className="border-l-2 border-accent pl-3">
            <div className="label text-accent">{t("Bottom line")}</div>
            <div className="text-[14px] leading-relaxed">{brief.bottom_line}</div>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {brief.sections.map((s) => (
              <div key={s.agent} className="border border-line p-3">
                <div className="label">{s.title}</div>
                <div className="mt-1 text-[12.5px] leading-relaxed">{s.text}</div>
                {s.citations.length > 0 && <div className="mono mt-2 text-[10.5px] text-faint">{t("Cites: {list}", { list: s.citations.join(" · ") })}</div>}
              </div>
            ))}
          </div>
          <div className="text-[11.5px] text-dim">
            <span className="mono mr-2 border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-widest">{brief.mode === "language-model" ? t("SI-generated text") : t("No SI text")}</span>
            {brief.disclosure}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- connect ----------

const noop = () => () => {};

export function ConnectPanel() {
  const t = useT();
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const url = `${origin}/api/mcp`;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-2 text-[13px] leading-relaxed">
        <p>{t("The lab is also an MCP server. Any assistant that speaks the Model Context Protocol can query the same harmonized records, the ranking and the analysts.")}</p>
        <div className="label mt-3">{t("Research server")}</div>
        <code className="mono block break-all border border-line px-3 py-2 text-[12px] text-accent">{url}</code>
        <div className="label mt-3">{t("Voice server (short spoken answers)")}</div>
        <code className="mono block break-all border border-line px-3 py-2 text-[12px] text-accent">{origin}/api/voice/mcp</code>
        <div className="label mt-3">{t("Resources server (NASA and partner library)")}</div>
        <code className="mono block break-all border border-line px-3 py-2 text-[12px] text-accent">{origin}/api/resources/mcp</code>
        <div className="label mt-3">{t("Orchestrator (one question across the servers)")}</div>
        <code className="mono block break-all border border-line px-3 py-2 text-[12px] text-accent">{origin}/api/orchestrator/mcp</code>
        <div className="label mt-3">{t("Add to Claude Code")}</div>
        <code className="mono block break-all border border-line px-3 py-2 text-[12px]">claude mcp add --transport http fire-lab {url}</code>
      </div>
      <div>
        <div className="label mb-1">{t("Research tools")}</div>
        <table className="data">
          <tbody>
            {[
              ["lab_overview", t("Headline numbers, environments, agents, gaps")],
              ["search_investigations", t("Find investigations by text, pillar, fuel phase")],
              ["get_investigation", t("Objective, hardware, publications, tested ranges")],
              ["query_tests", t("Filter the harmonized test records")],
              ["evidence_for_design", t("Closest tests, ranking and gaps for an atmosphere")],
              ["rank_investigations", t("Scored ranking with reasons")],
              ["material_evidence", t("What was tested for a material, or that it never was")],
              ["coverage_gaps", t("Gap list and coverage grid")],
              ["list_files / get_file_link", t("Documents and video, linked live from NASA PSI")],
              ["build_chart / ask_chart", t("Charts and tables computed on request")],
              ["run_fire_scenario / fire_models", t("Cabin fire simulator and published fire models")],
              ["consult_swarm", t("Cited brief from the four agents")],
              ["resources: search_resources, incident_lessons…", "Apollo 1, Apollo 13, Mir, Spinoff, JAXA, ESA"],
              ["orchestrator: ask_lab", t("One cited answer across every server")],
            ].map(([n, d]) => (
              <tr key={n}><td className="mono whitespace-nowrap text-[11.5px] text-accent">{n}</td><td className="text-dim">{d}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
