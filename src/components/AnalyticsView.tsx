"use client";
// Analytics: a dashboard built on the fly. Ask for a chart or table in plain
// language (typed, spoken, or from an MCP client); the language model chooses the
// specification and code computes every number from the harmonized records.
// Code generated with SI assistance (Claude Code).

import { useCallback, useEffect, useRef, useState } from "react";
import { PRESETS, type ChartResult, type ChartSpec } from "@/lib/analytics";
import { useT } from "@/lib/useControl";

// Categorical palette for the dark surface, fixed order, validated for
// color-vision-deficiency separation and contrast against #060c14.
const PALETTE = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c", "#9085e9", "#e66767"];
const OTHER = "#7d8a96";

const EVENT = "firelab:analytics";
const KEY = "firelab:dashboard";

export function requestChart(question: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: question }));
}

interface Card {
  id: number;
  question: string | null;
  by: string;
  reason: string | null;
  result: ChartResult;
}

const fmt = (v: number | null) => (v == null ? "–" : Math.abs(v) >= 1000 ? Math.round(v).toLocaleString() : Number.isInteger(v) ? String(v) : v.toFixed(1));

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

interface Tip {
  x: number;
  y: number;
  title: string;
  lines: [string, string, string?][]; // color, text, muted suffix
}

// ---------- vertical grouped bars ----------

