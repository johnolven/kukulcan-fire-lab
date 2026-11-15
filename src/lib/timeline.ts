// Timeline data: the incidents and technology named by the challenge, with the
// library passage each date comes from, and the periods PSI records for each
// investigation. Code generated with SI assistance (Claude Code).

import { COMBUSTION, label } from "./lab";

export interface Moment {
  year: number; // decimal year
  title: string;
  detail: string;
  kind: "incident" | "earth";
  cite: string; // library passage or resource id
  ask: string; // question to send to the orchestrator
}

export const MOMENTS: Moment[] = [
  { year: 1967.07, title: "Apollo 1", detail: "Jan 27, 1967. Fire in a pure-oxygen cabin during a ground test; three astronauts die.", kind: "incident", cite: "apollo-1#20", ask: "What happened in the Apollo 1 fire and what changed afterwards?" },
  { year: 1970.29, title: "Apollo 13", detail: "April 1970. An oxygen tank explodes on the way to the Moon; the crew returns safely.", kind: "incident", cite: "apollo-13#10", ask: "What caused the Apollo 13 oxygen tank explosion and what was learned?" },
  { year: 1976.5, title: "Fireman's air tanks", detail: "1976. Spacesuit technology lightens firefighters' breathing gear.", kind: "earth", cite: "air-tanks", ask: "How did NASA technology improve firefighters' air tanks?" },
  { year: 1978.5, title: "Fire detector", detail: "1978. A shuttle smoke detector that tells smoke from dust reaches industry.", kind: "earth", cite: "fire-detector#1", ask: "How does the shuttle fire detector tell smoke from dust?" },
  { year: 1982.5, title: "Fire attire", detail: "1982. Spacesuit materials improve firefighter clothing.", kind: "earth", cite: "fire-attire", ask: "How did spacesuit technology improve firefighter clothing?" },
  { year: 1997.15, title: "Mir fire", detail: "Feb 24, 1997. An oxygen generator burns for several minutes aboard Mir.", kind: "incident", cite: "mir-fire#1", ask: "How did the Mir crew fight the 1997 fire and what was learned?" },
];

const yearOf = (s: string): number | null => {
  const m = s?.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return m ? +m[3] + (+m[1] - 1) / 12 + (+m[2] - 1) / 365 : null;
};

export interface Span {
  accession: string;
  name: string;
  phase: string | null;
  pillars: string[];
  start: number;
  end: number | null; // null = no end recorded
  focus: string | null;
}

export function investigationSpans(): { spans: Span[]; undated: string[] } {
  const spans: Span[] = [];
  const undated: string[] = [];
  for (const i of COMBUSTION) {
    const start = yearOf(i.start);
    if (start == null) {
      undated.push(label(i));
      continue;
    }
    spans.push({ accession: i.accession, name: label(i), phase: i.fuel_phase, pillars: i.pillars, start, end: yearOf(i.end), focus: i.focus });
  }
  spans.sort((a, b) => a.start - b.start);
  return { spans, undated };
}
