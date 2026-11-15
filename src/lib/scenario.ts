// Cabin fire scenario model, ported from the team's earlier project "Umbral"
// (module scencore.js). Base: the sealed-module fire model attributed there to
// NASA Glenn (Dietrich, Ruff and Urban 2014): a t-squared fire Q = a t^2 with
// a = 0.0029 kW/s^2 in a Destiny-size sealed module (65 m^3, 150 m^2 of wall).
// Every constant marked A is an assumption of this tool and is shown to the user.
// The model compares decisions. It does not certify anything.
// Code generated with SI assistance (Claude Code).

const R = 8.314;
const TW = 295; // wall and initial gas temperature, K
export const K = {
  ALPHA: 0.0029, // kW/s^2, fire growth in the cited study
  V: 65, // m^3
  AREA: 150, // m^2
  HC: 20e6, // A: heat of combustion of mixed cabin fuel, J/kg
  EO2: 13.1e6, // A: heat released per kg of oxygen consumed
  YCO2: 2.0, // A: kg CO2 per kg fuel
  HW: 10, // A: wall heat transfer coefficient, W/m2K
  XLIM: 0.14, // A: oxygen fraction below which the flame goes out
  FANF: 0.3, // A: growth factor after fans are off, microgravity only
  EXTMAX: 50, // kW: above this the crew cannot approach with an extinguisher
  BURN: 50, // kW: burn injury level
  CAT: 200, // kW: catastrophic
  SMAC_CO: 55, // ppm, 1-hour limit
  SMAC_CO2: 13000, // ppm, 1-hour limit
  HYPOX: 0.16, // A: oxygen fraction treated as hypoxic
};

export const ZONES = {
  cabin: { name: "Open cabin", fuel: 3, mult: 1, yco: 0.02 },
  stowage: { name: "Stowage", fuel: 6, mult: 1.5, yco: 0.02 },
  avionics: { name: "Avionics bay", fuel: 1.5, mult: 0.7, yco: 0.04 },
} as const;
export type ZoneId = keyof typeof ZONES;

export interface Actions {
  fan: boolean; // ventilation off
  ext: boolean; // portable extinguisher
  mask: boolean; // crew masks
  leave: boolean; // crew leaves the module
  inert: boolean; // flood with nitrogen
}

export interface ScenarioInput extends Actions {
  p0_kpa: number;
  x0: number; // oxygen fraction
  g: number; // 0 = microgravity
  zone: ZoneId;
  det: number; // seconds until detection
  relief: boolean; // pressure relief valve
}

export type EventKind = "detect" | "fan" | "mask" | "leave" | "inert" | "extok" | "extfail" | "o2out" | "fuelout";

export interface Sample {
  t: number;
  Q: number; // kW
  x: number; // oxygen %
  co: number; // ppm
  co2: number; // ppm
  T: number; // °C
  p: number; // kPa
}

export interface ScenarioResult {
  samples: Sample[];
  events: { t: number; k: EventKind }[];
  peak: number;
  pmax: number;
  tmax: number;
  burned: number;
  outWhy: "ext" | "o2" | "fuel" | null;
  outT: number | null;
  crew: { maxCO: number; maxCO2: number; maxT: number; minX: number; burn: boolean; hypox: boolean; gone: boolean; masked: boolean; extOK: boolean | null };
  level: 0 | 1 | 2 | 3;
  why: string[];
}

const o2mult = (x: number) => (x / 0.21) ** 2; // A: more oxygen grows the fire faster

