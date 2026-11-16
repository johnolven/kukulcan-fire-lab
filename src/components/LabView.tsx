"use client";
// Fire-model lab: five published fire models running live, ported from the
// team's earlier project "Umbral". Oxygen and pressure come from the cabin on the
// table; the ring on each graph is your case.
// Code generated with SI assistance (Claude Code).

import { useMemo, type ReactNode } from "react";
import * as FM from "@/lib/fireModels";
import { useControl, useT } from "@/lib/useControl";
import { CabinView } from "./CabinView";
import { Surface3D, type SurfaceSpec } from "./Surface3D";

type CaseId = "cabin" | "map" | "margin" | "test" | "flame" | "droplet";
const CASES: [CaseId, string, string][] = [
  ["cabin", "Live cabin", "Flame, smoke and air moving through a crew module"],
  ["map", "Flammability map", "Does a thin material burn at this oxygen and airflow?"],
  ["margin", "Earth test vs orbit", "A material can pass on Earth and still burn in orbit"],
  ["test", "Test probability", "How likely is one sample to burn, and how many to test"],
  ["flame", "Flame temperature", "More oxygen, hotter flame"],
  ["droplet", "Burning droplet", "The flame that looks out but is not"],
];

// Series colors from the validated dark-surface categorical palette (same as Analytics).
const BLUE = "#3987e5", ORANGE = "#d95926", AQUA = "#199e70";

