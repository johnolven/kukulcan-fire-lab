"use client";
// Fire scenarios: a fire starts in the cabin on the table; choose what the crew
// does and see what happens to them, minute by minute. Model ported from the
// team's earlier project "Umbral". It compares decisions; it certifies nothing.
// Code generated with SI assistance (Claude Code).

import { useEffect, useMemo, useRef, useState } from "react";
import { gravityChoice, gravityOf } from "@/lib/controls";
import { useControl, useControlAction } from "@/lib/useControl";
import { EVENT_LABEL, K, LEVELS, MODEL_NOTE, ZONES, compareResponses, detectionLimit, runScenario, type Actions, type Sample, type ScenarioInput, type ZoneId } from "@/lib/scenario";

const LEVEL_COLOR = ["var(--ok)", "var(--warn)", "#ec835a", "var(--danger)"];
const GRAVITY: [number, string][] = [[0, "Microgravity"], [0.17, "Moon 0.17 g"], [0.38, "Mars 0.38 g"], [1, "Earth 1 g"]];
const ACTIONS: [keyof Actions, string, string][] = [
  ["fan", "Ventilation off", "10 s after detection. Slows the fire in microgravity only."],
  ["mask", "Masks on", "20 s after detection. Protects from the gases, not from heat."],
  ["ext", "Extinguisher", "30 s after detection. Works only while the fire is under 50 kW."],
  ["inert", "Flood with nitrogen", "30 s after detection. Dilutes oxygen to 12%."],
  ["leave", "Leave the module", "60 s after detection. Saves the crew, not the module."],
];

interface Series {
  key: keyof Sample;
  name: string;
  unit: string;
  limit?: [number, string];
  digits: number;
}
const SERIES: Series[] = [
  { key: "Q", name: "Fire size", unit: "kW", limit: [K.BURN, "burn injury 50 kW"], digits: 0 },
  { key: "x", name: "Oxygen in the cabin", unit: "%", limit: [K.HYPOX * 100, "hypoxia 16%"], digits: 1 },
  { key: "co", name: "Carbon monoxide", unit: "ppm", limit: [K.SMAC_CO, "1-hour limit 55 ppm"], digits: 0 },
  { key: "T", name: "Cabin air", unit: "°C", digits: 0 },
];

function Strip({ s, samples, events, hover, onHover }: { s: Series; samples: Sample[]; events: { t: number; k: keyof typeof EVENT_LABEL }[]; hover: number | null; onHover: (i: number | null) => void }) {
  const W = 420, H = 104, M = { l: 40, r: 8, t: 8, b: 16 };
  const vals = samples.map((p) => p[s.key] as number);
  const lo = s.key === "x" ? Math.min(...vals, s.limit?.[0] ?? 100) - 1 : 0;
  const hi = Math.max(...vals, (s.limit?.[0] ?? 0) * 1.15, lo + 1) * (s.key === "x" ? 1 : 1.08) + (s.key === "x" ? 1 : 0);
  const tEnd = samples[samples.length - 1].t;
  const x = (t: number) => M.l + (t / tEnd) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - ((v - lo) / (hi - lo)) * (H - M.t - M.b);
  const path = samples.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p[s.key] as number).toFixed(1)}`).join("");
  const h = hover != null ? samples[hover] : null;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label">{s.name}</span>
        <span className="mono text-[11.5px]">{h ? `${(h[s.key] as number).toFixed(s.digits)} ${s.unit} at ${Math.round(h.t)} s` : `peak ${(s.key === "x" ? Math.min(...vals) : Math.max(...vals)).toFixed(s.digits)} ${s.unit}`}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${s.name} over ten minutes`}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const t = (((e.clientX - r.left) / r.width) * W - M.l) / (W - M.l - M.r);
          onHover(Math.max(0, Math.min(samples.length - 1, Math.round(t * (samples.length - 1)))));
        }}
        onMouseLeave={() => onHover(null)}
      >
        {[lo, (lo + hi) / 2, hi].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={0.5} />
            <text x={M.l - 5} y={y(v) + 3} textAnchor="end" fontSize={8.5} fill="var(--ink-dim)" className="mono">{v.toFixed(v < 10 && s.key !== "T" ? 1 : 0)}</text>
          </g>
        ))}
        {[0, 2, 4, 6, 8, 10].map((m) => (
          <text key={m} x={x(m * 60)} y={H - 4} textAnchor="middle" fontSize={8} fill="var(--ink-faint)" className="mono">{m}m</text>
        ))}
        {s.limit && (
          <g>
            <line x1={M.l} x2={W - M.r} y1={y(s.limit[0])} y2={y(s.limit[0])} stroke="var(--danger)" strokeWidth={0.8} strokeDasharray="4 3" />
            <text x={W - M.r - 2} y={y(s.limit[0]) - 3} textAnchor="end" fontSize={8} fill="var(--danger)" className="mono">{s.limit[1]}</text>
          </g>
        )}
        {events.map((e, i) => (
          <line key={i} x1={x(e.t)} x2={x(e.t)} y1={M.t} y2={H - M.b} stroke="var(--line-strong)" strokeWidth={0.6} strokeDasharray="2 3" />
        ))}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
        {h && (
          <g>
            <line x1={x(h.t)} x2={x(h.t)} y1={M.t} y2={H - M.b} stroke="#fff" strokeWidth={0.6} opacity={0.6} />
            <circle cx={x(h.t)} cy={y(h[s.key] as number)} r={4} fill="var(--accent)" stroke="#060c14" strokeWidth={2} />
          </g>
        )}
      </svg>
    </div>
  );
}

