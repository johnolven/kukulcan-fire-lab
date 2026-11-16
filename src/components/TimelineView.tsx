"use client";
// Timeline: the incidents that shaped spacecraft fire safety, the technology that
// reached Earth, and the period PSI records for each combustion investigation.
// Code generated with SI assistance (Claude Code).

import { useMemo, useState } from "react";
import { phaseGroup } from "@/lib/lab";
import { MOMENTS, investigationSpans, type Moment, type Span } from "@/lib/timeline";
import { useT } from "@/lib/useControl";

const W = 720; // narrow drawing so labels stay readable in the stage
const M = { l: 118, r: 14 };
const Y0 = 1965;
const Y1 = 2027;
const x = (year: number) => M.l + ((year - Y0) / (Y1 - Y0)) * (W - M.l - M.r);
const PHASE: Record<string, string> = { solid: "var(--solid)", liquid: "var(--liquid)", gas: "var(--gas)", smoke: "var(--smoke)" };

export function TimelineView({ onOpen, onAsk }: { onOpen: (accession: string) => void; onAsk: (question: string) => void }) {
  const { spans, undated } = useMemo(() => investigationSpans(), []);
  const [tip, setTip] = useState<{ x: number; y: number; title: string; text: string } | null>(null);
  const t = useT(); // event titles, details and questions in lib/timeline.ts stay in English and are translated here
  const ROW = 17;
  const top = 112;
  const H = top + spans.length * ROW + 34;

  // alternate label positions within each lane so close dates do not overlap
  const stagger: Record<string, boolean> = {};
  for (const kind of ["incident", "earth"] as const) MOMENTS.filter((m) => m.kind === kind).forEach((m, i) => (stagger[m.title] = i % 2 === 1));

  const momentTip = (m: Moment, e: React.MouseEvent) => setTip({ x: e.clientX, y: e.clientY, title: t(m.title), text: `${t(m.detail)} ${t("Click to ask the lab.")}` });
  const spanTip = (s: Span, e: React.MouseEvent) => setTip({ x: e.clientX, y: e.clientY, title: s.name, text: `${s.end ? t("{start} to {end}", { start: Math.floor(s.start), end: Math.floor(s.end) }) : t("{start} to open", { start: Math.floor(s.start) })} · ${s.pillars.map((p) => t(p)).join(", ")}. ${s.focus ?? ""} ${t("Click to open.")}` });

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-[16px] font-medium">{t("Sixty years of spacecraft fire safety")}</h2>
        <span className="text-[12.5px] text-dim">{t("Incidents, technology that reached Earth, and the combustion investigations in NASA's repository. Click anything.")}</span>
      </div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        <span className="label flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rotate-45" style={{ background: "var(--danger)" }} />{t("incident")}</span>
        <span className="label flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--ok)" }} />{t("technology on Earth")}</span>
        {(["solid", "liquid", "gas", "smoke"] as const).map((p) => (
          <span key={p} className="label flex items-center gap-1.5"><span className="inline-block h-1.5 w-4" style={{ background: PHASE[p] }} />{p === "solid" ? t("solid material") : p === "liquid" ? t("liquid droplet") : p === "gas" ? t("gas flame") : t("smoke")}</span>
        ))}
      </div>

      <div className="scroll">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]" role="img" aria-label={t("Timeline of spacecraft fire incidents, Earth technology and combustion investigations from 1965 to today")}>
          {[1970, 1980, 1990, 2000, 2010, 2020].map((y) => (
            <g key={y}>
              <line x1={x(y)} x2={x(y)} y1={18} y2={H - 26} stroke="var(--line)" strokeWidth={0.6} />
              <text x={x(y)} y={H - 10} textAnchor="middle" fontSize={10} fill="var(--ink-dim)" className="mono">{y}</text>
            </g>
          ))}
          {/* station era, for orientation */}
          <rect x={x(2000.8)} y={top - 10} width={x(Y1) - x(2000.8)} height={spans.length * ROW + 8} fill="color-mix(in srgb, var(--accent) 3.5000000000000004%, transparent)" />
          <text x={x(2000.8) + 4} y={top - 14} fontSize={8.5} letterSpacing={1} fill="var(--ink-faint)" className="mono">{t("STATION CREWED SINCE 2000")}</text>

          {/* incidents and Earth technology */}
          <text x={M.l - 8} y={38} textAnchor="end" fontSize={9} letterSpacing={1} fill="var(--ink-dim)" className="mono">{t("INCIDENTS")}</text>
          <text x={M.l - 8} y={76} textAnchor="end" fontSize={9} letterSpacing={1} fill="var(--ink-dim)" className="mono">{t("ON EARTH")}</text>
          <line x1={M.l} x2={W - M.r} y1={34} y2={34} stroke="var(--line)" />
          <line x1={M.l} x2={W - M.r} y1={72} y2={72} stroke="var(--line)" />
          {MOMENTS.map((m) => {
            const cy = m.kind === "incident" ? 34 : 72;
            const color = m.kind === "incident" ? "var(--danger)" : "var(--ok)";
            return (
              <g key={m.title} className="cursor-pointer" onClick={() => onAsk(t(m.ask))} onMouseEnter={(e) => momentTip(m, e)} onMouseMove={(e) => momentTip(m, e)} onMouseLeave={() => setTip(null)}>
                <rect x={x(m.year) - 12} y={cy - 12} width={24} height={24} fill="transparent" />
                {m.kind === "incident" ? <rect x={x(m.year) - 5} y={cy - 5} width={10} height={10} transform={`rotate(45 ${x(m.year)} ${cy})`} fill={color} stroke="var(--surface)" strokeWidth={1.5} /> : <circle cx={x(m.year)} cy={cy} r={5} fill={color} stroke="var(--surface)" strokeWidth={1.5} />}
                <text x={x(m.year) + 8} y={cy + (stagger[m.title] ? 17 : -8)} fontSize={10} fill="var(--ink)">{t(m.title)}</text>
              </g>
            );
          })}

          {/* investigations */}
          <text x={M.l - 8} y={top - 14} textAnchor="end" fontSize={9} letterSpacing={1} fill="var(--ink-dim)" className="mono">{t("INVESTIGATIONS")}</text>
          {spans.map((s, i) => {
            const y = top + i * ROW;
            const end = s.end ?? Y1 - 0.4;
            const color = PHASE[phaseGroup(s.phase)];
            return (
              <g key={s.accession} className="cursor-pointer" onClick={() => onOpen(s.accession)} onMouseEnter={(e) => spanTip(s, e)} onMouseMove={(e) => spanTip(s, e)} onMouseLeave={() => setTip(null)}>
                <rect x={0} y={y - 2} width={W} height={ROW} fill="transparent" />
                <text x={M.l - 8} y={y + 9} textAnchor="end" fontSize={10} fill="var(--ink)">{s.name}</text>
                <rect x={x(s.start)} y={y + 2} width={Math.max(3, x(end) - x(s.start))} height={9} rx={2} fill={color} fillOpacity={0.85} />
                {!s.end && <text x={x(end) + 4} y={y + 10} fontSize={8.5} fill="var(--ink-faint)" className="mono">{t("no end recorded")}</text>}
              </g>
            );
          })}
        </svg>
      </div>

      <p className="mt-2 text-[11.5px] leading-relaxed text-dim">
        {t("Bars show the investigation period recorded in NASA's repository, which covers the whole project and not only the days in orbit.")} {undated.length > 0 && `${t("No dates are recorded for {names}.", { names: undated.join(", ") })} `}
        {t("Incident and technology dates come from the NASA pages in the library.")}
      </p>

      {tip && (
        <div className="panel pointer-events-none fixed z-50 max-w-[320px] px-2.5 py-1.5 text-[11.5px] leading-snug" style={{ left: Math.min(tip.x + 14, window.innerWidth - 330), top: tip.y + 14, background: "var(--surface)" }}>
          <div className="mb-0.5 font-medium">{tip.title}</div>
          <div className="text-dim">{tip.text}</div>
        </div>
      )}
    </div>
  );
}
