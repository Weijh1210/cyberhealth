import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
const key = "movequest:v1";
async function setup(page: Page, demo = true) {
  await page.clock.install({ time: new Date("2026-11-19T04:00:00Z") });
  await page.goto("/onboarding");
  await page.evaluate(
    ({ key, demo }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          schemaVersion: 1,
          profile: {
            name: "青禾",
            role: "student",
            scenes: ["campus", "home"],
            minutes: 1,
            reminder: 0,
            locale: "zh-CN",
          },
          demo,
          sessions: [],
          rewards: [],
          learning: [],
          ownMoves: [],
          campaigns: [],
        }),
      );
    },
    { key, demo },
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: demo ? "青禾，让今天长出一点新绿。" : "我的世界",
    }),
  ).toBeVisible();
}
async function snapshot(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
}
async function startTimer(page: Page) {
  await page.goto("/quest/campus-corridor");
  await page.getByRole("button", { name: "开始计时", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
}
async function completeTimer(page: Page) {
  await page.clock.runFor(4000);
  await expect(
    page.getByRole("button", { name: "我已完成，确认记录" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "我已完成，确认记录" }).click();
  await expect(page.getByTestId("reward-xp")).toBeVisible();
}
async function finishSteps(page: Page) {
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "这一步完成了" }).click();
  }
  await expect(
    page.getByRole("button", { name: "我已完成，确认记录" }),
  ).toBeEnabled();
}

test("complete timer → reward → knowledge → progress persists and demo stays isolated", async ({
  page,
}, info) => {
  await setup(page);
  await startTimer(page);
  await expect(
    page.getByRole("button", { name: "我已完成，确认记录" }),
  ).toBeDisabled();
  await page.clock.runFor(1000);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await expect(page.getByRole("button", { name: "继续计时" })).toBeVisible();
  const paused = await page.getByTestId("timer").innerText();
  await page.clock.runFor(10000);
  expect(await page.getByTestId("timer").innerText()).toBe(paused);
  await page.getByRole("button", { name: "继续计时" }).click();
  await completeTimer(page);
  await expect(page.getByTestId("reward-xp")).toContainText("+20");
  await page.screenshot({
    path: `docs/screenshots/reward-${info.project.name}.png`,
    fullPage: true,
  });
  await page.reload();
  await expect(page.getByTestId("reward-xp")).toContainText("+20");
  await page.getByRole("link", { name: "收下这张知识卡" }).click();
  await page.getByRole("radio", { name: "只有在健身房训练才算" }).check();
  await page.getByRole("button", { name: "提交答案" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "再想一想" }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "步行去接水或整理房间" }).check();
  await page.getByRole("button", { name: "提交答案" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "答对了" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "再想一想，巩固知识" }).click();
  await page.goto("/progress");
  await expect(page.getByTestId("total-count")).toHaveText("1 次");
  expect(
    (await snapshot(page)).rewards.reduce(
      (n: number, x: { xp: number }) => n + x.xp,
      0,
    ),
  ).toBe(25);
  await page.screenshot({
    path: `docs/screenshots/progress-${info.project.name}.png`,
    fullPage: true,
  });
  await page.goto("/");
  await page.screenshot({
    path: `docs/screenshots/home-${info.project.name}.png`,
    fullPage: true,
  });
  await page.goto("/profile");
  await page.getByRole("button", { name: "回到个人空间", exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).demo).toBe(false);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "我的世界", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".legacy-garden")).toHaveCount(0);
  await page.goto("/progress");
  await expect(page.getByTestId("total-count")).toHaveText("0 次");
});

test("same task repeated gives zero additional XP and duplicate confirmation cannot farm", async ({
  page,
}) => {
  await setup(page);
  await startTimer(page);
  await completeTimer(page);
  await startTimer(page);
  await page.clock.runFor(4000);
  const confirm = page.getByRole("button", { name: "我已完成，确认记录" });
  await expect(confirm).toBeEnabled();
  await confirm.evaluate((el: HTMLButtonElement) => {
    el.click();
    el.click();
    el.click();
  });
  await expect(page.getByTestId("reward-xp")).toContainText("+0");
  const s = await snapshot(page);
  expect(s.rewards).toHaveLength(1);
  expect(
    s.sessions.filter((x: { status: string }) => x.status === "completed"),
  ).toHaveLength(2);
});

test("step guide, skip and replace are interactive without penalties", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/quest/home-tidy");
  await page.getByRole("button", { name: "开始步骤引导" }).click();
  await expect(
    page.getByRole("button", { name: "我已完成，确认记录" }),
  ).toBeDisabled();
  await finishSteps(page);
  await page.getByRole("button", { name: "我已完成，确认记录" }).click();
  await expect(page.getByTestId("reward-xp")).toContainText("+20");
  await startTimer(page);
  await page.getByRole("button", { name: "今天先跳过" }).click();
  await expect(
    page.getByRole("heading", { name: "换个时刻，也没关系。" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "重新开始" }).click();
  await page.getByRole("button", { name: "替换任务", exact: true }).click();
  await expect(page).toHaveURL(/quest\/campus-water/);
  expect((await snapshot(page)).rewards).toHaveLength(1);
});

