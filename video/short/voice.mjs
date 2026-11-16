// Narration for the 30-second cut (ElevenLabs, SI-generated voice). Story structure:
// hook -> why -> "but" -> what we built -> the turn -> name.
// Code generated with SI assistance (Claude Code).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const DIR = new URL("../out-short/", import.meta.url).pathname;
export const LINES = [
  { id: "1-hook", scene: "hook", text: "A material can pass NASA's fire test on Earth, and still burn in space." },
  { id: "2-why", scene: "flames", text: "With no gravity, flames turn blue, almost invisible, and need less oxygen." },
  { id: "3-but", scene: "data", text: "NASA holds decades of data on this. But nobody can read it while designing a spacecraft." },
  { id: "4-built", scene: "demo", text: "So we built Kukulcan Fire Lab. Just ask. It shows the evidence, simulates the fire, and tells you what nobody has tested." },
  { id: "5-turn", scene: "aha", text: "Like the air planned for Moon bases." },
  { id: "6-name", scene: "end", text: "Kukulcan Fire Lab." },
];
export const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(join(DIR, "voice"), { recursive: true });
  const env = readFileSync(process.env.ELEVEN_ENV || new URL("../../.env", import.meta.url).pathname, "utf8");
  const key = process.env.ELEVENLABS_API_KEY || (env.match(/^ELEVENLABS_API_KEY=(.*)$/m)?.[1] ?? "").replace(/^["']|["']$/g, "").trim();
  const voice = process.env.ELEVEN_VOICE || "XrExE9yKIg1WjnnlVkGX"; // Matilda
  let total = 0;
  for (const l of LINES) {
    const file = join(DIR, "voice", `${l.id}.mp3`), stamp = file + ".txt";
    if (!(existsSync(file) && existsSync(stamp) && readFileSync(stamp, "utf8") === l.text)) {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ text: l.text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.42, similarity_boost: 0.8, style: 0.4 } }),
      });
      if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      writeFileSync(stamp, l.text);
    }
    const d = dur(file);
    total += d;
    console.log(`${l.id}: ${d.toFixed(2)} s`);
  }
  console.log(`spoken total: ${total.toFixed(2)} s`);
}
