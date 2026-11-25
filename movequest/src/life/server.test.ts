import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
let child: ChildProcess, base: string, directory: string;
beforeAll(async () => {
  directory = await mkdtemp(resolve(tmpdir(), "movequest-api-"));
  child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: "0",
      MOVEQUEST_DATA_DIR: directory,
      OPENROUTER_API_KEY: "",
      MOVEQUEST_AI_KEY: "",
      MOVEQUEST_AI_URL: "",
      MOVEQUEST_AI_MODEL: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  base = await new Promise<string>((yes, no) => {
    const timer = setTimeout(() => no(Error("API startup timeout")), 8000);
    child.stdout!.on("data", (buffer) => {
      const match = /listening on (\d+)/.exec(buffer.toString());
      if (match) {
        clearTimeout(timer);
        yes(`http://127.0.0.1:${match[1]}`);
      }
    });
    child.on("error", no);
    child.on("exit", (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timer);
        no(Error(`API exit ${code}`));
      }
    });
  });
}, 10000);
afterAll(async () => {
  if (child) {
    child.kill();
    await new Promise<void>((resolve) => child.once("exit", () => resolve()));
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});
const post = (
  path: string,
  value: unknown,
  extra: Record<string, string> = {},
) =>
  fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extra },
    body: JSON.stringify(value),
  });
it("reports absent AI honestly, without invoking any parsing fallback", async () => {
  const status = await fetch(base + "/api/status").then((r) => r.json());
  expect(status.ai).toBe(false);
  const response = await post("/api/life/extract", { text: "每天八点起床" });
  expect(response.status).toBe(503);
  expect((await response.json()).error).toContain("手动");
});
it("stores explicit email intent durably with consent, deduplicates and rejects fake checkout", async () => {
  expect(
    (
      await post("/api/interest", {
        email: "fixture@example.test",
        price: 99,
        consent: false,
      })
    ).status,
  ).toBe(400);
  for (let i = 0; i < 2; i++) {
    const response = await post("/api/interest", {
      email: "fixture@example.test",
      price: 99,
      consent: true,
    });
    expect(await response.json()).toEqual({ registered: true, payment: false });
  }
  const ledger = JSON.parse(
    await readFile(resolve(directory, "ledger.json"), "utf8"),
  );
  expect(ledger.interests).toHaveLength(1);
  expect(ledger.interests[0].consentVersion).toBe("plus-interest-v1");
  expect(ledger.interests[0].price).toBe(99);
});
it("rejects cross-site writes, limits request size and serves the built SPA", async () => {
  expect(
    (await post("/api/interest", {}, { Origin: "https://other.example" }))
      .status,
  ).toBe(403);
  expect(
    (await post("/api/interest", { text: "x".repeat(25000) })).status,
  ).toBe(413);
  expect((await fetch(base + "/life")).headers.get("Content-Type")).toContain(
    "text/html",
  );
  expect(
    (
      await fetch(base + "/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
    ).status,
  ).toBe(404);
});
