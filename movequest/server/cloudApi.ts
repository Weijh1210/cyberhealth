import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { AIRequestError, extract, inputFor, promptVersion } from "./ai.js";
import { aiStatus } from "./aiConfig.js";
import { cloudStoreConfigured, reserve, saveInterest } from "./cloudStore.js";

type Route = "status" | "ai" | "interest";

function json(status: number, value: unknown, cookie?: string) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(cookie && { "Set-Cookie": cookie }),
    },
  });
}

function identify(request: Request, secret: string) {
  const hash = (purpose: string, value: string) =>
    createHmac("sha256", secret)
      .update(purpose)
      .update(":")
      .update(value)
      .digest("hex");
  const match =
    /(?:^|;\s*)mq_session=([a-f0-9-]{36})\.([a-f0-9]{64})(?:;|$)/.exec(
      request.headers.get("cookie") ?? "",
    );
  const trusted =
    match &&
    timingSafeEqual(
      Buffer.from(hash("browser", match[1]), "hex"),
      Buffer.from(match[2], "hex"),
    );
  const browser = trusted ? match[1] : randomUUID();
  return {
    browser,
    address: hash(
      "address",
      request.headers.get("x-vercel-forwarded-for") ?? "unknown",
    ),
    cookie: trusted
      ? undefined
      : `mq_session=${browser}.${hash("browser", browser)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=31536000`,
    emailKey: (email: string) => hash("interest", email.toLowerCase()),
  };
}

export async function cloudApi(request: Request, route: Route) {
  const storageReady = cloudStoreConfigured();
  const secret = process.env.MOVEQUEST_COOKIE_SECRET;
  if (route === "status") {
    if (request.method !== "GET") return json(405, { error: "请求方法不支持" });
    const status = aiStatus();
    return json(200, {
      ...status,
      ai: status.ai && storageReady && Boolean(secret),
      promptVersion,
    });
  }
  if (request.method !== "POST") return json(405, { error: "请求方法不支持" });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return json(403, { error: "不允许跨站请求" });
  if (!storageReady || !secret || (route === "ai" && !aiStatus().ai))
    return json(503, {
      error: "服务暂不可用，可以在本机整理。",
      code: "unavailable",
    });

  if (Number(request.headers.get("content-length")) > 24000)
    return json(413, { error: "请求内容过大" });
  let value: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 24000)
      return json(413, { error: "请求内容过大" });
    value = JSON.parse(raw);
  } catch {
    return json(400, { error: "请求格式不正确" });
  }

  const identity = identify(request, secret);
  const { cookie } = identity;
  const reply = (status: number, data: unknown) => json(status, data, cookie);
  let input: ReturnType<typeof inputFor> | undefined;
  let interest: { email: string; price: number } | undefined;
  if (route === "ai") {
    try {
      input = inputFor(value);
    } catch (error) {
      return reply(400, {
        error: error instanceof Error ? error.message : "日常描述格式不正确",
      });
    }
  } else {
    const details = value as Record<string, unknown> | null;
    if (
      typeof details?.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim()) ||
      details.email.trim().length > 254 ||
      typeof details.price !== "number" ||
      ![69, 99, 149].includes(details.price) ||
      details.consent !== true
    )
      return reply(400, { error: "请填写有效邮箱并确认登记意向" });
    interest = { email: details.email.trim(), price: details.price };
  }

  try {
    const setting = Number(process.env.MOVEQUEST_AI_DAILY_LIMIT ?? 8);
    const limit =
      route === "ai" && Number.isInteger(setting) && setting > 0 ? setting : 8;
    const at = Date.now();
    const reserved = await reserve({
      kind: route,
      at,
      browser: identity.browser,
      address: identity.address,
      dailyLimit: limit,
    });
    if (reserved !== "ok") {
      const message =
        reserved === "rate_limited"
          ? "请求过于频繁，请稍后再试。"
          : "今日请求额度已用完，可以在本机整理。";
      return reply(429, { error: message, code: reserved });
    }

    if (input) {
      const result = await extract(input);
      return reply(200, { ...result, cached: false, promptVersion });
    }
    if (interest) {
      await saveInterest(identity.emailKey(interest.email), {
        ...interest,
        consentVersion: "plus-interest-v1",
        at: new Date(at).toISOString(),
      });
      return reply(200, { registered: true, payment: false });
    }
    return reply(404, { error: "接口不存在" });
  } catch (error) {
    if (error instanceof AIRequestError) {
      return reply(error.status === 429 ? 429 : 503, {
        error: error.message,
        code: error.code,
      });
    }
    console.error("MoveQuest request failed", {
      route,
      kind: error instanceof Error ? error.name : "unknown",
    });
    return reply(503, {
      error: "服务暂不可用，请稍后重试。",
      code: "unavailable",
    });
  }
}
