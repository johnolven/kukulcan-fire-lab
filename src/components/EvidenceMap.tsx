"use client";
// Evidence map: every harmonized record placed by oxygen and pressure, with the
// design point and the enriched low-pressure corner drawn on top.
// Code generated with SI assistance (Claude Code).

import { useMemo, useState } from "react";
import { describeTest, o2Of, phaseGroup, type PhaseGroup } from "@/lib/lab";
import { useT } from "@/lib/useControl";
import type { TestRecord } from "@/lib/types";
import { PSI_PER_ATM } from "@/lib/types";

const W = 760;
const H = 470;
const M = { l: 54, r: 18, t: 16, b: 40 };
const O2_MAX = 100;
const PSI_MAX = 48;

const COLOR: Record<PhaseGroup, string> = { gas: "var(--gas)", liquid: "var(--liquid)", solid: "var(--solid)", smoke: "var(--smoke)" };

const x = (o2: number) => M.l + (Math.min(o2, O2_MAX) / O2_MAX) * (W - M.l - M.r);
const y = (psi: number) => H - M.b - (Math.min(psi, PSI_MAX) / PSI_MAX) * (H - M.t - M.b);

export function EvidenceMap({
  tests,
  o2,
  psi,
  nearestIds,
  onPick,
}: {
  tests: TestRecord[];
  o2: number;
  psi: number;
  nearestIds: Set<string>;
  onPick: (o2: number, psi: number) => void;
}) {
  const tr = useT();
  const [hover, setHover] = useState<TestRecord | null>(null);

  const points = useMemo(
    () =>
      tests.flatMap((t) => {
        const o = o2Of(t);
        if (o == null || t.pressure_atm == null) return [];
        // small deterministic jitter so stacked records stay visible
        const h = [...t.id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 9973, 7);
        return [{ t, cx: x(o) + ((h % 13) - 6) * 0.5, cy: y(t.pressure_atm * PSI_PER_ATM) + (((h >> 4) % 13) - 6) * 0.5, g: phaseGroup(t.fuel_phase) }];
      }),
    [tests],
  );
  const unplaced = tests.length - points.length;

  function click(e: React.MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const py = ((e.clientY - r.top) / r.height) * H;
    if (px < M.l || px > W - M.r || py < M.t || py > H - M.b) return;
    const o = Math.round(((px - M.l) / (W - M.l - M.r)) * O2_MAX);
    const p = Math.round((((H - M.b - py) / (H - M.t - M.b)) * PSI_MAX) * 10) / 10;
    onPick(Math.max(10, o), Math.max(3, p));
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair select-none" onClick={click} role="img" aria-label={tr("Test records by oxygen concentration and pressure")}>
        {/* grid */}
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
          <g key={`x${v}`}>
            <line x1={x(v)} y1={M.t} x2={x(v)} y2={H - M.b} stroke="var(--line)" strokeWidth={v % 50 === 0 ? 1 : 0.5} />
            <text x={x(v)} y={H - M.b + 14} textAnchor="middle" fontSize={9} fill="var(--ink-dim)" className="mono">{v}</text>
          </g>
        ))}
        {[0, 4.3, 10.2, 14.7, 20, 30, 40].map((v) => (
          <g key={`y${v}`}>
            <line x1={M.l} y1={y(v)} x2={W - M.r} y2={y(v)} stroke="var(--line)" strokeWidth={0.5} />
            <text x={M.l - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="var(--ink-dim)" className="mono">{v}</text>
          </g>
        ))}
        <text x={(W + M.l) / 2} y={H - 6} textAnchor="middle" fontSize={9} letterSpacing={1.5} fill="var(--ink-dim)" className="mono">{tr("OXYGEN, % BY VOLUME")}</text>
        <text transform={`translate(12 ${(H - M.b + M.t) / 2}) rotate(-90)`} textAnchor="middle" fontSize={9} letterSpacing={1.5} fill="var(--ink-dim)" className="mono">{tr("PRESSURE, PSI")}</text>

        {/* enriched, reduced-pressure corner from the challenge statement */}
        <rect x={x(30)} y={y(10.2)} width={x(100) - x(30)} height={y(0) - y(10.2)} fill="rgba(255,181,74,0.06)" stroke="var(--warn)" strokeWidth={0.8} strokeDasharray="5 4" />
        <text x={x(100) - 6} y={y(0) - 6} textAnchor="end" fontSize={9} letterSpacing={1} fill="var(--warn)" className="mono">{tr("MOON BASE / ROVER CORNER: 30%+ O2, 10.2 PSI OR LESS")}</text>
        {/* sea-level air reference */}
        <line x1={x(21)} y1={M.t} x2={x(21)} y2={H - M.b} stroke="var(--line-strong)" strokeWidth={0.6} strokeDasharray="2 4" />
        <text x={x(21) + 4} y={M.t + 10} fontSize={8} fill="var(--ink-faint)" className="mono">{tr("AIR 21%")}</text>

        {/* records */}
        {points.map(({ t, cx, cy, g }) => {
          const near = nearestIds.has(t.id);
          return (
            <circle
              key={t.id}
              cx={cx}
              cy={cy}
              r={near ? 4.2 : t.granularity === "test" ? 2.3 : 3.4}
              fill={near ? COLOR[g] : t.granularity === "test" ? COLOR[g] : "none"}
              fillOpacity={near ? 1 : 0.55}
              stroke={near ? "var(--mark)" : COLOR[g]}
              strokeWidth={near ? 1 : 0.7}
              onMouseEnter={() => setHover(t)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}

        {/* design point */}
        <g pointerEvents="none">
          <line x1={x(o2)} y1={M.t} x2={x(o2)} y2={H - M.b} stroke="var(--mark)" strokeWidth={0.6} opacity={0.5} />
          <line x1={M.l} y1={y(psi)} x2={W - M.r} y2={y(psi)} stroke="var(--mark)" strokeWidth={0.6} opacity={0.5} />
          <circle cx={x(o2)} cy={y(psi)} r={6} fill="none" stroke="var(--mark)" strokeWidth={1} className="pulse" />
          <circle cx={x(o2)} cy={y(psi)} r={6} fill="none" stroke="var(--mark)" strokeWidth={1.4} />
          <circle cx={x(o2)} cy={y(psi)} r={1.6} fill="var(--mark)" />
          <text x={x(o2) + (o2 > 80 ? -10 : 10)} y={y(psi) - 9} textAnchor={o2 > 80 ? "end" : "start"} fontSize={10} fill="var(--mark)" className="mono">
            {tr("DESIGN {o2}% · {psi} PSI", { o2, psi })}
          </text>
        </g>
      </svg>

      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
        {(["solid", "liquid", "gas"] as PhaseGroup[]).map((g) => (
          <span key={g} className="label flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLOR[g] }} />
            {g === "solid" ? tr("solid material") : g === "liquid" ? tr("liquid droplet") : tr("gas flame")}
          </span>
        ))}
        <span className="label flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full border border-mark/70" />
          {tr("ring = test day or planned range")}
        </span>
        <span className="label ml-auto">{tr("{placed} placed · {unplaced} lack oxygen or pressure · click the map to move the design", { placed: points.length, unplaced })}</span>
      </div>

      {hover && (
        <div className="panel pointer-events-none absolute left-16 top-3 max-w-[420px] px-3 py-2 text-[12px]">
          <div className="label mb-1" style={{ color: COLOR[phaseGroup(hover.fuel_phase)] }}>
            {hover.acronym} · {tr(hover.granularity)}
          </div>
          {describeTest(hover)}
          {hover.assumed.length > 0 && <div className="mt-1 text-[11px] text-dim">{tr("Assumed: {note}", { note: hover.assumed[0] })}</div>}
        </div>
      )}
    </div>
  );
}
