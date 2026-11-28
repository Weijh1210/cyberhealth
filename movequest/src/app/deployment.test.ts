import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("SPA deployment rewrites deep pages while preserving PWA and static resources", () => {
  const config = JSON.parse(
    readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"),
  );
  const fallback = new RegExp(`^${config.rewrites[0].source}$`);
  for (const route of [
    "/",
    "/explore",
    "/quest/campus-corridor",
    "/institution",
  ])
    expect(fallback.test(route)).toBe(true);
  for (const resource of [
    "/api/status",
    "/api/life/extract",
    "/api/interest",
    "/sw.js",
    "/manifest.webmanifest",
    "/licenses.txt",
    "/workbox-abc123.js",
    "/assets/index.js",
    "/icons/icon-192.png",
  ])
    expect(fallback.test(resource)).toBe(false);
});
