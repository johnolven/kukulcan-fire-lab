// Crewed environments named in the challenge, with a starting design atmosphere.
// Code generated with SI assistance (Claude Code).
//
// Only two atmospheres come straight from the challenge statement:
//   - spacesuit: 100% oxygen at 4.3 psi
//   - Moon base / pressurized rover: 30% oxygen or more at 10.2 psi or less
// Everything else is an adjustable engineering preset, labeled as such in the UI.

export interface Environment {
  id: string;
  name: string;
  short: string;
  o2_pct: number;
  pressure_psi: number;
  gravity: string;
  basis: "challenge" | "preset";
  basisNote: string;
  concern: string;
}

export const ENVIRONMENTS: Environment[] = [
  {
    id: "suit",
    name: "Spacesuit",
    short: "SUIT",
    o2_pct: 100,
    pressure_psi: 4.3,
    gravity: "any",
    basis: "challenge",
    basisNote: "Challenge statement: suits are filled with 100% oxygen at 4.3 psi.",
    concern: "Pure oxygen: every organic material in the suit is a fuel.",
  },
  {
    id: "capsule",
    name: "Crew capsule",
    short: "CAPSULE",
    o2_pct: 21,
    pressure_psi: 14.7,
    gravity: "microgravity in flight",
    basis: "preset",
    basisNote: "Preset: sea-level air. Adjust to the cabin you are designing.",
    concern: "Small volume, dense wiring, no escape path during flight.",
  },
  {
    id: "spacecraft",
    name: "Transit spacecraft",
    short: "TRANSIT",
    o2_pct: 26.5,
    pressure_psi: 10.2,
    gravity: "microgravity",
    basis: "preset",
    basisNote: "Preset: reduced-pressure cabin used to shorten spacewalk pre-breathe. Adjust as needed.",
    concern: "Months from help; ventilation flow feeds a flame that buoyancy would not.",
  },
  {
    id: "station",
    name: "Space station",
    short: "STATION",
    o2_pct: 21,
    pressure_psi: 14.7,
    gravity: "microgravity",
    basis: "preset",
    basisNote: "Preset: sea-level air, the atmosphere where most PSI tests were run.",
    concern: "Forced ventilation, hidden volumes behind racks, slow smoke transport to detectors.",
  },
  {
    id: "base",
    name: "Surface base",
    short: "BASE",
    o2_pct: 34,
    pressure_psi: 8.2,
    gravity: "Moon 0.17 g / Mars 0.38 g",
    basis: "challenge",
    basisNote: "Challenge statement: likely 30% oxygen or more at 10.2 psi or less. The exact point is an adjustable preset.",
    concern: "Oxygen-enriched air plus partial gravity: no PSI data yet for either combined.",
  },
  {
    id: "rover",
    name: "Pressurized rover",
    short: "ROVER",
    o2_pct: 34,
    pressure_psi: 8.2,
    gravity: "Moon 0.17 g / Mars 0.38 g",
    basis: "challenge",
    basisNote: "Challenge statement: same enriched atmosphere as the base to ease suit transfers.",
    concern: "Smallest volume, crew cannot evacuate, suit ports cycle often.",
  },
];

export function environmentById(id: string): Environment | undefined {
  const key = id.toLowerCase().trim();
  return ENVIRONMENTS.find(
    (e) => e.id === key || e.name.toLowerCase() === key || e.short.toLowerCase() === key || e.name.toLowerCase().includes(key),
  );
}
