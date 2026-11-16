"use client";
// The dark / light switch shown on the welcome screen and in the lab header.
// Code generated with SI assistance (Claude Code).

import { useControl, useT } from "@/lib/useControl";

export function ThemeSwitch({ className }: { className?: string }) {
  const [theme, setTheme] = useControl<string>("ui.theme");
  const light = theme === "light";
  const t = useT();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={light}
      aria-label={t("Light mode")}
      title={light ? t("Switch to dark mode") : t("Switch to light mode")}
      onClick={() => setTheme(light ? "dark" : "light")}
      className={`mono flex shrink-0 cursor-pointer items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-dim ${className ?? ""}`}
    >
      <span className={light ? "" : "text-ink"}>{t("Dark")}</span>
      <span className="relative h-[18px] w-[34px] rounded-full border" style={{ borderColor: "var(--line-strong)" }}>
        <span className="absolute top-[2px] h-3 w-3 rounded-full bg-accent transition-[left] duration-150" style={{ left: light ? 18 : 2 }} />
      </span>
      <span className={light ? "text-ink" : ""}>{t("Light")}</span>
    </button>
  );
}
