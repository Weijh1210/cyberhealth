import { LIFE_MODEL, FREE_LIFE_MODELS } from "../../server/aiConfig";
import { expect, it, vi } from "vitest";
import { extract, inputFor, cacheKey } from "../../server/ai";
const input = inputFor({
  text: "8 点在家起床",
  existing: { locations: [], events: [] },
});
const env = {
  OPENROUTER_API_KEY: "test-server-secret",
};
const delta = {
  locations: [
    {
      id: "home",
      name: "家",
      category: "home",
      source: "ai",
      confirmed: false,
    },
  ],
  events: [
    {
      id: "wake",
      locationId: "home",
      title: "起床",
      start: "08:00",
      end: null,
      recurrence: "daily",
      transport: "unknown",
      busy: false,
      evidence: "8 点在家起床",
    },
  ],
  questions: [],
};
it("has a genuine server HTTP provider boundary and validates structured output (mock, not live)", async () => {
  const mock = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(delta) } }],
          usage: { prompt_tokens: 200, completion_tokens: 80 },
        }),
      ),
  );
  const result = await extract(input, env, mock as typeof fetch);
  expect(mock).toHaveBeenCalledOnce();
  expect(result.delta.events[0].start).toBe("08:00");
  expect(result.inputTokens).toBe(200);
  expect(result.estimatedCost).toBeNull();
  expect(mock.mock.calls[0]).toBeDefined();
});
it("refuses absent credentials without pretending to parse text", async () => {
  await expect(extract(input, {})).rejects.toThrow("AI 未配置");
});
it("rejects malformed JSON, fabricated evidence and unauthorized fields from a provider", async () => {
  for (const content of [
    "broken",
    JSON.stringify({ ...delta, price: 69 }),
    JSON.stringify({
      ...delta,
      events: [{ ...delta.events[0], evidence: "用户没有说过" }],
    }),
  ]) {
    const mock = async () =>
      new Response(JSON.stringify({ choices: [{ message: { content } }] }));
    await expect(extract(input, env, mock as typeof fetch)).rejects.toThrow();
  }
});
it("makes cache keys depend on prompt version and compact context; rejects unbounded input", () => {
  expect(cacheKey(input)).toBe(cacheKey(input));
  expect(cacheKey({ ...input, text: "周末公园" })).not.toBe(cacheKey(input));
  expect(() => inputFor({ ...input, text: "x".repeat(4001) })).toThrow();
});
it("handles provider failure without exposing the provider key", async () => {
  await expect(
    extract(
      input,
      env,
      (async () => new Response("", { status: 500 })) as typeof fetch,
    ),
  ).rejects.toThrow("模型服务暂时不可用");
});

