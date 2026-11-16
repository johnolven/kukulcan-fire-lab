// Records the title cards of the pitch video (video/slides.html), one clip per slide.
// Code generated with SI assistance (Claude Code).
// Usage: [VLANG=en] node video/record_slides.mjs [slide ...]

import { join } from "node:path";
import { Recorder, open, sleep } from "./lib.mjs";

const EN = process.env.VLANG === "en";
const LIGHT = process.env.VTHEME === "light";
const OUT = new URL(`./out${EN ? "-en" : ""}${LIGHT ? "-light" : ""}/`, import.meta.url).pathname;
const PAGE = new URL(EN ? "./slides.en.html" : "./slides.html", import.meta.url).href;
const TEAM = process.env.TEAM || "Kukulcan.Space"; // team line on the title slide; set TEAM to show names

// Seconds each card stays on screen; the narration script follows these.
export const SLIDES = { title: 10, threat: 16, flames: 24, problem: 30, solution: 24, sources: 40, audience: 14, close: 16 };

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SLIDES);
for (const id of wanted) {
  const { browser, page } = await open("about:blank");
  const rec = new Recorder(page, join(OUT, `frames-${id}`));
  await rec.start();
  const t0 = rec.now();
  await page.goto(`${PAGE}?s=${id}&team=${encodeURIComponent(TEAM)}${LIGHT ? "&theme=light" : ""}`, { waitUntil: "load" });
  rec.cut(0, rec.now()); // drop the blank page before the slide
  await sleep(SLIDES[id] * 1000);
  await rec.stop();
  const dur = rec.writeList(join(OUT, `${id}.txt`));
  console.log(`${id}: ${rec.frames.length} frames, ${dur.toFixed(1)} s (load ${(rec.now() - t0 - SLIDES[id]).toFixed(1)} s)`);
  await browser.close();
}
