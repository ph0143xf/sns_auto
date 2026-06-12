// Instagram リール取得 + 音声文字起こし CLI
//
//   node reels_fetch.mjs --account <name> --tags 浮気,浮気発覚 --max 10
//   node reels_fetch.mjs --account shir_aishikana --tags 浮気,浮気発覚 --max 10
//
// 動作:
//   1. 指定ハッシュタグのReelsを取得
//   2. play_count降順でtop-N抽出
//   3. 動画をダウンロード → ffmpegで音声抽出 → whisperで文字起こし
//   4. data/instagram/reels_*.json に保存

import { igFetch, buildHeaders, IG_APP_ID } from "./lib/http.mjs";
import { getAccount } from "./session.mjs";
import { writeFileSync, mkdirSync, createWriteStream, existsSync } from "fs";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";

const execAsync = promisify(exec);
const __dir = dirname(fileURLToPath(import.meta.url));

const WHISPER_BIN = "/Users/momo/Library/Python/3.9/bin/whisper";
const FFMPEG_BIN = "/opt/homebrew/bin/ffmpeg";

const args = process.argv.slice(2);
let accountName = process.env.INSTAGRAM_ACCOUNT || null;
let tags = ["浮気", "浮気発覚", "浮気された"], max = 10, outDir = null, skipTranscribe = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--account") accountName = args[++i];
  else if (args[i] === "--tags") tags = args[++i].split(",");
  else if (args[i] === "--max") max = Number(args[++i]);
  else if (args[i] === "--out") outDir = args[++i];
  else if (args[i] === "--no-transcribe") skipTranscribe = true;
}

if (!accountName) {
  console.error("usage: node reels_fetch.mjs --account NAME [--tags tag1,tag2] [--max 10] [--no-transcribe]");
  process.exit(1);
}

function extractMedias(sections) {
  const out = [];
  for (const s of sections || []) {
    const lc = s.layout_content || {};
    const buckets = [lc.medias, lc.fill_items].filter(Boolean);
    for (const b of buckets) {
      for (const it of b) {
        const m = it.media || it;
        if (m?.code && m.media_type === 2) out.push(m);
      }
    }
  }
  return out;
}

// ハッシュタグからリール取得
async function fetchReelsForTag(tag, limit = 30) {
  console.error(`[fetch] #${tag} ...`);
  const reels = [];
  let maxId = "";
  let page = 0;

  while (reels.length < limit && page < 5) {
    const body = `include_persistent=true&tab=clips&page=${page + 1}&max_id=${encodeURIComponent(maxId)}`;
    const r = await igFetch(accountName, `/api/v1/tags/${encodeURIComponent(tag)}/sections/`, {
      method: "POST", body,
    });
    const sections = r.json?.sections || [];
    const medias = extractMedias(sections);
    if (!medias.length) break;
    reels.push(...medias);
    maxId = r.json?.next_max_id || "";
    if (!maxId) break;
    page++;
    await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
  }
  console.error(`[fetch] #${tag}: ${reels.length} reels`);
  return reels;
}

// 動画ダウンロード
async function downloadVideo(url, destPath, acc) {
  const headers = buildHeaders(acc, { "Accept": "*/*", "Referer": "https://www.instagram.com/" });
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  writeFileSync(destPath, Buffer.from(buf));
}

// 音声文字起こし
async function transcribe(videoPath, tmpBase) {
  const audioPath = tmpBase + ".mp3";
  // 音声抽出
  await execAsync(`${FFMPEG_BIN} -y -i "${videoPath}" -q:a 0 -map a "${audioPath}" 2>/dev/null`);
  // whisper文字起こし
  const { stdout } = await execAsync(
    `${WHISPER_BIN} "${audioPath}" --model small --language Japanese --output_format txt --output_dir "${tmpdir()}" 2>/dev/null`
  );
  // 出力ファイル読み込み
  const { readFileSync, existsSync } = await import("fs");
  const baseName = audioPath.replace(/\.mp3$/, "");
  const txtPath = `${tmpdir()}/${audioPath.split("/").pop().replace(/\.mp3$/, "")}.txt`;
  if (existsSync(txtPath)) {
    const text = readFileSync(txtPath, "utf8").trim();
    return text;
  }
  return null;
}

// メイン
console.error(`[reels] tags=${tags.join(",")} max=${max} account=${accountName}`);
const acc = getAccount(accountName);

// 全タグからリール収集
const allReels = new Map();
for (const tag of tags) {
  const reels = await fetchReelsForTag(tag, 40);
  for (const m of reels) {
    if (!allReels.has(m.pk)) allReels.set(m.pk, { ...m, _source_tag: tag });
  }
  await new Promise(r => setTimeout(r, 1000));
}

// play_count + like_count でソートしてtop-N
const sorted = [...allReels.values()].sort((a, b) => {
  const scoreA = (a.play_count || 0) + (a.like_count || 0) * 10;
  const scoreB = (b.play_count || 0) + (b.like_count || 0) * 10;
  return scoreB - scoreA;
});
const topReels = sorted.slice(0, max);

console.error(`\n[reels] top ${topReels.length} reels (by play+likes):`);
for (const m of topReels) {
  console.error(`  ▶${(m.play_count||0).toLocaleString()} ❤${(m.like_count||0).toLocaleString()} @${m.user?.username} #${m._source_tag}`);
}

// ダウンロード + 文字起こし
const results = [];
for (let i = 0; i < topReels.length; i++) {
  const m = topReels[i];
  const username = m.user?.username || "unknown";
  const code = m.code;
  const videoUrl = m.video_versions?.[0]?.url;
  console.error(`\n[${i + 1}/${topReels.length}] @${username} ▶${(m.play_count||0).toLocaleString()} ❤${(m.like_count||0).toLocaleString()}`);

  let transcript = null;
  if (!skipTranscribe && videoUrl) {
    try {
      const tmpVideo = join(tmpdir(), `ig_reel_${m.pk}.mp4`);
      const tmpBase = join(tmpdir(), `ig_reel_${m.pk}`);
      process.stderr.write("  downloading...");
      await downloadVideo(videoUrl, tmpVideo, acc);
      process.stderr.write(" transcribing...");
      transcript = await transcribe(tmpVideo, tmpBase);
      process.stderr.write(` done (${transcript?.length || 0} chars)\n`);
    } catch (e) {
      process.stderr.write(` error: ${e.message}\n`);
    }
  }

  results.push({
    pk: m.pk,
    code,
    url: `https://www.instagram.com/reel/${code}/`,
    taken_at: m.taken_at,
    date: m.taken_at ? new Date(m.taken_at * 1000).toISOString() : null,
    user: { pk: m.user?.pk, username },
    counts: {
      likes: m.like_count || 0,
      views: m.play_count || 0,
      comments: m.comment_count || 0,
    },
    caption: m.caption?.text || null,
    source_tag: m._source_tag,
    thumbnail: m.image_versions2?.candidates?.[0]?.url || null,
    video_url: videoUrl || null,
    transcript,
  });
}

// 保存
const dir = outDir ? resolve(outDir) : resolve(__dir, "../../data/instagram");
mkdirSync(dir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const file = join(dir, `reels_浮気_${ts}.json`);
writeFileSync(file, JSON.stringify(results, null, 2));
console.error(`\n[reels] saved: ${file}`);
console.log(JSON.stringify(results, null, 2));
