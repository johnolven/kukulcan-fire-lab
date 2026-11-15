// Fire-model laboratory, ported from the team's earlier project "Umbral"
// (module labcore.js). Each model is a published relation with a few fitted or
// assumed constants; every constant marked A is an assumption of this tool.
// These are models, not PSI test records. Sources are the ones cited in Umbral.
// Code generated with SI assistance (Claude Code).

/** NASA CEA (Glenn) adiabatic flame at stoichiometric mixture, computed offline in Umbral. */
export const CEA: { O2: number[]; P: number[]; T: Record<string, number[][]>; CO: Record<string, number[][]>; ok?: boolean } = {"O2": [0.15, 0.18, 0.21, 0.24, 0.27, 0.3, 0.34, 0.37, 0.4], "P": [30, 40, 56.5, 70.3, 85, 101.3], "T": {"CH4": [[1856, 1858, 1860, 1861, 1861, 1862], [2048, 2052, 2057, 2060, 2062, 2064], [2194, 2201, 2210, 2215, 2220, 2224], [2304, 2314, 2327, 2335, 2341, 2347], [2389, 2402, 2418, 2428, 2437, 2445], [2456, 2472, 2491, 2503, 2513, 2523], [2528, 2547, 2569, 2583, 2595, 2606], [2572, 2592, 2616, 2631, 2645, 2657], [2609, 2631, 2657, 2673, 2687, 2700]], "C2H4": [[2001, 2005, 2008, 2011, 2012, 2014], [2187, 2194, 2203, 2208, 2212, 2216], [2322, 2333, 2346, 2354, 2361, 2368], [2423, 2438, 2455, 2466, 2475, 2483], [2502, 2519, 2540, 2553, 2564, 2574], [2566, 2585, 2608, 2623, 2636, 2647], [2634, 2656, 2682, 2699, 2713, 2727], [2676, 2699, 2728, 2746, 2761, 2776], [2712, 2737, 2767, 2786, 2803, 2818]]}, "CO": {"CH4": [[0.15, 0.14, 0.13, 0.12, 0.11, 0.11], [0.52, 0.48, 0.45, 0.42, 0.4, 0.39], [1.13, 1.07, 1.0, 0.96, 0.92, 0.89], [1.89, 1.81, 1.72, 1.66, 1.62, 1.57], [2.72, 2.63, 2.52, 2.46, 2.4, 2.34], [3.55, 3.46, 3.35, 3.28, 3.21, 3.15], [4.64, 4.55, 4.44, 4.36, 4.29, 4.23], [5.43, 5.34, 5.22, 5.14, 5.08, 5.01], [6.18, 6.09, 5.97, 5.9, 5.83, 5.77]], "C2H4": [[0.47, 0.43, 0.4, 0.38, 0.36, 0.34], [1.29, 1.22, 1.14, 1.09, 1.05, 1.01], [2.42, 2.32, 2.21, 2.14, 2.07, 2.02], [3.68, 3.57, 3.43, 3.34, 3.27, 3.2], [4.97, 4.85, 4.71, 4.61, 4.53, 4.45], [6.25, 6.12, 5.97, 5.88, 5.79, 5.71], [7.87, 7.75, 7.61, 7.51, 7.42, 7.34], [9.03, 8.92, 8.77, 8.68, 8.59, 8.51], [10.13, 10.02, 9.89, 9.8, 9.72, 9.64]]}, "ok": true};

const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function interp(xs: number[], x: number): [number, number] {
  x = clamp(x, xs[0], xs[xs.length - 1]);
  for (let i = 0; i < xs.length - 1; i++) if (x <= xs[i + 1]) return [i, (x - xs[i]) / (xs[i + 1] - xs[i])];
  return [xs.length - 2, 1];
}

export type CeaFuel = "CH4" | "C2H4";

/** 1. CEA flame temperature (K) or equilibrium CO (%), bilinear over oxygen fraction and pressure (kPa). */
export function ceaT(fuel: CeaFuel, x: number, p: number, key: "T" | "CO" = "T"): number {
  const A = CEA[key][fuel];
  const [i, fa] = interp(CEA.O2, x);
  const [j, fb] = interp(CEA.P, p);
  return lerp(lerp(A[i][j], A[i][j + 1], fb), lerp(A[i + 1][j], A[i + 1][j + 1], fb), fa);
}

/** 2. Opposed-flow flammability map over a thin cellulose fuel (Olson; T'ien; BASS-II).
 *  Quenching branch at low flow (radiative loss), blowoff branch at high flow.
 *  A: fit constants, fitted in Umbral to three NASA points. */
export const MAP = { xmin: 0.14, us: 10, kq: 0.0132, kb: 0.0207, ub1: 30 };
export function xlim(u: number): number {
  u = Math.max(u, 0.05);
  const l = Math.log(u / MAP.us);
  return MAP.xmin + (l < 0 ? MAP.kq : MAP.kb) * l * l;
}
/** A: buoyant flow scales with g^(1/3). */
export const ubuoy = (g: number) => (g <= 0 ? 0 : MAP.ub1 * Math.pow(g, 1 / 3));

