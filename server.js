const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "server-data");
const DATA_FILE = path.join(DATA_DIR, "leaderboard.json");
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT) || 8770;
const COOLDOWN_MS = 10 * 60 * 1000;
const POINTS_BY_DIFFICULTY = {
  calme: 1,
  rythme: 2,
  defi: 3,
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
};

const sseClients = new Set();
let store = loadStore();

function cleanNickname(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .slice(0, 18);
}

function cleanId(value) {
  const id = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_.:-]/g, "")
    .slice(0, 80);
  return id || crypto.randomUUID();
}

function cleanShortText(value, maxLength = 64) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .slice(0, maxLength);
}

function pointsFor({ difficulty, grade }) {
  const base = POINTS_BY_DIFFICULTY[difficulty] || 1;
  return base + (grade === "4e" ? 1 : 0);
}

function createEmptyStore() {
  return {
    entries: {},
    updatedAt: Date.now(),
  };
}

function normalizeStore(raw) {
  const normalized = createEmptyStore();
  if (!raw || typeof raw !== "object" || !raw.entries || typeof raw.entries !== "object") return normalized;

  for (const [id, entry] of Object.entries(raw.entries)) {
    if (!entry || typeof entry !== "object") continue;
    const safeId = cleanId(id);
    const nickname = cleanNickname(entry.nickname);
    if (!nickname) continue;
    normalized.entries[safeId] = {
      nickname,
      total: Number(entry.total) || 0,
      updatedAt: Number(entry.updatedAt) || Date.now(),
      lastGame: cleanShortText(entry.lastGame),
      lastGameId: cleanShortText(entry.lastGameId, 48),
      cooldowns: entry.cooldowns && typeof entry.cooldowns === "object" ? entry.cooldowns : {},
    };
  }

  normalized.updatedAt = Number(raw.updatedAt) || Date.now();
  return normalized;
}

function loadStore() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return normalizeStore(JSON.parse(raw));
  } catch {
    return createEmptyStore();
  }
}

function saveStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tempFile = `${DATA_FILE}.${process.pid}.tmp`;
  store.updatedAt = Date.now();
  fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), "utf8");
  fs.renameSync(tempFile, DATA_FILE);
}

function sortedEntries() {
  return Object.entries(store.entries)
    .map(([id, entry]) => ({ id, ...entry, total: Number(entry.total) || 0 }))
    .sort((a, b) => b.total - a.total || String(a.nickname || "").localeCompare(String(b.nickname || "")));
}

function ensureEntry(id, nickname) {
  const current = store.entries[id] || {};
  store.entries[id] = {
    nickname,
    total: Number(current.total) || 0,
    updatedAt: Number(current.updatedAt) || Date.now(),
    lastGame: current.lastGame || "",
    lastGameId: current.lastGameId || "",
    cooldowns: current.cooldowns && typeof current.cooldowns === "object" ? current.cooldowns : {},
  };
  return store.entries[id];
}

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra,
  };
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, corsHeaders({
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  }));
  res.end(body);
}

