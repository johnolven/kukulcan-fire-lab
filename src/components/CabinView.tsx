"use client";
// Live cabin: flame, smoke and air moving through a module cross-section with
// racks, ventilation, a ceiling smoke detector and a crew member. Solver and
// scene ported from the team's earlier project "Umbral". An emulation calibrated
// by hand: it shows behaviour, it predicts nothing.
// Code generated with SI assistance (Claude Code).

import { useEffect, useRef, useState } from "react";
import { CabinSim, type CrewReading } from "@/lib/cabinSim";
import { gravityChoice, gravityOf } from "@/lib/controls";
import { useControl, useControlAction } from "@/lib/useControl";

type Show = "flame" | "o2" | "co";
const GRAVITY: [number, string][] = [[0, "Microgravity"], [0.17, "Moon"], [0.38, "Mars"], [1, "Earth"]];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function paint(ctx: CanvasRenderingContext2D, sim: CabinSim, off: HTMLCanvasElement, img: ImageData, W: number, H: number, tm: number, show: Show) {
  const { nx, ny, K } = sim;
  const d = img.data;
  const g0 = K.g === 0;
  for (let k = 0; k < nx * ny; k++) {
    let r = 10, g = 18, b = 30;
    if (sim.sol[k]) { r = 5; g = 9; b = 16; }
    else {
      const h = clamp((sim.T[k] - K.T0) / 900, 0, 1);
      r += h * 120; g += h * 30; b += h * 10;
      const sm = 1 - Math.exp(-sim.s[k] * 2.2), sr = g0 ? 150 : 120, sg = g0 ? 150 : 112, sb = g0 ? 160 : 104;
      r = r * (1 - sm) + sr * sm; g = g * (1 - sm) + sg * sm; b = b * (1 - sm) + sb * sm;
      const fl = clamp(sim.b[k] * 1.1 * (0.8 + 0.4 * Math.random()), 0, 1);
      if (fl > 0) {
        if (g0) { // without buoyancy the flame is blue and dim
          r = r * (1 - fl) + 120 * fl; g = g * (1 - fl) + 170 * fl; b = b * (1 - fl) + 255 * fl;
          const core = clamp(fl * 1.6 - 0.8, 0, 1); r += core * 120; g += core * 60;
        } else {
          r = r * (1 - fl) + 255 * fl; g = g * (1 - fl) + (150 + 90 * fl) * fl; b = b * (1 - fl) + 60 * fl;
          const cr = clamp(fl * 1.5 - 0.6, 0, 1); g += cr * 80; b += cr * 120;
        }
      }
      if (show === "o2") { const q = sim.o[k] / 0.4; r = 20 + 200 * clamp(1 - q * 2, 0, 1); g = 40 + 120 * clamp(q, 0, 1); b = 80 + 175 * clamp(q, 0, 1); }
      else if (show === "co") { const q2 = clamp(sim.c[k] * 400, 0, 1); r = 10 + 245 * q2; g = 18 + 76 * q2; b = 30; }
    }
    d[k * 4] = Math.min(255, r); d[k * 4 + 1] = Math.min(255, g); d[k * 4 + 2] = Math.min(255, b); d[k * 4 + 3] = 255;
  }
  off.getContext("2d")!.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, 0, 0, W, H);
  const sx = W / nx, sy = H / ny;
  const label = (text: string, x: number, y: number, color = "#8ea6bb", align: CanvasTextAlign = "left", size = 10) => {
    ctx.font = `${size}px ui-monospace, monospace`; ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(text.toUpperCase(), x, y);
  };
  const box = (i0: number, j0: number, i1: number, j1: number, text: string) => {
    ctx.fillStyle = "#0b1420"; ctx.fillRect(i0 * sx, j0 * sy, (i1 - i0 + 1) * sx, (j1 - j0 + 1) * sy);
    ctx.strokeStyle = "rgba(190,225,255,0.3)"; ctx.lineWidth = 1; ctx.strokeRect(i0 * sx + 0.5, j0 * sy + 0.5, (i1 - i0 + 1) * sx - 1, (j1 - j0 + 1) * sy - 1);
    label(text, ((i0 + i1 + 1) / 2) * sx, ((j0 + j1 + 1) / 2) * sy + 3, "#8ea6bb", "center", 9);
  };
  box(6, 49, 30, 58, "Cargo bags"); box(64, 1, 100, 7, "Avionics"); box(nx - 9, 14, nx - 2, 40, "Rack");
  // the burning material, dimming as it is consumed
  for (const k of sim.srcs) {
    const i = k % nx, fr = sim.bud[k] / 10;
    ctx.fillStyle = fr > 0.05 ? `rgba(255,181,74,${0.3 + 0.5 * fr})` : "#333";
    ctx.fillRect(i * sx, (sim.sy + 0.6) * sy, sx, sy * 0.5);
  }
  // hull
  ctx.strokeStyle = "rgba(214,238,255,0.6)"; ctx.lineWidth = 2;
  const rr = 8 * sx;
  ctx.beginPath(); ctx.moveTo(rr, sy); ctx.lineTo(W - rr, sy); ctx.quadraticCurveTo(W - sx, sy, W - sx, rr); ctx.lineTo(W - sx, H - rr);
  ctx.quadraticCurveTo(W - sx, H - sy, W - rr, H - sy); ctx.lineTo(rr, H - sy); ctx.quadraticCurveTo(sx, H - sy, sx, H - rr); ctx.lineTo(sx, rr); ctx.quadraticCurveTo(sx, sy, rr, sy); ctx.stroke();
  ctx.lineWidth = 1;
  // vents
  ctx.fillStyle = "#24364a"; ctx.fillRect(0, 6 * sy, sx * 1.6, 41 * sy); ctx.fillRect(W - sx * 1.6, 42 * sy, sx * 1.6, 11 * sy);
  if (sim.fans) {
    ctx.strokeStyle = "rgba(127,231,255,0.6)";
    for (let a3 = 0; a3 < 4; a3++) for (let a2 = 0; a2 < 3; a2++) {
      const ay = (12 + a3 * 10) * sy, ax = sx * 3 + ((tm * 30 + a2 * 22) % 66);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 10, ay); ctx.lineTo(ax + 6, ay - 4); ctx.moveTo(ax + 10, ay); ctx.lineTo(ax + 6, ay + 4); ctx.stroke();
    }
  }
  label(sim.fans ? "ventilation 15 cm/s" : "fans off", sx * 3, 5 * sy - 2, sim.fans ? "#7fe7ff" : "#8ea6bb");
  label("return + detector", W - sx * 3, 41 * sy - 2, "#8ea6bb", "right");
  // smoke detector on the ceiling
  const on = sim.det != null && Math.sin(tm * 10) > 0;
  ctx.fillStyle = on ? "#ff6464" : "#56697c"; ctx.beginPath(); ctx.arc(60.5 * sx, 8.5 * sy, 4, 0, 7); ctx.fill();
  // crew member (floats in microgravity)
  const cr = sim.crew(), bad = cr.co > 55 || cr.o2 < 16 || cr.T > 60;
  const ax2 = 82 * sx, ay2 = 22 * sy + (g0 ? Math.sin(tm * 0.8) * 4 : 0), sc = sy * 1.6;
  ctx.save(); ctx.translate(ax2, ay2); if (g0) ctx.rotate(Math.sin(tm * 0.5) * 0.15);
  ctx.strokeStyle = bad ? "#ff6464" : "#e9f4ff"; ctx.lineWidth = 1.6; ctx.fillStyle = "rgba(6,12,20,0.55)";
  const part = (x: number, y: number, w: number, h: number) => { ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h); };
  ctx.beginPath(); ctx.arc(0, 0, sc * 1.5, 0, 7); ctx.fill(); ctx.stroke();
  part(-sc * 1.6, sc * 1.7, sc * 3.2, sc * 7); part(-sc * 1.5, sc * 8.7, sc * 1.2, sc * 6); part(sc * 0.3, sc * 8.7, sc * 1.2, sc * 6);
  part(-sc * 3, sc * 2, sc * 1.3, sc * 5); part(sc * 1.7, sc * 2, sc * 1.3, sc * 5);
  ctx.restore();
  label("breathing zone", ax2 + sc * 3.6, ay2 + 3, bad ? "#ff6464" : "#8ea6bb");
  if (sim.t < 1.2) label("click the cabin to move the fire", W / 2, H / 2, "#e9f4ff", "center", 12);
  ctx.restore();
}

