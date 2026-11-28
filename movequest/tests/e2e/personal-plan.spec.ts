import { expect, test } from "@playwright/test";

test("a personal plan leads directly to a town reward", async ({
  page,
}, info) => {
  const quote = "写完一套题就合上书";
  const goal = "我想复盘错题，又不想另外找时间";
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { ai: true } }),
  );
  await page.route("**/api/life/extract", (route) =>
    route.fulfill({
      json: {
        delta: {
          locations: [
            {
              id: "library",
              name: "松果图书馆",
              category: "library",
              source: "ai",
              confirmed: false,
            },
          ],
          events: [],
          questions: [],
          cues: [
            {
              id: "recap",
              kind: "task_end",
              locationId: "library",
              evidence: quote,
              source: "ai",
              uncertain: false,
              plan: { method: "recall_walk", fitEvidence: goal },
            },
          ],
        },
      },
    }),
  );
  await page.goto("/onboarding");
  await page
    .getByRole("textbox", { name: "输入生活消息" })
    .fill(`我在松果图书馆${quote}。${goal}。`);
  await page.getByRole("button", { name: "发送", exact: true }).click();
  await page.getByRole("button", { name: "确认资料并生成城镇" }).click();
  await expect(page).toHaveURL(/\/world$/);
  await page.getByRole("link", { name: "我的行动计划" }).click();
  await expect(
    page.getByRole("heading", { name: "我的行动计划" }),
  ).toBeVisible();
  const card = page.locator(".discovery-card");
  await expect(card).toHaveCount(1);
  await expect(card).toContainText(goal);
  await expect(card).toContainText("步行做课后复盘");
  const nav = page.getByRole("navigation", {
    name: info.project.name === "mobile" ? "手机导航" : "主要导航",
  });
  await expect(nav.getByRole("link")).toHaveText([
    "今日",
    "我的世界",
    "微运动",
    "我的生活",
  ]);
  await expect(page.getByRole("link", { name: /演示/ })).toHaveCount(0);
  await card.getByRole("button", { name: "试一次", exact: true }).click();
  await page.getByRole("button", { name: "我做过了，确认记录" }).click();
  await page.getByRole("link", { name: "查看街区变化" }).click();
  await expect(page.locator("[data-growth=library]")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "街区彩旗", exact: true }),
  ).toBeEnabled();
  await expect(page.getByRole("button", { name: /街角花亭/ })).toBeDisabled();
  await page.getByRole("button", { name: "街区彩旗", exact: true }).click();
  await page.getByRole("button", { name: "放置装饰" }).click();
  await expect(
    page.getByRole("button", { name: "选择装饰 pennant" }),
  ).toHaveCount(1);
  await page.reload();
  await expect(page.locator("[data-growth=library]")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "选择装饰 pennant" }),
  ).toHaveCount(1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `docs/screenshots/personal-town-${info.project.name}.png`,
    animations: "disabled",
  });
});

test("first-time visitors can see an opportunity without typing or calling AI", async ({
  page,
}) => {
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { ai: false } }),
  );
  let calls = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/life/extract")) calls++;
  });
  await page.goto("/");
  const panel = page.getByRole("region", { name: "快速查看生活里的运动机会" });
  await panel.getByRole("button", { name: "通勤路上", exact: true }).click();
  await expect(
    panel.getByRole("heading", { name: "给熟悉路线留一个可折返的拐点" }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "看完视频", exact: true }).click();
  await expect(
    panel.getByRole("heading", { name: "下一条视频前，顺手归位一件轻物" }),
  ).toBeVisible();
  await expect(panel.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("textbox", { name: "输入生活消息" })).toHaveValue(
    "",
  );
  expect(calls).toBe(0);
});
