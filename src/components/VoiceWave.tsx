"use client";
// Voice presence: a drafting-table oscilloscope that shows what the lab voice
// is doing. During a call the wave follows the real audio level from Vapi.
// Code generated with SI assistance (Claude Code).

import { useEffect, useRef } from "react";

export type VoiceState = "idle" | "connecting" | "listening" | "hearing" | "querying" | "speaking";

const LOOK: Record<VoiceState, { color: string; base: number; speed: number; label: string }> = {
  idle: { color: "rgba(190,225,255,0.35)", base: 0.02, speed: 0.4, label: "Standing by" },
  connecting: { color: "rgba(190,225,255,0.6)", base: 0.08, speed: 2.2, label: "Connecting" },
  listening: { color: "rgba(233,244,255,0.75)", base: 0.06, speed: 0.8, label: "Listening" },
  hearing: { color: "#ffffff", base: 0.34, speed: 1.6, label: "Hearing you" },
  querying: { color: "#ffb54a", base: 0.16, speed: 3.4, label: "Reading NASA records" },
  speaking: { color: "#7fe7ff", base: 0.22, speed: 1.9, label: "Lab speaking" },
};

export function VoiceWave({ state, level }: { state: VoiceState; level: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ state, level });

  useEffect(() => {
    live.current = { state, level };
  }, [state, level]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let amp = 0.02;
    let t = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { state: s, level: lv } = live.current;
      const look = LOOK[s];
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Speaking follows the real output level; other states use a fixed amplitude.
      const target = s === "speaking" ? look.base + Math.min(1, lv) * 0.7 : look.base;
      amp += (target - amp) * Math.min(1, dt * 9);
      t += dt * look.speed;

      // centre line and ticks, like a scope graticule
      ctx.strokeStyle = "rgba(190,225,255,0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      for (let x = 0; x <= w; x += w / 12) {
        ctx.moveTo(x, h / 2 - 3);
        ctx.lineTo(x, h / 2 + 3);
      }
      ctx.stroke();

      const layers = [
        { k: 1.0, f: 1.0, a: 1.0, alpha: 1, width: 1.6 },
        { k: 1.9, f: -1.35, a: 0.62, alpha: 0.5, width: 1 },
        { k: 3.1, f: 1.8, a: 0.36, alpha: 0.3, width: 1 },
      ];
      for (const L of layers) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const u = x / w;
          const envelope = Math.sin(Math.PI * u) ** 1.6; // pinned at both ends
          const y = h / 2 + Math.sin(u * Math.PI * 2 * 2.2 * L.k + t * 2 * L.f) * Math.sin(u * 5 * L.k - t * L.f) * envelope * amp * L.a * (h / 2 - 4) * 1.6;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = look.color;
        ctx.globalAlpha = L.alpha;
        ctx.lineWidth = L.width;
        ctx.shadowColor = look.color;
        ctx.shadowBlur = L.alpha === 1 && s !== "idle" ? 8 : 0;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      if (!still) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    // With reduced motion the frame is static, so repaint when the state changes.
    const repaint = still ? window.setInterval(() => requestAnimationFrame(draw), 400) : 0;
    return () => {
      cancelAnimationFrame(raf);
      if (repaint) window.clearInterval(repaint);
    };
  }, []);

  const look = LOOK[state];
  return (
    <div className="relative mt-2 border border-line bg-black/30">
      <canvas ref={canvasRef} className="block h-[72px] w-full" aria-hidden />
      <div className="pointer-events-none absolute inset-x-2 top-1 flex items-center justify-between">
        <span className="mono flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.16em]" style={{ color: state === "idle" ? "var(--ink-faint)" : look.color }} role="status">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: state === "idle" ? "var(--ink-faint)" : look.color, boxShadow: state === "idle" ? undefined : `0 0 6px ${look.color}` }} />
          {look.label}
        </span>
        <span className="mono text-[9px] uppercase tracking-[0.16em] text-faint">Kukulcan · voice</span>
      </div>
    </div>
  );
}