export function CabinView({ o2, psi, defaultGravity }: { o2: number; psi: number; defaultGravity: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<CabinSim | null>(null);
  const [gravityPick, setGravityPick] = useControl<string>("cabin.gravity");
  const [fans, setFans] = useControl<boolean>("cabin.fans");
  const [show, setShow] = useControl<Show>("cabin.show");
  const [running, setRunning] = useControl<boolean>("cabin.running");
  const setGravity = (v: number) => setGravityPick(gravityChoice(v));
  useControlAction("cabin.extinguisher", () => simRef.current?.fireExtinguisher());
  useControlAction("cabin.restart", () => simRef.current?.reset());
  const [hud, setHud] = useState<(CrewReading & { det: number | null; peak: number }) | null>(null);
  const live = useRef({ show, running });
  const g = gravityOf(gravityPick, defaultGravity);

  useEffect(() => {
    live.current = { show, running };
  }, [show, running]);

  // (re)build the cabin whenever the atmosphere or gravity changes
  useEffect(() => {
    const params = { o0: o2 / 100, T0: 295.15, P: psi * 6.895, g: g * 9.81 };
    if (simRef.current) simRef.current.reset(params);
    else simRef.current = new CabinSim(params);
    simRef.current.fans = fans;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fans is applied by its own effect
  }, [o2, psi, g]);
  useEffect(() => {
    if (simRef.current) simRef.current.fans = fans;
  }, [fans]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const off = document.createElement("canvas");
    off.width = 120; off.height = 60;
    const img = off.getContext("2d")!.createImageData(120, 60);
    let raf = 0, lastHud = 0, lastFrame = performance.now(), budget = 0;
    const frame = (now: number) => {
      const sim = simRef.current;
      if (sim) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // about 2.5 simulated seconds per real second, whatever the screen's refresh rate
        budget = Math.min(0.12, budget + ((now - lastFrame) / 1000) * 2.5);
        lastFrame = now;
        if (live.current.running) while (budget >= 0.03) { sim.step(0.03); budget -= 0.03; }
        else budget = 0;
        paint(ctx, sim, off, img, w, h, now / 1000, live.current.show);
        if (now - lastHud > 220) { lastHud = now; setHud({ ...sim.crew(), det: sim.det, peak: sim.peak }); }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  function tap(e: React.MouseEvent<HTMLCanvasElement>) {
    const sim = simRef.current;
    if (!sim) return;
    const r = e.currentTarget.getBoundingClientRect();
    sim.place(Math.round(((e.clientX - r.left) / r.width) * sim.nx), Math.round(((e.clientY - r.top) / r.height) * sim.ny));
  }

  const warn = (bad: boolean) => (bad ? "var(--danger)" : undefined);
  return (
    <div>
      <div className="grid grid-cols-4 gap-x-4 gap-y-1 @[640px]:grid-cols-7">
        {[
          ["Time", hud ? `${Math.round(hud.t)} s` : "–", undefined],
          ["Fire", hud ? `${hud.hrr >= 10 ? Math.round(hud.hrr) : hud.hrr.toFixed(1)} kW` : "–", warn(!!hud && hud.hrr > 50)],
          ["O₂ breathed", hud ? `${hud.o2.toFixed(1)}%` : "–", warn(!!hud && hud.o2 < 16)],
          ["CO breathed", hud ? `${Math.round(hud.co)} ppm` : "–", warn(!!hud && hud.co > 55)],
          ["Air at crew", hud ? `${Math.round(hud.T)} °C` : "–", warn(!!hud && hud.T > 60)],
          ["Cabin", hud ? `${Math.round(hud.P)} kPa` : "–", undefined],
          ["Detected", hud?.det != null ? `${Math.round(hud.det)} s` : "not yet", hud?.det != null ? "var(--warn)" : undefined],
        ].map(([k, v, tone]) => (
          <div key={k as string}><div className="label">{k}</div><div className="mono text-[15px]" style={{ color: tone as string | undefined }}>{v}</div></div>
        ))}
      </div>

      <canvas ref={canvasRef} className="mt-2 block aspect-[2/1] w-full cursor-crosshair border border-line" onClick={tap} role="img" aria-label="Cross-section of a crew module with a fire, smoke, ventilation, a smoke detector and a crew member" />

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button className="btn !px-2 !py-1" aria-pressed={!fans} onClick={() => setFans(!fans)}>{fans ? "Turn fans off" : "Fans are off"}</button>
        <button className="btn !px-2 !py-1" onClick={() => simRef.current?.fireExtinguisher()}>Extinguisher</button>
        <button className="btn !px-2 !py-1" onClick={() => simRef.current?.reset()}>Restart</button>
        <button className="btn !px-2 !py-1" aria-pressed={!running} onClick={() => setRunning(!running)}>{running ? "Pause" : "Resume"}</button>
        <span className="label ml-2">Gravity</span>
        {GRAVITY.map(([v, name]) => <button key={v} className="btn !px-2 !py-1" aria-pressed={g === v} onClick={() => setGravity(v)}>{name}</button>)}
        <span className="label ml-2">Show</span>
        {([["flame", "Flame + smoke"], ["o2", "Oxygen"], ["co", "CO"]] as [Show, string][]).map(([v, name]) => <button key={v} className="btn !px-2 !py-1" aria-pressed={show === v} onClick={() => setShow(v)}>{name}</button>)}
      </div>
    </div>
  );
}
