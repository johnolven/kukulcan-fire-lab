// English narration for the pitch video, generated with ElevenLabs (SI-generated voice)
// and mixed over the silent English render.
// Code generated with SI assistance (Claude Code).
//
// Usage: node video/voice_en.mjs [--mix-only]
// Needs ELEVENLABS_API_KEY in the environment or in the .env named by ELEVEN_ENV.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = new URL("./out-en/", import.meta.url).pathname;
const DIR = join(OUT, "voice");
const VOICE = process.env.ELEVEN_VOICE || "XrExE9yKIg1WjnnlVkGX"; // Matilda: American, professional, educational
const MODEL = "eleven_multilingual_v2";
const mixOnly = process.argv.includes("--mix-only");

function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  const file = process.env.ELEVEN_ENV || new URL("../.env", import.meta.url).pathname; // .env that holds ELEVENLABS_API_KEY
  const m = readFileSync(file, "utf8").match(/^ELEVENLABS_API_KEY=(.*)$/m);
  return m ? m[1].replace(/^["']|["']$/g, "").trim() : "";
}

// at: second the line starts. until: second by which it must end (next line or slide change).
const LINES = [
  { id: "01-title", at: 0.8, until: 10, text: "This is Kukulcan Fire Lab. A fire-safety laboratory for space, by team Kukulcan Space." },
  { id: "02-threat", at: 10.8, until: 26, text: "Imagine a fire in a place with no exit door, and no firefighters. For a crew in space, it is one of the greatest threats there is." },
  { id: "03-flames", at: 26.8, until: 50, text: "And fire in space does not behave the way it does on Earth. There is no up or down, so the flame becomes a sphere. It is blue, almost invisible, and it can keep burning with less oxygen. What looks safe down here, may not be safe up there." },
  { id: "04-problem", at: 50.7, until: 80, text: "NASA has spent decades burning things in space to understand this. Twenty-four combustion investigations, more than sixty-six thousand files, thirteen and a half terabytes of data, and nearly three thousand flame videos. But they are scattered, and almost impossible to consult while you design. And there is a gap. Lunar bases and rovers are planned for thirty percent oxygen or more, and the repository holds zero tests on solid materials at that level." },
  { id: "05-solution", at: 80.6, until: 104, text: "So we built a laboratory that works beside you while you design the spacecraft. You ask out loud, it shows you the evidence, and you can try the fire yourself. One rule: it never says a material is safe. It shows what was tested, and what is missing." },
  { id: "06-welcome", at: 104.6, until: 110.4, text: "This is how the lab greets you. Pick a starting point, or just talk." },
  { id: "07-capsule", at: 110.6, until: 120.5, text: "Let's start with the capsule. ... The capsule is on the table, with the NASA tests closest to its atmosphere." },
  { id: "08-oxygen", at: 120.7, until: 133.2, text: "Raise the oxygen to thirty percent, and lower the pressure to ten P S I. ... The controls move on their own, and the warning changes: for solids, this was never tested." },
  { id: "09-materials", at: 133.4, until: 143.3, text: "Which materials have been tested? ... Every material NASA burned, and at what oxygen level." },
  { id: "10-cabin", at: 143.5, until: 158.1, text: "Open the fire laboratory, with the live cabin. ... A live cabin: flame, smoke, ventilation, and a crew member breathing that air." },
  { id: "11-video", at: 158.3, until: 172.4, text: "Show me a real NASA video from the BASS two experiment. ... This footage streams straight from NASA's repository. A real flame, on the space station." },
  { id: "12-chart", at: 172.6, until: 187.3, text: "Make a chart of oxygen against pressure, by fuel type. ... That chart did not exist. It was built just now, from the real records." },
  { id: "13-gaps", at: 187.5, until: 198.9, text: "What gaps are there in the data? ... And the honest part: what nobody has tested yet." },
  { id: "14-connections", at: 199.1, until: 210.2, text: "Show me the connections. ... And this is how everything connects inside." },
  { id: "15-sources", at: 210.9, until: 250.2, text: "Everything goes through M C P, an open standard that lets an assistant query data sources. An orchestrator decides which server to ask. One server holds the test records from NASA's Physical Sciences repository: twenty-four investigations, and nearly two thousand harmonized records. Another is a library, with the ten challenge resources, like Apollo One, Apollo Thirteen and the Mir fire, plus partner agencies: JAXA, ESA, the German center ZARM, and the French agency CNES. Four servers, thirty-one tools, and any assistant can connect." },
  { id: "16-audience", at: 250.9, until: 264.2, text: "This is not only for NASA engineers. It is also for children, students and teachers, who want to become one." },
  { id: "17-close", at: 265.0, until: 280, text: "Because the safest spacecraft of the future will be designed by those who are learning today. And we want them to learn with NASA's best science. Kukulcan Fire Lab. Thank you." },
];

mkdirSync(DIR, { recursive: true });
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

if (!mixOnly) {
  const key = apiKey();
  if (!key) throw new Error("ELEVENLABS_API_KEY not found");
  for (const l of LINES) {
    const file = join(DIR, `${l.id}.mp3`);
    const stamp = join(DIR, `${l.id}.txt`);
    if (existsSync(file) && existsSync(stamp) && readFileSync(stamp, "utf8") === l.text) continue; // unchanged line
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ text: l.text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.2 } }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    writeFileSync(stamp, l.text);
  }
}

// Fit each line into its slot (speed up slightly if it runs long), then mix over the video.
const inputs = [];
const filters = [];
LINES.forEach((l, i) => {
  const file = join(DIR, `${l.id}.mp3`);
  const d = dur(file);
  const room = l.until - l.at - 0.2;
  const tempo = d > room ? Math.min(1.15, d / room) : 1;
  console.log(`${l.id}: ${d.toFixed(1)} s in a ${room.toFixed(1)} s slot${tempo > 1 ? `, sped up x${tempo.toFixed(2)}` : ""}${d / tempo > room + 0.05 ? "  << STILL TOO LONG" : ""}`);
  inputs.push("-i", file);
  filters.push(`[${i + 1}:a]atempo=${tempo.toFixed(3)},adelay=${Math.round(l.at * 1000)}:all=1[a${i}]`);
});
// One narration track first, then attach it to each video without re-encoding the picture.
const track = join(OUT, "narration.m4a");
const run = (args) => {
  try {
    execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    throw new Error(`ffmpeg failed: ${String(e.stderr).slice(0, 600)}`);
  }
};
const mix = `${filters.map((f) => f.replace(/^\[(\d+):a\]/, (_, n) => `[${n - 1}:a]`)).join(";")};${LINES.map((_, i) => `[a${i}]`).join("")}amix=inputs=${LINES.length}:normalize=0:dropout_transition=0:duration=longest[a]`;
const wav = join(OUT, "narration.wav");
run([...inputs, "-filter_complex", mix, "-map", "[a]", "-ar", "48000", "-ac", "2", wav]);
run(["-i", wav, "-c:a", "aac", "-b:a", "192k", track]);
for (const [src, dst] of [["kukulcan-fire-lab-pitch.mp4", "kukulcan-fire-lab-pitch-voiced.mp4"], ["kukulcan-fire-lab-pitch-1080p.mp4", "kukulcan-fire-lab-pitch-1080p-voiced.mp4"]]) {
  run(["-i", join(OUT, src), "-i", track, "-map", "0:v", "-map", "1:a", "-c", "copy", "-movflags", "+faststart", join(OUT, dst)]);
  console.log("wrote", dst);
}
