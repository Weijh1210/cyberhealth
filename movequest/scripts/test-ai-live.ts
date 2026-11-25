/** Explicit opt-in live test. Uses fictional Chinese routines; never prints env or request headers. */
import { writeFile } from "node:fs/promises";
import {
  extract,
  inputFor,
  promptVersion,
  AIRequestError,
  type ExtractInput,
} from "../server/ai";
import { aiConfiguration, FREE_LIFE_MODELS } from "../server/aiConfig";
import type { LifeDelta } from "../src/life/model";
const cases: {
  name: string;
  text: string;
  check: (delta: LifeDelta) => void;
}[] = [
  {
    name: "中文工作日日程",
    text: "工作日早上8点我在家起床，9点坐地铁去公司，12点30分在公司附近的餐厅吃午饭，下午18点下班，晚上19点回到家休息。",
    check(delta) {
      for (const [category, start] of [
        ["home", "08:00"],
        ["office", "09:00"],
        ["restaurant", "12:30"],
        ["home", "19:00"],
      ]) {
        if (
          !delta.events.some(
            (e) =>
              e.start === start &&
              e.recurrence === "weekday" &&
              delta.locations.some(
                (l) => l.id === e.locationId && l.category === category,
              ),
          )
        )
          throw Error(`缺少 ${category} / ${start} / weekday 事件`);
      }
      if (
        !delta.events.some(
          (e) => e.start === "09:00" && e.transport === "subway",
        )
      )
        throw Error("未正确提取地铁通勤");
      if (!delta.events.some((e) => e.start === "18:00" || e.end === "18:00"))
        throw Error("未正确提取 18:00 下班");
    },
  },
  {
    name: "周末公园增量",
    text: "再补充一个周末场景：周末下午15点到16点我会在公园散步。其他工作日安排不变。",
    check(delta) {
      if (
        !delta.events.some(
          (e) =>
            e.recurrence === "weekend" &&
            e.start === "15:00" &&
            e.end === "16:00" &&
            delta.locations.some(
              (l) => l.id === e.locationId && l.category === "park",
            ),
        )
      )
        throw Error("周末公园时段不正确");
      if (delta.events.some((e) => e.recurrence === "weekday"))
        throw Error("增量请求不应改写工作日事件");
    },
  },
  {
    name: "未知时间不编造",
    text: "我每天晚上会在家休息，没有固定的开始或结束时间。",
    check(delta) {
      if (
        !delta.events.length ||
        !delta.locations.some((l) => l.category === "home")
      )
        throw Error("未提取居家休息");
      if (delta.events.some((e) => e.start !== null || e.end !== null))
        throw Error("为未说明的时间编造了具体时刻");
    },
  },
];
if (process.argv.includes("--extended"))
  cases.splice(
    0,
    cases.length,
    {
      name: "English weekday",
      text: "On weekdays, I wake up at home at 7:00 and work at the office from 9:00 to 17:30.",
      check(d) {
        if (
          !d.events.some(
            (e) =>
              e.start === "09:00" &&
              e.end === "17:30" &&
              e.recurrence === "weekday",
          )
        )
          throw Error("English office interval missing");
      },
    },
    {
      name: "大约时间",
      text: "工作日我大概早上8点在家起床，具体分钟不固定。",
      check(d) {
        if (
          !d.events.length ||
          d.events.some((e) => e.start !== null && e.start !== "08:00") ||
          !d.events.some((e) => e.approximate || e.start === null)
        )
          throw Error("未保留大约时间的不确定性");
      },
    },
    {
      name: "跨夜工作",
      text: "每个工作日晚上22点到第二天早上6点，我在公司值夜班。",
      check(d) {
        if (
          !d.events.some(
            (e) =>
              e.start === "22:00" &&
              e.end === "06:00" &&
              e.recurrence === "weekday",
          )
        )
          throw Error("跨夜时段错误");
      },
    },
    {
      name: "不确定频率",
      text: "我偶尔周末去公园，具体哪天没有规律，也没有固定时间。",
      check(d) {
        if (
          !d.questions.length ||
          d.events.some((e) => e.start !== null || e.end !== null)
        )
          throw Error("不确定频率或时间没有保留");
      },
    },
    {
      name: "矛盾时间",
      text: "我每天早上8点在家起床，不过也可能是9点，我还没确定。",
      check(d) {
        if (!d.questions.length || d.events.some((e) => e.start !== null))
          throw Error("矛盾时间被擅自确定");
      },
    },
    {
      name: "偏好与行动限制",
      text: "我每天晚上在家休息。我更喜欢1分钟以内的活动，现在不方便站立，也不能走动，请只提供坐着可以做的事。",
      check(d) {
        if (
          d.constraints?.walkingAllowed !== false ||
          d.constraints?.standingAllowed !== false ||
          !d.preferences?.length
        )
          throw Error("没有正确提取明确偏好和限制");
      },
    },
  );
