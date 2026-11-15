"use client";
// Holds one panel in two places without remounting it: docked in its slot in the
// layout, or floating over the page, where it can be dragged by its header (any
// element marked data-drag-handle). The floating position is remembered.
// Code generated with SI assistance (Claude Code).

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const KEY = "firelab:dock-position";

interface Pos {
  x: number;
  y: number;
}

export function FloatingDock({ floating, children }: { floating: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos | null>(null); // null = bottom-right corner
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const clamp = useCallback((p: Pos): Pos => {
    const el = ref.current;
    const w = el?.offsetWidth ?? 360;
    const h = el?.offsetHeight ?? 300;
    return { x: Math.min(Math.max(8, p.x), Math.max(8, window.innerWidth - w - 8)), y: Math.min(Math.max(8, p.y), Math.max(8, window.innerHeight - h - 8)) }; // whole panel stays on screen
  }, []);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
        if (saved && typeof saved.x === "number" && typeof saved.y === "number") setPos(clamp(saved));
      } catch {
        /* storage unavailable: use the corner */
      }
    }, 0);
    const onResize = () => setPos((p) => (p ? clamp(p) : p));
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(restore);
      window.removeEventListener("resize", onResize);
    };
  }, [clamp]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!floating) return;
    const target = e.target as HTMLElement;
    if (!target.closest("[data-drag-handle]") || target.closest("button, input, a")) return;
    const box = ref.current!.getBoundingClientRect();
    drag.current = { dx: e.clientX - box.left, dy: e.clientY - box.top };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setPos(clamp({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy }));
  }

  function onPointerUp() {
    if (!drag.current) return;
    drag.current = null;
    setPos((p) => {
      try {
        if (p) window.localStorage.setItem(KEY, JSON.stringify(p));
      } catch {
        /* ignore */
      }
      return p;
    });
  }

  return (
    <div
      ref={ref}
      className={floating ? "fixed z-40 w-[min(360px,calc(100vw-24px))] touch-none" : "min-h-0 min-w-0"}
      style={floating ? (pos ? { left: pos.x, top: pos.y } : { right: 12, bottom: 12 }) : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children}
    </div>
  );
}
