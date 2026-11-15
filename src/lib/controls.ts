// Control registry: every slider, selector and switch of the lab in one place, so
// the voice and the chat can operate the whole site and know its state. Each view
// subscribes only to its own controls, so setting one redraws only that view.
// Code generated with SI assistance (Claude Code).

export type ControlValue = string | number | boolean;

interface Base {
  label: string;
  view: string; // the stage view (or area) the control belongs to
}
export type ControlDef =
  | (Base & { kind: "number"; min: number; max: number; step: number; unit: string; initial: number })
  | (Base & { kind: "choice"; options: string[]; initial: string })
  | (Base & { kind: "toggle"; initial: boolean });

const GRAVITY = ["auto", "microgravity", "moon", "mars", "earth"];

export const CONTROLS = {
  "fire.fuel": { kind: "choice", view: "fire", label: "Fuel type on the flame bench", options: ["solid", "liquid", "gas"], initial: "liquid" },
  "fire.flow": { kind: "number", view: "fire", label: "Air flow on the flame bench", min: 0, max: 60, step: 1, unit: "cm/s", initial: 10 },
  "fire.diluent": { kind: "choice", view: "fire", label: "Diluent gas on the flame bench", options: ["none", "N2", "CO2", "He"], initial: "none" },

  "scenario.zone": { kind: "choice", view: "scenarios", label: "Where the fire starts", options: ["cabin", "stowage", "avionics"], initial: "cabin" },
  "scenario.detection": { kind: "number", view: "scenarios", label: "Time to detect the fire", min: 10, max: 300, step: 5, unit: "s", initial: 60 },
  "scenario.gravity": { kind: "choice", view: "scenarios", label: "Gravity in the scenario", options: GRAVITY, initial: "auto" },
  "scenario.fans_off": { kind: "toggle", view: "scenarios", label: "Crew turns the ventilation off", initial: true },
  "scenario.masks": { kind: "toggle", view: "scenarios", label: "Crew puts masks on", initial: false },
  "scenario.extinguisher": { kind: "toggle", view: "scenarios", label: "Crew uses the extinguisher", initial: true },
  "scenario.nitrogen": { kind: "toggle", view: "scenarios", label: "Flood the module with nitrogen", initial: false },
  "scenario.leave": { kind: "toggle", view: "scenarios", label: "Crew leaves the module", initial: false },
  "scenario.relief": { kind: "toggle", view: "scenarios", label: "Pressure relief valve", initial: true },

  "lab.case": { kind: "choice", view: "lab", label: "Which lab case is shown", options: ["cabin", "map", "margin", "test", "flame", "droplet"], initial: "cabin" },
  "lab.dimension": { kind: "choice", view: "lab", label: "Lab graph in 2D or 3D", options: ["2d", "3d"], initial: "2d" },
  "lab.airflow": { kind: "number", view: "lab", label: "Airflow at the flame (flammability map)", min: 0.3, max: 100, step: 0.1, unit: "cm/s", initial: 10 },
  "lab.thickness": { kind: "number", view: "lab", label: "Fuel half-thickness (flammability map)", min: 0.03, max: 1, step: 0.01, unit: "mm", initial: 0.1 },
  "lab.material_limit": { kind: "number", view: "lab", label: "Material oxygen limit in the Earth test", min: 14, max: 60, step: 0.5, unit: "% O2", initial: 30 },
  "lab.orbit_shift": { kind: "number", view: "lab", label: "How much lower the limit is in orbit", min: 0, max: 4, step: 0.5, unit: "points", initial: 4 },
  "lab.scatter": { kind: "number", view: "lab", label: "Scatter between samples", min: 0.2, max: 3, step: 0.1, unit: "points", initial: 1 },
  "lab.samples": { kind: "number", view: "lab", label: "Samples tested", min: 1, max: 10, step: 1, unit: "", initial: 3 },
  "lab.droplet": { kind: "number", view: "lab", label: "Droplet size", min: 1, max: 9, step: 0.1, unit: "mm", initial: 3 },

  "cabin.fans": { kind: "toggle", view: "lab", label: "Cabin ventilation fans running", initial: true },
  "cabin.gravity": { kind: "choice", view: "lab", label: "Gravity in the live cabin", options: GRAVITY, initial: "auto" },
  "cabin.show": { kind: "choice", view: "lab", label: "What the live cabin shows", options: ["flame", "o2", "co"], initial: "flame" },
  "cabin.running": { kind: "toggle", view: "lab", label: "Live cabin simulation running", initial: true },

  "env.drawing": { kind: "choice", view: "environment", label: "Environment drawing in 3D or 2D", options: ["3d", "2d"], initial: "3d" },
  "layout.voice": { kind: "choice", view: "layout", label: "Voice panel docked on the right or floating", options: ["docked", "floating"], initial: "docked" },
  "layout.left": { kind: "number", view: "layout", label: "Width of the environment column", min: 200, max: 620, step: 10, unit: "px", initial: 292 },
  "layout.right": { kind: "number", view: "layout", label: "Width of the voice column", min: 200, max: 620, step: 10, unit: "px", initial: 400 },
} as const satisfies Record<string, ControlDef>;

