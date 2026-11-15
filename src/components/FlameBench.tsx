"use client";
// Flame bench: change the atmosphere around a flame and see what the closest
// real test records did. This is an emulator anchored to test records, not a
// physics simulation: the drawing is an illustration, the outcomes are data.
// Code generated with SI assistance (Claude Code).

import { useMemo, useState } from "react";
import { TESTS, describeTest, distance, phaseGroup, type PhaseGroup } from "@/lib/lab";
import type { TestRecord } from "@/lib/types";
import { PSI_PER_ATM } from "@/lib/types";

type Diluent = "none" | "N2" | "CO2" | "He";

const FUELS: { id: PhaseGroup; name: string; source: string }[] = [
  { id: "solid", name: "Solid material", source: "BASS, BASS-II, Saffire" },
  { id: "liquid", name: "Liquid droplet", source: "FLEX, FLEX-2, CFI" },
  { id: "gas", name: "Gas flame", source: "ACME" },
];

function matchesDiluent(t: TestRecord, d: Diluent) {
  if (d === "none") return true;
  const have = (t.diluent ?? "").toUpperCase();
  return d === "N2" ? have === "N2" || have === "" : have.includes(d.toUpperCase());
}

const OUT_ENDS = ["Extinction", "Self-extinguished", "Did not sustain burning"];