function Slider({ label, value, unit, min, max, step, onChange, digits = 0 }: { label: string; value: number; unit: string; min: number; max: number; step: number; onChange: (v: number) => void; digits?: number }) {
  return (
    <label className="block">
      <span className="label flex justify-between"><span>{label}</span><span className="text-ink">{value.toFixed(digits)} {unit}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

function Readout({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="mono text-[17px]" style={{ color: tone }}>{value}</div>
    </div>
  );
}

// A small plotting frame: scales, grid, axis titles. Children draw in data space via sx/sy.
function Plot({ x, y, xLabel, yLabel, xTicks, yTicks, xLog, children, label }: { x: [number, number]; y: [number, number]; xLabel: string; yLabel: string; xTicks: number[]; yTicks: number[]; xLog?: boolean; label: string; children: (sx: (v: number) => number, sy: (v: number) => number) => ReactNode }) {
  const W = 560, H = 300, M = { l: 46, r: 14, t: 12, b: 36 };
  const fx = (v: number) => (xLog ? Math.log(v) : v);
  const sx = (v: number) => M.l + ((fx(v) - fx(x[0])) / (fx(x[1]) - fx(x[0]))) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - ((v - y[0]) / (y[1] - y[0])) * (H - M.t - M.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
      {yTicks.map((v) => (
        <g key={`y${v}`}>
          <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke="var(--line)" strokeWidth={0.5} />
          <text x={M.l - 6} y={sy(v) + 3} textAnchor="end" fontSize={9} fill="var(--ink-dim)" className="mono">{v}</text>
        </g>
      ))}
      {xTicks.map((v) => (
        <g key={`x${v}`}>
          <line x1={sx(v)} x2={sx(v)} y1={M.t} y2={H - M.b} stroke="var(--line)" strokeWidth={0.5} />
          <text x={sx(v)} y={H - M.b + 12} textAnchor="middle" fontSize={9} fill="var(--ink-dim)" className="mono">{v}</text>
        </g>
      ))}
      <text x={(W + M.l) / 2} y={H - 5} textAnchor="middle" fontSize={9} letterSpacing={1.2} fill="var(--ink-dim)" className="mono">{xLabel.toUpperCase()}</text>
      <text transform={`translate(11 ${(H - M.b + M.t) / 2}) rotate(-90)`} textAnchor="middle" fontSize={9} letterSpacing={1.2} fill="var(--ink-dim)" className="mono">{yLabel.toUpperCase()}</text>
      {children(sx, sy)}
    </svg>
  );
}

const line = (pts: [number, number][], sx: (v: number) => number, sy: (v: number) => number) => pts.map(([a, b], i) => `${i ? "L" : "M"}${sx(a).toFixed(1)} ${sy(b).toFixed(1)}`).join("");

function Dot({ cx, cy, text }: { cx: number; cy: number; text?: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="none" stroke="var(--mark)" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={2} fill="var(--mark)" />
      {text && <text x={cx + 11} y={cy - 8} fontSize={10} fill="var(--mark)" className="mono">{text}</text>}
    </g>
  );
}

export function LabView({ o2, psi, defaultGravity }: { o2: number; psi: number; defaultGravity: number }) {
  const [which, setWhich] = useControl<CaseId>("lab.case");
  const [u, setU] = useControl<number>("lab.airflow");
  const [tau, setTau] = useControl<number>("lab.thickness");
  const [moc, setMoc] = useControl<number>("lab.material_limit");
  const [shift, setShift] = useControl<number>("lab.orbit_shift");
  const [scatter, setScatter] = useControl<number>("lab.scatter");
  const [n, setN] = useControl<number>("lab.samples");
  const [d0, setD0] = useControl<number>("lab.droplet");
  const [dim, setDim] = useControl<"2d" | "3d">("lab.dimension");
  const t = useT();
  const x = o2 / 100;
  const kpa = psi * 6.895;

  const body = useMemo(() => {
    if (which === "cabin") return null; // the live cabin draws itself
    if (which === "map") {
      const lim = 100 * FM.xlim(u);
      const burns = o2 > lim;
      const rate = FM.spread(x, u, tau);
      const curve: [number, number][] = [];
      for (let k = 0; k <= 80; k++) {
        const uu = 0.3 * Math.pow(100 / 0.3, k / 80);
        curve.push([uu, 100 * FM.xlim(uu)]);
      }
      const yTop = Math.max(42, Math.ceil(o2 / 10) * 10 + 2);
      return {
        controls: (
          <>
            <Slider label={t("Airflow at the flame")} value={u} unit="cm/s" min={0.3} max={100} step={0.1} digits={1} onChange={setU} />
            <Slider label={t("Fuel half-thickness")} value={tau} unit="mm" min={0.03} max={1} step={0.01} digits={2} onChange={setTau} />
          </>
        ),
        readouts: (
          <>
            <Readout label={t("Limit at this airflow")} value={`${lim.toFixed(1)}% O₂`} />
            <Readout label={t("At this cabin")} value={burns ? t("It burns") : t("It does not burn")} tone={burns ? "var(--danger)" : "var(--ok)"} />
            <Readout label={t("Flame spread")} value={burns ? `${rate.toFixed(2)} mm/s` : "0"} />
          </>
        ),
        text: burns
          ? t("At {o2}% oxygen the flame spreads against a {u} cm/s airflow. On Earth this paper stops burning below 16.5% oxygen; with a cabin breeze of 5 to 20 cm/s in orbit it keeps burning down to about 14%.", { o2, u: u.toFixed(1) })
          : t("Too little oxygen for this airflow: the limit here is {lim}%. Very slow flow starves the flame (it radiates its heat away); very fast flow blows it off.", { lim: lim.toFixed(1) }),
        plot: (
          <Plot x={[0.3, 100]} y={[12, yTop]} xLog xLabel={t("Airflow at the flame, cm/s (log)")} yLabel={t("Oxygen, %")} xTicks={[0.3, 1, 3, 10, 30, 100]} yTicks={[15, 20, 25, 30, 35, 40].filter((v) => v < yTop)} label={t("Flammability limit against airflow")}>
            {(sx, sy) => (
              <>
                <path d={`${line(curve, sx, sy)} L${sx(100)} ${sy(yTop)} L${sx(0.3)} ${sy(yTop)} Z`} fill="rgba(217,89,38,0.10)" />
                <path d={line(curve, sx, sy)} fill="none" stroke={ORANGE} strokeWidth={2} />
                <text x={sx(1.2)} y={sy(Math.min(yTop - 3, 36))} fontSize={10} fill="var(--ink-dim)" className="mono">{t("BURNS")}</text>
                <text x={sx(0.36)} y={sy(13)} fontSize={10} fill="var(--ink-dim)" className="mono">{t("DOES NOT BURN")}</text>
                {([["Moon", 0.17], ["Mars", 0.38], ["Earth", 1]] as [string, number][]).map(([name, g]) => (
                  <g key={name}>
                    <line x1={sx(FM.ubuoy(g))} x2={sx(FM.ubuoy(g))} y1={sy(12)} y2={sy(yTop)} stroke="var(--line-strong)" strokeDasharray="3 4" strokeWidth={0.8} />
                    <text x={sx(FM.ubuoy(g)) + 3} y={sy(yTop) + 10} fontSize={8.5} fill="var(--ink-dim)" className="mono">{t(name).toUpperCase()}</text>
                  </g>
                ))}
                <Dot cx={sx(u)} cy={sy(Math.min(o2, yTop))} text={`${o2}% · ${u.toFixed(1)} cm/s`} />
              </>
            )}
          </Plot>
        ),
        note: t("Dashed lines mark the buoyant flow a flame makes for itself under Moon, Mars and Earth gravity (assumed to scale with g to the one-third)."),
        surface: { f: (uu, oo) => FM.spread(oo / 100, uu, tau), x: [0.3, 100], xLog: true, y: [12, 42], z: [0, +(FM.spread(0.42, 10, tau) * 1.05).toFixed(2)], xLabel: t("airflow, cm/s"), yLabel: t("oxygen, %"), zLabel: t("flame spread, mm/s"), point: { x: u, y: o2 } } as SurfaceSpec,
        source: t(FM.SOURCES.map),
      };
    }
    if (which === "margin") {
      const m = FM.margin(moc, o2, shift);
      const tone = m.state === "holds" ? "var(--ok)" : m.state === "hidden" ? "var(--warn)" : "var(--danger)";
      const lo = Math.min(10, o2 - 5), hi = Math.max(45, o2 + 5, moc + 5);
      return {
        controls: (
          <>
            <Slider label={t("Material limit in the Earth test")} value={moc} unit="% O₂" min={14} max={60} step={0.5} digits={1} onChange={setMoc} />
            <Slider label={t("How much lower the limit is in orbit")} value={shift} unit="pts" min={0} max={4} step={0.5} digits={1} onChange={setShift} />
          </>
        ),
        readouts: (
          <>
            <Readout label={t("Margin on Earth")} value={`${m.earth >= 0 ? "+" : ""}${m.earth.toFixed(1)} pts`} tone={m.earth < 0 ? "var(--danger)" : undefined} />
            <Readout label={t("Margin in orbit")} value={`${m.orbit >= 0 ? "+" : ""}${m.orbit.toFixed(1)} pts`} tone={m.orbit < 0 ? "var(--danger)" : undefined} />
            <Readout label={t("Verdict")} value={m.state === "holds" ? t("Margin holds") : m.state === "hidden" ? t("Hidden risk") : t("Fails on Earth")} tone={tone} />
          </>
        ),
        text:
          m.state === "holds"
            ? t("The material keeps margin even with the orbit shift.")
            : m.state === "hidden"
              ? t("It passes the Earth test, but in orbit it could burn: the limit drops below the cabin's oxygen once buoyancy is gone.")
              : t("It burns at this oxygen even on Earth."),
        plot: (
          <Plot x={[lo, hi]} y={[0, 3]} xLabel={t("Oxygen, %")} yLabel="" xTicks={[10, 20, 30, 40, 50, 60].filter((v) => v >= lo && v <= hi)} yTicks={[]} label={t("Material oxygen limit on Earth and in orbit against the cabin oxygen")}>
            {(sx, sy) => (
              <>
                {([["Earth test (1 g)", moc, 2.2, BLUE], ["In orbit (0 g)", moc - shift, 1.2, ORANGE]] as [string, number, number, string][]).map(([name, limit, row, c]) => (
                  <g key={name}>
                    <rect x={sx(lo)} y={sy(row) - 9} width={Math.max(0, sx(Math.max(lo, limit)) - sx(lo))} height={18} fill="rgba(125,255,176,0.10)" />
                    <rect x={sx(Math.max(lo, limit))} y={sy(row) - 9} width={Math.max(0, sx(hi) - sx(Math.max(lo, limit)))} height={18} fill="rgba(255,100,100,0.13)" />
                    <line x1={sx(limit)} x2={sx(limit)} y1={sy(row) - 13} y2={sy(row) + 13} stroke={c} strokeWidth={2.5} />
                    <text x={sx(lo) + 4} y={sy(row) - 14} fontSize={10} fill="var(--ink-dim)" className="mono">{t("{name} · BURNS ABOVE {limit}%", { name: t(name).toUpperCase(), limit: limit.toFixed(1) })}</text>
                  </g>
                ))}
                <line x1={sx(o2)} x2={sx(o2)} y1={sy(2.9)} y2={sy(0.5)} stroke="var(--mark)" strokeWidth={1.2} />
                <text x={sx(o2) + (o2 > (lo + hi) / 2 ? -6 : 6)} y={sy(0.55)} textAnchor={o2 > (lo + hi) / 2 ? "end" : "start"} fontSize={10} fill="var(--mark)" className="mono">{t("CABIN {o2}%", { o2 })}</text>
              </>
            )}
          </Plot>
        ),
        note: t("Green is where the material does not burn, red where it does."),
        surface: null as SurfaceSpec | null,
        source: t(FM.SOURCES.margin),
      };
    }
    if (which === "test") {
      const p = FM.pburn(o2, moc, scatter);
      const lo = moc - 6 * scatter - 2, hi = moc + 6 * scatter + 2;
      const curve: [number, number][] = [];
      for (let k = 0; k <= 80; k++) {
        const xx = lo + ((hi - lo) * k) / 80;
        curve.push([xx, 100 * FM.pburn(xx, moc, scatter)]);
      }
      const inRange = o2 >= lo && o2 <= hi;
      return {
        controls: (
          <>
            <Slider label={t("Material limit (1/e point)")} value={moc} unit="% O₂" min={14} max={60} step={0.5} digits={1} onChange={setMoc} />
            <Slider label={t("Scatter between samples")} value={scatter} unit="pts" min={0.2} max={3} step={0.1} digits={1} onChange={setScatter} />
            <Slider label={t("Samples tested")} value={n} unit="" min={1} max={10} step={1} onChange={setN} />
          </>
        ),
        readouts: (
          <>
            <Readout label={t("One sample burns")} value={`${(100 * p).toFixed(p < 0.01 || p > 0.99 ? 2 : 0)}%`} tone={p > 0.5 ? "var(--danger)" : p > 0.05 ? "var(--warn)" : "var(--ok)"} />
            <Readout label={t("All {n} samples pass", { n })} value={`${(100 * FM.ppassAll(o2, moc, scatter, n)).toFixed(0)}%`} />
            <Readout label={t("50% point · 5% point")} value={`${FM.uloi(moc, scatter).toFixed(1)} · ${FM.x05(moc, scatter).toFixed(1)}%`} />
          </>
        ),
        text: `${t("At {o2}% oxygen one sample has a {p}% chance of burning.", { o2, p: (100 * p).toFixed(0) })} ${n === 1 ? t("A pass on 1 sample is not proof: near the limit, burning is a matter of chance, so the number of samples sets how much a pass is worth.") : t("A pass on {n} samples is not proof: near the limit, burning is a matter of chance, so the number of samples sets how much a pass is worth.", { n })}`,
        plot: (
          <Plot x={[lo, hi]} y={[0, 100]} xLabel={t("Test oxygen, %")} yLabel={t("Chance one sample burns, %")} xTicks={[...Array(7)].map((_, i) => Math.round(lo + ((hi - lo) * i) / 6))} yTicks={[0, 25, 50, 75, 100]} label={t("Probability that one sample burns against oxygen")}>
            {(sx, sy) => (
              <>
                <path d={line(curve, sx, sy)} fill="none" stroke={BLUE} strokeWidth={2} />
                {inRange ? <Dot cx={sx(o2)} cy={sy(100 * p)} text={t("cabin {o2}%", { o2 })} /> : <text x={sx(o2 < lo ? lo : hi) + (o2 < lo ? 6 : -6)} y={sy(o2 < lo ? 6 : 94)} textAnchor={o2 < lo ? "start" : "end"} fontSize={10} fill="var(--mark)" className="mono">{t("CABIN {o2}% IS OFF THIS SCALE", { o2 })}</text>}
              </>
            )}
          </Plot>
        ),
        note: "",
        surface: { f: (oo, sc) => 100 * FM.pburn(oo, moc, sc), x: [moc - 8, moc + 8], y: [0.2, 3], z: [0, 100], xLabel: t("test oxygen, %"), yLabel: t("scatter between samples, points"), zLabel: t("chance one sample burns, %"), point: { x: o2, y: scatter } } as SurfaceSpec,
        source: t(FM.SOURCES.test),
      };
    }
    if (which === "flame") {
      const clamped = x < 0.15 || x > 0.4 || kpa < 30 || kpa > 101.3;
      const xc = FM.clamp(x, 0.15, 0.4);
      const ch4 = FM.ceaT("CH4", x, kpa), c2 = FM.ceaT("C2H4", x, kpa), air = FM.ceaT("CH4", 0.21, 101.3);
      const mk = (fuel: FM.CeaFuel): [number, number][] => FM.CEA.O2.map((o) => [100 * o, FM.ceaT(fuel, o, kpa)]);
      return {
        controls: <p className="text-[12px] leading-snug text-dim">{t("Oxygen and pressure come from the cabin on the table: {o2}% at {psi} psi ({kpa} kPa). Move them on the left.", { o2, psi, kpa: kpa.toFixed(0) })}</p>,
        readouts: (
          <>
            <Readout label={t("Methane flame")} value={`${Math.round(ch4)} K`} />
            <Readout label={t("Ethylene flame")} value={`${Math.round(c2)} K`} />
            <Readout label={t("Versus air at sea level")} value={`${ch4 - air >= 0 ? "+" : ""}${Math.round(ch4 - air)} K`} tone={ch4 - air > 100 ? "var(--danger)" : undefined} />
          </>
        ),
        text: `${t("More oxygen means a hotter flame, more heat on nearby materials and faster spread. Equilibrium carbon monoxide in the flame: {co}% for methane.", { co: FM.ceaT("CH4", x, kpa, "CO").toFixed(1) })}${clamped ? ` ${t("This cabin is outside the computed table (15 to 40% oxygen, 30 to 101 kPa), so the nearest edge value is shown.")}` : ""}`,
        plot: (
          <Plot x={[15, 40]} y={[1800, 2900]} xLabel={t("Oxygen, %")} yLabel={t("Flame temperature, K")} xTicks={[15, 20, 25, 30, 35, 40]} yTicks={[1800, 2000, 2200, 2400, 2600, 2800]} label={t("Adiabatic flame temperature against oxygen for methane and ethylene")}>
            {(sx, sy) => (
              <>
                <path d={line(mk("C2H4"), sx, sy)} fill="none" stroke={ORANGE} strokeWidth={2} />
                <path d={line(mk("CH4"), sx, sy)} fill="none" stroke={BLUE} strokeWidth={2} />
                <text x={sx(15.4)} y={sy(FM.ceaT("C2H4", 0.15, kpa)) - 8} fontSize={10} fill="var(--ink)" className="mono">{t("ETHYLENE")}</text>
                <text x={sx(16.4)} y={sy(FM.ceaT("CH4", 0.16, kpa)) + 16} fontSize={10} fill="var(--ink)" className="mono">{t("METHANE")}</text>
                <line x1={sx(21)} x2={sx(21)} y1={sy(1800)} y2={sy(2900)} stroke="var(--line-strong)" strokeDasharray="3 4" strokeWidth={0.8} />
                <text x={sx(21) + 3} y={sy(2900) + 10} fontSize={8.5} fill="var(--ink-dim)" className="mono">{t("AIR 21%")}</text>
                <Dot cx={sx(100 * xc)} cy={sy(ch4)} text={clamped ? t("edge of table · {k} K", { k: Math.round(ch4) }) : `${o2}% · ${Math.round(ch4)} K`} />
              </>
            )}
          </Plot>
        ),
        note: t("Blue: methane. Orange: ethylene. Both are stand-ins for the gases a hot material gives off."),
        surface: { f: (oo, pp) => FM.ceaT("CH4", oo / 100, pp), x: [15, 40], y: [30, 101.3], z: [1800, 2800], xLabel: t("oxygen, %"), yLabel: t("pressure, kPa"), zLabel: t("methane flame temperature, K"), point: { x: 100 * xc, y: FM.clamp(kpa, 30, 101.3) } } as SurfaceSpec,
        source: t(FM.SOURCES.flame),
      };
    }
    const dr = FM.droplet(d0, x);
    const cool = dr.ph.some((p) => p.k === "cool");
    const PH = { hot: [ORANGE, "Hot flame"], cool: [BLUE, "Cool flame"], evap: [AQUA, "Evaporating"] } as const;
    return {
      controls: <Slider label={t("Droplet size (heptane)")} value={d0} unit="mm" min={1} max={9} step={0.1} digits={1} onChange={setD0} />,
      readouts: (
        <>
          <Readout label={t("Burning constant K")} value={`${dr.K.toFixed(2)} mm²/s`} />
          <Readout label={t("Total life")} value={`${dr.T.toFixed(1)} s`} />
          <Readout label={t("Cool flame")} value={cool ? t("Yes") : t("No")} tone={cool ? "var(--warn)" : undefined} />
        </>
      ),
      text: cool
        ? t("The hot flame dies and a cool flame keeps burning. A cool flame is almost invisible: a leak that looks out may still be reacting.")
        : t("At {o2}% oxygen a {d} mm droplet burns out with a hot flame. Cool flames appear above {dcrit} mm at this oxygen.", { o2, d: d0.toFixed(1), dcrit: dr.dcrit.toFixed(1) }),
      plot: (
        <Plot x={[0, dr.T]} y={[0, d0 * d0]} xLabel={t("Time, s")} yLabel={t("Diameter squared, mm²")} xTicks={[...Array(6)].map((_, i) => +((dr.T * i) / 5).toFixed(dr.T < 12 ? 1 : 0))} yTicks={[...Array(5)].map((_, i) => +((d0 * d0 * i) / 4).toFixed(1))} label={t("Droplet diameter squared against time")}>
          {(sx, sy) => (
            <>
              {dr.ph.map((p) => (
                <g key={p.k}>
                  <line x1={sx(p.t0)} y1={sy(p.d0 * p.d0)} x2={sx(p.t1)} y2={sy(p.d1 * p.d1)} stroke={PH[p.k][0]} strokeWidth={2.5} strokeLinecap="round" />
                  <text x={(sx(p.t0) + sx(p.t1)) / 2 + 6} y={(sy(p.d0 * p.d0) + sy(p.d1 * p.d1)) / 2 - 6} fontSize={10} fill="var(--ink)" className="mono">{t(PH[p.k][1]).toUpperCase()}</text>
                </g>
              ))}
            </>
          )}
        </Plot>
      ),
      note: t("A straight line on this graph is the d-squared law: the droplet's surface shrinks at a steady rate."),
      surface: null as SurfaceSpec | null,
      source: t(FM.SOURCES.droplet),
    };
  }, [which, u, tau, moc, shift, scatter, n, d0, o2, psi, x, kpa, setU, setTau, setMoc, setShift, setScatter, setN, setD0, t]);

  const current = CASES.find(([c]) => c === which)!;
  return (
    <div className="@container">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-[16px] font-medium">{t("Fire-model lab")}</h2>
        <span className="text-[12.5px] text-dim">{t("A live cabin and five published fire models, running at {o2}% oxygen and {psi} psi.", { o2, psi })}</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label={t("Fire models")}>
        {CASES.map(([c, name]) => (
          <button key={c} role="tab" aria-selected={which === c} className={`btn !px-2.5 !py-1 ${which === c ? "on" : ""}`} onClick={() => setWhich(c)}>{t(name)}</button>
        ))}
      </div>

      {which === "cabin" && (
        <div>
          <CabinView o2={o2} psi={psi} defaultGravity={defaultGravity} />
          <p className="mt-2 border-l-2 border-accent pl-3 text-[13px] leading-relaxed">
            {t("A piece of material burns where you click. In microgravity there is no rising plume: the flame stays low and blue and the smoke gathers around it until the ventilation carries it to the detector. With gravity the hot gas rises, the flame climbs and pulls in fresh air. Turn the fans off, fire the extinguisher, change the gravity, and watch what reaches the crew member's breathing zone.")}
          </p>
          <details className="mt-2 text-[11.5px] leading-relaxed text-dim">
            <summary className="label cursor-pointer">{t("Where it comes from, and what is assumed")}</summary>
            <p className="mt-1">{t("A two-dimensional fluid emulation (stable-fluids method) of a module cross-section, at this cabin's oxygen and pressure. Pyrolysis of the material, radiative heat loss and the 15 cm/s ventilation are calibrated by hand, and the heat release is scaled for a 1.5 m deep slice. It shows how flame and smoke behave; it is not validated against a test, it is not a PSI test record, and it certifies nothing.")}</p>
          </details>
        </div>
      )}

      {body && (
      <div className="grid gap-4 @[860px]:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-3">
          <p className="text-[13.5px] font-medium leading-snug">{t(current[2])}</p>
          {body.controls}
          <div className="grid grid-cols-1 gap-2 border-t border-line pt-3 @[860px]:grid-cols-1">{body.readouts}</div>
        </div>
        <div className="min-w-0">
          {body.surface && (
            <div className="mb-1 flex justify-end gap-1" role="tablist" aria-label={t("Graph type")}>
              {(["2d", "3d"] as const).map((d) => (
                <button key={d} role="tab" aria-selected={dim === d} className={`btn !px-2 !py-0.5 !text-[10px] ${dim === d ? "on" : ""}`} onClick={() => setDim(d)}>{d.toUpperCase()}</button>
              ))}
            </div>
          )}
          <div className="mx-auto" style={{ maxWidth: "calc((100vh - 420px) * 1.87)" }}>
            {body.surface && dim === "3d" ? <Surface3D spec={body.surface} /> : body.plot}
          </div>
          <p className="mt-2 border-l-2 border-accent pl-3 text-[13px] leading-relaxed">{body.text}</p>
          {body.note && <p className="mt-1 text-[11.5px] text-dim">{body.note}</p>}
          <details className="mt-2 text-[11.5px] leading-relaxed text-dim">
            <summary className="label cursor-pointer">{t("Where it comes from, and what is assumed")}</summary>
            <p className="mt-1">{body.source} {t("This is a model, not a PSI test record, and it certifies nothing.")}</p>
          </details>
        </div>
      </div>
      )}
    </div>
  );
}
