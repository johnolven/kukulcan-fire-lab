"use client";
// 3D line models of the six crewed environments, drawn in the same drafting
// style as the 2D sheets. Original schematic geometry built from primitives for
// this project (not NASA models). Drag to turn; they rotate slowly on their own.
// Code and models generated with SI assistance (Claude Code).

import { useEffect, useRef } from "react";
import { useControl, useT } from "@/lib/useControl";
import type * as THREE_NS from "three";

type V3 = [number, number, number];
type Seg = [V3, V3];

// ---------- line primitives (all centred on the origin, Y up) ----------

function circle(r: number, y = 0, n = 40): Seg[] {
  const out: Seg[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const b = ((i + 1) / n) * Math.PI * 2;
    out.push([[r * Math.cos(a), y, r * Math.sin(a)], [r * Math.cos(b), y, r * Math.sin(b)]]);
  }
  return out;
}

/** Cylinder or cone frustum standing on Y: end rings plus `ribs` straight lines. */
function tube(rTop: number, rBottom: number, h: number, ribs = 12, rings = 0): Seg[] {
  const out = [...circle(rTop, h / 2), ...circle(rBottom, -h / 2)];
  for (let i = 1; i <= rings; i++) {
    const t = i / (rings + 1);
    out.push(...circle(rBottom + (rTop - rBottom) * t, -h / 2 + h * t));
  }
  for (let i = 0; i < ribs; i++) {
    const a = (i / ribs) * Math.PI * 2;
    out.push([[rTop * Math.cos(a), h / 2, rTop * Math.sin(a)], [rBottom * Math.cos(a), -h / 2, rBottom * Math.sin(a)]]);
  }
  return out;
}

/** Spherical cap from the pole down to `maxTheta` (PI/2 = hemisphere, PI = sphere). */
function dome(r: number, maxTheta = Math.PI / 2, lat = 4, long = 12): Seg[] {
  const out: Seg[] = [];
  for (let i = 1; i <= lat; i++) {
    const th = (maxTheta * i) / lat;
    if (Math.sin(th) > 0.02) out.push(...circle(r * Math.sin(th), r * Math.cos(th), 32));
  }
  const steps = 10;
  for (let j = 0; j < long; j++) {
    const ph = (j / long) * Math.PI * 2;
    for (let s = 0; s < steps; s++) {
      const a = (maxTheta * s) / steps;
      const b = (maxTheta * (s + 1)) / steps;
      out.push([
        [r * Math.sin(a) * Math.cos(ph), r * Math.cos(a), r * Math.sin(a) * Math.sin(ph)],
        [r * Math.sin(b) * Math.cos(ph), r * Math.cos(b), r * Math.sin(b) * Math.sin(ph)],
      ]);
    }
  }
  return out;
}

function box(w: number, h: number, d: number): Seg[] {
  const x = w / 2, y = h / 2, z = d / 2;
  const c: V3[] = [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z], [-x, y, -z], [x, y, -z], [x, y, z], [-x, y, z]];
  const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  return e.map(([a, b]) => [c[a], c[b]] as Seg);
}

/** Flat panel in the XY plane with an nx by ny grid (solar array, radiator). */
function panel(w: number, h: number, nx = 4, ny = 2): Seg[] {
  const out: Seg[] = [];
  for (let i = 0; i <= nx; i++) {
    const x = -w / 2 + (w * i) / nx;
    out.push([[x, -h / 2, 0], [x, h / 2, 0]]);
  }
  for (let j = 0; j <= ny; j++) {
    const y = -h / 2 + (h * j) / ny;
    out.push([[-w / 2, y, 0], [w / 2, y, 0]]);
  }
  return out;
}

const line = (a: V3, b: V3): Seg[] => [[a, b]];

// ---------- a part = segments + placement + tone ----------

interface Part {
  segs: Seg[];
  pos?: V3;
  rot?: V3; // Euler XYZ, radians
  tone?: "main" | "accent" | "dim";
}

const HALF = Math.PI / 2;
const p = (segs: Seg[], pos?: V3, rot?: V3, tone?: Part["tone"]): Part => ({ segs, pos, rot, tone });

function wheel(x: number, z: number): Part[] {
  return [p(tube(0.34, 0.34, 0.22, 8), [x, 0.34, z], [HALF, 0, 0]), p(circle(0.14, 0, 16), [x, 0.34, z + (z > 0 ? 0.11 : -0.11)], [HALF, 0, 0], "dim")];
}

