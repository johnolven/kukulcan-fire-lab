// Builds the 30-second cut: records the new scenes, cuts a fast montage from the real lab
// recording, burns large captions and mixes the narration.
// Code generated with SI assistance (Claude Code).
//
// Usage: node video/short/voice.mjs && node video/short/build.mjs

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Recorder, chromium, open, sleep } from "../lib.mjs";
import { DIR, LINES, dur } from "./voice.mjs";

const PAGE = new URL("./short.html", import.meta.url).href;
const DEMO = new URL("../out-en/clip-demo.mp4", import.meta.url).pathname; // real lab recording, English
const GAP = 0.12; // pause between lines
const TAIL = 1.2; // hold on the end card
// Moments of the lab recording used in the montage (seconds into the demo clip).
// welcome screen with the voice command, evidence for the capsule, live cabin fire (framed above the caption), gaps
const MONTAGE = [{ t: 6.9, full: true }, { t: 11.4 }, { t: 50.6, vf: "crop=iw*0.62:ih*0.49:iw*0.15:ih*0.485,scale=2560:1138:flags=lanczos,pad=2560:1440:0:0:color=0x04070c" }, { t: 88.6 }];

const run = (args) => {
  try {
    execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    throw new Error(`ffmpeg failed: ${String(e.stderr).slice(0, 900)}`);
  }
};

// ---- timeline
let clock = 0;
const parts = LINES.map((l, i) => {
  const spoken = dur(join(DIR, "voice", `${l.id}.mp3`));
  const len = spoken + (i === LINES.length - 1 ? TAIL : i === LINES.length - 2 ? 0.25 : GAP);
  const p = { ...l, start: clock, spoken, len };
  clock += len;
  return p;
});
const TOTAL = clock;
console.log(parts.map((p) => `${p.scene} ${p.start.toFixed(2)}-${(p.start + p.len).toFixed(2)}`).join(" | "), `| total ${TOTAL.toFixed(2)} s`);
if (TOTAL > 30) throw new Error("longer than 30 s");

// ---- captions: short phrases, timed across each line
const caps = [];
for (const p of parts) {
  const chunks = [];
  for (const phrase of p.text.match(/[^,.]+[,.]?/g).map((x) => x.trim()).filter(Boolean)) {
    const w = phrase.split(" ");
    const k = Math.ceil(w.length / 4); // balanced chunks of at most four words
    const size = Math.ceil(w.length / k);
    for (let i = 0; i < w.length; i += size) chunks.push(w.slice(i, i + size).join(" "));
  }
  const chars = chunks.reduce((sum, c) => sum + c.length + 1, 0);
  let t = p.start + 0.05;
  for (const c of chunks) {
    const d = ((c.length + 1) / chars) * (p.spoken - 0.1);
    caps.push({ text: c.replace(/[.,]$/, ""), from: t, to: t + d, scene: p.scene });
    t += d;
  }
  caps[caps.length - 1].to = Math.min(TOTAL, p.start + p.len - 0.02);
}
const capAt = (word) => caps.find((c) => c.text.startsWith(word)).from;

