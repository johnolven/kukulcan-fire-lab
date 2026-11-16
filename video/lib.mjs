// Frame recorder for the pitch video: captures a page as a stream of
// screenshots, keeps each frame with its timestamp, and lets a shot drop the
// time spent waiting on the language model.
// Code generated with SI assistance (Claude Code).

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

// Playwright is borrowed from the HiveFlow video tooling so this repo needs no extra install.
// Set PLAYWRIGHT_FROM to the package.json of any project that has Playwright installed.
const require = createRequire(process.env.PLAYWRIGHT_FROM || new URL("../../hiveflow/hiveflow-videos/package.json", import.meta.url).pathname);
export const { chromium } = require("playwright");

export const W = 1600; // layout size in CSS px
export const H = 900;
export const SCALE = 1.6; // rendered natively at 2560x1440

export async function open(url) {
  const browser = await chromium.launch({ headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--hide-scrollbars"] });
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "load" });
  return { browser, page };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Recorder {
  constructor(page, dir) {
    this.page = page;
    this.dir = dir;
    this.frames = []; // { file, t } in seconds, wall clock
    this.cuts = []; // [from, to] wall-clock ranges removed from the result
    this.n = 0;
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
  }
  // Takes screenshots in a loop; the clip scale makes the browser render at 2560x1440.
  async start() {
    this.cdp = await this.page.context().newCDPSession(this.page);
    this.running = true;
    this.loop = (async () => {
      while (this.running) {
        const t = this.now();
        const shot = await this.cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 92, optimizeForSpeed: true, clip: { x: 0, y: 0, width: W, height: H, scale: SCALE } }).catch(() => null);
        if (!shot) { await sleep(30); continue; }
        const file = join(this.dir, `f${String(this.n++).padStart(6, "0")}.jpg`);
        writeFileSync(file, Buffer.from(shot.data, "base64"));
        this.frames.push({ file, t });
      }
    })();
  }
  now() {
    return Date.now() / 1000;
  }
  cut(from, to) {
    if (to > from) this.cuts.push([from, to]);
  }
  async stop() {
    this.end = this.now();
    this.running = false;
    await this.loop;
  }
  // Writes an ffmpeg concat list and returns the resulting duration in seconds.
  writeList(listPath) {
    const removedBefore = (t) => this.cuts.reduce((s, [a, b]) => s + Math.max(0, Math.min(t, b) - a), 0);
    const inCut = (t) => this.cuts.some(([a, b]) => t >= a && t < b);
    const kept = this.frames.filter((f) => !inCut(f.t)).map((f) => ({ file: f.file, t: f.t - removedBefore(f.t) }));
    const end = this.end - removedBefore(this.end);
    const lines = [];
    kept.forEach((f, i) => {
      const next = i + 1 < kept.length ? kept[i + 1].t : end;
      lines.push(`file '${f.file}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
    });
    if (kept.length) lines.push(`file '${kept[kept.length - 1].file}'`);
    writeFileSync(listPath, lines.join("\n") + "\n");
    return kept.length ? end - kept[0].t : 0;
  }
}
