import { expect, test } from "@playwright/test";

test.use({ baseURL: "http://127.0.0.1:5178" });

const routines = [
  {
    label: "library student",
    text: "我在图书馆坐三个小时学习，写完一套题就刷手机休息。",
    action: "坐姿交替抬膝",
  },
  {
    label: "office meetings",
    text: "我在办公室工作，每一场线上会议结束后会停下来保存笔记。",
    action: "手指张合",
  },
  {
    label: "remote work and housework",
    text: "我在家远程办公，每次提交设计稿后会顺手叠一件衣服。",
    action: "顺手叠一件衣物",
  },
  {
    label: "time-limited commute",
    text: "工作日我从地铁出站后沿熟悉的步道步行到公司，只有30秒。",
    action: "沿原路线轻走半分钟",
  },
  {
    label: "video break",
    text: "我在家看视频，每看完一集就把手边的轻物归位。我不喜欢正式锻炼。",
    action: "用一轮轻物归位结束屏幕时间",
  },
  {
    label: "discreet and low-sweat",
    text: "我在图书馆读完一节再休息，我不能站立，也不能走动，想少出汗而且不显眼。",
    action: "手指张合",
  },
];

for (const routine of routines) {
  test(`personal onboarding finds movement for ${routine.label}`, async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("textbox", { name: "输入生活消息" })
      .fill(routine.text);
    await page.getByRole("button", { name: "在本机整理", exact: true }).click();
    await expect(page.getByText("本机识别结果", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "确认资料并生成城镇" }).click();
    await expect(page).toHaveURL(/\/world$/);
    await page.getByRole("link", { name: "我的行动计划" }).click();
    const offer = page.getByRole("article").filter({
      has: page.getByRole("heading", { name: routine.action, exact: true }),
    });
    await expect(offer).toBeVisible();
    await expect(offer).toContainText("本机计划 · 已确认");
    await offer.getByRole("link", { name: "开始引导活动" }).click();
    await expect(page.getByRole("heading", { name: "动作步骤" })).toBeVisible();
    await expect(page.getByRole("button", { name: "开始活动" })).toBeDisabled();
  });
}

test("production opens personal space and confirms guided time, growth and a recurring habit", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.clock.install({ time: new Date("2026-11-25T02:00:00Z") });
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByText("载入 V7 示例（无需 AI）")).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "输入生活消息" })
    .fill(routines[1].text);
  await page.getByRole("button", { name: "在本机整理", exact: true }).click();
  await page.getByRole("button", { name: "确认资料并生成城镇" }).click();
  await page.getByRole("link", { name: "我的行动计划" }).click();
  await page.getByRole("link", { name: "开始引导活动" }).click();
  const safety = page.getByLabel(
    "我当前远离车流，满足动作的场地和器材要求，没有不适。",
  );
  await safety.check();
  await page.getByRole("button", { name: "开始活动" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "准备开始" }),
  ).toBeVisible();
  await page.clock.runFor(3500);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "继续", exact: true }),
  ).toBeVisible();
  await page.clock.runFor(35000);
  await expect(
    page.getByRole("button", { name: "我已完成，确认记录" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "继续", exact: true }).click();
  await page.clock.runFor(32000);
  await page.getByLabel("本次体感强度（可选）").selectOption("light");
  await page.getByLabel("这次是我自己想起来的").check();
  await expect(page.getByRole("heading", { name: "完成已记录" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "我已完成，确认记录" }).click();
  await expect(page.getByRole("heading", { name: "完成已记录" })).toBeVisible();
  await page.getByRole("button", { name: "把这个时机种成习惯" }).click();
  await expect(page.getByRole("link", { name: "查看我的习惯" })).toBeVisible();
  await page.getByRole("link", { name: "查看街区变化" }).click();
  await expect(page).toHaveURL(/\/world\?scene=/);
  const district = page.getByRole("region", { name: "街区活动" });
  await expect(
    district.getByRole("heading", { name: "公司", exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-growth]")).toHaveCount(1);
  await expect(page.locator(".town-plan-update")).toHaveCount(0);
  await page.getByRole("button", { name: "查看公司的微运动" }).click();
  await expect(
    page.getByRole("heading", { name: "这里可以做的活动" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "今日", exact: true }).click();
  await expect(page.locator(".today-total")).toContainText("0.5");
  await expect(page.getByText("花径灯笼", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "接下来的习惯" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "管理习惯" }).click();
  await expect(page.getByRole("link", { name: /换个动作/ })).toBeVisible();
});

test("natural language blocks activity in transit and can recover after stopping", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "输入生活消息" })
    .fill(routines[3].text);
  await page.getByRole("button", { name: "在本机整理", exact: true }).click();
  await page.getByRole("button", { name: "确认资料并生成城镇" }).click();
  await page.getByRole("link", { name: "微运动", exact: true }).click();
  await page
    .getByLabel("用一句话说现在的情况")
    .fill("我现在正在坐地铁，有30秒");
  await page.getByRole("button", { name: "应用到推荐" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "请等停车" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "开始活动" })).toHaveCount(0);
  await page.getByLabel("当前环境").selectOption("stationary");
  await expect(page.getByRole("button", { name: "开始活动" })).toBeDisabled();
});
