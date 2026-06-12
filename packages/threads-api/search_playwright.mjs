// Threads 検索スクレイプ CLI (Playwright)
//
//   node search_playwright.mjs --account <name> --q "恋愛" --max 100
//   node search_playwright.mjs --account <name> --q "恋愛" --max 100 --out /path/to/dir
//
import { chromium } from "playwright";
import { getAccount } from "./session.mjs";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
let accountName = process.env.THREADS_ACCOUNT || null;
let query = null, max = 100, headed = false, outDir = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--account") { accountName = args[++i]; continue; }
  if (args[i] === "--q") { query = args[++i]; continue; }
  if (args[i] === "--max") { max = Number(args[++i]); continue; }
  if (args[i] === "--headed") { headed = true; continue; }
  if (args[i] === "--out") { outDir = args[++i]; continue; }
}

if (!accountName || !query) {
  console.error('usage: node search_playwright.mjs --account <name> --q "<keyword>" [--max 100] [--out <dir>]');
  process.exit(1);
}

const acc = getAccount(accountName);

function parseCookies(cookieStr) {
  return cookieStr.split(";").flatMap(s => {
    const eq = s.indexOf("=");
    if (eq < 0) return [];
    const name = s.slice(0, eq).trim();
    let value = s.slice(eq + 1).trim().replace(/^"|"$/g, "")
      .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
    if (!name || !value) return [];
    return [
      { name, value, domain: ".threads.com", path: "/", httpOnly: false, secure: true, sameSite: "None" },
      { name, value, domain: ".instagram.com", path: "/", httpOnly: false, secure: true, sameSite: "None" },
    ];
  });
}

function extractPosts(obj, posts, depth = 0) {
  if (depth > 50 || obj == null) return;
  if (Array.isArray(obj)) { for (const x of obj) extractPosts(x, posts, depth + 1); return; }
  if (typeof obj !== "object") return;
  if (typeof obj.pk === "string" && /^\d+$/.test(obj.pk)) {
    const isPost = "like_count" in obj || "text_post_app_info" in obj || "caption" in obj;
    if (isPost && !posts.has(obj.pk)) {
      const text = obj.caption?.text || obj.text_post_app_info?.text_with_entities?.text || null;
      const username = obj.user?.username || "";
      const code = obj.code || null;
      posts.set(obj.pk, {
        pk: obj.pk, code,
        taken_at: obj.taken_at || null,
        text,
        counts: {
          likes: obj.like_count ?? 0,
          replies: obj.text_post_app_info?.direct_reply_count ?? 0,
          reposts: obj.text_post_app_info?.repost_count ?? 0,
          quotes: obj.text_post_app_info?.quote_count ?? 0,
          views: obj.view_count ?? null,
        },
        has_media: !!(obj.image_versions2?.candidates?.length || obj.video_versions?.length),
        user: obj.user ? { pk: obj.user.pk, username } : null,
        url: code && username ? `https://www.threads.com/@${username}/post/${code}` : null,
      });
    }
  }
  for (const k of Object.keys(obj)) extractPosts(obj[k], posts, depth + 1);
}

const browser = await chromium.launch({ headless: !headed });
const ctx = await browser.newContext();
await ctx.addCookies(parseCookies(acc.cookies));
const page = await ctx.newPage();

const posts = new Map();
let graphqlCount = 0;

page.on("response", async res => {
  const url = res.url();
  if (!url.includes("/api/graphql") && !url.includes("/graphql/query")) return;
  try {
    const json = await res.json();
    const before = posts.size;
    extractPosts(json, posts);
    if (posts.size > before) {
      process.stderr.write(`\r  posts=${posts.size}  graphql=${++graphqlCount}  `);
    }
  } catch {}
});

const encodedQ = encodeURIComponent(query);
console.error(`[search] account=${accountName} q="${query}" max=${max}`);
await page.goto(`https://www.threads.com/search?q=${encodedQ}&serp_type=default`, {
  waitUntil: "domcontentloaded", timeout: 30000,
});
await page.waitForTimeout(3000);

// スクロールして追加読み込み
let scrolls = 0, prevSize = 0;
while (posts.size < max && scrolls < 60) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1200);
  scrolls++;
  if (posts.size === prevSize && scrolls % 5 === 0) break; // 5回変化なしで終了
  prevSize = posts.size;
}

await browser.close();
console.error(`\n[search] done. posts=${posts.size} scrolls=${scrolls}`);

const result = [...posts.values()].slice(0, max);
console.log(JSON.stringify(result, null, 2));

// 保存
const dir = outDir
  ? resolve(outDir)
  : resolve(__dir, "../../data/threads");
mkdirSync(dir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const safe = query.replace(/[^A-Za-z0-9぀-鿿]+/g, "_").slice(0, 40);
const file = join(dir, `search_${safe}_${ts}.json`);
writeFileSync(file, JSON.stringify(result, null, 2));
console.error(`[search] saved: ${file}`);
