import { avoidArms, avoidLegs } from "../src/life/immediate";
import { validPlan, type Cue } from "../src/life/context";
import { approvedPlan } from "../src/life/discoveries";
import type { Category } from "../src/life/model";
import {
  aiConfiguration,
  AI_TIMEOUT_MS,
  FREE_PROVIDER_POLICY,
  OPENROUTER_URL,
} from "./aiConfig";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { validateDelta, type LifeDelta } from "../src/life/model";
export type ExtractInput = {
  text: string;
  replyLanguage?: "en";
  latestMessage?: string;
  clarifications?: { question: string; answer: string }[];
  existing: {
    locations: { id: string; name: string; category: string }[];
    cues?: {
      id: string;
      kind: string;
      locationId: string;
      evidence?: string;
    }[];
    events: {
      id: string;
      locationId: string;
      title: string;
      start: string | null;
      end: string | null;
      recurrence: string;
    }[];
  };
};
export const promptVersion = "7.2.2";
export type ModelAttempt = {
  model: string;
  status: number | null;
  outcome: string;
};
export class AIRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly code: string,
    public readonly attempts: ModelAttempt[] = [],
  ) {
    super(message);
    this.name = "AIRequestError";
  }
}
function requestError(
  status: number,
  body: unknown,
  attempts: ModelAttempt[],
  headers: Headers,
) {
  // Classify upstream diagnostics without returning arbitrary provider messages or headers.
  const info = body as {
    error?: { message?: unknown; metadata?: unknown };
  } | null;
  const diagnostic = JSON.stringify(info?.error ?? {}).toLowerCase();
  if (status === 401 || status === 403)
    return new AIRequestError(
      "OpenRouter 认证或权限检查失败，请检查后端 Key",
      status,
      "authentication",
      attempts,
    );
  if (status === 402)
    return new AIRequestError(
      "免费调用被账户额度限制阻断；不会调用付费模型",
      status,
      "account_limit",
      attempts,
    );
  if (
    status === 429 &&
    /openrouter_free_tier_daily|free.model.daily|free-models-per-day|daily.{0,30}(limit|quota)|account.{0,30}(limit|quota)|quota.{0,30}exceed/.test(
      diagnostic,
    )
  )
    return new AIRequestError(
      "OpenRouter 账户今天的免费额度已用完。额度在北京时间每天上午 8 点重置。",
      status,
      "account_limit",
      attempts,
    );
  if (
    status === 429 &&
    diagnostic.includes("openrouter_free_tier_per_minute")
  ) {
    const rawReset = headers.get("x-ratelimit-reset");
    const reset = rawReset && /^\d{13}$/.test(rawReset) ? Number(rawReset) : 0;
    const rawRetry = headers.get("retry-after");
    const retry = rawRetry && /^\d{1,3}$/.test(rawRetry) ? Number(rawRetry) : 0;
    const wait =
      reset > Date.now() ? Math.ceil((reset - Date.now()) / 1000) : retry;
    return new AIRequestError(
      `OpenRouter 账户达到每分钟免费调用上限，${wait > 0 && wait <= 120 ? `约 ${wait} 秒后可重试` : "请约 1 分钟后重试"}。`,
      status,
      "account_minute_limit",
      attempts,
    );
  }
  if (status === 429)
    return new AIRequestError(
      "免费模型限流，有限免费候选仍不可用，请稍后重试或手动填写",
      status,
      "rate_limited",
      attempts,
    );
  return new AIRequestError(
    "模型服务暂时不可用，请手动填写或稍后重试；不会调用付费模型",
    status,
    "unavailable",
    attempts,
  );
}
export function inputFor(value: unknown): ExtractInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("请求结构无效");
  const v = value as Record<string, unknown>;
  if (
    Object.keys(v).some(
      (k) =>
        ![
          "text",
          "existing",
          "clarifications",
          "latestMessage",
          "replyLanguage",
        ].includes(k),
    ) ||
    (v.replyLanguage !== undefined && v.replyLanguage !== "en") ||
    typeof v.text !== "string" ||
    !v.text.trim() ||
    v.text.length > 4000
  )
    throw Error("请填写 1–4000 字的生活描述");
  const e = v.existing as ExtractInput["existing"];
  if (
    !e ||
    !Array.isArray(e.locations) ||
    !Array.isArray(e.events) ||
    e.locations.length > 40 ||
    e.events.length > 100 ||
    (e.cues !== undefined && (!Array.isArray(e.cues) || e.cues.length > 40))
  )
    throw Error("已有资料过大或无效");
  // Sanitize compact context instead of forwarding arbitrary client fields.
  const locations = e.locations.map((l) => ({
    id: String(l.id).slice(0, 80),
    name: String(l.name).slice(0, 60),
    category: String(l.category).slice(0, 20),
  }));
  const events = e.events.map((x) => ({
    id: String(x.id).slice(0, 80),
    locationId: String(x.locationId).slice(0, 80),
    title: String(x.title).slice(0, 160),
    start: x.start === null ? null : String(x.start).slice(0, 5),
    end: x.end === null ? null : String(x.end).slice(0, 5),
    recurrence: String(x.recurrence).slice(0, 16),
  }));
  const latestMessage = v.latestMessage;
  if (
    latestMessage !== undefined &&
    (typeof latestMessage !== "string" ||
      !latestMessage.trim() ||
      !(v.text as string).endsWith(latestMessage))
  )
    throw Error("最新消息无效");
  const clarifications = v.clarifications;
  if (
    clarifications !== undefined &&
    (!Array.isArray(clarifications) ||
      clarifications.length > 8 ||
      clarifications.some(
        (turn) =>
          !turn ||
          typeof turn.question !== "string" ||
          turn.question.length > 300 ||
          typeof turn.answer !== "string" ||
          !turn.answer.trim() ||
          !(v.text as string).includes(turn.answer),
      ))
  )
    throw Error("对话上下文无效");
  return {
    text: v.text,
    ...(v.replyLanguage === "en" ? { replyLanguage: "en" as const } : {}),
    ...(latestMessage ? { latestMessage } : {}),
    existing: {
      locations,
      events,
      ...(e.cues?.length
        ? {
            cues: e.cues.map((x) => ({
              id: String(x.id).slice(0, 80),
              kind: String(x.kind).slice(0, 40),
              evidence:
                typeof x.evidence === "string"
                  ? x.evidence.slice(0, 300)
                  : undefined,
              locationId: String(x.locationId).slice(0, 80),
            })),
          }
        : {}),
    },
    ...(Array.isArray(clarifications) && clarifications.length
      ? {
          clarifications: clarifications.map(({ question, answer }) => ({
            question,
            answer,
          })),
        }
      : {}),
  };
}
export const cacheKey = (
  input: ExtractInput,
  env: NodeJS.ProcessEnv = process.env,
) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        promptVersion,
        models: aiConfiguration(env).models,
        endpoint: OPENROUTER_URL,
        ...input,
      }),
    )
    .digest("hex");
