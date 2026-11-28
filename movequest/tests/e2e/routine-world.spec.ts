import { expect, test, type Page } from "@playwright/test";
import type { Cue } from "../../src/life/context";
import type { Category, LifeDelta } from "../../src/life/model";

test.use({ baseURL: "http://127.0.0.1:5178" });

const place = (id: string, name: string, category: Category = "library") => ({
  id,
  name,
  category,
  source: "ai" as const,
  confirmed: false,
});

const task = (id: string, locationId: string, evidence: string): Cue => ({
  id,
  locationId,
  evidence,
  kind: "task_end",
  uncertain: false,
  source: "ai",
  plan: { method: "desk_hands", fitEvidence: "I prefer a seated break." },
});

const library = place("library", "Cedar Library");
const reading = task("study", library.id, "I close my book after studying.");
const draft = (patch: Partial<LifeDelta>): LifeDelta => ({
  locations: [],
  events: [],
  questions: [],
  ...patch,
});

async function setup(page: Page, ...replies: LifeDelta[]) {
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { ai: true } }),
  );
  await page.route("**/api/life/extract", (route) => {
    const delta = replies.shift();
    expect(delta).toBeDefined();
    return route.fulfill({ json: { delta } });
  });
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "英文", exact: true }).click();
}

async function confirm(page: Page, text: string) {
  await page.getByRole("textbox", { name: "Describe your day" }).fill(text);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm and update my town" })
    .click();
}

const update = (page: Page) => page.locator(".town-plan-update");
const pins = (page: Page) => page.locator("[data-district-plans]");

test("first confirmation frames the world and every available plan has a matching map marker", async ({
  page,
}, info) => {
  const places = [
    library,
    place("office", "North Office", "office"),
    place("campus", "Oak Campus", "campus"),
    place("home", "Home", "home"),
  ];
  await setup(
    page,
    draft({
      locations: [...places, place("park", "Maple Park", "park")],
      cues: places.map((p) => task(p.id + "-task", p.id, "I finish one task.")),
    }),
  );
  await confirm(
    page,
    "I finish one task at each place. I prefer a seated break.",
  );
  await expect(page).toHaveURL(/\/world$/);
  await expect(page.getByRole("heading", { name: "My world" })).toBeVisible();
  await expect(update(page)).toContainText("4 new movement opportunities");
  await expect(pins(page)).toHaveCount(4);
  await expect(
    page.locator("[data-node=park] [data-district-plans]"),
  ).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("world-after-confirmation.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Select Cedar Library" }).click();
  const district = page.getByRole("region", { name: "District activities" });
  await expect(
    district.getByRole("link", { name: "Finger spread and release" }),
  ).toHaveAttribute("href", /cue=library-task$/);
  await expect(district.getByText("New", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "My action plan" }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(
    page.getByRole("link", { name: "Start guided movement" }),
  ).toHaveCount(4);
});

test("a new location unlocks a plot without disturbing existing plots or decorations", async ({
  page,
}) => {
  const office = place("office", "North Office", "office");
  await setup(
    page,
    draft({ locations: [library], cues: [reading] }),
    draft({
      locations: [office],
      cues: [task("meeting", office.id, "I put down my notes.")],
    }),
  );
  await confirm(page, reading.evidence);
  const original = page.locator("[data-node=library]");
  const position = await original.getAttribute("data-position");
  await page.getByRole("button", { name: "Select Cedar Library" }).click();
  await page.getByRole("button", { name: "Place decoration" }).click();
  await page.getByRole("link", { name: "Discover a place" }).click();
  await confirm(page, "I work at North Office and put down my notes.");
  await expect(page).toHaveURL(/\/world\?expanded=office$/);
  await expect(
    page.getByText("District unlocked · North Office"),
  ).toBeVisible();
  await expect(update(page)).toContainText("1 new movement opportunity");
  await expect(original).toHaveAttribute("data-position", position!);
  await expect(
    page.getByRole("button", { name: "Select decoration tree" }),
  ).toHaveCount(1);
  await expect(pins(page)).toHaveCount(2);
});

