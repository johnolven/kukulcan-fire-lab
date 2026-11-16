// Records the live lab for the pitch video. Every step is a real request typed into the
// lab's chat (the same path the voice uses); the caption shows the phrase the presenter says.
// Waiting on the language model is trimmed to a short beat.
// Code generated with SI assistance (Claude Code).
//
// Usage: [VLANG=en] node video/record_demo.mjs [--only N] (the app must be running on localhost:3977)

import { join } from "node:path";
import { Recorder, open, sleep } from "./lib.mjs";

const EN = process.env.VLANG === "en";
const LIGHT = process.env.VTHEME === "light";
const OUT = new URL(`./out${EN ? "-en" : ""}${LIGHT ? "-light" : ""}/`, import.meta.url).pathname;
const APP = process.env.APP_URL || "http://localhost:3977";
const only = process.argv.includes("--only") ? Number(process.argv[process.argv.indexOf("--only") + 1]) : null;

// say: what the presenter says out loud. hold: seconds to stay on the result.
const STEPS_ES = [
  { say: "Empecemos por la cápsula", hold: 7 },
  { say: "Sube el oxígeno a 30 por ciento y baja la presión a 10 psi", hold: 8 },
  { say: "¿Qué materiales se han probado?", hold: 7 },
  { say: "Abre el laboratorio de fuego con la cabina en vivo", hold: 11 },
  { say: "Muéstrame un video real de la NASA del experimento BASS-II", hold: 10 },
  { say: "Haz una gráfica de oxígeno contra presión por tipo de combustible", hold: 9, wait: "chart" },
  { say: "¿Qué huecos hay en los datos?", hold: 8 },
  { say: "Muéstrame las conexiones", hold: 8 },
];
const STEPS_EN = [
  { say: "Let's start with the capsule", hold: 7 },
  { say: "Raise the oxygen to 30 percent and lower the pressure to 10 psi", hold: 8 },
  { say: "Which materials have been tested?", hold: 7 },
  { say: "Open the fire laboratory with the live cabin", hold: 11 },
  { say: "Show me a real NASA video from the BASS-II experiment", hold: 10 },
  { say: "Make a chart of oxygen against pressure by fuel type", hold: 9, wait: "chart" },
  { say: "What gaps are there in the data?", hold: 8 },
  { say: "Show me the connections", hold: 8 },
];
const STEPS = EN ? STEPS_EN : STEPS_ES;

const OVERLAY = `
(() => {
  if (document.getElementById('pv-cap')) return;
  const s = document.createElement('style');
  s.textContent = \`
    nextjs-portal{display:none!important}
    #pv-cap{position:fixed;left:50%;bottom:34px;transform:translate(-50%,24px);z-index:99999;display:flex;align-items:center;gap:16px;
      padding:14px 26px 14px 18px;border-radius:999px;background:rgba(4,7,12,.92);border:1px solid #7fe7ff;box-shadow:0 0 0 1px rgba(127,231,255,.15),0 10px 50px rgba(0,0,0,.7),0 0 40px rgba(127,231,255,.18);
      font:600 25px/1.2 ui-sans-serif,system-ui,-apple-system,sans-serif;color:#eaf7ff;opacity:0;transition:opacity .35s,transform .35s;max-width:1300px;pointer-events:none}
    #pv-cap.on{opacity:1;transform:translate(-50%,0)}
    #pv-cap .tag{font:700 12px ui-monospace,Menlo,monospace;letter-spacing:.18em;color:#04070c;background:#7fe7ff;border-radius:999px;padding:6px 11px;white-space:nowrap}
    #pv-cap .bars{display:flex;align-items:center;gap:4px;height:30px}
    #pv-cap .bars i{display:block;width:4px;border-radius:2px;background:#7fe7ff;height:8px;animation:pvb 0.9s ease-in-out infinite}
    #pv-cap .bars i:nth-child(2){animation-delay:.12s}#pv-cap .bars i:nth-child(3){animation-delay:.24s}#pv-cap .bars i:nth-child(4){animation-delay:.36s}#pv-cap .bars i:nth-child(5){animation-delay:.48s}
    #pv-cap.done .bars i{animation:none;height:6px;opacity:.5}
    @keyframes pvb{0%,100%{height:6px}50%{height:28px}}
  \`;
  document.head.appendChild(s);
  const d = document.createElement('div');
  d.id = 'pv-cap';
  d.innerHTML = '<span class="tag">__TAG__</span><span class="bars"><i></i><i></i><i></i><i></i><i></i></span><span class="txt"></span>';
  document.body.appendChild(d);
  window.pvSay = async (text) => {
    const t = d.querySelector('.txt');
    t.textContent = '';
    d.classList.remove('done');
    d.classList.add('on');
    const words = text.split(' ');
    for (let i = 0; i < words.length; i++) {
      t.textContent = '__OPEN__' + words.slice(0, i + 1).join(' ') + (i === words.length - 1 ? '__CLOSE__' : '');
      await new Promise((r) => setTimeout(r, 230));
    }
    d.classList.add('done');
  };
  window.pvHide = () => d.classList.remove('on');
})();
`;

const { browser, page } = await open(APP + (LIGHT ? "/?theme=light" : "/?theme=dark")); // the lab's own light mode for bright rooms
await page.waitForSelector("text=Where would you like to start", { timeout: 30000 });
await page.evaluate(OVERLAY.replace("__TAG__", EN ? "VOICE" : "VOZ").replace("__OPEN__", EN ? "“" : "«").replace("__CLOSE__", EN ? "”" : "»"));
await sleep(2500);

const rec = new Recorder(page, join(OUT, "frames-demo"));
await rec.start();
await sleep(6500); // welcome screen with the voice visual

const input = page.locator('input[aria-label="Message for the lab"]').first();
const steps = only === null ? STEPS : [STEPS[only]];
for (const step of steps) {
  await page.evaluate((t) => window.pvSay(t), step.say);
  await sleep(350);
  const sent = rec.now();
  const reply = page.waitForResponse((r) => r.url().includes("/api/command"), { timeout: 90000 });
  await input.fill(step.say, { force: true });
  await input.press("Enter");
  const res = await reply;
  const body = await res.json().catch(() => ({}));
  console.log(`> ${step.say}\n  actions: ${(body.actions ?? []).map((a) => a.tool + JSON.stringify(a.args)).join(" ")}\n  say: ${(body.say ?? "").slice(0, 160)}`);
  const got = rec.now();
  rec.cut(sent + 1.4, got - 0.2); // keep a short "thinking" beat
  if (step.wait === "chart") {
    const t0 = rec.now();
    await page.waitForResponse((r) => r.url().includes("/api/analytics"), { timeout: 90000 }).catch(() => {});
    rec.cut(t0 + 1.5, rec.now() - 0.2);
  }
  await sleep(2200);
  await page.evaluate(() => window.pvHide());
  await sleep(step.hold * 1000 - 2200);
}
await rec.stop();
const dur = rec.writeList(join(OUT, "demo.txt"));
console.log(`demo: ${rec.frames.length} frames, ${dur.toFixed(1)} s`);
await browser.close();