export function runScenario(P: ScenarioInput, tmax = 600): ScenarioResult {
  const zone = ZONES[P.zone];
  const dt = 0.5;
  let T = TW;
  const p0 = P.p0_kpa * 1e3;
  const n = (p0 * K.V) / (R * TW);
  let nO2 = n * P.x0, nCO = 0, nCO2 = n * 0.0004;
  let nIn = n - nO2 - nCO2;
  let Q = 0, burned = 0, out = false;
  let outT: number | null = null;
  let outWhy: ScenarioResult["outWhy"] = null;
  const a = K.ALPHA * zone.mult * o2mult(P.x0);
  const tFan = P.det + 10, tMask = P.det + 20, tExt = P.det + 30, tLeave = P.det + 60, tInert = P.det + 30;
  const crew: ScenarioResult["crew"] = { maxCO: 0, maxCO2: 0, maxT: T, minX: P.x0, burn: false, hypox: false, gone: false, masked: false, extOK: null };
  const samples: Sample[] = [];
  const events: ScenarioResult["events"] = [{ t: P.det, k: "detect" }];
  const at = (t: number, when: number) => Math.abs(t - when) < dt / 2;

  for (let t = 0; t <= tmax; t += dt) {
    let nt = nIn + nO2 + nCO + nCO2;
    const x = nO2 / nt;
    const ppmCO = (1e6 * nCO) / nt, ppmCO2 = (1e6 * nCO2) / nt;
    if (P.fan && at(t, tFan)) events.push({ t, k: "fan" });
    if (P.mask && at(t, tMask)) { crew.masked = true; events.push({ t, k: "mask" }); }
    if (P.leave && at(t, tLeave)) { crew.gone = true; events.push({ t, k: "leave" }); }
    if (P.inert && at(t, tInert)) { const add = nO2 / 0.12 - nt; if (add > 0) nIn += add; events.push({ t, k: "inert" }); }
    if (P.ext && at(t, tExt) && !out) {
      if (Q < K.EXTMAX && !crew.gone) { out = true; outT = t; outWhy = "ext"; crew.extOK = true; events.push({ t, k: "extok" }); }
      else { crew.extOK = false; events.push({ t, k: "extfail" }); }
    }
    if (!out) {
      if (x < K.XLIM) { out = true; outT = t; outWhy = "o2"; events.push({ t, k: "o2out" }); }
      else if (burned >= zone.fuel) { out = true; outT = t; outWhy = "fuel"; events.push({ t, k: "fuelout" }); }
    }
    const aa = a * (P.fan && t >= tFan && P.g === 0 ? K.FANF : 1);
    if (!out) Q = t < 1 ? 0 : Math.min(Q + 2 * Math.sqrt(aa * Math.max(Q, aa)) * dt, 1e4);
    else Q = Math.max(0, Q - (Q * dt) / (outWhy === "ext" ? 4 : 15));
    const qW = Q * 1e3, mf = qW / K.HC, mO2 = qW / K.EO2;
    const yco = x < P.x0 * 0.85 ? 0.1 : zone.yco;
    burned += mf * dt;
    nO2 = Math.max(0, nO2 - (mO2 / 0.032) * dt);
    nCO += ((yco * mf) / 0.028) * dt;
    nCO2 += ((K.YCO2 * mf) / 0.044) * dt;
    const mg = nIn * 0.028 + nO2 * 0.032 + nCO * 0.028 + nCO2 * 0.044;
    T += ((qW - K.HW * K.AREA * (T - TW)) / (mg * 718)) * dt;
    nt = nIn + nO2 + nCO + nCO2;
    let p = (nt * R * T) / K.V;
    if (P.relief && p > p0) { const k = p0 / p; nIn *= k; nO2 *= k; nCO *= k; nCO2 *= k; p = p0; }
    if (!crew.gone) {
      if (Q >= K.BURN) crew.burn = true;
      crew.maxT = Math.max(crew.maxT, T);
      if (!crew.masked) {
        crew.maxCO = Math.max(crew.maxCO, ppmCO);
        crew.maxCO2 = Math.max(crew.maxCO2, ppmCO2);
        crew.minX = Math.min(crew.minX, nO2 / nt);
        if (nO2 / nt < K.HYPOX) crew.hypox = true;
      }
    }
    if (Math.round(t * 2) % 10 === 0) samples.push({ t, Q, x: (100 * nO2) / nt, co: (1e6 * nCO) / nt, co2: (1e6 * nCO2) / nt, T: T - 273.15, p: p / 1e3 });
  }
  const peak = Math.max(...samples.map((s) => s.Q));
  let level: 0 | 1 | 2 | 3 = 0;
  const why: string[] = [];
  const raise = (l: 1 | 2 | 3) => { if (l > level) level = l; };
  if (peak >= K.CAT && !crew.gone) { raise(3); why.push("Fire passes 200 kW with the crew inside"); }
  if (crew.burn) { raise(2); why.push("Fire passes 50 kW: burn injuries"); }
  if (crew.hypox) { raise(2); why.push("Oxygen breathed falls below 16%"); }
  if (peak >= K.CAT && crew.gone) { raise(2); why.push("Module lost after the crew leaves"); }
  if (crew.maxCO > K.SMAC_CO) { raise(1); why.push("Carbon monoxide above the 1-hour limit (55 ppm)"); }
  if (crew.maxCO2 > K.SMAC_CO2) { raise(1); why.push("Carbon dioxide above the 1-hour limit (13,000 ppm)"); }
  if (P.ext && crew.extOK === false) why.push("Extinguisher could not be used: fire too large or crew gone");
  return { samples, events, peak, pmax: Math.max(...samples.map((s) => s.p)), tmax: Math.max(...samples.map((s) => s.T)), burned: Math.min(burned, zone.fuel), outWhy, outT, crew, level, why };
}

