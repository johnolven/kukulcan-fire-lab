"use client";
// Welcome screen shown when the lab loads: the voice visual, a greeting and five
// ways to start. Choosing one, by click or by voice, opens the lab on that view.
// Code generated with SI assistance (Claude Code).

import { ThemeSwitch } from "./ThemeSwitch";
import { LangSwitch } from "./LangSwitch";
import { VoiceButton } from "./VoiceButton";
import { useSyncExternalStore } from "react";
import { useT } from "@/lib/useControl";
import { requestVoiceToggle, serverVoiceSnapshot, voiceStore } from "@/lib/voiceStore";
import { EnvironmentDrawing } from "./Diagrams";
import { VoiceOrb, voiceLook } from "./VoiceStage";

export type StartId = "spacecraft" | "materials" | "capsule" | "station" | "lab";

const STARTS: { id: StartId; title: string; text: string; drawing?: string }[] = [
  { id: "spacecraft", title: "Spacecraft design", text: "Pick a cabin atmosphere and see what evidence stands behind it.", drawing: "spacecraft" },
  { id: "materials", title: "Materials", text: "What NASA burned or overheated, and at what oxygen level." },
  { id: "capsule", title: "Capsule", text: "The crew capsule on the table, with its tests and gaps.", drawing: "capsule" },
  { id: "station", title: "Station", text: "The space station, where most of the tests were run.", drawing: "station" },
  { id: "lab", title: "Fire laboratory", text: "A live cabin with flame and smoke, and the fire models." },
];

function Glyph({ id }: { id: StartId }) {
  // small line marks for the two starting points that are not an environment
  if (id === "materials")
    return (
      <svg viewBox="0 0 64 44" className="h-[44px] w-full" aria-hidden fill="none" stroke="currentColor" strokeWidth={1.2}>
        <rect x={8} y={8} width={16} height={28} /><rect x={28} y={14} width={14} height={22} /><circle cx={52} cy={26} r={8} />
        <path d="M8 16h16M8 24h16M28 22h14" opacity={0.5} />
      </svg>
    );
  return (
    <svg viewBox="0 0 64 44" className="h-[44px] w-full" aria-hidden fill="none" stroke="currentColor" strokeWidth={1.2}>
      <rect x={6} y={8} width={52} height={28} rx={12} />
      <circle cx={24} cy={24} r={6} /><circle cx={24} cy={24} r={2.2} fill="currentColor" stroke="none" />
      <path d="M40 16v16M46 20v8" opacity={0.5} />
    </svg>
  );
}

export function IntroScreen({ onChoose, onSkip }: { onChoose: (id: StartId) => void; onSkip: () => void }) {
  const voice = useSyncExternalStore(voiceStore.subscribe, voiceStore.get, serverVoiceSnapshot);
  const look = voiceLook(voice.state);
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-auto px-4 pb-[92px] pt-4 sm:py-5" style={{ background: "color-mix(in srgb, var(--bg) 97%, transparent)" }} role="dialog" aria-modal="true" aria-label={t("Welcome to the Kukulcan Fire Lab")}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/kukulcan.svg" alt="Kukulcan Space" className="logo h-9 w-auto shrink-0" />
        <div className="min-w-0">
          <div className="label hidden !text-[9px] sm:block">NASA Space Apps 2026 · Flame in Freefall</div>
          <div className="text-[22px] font-light leading-none tracking-tight">Kukulcan <span className="text-accent">Fire Lab</span></div>
        </div>
        {/* on a phone the switches and the way in take their own row */}
        <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 sm:ml-auto sm:w-auto sm:gap-4">
          <LangSwitch />
          <ThemeSwitch />
          <button className="btn ml-auto whitespace-nowrap !px-2.5 sm:ml-0 sm:!px-3" onClick={onSkip}>{t("Skip to the lab")}</button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col items-center justify-center">
        <VoiceOrb className="h-[min(26vh,220px)] w-full max-w-[560px] sm:h-[min(40vh,360px)]" />
        <div className="mono mt-1 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.2em]" style={{ color: look.css }} role="status">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: look.css, boxShadow: `0 0 8px ${look.css}` }} />
          {look.label}
        </div>

        <h1 className="mt-3 max-w-[760px] text-center text-[clamp(22px,3.2vw,34px)] font-light leading-tight" style={{ textWrap: "balance" }}>
          {t("Fire behaves differently in space. Where would you like to start?")}
        </h1>
        <p className="mt-2 min-h-[22px] max-w-[720px] text-center text-[14px] leading-snug text-dim">
          {voice.lab || t("Choose a starting point, or talk to the lab and say it.")}
        </p>

        <div className="mt-5 grid w-full grid-cols-2 gap-2 sm:[grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          {STARTS.map((s, i) => (
            <button key={s.id} onClick={() => onChoose(s.id)} className={`panel group px-3 pb-3 pt-2 text-left transition-colors hover:border-accent ${i === STARTS.length - 1 && STARTS.length % 2 ? "col-span-2 sm:col-span-1" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="mono text-[10px] text-faint">0{i + 1}</span>
                <span className="mono text-[10px] text-faint transition-colors group-hover:text-accent">{t("OPEN →")}</span>
              </div>
              <div className="text-dim transition-colors group-hover:text-accent">
                {s.drawing ? <EnvironmentDrawing id={s.drawing} notes={false} className="h-[44px] w-full" /> : <Glyph id={s.id} />}
              </div>
              <div className="mt-1 text-[15px] font-medium">{t(s.title)}</div>
              <div className="mt-0.5 text-[12px] leading-snug text-dim">{t(s.text)}</div>
            </button>
          ))}
        </div>

        <div className="mt-5 hidden flex-wrap items-center justify-center gap-2 sm:flex">
          <button className={`btn flex items-center gap-2 !px-5 !py-2 ${voice.live ? "on" : ""}`} onClick={requestVoiceToggle} disabled={!voice.available || voice.state === "connecting"} title={voice.available ? t("Talk to the lab") : t("Live voice needs a Vapi key")}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: voice.live ? "var(--danger)" : "var(--accent)" }} />
            {voice.live ? t("End call") : voice.state === "connecting" ? t("Connecting…") : t("Talk to the lab")}
          </button>
          <span className="mono border border-line px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-dim">{t("SI-generated voice")}</span>
        </div>
        {voice.you && <p className="mt-2 max-w-[720px] truncate text-[12.5px] text-accent"><span className="mono mr-2 text-[9.5px] uppercase tracking-widest text-faint">{t("you")}</span>{voice.you}</p>}
      </div>

      {/* phone: the voice button stays pinned at the bottom, always within reach of the thumb */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:hidden" style={{ background: "var(--surface)" }}>
        <VoiceButton />
        <div className="mono mt-1.5 text-center text-[9px] uppercase tracking-widest text-faint">{t("SI-generated voice")}</div>
      </div>

      <p className="mt-3 text-center text-[10.5px] text-faint">{t("Data: NASA Physical Sciences Informatics · The lab reports what was tested and never certifies a design as safe · Not affiliated with or endorsed by NASA")}</p>
    </div>
  );
}
