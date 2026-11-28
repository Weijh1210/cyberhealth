import { expect, test } from "@playwright/test";

test("English persists and a confirmed itinerary expands the same town", async ({
  page,
}, info) => {
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { ai: true } }),
  );
  let requests = 0;
  await page.route("**/api/life/extract", async (route) => {
    const request = route.request().postDataJSON();
    expect(request.replyLanguage).toBe("en");
    const expansion = ++requests === 2;
    if (expansion)
      expect(request.existing.locations).toContainEqual({
        id: "library",
        name: "Cedar Library",
        category: "library",
      });
    const id = expansion ? "park" : "library";
    await route.fulfill({
      json: {
        delta: {
          locations: [
            {
              id,
              name: expansion ? "Maple Park" : "Cedar Library",
              category: id,
              source: "ai",
              confirmed: false,
            },
          ],
          events: [
            {
              id: `${id}-event`,
              locationId: id,
              title: expansion ? "Weekend walk" : "Library study",
              start: expansion ? "15:00" : "10:00",
              end: null,
              recurrence: expansion ? "weekend" : "weekday",
              transport: "walk",
              busy: false,
              evidence: request.text,
            },
          ],
          questions: [],
        },
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "英文", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Find movement in your day",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "On my commute", exact: true })
    .click();
  await expect(
    page.getByText("Pick a turnaround point on a familiar route"),
  ).toBeVisible();
  const input = () =>
    page.getByRole("textbox", { name: "Describe your day", exact: true });
  await input().fill("I study at Cedar Library at 10 on weekdays.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm and update my town", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "My world", exact: true }),
  ).toBeVisible();
  const library = page.locator('[data-node="library"]');
  const position = await library.getAttribute("data-position");
  await page
    .getByRole("button", { name: "Select Cedar Library", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Place decoration", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Select decoration tree" }),
  ).toHaveCount(1);
  await page
    .getByRole("link", { name: "Discover a place", exact: true })
    .click();
  await input().fill("On weekends I walk in Maple Park at 3 PM.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm and update my town", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "District unlocked · Maple Park" }),
  ).toBeVisible();
  await expect(library).toHaveAttribute("data-position", position!);
  await expect(
    page.getByRole("button", { name: "Select decoration tree" }),
  ).toHaveCount(1);
  await expect(page.locator("[data-node]")).toHaveCount(2);
  await page.screenshot({
    path: `docs/screenshots/town-expansion-${info.project.name}.png`,
    animations: "disabled",
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const unexplored = page.getByRole("region", { name: "Unexplored districts" });
  await expect(
    unexplored.getByRole("button", { name: "Maple Park" }),
  ).toBeVisible();
  await unexplored.getByRole("button", { name: "Maple Park" }).click();
  await expect(
    unexplored.getByRole("button", { name: "Maple Park" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    unexplored.getByRole("button", { name: "Maple Park" }),
  ).toHaveCount(0);
  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { name: "Preferences", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your data stays on this device" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear MoveQuest data…" }).click();
  await expect(
    page.getByRole("button", { name: "Confirm clearing MoveQuest data" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("main")).not.toContainText(/\p{Script=Han}/u);
  await page.goto("/learn");
  await expect(
    page.getByRole("heading", { name: "Learn about everyday movement" }),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/\p{Script=Han}/u);
  await page.goto("/world");
  await page
    .getByRole("button", { name: "Chinese", exact: true })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "我的世界", exact: true }),
  ).toBeVisible();
  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { name: "你的数据，留在本机" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "保存偏好" })).toBeVisible();
  expect(requests).toBe(2);
});