function sendText(res, statusCode, body) {
  res.writeHead(statusCode, corsHeaders({
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  }));
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function leaderboardPayload() {
  return { entries: sortedEntries(), updatedAt: store.updatedAt };
}

function writeScoreEvent(res) {
  res.write(`data: ${JSON.stringify(leaderboardPayload())}\n\n`);
}

function broadcastLeaderboard() {
  for (const client of sseClients) {
    writeScoreEvent(client.res);
  }
}

function handleScoreEvents(req, res) {
  res.writeHead(200, corsHeaders({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  }));
  const client = {
    res,
    keepAlive: setInterval(() => res.write(": keep-alive\n\n"), 25000),
  };
  sseClients.add(client);
  writeScoreEvent(res);

  req.on("close", () => {
    clearInterval(client.keepAlive);
    sseClients.delete(client);
  });
}

async function handleScoreApi(req, res, pathname) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (req.method === "GET" && pathname === "/api/score/health") {
    sendJson(res, 200, { ok: true, mode: "server" });
    return;
  }

  if (req.method === "GET" && pathname === "/api/score/leaderboard") {
    sendJson(res, 200, leaderboardPayload());
    return;
  }

  if (req.method === "GET" && pathname === "/api/score/events") {
    handleScoreEvents(req, res);
    return;
  }

  if (req.method === "POST" && pathname === "/api/score/player") {
    const body = await readJsonBody(req);
    const id = cleanId(body.id);
    const nickname = cleanNickname(body.nickname);
    if (nickname) {
      ensureEntry(id, nickname);
      saveStore();
      broadcastLeaderboard();
    }
    sendJson(res, 200, {
      player: { id, nickname },
      ...leaderboardPayload(),
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/score/award") {
    const body = await readJsonBody(req);
    if (!body.success) {
      sendJson(res, 200, { awarded: false, points: 0, reason: "failed", ...leaderboardPayload() });
      return;
    }

    const id = cleanId(body.id);
    const nickname = cleanNickname(body.nickname);
    if (!nickname) {
      sendJson(res, 400, { awarded: false, points: 0, reason: "missingPlayer", ...leaderboardPayload() });
      return;
    }

    const gameId = cleanShortText(body.gameId, 48);
    const grade = cleanShortText(body.grade, 8);
    const difficulty = cleanShortText(body.difficulty, 16);
    const now = Date.now();
    const entry = ensureEntry(id, nickname);
    const cooldownKey = `${gameId}:${grade}:${difficulty}`;
    const nextAvailableAt = Number(entry.cooldowns[cooldownKey]) || 0;

    if (now < nextAvailableAt) {
      sendJson(res, 200, {
        awarded: false,
        points: 0,
        reason: "cooldown",
        nextAvailableAt,
        ...leaderboardPayload(),
      });
      return;
    }

    const points = pointsFor({ difficulty, grade });
    const nextCooldown = now + COOLDOWN_MS;
    store.entries[id] = {
      ...entry,
      nickname,
      total: (Number(entry.total) || 0) + points,
      updatedAt: now,
      lastGame: cleanShortText(body.gameTitle || gameId),
      lastGameId: gameId,
      cooldowns: {
        ...entry.cooldowns,
        [cooldownKey]: nextCooldown,
      },
    };
    saveStore();
    broadcastLeaderboard();
    sendJson(res, 200, {
      awarded: true,
      points,
      reason: "awarded",
      nextAvailableAt: nextCooldown,
      ...leaderboardPayload(),
    });
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found" });
}

function isPrivatePath(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/").toLowerCase();
  return normalized === ".git" || normalized.startsWith(".git/") || normalized === "server-data" || normalized.startsWith("server-data/");
}

function serveStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendText(res, 405, "Method not allowed");
    return;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  } catch {
    sendText(res, 400, "Bad request");
    return;
  }

  const cleanPath = decodedPath.replace(/^[/\\]+/, "");
  const filePath = path.join(ROOT, cleanPath);
  const relativePath = path.relative(ROOT, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath) || isPrivatePath(relativePath)) {
    sendText(res, 404, "Not found");
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      sendText(res, 404, "Not found");
      return;
    }

    const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, corsHeaders({
      "Content-Type": type,
      "Content-Length": stat.size,
      "Cache-Control": "no-cache",
    }));
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });
}

function localNetworkUrls() {
  const urls = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const info of entries || []) {
      if (info.family === "IPv4" && !info.internal) {
        urls.push(`http://${info.address}:${PORT}/index.html`);
      }
    }
  }
  return urls;
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (pathname.startsWith("/api/score/")) {
    handleScoreApi(req, res, pathname).catch((error) => {
      console.error(error);
      sendJson(res, 500, { ok: false, error: "Server error" });
    });
    return;
  }
  serveStatic(req, res, pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`Keyboard Quest server ready on http://127.0.0.1:${PORT}/index.html`);
  for (const url of localNetworkUrls()) {
    console.log(`Classroom URL: ${url}`);
  }
});