// Cross-section of the module at one instant. An illustration driven by the model's
// numbers: flame radius from the fire size, haze from carbon monoxide, tint from air temperature.
function ModuleScene({ sample, crew, peak }: { sample: Sample; crew: "inside" | "masked" | "gone"; peak: number }) {
  const r = 6 + 46 * Math.sqrt(Math.min(1, sample.Q / Math.max(60, peak)));
  const haze = Math.min(0.78, sample.co / 2500);
  const heat = Math.min(0.5, Math.max(0, (sample.T - 25) / 500));
  const burning = sample.Q > 0.5;
  return (
    <svg viewBox="0 0 520 150" className="w-full" role="img" aria-label="Cross-section of the module during the fire">
      <defs>
        <radialGradient id="scfire" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity={0.95} />
          <stop offset="40%" stopColor="#ffd27a" stopOpacity={0.85} />
          <stop offset="100%" stopColor="#ff6a2a" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={10} y={22} width={500} height={106} rx={50} fill={`rgba(255,106,42,${heat * 0.45})`} stroke="var(--line-strong)" strokeWidth={1.2} />
      <rect x={10} y={22} width={500} height={106} rx={50} fill={`rgba(150,160,170,${haze})`} />
      {[110, 210, 310, 410].map((xx) => <line key={xx} x1={xx} x2={xx} y1={24} y2={126} stroke="var(--line)" strokeWidth={0.6} />)}
      <text x={24} y={16} fontSize={8.5} letterSpacing={1.2} fill="var(--ink-dim)" className="mono">SEALED MODULE · 65 M³ · ILLUSTRATION</text>
      {burning && <circle cx={150} cy={78} r={r} fill="url(#scfire)" className="flame" />}
      <rect x={144} y={74} width={12} height={8} fill="none" stroke="#fff" strokeWidth={0.9} />
      {crew !== "gone" ? (
        <g stroke={crew === "masked" ? "var(--accent)" : "#fff"} strokeWidth={1.4} fill="none" strokeLinecap="round">
          <circle cx={372} cy={62} r={8} />
          <path d="M372 70 v24 M372 78 l-12 8 M372 78 l12 8 M372 94 l-9 16 M372 94 l9 16" />
          {crew === "masked" && <path d="M366 62 h12 v6 h-12 z" fill="var(--accent)" stroke="none" />}
        </g>
      ) : (
        <text x={372} y={82} textAnchor="middle" fontSize={9} letterSpacing={1} fill="var(--ink-dim)" className="mono">CREW OUT</text>
      )}
      <text x={496} y={144} textAnchor="end" fontSize={9} fill="var(--ink-dim)" className="mono">
        {Math.round(sample.t)} S · {sample.Q.toFixed(0)} KW · O₂ {sample.x.toFixed(1)}% · CO {Math.round(sample.co)} PPM · {Math.round(sample.T)} °C
      </text>
    </svg>
  );
}