test("updating an existing event highlights the affected plan without expanding the world", async ({
  page,
}) => {
  const event = {
    id: "study-event",
    locationId: library.id,
    title: "Study",
    start: "10:00",
    end: null,
    recurrence: "weekday" as const,
    transport: "unknown" as const,
    busy: false,
    evidence: reading.evidence,
  };
  const after = "I close my notes after my afternoon study session.";
  const extraEvent = "I read at Cedar Library at five.";
  await setup(
    page,
    draft({ locations: [library], events: [event], cues: [reading] }),
    draft({
      events: [{ ...event, start: "14:00", evidence: after }],
      cues: [{ ...reading, evidence: after }],
    }),
    draft({
      events: [
        {
          ...event,
          id: "extra-event",
          title: "Reading",
          start: "17:00",
          evidence: extraEvent,
        },
      ],
    }),
    draft({
      preferences: ["I prefer quiet movement."],
      constraints: { notes: [], walkingAllowed: false },
    }),
  );
  await confirm(page, reading.evidence);
  const original = page.locator("[data-node=library]");
  const position = await original.getAttribute("data-position");
  await page.getByRole("link", { name: "Discover a place" }).click();
  await confirm(page, after);
  await expect(page).toHaveURL(/\/world\?scene=library$/);
  await expect(page.getByText(/District unlocked/)).toHaveCount(0);
  await expect(update(page)).toContainText(
    "0 new movement opportunities · 1 updated",
  );
  await expect(page.locator("[data-node]")).toHaveCount(1);
  await expect(original).toHaveAttribute("data-position", position!);
  const district = page.getByRole("region", { name: "District activities" });
  await expect(district.getByText(after)).toBeVisible();
  await expect(district.getByText("Updated", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Discover a place" }).click();
  await confirm(page, extraEvent);
  await expect(page).toHaveURL(/\/world\?scene=library$/);
  await expect(update(page)).toHaveText("0 new movement opportunities");
  await expect(district.getByText("Updated", { exact: true })).toHaveCount(0);
  await expect(pins(page)).toHaveCount(1);
  await expect(original).toHaveAttribute("data-position", position!);

  await page.getByRole("link", { name: "Discover a place" }).click();
  await confirm(page, "I prefer quiet movement and cannot walk.");
  await expect(
    page.getByRole("status").filter({ hasText: "Your changes were saved." }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/life/);
  await expect(
    page.getByRole("button", { name: "Confirm and update my town" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Back to my town" }).click();
  await expect(page).toHaveURL(/\/world$/);
  await expect(update(page)).toHaveCount(0);
});

test("an unavailable or uncertain cue cannot create a plan count or a map marker", async ({
  page,
}) => {
  const station = place("station", "Maple Metro", "subway");
  await setup(
    page,
    draft({
      locations: [station, library],
      cues: [
        {
          id: "commute",
          locationId: station.id,
          kind: "commute_end",
          uncertain: false,
          source: "ai",
          evidence: "I get off the metro at Maple Metro.",
          plan: {
            method: "commute_leg",
            fitEvidence: "I usually walk from the station.",
          },
        },
        { ...reading, uncertain: true },
      ],
      constraints: { notes: [], walkingAllowed: false },
    }),
  );
  await confirm(page, "I get off the metro at Maple Metro. I cannot walk.");
  await expect(page).toHaveURL(/\/world$/);
  await expect(update(page)).toContainText("0 new movement opportunities");
  await expect(pins(page)).toHaveCount(0);
  await expect(
    page.getByText("There are no matching movement opportunities yet."),
  ).toBeVisible();
  await page.getByRole("link", { name: "My action plan" }).click();
  await expect(
    page.getByRole("link", { name: "Start guided movement" }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Move now" })).toBeVisible();
});
