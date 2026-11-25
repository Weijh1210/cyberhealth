import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("discovers a real cue, confirms a tiny action, grows the town and records a habit", async ({
  page,
}, info) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "载入 V7 示例（无需 AI）" }).click();
  await expect(
    page.getByRole("heading", { name: "今日发现", exact: true }),
  ).toBeVisible();
  const featured = page.locator(".discovery-card.featured");
  await expect(featured).toContainText("写累了就刷手机");
  await featured.getByText("为什么值得试").click();
  await expect(
    featured.getByRole("link", { name: "查看世卫组织指南" }),
  ).toHaveAttribute("href", /who\.int/);
  await featured.getByText("为什么值得试").click();
  expect(
    (await new AxeBuilder({ page }).include(".discoveries-grid").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: `docs/screenshots/v7-discovery-${info.project.name}.png`,
  });
  await featured.getByRole("button", { name: "试一次", exact: true }).click();
  await page.getByRole("button", { name: "我做过了，确认记录" }).click();
  await expect(
    page.getByRole("heading", { name: "这次尝试，城镇记住了" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "把这个时机种成习惯" }).click();
  await page.getByRole("link", { name: "查看街区变化" }).click();
  await expect(page.locator('[data-growth="sample_library"]')).toHaveCount(1);
  const position = await page
    .locator('[data-node="sample_library"]')
    .getAttribute("data-position");
  expect(position).toBeTruthy();
  await page.screenshot({
    path: `docs/screenshots/v7-world-${info.project.name}.png`,
  });
  await page.goto("/habits");
  await expect(
    page.getByRole("heading", { name: "习惯花园", exact: true }),
  ).toBeVisible();
  await page.getByText("做个小实验", { exact: true }).click();
  await page.getByRole("button", { name: "开始实验" }).click();
  await page.getByRole("button", { name: "记一次尝试" }).click();
  await page.getByLabel("今天是我自己想起来做的").check();
  await page
    .getByRole("combobox", { name: "这次融入日常容易吗？" })
    .selectOption("easy");
  await page.getByRole("button", { name: "我做过了，确认记录" }).click();
  await expect(page.getByText("主动发起过", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("1 次确认 · 1 次自报主动发起", { exact: true }),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include(".habit-grid").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: `docs/screenshots/v7-habit-${info.project.name}.png`,
  });
  await page.goto("/explore");
  const study = page
    .locator(".discovery-card")
    .filter({ hasText: "写累了就刷手机" });
  await study.getByRole("button", { name: "这个机会不适合" }).click();
  await page.getByLabel("这次为什么跳过？").selectOption("social");
  await page.getByRole("button", { name: "记录跳过" }).click();
  await expect(study).toHaveCount(0);
  await expect(page.locator(".discovery-card").first()).toBeVisible();
  await page.goto("/");
  await expect(page.locator('[data-node="sample_library"]')).toHaveAttribute(
    "data-position",
    position!,
  );
});
