#!/usr/bin/env node
// 실행 중인 화면을 직접 열어 검증 증거를 남긴다: 화면 크기·방문 상태·밝기 조합마다 스크린샷과 기계 검사 결과
// 사용법: node scripts/verify-ui.mjs [경로 ...] [--site URL] [--full] [--widths 390,1440] [--visits first,returning] [--themes light,dark] [--text 100,200]
//   기본은 390px 첫 방문 밝은 화면 한 조합만. --full이면 세 축 모두 전체
//   --text 200은 브라우저 글자 200%(글자 토큰이 rem이라 html 글자 크기로 흉내 낸다). --full에도 들어가지 않는다
//   축을 따로 고르면 그 축만 넓힌다. 예) 모바일·데스크톱 × 밝은·밤: --widths 390,1440 --themes light,dark
//   경로를 안 주면 주요 화면 전체
//   결과는 .dev/verify/<시각>/ 에 PNG와 report.md로 남고, 검사에 걸리면 종료 코드 1
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "frontend", "package.json"));
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("playwright가 없다. frontend에서 `npm i -D playwright && npx playwright install chromium` 후 다시 실행한다");
  process.exit(2);
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const site = option("--site", "http://localhost:3000").replace(/\/$/, "");
const optionValues = new Set(["--site", "--widths", "--visits", "--themes", "--text"].map((n) => option(n)).filter(Boolean));
const paths = args.filter((a) => !a.startsWith("--") && !optionValues.has(a));
const routes = paths.length ? paths : ["/", "/scenes", "/scenes/1", "/expressions", "/me", "/me/room", "/start", "/test"];

const full = flag("--full");
const axis = (name, all, base) => {
  const v = option(name);
  return v ? v.split(",").map((x) => x.trim()) : full ? all : base;
};
const widths = axis("--widths", ["390", "1440"], ["390"]).map(Number);
const visits = axis("--visits", ["first", "returning"], ["first"]);
const themes = axis("--themes", ["light", "dark"], ["light"]);
const texts = (option("--text") ?? "100").split(",").map(Number);
const bad = [...widths.filter((w) => !(w > 0)), ...visits.filter((v) => !["first", "returning"].includes(v)), ...themes.filter((t) => !["light", "dark"].includes(t)), ...texts.filter((t) => !(t > 0)).map(String)];
if (bad.length) {
  console.error(`모르는 값: ${bad.join(", ")} (widths는 숫자, visits는 first·returning, themes는 light·dark)`);
  process.exit(2);
}

// 다시 온 사람 판단은 layout의 인라인 스크립트가 localStorage로 한다(nuanci.played, nuanci.cleared)
const storageFor = (visit, theme) => ({
  ...(visit === "returning" ? { "nuanci.played": "1", "nuanci.cleared": '["1"]' } : {}),
  ...(theme === "dark" ? { "nuanci.theme": "dark" } : {}),
});

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = join(root, ".dev", "verify", stamp);
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const rows = [];
const failedRows = [];
let failed = 0;

for (const route of routes) {
  for (const width of widths) {
    for (const visit of visits) {
      for (const theme of themes) {
        for (const text of texts) {
          const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, reducedMotion: "reduce" });
          const storage = storageFor(visit, theme);
          await context.addInitScript((s) => {
            for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
          }, storage);
          const page = await context.newPage();
          const errors = [];
          page.on("pageerror", (e) => errors.push(e.message));
          page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

          const name = `${route.replace(/\W+/g, "_") || "home"}-${width}-${visit}-${theme}${text === 100 ? "" : `-text${text}`}`;
          const problems = [];
          try {
            const res = await page.goto(site + route, { waitUntil: "networkidle", timeout: 30000 });
            if (!res || res.status() >= 400) problems.push(`응답 ${res?.status()}`);
            if (text !== 100) await page.evaluate((t) => (document.documentElement.style.fontSize = `${t}%`), text);
            await page.waitForTimeout(400);
            const m = await page.evaluate(() => ({
              overflow: document.documentElement.scrollWidth - window.innerWidth,
              mains: document.querySelectorAll("main").length,
              h1s: document.querySelectorAll("h1").length,
            }));
            if (m.overflow > 1) problems.push(`가로로 ${m.overflow}px 넘침`);
            if (m.mains !== 1) problems.push(`main ${m.mains}개`);
            if (m.h1s !== 1) problems.push(`h1 ${m.h1s}개`);
            await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true });
          } catch (e) {
            problems.push(`열기 실패: ${e.message.split("\n")[0]}`);
          }
          if (errors.length) problems.push(`콘솔 오류 ${errors.length}개: ${errors[0].slice(0, 120)}`);
          if (problems.length) failed++;
          (problems.length ? failedRows : []).push(`${route} ${width} ${visit} ${theme} 글자${text}%: ${problems.join("; ")}`);
          rows.push(`| ${route} | ${width} | ${visit === "first" ? "첫 방문" : "재방문"} | ${theme === "light" ? "밝은" : "밤"} | ${text}% | ${problems.join("; ") || "통과"} | ${name}.png |`);
          await context.close();
        }
      }
    }
  }
}
await browser.close();

const report = [
  `# 화면 검증 ${stamp}`,
  "",
  `대상: ${site}, 조합 ${rows.length}개, 걸린 조합 ${failed}개`,
  "",
  "| 경로 | 폭 | 방문 | 밝기 | 글자 | 결과 | 스크린샷 |",
  "|---|---|---|---|---|---|---|",
  ...rows,
  "",
].join("\n");
writeFileSync(join(outDir, "report.md"), report);
// 콘솔에는 요약과 걸린 조합만 찍는다. 전체 표는 report.md에 있다
console.log(`조합 ${rows.length}개 중 걸린 조합 ${failed}개`);
for (const r of failedRows) console.log(`- ${r}`);
console.log(`증거: ${outDir}`);
process.exit(failed ? 1 : 0);
