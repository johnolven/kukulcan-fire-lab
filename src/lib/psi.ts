// Live access to NASA's Physical Sciences Informatics (PSI) repository.
// Files are never copied: PSI issues a short-lived download link per file.
// Code generated with SI assistance (Claude Code).

import filesJson from "@/data/files.json";
import type { FileEntry } from "./types";

const FILES = filesJson as unknown as Record<string, FileEntry[]>;
const BASE = "https://psi.nasa.gov/geode-py/ws";

export function listFiles(accession: string, kind?: string, search?: string, limit = 40): FileEntry[] {
  const all = FILES[accession.toUpperCase()] ?? [];
  const k = kind?.toLowerCase();
  const s = search?.toLowerCase();
  return all
    .filter((f) => (!k || (k === "video" ? f.k === "video" : k === "document" ? f.k !== "video" : f.k.toLowerCase().includes(k))) && (!s || f.n.toLowerCase().includes(s) || f.c.toLowerCase().includes(s)))
    .slice(0, limit);
}

export function fileCounts(accession: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of FILES[accession.toUpperCase()] ?? []) out[f.k] = (out[f.k] ?? 0) + 1;
  return out;
}

export async function fileLink(accession: string, fileName: string): Promise<{ url: string; file: FileEntry } | { error: string }> {
  const acc = accession.toUpperCase();
  const file = (FILES[acc] ?? []).find((f) => f.n === fileName);
  if (!file) return { error: `File not in the index for ${acc}. Use list_files to get exact names.` };
  const q = new URLSearchParams({ file: file.n, version: String(file.v), redirect: "false" }).toString().replace(/\+/g, "%20");
  const res = await fetch(`${BASE}/studies/${acc}/download?${q}`, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
  const text = (await res.text()).trim();
  if (!res.ok || !text.startsWith("https://")) return { error: `PSI did not return a link (HTTP ${res.status}).` };
  return { url: text, file };
}

export function prettyBytes(b: number): string {
  if (b >= 1e12) return `${(b / 1e12).toFixed(1)} TB`;
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(b / 1e3))} KB`;
}
