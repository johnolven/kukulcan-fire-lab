"use client";
// A panel that sits in its slot in the layout until the user drags it by its header
// (any element marked data-drag-handle); from then on it floats where it was dropped.
// The position is remembered; double-click the header to send it back to its slot.
// Code generated with SI assistance (Claude Code).

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const KEY = "firelab:dock-position";

interface Pos {
  x: number;
  y: number;
}

export function FloatingDock({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos | null>(null); // null = docked in its slot
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const lastDown = useRef(0);

  const clamp = useCallback((p: Pos): Pos => {
    const el = ref.current;
    const w = el?.offsetWidth ?? 380;
    const h = el?.offsetHeight ?? 300;
    return { x: Math.min(Math.max(8, p.x), Math.max(8, window.innerWidth - w - 8)), y: Math.min(Math.max(8, p.y), Math.max(8, window.innerHeight - h - 8)) }; // whole panel stays on screen
  }, []);

  // Restore the saved position after mount, and keep the panel on screen when the window resizes.
  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
        if (saved && typeof saved.x === "number" && typeof saved.y === "number") setPos(clamp(saved));
      } catch {
        /* storage unavailable: stay in the default corner */
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
    const target = e.target as HTMLElement;
    if (!target.closest("[data-drag-handle]") || target.closest("button, input, a")) return;
    // Two quick presses on the header send the panel back to its corner. (Detected here
    // because pointer capture retargets the browser's own double-click event.)
    const now = e.timeStamp;
    if (now - lastDown.current < 350) {
      lastDown.current = 0;
      drag.current = null;
      setPos(null);
      try {
        window.localStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
      return;
    }
    lastDown.current = now;
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
      className={pos ? "fixed z-40 w-[min(360px,calc(100vw-24px))] touch-none" : "relative shrink-0 touch-none"}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children}
    </div>
  );
}
