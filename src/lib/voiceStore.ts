// Shared voice state: the voice console publishes what the lab voice is doing and
// any other component (the large stage visualizer) can follow it.
// Code generated with SI assistance (Claude Code).

import type { VoiceState } from "@/components/VoiceWave";

export interface VoiceSnapshot {
  state: VoiceState;
  level: number; // 0..1, real output level during a call
  live: boolean; // a voice call is in progress
  available: boolean; // a Vapi key is configured
  you: string; // last thing the user said or typed
  lab: string; // last thing the lab said
}

let snapshot: VoiceSnapshot = { state: "idle", level: 0, live: false, available: false, you: "", lab: "" };
const listeners = new Set<() => void>();

export const voiceStore = {
  get: () => snapshot,
  set(patch: Partial<VoiceSnapshot>) {
    const next = { ...snapshot, ...patch };
    if ((Object.keys(next) as (keyof VoiceSnapshot)[]).every((k) => next[k] === snapshot[k])) return;
    snapshot = next;
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

const SERVER: VoiceSnapshot = { state: "idle", level: 0, live: false, available: false, you: "", lab: "" };
export const serverVoiceSnapshot = () => SERVER;

const TOGGLE = "firelab:voice-toggle";
export const requestVoiceToggle = () => window.dispatchEvent(new Event(TOGGLE));
export function onVoiceToggle(handler: () => void) {
  window.addEventListener(TOGGLE, handler);
  return () => window.removeEventListener(TOGGLE, handler);
}
