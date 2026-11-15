"use client";
// The lab voice at full size: a radial instrument that follows what the voice is
// doing. During a call the motion follows the real output level reported by the
// voice service; the ring of bars is a stylized rendering of that single level,
// not a frequency analysis.
// Code generated with SI assistance (Claude Code).

import { useEffect, useRef, useSyncExternalStore } from "react";
import { requestVoiceToggle, serverVoiceSnapshot, voiceStore } from "@/lib/voiceStore";
import type { VoiceState } from "./VoiceWave";

const LOOK: Record<VoiceState, { rgb: [number, number, number]; base: number; speed: number; label: string; hint: string }> = {
  idle: { rgb: [150, 190, 220], base: 0.05, speed: 0.25, label: "Standing by", hint: "Press talk, or type a command in the voice console." },
  connecting: { rgb: [190, 225, 255], base: 0.14, speed: 1.6, label: "Connecting", hint: "Opening the voice channel." },
  listening: { rgb: [233, 244, 255], base: 0.1, speed: 0.6, label: "Listening", hint: "Ask for an environment, the fire, a material, a chart." },
  hearing: { rgb: [255, 255, 255], base: 0.5, speed: 1.4, label: "Hearing you", hint: "" },
  querying: { rgb: [255, 181, 74], base: 0.3, speed: 2.6, label: "Reading NASA records", hint: "The request is travelling to the lab's data tools." },
  speaking: { rgb: [127, 231, 255], base: 0.34, speed: 1.7, label: "Lab speaking", hint: "" },
};