const MODELS: Record<string, { parts: Part[]; size: number }> = {
  suit: {
    size: 2.5,
    parts: [
      p(dome(0.42, Math.PI, 6, 10), [0, 1.5, 0]),
      p(dome(0.33, Math.PI * 0.55, 3, 8), [0, 1.5, 0.14], [HALF * 0.9, 0, 0], "accent"), // visor
      p(tube(0.3, 0.34, 0.14, 10), [0, 1.08, 0]), // neck ring
      p(box(0.96, 0.98, 0.5), [0, 0.5, 0]), // torso
      p(box(0.78, 1.02, 0.3), [0, 0.56, -0.4], undefined, "dim"), // life support backpack
      p(box(0.36, 0.24, 0.12), [0, 0.6, 0.31], undefined, "accent"), // chest control unit
      p(tube(0.15, 0.13, 0.82, 8, 1), [-0.72, 0.52, 0], [0, 0, -0.38]),
      p(tube(0.15, 0.13, 0.82, 8, 1), [0.72, 0.52, 0], [0, 0, 0.38]),
      p(dome(0.15, Math.PI, 3, 8), [-0.9, 0.08, 0]),
      p(dome(0.15, Math.PI, 3, 8), [0.9, 0.08, 0]),
      p(tube(0.2, 0.17, 1.08, 8, 2), [-0.26, -0.55, 0]),
      p(tube(0.2, 0.17, 1.08, 8, 2), [0.26, -0.55, 0]),
      p(box(0.3, 0.2, 0.5), [-0.26, -1.19, 0.06]),
      p(box(0.3, 0.2, 0.5), [0.26, -1.19, 0.06]),
    ],
  },
  capsule: {
    size: 2.9,
    parts: [
      p(tube(0.28, 0.28, 0.16, 12), [0, 1.3, 0], undefined, "accent"), // docking ring
      p(tube(0.36, 1.1, 1.15, 16, 2), [0, 0.64, 0]), // crew module
      p(dome(1.5, 0.82, 2, 16), [0, 1.03, 0], [Math.PI, 0, 0], "accent"), // heat shield
      p(tube(0.95, 0.95, 0.95, 16, 1), [0, -0.62, 0]), // service module
      p(tube(0.2, 0.46, 0.4, 12), [0, -1.3, 0], undefined, "dim"), // engine bell
      p(panel(1.5, 0.5, 5, 1), [1.72, -0.6, 0], [HALF, 0, 0]),
      p(panel(1.5, 0.5, 5, 1), [-1.72, -0.6, 0], [HALF, 0, 0]),
      p(panel(0.5, 1.5, 1, 5), [0, -0.6, 1.72], [HALF, 0, 0]),
      p(panel(0.5, 1.5, 1, 5), [0, -0.6, -1.72], [HALF, 0, 0]),
      p(box(0.3, 0.34, 0.04), [0, 0.7, 0.86], [-0.6, 0, 0], "dim"), // hatch
    ],
  },
  spacecraft: {
    size: 3.6,
    parts: [
      p(tube(0.62, 0.62, 2.3, 14, 3), [0, 0, 0], [0, 0, HALF]), // habitat
      p(dome(0.62, HALF, 3, 14), [1.15, 0, 0], [0, 0, -HALF]),
      p(dome(0.62, HALF, 3, 14), [-1.15, 0, 0], [0, 0, HALF]),
      p(tube(0.3, 0.3, 0.3, 10), [1.9, 0, 0], [0, 0, HALF], "accent"), // docking node
      p(tube(0.2, 0.62, 0.7, 12, 1), [2.4, 0, 0], [0, 0, HALF]), // docked capsule
      p(tube(0.48, 0.48, 0.8, 12, 1), [-2.15, 0, 0], [0, 0, HALF], "dim"), // propulsion stage
      p(tube(0.18, 0.42, 0.45, 12), [-2.78, 0, 0], [0, 0, HALF], "dim"),
      p(line([0, 0.62, 0], [0, 1.0, 0]), undefined, undefined, "dim"),
      p(line([0, -0.62, 0], [0, -1.0, 0]), undefined, undefined, "dim"),
      p(panel(1.5, 1.0, 5, 3), [0, 1.5, 0]),
      p(panel(1.5, 1.0, 5, 3), [0, -1.5, 0]),
      p(panel(0.9, 0.5, 3, 2), [-1.1, 0, 0.95], [HALF, 0, 0], "dim"), // radiator
    ],
  },
  station: {
    size: 4.1,
    parts: [
      p(box(5.6, 0.14, 0.14), [0, 0, 0]), // main truss
      ...[-2.45, -1.75, 1.75, 2.45].flatMap((x) => [p(panel(0.5, 1.7, 2, 6), [x, 1.0, 0]), p(panel(0.5, 1.7, 2, 6), [x, -1.0, 0])]),
      p(tube(0.3, 0.3, 1.5, 12, 2), [0, 0, 0.95], [HALF, 0, 0]), // forward lab
      p(tube(0.3, 0.3, 1.5, 12, 2), [0, 0, -0.95], [HALF, 0, 0]), // aft module
      p(dome(0.34, Math.PI, 4, 10), [0, 0, 0], undefined, "accent"), // node
      p(tube(0.26, 0.26, 1.0, 10, 1), [0.7, -0.05, 1.5], [0, 0, HALF]),
      p(tube(0.26, 0.26, 1.0, 10, 1), [-0.7, -0.05, 1.5], [0, 0, HALF]),
      p(tube(0.16, 0.34, 0.45, 10), [0, 0, -1.95], [HALF, 0, 0], "dim"), // docked vehicle
      p(panel(0.5, 0.9, 2, 4), [0.95, -0.5, 0], [0, HALF, 0], "dim"),
      p(panel(0.5, 0.9, 2, 4), [-0.95, -0.5, 0], [0, HALF, 0], "dim"),
    ],
  },
  base: {
    size: 3.6,
    parts: [
      ...[0.6, 1.3, 2.0, 2.7].map((r) => p(circle(r, 0, 48), [0, -0.6, 0], undefined, "dim")), // ground
      ...[0, 1, 2, 3, 4, 5].map((i) => p(line([0.6 * Math.cos((i * Math.PI) / 3), 0, 0.6 * Math.sin((i * Math.PI) / 3)], [2.7 * Math.cos((i * Math.PI) / 3), 0, 2.7 * Math.sin((i * Math.PI) / 3)]), [0, -0.6, 0], undefined, "dim")),
      p(dome(1.15, HALF, 5, 14), [-0.3, -0.6, 0]), // main habitat
      p(dome(1.4, HALF * 0.86, 1, 10), [-0.3, -0.72, 0], undefined, "accent"), // regolith cover line
      p(dome(0.6, HALF, 3, 10), [1.55, -0.6, -0.8]), // second dome
      p(tube(0.2, 0.2, 0.9, 8), [0.85, -0.38, -0.42], [HALF, 0, -1.05], "dim"), // tunnel
      p(box(0.5, 0.5, 0.62), [1.05, -0.35, 0.55]), // airlock
      p(box(0.24, 0.36, 0.04), [1.05, -0.42, 0.87], undefined, "accent"), // hatch
      p(panel(0.9, 0.6, 3, 2), [-1.9, -0.25, 1.0], [-0.7, 0.5, 0]),
      p(line([-1.9, -0.6, 1.0], [-1.9, -0.25, 1.0]), undefined, undefined, "dim"),
      p(line([2.0, -0.6, 1.3], [2.0, 0.75, 1.3])),
      p(tube(0.32, 0.03, 0.2, 10), [2.0, 0.85, 1.3], [0.5, 0, 0.4], "accent"), // dish
    ],
  },
  rover: {
    size: 3.3,
    parts: [
      p(box(2.3, 0.86, 1.1), [-0.1, 0.98, 0]), // cabin
      p(tube(0.55, 0.55, 1.1, 10), [1.05, 0.98, 0], [HALF, 0, 0], "accent"), // rounded cockpit
      p(box(0.6, 0.3, 0.04), [0.2, 1.08, 0.56], undefined, "dim"),
      p(box(0.6, 0.3, 0.04), [-0.6, 1.08, 0.56], undefined, "dim"),
      p(box(2.7, 0.12, 0.9), [0, 0.5, 0]), // chassis
      ...[-1.05, 0, 1.05].flatMap((x) => [...wheel(x, 0.62), ...wheel(x, -0.62)]),
      p(tube(0.2, 0.2, 0.26, 10), [-1.38, 1.02, 0.27], [0, 0, HALF], "accent"), // suit ports
      p(tube(0.2, 0.2, 0.26, 10), [-1.38, 1.02, -0.27], [0, 0, HALF], "accent"),
      p(line([-0.5, 1.41, 0], [-0.5, 1.95, 0])),
      p(tube(0.26, 0.03, 0.16, 10), [-0.5, 2.02, 0], [0.4, 0, 0.3], "dim"), // antenna dish
      p(panel(1.0, 0.5, 4, 2), [0.1, 1.44, 0], [HALF, 0, 0], "dim"), // roof radiator
    ],
  },
};

