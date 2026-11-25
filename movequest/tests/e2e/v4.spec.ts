import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptyState } from "../../src/domain/types";
import { emptyLife, mergeLife } from "../../src/life/model";
const personal = {
  ...emptyState(),
  profile: {
    name: "青禾",
    role: "worker",
    scenes: ["home", "office"],
    minutes: 2,
    reminder: 0,
    locale: "zh-CN",
  },
  life: mergeLife(emptyLife(), {
    locations: [
      {
        id: "personal_home",
        name: "个人的家",
        category: "home",
        source: "manual",
        confirmed: false,
      },
    ],
    events: [],
    questions: [],
  }),
};
const snapshot = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("movequest:v1")!));
async function begin(page: Page) {
  await page.goto("/demo");
  await page.evaluate(
    (s) => localStorage.setItem("movequest:v1", JSON.stringify(s)),
    personal,
  );
  await page.goto("/demo");
  await page.getByRole("button", { name: "载入示例演示世界" }).click();
  await expect(page.locator("[data-node]")).toHaveCount(5);
}
async function openSheet(page: Page) {
  if (
    (await page.locator(".mobile-opportunities").isVisible()) &&
    !(await page.locator(".opportunity-panel").isVisible())
  )
    await page.locator(".mobile-opportunities").click();
}
async function closeSheet(page: Page) {
  if (await page.locator(".sheet-close").isVisible())
    await page.locator(".sheet-close").click();
}
async function photo(page: Page, name: string, project: string) {
  if (name === "expansion") {
    await page.getByRole("button", { name: "重置视角" }).click();
    await expect(page.locator(".world-canvas > svg > g")).toHaveAttribute(
      "transform",
      /scale\(1\)/,
    );
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await page.screenshot({
    path: `docs/screenshots/v4-${name}-${project}.png`,
    animations: "disabled",
  });
}
test("V4 complete demo uses real engines and preserves the personal world", async ({
  page,
}, info) => {
  await begin(page);
  const initial = await snapshot(page);
  expect(initial.life.locations[0].id).toBe("personal_home");
  await photo(page, "world", info.project.name);
  await page.getByLabel("事件情境").selectOption("water");
  await openSheet(page);
  await expect(page.getByTestId("opportunity").first()).toContainText("接水");
  const before = await page
    .getByTestId("opportunity")
    .first()
    .locator("summary")
    .textContent();
  await page.getByLabel("反馈原因").selectOption("not_interested");
  await page
    .getByRole("button", { name: "不适合我", exact: true })
    .first()
    .click();
  await expect
    .poll(
      async () =>
        (await snapshot(page)).demoLife.feedback.filter(
          (f: { type: string }) => f.type === "not_suitable",
        ).length,
    )
    .toBe(1);
  const after = await page
    .locator('[data-activity="office-water"] summary')
    .textContent();
  expect(after).not.toBe(before);
  await photo(page, "feedback", info.project.name);
  await page.getByLabel("事件情境").selectOption("lunch_end");
  await expect(page.getByTestId("opportunity").first()).toContainText("午饭后");
  await page
    .getByRole("link", { name: "查看活动", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "开始计时", exact: true }),
  ).toBeVisible();
  await photo(page, "opportunity", info.project.name);
  await page.goto("/demo");
  await page.getByRole("button", { name: "确认周末公园示例并扩展" }).click();
  await expect(page.locator("[data-node]")).toHaveCount(6);
  const expanded = await snapshot(page);
  expect(expanded.demoLife.nodes.slice(0, 5)).toEqual(initial.demoLife.nodes);
  expect(expanded.life).toEqual(personal.life);
  await page.getByRole("button", { name: "暮色街区", exact: true }).click();
  await expect
    .poll(async () => (await snapshot(page)).demoLife.theme)
    .toBe("twilight");
  await page.getByRole("button", { name: "选择我的小屋", exact: true }).click();
  await closeSheet(page);
  await page.getByRole("button", { name: "喷泉", exact: true }).click();
  await page.getByRole("button", { name: "放置装饰", exact: true }).click();
  await expect
    .poll(async () => (await snapshot(page)).demoLife.decorations.length)
    .toBe(1);
  await expect(
    page.getByRole("button", { name: "选择装饰 fountain" }),
  ).toHaveAttribute("aria-pressed", "true");
  const target = page.getByRole("button", { name: /移到我的小屋空位 2/ });
  if (info.project.name === "mobile") {
    await target.tap();
  } else {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: "重置视角" }).click();
    const source = page
      .getByRole("button", { name: "选择装饰 fountain" })
      .locator("ellipse")
      .first();
    await source.evaluate((el) =>
      el.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    const from = (await source.boundingBox())!;
    const to = (await target.locator("circle").boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
      steps: 8,
    });
    await page.mouse.up();
  }
  await expect
    .poll(async () => (await snapshot(page)).demoLife.decorations[0].slot)
    .toBe(1);
  await page.getByRole("button", { name: "撤销装饰操作" }).click();
  await expect
    .poll(async () => (await snapshot(page)).demoLife.decorations[0].slot)
    .toBe(0);
  await page.getByRole("button", { name: "移除所选装饰" }).click();
  await expect
    .poll(async () => (await snapshot(page)).demoLife.decorations.length)
    .toBe(0);
  await page.getByRole("button", { name: "撤销装饰操作" }).click();
  await photo(page, "expansion", info.project.name);
  await page.reload();
  expect((await snapshot(page)).demoLife.locations).toHaveLength(6);
  expect((await snapshot(page)).demoLife.decorations).toHaveLength(1);
  await page.goto("/demo");
  await page.getByRole("button", { name: "重置演示", exact: true }).click();
  await expect(page.locator("[data-node]")).toHaveCount(5);
  expect((await snapshot(page)).life).toEqual(personal.life);
  await page.goto("/demo");
  await page.getByRole("button", { name: "退出演示，回到个人空间" }).click();
  await expect.poll(async () => (await snapshot(page)).demo).toBe(false);
  await page.goto("/world");
  await expect(page.locator("[data-node]")).toHaveCount(1);
});
test("voice transcription is editable and never submits automatically (browser API mock)", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    let starts = 0;
    class FakeSpeech {
      continuous = false;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        const attempt = ++starts;
        if (!this.continuous) throw Error("Expected continuous listening");
        if (attempt === 1) {
          const segment = Object.assign(
            [{ transcript: "每天早上八点在家起床" }],
            { isFinal: true },
          );
          this.onresult?.({ resultIndex: 0, results: [segment] });
          this.onresult?.({ resultIndex: 0, results: [segment] });
          this.onend?.();
        } else if (attempt === 2) {
          const segment = Object.assign([{ transcript: "然后出门上课" }], {
            isFinal: true,
          });
          this.onresult?.({ resultIndex: 0, results: [segment] });
        } else throw Error("Recognition restarted after manual stop");
      }
      stop() {
        this.onend?.();
      }
      abort() {}
    }
    Object.assign(window, { SpeechRecognition: FakeSpeech });
  });
  let requests = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/life/extract")) requests++;
  });
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "语音转文字", exact: true }).click();
  await expect(page.locator("#life-description")).toHaveValue(
    "每天早上八点在家起床\n然后出门上课",
  );
  await page.getByRole("button", { name: "结束语音", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "语音转文字", exact: true }),
  ).toBeVisible();
  await page
    .locator("#life-description")
    .fill("工作日早上8点在家起床，9点去公司。");
  expect(requests).toBe(0);
  await photo(page, "discovery", info.project.name);
});
test("JSON import validates and requires explicit replacement confirmation", async ({
  page,
}) => {
  await begin(page);
  await page.goto("/profile");
  await page.locator("input[type=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(personal)),
  });
  await expect(
    page.getByRole("button", { name: "确认恢复此备份并替换本机数据" }),
  ).toBeVisible();
  expect((await snapshot(page)).demo).toBe(true);
  await page
    .getByRole("button", { name: "确认恢复此备份并替换本机数据" })
    .click();
  await expect.poll(async () => (await snapshot(page)).demo).toBe(false);
  await page.goto("/world");
  await expect(page.locator("[data-node]")).toHaveCount(1);
});
test("V4 demo and discovery surfaces remain accessible and fit their viewport", async ({
  page,
}) => {
  await begin(page);
  for (const route of ["/demo", "/life", "/rhythm", "/"]) {
    await page.goto(route);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    const a = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      a.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});
