// Tightens the narrated English video: each part of the picture is trimmed to the length of
// its narration (plus a short breath), so there is no dead time between topics.
// Code generated with SI assistance (Claude Code).
//
// Usage: node video/tighten_en.mjs   (after voice_en.mjs has generated video/out-en/voice/*.mp3)

import { execFileSync } from "node:child_process";
import { join } from "node:path";

const OUT = new URL("./out-en/", import.meta.url).pathname;
const BREATH = 0.7; // silence left after each line
// seg: where this part starts in the untrimmed video. at: where its narration starts.
// min: shortest length that still lets the slide finish revealing. slide: fade out at the cut.
const PARTS = [
  { id: "01-title", seg: 0, at: 0.8, min: 7.5, slide: true },
  { id: "02-threat", seg: 10, at: 10.8, min: 11, slide: true },
  { id: "03-flames", seg: 26, at: 26.8, min: 17.2, slide: true },
  { id: "04-problem", seg: 50, at: 50.7, min: 29.9, slide: true },
  { id: "05-solution", seg: 80, at: 80.6, min: 17.2, slide: true },
  { id: "06-welcome", seg: 104, at: 104.6, min: 0 },
  { id: "07-capsule", seg: 110.5, at: 110.6, min: 0 },
  { id: "08-oxygen", seg: 120.6, at: 120.7, min: 0 },
  { id: "09-materials", seg: 133.3, at: 133.4, min: 0 },
  { id: "10-cabin", seg: 143.4, at: 143.5, min: 0 },
  { id: "11-video", seg: 158.2, at: 158.3, min: 0 },
  { id: "12-chart", seg: 172.5, at: 172.6, min: 0 },
  { id: "13-gaps", seg: 187.4, at: 187.5, min: 0 },
  { id: "14-connections", seg: 199.0, at: 199.1, min: 0, last: true },
  { id: "15-sources", seg: 210.3, at: 210.9, min: 36, slide: true, tempo: 1.016 },
  { id: "16-audience", seg: 250.3, at: 250.9, min: 8.8, slide: true },
  { id: "17-close", seg: 264.3, at: 265.0, min: 13.6, slide: true },
];
const END = 280;

const run = (args) => {
  try {
    execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    throw new Error(`ffmpeg failed: ${String(e.stderr).slice(0, 800)}`);
  }
};
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

let clock = 0;
const v = [];
const a = [];
const inputs = [];
PARTS.forEach((p, i) => {
  const file = join(OUT, "voice", `${p.id}.mp3`);
  const spoken = dur(file) / (p.tempo ?? 1);
  const lead = p.at - p.seg;
  const room = (i + 1 < PARTS.length ? PARTS[i + 1].seg : END) - p.seg;
  const len = Math.min(room, Math.max(lead + spoken + BREATH, p.min));
  const fade = p.slide ? `,fade=t=out:st=${(len - 0.3).toFixed(2)}:d=0.3` : "";
  v.push(`[0:v]trim=start=${p.seg}:duration=${len.toFixed(3)},setpts=PTS-STARTPTS${fade}[v${i}]`);
  inputs.push("-i", file);
  a.push(`[${i + 1}:a]atempo=${(p.tempo ?? 1).toFixed(3)},adelay=${Math.round((clock + lead) * 1000)}:all=1[a${i}]`);
  console.log(`${p.id}: ${room.toFixed(1)} s -> ${len.toFixed(1)} s`);
  clock += len;
});
console.log(`total: ${END} s -> ${clock.toFixed(1)} s`);

const n = PARTS.length;
const wav = join(OUT, "narration-tight.wav");
run([...inputs, "-filter_complex", `${a.map((f) => f.replace(/^\[(\d+):a\]/, (_, k) => `[${k - 1}:a]`)).join(";")};${PARTS.map((_, i) => `[a${i}]`).join("")}amix=inputs=${n}:normalize=0:dropout_transition=0:duration=longest[a]`, "-map", "[a]", "-ar", "48000", "-ac", "2", wav]);
const out2k = join(OUT, "kukulcan-fire-lab-pitch-tight.mp4");
run(["-i", join(OUT, "kukulcan-fire-lab-pitch.mp4"), "-i", wav, "-filter_complex", `${v.join(";")};${PARTS.map((_, i) => `[v${i}]`).join("")}concat=n=${n}:v=1:a=0,format=yuv420p[v]`, "-map", "[v]", "-map", "1:a", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out2k]);
run(["-i", out2k, "-vf", "scale=1920:1080:flags=lanczos", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-c:a", "copy", "-movflags", "+faststart", join(OUT, "kukulcan-fire-lab-pitch-tight-1080p.mp4")]);
console.log("done");