export function FlameBench({ o2, psi, onChange }: { o2: number; psi: number; onChange: (o2: number, psi: number) => void }) {
  const [fuel, setFuel] = useState<PhaseGroup>("liquid");
  const [flow, setFlow] = useState(10);
  const [diluent, setDiluent] = useState<Diluent>("none");

  const result = useMemo(() => {
    const target = { o2_pct: o2, pressure_atm: psi / PSI_PER_ATM, flow_cm_s: flow };
    const pool = TESTS.filter((t) => phaseGroup(t.fuel_phase) === fuel && t.granularity === "test" && matchesDiluent(t, diluent));
    const scored = pool
      .map((t) => ({ t, r: distance(t, target) }))
      .filter((s): s is { t: TestRecord; r: { d: number; known: string[] } } => s.r != null)
      .sort((a, b) => a.r.d - b.r.d);
    const near = scored.slice(0, 12);
    const withOutcome = near.filter((s) => s.t.outcome || s.t.ignited === false);
    const out = withOutcome.filter((s) => s.t.ignited === false || OUT_ENDS.includes(s.t.outcome ?? "")).length;
    const burns = near.map((s) => s.t.burn_time_s).filter((v): v is number => v != null).sort((a, b) => a - b);
    const d0 = near[0]?.r.d ?? null;
    return {
      near,
      pool: pool.length,
      placed: scored.length,
      withOutcome: withOutcome.length,
      out,
      medianBurn: burns.length ? burns[Math.floor(burns.length / 2)] : null,
      d0,
      zone: d0 == null ? "none" : d0 < 0.5 ? "inside" : d0 < 1.5 ? "near" : "outside",
    };
  }, [o2, psi, flow, fuel, diluent]);

  // Illustration only. Size follows oxygen, stretch follows air flow, and the
  // flame dims when the nearby records mostly went out.
  const outShare = result.withOutcome ? result.out / result.withOutcome : null;
  const size = 26 + Math.min(1, Math.max(0, (o2 - 12) / 60)) * 34;
  const stretch = 1 + Math.min(1, flow / 40) * 1.4;
  const alive = result.zone === "none" ? 0.25 : outShare == null ? 0.75 : Math.max(0.2, 1 - outShare * 0.75);

  const zoneText = {
    inside: "Inside the tested envelope",
    near: "Near the tested envelope",
    outside: "Outside the tested envelope: extrapolation",
    none: "No comparable record carries oxygen values",
  }[result.zone];
  const zoneColor = { inside: "var(--ok)", near: "var(--warn)", outside: "var(--danger)", none: "var(--danger)" }[result.zone];

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div>
        <svg viewBox="0 0 300 220" className="w-full" role="img" aria-label="Flame illustration">
          <defs>
            <radialGradient id="fl" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff" stopOpacity={0.95 * alive} />
              <stop offset="35%" stopColor={o2 > 30 ? "#fff3c4" : "#bfe9ff"} stopOpacity={0.8 * alive} />
              <stop offset="75%" stopColor={flow > 12 || o2 > 30 ? "#ffb54a" : "#5fb8ff"} stopOpacity={0.55 * alive} />
              <stop offset="100%" stopColor="#3a7dff" stopOpacity={0} />
            </radialGradient>
          </defs>
          {/* test chamber */}
          <rect x={14} y={24} width={272} height={172} fill="none" stroke="var(--line-strong)" strokeWidth={1} />
          <path d="M14 24 l-8 -8 M286 24 l8 -8 M14 196 l-8 8 M286 196 l8 8" stroke="var(--line-strong)" strokeWidth={0.6} />
          {/* flow arrows */}
          {flow > 0 &&
            [60, 110, 160].map((yy) => (
              <g key={yy} opacity={0.25 + Math.min(0.6, flow / 50)}>
                <line x1={26} y1={yy} x2={26 + 14 + flow * 0.9} y2={yy} stroke="var(--accent)" strokeWidth={0.8} />
                <path d={`M${40 + flow * 0.9} ${yy} l-6 -3 v6 z`} fill="var(--accent)" />
              </g>
            ))}
          {/* sample */}
          {fuel === "solid" && <rect x={112} y={106} width={10} height={8} fill="none" stroke="#fff" strokeWidth={1} />}
          {fuel === "liquid" && <circle cx={118} cy={110} r={5} fill="none" stroke="#fff" strokeWidth={1} />}
          {fuel === "gas" && <path d="M92 110 h22 M114 104 v12" stroke="#fff" strokeWidth={1} fill="none" />}
          {/* flame: a sphere in still air, stretched downstream by flow */}
          <g className="flame">
            <ellipse cx={118 + (size * (stretch - 1)) / 1.6} cy={110} rx={size * stretch} ry={size} fill="url(#fl)" />
            <ellipse cx={118 + (size * (stretch - 1)) / 1.6} cy={110} rx={size * stretch * 0.62} ry={size * 0.62} fill="none" stroke="#fff" strokeOpacity={0.35 * alive} strokeWidth={0.6} strokeDasharray="2 3" />
          </g>
          <text x={22} y={212} fontSize={8} letterSpacing={1} fill="var(--ink-dim)" className="mono">ILLUSTRATION · NOT A PHYSICS SIMULATION</text>
          <text x={278} y={38} textAnchor="end" fontSize={8} letterSpacing={1} fill="var(--ink-dim)" className="mono">MICROGRAVITY</text>
        </svg>
        <ol className="mt-2 space-y-1.5 text-[11.5px] leading-snug text-dim">
          {[
            ["No buoyancy", "Hot gas does not rise in free fall, so a flame becomes a dim sphere fed only by diffusion."],
            ["Air flow feeds it", "Ventilation stretches the flame downstream and brings it fresh oxygen."],
            ["Oxygen decides", "Flammability depends strongly on oxygen concentration; an enriched cabin makes materials burn more readily."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-2">
              <span className="mono text-[10px] text-faint">{String(i + 1).padStart(2, "0")}</span>
              <span><b className="font-medium text-ink">{t}.</b> {d}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap gap-2">
          {FUELS.map((f) => (
            <button key={f.id} className="btn" aria-pressed={fuel === f.id} onClick={() => setFuel(f.id)} title={f.source}>
              {f.name}
            </button>
          ))}
        </div>

        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-3">
          <label className="block">
            <span className="label flex justify-between"><span>Oxygen</span><span className="text-ink">{o2}%</span></span>
            <input type="range" min={10} max={100} step={1} value={o2} onChange={(e) => onChange(+e.target.value, psi)} />
          </label>
          <label className="block">
            <span className="label flex justify-between"><span>Pressure</span><span className="text-ink">{psi} psi</span></span>
            <input type="range" min={3} max={45} step={0.1} value={psi} onChange={(e) => onChange(o2, +e.target.value)} />
          </label>
          <label className="block">
            <span className="label flex justify-between"><span>Air flow</span><span className="text-ink">{flow} cm/s</span></span>
            <input type="range" min={0} max={60} step={1} value={flow} onChange={(e) => setFlow(+e.target.value)} />
          </label>
        </div>

        <div className="label mt-3 mb-1.5">Mitigation levers</div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => setFlow(0)}>Cut ventilation</button>
          <button className="btn" onClick={() => onChange(Math.max(10, o2 - 5), psi)}>Lower oxygen 5 pts</button>
          {(["CO2", "He", "N2"] as Diluent[]).map((d) => (
            <button key={d} className="btn" aria-pressed={diluent === d} onClick={() => setDiluent(diluent === d ? "none" : d)}>
              Dilute with {d === "CO2" ? "CO₂" : d === "He" ? "helium" : "nitrogen"}
            </button>
          ))}
        </div>

        <div className="mt-4 border-l-2 pl-3" style={{ borderColor: zoneColor }}>
          <div className="label" style={{ color: zoneColor }}>{zoneText}</div>
          <div className="mt-1 text-[13px] leading-relaxed">
            {result.near.length === 0 ? (
              <>No {fuel} record{diluent !== "none" ? ` with ${diluent}` : ""} carries an oxygen value, so nothing can be placed near this setting.</>
            ) : (
              <>
                Of the {result.near.length} closest {fuel === "solid" ? "solid-material" : fuel === "liquid" ? "droplet" : "gas-flame"} records
                {diluent !== "none" ? ` with ${diluent}` : ""},{" "}
                {result.withOutcome > 0 ? (
                  <>
                    <b className="text-ink">{result.out} of {result.withOutcome}</b> with a recorded outcome went out or failed to ignite.
                  </>
                ) : (
                  <>none records an outcome in its table; the result is in the test video.</>
                )}
                {result.medianBurn != null && <> Median burn time {result.medianBurn} s.</>}
                {result.zone === "outside" && <> The closest one is {result.d0!.toFixed(1)} steps away (one step = 10 oxygen points or 3.7 psi), so read this as a bound, not a prediction.</>}
              </>
            )}
          </div>
          {fuel === "solid" && (
            <div className="mt-1 text-[12px] text-dim">
              Solid tables log a fan setting, not a calibrated flow, and no sample was burned above 22.2% oxygen.
            </div>
          )}
        </div>

        <div className="scroll fill mt-3 max-h-[168px]">
          <table className="data">
            <thead>
              <tr><th>Closest records</th><th className="num">Steps</th></tr>
            </thead>
            <tbody>
              {result.near.slice(0, 8).map(({ t, r }) => (
                <tr key={t.id}>
                  <td>{describeTest(t)}</td>
                  <td className="num">{r.d.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