test("create your own move is persisted and can enter a real challenge flow", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/own-move");
  await page
    .getByRole("textbox", { name: "什么时刻，你发现可以动一动？" })
    .fill("下课走回宿舍之前");
  await page
    .getByRole("textbox", { name: "你想做的小行动" })
    .fill("绕到校园小花圃看看");
  await page.getByRole("button", { name: "保存我的发现" }).click();
  await expect(
    page.getByRole("heading", { name: "你的发现，已经记下了。" }),
  ).toBeVisible();
  expect((await snapshot(page)).rewards).toHaveLength(0);
  await page.getByRole("button", { name: "现在试试" }).click();
  await page.getByRole("button", { name: "开始计时", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
  await completeTimer(page);
  await page.goto("/progress");
  await expect(
    page.getByRole("link", { name: /绕到校园小花圃看看 下课走回宿舍之前/ }),
  ).toBeVisible();
  await page.reload();
  expect((await snapshot(page)).ownMoves).toHaveLength(1);
});

test("cross-tab simultaneous confirmations award once and sync the latest snapshot", async ({
  page,
  context,
}) => {
  await setup(page);
  await page.goto("/quest/home-tidy");
  await page.getByRole("button", { name: "开始步骤引导" }).click();
  await finishSteps(page);
  const second = await context.newPage();
  await second.goto(page.url());
  await expect(
    second.getByRole("button", { name: "我已完成，确认记录" }),
  ).toBeEnabled();
  // Resolve both controls before either tab can synchronize the completed state.
  const confirmations = await Promise.all(
    [page, second].map((tab) =>
      tab.getByRole("button", { name: "我已完成，确认记录" }).elementHandle(),
    ),
  );
  await Promise.all(
    confirmations.map((button) =>
      button.evaluate((el) => (el as HTMLButtonElement).click()),
    ),
  );
  await expect(page.getByTestId("reward-xp")).toBeVisible();
  await expect(second.getByTestId("reward-xp")).toBeVisible();
  const s = await snapshot(page);
  expect(s.rewards).toHaveLength(1);
  expect(
    s.sessions.filter((x: { status: string }) => x.status === "completed"),
  ).toHaveLength(1);
  await second.close();
});

test("institution filters, draft create/edit, export and reload retain Demo labels", async ({
  page,
}, info) => {
  await setup(page);
  await page.goto("/institution");
  await page.getByRole("combobox", { name: "机构统计周期" }).selectOption("14");
  await expect(page.getByTestId("institution-people")).toHaveText("36 人");
  await page.getByRole("button", { name: "企业计划", exact: true }).click();
  await expect(page.getByTestId("institution-people")).toHaveText("24 人");
  await page.getByRole("button", { name: "新建活动" }).click();
  await page.getByRole("textbox", { name: "活动名称" }).fill("午后微动示例");
  await page.getByRole("spinbutton", { name: "目标完成次数" }).fill("60");
  await page.getByRole("button", { name: "保存 Demo 活动" }).click();
  await expect(
    page.getByRole("button", { name: "编辑午后微动示例" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "编辑午后微动示例" }).click();
  await page.getByRole("textbox", { name: "活动名称" }).fill("午后轻走示例");
  await page.getByRole("button", { name: "保存 Demo 活动" }).click();
  await expect(
    page.getByRole("button", { name: "编辑午后轻走示例" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "企业计划", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "编辑午后轻走示例" }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 Demo 数据" }).click();
  const download = await downloadPromise;
  const data = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(data.label).toContain("Demo Data");
  expect(data.audience).toBe("office");
  await page.screenshot({
    path: `docs/screenshots/institution-${info.project.name}.png`,
    fullPage: true,
  });
});

test("production PWA survives offline deep navigation, completion and refresh", async ({
  page,
  context,
}) => {
  await setup(page);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.goto("/explore");
  await expect(
    page.getByRole("heading", { name: "生活里，处处有微动。" }),
  ).toBeVisible();
  await page.goto("/quest/home-tidy");
  await page.getByRole("button", { name: "开始步骤引导" }).click();
  await finishSteps(page);
  await page.getByRole("button", { name: "我已完成，确认记录" }).click();
  await expect(page.getByTestId("reward-xp")).toContainText("+20");
  await page.reload();
  await expect(page.getByTestId("reward-xp")).toContainText("+20");
  await page.goto("/progress");
  await expect(page.getByTestId("total-count")).toHaveText("1 次");
  await context.setOffline(false);
});

test("all main routes have no browser errors, accessible controls and no horizontal overflow", async ({
  page,
}, info) => {
  await setup(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of [
    "/",
    "/explore",
    "/quest/campus-corridor",
    "/learn",
    "/progress",
    "/own-move",
    "/profile",
    "/institution",
  ]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    if (route === "/learn" || route === "/own-move")
      await page.screenshot({
        path: `docs/screenshots/${route.slice(1)}-${info.project.name}.png`,
        fullPage: true,
      });
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/explore");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize(
    info.project.name === "mobile"
      ? { width: 390, height: 844 }
      : { width: 1440, height: 900 },
  );
  await page.goto("/explore");
  await page.screenshot({
    path: `docs/screenshots/explore-${info.project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("corrupt storage is preserved and can be exported without being overwritten", async ({
  page,
}) => {
  await page.goto("/onboarding");
  await page.evaluate(
    (key) => localStorage.setItem(key, "{broken-original"),
    key,
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("原数据已保留");
  await page.getByRole("link", { name: "导出或管理原始数据" }).click();
  await expect(
    page.getByRole("button", { name: "导出原始数据" }),
  ).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出原始数据" }).click();
  const dl = await pending;
  expect(await readFile((await dl.path())!, "utf8")).toBe("{broken-original");
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    "{broken-original",
  );
});

test("normal one-minute timer recovers after reload without awarding time spent away", async ({
  page,
}) => {
  await setup(page, false);
  await startTimer(page);
  await page.clock.runFor(2000);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "暂停并转到此页" }),
  ).toBeVisible();
  const before = (await snapshot(page)).sessions[0].elapsedMs;
  await page.clock.runFor(100000);
  expect((await snapshot(page)).sessions[0].elapsedMs).toBe(before);
  expect((await snapshot(page)).rewards).toHaveLength(0);
  await page.getByRole("button", { name: "暂停并转到此页" }).click();
  await page.getByRole("button", { name: "继续计时" }).click();
  await expect(
    page.getByRole("button", { name: "暂停", exact: true }),
  ).toBeVisible();
  for (let i = 0; i < 61; i++) {
    await page.clock.runFor(1000);
    await snapshot(page);
  }
  await expect(
    page.getByRole("button", { name: "我已完成，确认记录" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "我已完成，确认记录" }).click();
  await expect(page.getByTestId("reward-xp")).toContainText("+20");
  await page.goto("/progress");
  await expect(page.getByTestId("total-minutes")).toHaveText("1.0 分钟");
});

test("preferences, language fallback, navigation, export and confirmed reset work", async ({
  page,
}, info) => {
  await setup(page);
  await page.goto("/profile");
  await page
    .getByRole("textbox", { name: "怎么称呼你", exact: true })
    .fill("小芽");
  await page
    .getByRole("combobox", { name: "语言", exact: true })
    .selectOption("en");
  await page.getByRole("button", { name: "保存偏好", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Preferences saved" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const nav = page.getByRole("navigation", {
    name:
      info.project.name === "mobile" ? "Mobile navigation" : "Main navigation",
  });
  for (const [name, title] of [
    ["Today", "Welcome back, 小芽."],
    ["My world", "My world"],
    ["Movement", "Move now"],
    ["My life", "My life"],
  ]) {
    await nav.getByRole("link", { name, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("link", { name: "Preferences, reminders and data" })
    .click();
  const exporting = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export my data (JSON)" }).click();
  const dl = await exporting;
  expect(
    JSON.parse(await readFile((await dl.path())!, "utf8")).demoProfile.name,
  ).toBe("小芽");
  await page.evaluate(() =>
    localStorage.setItem("moyu-wellness-v1", "protected-legacy-data"),
  );
  await page.getByRole("button", { name: "Clear MoveQuest data…" }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await snapshot(page)).demoProfile.name).toBe("小芽");
  expect((await snapshot(page)).profile.name).toBe("青禾");
  await page.getByRole("button", { name: "Clear MoveQuest data…" }).click();
  await page
    .getByRole("button", { name: "Confirm clearing MoveQuest data" })
    .click();
  await expect(
    page.getByRole("heading", { name: "从日常找运动机会" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("moyu-wellness-v1")),
  ).toBe("protected-legacy-data");
});

test("foreground reminder can be dismissed and manifest assets are available", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/profile");
  await page
    .getByRole("combobox", { name: "活动提醒", exact: true })
    .selectOption("30");
  await page.getByRole("button", { name: "保存偏好", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "偏好已保存" }),
  ).toBeVisible();
  await page.goto("/");
  await page.clock.runFor(30 * 60000);
  await expect(
    page.getByRole("status").filter({ hasText: "有空的话" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "稍后再说" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "有空的话" }),
  ).toHaveCount(0);
  const manifest = await (
    await page.request.get("/manifest.webmanifest")
  ).json();
  expect(manifest.display).toBe("standalone");
  expect(
    manifest.icons.some(
      (icon: { purpose?: string }) => icon.purpose === "maskable",
    ),
  ).toBe(true);
  for (const icon of manifest.icons)
    expect((await page.request.get(icon.src)).ok()).toBe(true);
});
