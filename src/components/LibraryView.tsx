"use client";
// Library and orchestrator: ask one question and the orchestrator decides which
// servers to consult (test records, fire models, simulator, NASA and partner
// resources), then answers with citations. Below it, the resource library itself.
// Code generated with SI assistance (Claude Code).

import { useEffect, useMemo, useRef, useState } from "react";
import { signal, type LinkId } from "@/lib/activity";
import type { OrchestratedAnswer } from "@/lib/orchestrator";
import { LIBRARY, libraryStats, searchLibrary, type Resource } from "@/lib/resources";
import { useT } from "@/lib/useControl";

const ASK_EVENT = "firelab:ask";
/** Send a question to the orchestrator from anywhere (timeline, voice). */
export function requestAsk(question: string) {
  window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: question }));
}
const WATCH_EVENT = "firelab:watch";
/** Open the NASA ScienceCasts video inside the library. */
export function requestWatch() {
  window.dispatchEvent(new Event(WATCH_EVENT));
}

// The video the challenge lists, embedded from YouTube's privacy-enhanced domain.
const YOUTUBE: Record<string, string> = { sciencecast: "W1oXykoz9zg" };

const EXAMPLES = [
  "What did Apollo 1 teach us about oxygen-rich cabins, and what does the test evidence say for this design?",
  "How did the Mir crew fight the 1997 fire, and what do FLEX tests say about extinguishing in microgravity?",
  "Which NASA fire technology reached firefighters on Earth?",
  "What is JAXA's FLARE experiment and how does it relate to the gap in solid-material tests?",
];

// Answers cite library passages as [resource-id#n]; turn those into links.
function Cited({ text }: { text: string }) {
  const parts = text.split(/(\[[a-z0-9-]+#\d+\])/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\[([a-z0-9-]+)#(\d+)\]$/);
        const r = m && LIBRARY.find((x) => x.id === m[1]);
        return r ? (
          <a key={i} className="mono text-[11px] text-accent underline decoration-mark/25 underline-offset-2" href={r.url} target="_blank" rel="noreferrer" title={r.passages[+m![2] - 1]?.text.slice(0, 400)}>{p}</a>
        ) : (
          <span key={i}>{p}</span>
        );
      })}
    </>
  );
}

function ResourceCard({ r, open, onToggle, watching, onWatch }: { r: Resource; open: boolean; onToggle: () => void; watching: boolean; onWatch: () => void }) {
  const video = YOUTUBE[r.id];
  const t = useT();
  return (
    <article className={`border border-line p-3 ${watching ? "col-span-full" : ""}`} id={`resource-${r.id}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0">
          <div className="label">{r.agency} · {t(r.kind)}{r.passages.length ? ` · ${t("{n} passages", { n: r.passages.length })}` : ` · ${t("link")}`}</div>
          <h3 className="text-[13.5px] font-medium leading-snug">{r.title}</h3>
        </div>
        <a className="btn ml-auto shrink-0 !px-1.5 !py-0.5 !text-[9.5px]" href={r.url} target="_blank" rel="noreferrer">{t("Open ↗")}</a>
      </div>
      <p className="mt-1 text-[12px] leading-snug text-dim">{r.summary}</p>
      {video && (
        <button className="mono mt-1.5 text-[10.5px] text-accent underline underline-offset-2" onClick={onWatch}>{watching ? t("Close the video") : t("Watch here")}</button>
      )}
      {video && watching && (
        <div className="mx-auto mt-2 aspect-video w-full max-w-[860px] border border-line bg-black">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${video}?rel=0`}
            title={r.title}
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      )}
      {r.passages.length > 0 && (
        <button className="mono mt-1.5 text-[10.5px] text-accent underline underline-offset-2" onClick={onToggle}>{open ? t("Hide passages") : t("Read passages")}</button>
      )}
      {open && (
        <div className="scroll mt-2 max-h-[240px] space-y-2 border-t border-line pt-2 text-[12px] leading-relaxed">
          {r.passages.map((p) => (
            <p key={p.id}><span className="mono mr-1.5 text-[10px] text-faint">{p.id}{p.section ? ` · ${p.section}` : ""}{p.page ? ` · ${t("p.{n}", { n: p.page })}` : ""}</span>{p.text}</p>
          ))}
        </div>
      )}
    </article>
  );
}

