import { aiConfiguration, aiStatus } from "./aiConfig";
import { createServer } from "node:http";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile, rename, stat } from "node:fs/promises";
import { dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AIRequestError,
  cacheKey,
  extract,
  inputFor,
  promptVersion,
} from "./ai";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = process.env.MOVEQUEST_DATA_DIR || resolve(root, "server/data");
await mkdir(dataDir, { recursive: true });
let secret = process.env.MOVEQUEST_COOKIE_SECRET;
if (!secret) {
  try {
    secret = await readFile(resolve(dataDir, "secret"), "utf8");
  } catch {
    secret = randomUUID() + randomUUID();
    await writeFile(resolve(dataDir, "secret"), secret, { mode: 0o600 });
  }
}
const sign = (v: string) =>
  createHmac("sha256", secret!).update(v).digest("hex");
const valid = (id: string, signature: string) => {
  const a = Buffer.from(sign(id)),
    b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
};
type Ledger = {
  users: Record<
    string,
    {
      day: string;
      requests: number;
      inputTokens: number;
      outputTokens: number;
      estimatedCost: number;
    }
  >;
  interests: {
    id: string;
    email: string;
    price: number;
    consentVersion: string;
    at: string;
  }[];
};
let ledger: Ledger;
try {
  ledger = JSON.parse(await readFile(resolve(dataDir, "ledger.json"), "utf8"));
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  ledger = { users: {}, interests: [] };
}
let writes = Promise.resolve();
function save() {
  const snapshot = JSON.stringify(ledger);
  writes = writes
    .catch(() => {})
    .then(async () => {
      await writeFile(resolve(dataDir, "ledger.tmp"), snapshot, {
        mode: 0o600,
      });
      await rename(
        resolve(dataDir, "ledger.tmp"),
        resolve(dataDir, "ledger.json"),
      );
    });
  return writes;
}
const cache = new Map<
  string,
  { at: number; value: Awaited<ReturnType<typeof extract>> }