export function VoiceStage() {
  const voice = useSyncExternalStore(voiceStore.subscribe, voiceStore.get, serverVoiceSnapshot);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const BARS = 96;
    const bars = new Float32Array(BARS);
    let amp = 0.05;
    let t = 0;
    let last = performance.now();
    let raf = 0;
    const color: [number, number, number] = [150, 190, 220];

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { state, level } = voiceStore.get();
      const look = LOOK[state];
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const target = state === "speaking" ? look.base + Math.min(1, level) * 0.66 : look.base;
      amp += (target - amp) * Math.min(1, dt * 8);
      t += dt * look.speed;
      for (let i = 0; i < 3; i++) color[i] += (look.rgb[i] - color[i]) * Math.min(1, dt * 6);
      const rgb = `${color[0] | 0},${color[1] | 0},${color[2] | 0}`;

      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.168; // core radius, sized so the outer ring stays inside the canvas
      const reach = Math.min(w, h) * 0.2; // how far bars can extend

      // graticule: range rings and cross hairs
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(190,225,255,0.10)";
      for (const k of [1.0, 1.55, 2.1, 2.65]) {
        ctx.beginPath();
        ctx.arc(cx, cy, R * k, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx - R * 2.9, cy);
      ctx.lineTo(cx + R * 2.9, cy);
      ctx.moveTo(cx, cy - R * 2.9);
      ctx.lineTo(cx, cy + R * 2.9);
      ctx.stroke();
      // degree ticks
      ctx.strokeStyle = "rgba(190,225,255,0.22)";
      ctx.beginPath();
      for (let i = 0; i < 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        const r0 = R * 2.65;
        const r1 = r0 + (i % 6 === 0 ? 9 : 4);
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      }
      ctx.stroke();

      // ring of bars, mirrored left and right so it reads as one voice
      ctx.lineCap = "round";
      for (let i = 0; i < BARS; i++) {
        const u = i < BARS / 2 ? i / (BARS / 2) : (BARS - i) / (BARS / 2); // 0..1..0
        const wave = 0.5 + 0.5 * Math.sin(u * 9 + t * 3.1) * Math.sin(u * 4.3 - t * 1.7);
        const ripple = 0.5 + 0.5 * Math.sin(u * 23 - t * 5.2);
        const goal = amp * (0.25 + 0.75 * wave) * (0.6 + 0.4 * ripple);
        bars[i] += (goal - bars[i]) * Math.min(1, dt * 14);
        const a = (i / BARS) * Math.PI * 2 - Math.PI / 2;
        const r0 = R * 1.08;
        const r1 = r0 + 3 + bars[i] * reach * 1.7;
        ctx.strokeStyle = `rgba(${rgb},${0.35 + 0.65 * Math.min(1, bars[i] * 2.4)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.stroke();
      }

      // rotating arcs
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(${rgb},0.75)`;
      ctx.shadowColor = `rgba(${rgb},0.9)`;
      ctx.shadowBlur = 10;
      for (const [k, start, len, dir] of [[2.1, 0.2, 1.1, 1], [2.1, 3.4, 0.6, 1], [1.55, 1.8, 1.7, -1], [2.65, 4.6, 0.9, -0.5]] as const) {
        ctx.beginPath();
        ctx.arc(cx, cy, R * k, start + t * 0.35 * dir, start + len + t * 0.35 * dir);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // core: glow that breathes with the level, plus the wave across it
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * (1 + amp * 0.5));
      glow.addColorStop(0, `rgba(${rgb},${0.22 + amp * 0.5})`);
      glow.addColorStop(0.6, `rgba(${rgb},${0.06 + amp * 0.12})`);
      glow.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, R * (1 + amp * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${rgb},0.9)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R - 2, 0, Math.PI * 2);
      ctx.clip();
      for (const [f, a, alpha] of [[1, 1, 1], [1.8, 0.6, 0.45], [2.9, 0.35, 0.28]] as const) {
        ctx.beginPath();
        for (let x = -R; x <= R; x += 2) {
          const u = (x + R) / (2 * R);
          const env = Math.sin(Math.PI * u) ** 1.4;
          const y = Math.sin(u * Math.PI * 2 * 2.4 * f + t * 2.2 * f) * Math.sin(u * 5 * f - t * f) * env * amp * a * R * 1.5;
          if (x === -R) ctx.moveTo(cx + x, cy + y);
          else ctx.lineTo(cx + x, cy + y);
        }
        ctx.strokeStyle = `rgba(${rgb},${alpha})`;
        ctx.lineWidth = alpha === 1 ? 2 : 1;
        ctx.stroke();
      }
      ctx.restore();

      if (!still) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const repaint = still ? window.setInterval(() => requestAnimationFrame(draw), 400) : 0;
    return () => {
      cancelAnimationFrame(raf);
      if (repaint) window.clearInterval(repaint);
    };
  }, []);

  const look = LOOK[voice.state];
  const css = `rgb(${look.rgb.join(",")})`;
  return (
    <div className="relative flex h-full min-h-[440px] flex-col">
      <div className="flex items-center gap-3">
        <span className="mono flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]" style={{ color: css }} role="status">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: css, boxShadow: `0 0 8px ${css}` }} />
          {look.label}
        </span>
        <span className="mono ml-auto border border-line px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-dim">SI-generated voice</span>
      </div>

      <div className="relative min-h-0 flex-1">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
        {(["tl", "tr", "bl", "br"] as const).map((c) => (
          <span key={c} className="mono pointer-events-none absolute text-[9px] uppercase tracking-[0.18em] text-faint" style={{ [c[0] === "t" ? "top" : "bottom"]: 6, [c[1] === "l" ? "left" : "right"]: 6 }}>
            {c === "tl" ? "Kukulcan · voice" : c === "tr" ? (voice.live ? "channel open" : "channel closed") : c === "bl" ? `level ${(voice.level * 100).toFixed(0).padStart(2, "0")}` : "13 tools · NASA PSI"}
          </span>
        ))}
      </div>

      <div className="mx-auto w-full max-w-[760px] text-center">
        {voice.you && <p className="truncate text-[12.5px] text-accent" title={voice.you}><span className="mono mr-2 text-[9.5px] uppercase tracking-widest text-faint">you</span>{voice.you}</p>}
        <p className="mt-1 min-h-[44px] text-[16px] leading-snug">{voice.lab || <span className="text-dim">{look.hint || "The lab answers here."}</span>}</p>
        <div className="mt-2 flex items-center justify-center gap-2 pb-1">
          <button className={`btn flex items-center gap-2 !px-5 !py-2 ${voice.live ? "on" : ""}`} onClick={requestVoiceToggle} disabled={!voice.available || voice.state === "connecting"} title={voice.available ? "Talk to the lab" : "Live voice needs a Vapi key; typed commands work without it"}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: voice.live ? "var(--danger)" : "var(--accent)" }} />
            {voice.live ? "End call" : voice.state === "connecting" ? "Connecting…" : "Talk to the lab"}
          </button>
        </div>
      </div>
    </div>
  );
}
