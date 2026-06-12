import { createServer } from "http";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { resolve, dirname, extname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = resolve(__dir, "../../data");
const PUBLIC_DIR = resolve(__dir, "public");
const PORT = process.env.PORT || 3000;

const PLATFORMS = ["x", "threads", "instagram", "note"];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript",
  ".css":  "text/css",
  ".json": "application/json",
};

createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // GET /api/files?platform=x
  if (url.pathname === "/api/files") {
    const platform = url.searchParams.get("platform") || "x";
    const dir = join(DATA_ROOT, platform);
    try {
      const files = existsSync(dir)
        ? readdirSync(dir)
            .filter(f => f.endsWith(".json"))
            .map(f => {
              const stat = statSync(join(dir, f));
              return { name: f, platform, size: stat.size, mtime: stat.mtime };
            })
            .sort((a, b) => new Date(b.mtime) - new Date(a.mtime))
        : [];
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(files));
    } catch (e) {
      res.writeHead(500); res.end(e.message);
    }
    return;
  }

  // GET /api/file?platform=x&name=foo.json
  if (url.pathname === "/api/file") {
    const platform = url.searchParams.get("platform") || "x";
    const name = url.searchParams.get("name");
    if (!name || name.includes("/") || name.includes("..")) {
      res.writeHead(400); res.end("bad name"); return;
    }
    try {
      const content = readFileSync(join(DATA_ROOT, platform, name), "utf8");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(content);
    } catch {
      res.writeHead(404); res.end("not found");
    }
    return;
  }

  // static files
  const filePath = join(PUBLIC_DIR, url.pathname === "/" ? "index.html" : url.pathname);
  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "text/plain" });
    res.end(content);
  } catch {
    res.writeHead(404); res.end("not found");
  }
}).listen(PORT, () => {
  console.log(`[viewer] http://localhost:${PORT}`);
});
