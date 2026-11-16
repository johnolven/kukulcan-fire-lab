// Light and dark mode. The choice lives in the control registry ("ui.theme"), so the
// switch, the voice and the chat all change it the same way; this module applies it
// to the page and remembers it.
// Code generated with SI assistance (Claude Code).

import { controls } from "./controls";

const KEY = "firelab:theme";

/** True when the page is in light mode. Cheap enough to call from a draw loop. */
export const isLight = () => typeof document !== "undefined" && document.documentElement.dataset.theme === "light";

/** Applies the saved (or ?theme=) choice and keeps the page in step with the control. */
export function initTheme() {
  const apply = () => {
    const theme = controls.get<string>("ui.theme");
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* private window: the choice simply is not remembered */
    }
  };
  let saved: string | null = null;
  try {
    saved = new URLSearchParams(window.location.search).get("theme") ?? localStorage.getItem(KEY);
  } catch {
    /* storage blocked */
  }
  if (saved === "light" || saved === "dark") controls.set("ui.theme", saved);
  apply();
  return controls.subscribe("ui.theme", apply);
}

type RGB = [number, number, number];
// The voice visual is drawn on a canvas: pale strokes for the dark field, deep ones for the light field.
const VOICE_LIGHT: Record<string, RGB> = {
  idle: [84, 112, 134],
  connecting: [60, 95, 125],
  listening: [30, 62, 88],
  hearing: [13, 27, 40],
  querying: [168, 100, 0],
  speaking: [8, 114, 140],
};
export const voiceRgb = (state: string, dark: RGB): RGB => (isLight() ? VOICE_LIGHT[state] ?? dark : dark);
/** Faint instrument lines (graticules, frames) at the given strength. */
export const hairline = (alpha: number) => (isLight() ? `rgba(15,40,65,${alpha})` : `rgba(190,225,255,${alpha})`);
/** State color for labels in markup: follows the theme through the style variables. */
export const VOICE_CSS: Record<string, string> = {
  idle: "var(--ink-dim)",
  connecting: "var(--ink-dim)",
  listening: "var(--ink)",
  hearing: "var(--mark)",
  querying: "var(--warn)",
  speaking: "var(--accent)",
};