export async function extract(
  input: ExtractInput,
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
): Promise<{
  delta: LifeDelta;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number | null;
  provider: string;
  attempts: ModelAttempt[];
}> {
  const config = aiConfiguration(env);
  if (!config.key)
    throw Error("AI 未配置，请在后端设置 OPENROUTER_API_KEY，或使用手动录入");
  const base = await readFile(
    new URL("./prompts/extract.txt", import.meta.url),
    "utf8",
  );
  const update = input.existing.locations.length
    ? await readFile(new URL("./prompts/update.txt", import.meta.url), "utf8")
    : "";
  const attempts: ModelAttempt[] = [];
  const signal = AbortSignal.timeout(AI_TIMEOUT_MS);
  type ProviderData = {
    error?: unknown;
    choices?: { finish_reason?: string; message?: { content?: unknown } }[];
    usage?: {
      cost?: number;
      prompt_tokens?: number;
      completion_tokens?: number;
    };
  };
  let data: ProviderData | undefined;
  let usedModel = config.model;
  for (const [index, model] of config.models.entries()) {
    let response: Response;
    try {
      response = await fetcher(config.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.key}`,
          "Content-Type": "application/json",
          "X-OpenRouter-Title": "MoveQuest 7.1",
        },
        signal,
        body: JSON.stringify({
          model,
          provider: FREE_PROVIDER_POLICY,
          stream: false,
          messages: [
            {
              role: "system",
              content:
                base +
                "\n" +
                update +
                (input.replyLanguage === "en"
                  ? "\nUse English for questions and new event titles. Keep place names as written by the user. All evidence must stay verbatim in the original language."
                  : ""),
            },
            { role: "user", content: JSON.stringify(input) },
          ],
          response_format: { type: "json_object" },
          max_tokens: [
            "liquid/lfm-3-1.7b:free",
            "baidu/ernie-5.5-flash-preview:free",
          ].includes(model)
            ? 8192
            : 4096,
          ...(![
            "liquid/lfm-3-1.7b:free",
            "baidu/ernie-5.5-flash-preview:free",
          ].includes(model)
            ? { reasoning: { enabled: false } }
            : {}),
          temperature: 0,
        }),
      });
    } catch {
      attempts.push({
        model,
        status: null,
        outcome: signal.aborted ? "timeout" : "network_error",
      });
      // Never spin on network failures or exceed the single total request deadline.
      throw new AIRequestError(
        "模型网络连接失败或超时，请稍后重试或手动填写",
        null,
        "network_error",
        attempts,
      );
    }
    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      if (response.ok)
        throw new AIRequestError(
          "模型返回格式无效，请手动填写",
          response.status,
          "invalid_output",
          [
            ...attempts,
            { model, status: response.status, outcome: "invalid_output" },
          ],
        );
      raw = null;
    }
    const embeddedCode = (raw as { error?: { code?: unknown } })?.error?.code;
    const status =
      response.ok && embeddedCode
        ? Number(embeddedCode) || 502
        : response.status;
    if (!response.ok || (raw as { error?: unknown })?.error) {
      attempts.push({ model, status, outcome: "upstream_error" });
      const error = requestError(status, raw, attempts, response.headers);
      const retryable =
        error.code !== "authentication" &&
        error.code !== "account_limit" &&
        error.code !== "account_minute_limit" &&
        (status === 404 || status === 429 || status >= 500);
      if (retryable && index + 1 < config.models.length && !signal.aborted)
        continue;
      throw error;
    }
    data = raw as ProviderData;
    usedModel = model;
    attempts.push({
      model,
      status: response.status,
      outcome: "response_received",
    });
    break;
  }
  if (!data)
    throw new AIRequestError(
      "没有可用的免费模型",
      null,
      "unavailable",
      attempts,
    );
  if (data?.choices?.[0]?.finish_reason === "length")
    throw Error("模型输出超过长度限制，请分段描述生活日常");
  if (typeof data?.usage?.cost === "number" && data.usage.cost !== 0)
    throw Error("免费模型返回了非零费用，已拒绝结果；不会自动重试");
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length > 32000)
    throw Error("模型返回了无效资料，请手动填写");
  const parsed = JSON.parse(content);
  // Some JSON-mode providers wrap each question in a single-field object.
  if (Array.isArray(parsed?.questions)) {
    parsed.questions = parsed.questions.map((item: unknown) => {
      if (
        item &&
        typeof item === "object" &&
        Object.keys(item).length === 1 &&
        "question" in item &&
        typeof item.question === "string"
      )
        return item.question;
      return item;
    });
  }
  if (Array.isArray(parsed?.locations)) {
    parsed.locations = parsed.locations.map((item: unknown) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return item;
      const place = item as Record<string, unknown>;
      // Metadata is ours. Continue to validate the actual name, category, and ID.
      const { id, name, category } = place;
      return { id, name, category, source: "ai", confirmed: false };
    });
  }
  // JSON-mode models occasionally put a single plan beside the cue array.
  // Attach it only when all compatible candidate cues point to one place.
  if (validPlan(parsed?.plan) && Array.isArray(parsed.cues)) {
    const places = new Map<string, Category>(
      input.existing.locations.map((l) => [l.id, l.category as Category]),
    );
    if (Array.isArray(parsed.locations)) {
      for (const l of parsed.locations)
        if (l && typeof l.id === "string") places.set(l.id, l.category);
    }
    const candidates = parsed.cues.filter(
      (cue: Cue) =>
        cue &&
        !cue.uncertain &&
        !cue.plan &&
        approvedPlan(
          { ...cue, plan: parsed.plan },
          places.get(cue.locationId) ?? "other",
        ),
    );
    if (
      candidates.length &&
      new Set(candidates.map((c: Cue) => c.locationId)).size === 1
    )
      candidates[0].plan = parsed.plan;
    delete parsed.plan;
  }
  const delta = validateDelta(parsed);
  const ids = new Set([
    ...input.existing.locations.map((l) => l.id),
    ...delta.locations.map((l) => l.id),
  ]);
  if (delta.events.some((e) => !ids.has(e.locationId)))
    throw Error("模型返回了不存在的地点引用");
  if (delta.events.some((e) => !e.evidence || !input.text.includes(e.evidence)))
    throw Error("模型返回的事件缺少原文依据，请手动核对");
  if (delta.constraints) {
    // Existing restrictions can only be relaxed through an explicit user edit.
    for (const key of [
      "walkingAllowed",
      "standingAllowed",
      "armsAllowed",
      "legsAllowed",
    ] as const) {
      if (delta.constraints[key] === true) delete delta.constraints[key];
    }
  }
  const limits = input.text
    .split(/[。！？；;!?\n]+/)
    .filter((part) => avoidArms.test(part) || avoidLegs.test(part));
  if (limits.length) {
    delta.constraints = {
      ...delta.constraints,
      notes: [
        ...new Set([
          ...(delta.constraints?.notes ?? []),
          ...limits.map((part) => part.slice(0, 160)),
        ]),
      ].slice(0, 12),
      ...(limits.some((part) => avoidArms.test(part)) && {
        armsAllowed: false,
      }),
      ...(limits.some((part) => avoidLegs.test(part)) && {
        legsAllowed: false,
      }),
    };
  }
  if (delta.cues)
    delta.cues = delta.cues
      .filter(
        (x) =>
          ids.has(x.locationId) &&
          (input.text.includes(x.evidence) ||
            input.existing.cues?.some(
              (cue) =>
                cue.id === x.id &&
                cue.locationId === x.locationId &&
                cue.kind === x.kind &&
                cue.evidence === x.evidence,
            )),
      )
      .map((x) => ({
        ...x,
        plan: x.plan
          ? {
              ...x.plan,
              fitEvidence: input.text.includes(x.plan.fitEvidence)
                ? x.plan.fitEvidence
                : "",
            }
          : undefined,
        source: "ai",
        confirmed: false,
        updatedAt: undefined,
      }));
  if (delta.facts)
    delta.facts = delta.facts
      .filter(
        (x) =>
          (!x.locationId || ids.has(x.locationId)) &&
          input.text.includes(x.evidence),
      )
      .map((x) => ({
        ...x,
        source: "ai",
        confirmed: false,
        updatedAt: undefined,
      }));
  // Recover a route plan only when the words supply both a known walking leg and intent.
  // The model still supplies the confirmed-place candidate. No facility or extra time is inferred.
  if (
    delta.constraints?.walkingAllowed !== false &&
    !delta.cues?.some((cue) => cue.plan?.method === "extend_route")
  ) {
    const transit = [...delta.locations, ...input.existing.locations].filter(
      (l, i, all) =>
        ["subway", "bus"].includes(l.category) &&
        all.findIndex((x) => x.id === l.id) === i,
    );
    const walking = input.text.match(
      /(?:下车|出站)后[^。！？；\n]{0,55}(?:步行|走路)[^。！？；\n]{0,35}/,
    )?.[0];
    const goal = input.text.match(
      /想[^。！？；\n]{0,22}(?:多走|延长这段路)[^。！？；\n]{0,42}/,
    )?.[0];
    if (transit.length === 1 && walking && goal) {
      const place = transit[0];
      const cues = delta.cues ?? [];
      const cue = cues.find(
        (c) => c.kind === "commute_end" && c.locationId === place.id,
      );
      const plan = { method: "extend_route", fitEvidence: goal } as const;
      delta.cues = cue
        ? cues.map((c) => (c === cue ? { ...c, plan } : c))
        : [
            ...cues,
            {
              id: `route-${place.id}`.slice(0, 80),
              kind: "commute_end",
              locationId: place.id,
              evidence: walking,
              source: "ai",
              uncertain: false,
              confirmed: false,
              plan,
            },
          ];
    }
  }
  delta.locations = delta.locations.map((l) => ({
    ...l,
    source: "ai",
    confirmed: false,
  }));
  const inputTokens = Number(data.usage?.prompt_tokens) || 0,
    outputTokens = Number(data.usage?.completion_tokens) || 0;
  const estimatedCost =
    typeof data?.usage?.cost === "number" ? data.usage.cost : null;
  return {
    delta,
    inputTokens,
    outputTokens,
    estimatedCost,
    provider: usedModel,
    attempts,
  };
}