it("locks every HTTP request to the authorized free model and zero-price providers", async () => {
  let url: unknown, options: RequestInit | undefined;
  const mock = async (target: unknown, init?: RequestInit) => {
    url = target;
    options = init;
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(delta) } }],
        usage: { cost: 0 },
      }),
    );
  };
  const result = await extract(input, env, mock as typeof fetch);
  expect(String(url)).toBe("https://openrouter.ai/api/v1/chat/completions");
  const body = JSON.parse(String(options?.body));
  expect(body.model).toBe(LIFE_MODEL);
  expect(body.provider).toEqual({
    allow_fallbacks: false,
    require_parameters: true,
    max_price: { prompt: 0, completion: 0, request: 0 },
  });
  expect(body.models).toBeUndefined();
  expect(body.plugins).toBeUndefined();
  expect(body.response_format).toEqual({ type: "json_object" });
  expect(body.reasoning).toBeUndefined();
  expect(options?.headers).toMatchObject({
    Authorization: "Bearer test-server-secret",
  });
  expect(
    body.messages.map((m: { content: string }) => m.content).join(""),
  ).not.toContain(env.OPENROUTER_API_KEY);
  expect(result.estimatedCost).toBe(0);
});
it("blocks alternate and paid model or endpoint configuration BEFORE any network call", async () => {
  const mock = vi.fn();
  for (const override of [
    { MOVEQUEST_AI_MODEL: "baidu/ernie-5.5-flash-preview" },
    { MOVEQUEST_AI_MODEL: "openrouter/auto" },
    { MOVEQUEST_AI_MODEL: "other:free" },
    { MOVEQUEST_AI_URL: "https://other.example/chat/completions" },
  ]) {
    await expect(extract(input, { ...env, ...override }, mock)).rejects.toThrow(
      "已阻止",
    );
  }
  expect(mock).not.toHaveBeenCalled();
});
it("never falls back on authentication or account errors", async () => {
  for (const status of [401, 402, 403]) {
    const mock = vi.fn(async () => new Response("", { status }));
    await expect(extract(input, env, mock as typeof fetch)).rejects.toThrow();
    expect(mock).toHaveBeenCalledOnce();
  }
});
it("rejects a nonzero reported charge or an incomplete output without retrying", async () => {
  for (const extra of [
    { usage: { cost: 0.1 } },
    {
      choices: [
        {
          finish_reason: "length",
          message: { content: JSON.stringify(delta) },
        },
      ],
    },
  ]) {
    const mock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(delta) } }],
            ...extra,
          }),
        ),
    );
    await expect(extract(input, env, mock as typeof fetch)).rejects.toThrow();
    expect(mock).toHaveBeenCalledOnce();
  }
});

it("switches only once to the next whitelisted free model on provider rate limiting", async () => {
  const bodies: Record<string, unknown>[] = [];
  const mock = vi.fn(async (_url: unknown, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    return bodies.length === 1
      ? new Response(
          JSON.stringify({ error: { message: "Provider capacity limit" } }),
          { status: 429 },
        )
      : new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(delta) } }],
            usage: { cost: 0 },
          }),
        );
  });
  const result = await extract(input, env, mock as typeof fetch);
  expect(mock).toHaveBeenCalledTimes(2);
  expect(bodies.map((b) => b.model)).toEqual(FREE_LIFE_MODELS.slice(0, 2));
  expect(
    bodies.every((b) => JSON.stringify(b.provider).includes('"prompt":0')),
  ).toBe(true);
  expect(result.provider).toBe(FREE_LIFE_MODELS[1]);
  expect(result.attempts).toHaveLength(2);
});
it("stops after two unavailable free candidates without looping or reaching paid models", async () => {
  const mock = vi.fn(
    async () =>
      new Response(JSON.stringify({ error: { message: "unavailable" } }), {
        status: 503,
      }),
  );
  await expect(extract(input, env, mock as typeof fetch)).rejects.toThrow();
  expect(mock).toHaveBeenCalledTimes(2);
});
it("does not try another model when a shared daily free quota is exhausted", async () => {
  const mock = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          error: { message: "Rate limit exceeded: free-models-per-day" },
        }),
        { status: 429 },
      ),
  );
  await expect(extract(input, env, mock as typeof fetch)).rejects.toThrow(
    "北京时间每天上午 8 点",
  );
  expect(mock).toHaveBeenCalledOnce();
});
it("uses the account minute reset hint without consuming a fallback call", async () => {
  const mock = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          error: {
            metadata: { limit_source: "openrouter_free_tier_per_minute" },
          },
        }),
        { status: 429, headers: { "Retry-After": "17" } },
      ),
  );
  await expect(extract(input, env, mock as typeof fetch)).rejects.toThrow(
    "约 17 秒后可重试",
  );
  expect(mock).toHaveBeenCalledOnce();
});
it("cache identity includes selected models but not credentials", () => {
  expect(cacheKey(input, { MOVEQUEST_AI_MODEL: FREE_LIFE_MODELS[1] })).not.toBe(
    cacheKey(input, { MOVEQUEST_AI_MODEL: FREE_LIFE_MODELS[0] }),
  );
  expect(cacheKey(input, { OPENROUTER_API_KEY: "a" })).toBe(
    cacheKey(input, { OPENROUTER_API_KEY: "b" }),
  );
});
