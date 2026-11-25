import { expect, it } from "vitest";
import {
  aiConfiguration,
  aiStatus,
  LIFE_MODEL,
  FREE_LIFE_MODELS,
} from "../../server/aiConfig";
it("works with a backend OpenRouter key alone, and never exposes it in public status", () => {
  const env = { OPENROUTER_API_KEY: "server-fixture-secret" };
  expect(aiConfiguration(env).model).toBe(LIFE_MODEL);
  expect(aiStatus(env)).toEqual({
    ai: true,
    provider: "OpenRouter",
    model: LIFE_MODEL,
    models: [...FREE_LIFE_MODELS].slice(0, 2),
    freeOnly: true,
  });
  expect(JSON.stringify(aiStatus(env))).not.toContain(env.OPENROUTER_API_KEY);
  expect(aiStatus({}).ai).toBe(false);
  expect(aiStatus({ ...env, MOVEQUEST_AI_MODEL: "paid-model" }).ai).toBe(false);
});

it("accepts only the six approved free variants, with at most two distinct attempts", () => {
  for (const model of FREE_LIFE_MODELS) {
    const config = aiConfiguration({ MOVEQUEST_AI_MODEL: model });
    expect(config.model).toBe(model);
    expect(config.models).toHaveLength(2);
    expect(new Set(config.models).size).toBe(2);
    expect(
      config.models.every((id) =>
        FREE_LIFE_MODELS.includes(id as typeof LIFE_MODEL),
      ),
    ).toBe(true);
  }
  expect(
    aiConfiguration({
      MOVEQUEST_AI_MODEL: FREE_LIFE_MODELS[2],
      MOVEQUEST_AI_FALLBACKS: "off",
    }).models,
  ).toEqual([FREE_LIFE_MODELS[2]]);
});
