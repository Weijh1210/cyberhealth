import { expect, test } from "@playwright/test";

test("a published legacy action can be searched, started and confirmed", async ({
  page,
}) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "载入 V7 示例（无需 AI）" }).click();
  await page.getByRole("link", { name: "微运动", exact: true }).click();
  await page.getByRole("link", { name: "浏览动作库" }).click();
  await expect(page.locator(".movement-library article")).toHaveCount(56);
  await page.getByLabel("按类别筛选").selectOption("mobility");
  await page.getByLabel("搜索动作").fill("手指张合");
  const result = page.locator(".movement-library article");
  await expect(result).toHaveCount(1);
  await result.getByRole("link", { name: "确认条件" }).click();
  await expect(page.getByRole("heading", { name: "手指张合" })).toBeVisible();
  const start = page.getByRole("button", { name: "开始活动" });
  await expect(start).toBeDisabled();
  await page
    .getByLabel("我在安全的地方，符合上面的条件，目前没有不适。")
    .check();
  await start.click();
  await expect(page.getByRole("heading", { name: "动作步骤" })).toBeVisible();
  const confirm = page.getByRole("button", { name: "我已完成，确认记录" });
  await expect(confirm).toBeVisible();
  await expect(page.getByRole("heading", { name: "完成已记录" })).toHaveCount(
    0,
  );
  await confirm.click();
  await expect(page.getByRole("heading", { name: "完成已记录" })).toBeVisible();
});

test("manual picks still enforce time, space and equipment", async ({
  page,
}) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "载入 V7 示例（无需 AI）" }).click();
  await page.waitForURL("**/explore");
  await page.goto("/quest/move-mini-squat");
  await expect(
    page.getByRole("heading", { name: "扶椅小幅屈膝" }),
  ).toBeVisible();
  const start = page.getByRole("button", { name: "开始活动" });
  await expect(start).toBeDisabled();
  await page.getByLabel("地点").selectOption("home");
  await page.getByLabel("场地").selectOption("clear");
  await page.getByLabel("能安全站立").check();
  await page.getByLabel("尽量不显眼").uncheck();
  await page.getByRole("button", { name: "30 秒", exact: true }).click();
  const safety = page.getByLabel(
    "我在安全的地方，符合上面的条件，目前没有不适。",
  );
  await expect(safety).toBeDisabled();
  await page.getByRole("button", { name: "1 分钟", exact: true }).click();
  await page.getByLabel("有稳固无轮椅").uncheck();
  await expect(safety).toBeDisabled();
  await page.getByLabel("有稳固无轮椅").check();
  await safety.check();
  await start.click();
  await page.getByRole("button", { name: "疼痛或头晕 · 立即停止" }).click();
  await expect(page.getByRole("heading", { name: "活动已停止" })).toBeVisible();
});
