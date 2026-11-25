// Server-only policy. Never import this module into src/ client components.
export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const FREE_LIFE_MODELS = [
  "baidu/ernie-5.5-flash-preview:free",
  "inclusionai/ling-3.2-flash:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "liquid/lfm-3-1.7b:free",
  "dots-studio/dots-3-note-preview:free",
] as const;
export const LIFE_MODEL = FREE_LIFE_MODELS[0];
export const AI_TIMEOUT_MS = 45_000;
export const MAX_MODEL_ATTEMPTS = 2;
export function aiConfiguration(env: NodeJS.ProcessEnv = process.env) {
  if (env.MOVEQUEST_AI_URL && env.MOVEQUEST_AI_URL !== OPENROUTER_URL)
    throw Error("生活提取仅允许 OpenRouter 指定接口，已阻止其他服务调用");
  if (
    env.OPENROUTER_BASE_URL &&
    env.OPENROUTER_BASE_URL !== "https://openrouter.ai/api/v1"
  )
    throw Error("已阻止未授权的模型接口");
  if (
    env.OPENROUTER_MODEL &&
    env.MOVEQUEST_AI_MODEL &&
    env.OPENROUTER_MODEL !== env.MOVEQUEST_AI_MODEL
  )
    throw Error("模型配置冲突，已阻止调用");
  const model = env.OPENROUTER_MODEL || env.MOVEQUEST_AI_MODEL || LIFE_MODEL;
  if (!(FREE_LIFE_MODELS as readonly string[]).includes(model))
    throw Error(
      "生活提取仅允许明确列出的免费模型，已阻止付费、自动路由及未知模型调用",
    );
  const key = (env.OPENROUTER_API_KEY || env.MOVEQUEST_AI_KEY || "").trim();
  const models = [
    model,
    ...FREE_LIFE_MODELS.filter((id) => id !== model),
  ].slice(0, env.MOVEQUEST_AI_FALLBACKS === "off" ? 1 : MAX_MODEL_ATTEMPTS);
  return { key, url: OPENROUTER_URL, model, models };
}
export function aiStatus(env: NodeJS.ProcessEnv = process.env) {
  let configured = false,
    model: string = LIFE_MODEL;
  let models: string[] = [];
  try {
    const config = aiConfiguration(env);
    configured = !!config.key;
    model = config.model;
    models = config.models;
  } catch {
    /* Fail closed. */
  }
  return {
    ai: configured,
    provider: "OpenRouter",
    model,
    models,
    freeOnly: true,
  };
}
// OpenRouter itself may not substitute providers or models. Application fallback is explicit and bounded.
export const FREE_PROVIDER_POLICY = {
  allow_fallbacks: false,
  require_parameters: true,
  max_price: { prompt: 0, completion: 0, request: 0 },
} as const;