function Bars({ r, colors, onTip }: { r: ChartResult; colors: Record<string, string>; onTip: (t: Tip | null) => void }) {
  const t = useT();
  const W = 620, H = 250, M = { l: 44, r: 10, t: 12, b: 46 };
  const max = niceMax(Math.max(1, ...r.series.flatMap((s) => s.values.map((v) => v ?? 0))));
  const n = r.categories.length;
  const band = (W - M.l - M.r) / Math.max(1, n);
  const inner = Math.min(band * 0.78, 30 * r.series.length + 2 * (r.series.length - 1));
  const bw = Math.max(3, (inner - 2 * (r.series.length - 1)) / r.series.length);
  const y = (v: number) => H - M.b - (v / max) * (H - M.t - M.b);
  const rotate = n > 7 || r.categories.some((c) => c.length > 9);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={r.spec.title}>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={M.l} x2={W - M.r} y1={y(max * f)} y2={y(max * f)} stroke="var(--line)" strokeWidth={f === 0 ? 1 : 0.5} />
          <text x={M.l - 6} y={y(max * f) + 3} textAnchor="end" fontSize={9} fill="var(--ink-dim)" className="mono">{fmt(max * f)}</text>
        </g>
      ))}
      {r.categories.map((c, i) => {
        const x0 = M.l + band * i + (band - inner) / 2;
        return (
          <g
            key={c}
            onMouseEnter={(e) => onTip({ x: e.clientX, y: e.clientY, title: `${r.x_label}: ${c}`, lines: r.series.map((s) => [colors[s.name], `${r.series.length > 1 ? `${s.name}: ` : ""}${fmt(s.values[i])}`, t("{n} records", { n: s.counts[i] })]) })}
            onMouseMove={(e) => onTip({ x: e.clientX, y: e.clientY, title: `${r.x_label}: ${c}`, lines: r.series.map((s) => [colors[s.name], `${r.series.length > 1 ? `${s.name}: ` : ""}${fmt(s.values[i])}`, t("{n} records", { n: s.counts[i] })]) })}
            onMouseLeave={() => onTip(null)}
          >
            <rect x={M.l + band * i} y={M.t} width={band} height={H - M.t - M.b} fill="transparent" />
            {r.series.map((s, k) => {
              const v = s.values[i];
              if (v == null) return null;
              const top = y(v);
              const h = Math.max(1, H - M.b - top);
              const x = x0 + k * (bw + 2);
              const rad = Math.min(4, bw / 2, h);
              return <path key={s.name} d={`M${x} ${H - M.b} V${top + rad} Q${x} ${top} ${x + rad} ${top} H${x + bw - rad} Q${x + bw} ${top} ${x + bw} ${top + rad} V${H - M.b} Z`} fill={colors[s.name]} />;
            })}
            <text
              x={M.l + band * i + band / 2}
              y={H - M.b + 12}
              textAnchor={rotate ? "end" : "middle"}
              transform={rotate ? `rotate(-28 ${M.l + band * i + band / 2} ${H - M.b + 12})` : undefined}
              fontSize={9}
              fill="var(--ink-dim)"
              className="mono"
            >
              {c.length > 16 ? `${c.slice(0, 15)}…` : c}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------- horizontal bars (one series, named categories) ----------

function Rows({ r, colors, onTip }: { r: ChartResult; colors: Record<string, string>; onTip: (t: Tip | null) => void }) {
  const t = useT();
  const s = r.series[0];
  const max = Math.max(1, ...s.values.map((v) => v ?? 0));
  return (
    <div className="space-y-[3px]">
      {r.categories.map((c, i) => (
        <div
          key={c}
          className="grid grid-cols-[150px_1fr_52px] items-center gap-2"
          onMouseEnter={(e) => onTip({ x: e.clientX, y: e.clientY, title: c, lines: [[colors[s.name], `${r.y_label}: ${fmt(s.values[i])}`, t("{n} records", { n: s.counts[i] })]] })}
          onMouseLeave={() => onTip(null)}
        >
          <span className="truncate text-right text-[11.5px] text-dim" title={c}>{c}</span>
          <span className="h-[14px]">
            {s.values[i] != null && <span className="block h-full rounded-r-[4px]" style={{ width: `${Math.max(0.6, ((s.values[i] ?? 0) / max) * 100)}%`, background: colors[s.name] }} />}
          </span>
          <span className="mono text-[11.5px]">{fmt(s.values[i])}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- scatter ----------

function Scatter({ r, colors, onTip }: { r: ChartResult; colors: Record<string, string>; onTip: (t: Tip | null) => void }) {
  const W = 620, H = 270, M = { l: 46, r: 12, t: 12, b: 34 };
  const xs = r.points.map((p) => p.x);
  const ys = r.points.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y1 = niceMax(Math.max(...ys));
  const pad = (x1 - x0) * 0.04 || 1;
  const sx = (v: number) => M.l + ((v - (x0 - pad)) / (x1 - x0 + 2 * pad)) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - (v / y1) * (H - M.t - M.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={r.spec.title}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={sy(y1 * t)} y2={sy(y1 * t)} stroke="var(--line)" strokeWidth={t === 0 ? 1 : 0.5} />
          <text x={M.l - 6} y={sy(y1 * t) + 3} textAnchor="end" fontSize={9} fill="var(--ink-dim)" className="mono">{fmt(y1 * t)}</text>
          <text x={sx(x0 + (x1 - x0) * t)} y={H - M.b + 13} textAnchor="middle" fontSize={9} fill="var(--ink-dim)" className="mono">{fmt(x0 + (x1 - x0) * t)}</text>
        </g>
      ))}
      <text x={(W + M.l) / 2} y={H - 4} textAnchor="middle" fontSize={9} letterSpacing={1} fill="var(--ink-dim)" className="mono">{r.x_label.toUpperCase()}</text>
      {r.points.map((p, i) => (
        <circle
          key={i}
          cx={sx(p.x)}
          cy={sy(p.y)}
          r={4}
          fill={colors[p.group] ?? OTHER}
          fillOpacity={0.85}
          stroke="var(--surface)"
          strokeWidth={1.5}
          onMouseEnter={(e) => onTip({ x: e.clientX, y: e.clientY, title: p.label, lines: [[colors[p.group] ?? OTHER, `${r.x_label} ${fmt(p.x)} · ${r.y_label} ${fmt(p.y)}`, r.groups.length > 1 ? p.group : undefined]] })}
          onMouseLeave={() => onTip(null)}
        />
      ))}
    </svg>
  );
}

// ---------- table view (always available) ----------

function DataTable({ r }: { r: ChartResult }) {
  const t = useT();
  if (r.kind === "scatter") {
    return (
      <div className="scroll max-h-[250px]">
        <table className="data">
          <thead><tr><th>{t("Record")}</th><th className="num">{r.x_label}</th><th className="num">{r.y_label}</th>{r.groups.length > 1 && <th>{r.spec.group_by}</th>}</tr></thead>
          <tbody>
            {r.points.slice(0, 200).map((p, i) => (
              <tr key={i}><td>{p.label}</td><td className="num">{fmt(p.x)}</td><td className="num">{fmt(p.y)}</td>{r.groups.length > 1 && <td className="text-dim">{p.group}</td>}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="scroll max-h-[250px]">
      <table className="data">
        <thead>
          <tr><th>{r.x_label}</th>{r.series.map((s) => <th key={s.name} className="num">{r.series.length > 1 ? s.name : r.y_label}</th>)}<th className="num">{t("Records")}</th></tr>
        </thead>
        <tbody>
          {r.categories.map((c, i) => (
            <tr key={c}><td>{c}</td>{r.series.map((s) => <td key={s.name} className="num">{fmt(s.values[i])}</td>)}<td className="num text-dim">{r.series.reduce((n, s) => n + s.counts[i], 0)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- one dashboard card ----------

function ChartCard({ card, onRemove, onTip }: { card: Card; onRemove: () => void; onTip: (t: Tip | null) => void }) {
  const t = useT();
  const r = card.result;
  const [asTable, setAsTable] = useState(r.kind === "table");
  const colors = Object.fromEntries(r.groups.map((g, i) => [g, g === "Other" ? OTHER : PALETTE[i % PALETTE.length]]));
  const empty = r.used === 0;
  const horizontal = r.kind === "bar" && r.series.length === 1 && !["o2_pct", "pressure_psi", "flow_cm_s", "burn_time_s"].includes(r.spec.x);
  return (
    <article className="border border-line p-3">
      <header className="flex items-start gap-2">
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-medium leading-snug">{r.spec.title}</h3>
          {r.spec.note && <p className="mt-0.5 text-[11.5px] leading-snug text-dim">{r.spec.note}</p>}
        </div>
        <span className="ml-auto flex shrink-0 gap-1">
          {r.kind !== "table" && <button className="btn !px-1.5 !py-0.5 !text-[9.5px]" aria-pressed={asTable} onClick={() => setAsTable(!asTable)}>{t("Table")}</button>}
          <button className="btn !px-1.5 !py-0.5 !text-[9.5px]" onClick={onRemove} aria-label={t("Remove this chart")}>{t("Remove")}</button>
        </span>
      </header>

      {r.groups.length > 1 && !asTable && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {r.groups.map((g) => (
            <span key={g} className="flex items-center gap-1.5 text-[11px] text-dim"><span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: colors[g] }} />{g}</span>
          ))}
        </div>
      )}

      <div className="mt-2">
        {empty ? (
          <p className="py-6 text-center text-[12.5px] text-dim">{r.warnings[r.warnings.length - 1] ?? t("No record matches.")}</p>
        ) : asTable ? (
          <DataTable r={r} />
        ) : r.kind === "scatter" ? (
          <Scatter r={r} colors={colors} onTip={onTip} />
        ) : horizontal ? (
          <Rows r={r} colors={colors} onTip={onTip} />
        ) : (
          <Bars r={r} colors={colors} onTip={onTip} />
        )}
      </div>

      <footer className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-faint">
        {!asTable && !empty && !horizontal && <span className="mono uppercase tracking-wider">Y: {r.y_label}</span>}
        <span>{t("{used} of {matched} matching records had the fields needed", { used: r.used.toLocaleString(), matched: r.matched.toLocaleString() })}</span>
        {r.warnings.filter((w) => !empty || w !== r.warnings[r.warnings.length - 1]).map((w) => <span key={w} className="text-warn">{w}</span>)}
        <span className="mono ml-auto border border-line px-1 py-px text-[9px] uppercase tracking-widest">
          {card.by === "language-model" ? t("Spec by SI · numbers by code") : card.by === "keywords" ? t("Closest preset") : t("Preset")}
        </span>
      </footer>
      {card.question && <p className="mt-1 truncate text-[10.5px] text-faint" title={card.question}>{t("Asked:")} {card.question}{card.reason ? ` · ${card.reason}` : ""}</p>}
    </article>
  );
}

// ---------- the view ----------

export function AnalyticsView() {
  const t = useT();
  const [cards, setCards] = useState<Card[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);
  const seq = useRef(0);
  const loaded = useRef(false);

  // restore the dashboard built earlier in this browser
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Card[];
        if (Array.isArray(saved) && saved.length) {
          seq.current = Math.max(...saved.map((c) => c.id));
          setCards(saved);
        }
      } catch {
        /* nothing saved */
      }
      loaded.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(cards.slice(0, 12)));
    } catch {
      /* storage unavailable */
    }
  }, [cards]);

  const build = useCallback(async (body: { question?: string; spec?: ChartSpec }) => {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json();
      if (!j.result) throw new Error(j.error ?? "No result");
      setCards((c) => [{ id: ++seq.current, question: body.question ?? null, by: j.by, reason: j.reason ?? null, result: j.result }, ...c]);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }, []);

  // requests arriving from the voice assistant or the command box
  useEffect(() => {
    const listener = (e: Event) => {
      const question = (e as CustomEvent<string>).detail;
      if (question) build({ question });
    };
    window.addEventListener(EVENT, listener);
    return () => window.removeEventListener(EVENT, listener);
  }, [build]);

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-[16px] font-medium">{t("Analytics, built as you ask")}</h2>
        <span className="text-[12.5px] text-dim">{t("Describe a chart or table. The language model picks the fields; every number is computed from the harmonized NASA records.")}</span>
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim() && !busy) {
            build({ question: q.trim() });
            setQ("");
          }
        }}
      >
        <input className="field min-w-[260px] flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("e.g. burn time against oxygen for heptane droplets, colored by diluent")} aria-label={t("Describe the chart you want")} />
        <button className="btn" type="submit" disabled={busy || !q.trim()}>{busy ? t("Building…") : t("Build chart")}</button>
        {cards.length > 0 && <button className="btn" type="button" onClick={() => setCards([])}>{t("Clear dashboard")}</button>}
      </form>
      <div className="mt-2 flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button key={p.title} className="mono border border-line px-1.5 py-0.5 text-[10px] text-dim transition-colors hover:border-accent hover:text-accent" onClick={() => build({ spec: p })} disabled={busy}>
            {t(p.title.split(":")[0].split("?")[0])}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-[12.5px] text-warn">{t("That chart could not be built. Try rephrasing, or start from one of the presets.")}</p>}

      {cards.length === 0 ? (
        <p className="mt-6 max-w-[640px] text-[12.5px] leading-relaxed text-dim">
          {t("The dashboard is empty. Ask for a chart above, pick a preset, or say it to the lab: “chart the extinction rate by diluent gas”. Each chart is added here and stays until you remove it. The same builder is available to MCP clients as the tools")} <span className="mono text-accent">ask_chart</span> {t("and")} <span className="mono text-accent">build_chart</span>.
        </p>
      ) : (
        <div className="mt-3 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 430px), 1fr))" }}>
          {cards.map((c) => (
            <ChartCard key={c.id} card={c} onRemove={() => setCards((all) => all.filter((x) => x.id !== c.id))} onTip={setTip} />
          ))}
        </div>
      )}

      {tip && (
        <div className="panel pointer-events-none fixed z-50 max-w-[300px] px-2.5 py-1.5 text-[11.5px]" style={{ left: Math.min(tip.x + 14, window.innerWidth - 310), top: tip.y + 14, background: "var(--surface)" }}>
          <div className="mb-0.5 font-medium">{tip.title}</div>
          {tip.lines.map(([color, text, sub], i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 shrink-0 rounded-[2px]" style={{ background: color }} />
              <span>{text}</span>
              {sub && <span className="text-faint">· {sub}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