const TONE = { main: [0xe9f4ff, 0.95], accent: [0x7fe7ff, 1], dim: [0xbee1ff, 0.42] } as const;
const TONE_LIGHT = { main: [0x0d1b28, 0.9], accent: [0x08728c, 1], dim: [0x0f2841, 0.4] } as const;

export function EnvironmentModel({ id, className }: { id: string; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [theme] = useControl<string>("ui.theme");
  const t = useT();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    import("three").then((THREE: typeof THREE_NS) => {
      if (disposed) return;
      const model = MODELS[id] ?? MODELS.station;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      host.appendChild(renderer.domElement);
      // Absolutely positioned so the canvas never stretches the box it measures.
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.inset = "0";
      renderer.domElement.style.display = "block";
      renderer.domElement.style.touchAction = "none";
      renderer.domElement.style.cursor = "grab";

      const group = new THREE.Group();
      const disposables: { dispose: () => void }[] = [];
      for (const part of model.parts) {
        const pts = new Float32Array(part.segs.length * 6);
        part.segs.forEach(([a, b], i) => pts.set([...a, ...b], i * 6));
        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(pts, 3));
        const [color, opacity] = (theme === "light" ? TONE_LIGHT : TONE)[part.tone ?? "main"];
        const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
        const obj = new THREE.LineSegments(geom, mat);
        if (part.pos) obj.position.set(...part.pos);
        if (part.rot) obj.rotation.set(...part.rot);
        group.add(obj);
        disposables.push(geom, mat);
      }
      // centre the model on its own bounding box
      const bounds = new THREE.Box3().setFromObject(group);
      const centre = bounds.getCenter(new THREE.Vector3());
      group.children.forEach((c) => c.position.sub(centre));
      const pivot = new THREE.Group();
      pivot.add(group);
      pivot.rotation.set(0.28, -0.6, 0);
      scene.add(pivot);

      const fit = () => {
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        renderer.setSize(w, h, false);
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        camera.aspect = w / h;
        // far enough that the model fits both ways
        const half = (model.size / 2) * 1.12;
        const v = half / Math.tan((camera.fov * Math.PI) / 360);
        camera.position.set(0, 0, Math.max(v, v / camera.aspect));
        camera.updateProjectionMatrix();
      };
      fit();
      const observer = new ResizeObserver(fit);
      observer.observe(host);

      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let dragging: { x: number; y: number } | null = null;
      let idle = 0;
      const el = renderer.domElement;
      const down = (e: PointerEvent) => {
        dragging = { x: e.clientX, y: e.clientY };
        el.setPointerCapture(e.pointerId);
        el.style.cursor = "grabbing";
      };
      const move = (e: PointerEvent) => {
        if (!dragging) return;
        pivot.rotation.y += (e.clientX - dragging.x) * 0.011;
        pivot.rotation.x = Math.min(1.3, Math.max(-1.3, pivot.rotation.x + (e.clientY - dragging.y) * 0.011));
        dragging = { x: e.clientX, y: e.clientY };
        idle = 0;
      };
      const up = () => {
        dragging = null;
        el.style.cursor = "grab";
      };
      el.addEventListener("pointerdown", down);
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);

      let raf = 0;
      let last = performance.now();
      const frame = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        idle += dt;
        if (!dragging && !still && idle > 1.2) pivot.rotation.y += dt * 0.32;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);

      cleanup = () => {
        cancelAnimationFrame(raf);
        observer.disconnect();
        el.removeEventListener("pointerdown", down);
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
        disposables.forEach((d) => d.dispose());
        renderer.dispose();
        el.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [id, theme]);

  return <div ref={hostRef} className={className} role="img" aria-label={t("3D line model: {id}. Drag to turn.", { id })} />;
}
