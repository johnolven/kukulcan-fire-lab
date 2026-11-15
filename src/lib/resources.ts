// Resource library: every item on the challenge's Resources tab (NASA) plus
// partner-agency links, split into citable passages.
// Code generated with SI assistance (Claude Code).

import libraryJson from "@/data/resources.json";
import { numArg, str, type McpTool } from "./mcp";

export interface Passage {
  id: string;
  section: string;
  text: string;
  page?: number;
}
export interface Resource {
  id: string;
  agency: string;
  kind: string;
  listed: boolean; // true = on the challenge's Resources tab
  title: string;
  url: string;
  topics: string[];
  summary: string;
  passages: Passage[];
}

export const LIBRARY = libraryJson as unknown as Resource[];

const STOP = new Set("the a an of and or to in on for with from at by is are was were be been it its this that as what which how why who when where does do did can could would should about into than then there their they them his her our your you we i me my not no yes if but so such these those have has had will may might also more most much many very over under between during after before".split(" "));
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9áéíóúñ\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));

export interface Hit {
  resource: Resource;
  passage: Passage;
  score: number;
}

export function searchLibrary(query: string, opts: { resource?: string; topic?: string; limit?: number } = {}): Hit[] {
  // "what did X teach us" is a question about lessons: look for those sections.
  if (/teach|taught|learn|lesson|ense[ñn]|aprend|lecci/i.test(query)) query += " lessons learned changes";
  const q = [...new Set(words(query))];
  if (!q.length) return [];
  const hits: Hit[] = [];
  for (const r of LIBRARY) {
    if (opts.resource && r.id !== opts.resource) continue;
    if (opts.topic && !r.topics.includes(opts.topic)) continue;
    const titleWords = new Set(words(`${r.title} ${r.topics.join(" ")}`));
    for (const p of r.passages) {
      const hay = p.text.toLowerCase();
      const sec = p.section.toLowerCase();
      let score = 0;
      for (const w of q) {
        const stem = w.length > 5 ? w.slice(0, -1) : w;
        const n = hay.split(stem).length - 1;
        if (n) score += 1 + Math.min(2, n) * 0.6;
        if (sec.includes(stem)) score += 1.6;
        if (titleWords.has(w)) score += 0.5;
      }
      if (score > 0) hits.push({ resource: r, passage: p, score: score / Math.sqrt(1 + p.text.length / 900) });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, opts.limit ?? 6);
}

export const getResource = (id: string) => LIBRARY.find((r) => r.id === id.trim().toLowerCase()) ?? LIBRARY.find((r) => r.title.toLowerCase().includes(id.trim().toLowerCase()));

const card = (r: Resource) => ({ id: r.id, title: r.title, agency: r.agency, kind: r.kind, on_challenge_resources_tab: r.listed, url: r.url, topics: r.topics, summary: r.summary, passages: r.passages.length });
const cite = (h: Hit) => ({ cite: h.passage.id, source: h.resource.title, agency: h.resource.agency, section: h.passage.section || undefined, page: h.passage.page, url: h.resource.url, text: h.passage.text });

export function libraryStats() {
  return {
    resources: LIBRARY.length,
    on_challenge_tab: LIBRARY.filter((r) => r.listed).length,
    partner_agency: LIBRARY.filter((r) => !r.listed).length,
    passages: LIBRARY.reduce((n, r) => n + r.passages.length, 0),
    agencies: [...new Set(LIBRARY.map((r) => r.agency))],
  };
}

export const RESOURCE_TOOLS: McpTool[] = [
  {
    name: "list_resources",
    description: "List the resource library: every item on the challenge's Resources tab (NASA PSI, NASA Combustion Science, the ScienceCasts video, the Researcher's Guide, Apollo 1, Apollo 13, the Mir fire, and the three Spinoff articles) plus partner-agency resources (JAXA, ESA). Optional topic filter: incident, lessons, prevention, detection, suppression, earth, spinoff, partner, overview, hardware.",
    inputSchema: { type: "object", properties: { topic: { type: "string" } } },
    handler: (a) => ({ ...libraryStats(), resources: LIBRARY.filter((r) => !str(a.topic) || r.topics.includes(str(a.topic)!)).map(card) }),
  },
  {
    name: "search_resources",
    description: "Search the text of the library and return the best passages, each with a citation id, its source, section and link. Use for history and lessons (Apollo 1, Apollo 13, Mir), for how the station's combustion facilities work, for what an investigation is about, and for technology that reached Earth.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, resource: { type: "string", description: "Limit to one resource id." }, topic: { type: "string" }, limit: { type: "number" } }, required: ["query"] },
    handler: (a) => {
      const hits = searchLibrary(str(a.query) ?? "", { resource: str(a.resource), topic: str(a.topic), limit: Math.min(12, numArg(a.limit) ?? 6) });
      return hits.length ? { passages: hits.map(cite) } : { passages: [], message: "No passage matches. Try other words, or list_resources to see what the library holds." };
    },
  },
  {
    name: "get_resource",
    description: "One resource in full: summary, link and its passages in order (paged). Use the id from list_resources, for example apollo-1, mir-fire, fire-detector, researchers-guide.",
    inputSchema: { type: "object", properties: { id: { type: "string" }, from: { type: "number", description: "First passage to return, 1-based. Default 1." }, count: { type: "number", description: "Default 12, max 40." } }, required: ["id"] },
    handler: (a) => {
      const r = getResource(str(a.id) ?? "");
      if (!r) return { error: `No resource "${a.id}".`, ids: LIBRARY.map((x) => x.id) };
      const from = Math.max(1, numArg(a.from) ?? 1);
      const count = Math.min(40, numArg(a.count) ?? 12);
      return { ...card(r), from, passages_returned: r.passages.slice(from - 1, from - 1 + count).map((p) => ({ cite: p.id, section: p.section || undefined, page: p.page, text: p.text })) };
    },
  },
  {
    name: "incident_lessons",
    description: "What happened and what was learned in a spaceflight fire or oxygen incident: apollo-1 (cabin fire in pure oxygen on the pad, 1967), apollo-13 (oxygen tank explosion, 1970) or mir-fire (oxygen generator fire, 1997). Returns the passages on the accident, the investigation and the lessons.",
    inputSchema: { type: "object", properties: { incident: { type: "string", enum: ["apollo-1", "apollo-13", "mir-fire"] } }, required: ["incident"] },
    handler: (a) => {
      const r = getResource(str(a.incident) ?? "");
      if (!r) return { error: "Use apollo-1, apollo-13 or mir-fire." };
      const key = /accident|fire|explosion|investigation|lesson|cause|finding|recommend|oxygen|review board/i;
      const picked = r.passages.filter((p) => key.test(p.section) || key.test(p.text.slice(0, 220)));
      return { ...card(r), passages: (picked.length ? picked : r.passages).slice(0, 14).map((p) => ({ cite: p.id, section: p.section || undefined, text: p.text })) };
    },
  },
  {
    name: "earth_benefits",
    description: "NASA fire-safety technology that reached Earth, from the Spinoff articles on the challenge's list: firefighter air tanks, the smoke-versus-dust fire detector, and firefighter protective clothing.",
    inputSchema: { type: "object", properties: {} },
    handler: () => ({ spinoffs: LIBRARY.filter((r) => r.kind === "spinoff").map((r) => ({ ...card(r), text: r.passages.map((p) => p.text) })) }),
  },
  {
    name: "partner_agencies",
    description: "Work on spacecraft fire safety by other space agencies and international teams: JAXA's FLARE experiment on Kibo with NASA and ESA, JAXA's solid combustion experiments, and the international Saffire team.",
    inputSchema: { type: "object", properties: {} },
    handler: () => ({ partners: LIBRARY.filter((r) => !r.listed).map((r) => ({ ...card(r), text: r.passages.map((p) => p.text) })) }),
  },
];

export const RESOURCE_INFO = {
  name: "kukulcan-fire-lab-resources",
  version: "1.0.0",
  instructions: "Library of the NASA Space Apps 'Flame in Freefall' resources (NASA) and partner-agency links (JAXA, ESA), as citable passages. Call list_resources first. Quote passages with their citation id and link. Text comes from the public pages named in each resource.",
};
