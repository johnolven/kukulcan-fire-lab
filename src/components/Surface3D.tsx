"use client";
// A model drawn as a surface you can turn: two inputs on the floor, the result as
// height. Same drafting line style as the environment models. The white marker
// is your case. Code generated with SI assistance (Claude Code).

import { useEffect, useRef } from "react";
import type * as THREE_NS from "three";

export interface SurfaceSpec {
  /** value at (x, y), or null where the model gives nothing */
  f: (x: number, y: number) => number | null;
  x: [number, number];
  y: [number, number];
  xLog?: boolean;
  z: [number, number];
  xLabel: string;
  yLabel: string;
  zLabel: string;
  point: { x: number; y: number };
}

const NX = 36;
const NY = 28;

export function Surface3D({ spec, className }: { spec: SurfaceSpec; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const specRef = useRef(spec);
  const rebuild = useRef<(() => void) | null>(null);

  useEffect(() => {
    specRef.current = spec;
    rebuild.current?.();
  }, [spec]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    import("three").then((THREE: typeof THREE_NS) => {
      if (disposed) return;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      const el = renderer.domElement;
      el.style.position = "absolute";
      el.style.inset = "0";
      el.style.touchAction = "none";
      el.style.cursor = "grab";
      host.appendChild(el);

      const pivot = new THREE.Group();
      pivot.rotation.set(0.5, -0.65, 0);
      scene.add(pivot);
      let content: THREE_NS.Group | null = null;
      const trash: { dispose: () => void }[] = [];

      const build = () => {
        if (content) pivot.remove(content);
        trash.splice(0).forEach((d) => d.dispose());
        const s = specRef.current;
        const g = new THREE.Group();
        const ux = (i: number) => {
          const t = i / NX;
          return s.xLog ? s.x[0] * Math.pow(s.x[1] / s.x[0], t) : s.x[0] + (s.x[1] - s.x[0]) * t;
        };
        const uy = (j: number) => s.y[0] + ((s.y[1] - s.y[0]) * j) / NY;
        const px = (x: number) => ((s.xLog ? Math.log(x / s.x[0]) / Math.log(s.x[1] / s.x[0]) : (x - s.x[0]) / (s.x[1] - s.x[0])) - 0.5) * 2.2;
        const py = (y: number) => ((y - s.y[0]) / (s.y[1] - s.y[0]) - 0.5) * 1.8;
        const pz = (z: number) => Math.max(0, Math.min(1, (z - s.z[0]) / (s.z[1] - s.z[0]))) * 1.25;

        // surface as two families of lines, colored by height
        const pos: number[] = [];
        const col: number[] = [];
        const lo = new THREE.Color(0x3987e5), hi = new THREE.Color(0xd95926), c = new THREE.Color();
        const vertex = (i: number, j: number): [number, number, number, number] | null => {
          const v = s.f(ux(i), uy(j));
          return v == null ? null : [px(ux(i)), pz(v), py(uy(j)), pz(v) / 1.25];
        };
        const seg = (a: ReturnType<typeof vertex>, b: ReturnType<typeof vertex>) => {
          if (!a || !b) return;
          for (const p of [a, b]) {
            pos.push(p[0], p[1], p[2]);
            c.copy(lo).lerp(hi, p[3]);
            col.push(c.r, c.g, c.b);
          }
        };
        for (let j = 0; j <= NY; j++) for (let i = 0; i < NX; i++) seg(vertex(i, j), vertex(i + 1, j));
        for (let i = 0; i <= NX; i++) for (let j = 0; j < NY; j++) seg(vertex(i, j), vertex(i, j + 1));
        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geom.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
        const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 });
        g.add(new THREE.LineSegments(geom, mat));
        trash.push(geom, mat);

        // floor frame and axes
        const frame: number[] = [];
        const corners: [number, number][] = [[-1.1, -0.9], [1.1, -0.9], [1.1, 0.9], [-1.1, 0.9]];
        corners.forEach((p, k) => {
          const q = corners[(k + 1) % 4];
          frame.push(p[0], 0, p[1], q[0], 0, q[1]);
        });
        frame.push(-1.1, 0, -0.9, -1.1, 1.3, -0.9);
        const fg = new THREE.BufferGeometry();
        fg.setAttribute("position", new THREE.Float32BufferAttribute(frame, 3));
        const fm = new THREE.LineBasicMaterial({ color: 0xbee1ff, transparent: true, opacity: 0.45 });
        g.add(new THREE.LineSegments(fg, fm));
        trash.push(fg, fm);

        // your case: a marker on the surface with a drop line to the floor
        const v = s.f(s.point.x, s.point.y);
        const mx = px(Math.max(s.x[0], Math.min(s.x[1], s.point.x)));
        const my = py(Math.max(s.y[0], Math.min(s.y[1], s.point.y)));
        const mz = v == null ? 0 : pz(v);
        const dg = new THREE.BufferGeometry();
        dg.setAttribute("position", new THREE.Float32BufferAttribute([mx, 0, my, mx, mz, my], 3));
        const dm = new THREE.LineBasicMaterial({ color: 0xffffff });
        g.add(new THREE.LineSegments(dg, dm));
        const sg = new THREE.SphereGeometry(0.045, 12, 8);
        const sm = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const dot = new THREE.Mesh(sg, sm);
        dot.position.set(mx, mz, my);
        g.add(dot);
        trash.push(dg, dm, sg, sm);

        g.position.y = -0.55;
        content = g;
        pivot.add(g);
      };
      build();
      rebuild.current = build;

      const fit = () => {
        const w = host.clientWidth || 1, h = host.clientHeight || 1;
        renderer.setSize(w, h, false);
        el.style.width = "100%";
        el.style.height = "100%";
        camera.aspect = w / h;
        const half = 1.75;
        const dist = half / Math.tan((camera.fov * Math.PI) / 360);
        camera.position.set(0, 0, Math.max(dist, dist / camera.aspect));
        camera.updateProjectionMatrix();
      };
      fit();
      const observer = new ResizeObserver(fit);
      observer.observe(host);

      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let dragging: { x: number; y: number } | null = null;
      let idle = 0;
      const down = (e: PointerEvent) => { dragging = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); el.style.cursor = "grabbing"; };
      const move = (e: PointerEvent) => {
        if (!dragging) return;
        pivot.rotation.y += (e.clientX - dragging.x) * 0.011;
        pivot.rotation.x = Math.min(1.4, Math.max(0.05, pivot.rotation.x + (e.clientY - dragging.y) * 0.011));
        dragging = { x: e.clientX, y: e.clientY };
        idle = 0;
      };
      const up = () => { dragging = null; el.style.cursor = "grab"; };
      el.addEventListener("pointerdown", down);
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);

      let raf = 0, last = performance.now();
      const frame = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        idle += dt;
        if (!dragging && !still && idle > 1.5) pivot.rotation.y += dt * 0.18;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);

      cleanup = () => {
        cancelAnimationFrame(raf);
        observer.disconnect();
        rebuild.current = null;
        el.removeEventListener("pointerdown", down);
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
        trash.forEach((d) => d.dispose());
        renderer.dispose();
        el.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <div className={className}>
      <div ref={hostRef} className="relative aspect-[16/10] w-full border border-line" role="img" aria-label={`3D surface: ${spec.zLabel} against ${spec.xLabel} and ${spec.yLabel}. Drag to turn.`} />
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[10.5px] text-dim">
        <span><span className="mono text-faint">HEIGHT</span> {spec.zLabel}, {spec.z[0]} to {spec.z[1]}</span>
        <span><span className="mono text-faint">FLOOR</span> {spec.xLabel}{spec.xLog ? " (log)" : ""} × {spec.yLabel}</span>
        <span><span className="mono text-faint">WHITE DOT</span> your case</span>
        <span><span className="mono text-faint">COLOR</span> blue low, orange high</span>
        <span className="text-faint">Drag to turn</span>
      </div>
    </div>
  );
}