// ---- scenes
mkdirSync(join(DIR, "clips"), { recursive: true });
for (const p of parts) {
  const clip = join(DIR, "clips", `${p.scene}.mp4`);
  if (p.scene === "demo") {
    // Each shot lasts as long as the phrase it illustrates.
    const cuts = [p.start, capAt("It shows"), capAt("simulates"), capAt("and tells"), p.start + p.len];
    const f = MONTAGE.map((m, i) => `[0:v]trim=start=${m.t}:duration=${(cuts[i + 1] - cuts[i]).toFixed(3)},setpts=PTS-STARTPTS${m.vf ? "," + m.vf : (m.full ? "" : ",crop=iw*0.84:ih*0.84:iw*0.01:ih*0.06") + ",scale=2560:1440:flags=lanczos"},setsar=1[m${i}]`).join(";");
    run(["-i", DEMO, "-filter_complex", `${f};${MONTAGE.map((_, i) => `[m${i}]`).join("")}concat=n=${MONTAGE.length}:v=1:a=0,fps=30,format=yuv420p[v]`, "-map", "[v]", "-t", p.len.toFixed(3), "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-an", clip]);
    continue;
  }
  const { browser, page } = await open("about:blank");
  const rec = new Recorder(page, join(DIR, `frames-${p.scene}`));
  await rec.start();
  await page.goto(`${PAGE}?s=${p.scene}`, { waitUntil: "load" });
  rec.cut(0, rec.now());
  await sleep(p.len * 1000 + 250);
  await rec.stop();
  const list = join(DIR, `${p.scene}.txt`);
  rec.writeList(list);
  await browser.close();
  run(["-f", "concat", "-safe", "0", "-i", list, "-vf", "fps=30,scale=2560:1440:flags=lanczos,format=yuv420p", "-t", p.len.toFixed(3), "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-an", clip]);
}

mkdirSync(join(DIR, "caps"), { recursive: true });
{
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.6 })).newPage();
  for (const [i, c] of caps.entries()) {
    await page.setContent(`<style>html,body{margin:0;width:1600px;height:900px;background:transparent}
      div{position:absolute;left:0;right:0;top:716px;display:flex;justify-content:center}
      span{font:800 74px/1.1 "Helvetica Neue",Helvetica,Arial,sans-serif;letter-spacing:-.01em;color:#fff;padding:14px 38px 18px;border-radius:18px;background:rgba(4,7,12,.86);box-shadow:0 0 0 2px rgba(127,231,255,.55),0 12px 50px rgba(0,0,0,.6);white-space:nowrap}</style><div><span>${c.text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</span></div>`);
    c.file = join(DIR, "caps", `c${String(i).padStart(2, "0")}.png`);
    await page.screenshot({ path: c.file, omitBackground: true });
  }
  await browser.close();
}

// ---- narration track
const wav = join(DIR, "narration.wav");
run([...parts.flatMap((p) => ["-i", join(DIR, "voice", `${p.id}.mp3`)]), "-filter_complex", `${parts.map((p, i) => `[${i}:a]adelay=${Math.round(p.start * 1000)}:all=1[a${i}]`).join(";")};${parts.map((_, i) => `[a${i}]`).join("")}amix=inputs=${parts.length}:normalize=0:dropout_transition=0:duration=longest,volume=1.6,alimiter=limit=0.95[a]`, "-map", "[a]", "-ar", "48000", "-ac", "2", wav]);

// ---- compose
const clipList = join(DIR, "clips.txt");
writeFileSync(clipList, parts.map((p) => `file '${join(DIR, "clips", `${p.scene}.mp4`)}'`).join("\n") + "\n");
const silent = join(DIR, "silent.mp4");
run(["-f", "concat", "-safe", "0", "-i", clipList, "-c", "copy", silent]);
let chain = "[0:v]setpts=PTS-STARTPTS[b0]";
caps.forEach((c, i) => { chain += `;[b${i}][${i + 2}:v]overlay=0:0:enable='between(t,${c.from.toFixed(3)},${c.to.toFixed(3)})'[b${i + 1}]`; });
const out2k = join(DIR, "kukulcan-fire-lab-30s.mp4");
run(["-fflags", "+genpts", "-i", silent, "-i", wav, ...caps.flatMap((c) => ["-i", c.file]), "-filter_complex", `${chain};[b${caps.length}]fade=t=in:st=0:d=0.15,format=yuv420p[v]`, "-map", "[v]", "-map", "1:a", "-t", TOTAL.toFixed(3), "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out2k]);
run(["-i", out2k, "-vf", "scale=1920:1080:flags=lanczos", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-c:a", "copy", "-movflags", "+faststart", join(DIR, "kukulcan-fire-lab-30s-1080p.mp4")]);
console.log(caps.map((c) => `${c.from.toFixed(1)} ${c.text}`).join("\n"));
console.log("total", dur(out2k).toFixed(2), "s");