export function ScenarioView({ o2, psi, defaultGravity }: { o2: number; psi: number; defaultGravity: number }) {
  const [zone, setZone] = useControl<ZoneId>("scenario.zone");
  const [det, setDet] = useControl<number>("scenario.detection");
  const [gravityPick, setGravityPick] = useControl<string>("scenario.gravity");
  const [fan, setFan] = useControl<boolean>("scenario.fans_off");
  const [mask, setMask] = useControl<boolean>("scenario.masks");
  const [ext, setExt] = useControl<boolean>("scenario.extinguisher");
  const [inert, setInert] = useControl<boolean>("scenario.nitrogen");
  const [leave, setLeave] = useControl<boolean>("scenario.leave");
  const [relief, setRelief] = useControl<boolean>("scenario.relief");
  const act: Actions = useMemo(() => ({ fan, ext, mask, leave, inert }), [fan, ext, mask, leave, inert]);
  const setAct = (a: Actions) => { setFan(a.fan); setExt(a.ext); setMask(a.mask); setLeave(a.leave); setInert(a.inert); };
  const setGravity = (v: number) => setGravityPick(gravityChoice(v));
  const [hover, setHover] = useState<number | null>(null);
  const [clock, setClock] = useState<number | null>(null); // seconds into the playback; null = not started
  const [playing, setPlaying] = useState(false);
  const lastFrame = useRef(0);
  const g = gravityOf(gravityPick, defaultGravity);

  const input: ScenarioInput = useMemo(() => ({ p0_kpa: psi * 6.895, x0: o2 / 100, g, zone, det, relief, ...act }), [o2, psi, g, zone, det, relief, act]);
  const r = useMemo(() => runScenario(input), [input]);
  const ranked = useMemo(() => compareResponses(input), [input]);
  const limit = useMemo(() => detectionLimit(input), [input]);
  const events = useMemo(() => [...r.events].sort((a, b) => a.t - b.t), [r]);
  const color = LEVEL_COLOR[r.level];

  // Playback: ten minutes of fire in about fifteen seconds.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    lastFrame.current = performance.now();
    const step = (now: number) => {
      const dt = (now - lastFrame.current) / 1000;
      lastFrame.current = now;
      setClock((c) => {
        const next = (c ?? 0) + dt * 40;
        if (next >= 600) {
          setPlaying(false);
          return 600;
        }
        return next;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // the voice and the chat can start and pause the playback
  useControlAction("scenario.play", () => { setClock(0); setPlaying(true); });
  useControlAction("scenario.pause", () => setPlaying(false));

  const at = clock != null ? Math.min(r.samples.length - 1, Math.round(clock / 5)) : null;
  const shown = hover ?? at;
  const scene = r.samples[at ?? r.samples.length - 1];
  const passed = events.filter((e) => e.t <= (clock ?? 600));
  const crewNow: "inside" | "masked" | "gone" = passed.some((e) => e.k === "leave") ? "gone" : passed.some((e) => e.k === "mask") ? "masked" : "inside";
  const latest = passed[passed.length - 1];

  return (
    <div className="@container">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-[16px] font-medium">Fire scenarios: what protects the crew</h2>
        <span className="text-[12.5px] text-dim">A fire starts in a sealed module at {o2}% oxygen and {psi} psi. Pick where, how fast it is detected and what the crew does.</span>
      </div>

      <div className="grid gap-4 @[820px]:grid-cols-[290px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div>
            <div className="label mb-1">Where the fire starts</div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(ZONES) as ZoneId[]).map((z) => (
                <button key={z} className="btn !px-2 !py-1" aria-pressed={zone === z} onClick={() => setZone(z)} title={`${ZONES[z].fuel} kg of fuel that can burn`}>{ZONES[z].name}</button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="label flex justify-between"><span>Time to detect</span><span className="text-ink">{det} s</span></span>
            <input type="range" min={10} max={300} step={5} value={det} onChange={(e) => setDet(+e.target.value)} />
          </label>
          <div>
            <div className="label mb-1">Gravity</div>
            <div className="flex flex-wrap gap-1.5">
              {GRAVITY.map(([v, name]) => (
                <button key={v} className="btn !px-2 !py-1" aria-pressed={g === v} onClick={() => setGravity(v)}>{name}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="label mb-1">What the crew does</div>
            <div className="space-y-1">
              {ACTIONS.map(([k, name, hint]) => (
                <label key={k} className="flex cursor-pointer items-start gap-2 text-[12.5px] leading-snug">
                  <input type="checkbox" className="mt-[3px] accent-[var(--accent)]" checked={act[k]} onChange={(e) => setAct({ ...act, [k]: e.target.checked })} />
                  <span><span className="text-ink">{name}</span> <span className="text-[11px] text-dim">{hint}</span></span>
                </label>
              ))}
              <label className="flex cursor-pointer items-start gap-2 text-[12.5px] leading-snug">
                <input type="checkbox" className="mt-[3px] accent-[var(--accent)]" checked={relief} onChange={(e) => setRelief(e.target.checked)} />
                <span><span className="text-ink">Pressure relief valve</span> <span className="text-[11px] text-dim">Vents gas when pressure rises above the starting value.</span></span>
              </label>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="border-l-2 pl-3" style={{ borderColor: color }}>
            <div className="label" style={{ color }}>Outcome for the crew</div>
            <div className="text-[20px] font-medium leading-tight" style={{ color }}>{LEVELS[r.level]}</div>
            <div className="mt-0.5 text-[12.5px] leading-snug text-dim">
              {r.why.length ? r.why.join(" · ") : "No limit is exceeded with this response."}{" "}
              {r.outWhy ? `Flame out at ${Math.round(r.outT ?? 0)} s (${{ ext: "extinguisher", o2: "oxygen fell below 14%", fuel: "fuel consumed" }[r.outWhy]}).` : "Still burning at 10 minutes."}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 @[640px]:grid-cols-5">
            {[
              ["Peak fire", `${r.peak.toFixed(0)} kW`],
              ["CO breathed", `${Math.round(r.crew.maxCO)} ppm`],
              ["Lowest O₂ breathed", `${(100 * r.crew.minX).toFixed(1)}%`],
              ["Hottest air", `${Math.round(r.tmax)} °C`],
              ["Highest pressure", `${r.pmax.toFixed(0)} kPa`],
            ].map(([k, v]) => (
              <div key={k}><div className="label">{k}</div><div className="mono text-[17px]">{v}</div></div>
            ))}
          </div>

          <div className="mt-3 border border-line p-2">
            <ModuleScene sample={scene} crew={crewNow} peak={r.peak} />
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <button className="btn !px-3 !py-1" onClick={() => { if (!playing && (clock == null || clock >= 600)) setClock(0); setPlaying(!playing); }}>
                {playing ? "Pause" : clock == null || clock >= 600 ? "▶ Play the fire" : "▶ Resume"}
              </button>
              <input type="range" className="min-w-[120px] flex-1" min={0} max={600} step={5} value={clock ?? 600} onChange={(e) => { setPlaying(false); setClock(+e.target.value); }} aria-label="Time into the fire, seconds" />
              <span className="mono text-[11.5px]">{Math.floor((clock ?? 600) / 60)}:{String(Math.floor((clock ?? 600) % 60)).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-dim">{clock == null ? "Ten minutes of fire in fifteen seconds." : latest ? `${Math.round(latest.t)} s · ${EVENT_LABEL[latest.k]}` : "Fire growing, not yet detected."}</span>
            </div>
          </div>

          <div className="mt-3 grid gap-x-5 gap-y-3 @[520px]:grid-cols-2">
            {SERIES.map((s) => <Strip key={s.key} s={s} samples={r.samples} events={events} hover={shown} onHover={setHover} />)}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-dim">
            {events.map((e, i) => <span key={i}><span className="mono text-faint">{Math.round(e.t)} s</span> {EVENT_LABEL[e.k]}</span>)}
          </div>

          <div className="mt-4 grid gap-4 @[1040px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div>
              <div className="label mb-1">Compare responses for this case, best first</div>
              <table className="data">
                <thead><tr><th>Response</th><th>Outcome</th><th className="num">Peak kW</th><th className="num">CO ppm</th></tr></thead>
                <tbody>
                  {ranked.map(({ plan, result }) => (
                    <tr key={plan.id} className="cursor-pointer" onClick={() => setAct(plan.actions)}>
                      <td>{plan.name}</td>
                      <td style={{ color: LEVEL_COLOR[result.level] }}>{LEVELS[result.level]}</td>
                      <td className="num">{result.peak.toFixed(0)}</td>
                      <td className="num">{Math.round(result.crew.maxCO)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 text-[12.5px] leading-snug">
              <div>
                <div className="label">Key to reduce the risk</div>
                {limit != null
                  ? <p>With this response the crew stays within every limit if the fire is detected within <b className="text-ink">{limit} s</b>.{det > limit ? " Detection here is too slow." : ""}</p>
                  : <p>Even detected in 10 s, this response is not enough here. The case needs less fuel, a slower-growing material or a different response.</p>}
              </div>
              <p className="text-[11.5px] text-dim">Oxygen changes the answer: growth is scaled by (oxygen / 21%)², so the same fire at {o2}% grows {((o2 / 21) ** 2).toFixed(1)} times as fast as in air. Move the oxygen control on the left to see it.</p>
            </div>
          </div>

          <details className="mt-3 text-[11.5px] leading-relaxed text-dim">
            <summary className="label cursor-pointer">Where the numbers come from, and what is assumed</summary>
            <p className="mt-1">{MODEL_NOTE}</p>
          </details>
        </div>
      </div>
    </div>
  );
}