export const PLANS: { id: string; name: string; actions: Actions }[] = [
  { id: "none", name: "No response", actions: { fan: false, ext: false, mask: false, leave: false, inert: false } },
  { id: "fan", name: "Ventilation off", actions: { fan: true, ext: false, mask: false, leave: false, inert: false } },
  { id: "ext", name: "Extinguisher", actions: { fan: false, ext: true, mask: false, leave: false, inert: false } },
  { id: "fanext", name: "Ventilation off + extinguisher", actions: { fan: true, ext: true, mask: false, leave: false, inert: false } },
  { id: "maskfanext", name: "Masks + ventilation off + extinguisher", actions: { fan: true, ext: true, mask: true, leave: false, inert: false } },
  { id: "leave", name: "Ventilation off + leave the module", actions: { fan: true, ext: false, mask: false, leave: true, inert: false } },
  { id: "inert", name: "Flood with nitrogen", actions: { fan: false, ext: false, mask: false, leave: false, inert: true } },
];

export function compareResponses(base: ScenarioInput) {
  return PLANS.map((pl) => ({ plan: pl, result: runScenario({ ...base, ...pl.actions }) })).sort(
    (a, b) => a.result.level - b.result.level || a.result.crew.maxCO - b.result.crew.maxCO || a.result.peak - b.result.peak,
  );
}

/** Latest detection time (s) that still keeps the crew within every limit, or null if none does. */
export function detectionLimit(base: ScenarioInput): number | null {
  let best: number | null = null;
  for (let d = 10; d <= 300; d += 5) {
    if (runScenario({ ...base, det: d }).level === 0) best = d;
    else if (best !== null) break;
  }
  return best;
}

export const LEVELS = ["Crew within every limit", "Toxic exposure", "Injury or module lost", "Catastrophic"] as const;
export const EVENT_LABEL: Record<EventKind, string> = {
  detect: "Fire detected",
  fan: "Ventilation off",
  mask: "Masks on",
  leave: "Crew leaves",
  inert: "Nitrogen flood",
  extok: "Extinguisher puts it out",
  extfail: "Extinguisher fails",
  o2out: "Flame goes out: oxygen too low",
  fuelout: "Flame goes out: fuel consumed",
};

export function summarize(P: ScenarioInput, r: ScenarioResult) {
  return {
    outcome: LEVELS[r.level],
    reasons: r.why,
    peak_fire_kw: +r.peak.toFixed(1),
    co_breathed_ppm: Math.round(r.crew.maxCO),
    lowest_o2_breathed_pct: +(100 * r.crew.minX).toFixed(1),
    hottest_air_c: Math.round(r.tmax),
    highest_pressure_kpa: +r.pmax.toFixed(1),
    flame_out: r.outWhy ? { at_s: r.outT, because: { ext: "extinguisher", o2: "oxygen fell below 14%", fuel: "fuel consumed" }[r.outWhy] } : "still burning at 10 minutes",
    events: r.events.sort((a, b) => a.t - b.t).map((e) => `${Math.round(e.t)} s: ${EVENT_LABEL[e.k]}`),
    inputs: { zone: ZONES[P.zone].name, oxygen_pct: +(P.x0 * 100).toFixed(1), pressure_kpa: +P.p0_kpa.toFixed(1), gravity_g: P.g, detection_s: P.det },
  };
}

export const MODEL_NOTE =
  "Simplified sealed-module fire model: t-squared fire growth (0.0029 kW/s^2) in a 65 m^3 module with 150 m^2 of wall, attributed to NASA Glenn (Dietrich, Ruff and Urban, 2014). Assumptions of this tool: 20 MJ/kg fuel, 13.1 MJ per kg of oxygen, CO yield 2-4% rising to 10% when oxygen runs low, fire growth scaled by (oxygen/21%)^2, flame out below 14% oxygen, ventilation-off slows growth to 30% in microgravity only. It compares decisions; it is not a certification tool and is not derived from the PSI test records.";