/** de Ris thermal theory for a thermally thin solid. A: cellulose-like properties. */
export const DR = { lg: 0.06, Tv: 618, Ti: 298, rho: 500, cs: 1300, fT: 0.75 };
/** Flame spread rate, mm/s. */
export function spread(x: number, u: number, tau_mm: number): number {
  const xl = xlim(u);
  if (x <= xl) return 0;
  const Tf = DR.Ti + DR.fT * (ceaT("CH4", clamp(x, 0.15, 0.4), 101.3) - DR.Ti);
  const v = ((Math.PI / 4) * DR.lg * (Tf - DR.Tv)) / (DR.rho * DR.cs * (tau_mm / 1000) * (DR.Tv - DR.Ti));
  return 1000 * v * Math.sqrt(1 - Math.pow(xl / x, 3));
}

/** 3. Earth test versus orbit (NASA TM-2008-215260: the 0-g limit is up to 4 oxygen points lower). Values in percent. */
export function margin(moc: number, o2: number, shift: number) {
  return { earth: moc - o2, orbit: moc - shift - o2, state: (moc - o2 < 0 ? "fails" : moc - shift - o2 < 0 ? "hidden" : "holds") as "fails" | "hidden" | "holds" };
}

/** 4. NASA-STD-6001 Test 1 as a Poisson process (Olson and Beeson 2014). s is A. */
export const pburn = (x: number, xL: number, s: number) => Math.exp(-Math.exp(-(x - xL) / s));
export const ppassAll = (x: number, xL: number, s: number, n: number) => Math.pow(1 - pburn(x, xL, s), n);
export const uloi = (xL: number, s: number) => xL - s * Math.log(Math.log(2));
export const x05 = (xL: number, s: number) => xL - s * Math.log(-Math.log(0.05));

/** 5. Droplet combustion, d-squared law as used to analyse FLEX. A: K21 and the cool-flame thresholds. */
export const DROP = { K21: 0.75, Q: 44.6e6, nu: 3.52, L: 3.17e5, cp: 1500, Tb: 371, Ti: 298, dc: 3.0, fext: 0.55, kc: 0.35, dcool: 1.5 };
export function Bnum(x: number) {
  const yo = (x * 32) / (x * 32 + (1 - x) * 28);
  return ((yo * DROP.Q) / DROP.nu + DROP.cp * (DROP.Ti - DROP.Tb)) / DROP.L;
}
export const Kof = (x: number) => (DROP.K21 * Math.log(1 + Bnum(x))) / Math.log(1 + Bnum(0.21));
export interface DropPhase { k: "hot" | "cool" | "evap"; t0: number; t1: number; d0: number; d1: number; K: number }
export function droplet(d0: number, x: number) {
  const Kb = Kof(x), dcrit = DROP.dc * Math.pow(x / 0.21, 1.5), ph: DropPhase[] = [];
  let t = 0;
  const d2 = d0 * d0;
  if (d0 >= dcrit) {
    const de = DROP.fext * d0, t1 = (d2 - de * de) / Kb;
    ph.push({ k: "hot", t0: 0, t1, d0, d1: de, K: Kb });
    const dc = Math.min(DROP.dcool, de), t2 = t1 + (de * de - dc * dc) / (DROP.kc * Kb);
    ph.push({ k: "cool", t0: t1, t1: t2, d0: de, d1: dc, K: DROP.kc * Kb });
    const t3 = t2 + (dc * dc) / (0.12 * Kb);
    ph.push({ k: "evap", t0: t2, t1: t3, d0: dc, d1: 0, K: 0.12 * Kb });
    t = t3;
  } else {
    t = d2 / Kb;
    ph.push({ k: "hot", t0: 0, t1: t, d0, d1: 0, K: Kb });
  }
  return { K: Kb, dcrit, ph, T: t };
}

export const SOURCES = {
  map: "Olson, NASA TM-2004-213114; T'ien et al., NTRS 19930011018; BASS-II. Curve fitted to three NASA points; spread rate from de Ris thin-fuel theory with cellulose-like properties (assumed).",
  margin: "NASA TM-2008-215260: in 0 g the oxygen limit is up to 4 points lower than in the Earth test. The material limit is an example; use your own test result.",
  test: "Olson and Beeson, ICES-2014-179: NASA-STD-6001 Test 1 treated as a Poisson process. The scatter between samples is assumed.",
  flame: "NASA CEA equilibrium calculation at stoichiometric mixture, for methane and ethylene as stand-ins for the gases a hot material releases. Table covers 15-40% oxygen and 30-101 kPa; values outside are clamped.",
  droplet: "d-squared law (Godsave, Spalding) as used for FLEX on the ISS. Burning constant in air 0.75 mm2/s and the cool-flame thresholds are assumed.",
};