export function LibraryView({ o2, psi }: { o2: number; psi: number }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<OrchestratedAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [find, setFind] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const t = useT();
  const stats = useMemo(() => libraryStats(), []);
  const hits = useMemo(() => (find.trim().length > 2 ? searchLibrary(find, { limit: 8 }) : []), [find]);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setError(null);
    signal("table-orch", "orch-claude");
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, o2_pct: o2, pressure_psi: psi }) });
      const j = (await r.json()) as OrchestratedAnswer & { error?: string };
      if (!j.answer) throw new Error(j.error ?? "No answer");
      setAnswer(j);
      const links = new Set<LinkId>();
      for (const s of j.trace) links.add(s.server === "records" ? "orch-research" : "orch-resources");
      if (j.trace.some((s) => s.server === "records")) links.add("research-core");
      signal(...links);
    } catch {
      setError(t("The orchestrator could not answer. Try again in a moment."));
    } finally {
      setBusy(false);
    }
  }

  // questions sent from the timeline or the voice, and requests to watch the video
  const askRef = useRef(ask);
  useEffect(() => {
    askRef.current = ask;
  });
  useEffect(() => {
    const onAsk = (e: Event) => {
      const question = (e as CustomEvent<string>).detail;
      if (question) {
        setQ(question);
        askRef.current(question);
      }
    };
    const onWatch = () => {
      setWatching(true);
      window.setTimeout(() => document.getElementById("resource-sciencecast")?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    };
    window.addEventListener(ASK_EVENT, onAsk);
    window.addEventListener(WATCH_EVENT, onWatch);
    return () => {
      window.removeEventListener(ASK_EVENT, onAsk);
      window.removeEventListener(WATCH_EVENT, onWatch);
    };
  }, []);

  return (
    <div className="@container">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-[16px] font-medium">{t("Ask across every source")}</h2>
        <span className="text-[12.5px] text-dim">{t("The orchestrator chooses which servers to consult, test records, fire models, the simulator, and the NASA and partner library, and cites what it used.")}</span>
      </div>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <input className="field min-w-[260px] flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Ask about this cabin ({o2}% oxygen, {psi} psi), an incident, a material, a technology", { o2, psi })} aria-label={t("Question for the orchestrator")} />
        <button className="btn" type="submit" disabled={busy || !q.trim()}>{busy ? t("Consulting the servers…") : t("Ask the lab")}</button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1">
        {EXAMPLES.map((key) => {
          // The orchestrator answers in the language of the question, so the example is sent as shown.
          const e = t(key);
          return <button key={key} className="mono border border-line px-1.5 py-0.5 text-left text-[10px] text-dim transition-colors hover:border-accent hover:text-accent" onClick={() => { setQ(e); ask(e); }} disabled={busy}>{e.length > 62 ? `${e.slice(0, 60)}…` : e}</button>;
        })}
      </div>
      {error && <p className="mt-2 text-[12.5px] text-warn">{error}</p>}

      {answer && (
        <div className="mt-3 border-l-2 border-accent pl-3">
          <div className="label text-accent">{t("Answer")}</div>
          <div className="space-y-2 text-[13.5px] leading-relaxed">
            {answer.answer.split(/\n\s*\n/).map((para, i) => <p key={i}><Cited text={para} /></p>)}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="label">{t("Servers consulted")}</span>
            {answer.trace.map((s, i) => (
              <span key={i} className="mono border px-1.5 py-0.5 text-[10px]" style={{ borderColor: s.ok ? "var(--line-strong)" : "var(--danger)", color: s.server === "records" ? "var(--accent)" : "var(--warn)" }} title={JSON.stringify(s.input)}>
                {s.server} · {s.tool} · {s.ms} ms
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-dim">
            <span className="mono mr-2 border border-line px-1.5 py-0.5 text-[9px] uppercase tracking-widest">{answer.mode === "language-model" ? t("SI-generated text") : t("No SI text")}</span>
            {answer.disclosure}
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-baseline gap-x-3 border-t border-line pt-3">
        <h2 className="text-[16px] font-medium">{t("Resource library")}</h2>
        <span className="text-[12.5px] text-dim">{t("{listed} resources from the challenge's list and {partner} from partner agencies, {passages} citable passages.", { listed: stats.on_challenge_tab, partner: stats.partner_agency, passages: stats.passages })}</span>
        <input className="field ml-auto w-56" value={find} onChange={(e) => setFind(e.target.value)} placeholder={t("Search the passages")} aria-label={t("Search the library")} />
      </div>

      {hits.length > 0 && (
        <div className="mt-2 space-y-2 border border-line p-3 text-[12px] leading-relaxed">
          {hits.map((h) => (
            <p key={h.passage.id}><a className="mono mr-1.5 text-[10px] text-accent underline underline-offset-2" href={h.resource.url} target="_blank" rel="noreferrer">{h.passage.id}</a><span className="text-dim">{h.resource.title}{h.passage.section ? ` · ${h.passage.section}` : ""}. </span>{h.passage.text.length > 420 ? `${h.passage.text.slice(0, 420)}…` : h.passage.text}</p>
          ))}
        </div>
      )}

      {[true, false].map((listed) => (
        <div key={String(listed)} className="mt-3">
          <div className="label mb-1.5">{listed ? t("On the challenge's Resources tab (NASA)") : t("Partner agencies and international teams (not on the challenge's list)")}</div>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 330px), 1fr))" }}>
            {LIBRARY.filter((r) => r.listed === listed).map((r) => <ResourceCard key={r.id} r={r} open={open === r.id} onToggle={() => setOpen(open === r.id ? null : r.id)} watching={watching && r.id === "sciencecast"} onWatch={() => setWatching(!watching)} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
