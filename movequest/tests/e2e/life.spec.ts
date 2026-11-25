import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptyState } from "../../src/domain/types";
import { emptyLife, mergeLife, type LifeDelta } from "../../src/life/model";
const base: LifeDelta = {
  locations: [
    {
      id: "home",
      name: "我的家",
      category: "home",
      source: "manual",
      confirmed: false,
    },
    {
      id: "office",
      name: "公司",
      category: "office",
      source: "manual",
      confirmed: false,
    },
    {
      id: "metro",
      name: "地铁站",
      category: "subway",
      source: "manual",
      confirmed: false,
    },
    {
      id: "lunch",
      name: "午间餐厅",
      category: "restaurant",
      source: "manual",
      confirmed: false,
    },
    {
      id: "cafe",
      name: "街角咖啡",
      category: "cafe",
      source: "manual",
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
      recurrence: "weekday",
      transport: "unknown",
      busy: false,
      evidence: "手动测试资料",
    },
    {
      id: "work",
      locationId: "office",
      title: "工作与间隙",
      start: "09:00",
      end: "18:00",
      recurrence: "weekday",
      transport: "subway",
      busy: false,
      evidence: "手动测试资料",
    },
  ],
  questions: [],
};
async function fixture(page: import("@playwright/test").Page) {
  await page.clock.install({ time: new Date("2026-11-20T06:00:00Z") });
  await page.goto("/");
  await page.evaluate(
    (s) => localStorage.setItem("movequest:v1", JSON.stringify(s)),
    {
      ...emptyState(),
      profile: {
        name: "青禾",
        role: "worker",
        scenes: ["office", "home"],
        minutes: 2,
        reminder: 0,
        locale: "zh-CN",
      },
      life: mergeLife({ ...emptyLife(), timezone: "Asia/Shanghai" }, base),
    },
  );
  await page.goto("/");
}
test("manual onboarding produces durable life events without calling an LLM", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "怎么称呼你", exact: true })
    .fill("青禾");
  await page.getByRole("button", { name: "手动添加地点与事件" }).click();
  await page.getByLabel("地点名称").fill("我的家");
  await page.getByLabel("事件名称").fill("起床");
  await page.getByLabel("开始时间（可空）").fill("08:00");
  await page.getByRole("button", { name: "确认资料并生成城镇" }).click();
  await expect(
    page.getByRole("button", { name: "选择我的家", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "选择我的家", exact: true }),
  ).toBeVisible();
});
test("world persists, feedback changes ranking, weekend discovery is append-only, cosmetics survive offline", async ({
  page,
  context,
}, info) => {
  await fixture(page);
  await page.goto("/world-legacy");
  const old = await page
    .locator("[data-node]")
    .evaluateAll((nodes) =>
      nodes.map((n) => [
        n.getAttribute("data-node"),
        n.getAttribute("data-position"),
      ]),
    );
  await page.getByLabel("此刻的场景").selectOption("office");
  if (await page.locator(".mobile-opportunities").isVisible())
    await page.locator(".mobile-opportunities").click();
  await expect(page.getByTestId("opportunity")).toHaveCount(2);
  const firstActivity = await page
    .getByTestId("opportunity")
    .first()
    .getAttribute("data-activity");
  await page
    .getByRole("button", { name: "不适合我", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "不适合我", exact: true })
    .first()
    .click();
  expect(
    await page.getByTestId("opportunity").first().getAttribute("data-activity"),
  ).not.toBe(firstActivity);
  await page
    .getByRole("button", { name: "以后不推荐", exact: true })
    .first()
    .click();
  await expect
    .poll(async () =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("movequest:v1")!).life.feedback.some(
          (f: { type: string }) => f.type === "never_recommend",
        ),
      ),
    )
    .toBe(true);
  const excluded = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("movequest:v1")!).life.feedback.find(
        (f: { type: string }) => f.type === "never_recommend",
      ).activityId,
  );
  await expect(page.locator(`[data-activity="${excluded}"]`)).toHaveCount(0);
  await page.goto("/life");
  await page.getByRole("button", { name: "手动添加地点与事件" }).click();
  await page.getByLabel("地点名称").fill("周末公园");
  await page.getByLabel("地点类型").selectOption("park");
  await page.getByLabel("事件名称").fill("公园散步");
  await page.getByRole("combobox", { name: /重复/ }).selectOption("weekend");
  await page.getByLabel("开始时间（可空）").fill("15:00");
  await page.getByLabel("结束时间（可空）").fill("16:00");
  await page.getByRole("button", { name: "确认资料并生成城镇" }).click();
  await expect(page.locator("[data-node]")).toHaveCount(6);
  expect(
    (
      await page
        .locator("[data-node]")
        .evaluateAll((nodes) =>
          nodes.map((n) => [
            n.getAttribute("data-node"),
            n.getAttribute("data-position"),
          ]),
        )
    )
      .filter((n) => old.some((o) => o[0] === n[0]))
      .sort(),
  ).toEqual([...old].sort());
  await page.getByRole("button", { name: "选择公司", exact: true }).click();
  if (await page.locator(".sheet-close").isVisible())
    await page.locator(".sheet-close").click();
  await page.getByRole("button", { name: "放置装饰", exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("movequest:v1")!).life.decorations
            .length,
      ),
    )
    .toBe(1);
  await page.getByRole("button", { name: "放大地图" }).click();
  await page.getByRole("button", { name: "重置视角" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `docs/screenshots/v3-town-${info.project.name}.png`,
    fullPage: true,
  });
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        return !!navigator.serviceWorker.controller;
      }),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.goto("/world-legacy");
  await expect(page.locator("[data-node]")).toHaveCount(6);
  await page.getByLabel("此刻的场景").selectOption("home");
  if (await page.locator(".mobile-opportunities").isVisible())
    await page.locator(".mobile-opportunities").click();
  await expect(page.getByTestId("opportunity").first()).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("movequest:v1")!).life.decorations
          .length,
    ),
  ).toBe(1);
  const before = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("movequest:v1")!).life.feedback.length,
  );
  await page
    .getByRole("button", { name: "现在不想", exact: true })
    .first()
    .click();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("movequest:v1")!).life.feedback
            .length,
      ),
    )
    .toBe(before + 1);
  if (await page.locator(".sheet-close").isVisible())
    await page.locator(".sheet-close").click();
  await page.getByRole("button", { name: "选择我的家", exact: true }).click();
  if (await page.locator(".sheet-close").isVisible())
    await page.locator(".sheet-close").click();
  await page.getByRole("button", { name: "放置装饰", exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("movequest:v1")!).life.decorations
            .length,
      ),
    )
    .toBe(2);
  await page.goto("/rhythm");
  await expect(
    page.getByRole("heading", { name: "系统正在怎样学习" }),
  ).toBeVisible();
});
test("new surfaces are accessible and fit mobile widths; no console exceptions", async ({
  page,
}) => {
  await fixture(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of ["/", "/life", "/rhythm", "/plus"]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test("life chat follows up and keeps the town pending until confirmation", async ({
  page,
}) => {
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { ai: true } }),
  );
  const first = "工作日坐地铁去青禾书院上课";
  const answer = "晚上九点下课";
  const question = "下课后，你通常想把活动接在哪件事上？";
  let calls = 0;
  await page.route("**/api/life/extract", async (route) => {
    const turn = ++calls;
    const body = route.request().postDataJSON();
    expect(body.text).toBe(turn === 1 ? first : `${first}\n${answer}`);
    if (turn === 2) {
      expect(body.clarifications).toEqual([{ question, answer }]);
      expect(body.existing.locations[0].id).toBe("academy");
    }
    await route.fulfill({
      json: {
        delta: {
          locations:
            turn === 2
              ? []
              : [
                  {
                    id: "academy",
                    name: "青禾书院",
                    category: "campus",
                    source: "ai",
                    confirmed: false,
                  },
                ],
          events: [
            {
              id: "class",
              locationId: "academy",
              title: "上课",
              start: null,
              end: turn === 2 ? "21:00" : null,
              recurrence: "weekday",
              transport: "subway",
              busy: true,
              evidence: turn === 2 ? answer : first,
            },
          ],
          questions: turn === 1 ? [question] : [],
        },
      },
    });
  });
  await page.goto("/onboarding");
  const input = page.getByRole("textbox", { name: "输入生活消息" });
  await input.fill(first);
  await input.press("Enter");
  await expect(page.getByRole("log")).toContainText(question);
  await expect(page.getByLabel("地点名称")).toBeHidden();
  await input.fill(answer);
  await page.getByRole("button", { name: "发送", exact: true }).click();
  await expect(page.locator(".chat-summary")).toContainText("21:00 结束");
  await expect(page).toHaveURL(/onboarding/);
  await page.getByRole("button", { name: "确认资料并生成城镇" }).click();
  await expect(
    page.getByRole("button", { name: "选择青禾书院" }),
  ).toBeVisible();
  expect(calls).toBe(2);
});