>();
const ipRate = new Map<string, { at: number; count: number }>();
const inflight = new Set<string>();
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const json = (status: number, value: unknown) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(value));
  };
  try {
    if (url.pathname.startsWith("/api/")) {
      if (req.method === "GET" && url.pathname === "/api/status") {
        json(200, {
          ...aiStatus(),
          promptVersion,
        });
        return;
      }
      if (req.method !== "POST") {
        json(405, { error: "请求方法不支持" });
        return;
      }
      // Same-origin browser writes only; requests without an Origin are local CLI clients.
      if (
        req.headers.origin &&
        new URL(req.headers.origin).host !== req.headers.host
      ) {
        json(403, { error: "不允许跨站请求" });
        return;
      }
      const ip = req.socket.remoteAddress ?? "local";
      let rate = ipRate.get(ip);
      if (!rate || Date.now() - rate.at > 3600000) {
        rate = { at: Date.now(), count: 0 };
        ipRate.set(ip, rate);
      }
      if (++rate.count > 60) {
        json(429, { error: "请求过于频繁，请稍后再试" });
        return;
      }
      for (const [key, value] of ipRate)
        if (Date.now() - value.at > 3600000) ipRate.delete(key);
      const match = /(?:^|;\s*)mq_session=([a-f0-9-]+)\.([a-f0-9]+)/.exec(
        req.headers.cookie ?? "",
      );
      const user = match && valid(match[1], match[2]) ? match[1] : randomUUID();
      if (!match || user !== match[1])
        res.setHeader(
          "Set-Cookie",
          `mq_session=${user}.${sign(user)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
        );
      let body = "";
      for await (const chunk of req) {
        body += chunk.toString();
        if (Buffer.byteLength(body) > 24000) {
          json(413, { error: "请求内容过大" });
          return;
        }
      }
      const value = JSON.parse(body);
      if (url.pathname === "/api/interest") {
        if (
          typeof value.email !== "string" ||
          value.email.length > 254 ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) ||
          ![69, 99, 149].includes(value.price) ||
          value.consent !== true
        ) {
          json(400, { error: "请填写有效邮箱并确认登记意向" });
          return;
        }
        const existing = ledger.interests.find(
          (i) => i.email.toLowerCase() === value.email.trim().toLowerCase(),
        );
        if (!existing)
          ledger.interests.push({
            id: randomUUID(),
            email: value.email.trim(),
            price: value.price,
            consentVersion: "plus-interest-v1",
            at: new Date().toISOString(),
          });
        await save();
        json(200, { registered: true, payment: false });
        return;
      }
      if (url.pathname === "/api/life/extract") {
        if (!aiConfiguration().key) {
          json(503, {
            error:
              "AI 未配置，请在后端设置 OPENROUTER_API_KEY，或使用手动录入。",
          });
          return;
        }
        const input = inputFor(value),
          key = `${user}:${cacheKey(input)}`,
          cached = cache.get(key);
        if (cached && Date.now() - cached.at < 86400000) {
          json(200, { ...cached.value, cached: true, promptVersion });
          return;
        }
        const day = new Date().toISOString().slice(0, 10);
        const usage =
          ledger.users[user]?.day === day
            ? ledger.users[user]
            : {
                day,
                requests: 0,
                inputTokens: 0,
                outputTokens: 0,
                estimatedCost: 0,
              };
        ledger.users[user] = usage;
        if (
          usage.requests >= Number(process.env.MOVEQUEST_AI_DAILY_LIMIT ?? 8)
        ) {
          json(429, {
            error:
              "这个浏览器已达到 MoveQuest 今日 AI 次数上限。北京时间上午 8 点重置，期间可手动编辑。",
          });
          return;
        }
        if (inflight.has(user)) {
          json(429, { error: "上一次理解仍在进行，请稍候。" });
          return;
        }
        inflight.add(user);
        try {
          usage.requests++;
          await save();
          const result = await extract(input);
          usage.inputTokens += result.inputTokens;
          usage.outputTokens += result.outputTokens;
          usage.estimatedCost += result.estimatedCost ?? 0;
          await save();
          for (const [k, c] of cache)
            if (Date.now() - c.at > 86400000) cache.delete(k);
          if (cache.size > 500) cache.delete(cache.keys().next().value!);
          cache.set(key, { at: Date.now(), value: result });
          json(200, { ...result, cached: false, promptVersion });
        } finally {
          inflight.delete(user);
        }
        return;
      }
      json(404, { error: "接口不存在" });
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      json(405, { error: "请求方法不支持" });
      return;
    }
    const dist = resolve(root, "dist"),
      relative = decodeURIComponent(url.pathname).replace(/^\/+/, ""),
      candidate = resolve(dist, relative);
    if (!candidate.startsWith(dist + "/") && candidate !== dist) {
      json(403, { error: "无效路径" });
      return;
    }
    let target = candidate;
    try {
      if (!(await stat(target)).isFile()) target = resolve(dist, "index.html");
    } catch {
      if (extname(relative)) {
        json(404, { error: "文件不存在" });
        return;
      }
      target = resolve(dist, "index.html");
    }
    const data = await readFile(target);
    res.writeHead(200, {
      "Content-Type":
        (
          {
            ".html": "text/html; charset=utf-8",
            ".js": "text/javascript",
            ".css": "text/css",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".webmanifest": "application/manifest+json",
          } as Record<string, string>
        )[extname(target)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch (e) {
    if (e instanceof AIRequestError) {
      json(e.status === 429 ? 429 : 503, { error: e.message, code: e.code });
      return;
    }
    const message = e instanceof Error ? e.message : "请求失败";
    json(400, {
      error: message.includes("ENOENT")
        ? "请先构建应用，或检查服务端目录配置。"
        : message.includes("JSON")
          ? "返回格式无效，请手动填写。"
          : message,
    });
  }
});
server.requestTimeout = 25000;
server.listen(
  Number(process.env.PORT ?? 5176),
  process.env.HOST ?? "127.0.0.1",
  () =>
    process.stdout.write(
      `MoveQuest app + API listening on ${(server.address() as { port: number }).port}\n`,
    ),
);
