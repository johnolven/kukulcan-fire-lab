// Interface language. English is the source text: every visible string is written in
// English in the code and looked up in the Spanish dictionary when the language control
// ("ui.lang") is set to "es". A string with no entry stays in English.
// NASA data (investigation names, materials, record text) is never translated.
// Code generated with SI assistance (Claude Code).

import { controls } from "./controls";
import { ES } from "@/i18n/es";

export type Lang = "en" | "es";
export type Vars = Record<string, string | number>;

/** Current language. On the server this is always English, so MCP output is unchanged. */
export const getLang = (): Lang => (controls.get<string>("ui.lang") === "es" ? "es" : "en");

/** Translate for a given language; {name} placeholders are filled from vars. */
export function tr(lang: Lang, en: string, vars?: Vars): string {
  const text = lang === "es" ? ES[en] ?? en : en;
  return vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;
}

/** Translate with the current language. For code outside React (helpers, canvas drawing, lib text). */
export const t = (en: string, vars?: Vars) => tr(getLang(), en, vars);

const KEY = "firelab:lang";

/** Applies the saved (or ?lang=) language and keeps the page in step with the control. */
export function initLang() {
  const apply = () => {
    const lang = getLang();
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* private window: the choice is not remembered */
    }
  };
  let saved: string | null = null;
  try {
    saved = new URLSearchParams(window.location.search).get("lang") ?? localStorage.getItem(KEY);
  } catch {
    /* storage blocked */
  }
  if (saved === "en" || saved === "es") controls.set("ui.lang", saved);
  apply();
  return controls.subscribe("ui.lang", apply);
}