async function main() {
  const config = aiConfiguration();
  if (!config.key)
    throw Error(
      "缺少后端 OPENROUTER_API_KEY。请在 movequest/.env 填写后运行，不要在命令行传入 Key。",
    );
  const candidates = process.argv.includes("--extended")
    ? [config.model]
    : [config.model, ...FREE_LIFE_MODELS.filter((id) => id !== config.model)];
  const attempts: unknown[] = [];
  let posts = 0;
  for (const model of candidates) {
    if (posts >= 8) break;
    const metadata = await fetch(
      `https://openrouter.ai/api/v1/models/${model}/endpoints`,
      { signal: AbortSignal.timeout(15000) },
    );
    if (!metadata.ok) {
      attempts.push({ model, outcome: "metadata_unavailable" });
      continue;
    }
    const catalog = await metadata.json();
    if (
      catalog?.data?.id !== model ||
      !catalog.data.endpoints?.some(
        (e: {
          pricing?: { prompt?: string; completion?: string; request?: string };
          supported_parameters?: string[];
        }) =>
          e.pricing?.prompt === "0" &&
          e.pricing?.completion === "0" &&
          Number(e.pricing?.request ?? 0) === 0 &&
          e.supported_parameters?.includes("response_format"),
      )
    ) {
      attempts.push({ model, outcome: "no_verified_free_json_endpoint" });
      continue;
    }
    const results: unknown[] = [];
    let weekday: LifeDelta | undefined;
    let passed = true;
    for (const [index, fixture] of cases.entries()) {
      if (posts >= 8) {
        passed = false;
        break;
      }
      let existing: ExtractInput["existing"] = { locations: [], events: [] };
      if (fixture.name === "周末公园增量" && weekday)
        existing = {
          locations: weekday.locations.map(({ id, name, category }) => ({
            id,
            name,
            category,
          })),
          events: weekday.events.map(
            ({ id, locationId, title, start, end, recurrence }) => ({
              id,
              locationId,
              title,
              start,
              end,
              recurrence,
            }),
          ),
        };
      const began = Date.now();
      posts++;
      try {
        // Test one specific approved free model at a time; production's bounded fallback is tested separately.
        const result = await extract(
          inputFor({ text: fixture.text, existing }),
          {
            ...process.env,
            OPENROUTER_MODEL: model,
            MOVEQUEST_AI_MODEL: model,
            MOVEQUEST_AI_FALLBACKS: "off",
          },
        );
        fixture.check(result.delta);
        if (index === 0) weekday = result.delta;
        results.push({
          name: fixture.name,
          passed: true,
          input: fixture.text,
          delta: result.delta,
          model: result.provider,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          cost: result.estimatedCost,
          elapsedMs: Date.now() - began,
        });
        process.stdout.write(
          `PASS ${model} / ${fixture.name}: ${result.delta.locations.length} 个地点 / ${result.delta.events.length} 个事件\n`,
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : "请求失败";
        attempts.push({
          model,
          case: fixture.name,
          outcome: "failed",
          reason,
          status: error instanceof AIRequestError ? error.status : null,
          passedCases: results,
        });
        process.stdout.write(`FAIL ${model} / ${fixture.name}: ${reason}\n`);
        passed = false;
        if (
          error instanceof AIRequestError &&
          ["authentication", "account_limit", "network_error"].includes(
            error.code,
          )
        ) {
          await saveAttempt("blocked", attempts, posts);
          throw error;
        }
        if (process.argv.includes("--extended")) continue;
        break;
      }
      // Keep sequential probes below typical free minute limits; no model is retried.
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (passed && results.length === cases.length) {
      const report = {
        testedAt: new Date().toISOString(),
        live: true,
        model,
        promptVersion,
        paidFallback: false,
        modelRequestsSent: posts,
        earlierAttempts: attempts,
        results,
      };
      await writeFile(
        new URL(
          process.argv.includes("--extended")
            ? "../docs/OPENROUTER_V4_EXTENDED_RESULT.json"
            : "../docs/OPENROUTER_LIVE_RESULT.json",
          import.meta.url,
        ),
        JSON.stringify(report, null, 2) + "\n",
      );
      process.stdout.write(
        `真实 API ${cases.length} 组验收通过：${model}；结果已保存。\n`,
      );
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  await saveAttempt("no_model_passed", attempts, posts);
  throw Error("本轮有限免费模型测试未找到全部通过的模型；没有调用付费模型");
}
async function saveAttempt(
  outcome: string,
  attempts: unknown[],
  modelRequestsSent: number,
) {
  await writeFile(
    new URL("../docs/OPENROUTER_FREE_MODELS_ATTEMPT.json", import.meta.url),
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        live: true,
        outcome,
        modelRequestsSent,
        paidFallback: false,
        attempts,
      },
      null,
      2,
    ) + "\n",
  );
}
main().catch((error) => {
  process.stderr.write(
    `真实 API 验收未通过：${error instanceof Error ? error.message : "请求失败"}\n仅尝试批准的免费模型，不使用付费模型。\n`,
  );
  process.exitCode = 1;
});
