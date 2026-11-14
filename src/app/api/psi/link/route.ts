// Asks NASA PSI for a temporary download link to one indexed file.
// Code generated with SI assistance (Claude Code).
import { fileLink } from "@/lib/psi";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const accession = q.get("accession") ?? "";
  const file = q.get("file") ?? "";
  if (!/^PSI-\d+$/i.test(accession) || !file) return Response.json({ error: "accession and file are required" }, { status: 400 });
  const r = await fileLink(accession, file);
  if ("error" in r) return Response.json(r, { status: 404 });
  return Response.json({ url: r.url });
}
