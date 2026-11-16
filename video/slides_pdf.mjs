// Exports the pitch slides as PDF (7 slides), in English and Spanish, dark and light.
// The demo slide uses real screenshots of the running lab.
// Code generated with SI assistance (Claude Code).
//
// Usage: node video/slides_pdf.mjs   (the app must be running on localhost:3977)

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "./lib.mjs";

const HERE = new URL("./", import.meta.url).pathname;
const OUT = join(HERE, "out-pdf");
const APP = process.env.APP_URL || "http://localhost:3977";
const ORDER = ["title", "flames", "problem", "solution", "demo", "sources", "close"];
const TEAM = process.env.TEAM || "Kukulcan.Space"; // team line on the title slide; set TEAM to show names
mkdirSync(OUT, { recursive: true });
mkdirSync(join(HERE, "shots"), { recursive: true });

const browser = await chromium.launch({ headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });

// ---- screenshots of the lab for the demo slide
if (!process.argv.includes("--no-shots")) {
  for (const lang of ["en", "es"]) for (const theme of ["dark", "light"]) {
    const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.5 })).newPage();
    await page.goto(`${APP}/?lang=${lang}&theme=${theme}`);
    await page.waitForSelector('button[role="switch"]');
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    const tabs = page.locator('nav[role="tablist"]').last();
    // Each shot is the stage itself (below the tabs), in the wide shape of the slide's frames.
    const shot = async (n, down = 0) => {
      const m = await page.locator("main").boundingBox();
      const nav = await tabs.boundingBox();
      await page.screenshot({ path: join(HERE, "shots", `${lang}-${theme}-${n}.jpg`), type: "jpeg", quality: 90, clip: { x: m.x, y: nav.y + nav.height + 4 + down, width: m.width, height: m.width / 2.46 } });
    };
    const tab = (i) => tabs.locator("button").nth(i).click();
    await page.locator('[role="dialog"] button.panel').nth(2).click(); // start card: capsule
    await page.waitForTimeout(2500);
    await shot(1);
    await tab(6); // lab: live cabin
    await page.waitForTimeout(10000);
    await shot(2, 150);
    await tab(13); // materials
    await page.waitForTimeout(1200);
    await shot(3);
    await tab(14); // gaps
    await page.waitForTimeout(1200);
    await shot(4);
    await page.context().close();
  }
}

// ---- slides to images, then to PDF
for (const [lang, file] of [["en", "slides.en.html"], ["es", "slides.html"]]) for (const theme of ["dark", "light"]) {
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.5 })).newPage();
  const imgs = [];
  for (const id of ORDER) {
    await page.goto(`file://${join(HERE, file)}?s=${id}&static=1&theme=${theme}&team=${encodeURIComponent(TEAM)}`, { waitUntil: "load" });
    await page.waitForTimeout(id === "demo" ? 900 : 350);
    const img = join(OUT, `${lang}-${theme}-${id}.jpg`);
    await page.screenshot({ path: img, type: "jpeg", quality: 93 });
    imgs.push(img);
  }
  const html = join(OUT, `${lang}-${theme}.html`);
  writeFileSync(html, `<style>@page{size:1600px 900px;margin:0}html,body{margin:0}img{display:block;width:1600px;height:900px;page-break-after:always}</style>${imgs.map((i) => `<img src="file://${i}">`).join("")}`);
  await page.goto(`file://${html}`, { waitUntil: "load" });
  const pdf = join(OUT, `kukulcan-fire-lab-slides-${lang.toUpperCase()}-${theme}.pdf`);
  await page.pdf({ path: pdf, width: "1600px", height: "900px", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  console.log("wrote", pdf);
  await page.context().close();
}
await browser.close();
