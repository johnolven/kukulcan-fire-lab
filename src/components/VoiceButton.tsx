"use client";
// One-tap voice control, used where the full voice console is out of reach on a phone:
// the bar pinned to the bottom of the welcome screen and the bar pinned to the top of the lab.
// Code generated with SI assistance (Claude Code).

import { useSyncExternalStore } from "react";
import { requestVoiceToggle, serverVoiceSnapshot, voiceStore } from "@/lib/voiceStore";
import { useT } from "@/lib/useControl";

function Mic() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
      <rect x={9} y={3} width={6} height={11} rx={3} />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </svg>
  );
}

/** size "lg": full-width primary button. size "sm": compact button for a top bar. */
export function VoiceButton({ size = "lg", className }: { size?: "lg" | "sm"; className?: string }) {
  const voice = useSyncExternalStore(voiceStore.subscribe, voiceStore.get, serverVoiceSnapshot);
  const t = useT();
  const busy = voice.state === "connecting";
  const label = voice.live ? (size === "sm" ? t("End") : t("End call")) : busy ? t("Connecting…") : size === "sm" ? t("Talk") : t("Talk to the lab");
  return (
    <button
      type="button"
      onClick={requestVoiceToggle}
      disabled={!voice.available || busy}
      aria-pressed={voice.live}
      title={voice.available ? t("Talk to the lab") : t("Live voice needs a Vapi key")}
      className={`mono flex items-center justify-center gap-2 border font-medium uppercase tracking-[0.12em] transition-colors disabled:opacity-50 ${size === "lg" ? "min-h-[52px] w-full px-5 text-[13px]" : "min-h-[40px] px-3 text-[11px]"} ${className ?? ""}`}
      style={voice.live ? { background: "var(--danger)", borderColor: "var(--danger)", color: "#fff" } : { background: "var(--accent)", borderColor: "var(--accent)", color: "var(--bg)" }}
    >
      <Mic />
      {label}
    </button>
  );
}
