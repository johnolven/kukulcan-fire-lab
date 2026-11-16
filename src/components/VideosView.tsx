"use client";
// Test videos: footage recorded during the experiments, streamed from NASA's PSI
// repository on request. Nothing is copied; PSI issues a temporary link per file.
// Code generated with SI assistance (Claude Code).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signal } from "@/lib/activity";
import { COMBUSTION, TESTS, describeTest, getInvestigation, label } from "@/lib/lab";
import type { FileEntry, TestRecord } from "@/lib/types";
import { useT } from "@/lib/useControl";
import { bytes } from "./Panels";

const EVENT = "firelab:video";
export function requestVideo(investigation: string, search?: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { investigation, search: search ?? "" } }));
}

const playable = (f: FileEntry) => f.k === "video" && /\.mp4$/i.test(f.n);

/** Link a file to a harmonized test record when the file name carries that test's id. */
function matchTest(acc: string, name: string): TestRecord | undefined {
  const n = name.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return TESTS.filter((t) => t.accession === acc && t.test_id && t.test_id.length >= 2)
    .sort((a, b) => (b.test_id?.length ?? 0) - (a.test_id?.length ?? 0))
    .find((t) => new RegExp(`(^|_)(TEST_)?${t.test_id!.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}(_|$)`).test(n));
}

export function VideosView({ files }: { files: Record<string, FileEntry[]> }) {
  const withVideo = useMemo(() => COMBUSTION.filter((i) => (files[i.accession] ?? []).some(playable)), [files]);
  const [acc, setAcc] = useState(() => (withVideo.find((i) => i.accession === "PSI-25") ?? withVideo[0])?.accession ?? "");
  const [find, setFind] = useState("");
  const [current, setCurrent] = useState<FileEntry | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const videoRef = useRef<HTMLVideoElement>(null);
  const t = useT();

  const inv = getInvestigation(acc);
  const list = useMemo(() => {
    const q = find.toLowerCase().trim();
    return (files[acc] ?? []).filter(playable).filter((f) => !q || f.n.toLowerCase().includes(q));
  }, [files, acc, find]);

  const play = useCallback(async (a: string, f: FileEntry) => {
    setCurrent(f);
    setSrc(null);
    setState("loading");
    signal("table-psi");
    try {
      const r = await fetch(`/api/psi/link?accession=${a}&file=${encodeURIComponent(f.n)}`);
      const j = await r.json();
      if (!j.url) throw new Error("no link");
      setSrc(j.url);
      setState("idle");
    } catch {
      setState("error");
    }
  }, []);

  // requests from the voice assistant or the command box
  useEffect(() => {
    const listener = (e: Event) => {
      const { investigation, search } = (e as CustomEvent<{ investigation: string; search: string }>).detail;
      const target = getInvestigation(investigation);
      const a = target && (files[target.accession] ?? []).some(playable) ? target.accession : acc;
      setAcc(a);
      setFind(search);
      const q = search.toLowerCase();
      const first = (files[a] ?? []).filter(playable).find((f) => !q || f.n.toLowerCase().includes(q)) ?? (files[a] ?? []).find(playable);
      if (first) play(a, first);
    };
    window.addEventListener(EVENT, listener);
    return () => window.removeEventListener(EVENT, listener);
  }, [files, acc, play]);

  const matched = current ? matchTest(acc, current.n) : undefined;
  const short = (n: string) => n.replace(`${acc}_`, "").replace(/^Raw Data_/, "");

  return (
    <div className="@container">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-[16px] font-medium">{t("Test videos from NASA")}</h2>
        <span className="text-[12.5px] text-dim">{t("Footage recorded during the experiments, streamed from NASA's repository when you press play. Nothing is stored here.")}</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {withVideo.map((i) => (
          <button key={i.accession} className="btn !px-2 !py-1" aria-pressed={acc === i.accession} onClick={() => { setAcc(i.accession); setFind(""); }}>
            {label(i)} <span className="text-faint">{(files[i.accession] ?? []).filter(playable).length}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 @[820px]:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]">
        <div className="min-w-0">
          <div className="relative aspect-video w-full border border-line bg-black">
            {src ? (
              <video ref={videoRef} key={src} src={src} controls autoPlay playsInline className="h-full w-full" onError={() => setState("error")} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[13px] text-dim">
                {state === "loading" ? t("Asking NASA PSI for the video…") : state === "error" ? t("NASA PSI did not serve this file. Try another, or open the investigation in PSI.") : t("Pick a video on the right.")}
              </div>
            )}
          </div>
          {current && (
            <div className="mt-2 text-[12.5px] leading-snug">
              <div className="mono break-all text-[11.5px]">{short(current.n)} · {bytes(current.b)}</div>
              {matched ? (
                <p className="mt-1 border-l-2 border-accent pl-2"><span className="label mr-1.5">{t("Test record")}</span>{describeTest(matched)}{matched.notes ? ` · ${matched.notes}` : ""}</p>
              ) : (
                <p className="mt-1 text-dim">{t("No harmonized test record could be matched to this file name.")} {inv?.focus}</p>
              )}
              {state === "error" && src && <p className="mt-1 text-warn">{t("This browser could not play the file.")} <a className="underline" href={src} target="_blank" rel="noreferrer">{t("Open it directly")}</a>.</p>}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <input className="field min-w-0 flex-1" value={find} onChange={(e) => setFind(e.target.value)} placeholder={t("Filter by name, sample or test")} aria-label={t("Filter videos")} />
            <span className="label whitespace-nowrap">{t("{n} videos", { n: list.length })}</span>
          </div>
          <div className="scroll max-h-[46vh]">
            <table className="data">
              <tbody>
                {list.slice(0, 150).map((f) => (
                  <tr key={f.n} className="cursor-pointer" onClick={() => play(acc, f)} style={current?.n === f.n ? { background: "color-mix(in srgb, var(--accent) 9%, transparent)" } : undefined}>
                    <td className="max-w-0 w-full truncate" title={f.n}>{short(f.n)}</td>
                    <td className="num whitespace-nowrap">{bytes(f.b)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {inv && <a className="mono mt-2 inline-block text-[10.5px] text-accent underline underline-offset-2" href={inv.url} target="_blank" rel="noreferrer">{t("All files of {name} in NASA PSI ↗", { name: label(inv) })}</a>}
        </div>
      </div>
    </div>
  );
}
