// Kukulcan Fire Lab: single-page lab table.
// Code generated with SI assistance (Claude Code).
import filesJson from "@/data/files.json";
import { Lab } from "@/components/Lab";
import type { FileEntry } from "@/lib/types";

export default function Page() {
  return <Lab files={filesJson as unknown as Record<string, FileEntry[]>} />;
}
