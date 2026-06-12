#!/usr/bin/env node
// 使い方: node draft/recent.mjs [時間数(デフォルト12)]

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const hours = parseInt(process.argv[2] || "12");
const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
const file = resolve(dirname(fileURLToPath(import.meta.url)), "uwaki_happy_投稿ストック.md");

const lines = readFileSync(file, "utf8").split("\n");
const blocks = [];
let current = null;

for (const line of lines) {
  const m = line.match(/^## \[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]/);
  if (m) {
    if (current) blocks.push(current);
    current = { date: new Date(m[1]), lines: [line] };
  } else if (current) {
    current.lines.push(line);
  }
}
if (current) blocks.push(current);

const recent = blocks.filter(b => b.date >= cutoff);

if (recent.length === 0) {
  console.log(`過去${hours}時間以内に作成した投稿はありません。`);
} else {
  console.log(`過去${hours}時間以内に作成した投稿: ${recent.length}件\n`);
  recent.forEach(b => console.log(b.lines.join("\n") + "\n"));
}
