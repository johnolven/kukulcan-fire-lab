"use client";
// The English / Spanish switch shown on the welcome screen and in the lab header.
// Code generated with SI assistance (Claude Code).

import { useControl } from "@/lib/useControl";

export function LangSwitch({ className }: { className?: string }) {
  const [lang, setLang] = useControl<string>("ui.lang");
  const es = lang === "es";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={es}
      aria-label={es ? "Idioma: español. Cambiar a inglés" : "Language: English. Switch to Spanish"}
      title={es ? "Cambiar a inglés" : "Cambiar a español"}
      onClick={() => setLang(es ? "en" : "es")}
      className={`mono flex shrink-0 cursor-pointer items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-dim ${className ?? ""}`}
    >
      <span className={es ? "" : "text-ink"}>EN</span>
      <span className="relative h-[18px] w-[34px] rounded-full border" style={{ borderColor: "var(--line-strong)" }}>
        <span className="absolute top-[2px] h-3 w-3 rounded-full bg-accent transition-[left] duration-150" style={{ left: es ? 18 : 2 }} />
      </span>
      <span className={es ? "text-ink" : ""}>ES</span>
    </button>
  );
}