export type ControlId = keyof typeof CONTROLS;
export const CONTROL_IDS = Object.keys(CONTROLS) as ControlId[];

/** One-shot actions (buttons). */
export const ACTIONS = {
  "scenario.play": { view: "scenarios", label: "Play the fire scenario from the start" },
  "scenario.pause": { view: "scenarios", label: "Pause the fire scenario playback" },
  "cabin.extinguisher": { view: "lab", label: "Fire the extinguisher in the live cabin" },
  "cabin.restart": { view: "lab", label: "Restart the fire in the live cabin" },
} as const;
export type ActionId = keyof typeof ACTIONS;
export const ACTION_IDS = Object.keys(ACTIONS) as ActionId[];

// ---------- store ----------

const values = new Map<ControlId, ControlValue>(CONTROL_IDS.map((id) => [id, CONTROLS[id].initial]));
const listeners = new Map<string, Set<() => void>>();
const actionListeners = new Map<string, Set<() => void>>();

/** Coerce anything the voice or chat sends into a valid value for the control, or null if it cannot be. */
export function coerce(id: ControlId, raw: unknown): ControlValue | null {
  const def: ControlDef = CONTROLS[id];
  if (def.kind === "number") {
    const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(",", "."));
    if (!Number.isFinite(n)) return null;
    return Math.min(def.max, Math.max(def.min, Math.round(n / def.step) * def.step));
  }
  if (def.kind === "toggle") {
    if (typeof raw === "boolean") return raw;
    const s = String(raw).toLowerCase().trim();
    if (["true", "on", "yes", "1", "si", "sí", "encendido", "activado"].includes(s)) return true;
    if (["false", "off", "no", "0", "apagado", "desactivado"].includes(s)) return false;
    return null;
  }
  const s = String(raw).toLowerCase().trim();
  const alias: Record<string, string> = { "0": "microgravity", "0g": "microgravity", zero: "microgravity", lunar: "moon", luna: "moon", marte: "mars", tierra: "earth", "1g": "earth", oxygen: "o2", carbon_monoxide: "co", smoke: "flame", nitrogen: "n2", helium: "he", co2: "co2", float: "floating", dock: "docked" };
  const want = alias[s] ?? s;
  return def.options.find((o) => o.toLowerCase() === want) ?? null;
}

export const controls = {
  get<T extends ControlValue = ControlValue>(id: ControlId): T {
    return values.get(id) as T;
  },
  /** Returns the value actually stored, or null when the input was not valid for this control. */
  set(id: ControlId, raw: unknown): ControlValue | null {
    const v = coerce(id, raw);
    if (v === null) return null;
    if (values.get(id) !== v) {
      values.set(id, v);
      listeners.get(id)?.forEach((l) => l());
    }
    return v;
  },
  subscribe(id: ControlId, listener: () => void) {
    if (!listeners.has(id)) listeners.set(id, new Set());
    listeners.get(id)!.add(listener);
    return () => {
      listeners.get(id)?.delete(listener);
    };
  },
  press(id: ActionId) {
    actionListeners.get(id)?.forEach((l) => l());
  },
  onPress(id: ActionId, listener: () => void) {
    if (!actionListeners.has(id)) actionListeners.set(id, new Set());
    actionListeners.get(id)!.add(listener);
    return () => {
      actionListeners.get(id)?.delete(listener);
    };
  },
  snapshot(): Record<string, ControlValue> {
    return Object.fromEntries(CONTROL_IDS.map((id) => [id, values.get(id) as ControlValue]));
  },
};

// State owned by the table itself (environment, atmosphere, stage view), published so a snapshot is complete.
let table: Record<string, ControlValue | null> = {};
export function setTableState(state: Record<string, ControlValue | null>) {
  table = state;
}
/** Everything the voice needs to know about what is on screen right now. */
export function fullSnapshot() {
  return { table, controls: controls.snapshot() };
}

/** "auto" follows the environment on the table; the rest are fixed fractions of Earth gravity. */
export function gravityOf(choice: string, fallback: number): number {
  return { microgravity: 0, moon: 0.17, mars: 0.38, earth: 1 }[choice] ?? fallback;
}
export function gravityChoice(g: number): string {
  return g === 0 ? "microgravity" : g === 0.17 ? "moon" : g === 0.38 ? "mars" : "earth";
}

/** Compact list for the voice model: id, what it is, and the values it accepts. */
export function describeControls(): string {
  return CONTROL_IDS.map((id) => {
    const d: ControlDef = CONTROLS[id];
    const range = d.kind === "number" ? `${d.min} to ${d.max} ${d.unit}`.trim() : d.kind === "toggle" ? "true or false" : d.options.join(", ");
    return `${id} (${d.label}): ${range}`;
  }).join("; ");
}
